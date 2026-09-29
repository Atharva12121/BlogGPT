"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  FileText,
  MessageCircle,
  ThumbsUp,
  Users,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { AdminAnalyticsCharts } from "@/components/admin/admin-analytics-charts";
import { StatsCards } from "@/components/admin/stats-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsRange } from "@/lib/services/stats";

type DashboardStats = {
  rangeLabel: string;
  availableDateRange: { startDate: string; endDate: string };
  employees: number;
  blogs: number;
  published: number;
  drafts: number;
  unpublished: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  monthly: { month: string; blogs: number; views: number; likes: number; comments: number }[];
  categoryRanking: { id: string; name: string; blogs: number; views: number; likes: number; comments: number }[];
  employeeRanking: {
    id: string;
    name: string;
    email: string;
    blogCount: number;
    views: number;
    likes: number;
    comments: number;
  }[];
  topByViews: { id: string; title: string; authorName: string; authorId: string; category: string; views: number; likes: number; comments: number; readingTimeMinutes: number } | null;
  topByLikes: { id: string; title: string; authorName: string; authorId: string; category: string; views: number; likes: number; comments: number; readingTimeMinutes: number } | null;
  topByComments: { id: string; title: string; authorName: string; authorId: string; category: string; views: number; likes: number; comments: number; readingTimeMinutes: number } | null;
  topByReadTime: { id: string; title: string; authorName: string; authorId: string; category: string; views: number; likes: number; comments: number; readingTimeMinutes: number } | null;
  popularBlogs: {
    id: string;
    title: string;
    status: string;
    authorId: string;
    authorName: string;
    category: string;
    views: number;
    likes: number;
    comments: number;
    score: number;
  }[];
  tagRanking: { id: string; name: string; blogs: number }[];
  recentBlogs: {
    id: string;
    title: string;
    status: string;
    author: { id: string; name: string; email: string; role: string };
    category: { id: string; name: string } | null;
    _count: { likes: number; comments: number };
  }[];
};

const numberFormat = new Intl.NumberFormat();

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<AnalyticsRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedHighlight, setSelectedHighlight] = useState<"views" | "likes" | "comments" | "readTime">("views");
  const { user } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    const params = new URLSearchParams({ range });
    if (range === "custom" && startDate) params.set("startDate", startDate);
    if (range === "custom" && endDate) params.set("endDate", endDate);
    fetch(`/api/stats/admin?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load dashboard analytics.");
        }
        setStats(result.data as DashboardStats);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(true);
        toast.error(error instanceof Error ? error.message : "Unable to load dashboard analytics.");
      });
    return () => controller.abort();
  }, [range, startDate, endDate]);

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-6">
        <h1 className="text-xl font-semibold">Analytics could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the server connection, then refresh this page.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-xl bg-secondary" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">Platform intelligence</p>
          <h1 className="mt-1 text-3xl font-semibold">Admin overview</h1>
          <p className="mt-2 text-muted-foreground">
            Content performance, reader engagement, and team activity at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            value={range}
            onChange={setRange}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            availableStartDate={stats.availableDateRange.startDate}
            availableEndDate={stats.availableDateRange.endDate}
          />
          <a href={`/api/reports/admin?format=csv&range=${range}${range === "custom" && startDate ? `&startDate=${startDate}` : ""}${range === "custom" && endDate ? `&endDate=${endDate}` : ""}`}>
            <Button variant="outline">
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
          </a>
          <a href={`/api/reports/admin?format=xlsx&range=${range}${range === "custom" && startDate ? `&startDate=${startDate}` : ""}${range === "custom" && endDate ? `&endDate=${endDate}` : ""}`}>
            <Button variant="accent">
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
              Export Excel
            </Button>
          </a>
        </div>
      </header>

      <Card className="border-accent/20 bg-gradient-to-r from-accent/10 via-card to-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signed in as administrator</p>
            <p className="mt-1 font-medium">{user?.name} <span className="text-muted-foreground">· {user?.email}</span></p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              Admin ID: {user?.id ?? "Loading account…"}
            </p>
          </div>
          <Badge variant="outline">ADMIN</Badge>
        </CardContent>
      </Card>

      <StatsCards
        stats={[
          { label: "Employees", value: numberFormat.format(stats.employees), icon: Users },
          { label: "Total blogs", value: numberFormat.format(stats.blogs), icon: FileText },
          { label: "Total views", value: numberFormat.format(stats.totalViews), icon: Eye },
          { label: "Likes", value: numberFormat.format(stats.totalLikes), icon: ThumbsUp },
          { label: "Comments", value: numberFormat.format(stats.totalComments), icon: MessageCircle },
          { label: "Published", value: numberFormat.format(stats.published), icon: ArrowUpRight },
          { label: "Drafts", value: numberFormat.format(stats.drafts), icon: FileText },
          { label: "Unpublished", value: numberFormat.format(stats.unpublished), icon: Activity },
        ]}
      />

      <p className="text-sm font-medium text-foreground/80">
        Showing {stats.rangeLabel.toLowerCase()} metrics. Employee count reflects all current employee accounts.
      </p>
      <AdminAnalyticsCharts
        monthly={stats.monthly}
        categories={stats.categoryRanking}
        rangeLabel={stats.rangeLabel}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "views" as const, title: "Most views", blog: stats.topByViews, icon: Eye, metric: (blog: NonNullable<DashboardStats["topByViews"]>) => `${numberFormat.format(blog.views)} views` },
          { key: "likes" as const, title: "Most likes", blog: stats.topByLikes, icon: ThumbsUp, metric: (blog: NonNullable<DashboardStats["topByLikes"]>) => `${numberFormat.format(blog.likes)} likes` },
          { key: "comments" as const, title: "Most comments", blog: stats.topByComments, icon: MessageCircle, metric: (blog: NonNullable<DashboardStats["topByComments"]>) => `${numberFormat.format(blog.comments)} comments` },
          { key: "readTime" as const, title: "Longest read", blog: stats.topByReadTime, icon: BookOpen, metric: (blog: NonNullable<DashboardStats["topByReadTime"]>) => `${blog.readingTimeMinutes} min read` },
        ].map(({ key, title, blog, icon: Icon, metric }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedHighlight(key)}
            aria-pressed={selectedHighlight === key}
            className={`rounded-xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedHighlight === key ? "ring-2 ring-accent" : "hover:-translate-y-0.5"}`}
          >
            <Card className="h-full">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                <Icon className="h-4 w-4 text-accent" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-muted-foreground">{blog ? metric(blog) : "No data yet"}</p>
                {blog && <p className="mt-1 line-clamp-2 font-semibold">{blog.title}</p>}
                <p className="mt-2 text-xs text-accent">Click to view blog details</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {(() => {
        const highlights = {
          views: { title: "Most viewed blog", blog: stats.topByViews, detail: (blog: NonNullable<DashboardStats["topByViews"]>) => `${numberFormat.format(blog.views)} views` },
          likes: { title: "Most liked blog", blog: stats.topByLikes, detail: (blog: NonNullable<DashboardStats["topByLikes"]>) => `${numberFormat.format(blog.likes)} likes` },
          comments: { title: "Most commented blog", blog: stats.topByComments, detail: (blog: NonNullable<DashboardStats["topByComments"]>) => `${numberFormat.format(blog.comments)} comments` },
          readTime: { title: "Longest reading-time blog", blog: stats.topByReadTime, detail: (blog: NonNullable<DashboardStats["topByReadTime"]>) => `${blog.readingTimeMinutes} minutes to read` },
        };
        const selected = highlights[selectedHighlight];
        return (
          <Card className="border-accent/30">
            <CardHeader><CardTitle>{selected.title}</CardTitle></CardHeader>
            <CardContent>
              {selected.blog ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Link href={`/dashboard/admin/blogs/${selected.blog.id}`} className="font-semibold hover:text-accent">
                      {selected.blog.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.blog.category} · {selected.blog.authorName} · {selected.detail(selected.blog)}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Author ID: {selected.blog.authorId}</p>
                  </div>
                  <Link href={`/dashboard/admin/blogs/${selected.blog.id}`}>
                    <Button variant="accent">View / edit blog</Button>
                  </Link>
                </div>
              ) : <p className="text-sm text-muted-foreground">No matching blog data for this range.</p>}
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most active employees</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ranked by posts created in this period and engagement; IDs distinguish employees with the same name.
            </p>
          </CardHeader>
          <CardContent>
            {stats.employeeRanking.length ? (
              <div className="space-y-4">
                {stats.employeeRanking.slice(0, 8).map((employee, index) => (
                  <div key={employee.id} className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-0">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/admin/employees?employeeId=${encodeURIComponent(employee.id)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {employee.name}
                        </Link>
                        <p className="break-all font-mono text-xs text-muted-foreground">{employee.id}</p>
                        <p className="text-xs text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p>{employee.blogCount} blogs · {numberFormat.format(employee.views)} views</p>
                      <p className="text-xs text-muted-foreground">{employee.likes} likes · {employee.comments} comments</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No employee activity yet.</p>
            )}
            <Link href="/dashboard/admin/employees" className="mt-4 inline-flex text-sm font-medium text-accent hover:underline">
              Manage employees
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most popular blogs</CardTitle>
            <p className="text-sm text-muted-foreground">
              Engagement score weights views, likes, and comments to highlight reader interest.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.popularBlogs.length ? stats.popularBlogs.map((blog) => (
              <div key={blog.id} className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-0">
                <div className="min-w-0">
                  <Link href={`/dashboard/admin/blogs/${blog.id}`} className="font-medium hover:text-accent">
                    {blog.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {blog.category} · {blog.authorName}
                  </p>
                  <p className="break-all font-mono text-[11px] text-muted-foreground">
                    Author ID: {blog.authorId}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{blog.views} views · {blog.likes} likes</p>
                  <p>{blog.comments} comments · score {blog.score}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No blog activity yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Popular tags</CardTitle>
          <p className="text-sm text-muted-foreground">Tags with the most assigned blogs.</p>
        </CardHeader>
        <CardContent>
          {stats.tagRanking.length ? (
            <div className="flex flex-wrap gap-2">
              {stats.tagRanking.map((tag) => (
                <Badge key={tag.id} variant="outline" className="gap-2 px-3 py-1.5">
                  {tag.name}<span className="text-muted-foreground">{tag.blogs} blogs</span>
                </Badge>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No tags are in use yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent content activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentBlogs.length ? stats.recentBlogs.map((blog) => (
            <div key={blog.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0">
              <div className="min-w-0">
                <Link href={`/dashboard/admin/blogs/${blog.id}`} className="font-medium hover:text-accent">
                  {blog.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {blog.author.name} · {blog.author.email} · {blog.category?.name ?? "Uncategorized"}
                </p>
                <p className="break-all font-mono text-[11px] text-muted-foreground">
                  Author ID: {blog.author.id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {blog._count.likes} likes · {blog._count.comments} comments
                </span>
                <Badge variant="outline">{blog.status}</Badge>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No blogs created yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
