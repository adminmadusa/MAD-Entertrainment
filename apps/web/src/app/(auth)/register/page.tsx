"use client";

import { Button } from "@mad/ui";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { extractApiError } from "@/lib/api/client";
import { publicRegister } from "@/lib/api/public.service";
import { useAuth } from "@/providers/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const registerMutation = useMutation({
    mutationFn: () => publicRegister({ name, email, phone, password }),
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push("/dashboard");
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.errors && Object.keys(apiErr.errors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(apiErr.errors)) {
          mapped[key] = msgs[0];
        }
        setFieldErrors(mapped);
        const firstErrorId = Object.keys(mapped)[0];
        setTimeout(() => {
          const el = document.getElementById(firstErrorId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus();
          }
        }, 100);
      } else {
        setError(apiErr.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (!password.trim()) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstErrorId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 100);
      return;
    }

    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container-mad max-w-md relative z-10 w-full">
        <div className="glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Create Account
            </h1>
            <p className="text-text-muted text-sm">
              Join to manage your bookings instantly.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fieldErrors.name}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/50 focus:outline-none transition-all ${
                  fieldErrors.name
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    : "border-border-subtle focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50"
                }`}
                placeholder="John Doe"
              />
              {fieldErrors.name && (
                <div className="text-red-400 text-xs ml-1 mt-1">
                  {fieldErrors.name}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/50 focus:outline-none transition-all ${
                  fieldErrors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    : "border-border-subtle focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50"
                }`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <div className="text-red-400 text-xs ml-1 mt-1">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!fieldErrors.phone}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/50 focus:outline-none transition-all ${
                  fieldErrors.phone
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    : "border-border-subtle focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50"
                }`}
                placeholder="+1 234 567 8900"
              />
              {fieldErrors.phone && (
                <div className="text-red-400 text-xs ml-1 mt-1">
                  {fieldErrors.phone}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/50 focus:outline-none transition-all ${
                  fieldErrors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                    : "border-border-subtle focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50"
                }`}
                placeholder="••••••••"
                minLength={6}
              />
              {fieldErrors.password && (
                <div className="text-red-400 text-xs ml-1 mt-1">
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="mt-2"
              isLoading={registerMutation.isPending}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-border-subtle/50 pt-6">
            <p className="text-text-muted text-xs">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-accent-purple hover:text-accent-purple-light font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
