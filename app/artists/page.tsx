"use client";

import Link from "next/link";
import { artists } from "../data/artists";

export default function AllArtistsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <h1 className="text-4xl text-yellow-500 mb-12">
        Our Artists
      </h1>

      <div className="grid md:grid-cols-3 gap-10">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/artists/${artist.id}`}
            className="border border-yellow-600/20 p-8 rounded-lg hover:border-yellow-500/40 transition"
          >
            <img
              src={artist.profileImage}
              className="w-24 h-24 rounded-full border-2 border-yellow-600 object-cover mb-6"
            />

            <h2 className="text-yellow-500 text-lg mb-2">
              {artist.name}
            </h2>

            <p className="text-sm text-gray-400 mb-4">
              {artist.bio}
            </p>

            <p className="text-xs text-gray-500">
              ⭐ {artist.rating} • {artist.location}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}