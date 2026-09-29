import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PublicHeader } from "@/components/layout/public-header";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="px-4 py-16">
        <Suspense fallback={<div className="mx-auto h-40 max-w-md animate-pulse rounded-xl bg-secondary" />}>
          <AuthForm mode="login" />
        </Suspense>
      </main>
    </div>
  );
}
