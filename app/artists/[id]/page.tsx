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
    <main className="min-h-screen bg-black text-white px-6 md:px-16 py-20">
      <div className="max-w-5xl mx-auto">

        {/* PROFILE HEADER */}
        <div className="flex flex-col sm:flex-row items-start gap-8 mb-14 bg-neutral-900 border border-yellow-600/30 rounded-xl p-8">
          <img
            src={artist.profileImage}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-yellow-600 object-cover flex-shrink-0"
          />

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h1 className="font-display text-3xl md:text-4xl text-yellow-500">
                {artist.name}
              </h1>
              {artist.verified && (
                <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs px-2.5 py-1 rounded-full font-medium">
                  Verified Artist
                </span>
              )}
            </div>

            <p className="text-gray-400 mb-6 leading-relaxed max-w-xl">
              {artist.bio}
            </p>

            <div className="flex flex-wrap gap-8">
              <Stat label="Rating" value={`${artist.rating} stars`} />
              <Stat label="Location" value={artist.location} />
              <Stat label="Experience" value={artist.experience} />
              <Stat label="Total Sales" value={String(artist.totalSales)} />
              <Stat label="Followers" value={String(artist.followers)} />
            </div>
          </div>
        </div>

        {artist.specialties && artist.specialties.length > 0 && (
          <div className="mb-14">
            <h2 className="font-display text-xl text-yellow-500 mb-4">
              Specialties
            </h2>
            <div className="flex flex-wrap gap-3">
              {artist.specialties.map((spec, index) => (
                <span
                  key={index}
                  className="text-sm px-4 py-2 border border-yellow-600/40 rounded-full text-yellow-400 bg-neutral-900"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-16">
          <h2 className="font-display text-2xl md:text-3xl text-yellow-500 mb-8">
            Artworks
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {artist.artworks?.map((art) => (
              <Link
                key={art.id}
                href={`/explore/${art.slug}`}
                className="group bg-neutral-900 border border-yellow-600/30 rounded-xl overflow-hidden hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/10 transition duration-500 block"
              >
                <div className="overflow-hidden">
                  <img
                    src={art.image}
                    className="w-full h-48 object-cover transition duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-yellow-400 mb-1">
                    {art.title}
                  </h3>
                  <p className="text-white font-semibold">
                    Rs. {art.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <ReviewSection initialReviews={artist.reviews || []} />

        <div className="border border-yellow-600/30 bg-neutral-900 rounded-xl p-8 mt-16">
          <h3 className="font-display text-yellow-500 text-xl mb-6">
            Contact {artist.name} for Custom Artwork
          </h3>

          <div className="space-y-2 mb-6 text-gray-300 text-sm">
            <p>Location: {artist.location}</p>
            <p>Phone: {artist.phone}</p>
          </div>

          
           <a href={`https://wa.me/${artist.phone}`} target="_blank" className="inline-block bg-yellow-500 text-black px-6 py-3 rounded-md font-medium hover:bg-yellow-400 transition">Request Custom Artwork on WhatsApp</a>
        </div>

      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white font-medium text-sm">{value}</p>
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}