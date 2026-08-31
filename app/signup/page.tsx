"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();

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

    const { error } = await signUp(email, password, role);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    // Update the profile role if they chose "artist"
    // (the trigger already created a 'buyer' row, so we update it if needed)
    if (role === "artist") {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({ role: "artist" })
          .eq("id", userId);
      }
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

            <div className="space-y-5">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white"
              />

              <input
                type="password"
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white"
              />

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 text-black px-6 py-3 rounded-lg font-semibold transition"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </div>

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