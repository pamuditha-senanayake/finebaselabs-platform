"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BoxesIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";

import { demoAccounts, login, type DemoRole } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS: { role: DemoRole; label: string }[] = [
  { role: "CUSTOMER", label: "Login as Demo Customer" },
];

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginValues) {
    setLoading(true);
    setFormError(null);

    try {
      await login(values.email, values.password);
      router.replace("/dashboard/store");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
      setLoading(false);
    }
  }

  function handleDemoLogin(role: DemoRole) {
    if (loading) return;
    const account = demoAccounts[role];
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
    void submit(account);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(59,130,246,0.18),transparent)]"
      />

      <Card className="relative w-full max-w-md border border-slate-800/60 bg-slate-900/40 ring-1 ring-slate-800/60 backdrop-blur-xl">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BoxesIcon className="size-5 text-[#3B82F6]" />
            <span>FineBase Labs</span>
          </div>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to manage your requests and reviews.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(submit)}
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@finebase.com"
                aria-invalid={Boolean(errors.email)}
                disabled={loading}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                disabled={loading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2Icon className="size-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-800/60" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-slate-800/60" />
          </div>

          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map(({ role, label }) => (
              <Button
                key={role}
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={() => handleDemoLogin(role)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-4 shrink-0 text-[#10B981]" />
            <span>Authenticated via finebaselabs.com</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
