"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  KeyRound,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  ThumbsUp,
  Trash2,
  X,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { employeeSchema } from "@/lib/validation/auth";

const numberFormat = new Intl.NumberFormat();

type Employee = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count: { blogs: number };
  totalViews: number;
  totalLikes: number;
  totalComments: number;
};

type EmployeeBlog = {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  status: string;
  views: number;
  createdAt: string;
  category?: { name: string } | null;
  _count: { likes: number; comments: number };
};

function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createErrors, setCreateErrors] = useState<Partial<Record<"name" | "email" | "password", string>>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editErrors, setEditErrors] = useState<Partial<Record<"name" | "email" | "password", string>>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [employeeBlogs, setEmployeeBlogs] = useState<Record<string, EmployeeBlog[]>>({});
  const [showAllBlogs, setShowAllBlogs] = useState(false);
  const [loadingBlogsFor, setLoadingBlogsFor] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [handledRequestedEmployee, setHandledRequestedEmployee] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await fetch("/api/employees");
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to load employee accounts.");
        return;
      }
      setEmployees(result.data);
    } catch {
      toast.error("Unable to reach the server.");
    }
  }, []);

  const loadEmployeeBlogs = useCallback(async (employeeId: string, limit: number) => {
    setLoadingBlogsFor(employeeId);
    try {
      const params = new URLSearchParams({
        all: "true",
        authorId: employeeId,
        limit: String(limit),
      });
      const response = await fetch(`/api/blogs?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to load employee blogs.");
        return;
      }
      setEmployeeBlogs((current) => ({ ...current, [employeeId]: result.data.items }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load employee blogs.");
    } finally {
      setLoadingBlogsFor(null);
    }
  }, []);

  const toggleEmployeeBlogs = (employeeId: string) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
      setShowAllBlogs(false);
      return;
    }
    setExpandedEmployee(employeeId);
    setShowAllBlogs(false);
    if (!employeeBlogs[employeeId] || employeeBlogs[employeeId].length < 3) {
      void loadEmployeeBlogs(employeeId, 3);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (handledRequestedEmployee || employees.length === 0) return;
    const requestedEmployeeId = new URLSearchParams(window.location.search).get("employeeId");
    if (!requestedEmployeeId) {
      setHandledRequestedEmployee(true);
      return;
    }
    if (employees.some((employee) => employee.id === requestedEmployeeId)) {
      setExpandedEmployee(requestedEmployeeId);
      void loadEmployeeBlogs(requestedEmployeeId, 3);
      window.setTimeout(() => {
        document.getElementById(`employee-${requestedEmployeeId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }
    setHandledRequestedEmployee(true);
  }, [employees, handledRequestedEmployee, loadEmployeeBlogs]);

  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    return !query || [employee.name, employee.email, employee.id].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  const createEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = employeeSchema.safeParse({ name, email, password });
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setCreateErrors({ name: errors.name?.[0], email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }
    setCreateErrors({});
    setLoading(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to create the employee account.");
        return;
      }
      toast.success("Employee account created. Share the temporary password securely.");
      setName("");
      setEmail("");
      setPassword("");
      await loadEmployees();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const saveEmployee = async (employeeId: string) => {
    const update = {
      name: editName,
      email: editEmail,
      ...(editPassword ? { password: editPassword } : {}),
    };
    const validation = employeeSchema.safeParse(update);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setEditErrors({ name: errors.name?.[0], email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }
    setEditErrors({});
    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to update employee.");
        return;
      }
      toast.success("Employee account updated.");
      setEditing(null);
      setEditPassword("");
      await loadEmployees();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async () => {
    if (!employeeToDelete) return;
    setDeletingEmployee(true);
    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to delete employee.");
        return;
      }
      toast.success("Employee account deleted.");
      setEmployeeToDelete(null);
      await loadEmployees();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setDeletingEmployee(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5" aria-hidden />
          Add employee
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Employees are provisioned by Admin. Share temporary credentials securely.
        </p>
        <form onSubmit={createEmployee} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" noValidate>
          <div>
            <Input value={name} onChange={(event) => { setName(event.target.value); setCreateErrors((current) => ({ ...current, name: undefined })); }} placeholder="Full name" minLength={2} maxLength={100} required aria-label="Employee name" aria-invalid={Boolean(createErrors.name)} />
            {createErrors.name && <p role="alert" className="mt-1 text-xs text-destructive">{createErrors.name}</p>}
          </div>
          <div>
            <Input value={email} onChange={(event) => { setEmail(event.target.value); setCreateErrors((current) => ({ ...current, email: undefined })); }} type="email" placeholder="Email address" required aria-label="Employee email" aria-invalid={Boolean(createErrors.email)} />
            {createErrors.email && <p role="alert" className="mt-1 text-xs text-destructive">{createErrors.email}</p>}
          </div>
          <div>
            <Input value={password} onChange={(event) => { setPassword(event.target.value); setCreateErrors((current) => ({ ...current, password: undefined })); }} type="text" minLength={8} maxLength={128} placeholder="Temporary password" required aria-label="Temporary password" aria-invalid={Boolean(createErrors.password)} />
            {createErrors.password && <p role="alert" className="mt-1 text-xs text-destructive">{createErrors.password}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setPassword(temporaryPassword())}>
              <KeyRound className="h-4 w-4" aria-hidden />
              Generate
            </Button>
            <Button type="submit" variant="accent" disabled={loading}>{loading && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}{loading ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border">
        <div className="border-b bg-card p-4">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              className="pl-9"
              placeholder="Search employee name, email, or ID"
              aria-label="Search employees by name, email, or ID"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Blogs</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <Fragment key={employee.id}>
              <tr id={`employee-${employee.id}`} className="border-t">
                {editing === employee.id ? (
                  <>
                    <td className="space-y-2 px-4 py-3">
                      <div><Input value={editName} onChange={(event) => { setEditName(event.target.value); setEditErrors((current) => ({ ...current, name: undefined })); }} minLength={2} maxLength={100} required aria-label="Edit employee name" aria-invalid={Boolean(editErrors.name)} />{editErrors.name && <p role="alert" className="mt-1 text-xs text-destructive">{editErrors.name}</p>}</div>
                      <div><Input value={editEmail} onChange={(event) => { setEditEmail(event.target.value); setEditErrors((current) => ({ ...current, email: undefined })); }} type="email" required aria-label="Edit employee email" aria-invalid={Boolean(editErrors.email)} />{editErrors.email && <p role="alert" className="mt-1 text-xs text-destructive">{editErrors.email}</p>}</div>
                      <div><Input value={editPassword} onChange={(event) => { setEditPassword(event.target.value); setEditErrors((current) => ({ ...current, password: undefined })); }} type="password" minLength={8} maxLength={128} placeholder="New temporary password (optional)" aria-label="Reset employee password" aria-invalid={Boolean(editErrors.password)} />{editErrors.password && <p role="alert" className="mt-1 text-xs text-destructive">{editErrors.password}</p>}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{employee.id}</td>
                    <td className="px-4 py-3">{employee._count.blogs}</td>
                    <td className="px-4 py-3">{new Date(employee.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="accent" disabled={loading} onClick={() => saveEmployee(employee.id)}>{loading && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}{loading ? "Saving…" : "Save"}</Button>
                        <Button size="icon" variant="ghost" aria-label="Cancel editing" onClick={() => setEditing(null)}><X className="h-4 w-4" aria-hidden /></Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleEmployeeBlogs(employee.id)}
                        className="flex items-center gap-1 text-left font-medium text-accent hover:underline"
                        aria-expanded={expandedEmployee === employee.id}
                      >
                        {expandedEmployee === employee.id
                          ? <ChevronDown className="h-4 w-4" aria-hidden />
                          : <ChevronRight className="h-4 w-4" aria-hidden />}
                        <HighlightedText text={employee.name} query={search} />
                      </button>
                      <p className="text-muted-foreground"><HighlightedText text={employee.email} query={search} /></p>
                    </td>
                    <td className="max-w-56 break-all px-4 py-3 font-mono text-xs text-muted-foreground"><HighlightedText text={employee.id} query={search} /></td>
                    <td className="px-4 py-3">{employee._count.blogs}</td>
                    <td className="px-4 py-3">{new Date(employee.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditing(employee.id);
                          setEditName(employee.name);
                          setEditEmail(employee.email);
                          setEditPassword("");
                        }}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        <Button size="icon" variant="destructive" aria-label={`Delete ${employee.name}`} onClick={() => setEmployeeToDelete(employee)}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {expandedEmployee === employee.id && (
                <tr className="border-t bg-muted/30">
                  <td colSpan={5} className="p-4">
                    {loadingBlogsFor === employee.id && !employeeBlogs[employee.id] ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Loading employee blogs…</p>
                    ) : (
                      <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{employee.name}’s blog activity</h3>
                            <p className="text-sm text-muted-foreground">
                              {employee._count.blogs} total blogs
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5">
                              <Eye className="h-3.5 w-3.5" aria-hidden />{numberFormat.format(employee.totalViews)} views
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5">
                              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />{numberFormat.format(employee.totalLikes)} likes
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5">
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden />{numberFormat.format(employee.totalComments)} comments
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {(employeeBlogs[employee.id] ?? []).slice(0, showAllBlogs ? undefined : 3).map((blog) => (
                            <article key={blog.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium">{blog.title}</h4>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                  {blog.excerpt || "No excerpt provided."}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {blog.category?.name ?? "Uncategorized"} · {blog.status} · {blog.views} views · {blog._count.likes} likes · {blog._count.comments} comments
                                </p>
                              </div>
                              <Link href={`/dashboard/admin/blogs/${blog.id}`}>
                                <Button size="sm" variant="outline">View / edit</Button>
                              </Link>
                            </article>
                          ))}
                          {!loadingBlogsFor && (employeeBlogs[employee.id] ?? []).length === 0 && (
                            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                              This employee has not created any blogs yet.
                            </p>
                          )}
                        </div>
                        {employee._count.blogs > 3 && (
                          <div className="mt-4 flex justify-center">
                            <Button
                              variant="outline"
                              disabled={loadingBlogsFor === employee.id}
                              onClick={() => {
                                if (showAllBlogs) {
                                  setShowAllBlogs(false);
                                } else {
                                  setShowAllBlogs(true);
                                  if ((employeeBlogs[employee.id] ?? []).length < employee._count.blogs) {
                                    void loadEmployeeBlogs(employee.id, 200);
                                  }
                                }
                              }}
                            >
                              {loadingBlogsFor === employee.id
                                ? "Loading…"
                                : showAllBlogs
                                  ? "Show fewer blogs"
                                  : `See all ${employee._count.blogs} blogs`}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {filteredEmployees.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                {employees.length === 0 ? "No employee accounts yet. Create the first one above." : "No employees match your search."}
              </td></tr>
            )}
          </tbody>
        </table>
      </section>
      <ConfirmDialog
        open={Boolean(employeeToDelete)}
        onOpenChange={(open) => !open && !deletingEmployee && setEmployeeToDelete(null)}
        title={`Delete ${employeeToDelete?.name ?? "employee"}'s account?`}
        description="Their blogs, likes, and comments will also be removed. This action cannot be undone."
        confirmLabel="Delete account"
        loading={deletingEmployee}
        onConfirm={() => void deleteEmployee()}
      />
    </div>
  );
}
