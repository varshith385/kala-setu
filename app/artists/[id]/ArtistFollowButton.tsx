"use client";

import { useCollector } from "@/app/context/CollectorContext";

export default function ArtistFollowButton({ artistId, artistName }: { artistId: string; artistName: string }) {
  const { isFollowingArtist, toggleFollowArtist } = useCollector();
  const following = isFollowingArtist(artistId);

  return (
    <button
      onClick={() => toggleFollowArtist(artistId)}
      className={`px-5 py-2.5 rounded-full font-semibold text-xs transition duration-300 flex items-center gap-2 ${
        following
          ? "bg-neutral-800 text-yellow-400 border border-yellow-500/50 hover:bg-neutral-700"
          : "bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.25)]"
      }`}
      aria-label={following ? `Unfollow ${artistName}` : `Follow ${artistName}`}
    >
      <span>{following ? "✓ Following" : "+ Follow Artist"}</span>
    </button>
  );
}
