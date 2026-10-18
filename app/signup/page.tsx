"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "artist">("buyer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      setError("Please fill in both fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const { error } = await signUp(cleanEmail, password, role);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md bg-neutral-900 border border-yellow-600/30 rounded-xl p-10">

        <p className="uppercase tracking-[0.25em] text-xs text-yellow-500/70 mb-3 text-center">
          Join Kala Setu
        </p>
        <h1 className="font-display text-3xl text-yellow-500 mb-8 text-center">
          Create Your Account
        </h1>

        {success ? (
          <div className="text-center">
            <p className="text-yellow-400 mb-4">
              Account created! Check your email to confirm your account, then log in.
            </p>
            <Link
              href="/login"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold transition"
            >
              Go to Log In
            </Link>
          </div>
        ) : (
          <>
            {/* ROLE SELECTOR */}
            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-3 block text-center">
                I am joining as a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`py-3 rounded-lg text-sm font-medium transition border ${
                    role === "buyer"
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10"
                  }`}
                >
                  Buyer / Collector
                </button>
                <button
                  type="button"
                  onClick={() => setRole("artist")}
                  className={`py-3 rounded-lg text-sm font-medium transition border ${
                    role === "artist"
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10"
                  }`}
                >
                  Artist
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-5">
              <div>
                <label htmlFor="signup-email-input" className="sr-only">Email</label>
                <input
                  id="signup-email-input"
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
                <label htmlFor="signup-password-input" className="sr-only">Password</label>
                <input
                  id="signup-password-input"
                  name="password"
                  type="password"
                  placeholder="Password (min. 6 characters)"
                  autoComplete="new-password"
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
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <p className="text-gray-400 text-sm text-center mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-yellow-500 hover:underline">
                Log In
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}