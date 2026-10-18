"use client";

import Link from "next/link";
import Image from "next/image";

interface Artist {
  id: string;
  name: string;
  bio: string;
  profileImage: string;
  verified?: boolean;
  rating?: number;
  totalSales?: number;
  followers?: number;
  location?: string;
  experience?: string;
  specialties?: string[];
}

export default function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <div className="group relative bg-neutral-900/80 border border-yellow-600/20 hover:border-yellow-500/50 rounded-2xl p-6 md:p-8 transition-all duration-500 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.1)] flex flex-col justify-between">
      <div>
        {/* HEADER: AVATAR & IDENTITY */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-yellow-600/60 group-hover:border-yellow-400 overflow-hidden shrink-0 transition-colors duration-500 bg-neutral-950">
            <Image
              src={artist.profileImage}
              alt={artist.name}
              fill
              sizes="(max-width: 768px) 64px, 80px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link href={`/artists/${artist.id}`}>
                <h3 className="font-display text-lg md:text-xl text-white group-hover:text-yellow-400 transition truncate">
                  {artist.name}
                </h3>
              </Link>
              {artist.verified && (
                <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">
                  ✓ Verified
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              {artist.rating && <span>⭐ {artist.rating}</span>}
              {artist.location && <span>• {artist.location}</span>}
              {artist.experience && <span>• {artist.experience}</span>}
            </p>
          </div>
        </div>

        {/* BIO */}
        <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-5 line-clamp-3">
          {artist.bio}
        </p>

        {/* SPECIALTIES */}
        {artist.specialties && artist.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {artist.specialties.slice(0, 3).map((spec, i) => (
              <span
                key={i}
                className="text-[10px] md:text-xs px-2.5 py-1 bg-black/40 border border-yellow-600/30 text-yellow-300/90 rounded-md font-medium"
              >
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="pt-4 border-t border-yellow-600/15 flex items-center justify-between gap-3 text-xs">
        <Link
          href={`/artists/${artist.id}`}
          className="text-yellow-400 hover:text-yellow-300 font-semibold transition flex items-center gap-1"
        >
          <span>View Gallery</span>
          <span>→</span>
        </Link>

        <Link
          href={`/custom-request?artist=${artist.id}`}
          className="text-gray-400 hover:text-white transition px-3 py-1.5 border border-yellow-600/30 hover:border-yellow-500/50 rounded-lg bg-black/40"
        >
          Commission Art
        </Link>
      </div>
    </div>
  );
}
