"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminProvisioningSchema } from "@/lib/validation/auth";

type ProvisioningField = "name" | "email" | "password" | "provisioningKey";

export function AdminProvisioningForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [provisioningKey, setProvisioningKey] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProvisioningField, string>>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = adminProvisioningSchema.safeParse({ name, email, password, provisioningKey });
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        provisioningKey: errors.provisioningKey?.[0],
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin-provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, provisioningKey }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to create admin account.");
        return;
      }

      toast.success("Admin account created. Continue to public sign up.");
      router.replace("/signup?adminCreated=1");
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound aria-hidden="true" className="h-5 w-5 text-accent" />
          Provision administrator
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          The provisioning key is checked server-side and is never stored with
          the account.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              autoComplete="name"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "admin-name-error" : undefined}
              required
            />
            {fieldErrors.name && <p id="admin-name-error" role="alert" className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
              required
            />
            {fieldErrors.email && <p id="admin-email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "admin-password-error" : undefined}
              required
            />
            {fieldErrors.password ? <p id="admin-password-error" role="alert" className="text-sm text-destructive">{fieldErrors.password}</p> : <p className="text-xs text-muted-foreground">
              Use at least 12 characters.
            </p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="provisioning-key">Private provisioning key</Label>
            <Input
              id="provisioning-key"
              type="password"
              autoComplete="off"
              minLength={8}
              maxLength={256}
              value={provisioningKey}
              onChange={(event) => setProvisioningKey(event.target.value)}
              aria-invalid={Boolean(fieldErrors.provisioningKey)}
              aria-describedby={fieldErrors.provisioningKey ? "provisioning-key-error" : "provisioning-key-help"}
              required
            />
            {fieldErrors.provisioningKey ? <p id="provisioning-key-error" role="alert" className="text-sm text-destructive">{fieldErrors.provisioningKey}</p> : <p id="provisioning-key-help" className="text-xs text-muted-foreground">Use at least 8 characters. A longer random key is safer.</p>}
          </div>
          <Button
            type="submit"
            variant="accent"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create admin account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
