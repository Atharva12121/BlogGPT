"use client";

import Link from "next/link";
import { BookOpen, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/dashboard/admin"
      : user?.role === "EMPLOYEE"
        ? "/dashboard/employee"
        : "/";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <BookOpen className="h-6 w-6 text-accent" aria-hidden />
          BlogGPT
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          <Link href="/" className="text-sm hover:text-accent">
            Home
          </Link>
          <Link href="/search" className="text-sm hover:text-accent">
            Search
          </Link>
          {user && user.role !== "READER" ? (
            <Link href={dashboardHref}>
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : user ? (
            <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-accent">
                Login
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="accent">
                  Sign up
                </Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t px-4 py-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3">
            <Link href="/" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/search" onClick={() => setOpen(false)}>
              Search
            </Link>
            {user && user.role !== "READER" ? (
              <Link href={dashboardHref} onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            ) : user ? (
              <button type="button" onClick={() => setLogoutOpen(true)} className="text-left">
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Login
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={(isOpen) => !loggingOut && setLogoutOpen(isOpen)}
        title="Sign out?"
        description="You will be signed out of this account on this device."
        confirmLabel="Sign out"
        destructive={false}
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
      />
    </header>
  );
}
