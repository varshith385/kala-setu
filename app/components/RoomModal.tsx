"use client";

import { useEffect, useRef } from "react";
import { Artwork } from "../data/artworks";
import RoomPreview from "./RoomPreview";

interface RoomModalProps {
  artwork: Artwork | null;
  onClose: () => void;
  isOpen?: boolean;
}

export default function RoomModal({ artwork, onClose, isOpen }: RoomModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isModalOpen = Boolean(artwork && isOpen !== false);

  useEffect(() => {
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  if (!artwork || isOpen === false) return null;

  const discountedPrice =
    artwork.pricing.isOnSale &&
    typeof artwork.pricing.discountPercentage === "number" &&
    artwork.pricing.discountPercentage > 0
      ? Math.round(
          artwork.pricing.amount -
            (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
        )
      : artwork.pricing.amount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`View ${artwork.title} in Room`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl my-auto animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 md:top-4 md:right-4 z-30 bg-black/70 hover:bg-neutral-800 text-gray-300 hover:text-white p-2 rounded-full border border-white/20 transition"
          aria-label="Close Room Studio"
        >
          ✕
        </button>

        <RoomPreview
          artworkImage={artwork.images[0] || artwork.thumbnail}
          artworkTitle={artwork.title}
          artworkDimensions={artwork.details.dimensions}
          artworkId={artwork.id}
          artworkPrice={discountedPrice}
          artworkSlug={artwork.slug}
        />
      </div>
    </div>
  );
}
