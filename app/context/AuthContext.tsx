"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  role: "buyer" | "artist" | null;
  loading: boolean;
  signUp: (email: string, password: string, role?: "buyer" | "artist") => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"buyer" | "artist" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (user: User) => {
    // 0. HACKATHON DEMO OVERRIDE (Bypasses Supabase completely)
    const demoRole = typeof window !== "undefined" ? localStorage.getItem("hackathon_role") : null;
    if (demoRole === "artist" || demoRole === "buyer") {
      setRole(demoRole);
      return;
    }

    // 1. Check Supabase Auth metadata (most reliable, ignores RLS)
    if (user.user_metadata?.role) {
      setRole(user.user_metadata.role as "buyer" | "artist");
      return;
    }

    // 2. Fallback to profiles table
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (!error && data?.role) {
        setRole(data.role as "buyer" | "artist");
        return;
      }
    } catch {}

    // Fallback if everything fails
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
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { role } // Save role directly to auth metadata
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