"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlyMetric = {
  month: string;
  blogs: number;
  views: number;
  likes: number;
  comments: number;
};

type CategoryMetric = {
  name: string;
  blogs: number;
  views: number;
  likes: number;
  comments: number;
};

export function AdminAnalyticsCharts({
  monthly,
  categories,
  rangeLabel,
}: {
  monthly: MonthlyMetric[];
  categories: CategoryMetric[];
  rangeLabel: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Publishing & reach · {rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full" role="img" aria-label={`${rangeLabel} blog publishing and views chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="blogs" name="Blogs" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="views" name="Views" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reader engagement · {rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full" role="img" aria-label={`${rangeLabel} likes and comments chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="likes" name="Likes" stroke="#e879f9" strokeWidth={2} />
                <Line type="monotone" dataKey="comments" name="Comments" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Category performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare category performance for {rangeLabel.toLowerCase()}.
          </p>
        </CardHeader>
        <CardContent>
          {categories.length ? (
            <div className="h-72 w-full" role="img" aria-label="Views per category chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="views" name="Views" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Assign categories to blogs to see category performance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
