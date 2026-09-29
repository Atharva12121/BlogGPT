"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  Eye,
  FileText,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { StatsCards } from "@/components/admin/stats-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsRange } from "@/lib/services/stats";

type EmployeeStats = {
  rangeLabel: string;
  availableDateRange: { startDate: string; endDate: string };
  total: number;
  published: number;
  drafts: number;
  unpublished: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  monthly: { month: string; blogs: number; views: number; likes: number; comments: number }[];
  popularBlog: {
    id: string;
    title: string;
    status: string;
    views: number;
    category: { name: string } | null;
    _count: { likes: number; comments: number };
  } | null;
  recentBlogs: {
    id: string;
    title: string;
    slug: string;
    status: string;
    readingTimeMinutes: number;
    updatedAt: string;
    category: { name: string } | null;
    _count: { likes: number; comments: number };
  }[];
};

const numberFormat = new Intl.NumberFormat();

export default function EmployeeDashboardPage() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<AnalyticsRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    const params = new URLSearchParams({ range });
    if (range === "custom" && startDate) params.set("startDate", startDate);
    if (range === "custom" && endDate) params.set("endDate", endDate);
    fetch(`/api/stats/employee?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load your overview.");
        }
        setStats(result.data as EmployeeStats);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(true);
        toast.error(error instanceof Error ? error.message : "Unable to load your overview.");
      });
    return () => controller.abort();
  }, [range, startDate, endDate]);

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-6">
        <h1 className="text-xl font-semibold">Your overview could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check the server connection, then refresh.</p>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-xl bg-secondary" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-secondary" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">Your publishing workspace</p>
          <h1 className="mt-1 text-3xl font-semibold">Employee overview</h1>
          <p className="mt-2 text-muted-foreground">Track your publishing cadence, reach, and reader feedback.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <Link href="/dashboard/employee/blogs/new">
            <Button variant="accent">Create blog</Button>
          </Link>
        </div>
      </header>

      <Card className="border-accent/20 bg-gradient-to-r from-accent/10 via-card to-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employee account</p>
            <p className="mt-1 font-medium">{user?.name} <span className="text-muted-foreground">· {user?.email}</span></p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              Employee ID: {user?.id ?? "Loading account…"}
            </p>
          </div>
          <Badge variant="outline">EMPLOYEE</Badge>
        </CardContent>
      </Card>

      <StatsCards
        stats={[
          { label: "Total blogs", value: numberFormat.format(stats.total), icon: FileText },
          { label: "Published", value: numberFormat.format(stats.published), icon: ArrowUpRight },
          { label: "Total views", value: numberFormat.format(stats.totalViews), icon: Eye },
          { label: "Likes", value: numberFormat.format(stats.totalLikes), icon: ThumbsUp },
          { label: "Comments", value: numberFormat.format(stats.totalComments), icon: MessageCircle },
          { label: "Drafts", value: numberFormat.format(stats.drafts), icon: Activity },
        ]}
      />
      <p className="text-sm font-medium text-foreground/80">
        Showing {stats.rangeLabel.toLowerCase()} metrics.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reach and engagement · {stats.rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full" role="img" aria-label={`${stats.rangeLabel} views, likes, comments, and blog publishing chart`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthly} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" name="Views" stroke="#0ea5e9" strokeWidth={2} />
                  <Line type="monotone" dataKey="likes" name="Likes" stroke="#e879f9" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" name="Comments" stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="blogs" name="Blogs" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your top-performing blog</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.popularBlog ? (
              <div className="space-y-3">
                <Link href={`/dashboard/employee/blogs/${stats.popularBlog.id}/edit`} className="font-semibold hover:text-accent">
                  {stats.popularBlog.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {stats.popularBlog.category?.name ?? "Uncategorized"} · {stats.popularBlog.status}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <p className="rounded-lg bg-secondary p-3"><strong className="block">{stats.popularBlog.views}</strong>views</p>
                  <p className="rounded-lg bg-secondary p-3"><strong className="block">{stats.popularBlog._count.likes}</strong>likes</p>
                  <p className="rounded-lg bg-secondary p-3"><strong className="block">{stats.popularBlog._count.comments}</strong>comments</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-foreground/80">
                  {stats.total > 0
                    ? "No reader activity for this period yet."
                    : "Create your first post to see performance here."}
                </p>
                <Link
                  href={stats.total > 0 ? "/dashboard/employee/blogs" : "/dashboard/employee/blogs/new"}
                  className="mt-3 inline-block"
                >
                  <Button size="sm">{stats.total > 0 ? "View your blogs" : "Create a blog"}</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Recent blogs</CardTitle>
          <Link href="/dashboard/employee/blogs" className="text-sm font-medium text-accent hover:underline">View all blogs</Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentBlogs.length ? stats.recentBlogs.map((blog) => (
            <div key={blog.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0">
              <div className="min-w-0">
                <Link href={`/dashboard/employee/blogs/${blog.id}/edit`} className="font-medium hover:text-accent">{blog.title}</Link>
                <p className="text-xs text-muted-foreground">
                  {blog.category?.name ?? "Uncategorized"} · {blog.readingTimeMinutes} min read · Updated {format(new Date(blog.updatedAt), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{blog._count.likes} likes · {blog._count.comments} comments</span>
                <Badge variant="outline">{blog.status}</Badge>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No blogs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first article to start tracking views and engagement.</p>
              <Link href="/dashboard/employee/blogs/new" className="mt-4 inline-block"><Button variant="accent">Create your first blog</Button></Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
