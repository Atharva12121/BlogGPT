"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

type AuthField = "name" | "email" | "password";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});

  useEffect(() => {
    if (mode === "signup" && searchParams.get("adminCreated") === "1") {
      toast.success("Admin account created. Sign in to continue.");
    }
  }, [mode, searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body =
      mode === "login"
        ? { email, password }
        : { name, email, password };
    const validation = mode === "login"
      ? loginSchema.safeParse(body)
      : signupSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors as Partial<Record<AuthField, string[]>>;
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Authentication failed.");
        return;
      }

      toast.success(mode === "login" ? "Welcome back." : "Account created.");
      const next = searchParams.get("next");
      if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        const destination = new URL(next, window.location.origin);
        if (destination.origin === window.location.origin) {
          router.push(`${destination.pathname}${destination.search}${destination.hash}`);
          return;
        }
      }
      router.push(
        json.data.user.role === "ADMIN"
          ? "/dashboard/admin"
          : json.data.user.role === "EMPLOYEE"
            ? "/dashboard/employee"
            : "/"
      );
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Sign in" : "Create reader account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }}
                minLength={2}
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-destructive">{fieldErrors.name}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
              required
            />
            {fieldErrors.email ? (
              <p id="email-error" role="alert" className="mt-1 text-sm text-destructive">{fieldErrors.email}</p>
            ) : (
              <p id="email-help" className="mt-1 text-xs text-muted-foreground">Enter an email like name@example.com.</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
              required
            />
            {fieldErrors.password ? (
              <p id="password-error" role="alert" className="mt-1 text-sm text-destructive">{fieldErrors.password}</p>
            ) : (
              <p id="password-help" className="mt-1 text-xs text-muted-foreground">Use at least 8 characters.</p>
            )}
          </div>
          <Button type="submit" className="w-full" variant="accent" disabled={loading}>
            {loading ? (
              <><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />Please wait…</>
            ) : mode === "login" ? "Login" : "Sign up as a reader"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Login
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
