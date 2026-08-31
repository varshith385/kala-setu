"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { useRouter } from "next/navigation";
import RoomPreview from "../../components/RoomPreview";

export default function ArtworkClient({ artwork }: any) {
  const { addToCart } = useCart();
  const router = useRouter();

  const discountedPrice = artwork.pricing.isOnSale
    ? artwork.pricing.amount -
      (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
    : artwork.pricing.amount;

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      <div className="grid md:grid-cols-2 gap-10 md:gap-20">

        {/* IMAGE SECTION */}
        <div>
          <Image
            src={artwork.images[0]}
            alt={artwork.title}
            width={800}
            height={600}
            className="object-cover w-full border border-yellow-600/30 rounded-lg"
          />
        </div>

        {/* DETAILS SECTION */}
        <div>

          {/* TITLE */}
          <h1 className="font-display text-4xl text-yellow-500 mb-4">
            {artwork.title}
          </h1>

          {/* ARTIST + VERIFIED BADGE */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-gray-400">
              by{" "}
              <Link
                href={`/artists/${artwork.artist.id}`}
                className="text-yellow-500 hover:underline"
              >
                {artwork.artist.name}
              </Link>
            </p>
            {artwork.artist.verified && (
              <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                ✓ Verified Artist
              </span>
            )}
          </div>

          {/* ARTIST CREDIBILITY LINE */}
          <p className="text-gray-500 text-sm mb-6">
            ⭐ {artwork.artist.rating} rating · {artwork.artist.totalSales} artworks sold
          </p>

          {/* PRICE */}
          <div className="mb-6">
            {artwork.pricing.isOnSale && (
              <p className="text-gray-500 line-through">
                ₹{artwork.pricing.amount}
              </p>
            )}
            <p className="text-3xl font-semibold text-white">
              ₹{discountedPrice}
            </p>
          </div>

          {/* AUTHENTICITY STRIP */}
          <div className="flex flex-wrap gap-3 mb-8">
            {artwork.details.signed && (
              <TrustBadge label="Hand-Signed" />
            )}
            {artwork.details.framed && (
              <TrustBadge label="Framed" />
            )}
            {artwork.inventory?.limitedEdition ? (
              <TrustBadge label="Limited Edition" />
            ) : (
              <TrustBadge label="One-of-a-Kind" />
            )}
          </div>

          {/* ART DETAILS */}
          <div className="space-y-2 text-gray-400 mb-8">
            <p><strong className="text-gray-300">Category:</strong> {artwork.details.category}</p>
            <p><strong className="text-gray-300">Medium:</strong> {artwork.details.medium}</p>
            <p><strong className="text-gray-300">Dimensions:</strong> {artwork.details.dimensions}</p>
            <p><strong className="text-gray-300">Year:</strong> {artwork.details.yearCreated}</p>
            <p><strong className="text-gray-300">Framed:</strong> {artwork.details.framed ? "Yes" : "No"}</p>
            <p><strong className="text-gray-300">Signed:</strong> {artwork.details.signed ? "Yes" : "No"}</p>
          </div>

          {/* SHIPPING TRUST LINE */}
          {artwork.shipping && (
            <div className="border border-yellow-600/30 bg-neutral-900 rounded-lg p-4 mb-8 text-sm text-gray-300">
              {artwork.shipping.freeShipping ? (
                <p className="text-yellow-400 font-medium mb-1">✓ Free Shipping</p>
              ) : (
                <p className="text-gray-400 mb-1">Shipping charges apply</p>
              )}
              <p>
                Ships from {artwork.shipping.shipsFrom}
                {artwork.shipping.estimatedDeliveryDays > 0
                  ? ` · Estimated delivery in ${artwork.shipping.estimatedDeliveryDays} days`
                  : " · Instant digital delivery"}
              </p>
            </div>
          )}

          {/* DESCRIPTION */}
          <p className="text-gray-300 mb-8 leading-relaxed">
            {artwork.description}
          </p>

          {/* REVIEWS */}
          <div className="mb-8">
            <h3 className="text-yellow-500 text-xl mb-2">Reviews</h3>
            <p className="text-gray-400">
              ⭐ {artwork.engagement.rating} ({artwork.engagement.totalReviews} reviews)
            </p>
          </div>

          {/* ADD TO CART BUTTON */}
          <button
            onClick={() => {
              addToCart({
                id: artwork.id,
                title: artwork.title,
                pricing: {
                  amount: discountedPrice,
                },
                quantity: 1,
              });

              router.push("/cart");
            }}
            className="px-10 py-4 border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Add to Cart
          </button>
          {/* ROOM PREVIEW */}
          <div className="mt-10">
            <RoomPreview artworkImage={artwork.images[0]} artworkTitle={artwork.title} />
          </div>          

        </div>
      </div>
    </main>
  );
}

/* ================= TRUST BADGE ================= */

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="text-xs px-3 py-1.5 border border-yellow-600/40 text-yellow-400 rounded-full bg-neutral-900">
      {label}
    </span>
  );
}