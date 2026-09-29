import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth/api";
import {
  getAdminStats,
  getAnalyticsAvailability,
  validateAnalyticsDateRange,
} from "@/lib/services/stats";
import type { AnalyticsRange } from "@/lib/services/stats";
import { jsonError } from "@/lib/utils/api-response";

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseRange(value: string | null): AnalyticsRange {
  if (value === "day" || value === "month" || value === "year" || value === "custom") return value;
  return "all";
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;

  const exportFormat = request.nextUrl.searchParams.get("format");
  if (exportFormat !== "csv" && exportFormat !== "xlsx") {
    return jsonError("Choose csv or xlsx format", 400);
  }

  try {
    const range = parseRange(request.nextUrl.searchParams.get("range"));
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    if (range === "custom") {
      const message = validateAnalyticsDateRange(
        startDate,
        endDate,
        await getAnalyticsAvailability()
      );
      if (message) return jsonError(message, 400);
    }
    const stats = await getAdminStats(range, startDate ?? undefined, endDate ?? undefined);
    const blogs = stats.reportBlogs.map((blog) => ({
      "Blog ID": blog.id,
      Title: blog.title,
      Slug: blog.slug,
      Author: blog.authorName,
      "Author email": blog.authorEmail,
      "Author role": blog.authorRole,
      "Author ID": blog.authorId,
      Category: blog.category,
      "Category ID": blog.categoryId,
      Tags: blog.tags,
      Status: blog.status,
      Views: blog.views,
      Likes: blog.likes,
      Comments: blog.comments,
      "Reading time (minutes)": blog.readingTimeMinutes,
      "Created at": blog.createdAt,
      "Published at": blog.publishedAt,
      "Engagement score": blog.views + blog.likes * 2 + blog.comments * 3,
    }));
    const employees = stats.employeeRanking.map((employee) => ({
      "Employee ID": employee.id,
      Name: employee.name,
      Email: employee.email,
      "Blog count": employee.blogCount,
      Views: employee.views,
      Likes: employee.likes,
      Comments: employee.comments,
    }));

    if (exportFormat === "csv") {
      const headers = Object.keys(blogs[0] ?? {
        "Blog ID": "",
        Title: "",
        Slug: "",
        Author: "",
        "Author email": "",
        "Author role": "",
        "Author ID": "",
        Category: "",
        "Category ID": "",
        Tags: "",
        Status: "",
        Views: "",
        Likes: "",
        Comments: "",
        "Reading time (minutes)": "",
        "Created at": "",
        "Published at": "",
        "Engagement score": "",
      });
      const rows = [headers, ...blogs.map((blog) => Object.values(blog))];
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bloggpt-blogs-${range}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Metric: "Selected range", Value: stats.rangeLabel },
        { Metric: "Employees", Value: stats.employees },
        { Metric: "Blogs", Value: stats.blogs },
        { Metric: "Published", Value: stats.published },
        { Metric: "Drafts", Value: stats.drafts },
        { Metric: "Unpublished", Value: stats.unpublished },
        { Metric: "Views", Value: stats.totalViews },
        { Metric: "Likes", Value: stats.totalLikes },
        { Metric: "Comments", Value: stats.totalComments },
      ]),
      "Overview"
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(blogs), "Blogs");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(employees), "Employees");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.monthly), "Activity");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(stats.categoryRanking),
      "Categories"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bloggpt-analytics-${range}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin report export failed", error);
    return jsonError("Unable to export analytics", 500);
  }
}
