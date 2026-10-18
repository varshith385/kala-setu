"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { getArtworkById, getMaxOrderQuantity } from "@/app/lib/catalogue";

export type CartItem = {
  id: string;
  title: string;
  pricing: {
    amount: number;
  };
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const isHydrated = useRef(false);

  // Restore cart on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kala-setu-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize restored items against stock limits
          const sanitized = parsed.map((item: CartItem) => {
            const art = getArtworkById(item.id);
            const maxQty = art ? getMaxOrderQuantity(art) : 25;
            return {
              ...item,
              quantity: Math.max(1, Math.min(item.quantity || 1, maxQty || 1)),
            };
          });
          setCart(sanitized);
        }
      }
    } catch {
      // Ignore storage errors safely
    } finally {
      isHydrated.current = true;
    }
  }, []);

  // Persist cart to localStorage only after initial hydration
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      localStorage.setItem("kala-setu-cart", JSON.stringify(cart));
    } catch {
      // Ignore storage errors safely
    }
  }, [cart]);

  const addToCart = (item: CartItem) => {
    const art = getArtworkById(item.id);
    const maxQty = art ? getMaxOrderQuantity(art) : 25;

    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: Math.min(p.quantity + (item.quantity || 1), maxQty) }
            : p
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.quantity || 1, maxQty) }];
    });
    setIsOpen(true);
  };

  const increaseQty = (id: string) => {
    const art = getArtworkById(id);
    const maxQty = art ? getMaxOrderQuantity(art) : 25;

    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(item.quantity + 1, maxQty) }
          : item
      )
    );
  };

  const decreaseQty = (id: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        increaseQty,
        decreaseQty,
        removeFromCart,
        clearCart,
        isOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}