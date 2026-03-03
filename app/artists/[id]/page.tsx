import { artists } from "@/app/data/artists";
import { notFound } from "next/navigation";

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

        {/* Profile Header */}
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

        {/* Specialties */}
        <div className="mb-12">
          <h2 className="text-xl text-yellow-500 mb-4">
            Specialties
          </h2>

          <div className="flex flex-wrap gap-3">
            {artist.specialties.map((spec, index) => (
              <span
                key={index}
                className="border border-yellow-600/30 px-4 py-2 rounded-full text-sm text-gray-300"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Social */}
        <div className="mb-12">
          <h2 className="text-xl text-yellow-500 mb-4">
            Social
          </h2>

          <p className="text-gray-400">
            Instagram: {artist.social.instagram}
          </p>

          <p className="text-gray-400">
            Website: {artist.social.website}
          </p>
        </div>

        {/* Artworks Section */}
        {artist.artworks && (
          <div className="mb-16">
            <h2 className="text-2xl text-yellow-500 mb-8">
              Artworks by {artist.name}
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {artist.artworks.map((art) => (
                <div
                  key={art.id}
                  className="border border-yellow-600/20 rounded-lg p-4 hover:border-yellow-500/40 transition"
                >
                  <img
                    src={art.image}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />

                  <h3 className="text-yellow-500 mb-2">
                    {art.title}
                  </h3>

                  <p className="text-gray-400 mb-4">
                    ₹ {art.price}
                  </p>

                  <button className="bg-yellow-500 text-black px-4 py-2 rounded-md hover:bg-yellow-400 transition">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="border-t border-yellow-600/20 pt-8">
          <h3 className="text-yellow-500 text-xl mb-6">
            Contact Artist
          </h3>

          <p className="text-gray-400 mb-2">
            📞 {artist.phone}
          </p>

          <a
            href={`https://wa.me/${artist.phone}`}
            target="_blank"
            className="inline-block bg-yellow-500 text-black px-6 py-3 rounded-md font-medium hover:bg-yellow-400 transition"
          >
            Request Custom Artwork
          </a>
        </div>

      </div>
    </main>
  );
}