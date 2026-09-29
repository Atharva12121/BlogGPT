"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Users, FileText, Tags, FolderTree, House } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const adminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/employees", label: "Employees", icon: Users },
  { href: "/dashboard/admin/blogs", label: "Blogs", icon: FileText },
  { href: "/dashboard/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/dashboard/admin/tags", label: "Tags", icon: Tags },
];

const employeeLinks = [
  { href: "/dashboard/employee", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/employee/blogs", label: "My Blogs", icon: FileText },
  { href: "/dashboard/employee/blogs/new", label: "New Blog", icon: FileText },
];

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "EMPLOYEE";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const links = role === "ADMIN" ? adminLinks : employeeLinks;

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4">
          <Link href="/" className="font-serif text-lg font-semibold">
            BlogGPT
          </Link>
          <ThemeToggle />
        </div>
        <nav className="space-y-1 p-3" aria-label="Dashboard">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
          >
            <House className="h-4 w-4" aria-hidden />
            Home
          </Link>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary",
                pathname === href && "bg-secondary font-medium"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={() => setLogoutOpen(true)}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="p-4 sm:p-8">{children}</main>
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={(open) => !loggingOut && setLogoutOpen(open)}
        title="Sign out?"
        description="You will need to sign in again to access your dashboard."
        confirmLabel="Sign out"
        destructive={false}
        loading={loggingOut}
        onConfirm={() => void onLogout()}
      />
    </div>
  );
}
