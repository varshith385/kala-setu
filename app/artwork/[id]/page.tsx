"use client";

import { artists } from "@/app/data/artists";
import { notFound } from "next/navigation";
import Link from "next/link";
import { use } from "react";

export default function ArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const { id } = use(params);

  let artwork: any = null;
  let artistName = "";

  for (const artist of artists) {
    const found = artist.artworks?.find((a) => a.id === id);
    if (found) {
      artwork = found;
      artistName = artist.name;
      break;
    }
  }

  if (!artwork) return notFound();

  const addToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");

    existingCart.push({
      id: artwork.id,
      title: artwork.title,
      price: artwork.price,
      image: artwork.image,
    });

    localStorage.setItem("cart", JSON.stringify(existingCart));

    alert("Added to cart!");
  };

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">

        {/* LEFT SIDE — IMAGE */}
        <div>
          <img
            src={artwork.image}
            className="w-full h-[500px] object-cover rounded-lg"
          />
        </div>

        {/* RIGHT SIDE — DETAILS */}
        <div>
          <Link
            href={`/artists`}
            className="text-yellow-500 mb-6 inline-block"
          >
            ← Back to Artists
          </Link>

          <h1 className="text-4xl text-yellow-500 mb-4">
            {artwork.title}
          </h1>

          <p className="text-gray-400 mb-4">
            by <span className="text-yellow-500">{artistName}</span>
          </p>

          {/* Price */}
          <div className="mb-6">
            {artwork.originalPrice && (
              <p className="text-gray-500 line-through">
                ₹ {artwork.originalPrice}
              </p>
            )}
            <p className="text-3xl text-white">
              ₹ {artwork.price}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-8 text-gray-300">
            <p><strong>Category:</strong> {artwork.category}</p>
            <p><strong>Medium:</strong> {artwork.medium}</p>
            <p><strong>Dimensions:</strong> {artwork.dimensions}</p>
            <p><strong>Year:</strong> {artwork.year}</p>
            <p><strong>Framed:</strong> {artwork.framed ? "Yes" : "No"}</p>
            <p><strong>Signed:</strong> {artwork.signed ? "Yes" : "No"}</p>
          </div>

          {/* Description */}
          <p className="text-gray-400 mb-8">
            {artwork.description}
          </p>

          {/* Reviews Preview */}
          <div className="mb-6">
            <h3 className="text-yellow-500 mb-2">Reviews</h3>
            <p className="text-gray-400">⭐ 4.8 (34 reviews)</p>
          </div>

          {/* Add to Cart */}
          <button
            onClick={addToCart}
            className="border border-yellow-500 text-yellow-500 px-8 py-3 rounded-md hover:bg-yellow-500 hover:text-black transition"
          >
            Add to Cart
          </button>

        </div>

      </div>
    </main>
  );
}