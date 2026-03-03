import { artists } from "@/app/data/artists";
import { notFound } from "next/navigation";
import ReviewSection from "./ReviewSection";
import Link from "next/link";

export default async function ArtistProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artist = artists.find((a) => a.id === id);

  if (!artist) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-8 mb-12">
          <img
            src={artist.profileImage}
            className="w-40 h-40 rounded-full border-4 border-yellow-600 object-cover"
          />

          <div>
            <h1 className="text-3xl text-yellow-500 mb-2">
              {artist.name}
            </h1>

            <p className="text-gray-400 mb-4">
              {artist.bio}
            </p>

            <p className="text-sm text-gray-500 mb-2">
              ⭐ {artist.rating} • 📍 {artist.location}
            </p>

            <p className="text-sm text-gray-400">
              🎨 {artist.experience} Experience
            </p>

            <p className="text-sm text-gray-400">
              🛍 {artist.totalSales} Sales • 👥 {artist.followers} Followers
            </p>
          </div>
        </div>

        {/* Artworks */}
        <div className="mb-16">
          <h2 className="text-2xl text-yellow-500 mb-8">
            Artworks
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {artist.artworks?.map((art) => (
              <Link
                key={art.id}
                href={`/artwork/${art.id}`}
                className="border border-yellow-600/20 rounded-lg p-4 block hover:border-yellow-500/40 transition"
              >
                <img
                  src={art.image}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h3 className="text-yellow-500 mb-2">
                  {art.title}
                </h3>
                <p className="text-gray-400">
                  ₹ {art.price}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <ReviewSection initialReviews={artist.reviews || []} />

      </div>
    </main>
  );
}