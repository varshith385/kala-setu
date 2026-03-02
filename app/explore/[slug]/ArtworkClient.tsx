"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { useRouter } from "next/navigation";

export default function ArtworkClient({ artwork }: any) {
  const { addToCart } = useCart();
  const router = useRouter();

  const discountedPrice = artwork.pricing.isOnSale
    ? artwork.pricing.amount -
      (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
    : artwork.pricing.amount;

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <div className="grid md:grid-cols-2 gap-20">

        {/* IMAGE SECTION */}
        <div>
          <Image
            src={artwork.images[0]}
            alt={artwork.title}
            width={800}
            height={600}
            className="object-cover w-full border border-yellow-600/20"
          />
        </div>

        {/* DETAILS SECTION */}
        <div>

          {/* TITLE */}
          <h1 className="text-4xl text-yellow-500 mb-4">
            {artwork.title}
          </h1>

          {/* ARTIST */}
          <p className="text-gray-400 mb-6">
            by{" "}
            <Link
              href={`/artists/${artwork.artist.id}`}
              className="text-yellow-500 hover:underline"
            >
              {artwork.artist.name}
            </Link>
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

          {/* ART DETAILS */}
          <div className="space-y-2 text-gray-400 mb-8">
            <p><strong>Category:</strong> {artwork.details.category}</p>
            <p><strong>Medium:</strong> {artwork.details.medium}</p>
            <p><strong>Dimensions:</strong> {artwork.details.dimensions}</p>
            <p><strong>Year:</strong> {artwork.details.yearCreated}</p>
            <p><strong>Framed:</strong> {artwork.details.framed ? "Yes" : "No"}</p>
            <p><strong>Signed:</strong> {artwork.details.signed ? "Yes" : "No"}</p>
          </div>

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
                price: discountedPrice,
                image: artwork.images[0],
              });

              router.push("/cart");
            }}
            className="px-10 py-4 border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Add to Cart
          </button>

        </div>
      </div>
    </main>
  );
}