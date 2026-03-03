"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { artworks } from "../data/artworks";

export default function ExploreClient() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  let filtered = artworks;

  if (type === "physical") {
    filtered = artworks.filter(
      (art) => art.details.category === "Physical Art"
    );
  }

  if (type === "digital") {
    filtered = artworks.filter(
      (art) => art.details.category === "Digital Art"
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 py-24">

      <h1 className="text-4xl text-yellow-500 mb-12">
        Explore Collection
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {filtered.map((art) => (
          <Link
            key={art.id}
            href={`/explore/${art.slug}`}
            className="block border border-yellow-600/20 p-6 rounded-xl hover:border-yellow-500/50 hover:scale-[1.02] transition duration-500"
          >
            <img
              src={art.images[0]}
              alt={art.title}
              className="h-60 w-full object-cover rounded mb-6"
            />

            <h3 className="text-yellow-500 text-lg mb-2">
              {art.title}
            </h3>

            <p className="text-gray-400 mb-1">
              ₹ {art.pricing.amount}
            </p>

            <p className="text-xs text-gray-500 uppercase">
              {art.details.category}
            </p>
          </Link>
        ))}
      </div>

    </main>
  );
}