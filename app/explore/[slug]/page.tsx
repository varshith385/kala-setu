export const dynamicParams = true;

import { artworks } from "../../data/artworks";
import { notFound } from "next/navigation";
import ArtworkClient from "./ArtworkClient";

export default function ArtworkDetail({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const artwork = artworks.find((art) => art.slug === slug);

  if (!artwork) return notFound();

  return <ArtworkClient artwork={artwork} />;
}