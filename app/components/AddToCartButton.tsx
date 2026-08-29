"use client";

import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

export default function AddToCartButton({ artwork }: { artwork: any }) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleAdd = () => {
    addToCart({
      id: artwork.id,
      title: artwork.title,
      pricing: {
        amount: artwork.pricing?.amount ?? artwork.price,
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