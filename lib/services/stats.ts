import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";

export type AnalyticsRange = "day" | "month" | "year" | "all" | "custom";

type Metric = {
  key: string;
  month: string;
  blogs: number;
  views: number;
  likes: number;
  comments: number;
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string, endOfDay = false) {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (!Number.isFinite(date.getTime()) || dateOnly(date) !== value) {
    throw new Error("Invalid analytics date");
  }
  return date;
}

async function getAvailableDateRange(authorId?: string) {
  const blogWhere = authorId ? { authorId } : undefined;
  const eventWhere = authorId ? { blog: { authorId } } : undefined;
  const [firstBlog, firstView, firstLike, firstComment] = await Promise.all([
    prisma.blog.findFirst({
      where: blogWhere,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.blogView.findFirst({
      where: eventWhere,
      orderBy: { viewedAt: "asc" },
      select: { viewedAt: true },
    }),
    prisma.like.findFirst({
      where: eventWhere,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.comment.findFirst({
      where: eventWhere,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  const availableDates = [
    firstBlog?.createdAt,
    firstView?.viewedAt,
    firstLike?.createdAt,
    firstComment?.createdAt,
  ].filter((date): date is Date => Boolean(date));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const historicalDates = availableDates.filter((date) => date <= now);
  const earliest = historicalDates.length
    ? new Date(Math.min(...historicalDates.map((date) => date.getTime())))
    : today;
  return { startDate: dateOnly(earliest), endDate: dateOnly(today) };
}

export async function getAnalyticsAvailability(authorId?: string) {
  return getAvailableDateRange(authorId);
}

export function validateAnalyticsDateRange(
  startInput: string | null,
  endInput: string | null,
  available: { startDate: string; endDate: string }
) {
  if (!startInput && !endInput) return null;
  const startDate = startInput || available.startDate;
  const endDate = endInput || available.endDate;
  try {
    if (parseDateOnly(startDate) > parseDateOnly(endDate, true)) {
      return "Start date must be on or before the end date";
    }
  } catch {
    return "Enter valid start and end dates";
  }
  if (startDate < available.startDate || endDate > available.endDate) {
    return `Choose dates between ${available.startDate} and ${available.endDate}`;
  }
  return null;
}

function periodFor(
  range: AnalyticsRange,
  available: { startDate: string; endDate: string },
  startInput?: string,
  endInput?: string,
  now = new Date()
) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === "day") {
    return { start: today, end: now, label: "Today" };
  }
  if (range === "month") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end: now,
      label: format(now, "MMMM yyyy"),
    };
  }
  if (range === "year") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      end: now,
      label: String(now.getUTCFullYear()),
    };
  }
  if (range === "custom") {
    const startDate = startInput || available.startDate;
    const endDate = endInput || available.endDate;
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate, true);
    if (start > end) throw new Error("Start date must be on or before the end date");
    if (startDate < available.startDate || endDate > available.endDate) {
      throw new Error("Selected dates are outside the available analytics range");
    }
    return {
      start,
      end,
      label: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`,
    };
  }
  return { start: null, end: now, label: "Overall" };
}

function eventWindow(range: AnalyticsRange, periodStart: Date | null, now = new Date()) {
  if (range !== "all") return periodStart;
  const recentYear = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  return recentYear;
}

function createTimeline(
  range: AnalyticsRange,
  start: Date | null,
  end: Date,
  now = new Date()
): Metric[] {
  const buckets: Metric[] = [];
  if (range === "day") {
    for (let hour = 0; hour <= now.getUTCHours(); hour += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour));
      buckets.push({
        key: format(date, "yyyy-MM-dd-HH"),
        month: format(date, "HH:mm"),
        blogs: 0,
        views: 0,
        likes: 0,
        comments: 0,
      });
    }
    return buckets;
  }

  if (range === "month") {
    const days = now.getUTCDate();
    for (let day = 1; day <= days; day += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
      buckets.push({
        key: format(date, "yyyy-MM-dd"),
        month: format(date, "MMM d"),
        blogs: 0,
        views: 0,
        likes: 0,
        comments: 0,
      });
    }
    return buckets;
  }

  if (range === "custom" && start && end.getTime() - start.getTime() < 32 * 86400000) {
    const dayCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    for (let index = 0; index < dayCount; index += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      buckets.push({
        key: format(date, "yyyy-MM-dd"),
        month: format(date, "MMM d"),
        blogs: 0,
        views: 0,
        likes: 0,
        comments: 0,
      });
    }
    return buckets;
  }

  const timelineStart = range === "custom" && start
    ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    : range === "year"
      ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const timelineEnd = range === "custom" ? end : now;
  const monthCount =
    (timelineEnd.getUTCFullYear() - timelineStart.getUTCFullYear()) * 12 +
    timelineEnd.getUTCMonth() - timelineStart.getUTCMonth() + 1;
  for (let index = 0; index < Math.max(1, monthCount); index += 1) {
    const date = new Date(Date.UTC(timelineStart.getUTCFullYear(), timelineStart.getUTCMonth() + index, 1));
    buckets.push({
      key: format(date, "yyyy-MM"),
      month: format(date, range === "year" ? "MMM" : "MMM yy"),
      blogs: 0,
      views: 0,
      likes: 0,
      comments: 0,
    });
  }
  return buckets;
}

function bucketKey(date: Date, range: AnalyticsRange, start: Date | null, end: Date) {
  if (range === "day") return format(date, "yyyy-MM-dd-HH");
  if (
    range === "month" ||
    (range === "custom" && start && end.getTime() - start.getTime() < 32 * 86400000)
  ) {
    return format(date, "yyyy-MM-dd");
  }
  return format(date, "yyyy-MM");
}

function addEvent(
  buckets: Map<string, Metric>,
  date: Date,
  range: AnalyticsRange,
  start: Date | null,
  end: Date,
  metric: "blogs" | "views" | "likes" | "comments"
) {
  const bucket = buckets.get(bucketKey(date, range, start, end));
  if (bucket) bucket[metric] += 1;
}

function dateFilter(start: Date | null, end: Date) {
  return { ...(start ? { gte: start } : {}), lte: end };
}

export async function getAdminStats(
  range: AnalyticsRange = "all",
  startDate?: string,
  endDate?: string
) {
  const availableDateRange = await getAvailableDateRange();
  const period = periodFor(range, availableDateRange, startDate, endDate);
  const eventSince = eventWindow(range, period.start);
  const blogRows = await prisma.blog.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      authorId: true,
      categoryId: true,
      createdAt: true,
      publishedAt: true,
      views: true,
      readingTimeMinutes: true,
      author: { select: { id: true, name: true, email: true, role: true } },
      category: { select: { id: true, name: true } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const [employeesCount, employeeUsers, viewEvents, likeEvents, commentEvents, recentBlogs] =
    await Promise.all([
      prisma.user.count({ where: { role: "EMPLOYEE" } }),
      prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.blogView.findMany({
        where: { viewedAt: { gte: eventSince ?? undefined, lte: period.end } },
        select: { blogId: true, viewedAt: true },
      }),
      prisma.like.findMany({
        where: { createdAt: { gte: eventSince ?? undefined, lte: period.end } },
        select: { blogId: true, createdAt: true },
      }),
      prisma.comment.findMany({
        where: { createdAt: { gte: eventSince ?? undefined, lte: period.end } },
        select: { blogId: true, createdAt: true },
      }),
      prisma.blog.findMany({
        where: { createdAt: dateFilter(period.start, period.end) },
        take: 8,
        orderBy: { updatedAt: "desc" },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
    ]);

  const allTime = range === "all";
  const blogsInRange = blogRows.filter(
    (blog) =>
      (!period.start || blog.createdAt >= period.start) &&
      blog.createdAt <= period.end
  );
  const blogsInRangeIds = new Set(blogsInRange.map((blog) => blog.id));
  const viewsByBlog = new Map<string, number>();
  const likesByBlog = new Map<string, number>();
  const commentsByBlog = new Map<string, number>();
  const timeline = createTimeline(range, period.start, period.end);
  const bucketsByKey = new Map(timeline.map((bucket) => [bucket.key, bucket]));
  for (const blog of blogRows) {
    if (blog.createdAt >= (eventSince ?? new Date(0)) && blog.createdAt <= period.end) {
      addEvent(bucketsByKey, blog.createdAt, range, period.start, period.end, "blogs");
    }
  }
  for (const event of viewEvents) {
    viewsByBlog.set(event.blogId, (viewsByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.viewedAt, range, period.start, period.end, "views");
  }
  for (const event of likeEvents) {
    likesByBlog.set(event.blogId, (likesByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.createdAt, range, period.start, period.end, "likes");
  }
  for (const event of commentEvents) {
    commentsByBlog.set(event.blogId, (commentsByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.createdAt, range, period.start, period.end, "comments");
  }

  const metricsFor = (blog: (typeof blogRows)[number]) => ({
    views: allTime ? blog.views : viewsByBlog.get(blog.id) ?? 0,
    likes: allTime ? blog._count.likes : likesByBlog.get(blog.id) ?? 0,
    comments: allTime ? blog._count.comments : commentsByBlog.get(blog.id) ?? 0,
  });

  const blogCountByEmployee = new Map<string, number>();
  const employeeEngagement = new Map<string, { views: number; likes: number; comments: number }>();
  const categoryStats = new Map<string, { id: string; name: string; blogs: number; views: number; likes: number; comments: number }>();
  const tagStats = new Map<string, { id: string; name: string; blogs: number }>();
  for (const blog of blogRows) {
    const metrics = metricsFor(blog);
    const employeeMetrics = employeeEngagement.get(blog.authorId) ?? { views: 0, likes: 0, comments: 0 };
    employeeMetrics.views += metrics.views;
    employeeMetrics.likes += metrics.likes;
    employeeMetrics.comments += metrics.comments;
    employeeEngagement.set(blog.authorId, employeeMetrics);
    if (blog.category) {
      const category = categoryStats.get(blog.category.id) ?? {
        id: blog.category.id,
        name: blog.category.name,
        blogs: 0,
        views: 0,
        likes: 0,
        comments: 0,
      };
      if (blogsInRangeIds.has(blog.id)) category.blogs += 1;
      category.views += metrics.views;
      category.likes += metrics.likes;
      category.comments += metrics.comments;
      categoryStats.set(blog.category.id, category);
    }
    if (blogsInRangeIds.has(blog.id)) {
      blogCountByEmployee.set(blog.authorId, (blogCountByEmployee.get(blog.authorId) ?? 0) + 1);
      for (const { tag } of blog.tags) {
        const tagStat = tagStats.get(tag.id) ?? { id: tag.id, name: tag.name, blogs: 0 };
        tagStat.blogs += 1;
        tagStats.set(tag.id, tagStat);
      }
    }
  }

  const employeeRanking = employeeUsers
    .map((employee) => ({
      ...employee,
      blogCount: blogCountByEmployee.get(employee.id) ?? 0,
      views: employeeEngagement.get(employee.id)?.views ?? 0,
      likes: employeeEngagement.get(employee.id)?.likes ?? 0,
      comments: employeeEngagement.get(employee.id)?.comments ?? 0,
    }))
    .sort((a, b) => b.blogCount - a.blogCount || b.views - a.views || b.comments - a.comments);
  const blogSummaries = blogRows.map((blog) => {
    const metrics = metricsFor(blog);
    return {
      id: blog.id,
      title: blog.title,
      readingTimeMinutes: blog.readingTimeMinutes,
      status: blog.status,
      authorId: blog.authorId,
      authorName: blog.author.name,
      category: blog.category?.name ?? "Uncategorized",
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      score: metrics.views + metrics.likes * 2 + metrics.comments * 3,
    };
  });
  const topBlog = (metric: "views" | "likes" | "comments") => {
    const winner = [...blogSummaries]
      .sort((a, b) => b[metric] - a[metric] || b.score - a.score)[0];
    return winner && winner[metric] > 0 ? winner : null;
  };
  const topByReadTime =
    blogSummaries
      .filter((blog) => blogsInRangeIds.has(blog.id))
      .sort((a, b) => b.readingTimeMinutes - a.readingTimeMinutes)[0] ?? null;
  const activeBlogSummaries = blogSummaries.filter(
    (blog) =>
      allTime ||
      blogsInRangeIds.has(blog.id) ||
      blog.views + blog.likes + blog.comments > 0
  );
  const rangeRecentBlogs = recentBlogs.map((blog) => {
    const source = blogRows.find((row) => row.id === blog.id);
    const metrics = source ? metricsFor(source) : { likes: 0, comments: 0 };
    return { ...blog, _count: { likes: metrics.likes, comments: metrics.comments } };
  });
  const reportBlogIds = new Set(activeBlogSummaries.map((blog) => blog.id));

  return {
    range,
    rangeLabel: period.label,
    availableDateRange,
    employees: employeesCount,
    blogs: blogsInRange.length,
    published: blogsInRange.filter((blog) => blog.status === "PUBLISHED").length,
    drafts: blogsInRange.filter((blog) => blog.status === "DRAFT").length,
    unpublished: blogsInRange.filter((blog) => blog.status === "UNPUBLISHED").length,
    totalViews: allTime
      ? blogRows.reduce((sum, blog) => sum + blog.views, 0)
      : viewEvents.length,
    totalLikes: allTime
      ? blogRows.reduce((sum, blog) => sum + blog._count.likes, 0)
      : likeEvents.length,
    totalComments: allTime
      ? blogRows.reduce((sum, blog) => sum + blog._count.comments, 0)
      : commentEvents.length,
    recentBlogs: rangeRecentBlogs,
    mostActiveEmployee: employeeRanking.find((employee) => employee.blogCount > 0) ?? null,
    topByViews: topBlog("views"),
    topByLikes: topBlog("likes"),
    topByComments: topBlog("comments"),
    topByReadTime,
    employeeRanking,
    popularBlogs: activeBlogSummaries.sort((a, b) => b.score - a.score).slice(0, 8),
    categoryRanking: [...categoryStats.values()]
      .sort((a, b) => b.views + b.likes * 2 + b.comments * 3 - (a.views + a.likes * 2 + a.comments * 3))
      .slice(0, 8),
    tagRanking: [...tagStats.values()].sort((a, b) => b.blogs - a.blogs).slice(0, 8),
    monthly: timeline.map(({ key: _key, ...bucket }) => bucket),
    reportBlogs: blogRows.filter((blog) => reportBlogIds.has(blog.id)).map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      status: blog.status,
      authorId: blog.authorId,
      authorName: blog.author.name,
      authorEmail: blog.author.email,
      authorRole: blog.author.role,
      categoryId: blog.categoryId ?? "",
      category: blog.category?.name ?? "Uncategorized",
      tags: blog.tags.map(({ tag }) => tag.name).join(", "),
      readingTimeMinutes: blog.readingTimeMinutes,
      createdAt: blog.createdAt.toISOString(),
      publishedAt: blog.publishedAt?.toISOString() ?? "",
      ...metricsFor(blog),
    })),
  };
}

export async function getEmployeeStats(
  authorId: string,
  range: AnalyticsRange = "all",
  startDate?: string,
  endDate?: string
) {
  const availableDateRange = await getAvailableDateRange(authorId);
  const period = periodFor(range, availableDateRange, startDate, endDate);
  const eventSince = eventWindow(range, period.start);
  const blogs = await prisma.blog.findMany({
    where: { authorId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      views: true,
      category: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  const blogIds = blogs.map(({ id }) => id);
  const [viewEvents, likeEvents, commentEvents, recentBlogs] = await Promise.all([
    prisma.blogView.findMany({
      where: { blogId: { in: blogIds }, viewedAt: { gte: eventSince ?? undefined, lte: period.end } },
      select: { blogId: true, viewedAt: true },
    }),
    prisma.like.findMany({
      where: { blogId: { in: blogIds }, createdAt: { gte: eventSince ?? undefined, lte: period.end } },
      select: { blogId: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { blogId: { in: blogIds }, createdAt: { gte: eventSince ?? undefined, lte: period.end } },
      select: { blogId: true, createdAt: true },
    }),
    prisma.blog.findMany({
      where: { authorId, createdAt: dateFilter(period.start, period.end) },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: { category: true, _count: { select: { likes: true, comments: true } } },
    }),
  ]);
  const allTime = range === "all";
  const blogsInRange = blogs.filter(
    (blog) =>
      (!period.start || blog.createdAt >= period.start) &&
      blog.createdAt <= period.end
  );
  const viewsByBlog = new Map<string, number>();
  const likesByBlog = new Map<string, number>();
  const commentsByBlog = new Map<string, number>();
  const timeline = createTimeline(range, period.start, period.end);
  const bucketsByKey = new Map(timeline.map((bucket) => [bucket.key, bucket]));
  for (const blog of blogs) {
    if (blog.createdAt >= (eventSince ?? new Date(0)) && blog.createdAt <= period.end) {
      addEvent(bucketsByKey, blog.createdAt, range, period.start, period.end, "blogs");
    }
  }
  for (const event of viewEvents) {
    viewsByBlog.set(event.blogId, (viewsByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.viewedAt, range, period.start, period.end, "views");
  }
  for (const event of likeEvents) {
    likesByBlog.set(event.blogId, (likesByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.createdAt, range, period.start, period.end, "likes");
  }
  for (const event of commentEvents) {
    commentsByBlog.set(event.blogId, (commentsByBlog.get(event.blogId) ?? 0) + 1);
    addEvent(bucketsByKey, event.createdAt, range, period.start, period.end, "comments");
  }
  const metricsFor = (blog: (typeof blogs)[number]) => ({
    views: allTime ? blog.views : viewsByBlog.get(blog.id) ?? 0,
    likes: allTime ? blog._count.likes : likesByBlog.get(blog.id) ?? 0,
    comments: allTime ? blog._count.comments : commentsByBlog.get(blog.id) ?? 0,
  });
  const popularBlog = [...blogs]
    .map((blog) => ({ blog, metrics: metricsFor(blog) }))
    .sort((a, b) =>
      b.metrics.views + b.metrics.likes * 2 + b.metrics.comments * 3 -
      (a.metrics.views + a.metrics.likes * 2 + a.metrics.comments * 3)
    )[0];
  const hasPopularBlogActivity = popularBlog &&
    popularBlog.metrics.views + popularBlog.metrics.likes + popularBlog.metrics.comments > 0;

  return {
    range,
    rangeLabel: period.label,
    availableDateRange,
    total: blogsInRange.length,
    published: blogsInRange.filter((blog) => blog.status === "PUBLISHED").length,
    drafts: blogsInRange.filter((blog) => blog.status === "DRAFT").length,
    unpublished: blogsInRange.filter((blog) => blog.status === "UNPUBLISHED").length,
    totalViews: allTime
      ? blogs.reduce((sum, blog) => sum + blog.views, 0)
      : viewEvents.length,
    totalLikes: allTime
      ? blogs.reduce((sum, blog) => sum + blog._count.likes, 0)
      : likeEvents.length,
    totalComments: allTime
      ? blogs.reduce((sum, blog) => sum + blog._count.comments, 0)
      : commentEvents.length,
    popularBlog: hasPopularBlogActivity
      ? {
          ...popularBlog.blog,
          ...popularBlog.metrics,
          _count: {
            likes: popularBlog.metrics.likes,
            comments: popularBlog.metrics.comments,
          },
        }
      : null,
    recentBlogs,
    monthly: timeline.map(({ key: _key, ...bucket }) => bucket),
  };
}
