import { artworks } from "@/app/data/artworks";
import { notFound, redirect } from "next/navigation";
import ArtworkClient from "@/app/explore/[slug]/ArtworkClient";

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Search canonical catalogue by ID or slug
  const matchedArtwork = artworks.find(
    (a) => a.id === id || a.slug.toLowerCase() === id.toLowerCase()
  );

  if (matchedArtwork) {
    // If the URL matches by ID (e.g. /artwork/art-001), redirect to canonical /explore/[slug] or render ArtworkClient
    return <ArtworkClient artwork={matchedArtwork} />;
  }

  return notFound();
}