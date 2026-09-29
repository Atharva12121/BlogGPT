import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AdminProvisioningForm } from "@/components/auth/admin-provisioning-form";

export const dynamic = "force-dynamic";

export default function AdminSetupPage() {
  const provisioningConfigured =
    !!process.env.ADMIN_PROVISIONING_KEY &&
    process.env.ADMIN_PROVISIONING_KEY.length >= 8;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShieldCheck aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Restricted access
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">
            Admin account setup
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Create an administrator account using the private provisioning key
            configured for this local instance.
          </p>
        </div>

        {provisioningConfigured ? (
          <AdminProvisioningForm />
        ) : (
          <section
            aria-live="polite"
            className="rounded-xl border border-border bg-card p-6 text-sm leading-6 text-muted-foreground shadow-sm"
          >
            Admin setup is disabled because{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
              ADMIN_PROVISIONING_KEY
            </code>{" "}
            is not configured. Add a private key of at least 8 characters to
            your local environment and restart the development server.
          </section>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Return to{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            public sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
