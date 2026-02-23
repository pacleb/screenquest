"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      console.log("[CMS DEBUG] LoginPage: submitting login...");
      const ok = await login(email, password);
      console.log("[CMS DEBUG] LoginPage: login result =", ok);
      if (ok) {
        router.push("/");
      } else {
        setError("Invalid credentials");
      }
    } catch (err: any) {
      console.error(
        "[CMS DEBUG] LoginPage: caught error:",
        err.message,
        err.response?.status,
        err.response?.data,
      );
      const isServerWaking =
        err.code === 'ECONNABORTED' ||
        err.code === 'ERR_NETWORK' ||
        err.message === 'Network Error' ||
        err.message === 'Request aborted';
      setError(
        isServerWaking
          ? "Server is waking up — please wait a moment and try again."
          : `Login failed: ${err.response?.data?.message || err.message || "Please try again."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            ScreenQuest Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to manage the quest library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in\u2026 (server may be waking up)" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
