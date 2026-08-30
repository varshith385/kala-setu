"use client";

import Link from "next/link";
import { artists } from "../data/artists";

export default function AllArtistsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      <p className="uppercase tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 md:mb-3 font-medium">
        {artists.length} Verified Creators
      </p>
      <h1 className="font-display text-3xl md:text-4xl text-yellow-500 mb-8 md:mb-12">
        Our Artists
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-10">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/artists/${artist.id}`}
            className="bg-neutral-900 border border-yellow-600/30 rounded-xl p-4 md:p-8 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition duration-500"
          >
            <img
              src={artist.profileImage}
              className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-yellow-600 object-cover mb-3 md:mb-6"
            />

            <h2 className="font-display text-yellow-500 text-base md:text-lg mb-1 md:mb-2 line-clamp-1">
              {artist.name}
            </h2>

            <p className="text-xs md:text-sm text-gray-400 mb-2 md:mb-4 line-clamp-2 leading-relaxed">
              {artist.bio}
            </p>

            <p className="text-[10px] md:text-xs text-gray-500">
              ⭐ {artist.rating} · {artist.location}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}