import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PublicHeader } from "@/components/layout/public-header";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="px-4 py-16">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Reader accounts can like and comment. Employee accounts are created by an Admin.
        </p>
        <Suspense fallback={<div className="mx-auto h-40 max-w-md animate-pulse rounded-xl bg-secondary" />}>
          <AuthForm mode="signup" />
        </Suspense>
      </main>
    </div>
  );
}
