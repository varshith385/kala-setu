"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: "buyer" | "artist" | "admin" | null;
  loading: boolean;
  signUp: (email: string, password: string, role?: "buyer" | "artist") => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"buyer" | "artist" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (user: User) => {
    // 1. Authoritative check: Fetch role from public.profiles table
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data?.role === "admin") {
        setRole("admin");
        return;
      }

      // Check designated admin emails for authorized administrator UI view (confirmed emails only)
      if (user.email && user.email_confirmed_at) {
        const configuredAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        const isStagingEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("tgloneuszflwxzdxzujj");
        const stagingAdmins = isStagingEnv ? ["admin@kalasetu.art", "staging.admin@kalasetu.art"] : [];

        const allAdmins = [...configuredAdmins, ...stagingAdmins];
        if (allAdmins.includes(user.email.toLowerCase())) {
          setRole("admin");
          return;
        }
      }

      if (!error && data?.role) {
        if (data.role === "artist" || data.role === "buyer") {
          setRole(data.role);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not fetch profile role from database:", err);
    }

    // 2. Secondary fallback: Check user_metadata (whitelisted strictly to buyer or artist)
    const metaRole = user.user_metadata?.role;
    if (metaRole === "artist" || metaRole === "buyer") {
      setRole(metaRole);
      return;
    }

    // 3. Fallback default
    setRole("buyer");
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchRole(session.user);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, role: "buyer" | "artist" = "buyer") => {
    // Whitelist role strictly to buyer or artist — never allow self-registering as admin
    const sanitizedRole: "buyer" | "artist" = role === "artist" ? "artist" : "buyer";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: sanitizedRole }
      }
    });
    return { error: error ? error.message : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
