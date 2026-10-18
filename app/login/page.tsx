"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both fields");
      return;
    }

    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const { error } = await signIn(cleanEmail, password);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md bg-neutral-900 border border-yellow-600/30 rounded-xl p-10">

        <p className="uppercase tracking-[0.25em] text-xs text-yellow-500/70 mb-3 text-center">
          Welcome Back
        </p>
        <h1 className="font-display text-3xl text-yellow-500 mb-8 text-center">
          Log In
        </h1>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
          <div>
            <label htmlFor="login-email-input" className="sr-only">Email</label>
            <input
              id="login-email-input"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white"
            />
          </div>

          <div>
            <label htmlFor="login-password-input" className="sr-only">Password</label>
            <input
              id="login-password-input"
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 text-black px-6 py-3 rounded-lg font-semibold transition"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-yellow-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}