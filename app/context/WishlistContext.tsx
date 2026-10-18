"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

type WishlistContextType = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const isHydrated = useRef(false);

  // Restore wishlist on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kala-setu-wishlist");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWishlist(parsed);
        }
      }
    } catch {
      // Ignore storage errors safely
    } finally {
      isHydrated.current = true;
    }
  }, []);

  // Persist wishlist to localStorage only after initial hydration
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      localStorage.setItem("kala-setu-wishlist", JSON.stringify(wishlist));
    } catch {
      // Ignore storage errors safely
    }
  }, [wishlist]);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}