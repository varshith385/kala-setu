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
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-8 mb-8 md:mb-14 bg-neutral-900 border border-yellow-600/30 rounded-xl p-5 md:p-8">
          <img
            src={artist.profileImage}
            className="w-20 h-20 sm:w-40 sm:h-40 rounded-full border-4 border-yellow-600 object-cover flex-shrink-0"
          />

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 md:mb-3 flex-wrap">
              <h1 className="font-display text-2xl md:text-4xl text-yellow-500">
                {artist.name}
              </h1>
              {artist.verified && (
                <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-medium">
                  Verified Artist
                </span>
              )}
            </div>

            <p className="text-gray-400 mb-4 md:mb-6 leading-relaxed text-sm md:text-base max-w-xl">
              {artist.bio}
            </p>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-4 md:gap-8">
              <Stat label="Rating" value={`${artist.rating} stars`} />
              <Stat label="Location" value={artist.location} />
              <Stat label="Experience" value={artist.experience} />
              <Stat label="Total Sales" value={String(artist.totalSales)} />
              <Stat label="Followers" value={String(artist.followers)} />
            </div>
          </div>
        </div>

        {artist.specialties && artist.specialties.length > 0 && (
          <div className="mb-8 md:mb-14">
            <h2 className="font-display text-lg md:text-xl text-yellow-500 mb-3 md:mb-4">
              Specialties
            </h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {artist.specialties.map((spec, index) => (
                <span
                  key={index}
                  className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 border border-yellow-600/40 rounded-full text-yellow-400 bg-neutral-900"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10 md:mb-16">
          <h2 className="font-display text-xl md:text-3xl text-yellow-500 mb-5 md:mb-8">
            Artworks
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
            {artist.artworks?.map((art) => (
              <Link
                key={art.id}
                href={`/explore/${art.slug}`}
                className="group bg-neutral-900 border border-yellow-600/30 rounded-xl overflow-hidden hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/10 transition duration-500 block"
              >
                <div className="overflow-hidden">
                  <img
                    src={art.image}
                    className="w-full h-28 md:h-48 object-cover transition duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="p-3 md:p-5">
                  <h3 className="font-display text-yellow-400 text-sm md:text-base mb-0.5 md:mb-1 line-clamp-1">
                    {art.title}
                  </h3>
                  <p className="text-white font-semibold text-sm md:text-base">
                    Rs. {art.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <ReviewSection initialReviews={artist.reviews || []} />

        <div className="border border-yellow-600/30 bg-neutral-900 rounded-xl p-5 md:p-8 mt-10 md:mt-16">
          <h3 className="font-display text-yellow-500 text-lg md:text-xl mb-4 md:mb-6">
            Contact {artist.name} for Custom Artwork
          </h3>

          <div className="space-y-2 mb-5 md:mb-6 text-gray-300 text-sm">
            <p>Location: {artist.location}</p>
            <p>Phone: {artist.phone}</p>
          </div>

          
           <a href={`https://wa.me/${artist.phone}`} target="_blank" className="inline-block bg-yellow-500 text-black px-5 md:px-6 py-2.5 md:py-3 rounded-md font-medium hover:bg-yellow-400 transition text-sm md:text-base">Request Custom Artwork on WhatsApp</a>
        </div>

      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-white font-medium text-xs md:text-sm">{value}</p>
      <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}