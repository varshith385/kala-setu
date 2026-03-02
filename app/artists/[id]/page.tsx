import { notFound } from "next/navigation";
import { artists } from "../../data/artists";
import { artworks } from "../../data/artworks";
import Link from "next/link";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artist = artists.find((a) => a.id === id);

  if (!artist) return notFound();

  // 🔥 Get all artworks of this artist
  const artistWorks = artworks.filter(
    (art) => art.artist.id === artist.id
  );

  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-20 py-20">

      {/* ===== ARTIST HEADER ===== */}
      <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">

        <img
          src={artist.profileImage}
          alt={artist.name}
          className="w-56 h-56 object-cover rounded-full border-4 border-yellow-500 shadow-xl"
        />

        <div className="max-w-2xl">

          <h1 className="text-5xl font-light text-yellow-500 tracking-widest">
            {artist.name}
          </h1>

          <p className="mt-6 text-gray-400 leading-relaxed text-lg">
            {artist.bio}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-6 text-sm text-gray-300">

            <div>
              <p className="text-yellow-500">Location</p>
              <p>{artist.location}</p>
            </div>

            <div>
              <p className="text-yellow-500">Experience</p>
              <p>{artist.experience}</p>
            </div>

            <div>
              <p className="text-yellow-500">Rating</p>
              <p>⭐ {artist.rating}</p>
            </div>

            <div>
              <p className="text-yellow-500">Total Sales</p>
              <p>{artist.totalSales}</p>
            </div>

            <div>
              <p className="text-yellow-500">Followers</p>
              <p>{artist.followers}</p>
            </div>

          </div>

          <div className="mt-10">
            <h3 className="text-yellow-500 tracking-widest mb-4">
              SPECIALTIES
            </h3>

            <div className="flex flex-wrap gap-3">
              {artist.specialties.map((skill, index) => (
                <span
                  key={index}
                  className="border border-yellow-600/30 px-4 py-2 text-sm rounded-full text-gray-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ===== ARTWORKS SECTION ===== */}
      <div className="mt-24">

        <h2 className="text-3xl text-yellow-500 tracking-widest mb-12">
          ARTWORKS BY {artist.name.toUpperCase()}
        </h2>

        <div className="grid md:grid-cols-3 gap-10">

          {artistWorks.map((art) => (
            <Link key={art.id} href={`/explore/${art.slug}`}>
              <div className="border border-yellow-600/20 hover:border-yellow-500 transition duration-300 p-4 cursor-pointer">

                <img
                  src={art.thumbnail}
                  alt={art.title}
                  className="w-full h-64 object-cover mb-4"
                />

                <h3 className="text-lg text-yellow-500 tracking-wide">
                  {art.title}
                </h3>

                <p className="text-gray-400 text-sm mt-2">
                  ₹ {art.pricing.amount.toLocaleString()}
                </p>

              </div>
            </Link>
          ))}

        </div>

      </div>

    </div>
  );
}