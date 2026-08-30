"use client";

import { useWishlist } from "../context/WishlistContext";

export default function WishlistButton({ artworkId }: { artworkId: string }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const saved = isWishlisted(artworkId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(artworkId);
      }}
      className={`absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition ${
        saved
          ? "bg-yellow-500 text-black"
          : "bg-black/60 text-white hover:bg-black/80"
      }`}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
    >
      {saved ? "♥" : "♡"}
    </button>
  );
}