"use client";

import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

interface ArtworkProp {
  id: string;
  title: string;
  price?: number;
  pricing?: {
    amount: number;
    currency?: string;
    isOnSale?: boolean;
    discountPercentage?: number;
  };
}

export default function AddToCartButton({ artwork }: { artwork: ArtworkProp }) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleAdd = () => {
    const effectivePrice =
      artwork.pricing?.isOnSale && artwork.pricing.discountPercentage
        ? Math.round(
            artwork.pricing.amount -
              (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
          )
        : artwork.pricing?.amount ?? artwork.price ?? 0;

    addToCart({
      id: artwork.id,
      title: artwork.title,
      pricing: {
        amount: effectivePrice,
      },
      quantity: 1,
    });

    router.push("/cart");
  };

  return (
    <button
      onClick={handleAdd}
      className="border border-yellow-500 text-yellow-500 px-8 py-3 rounded-md hover:bg-yellow-500 hover:text-black transition"
    >
      Add to Cart
    </button>
  );
}