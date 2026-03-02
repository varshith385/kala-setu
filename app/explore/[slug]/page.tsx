import { artworks } from "../../data/artworks";
import { notFound } from "next/navigation";
import ArtworkClient from "./ArtworkClient";

export default async function ArtworkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const artwork = artworks.find((art) => art.slug === slug);

  if (!artwork) return notFound();

  return <ArtworkClient artwork={artwork} />;
}