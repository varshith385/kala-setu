import { artists } from "@/app/data/artists";
import { artworks } from "@/app/data/artworks";
import { notFound } from "next/navigation";
import ReviewSection from "./ReviewSection";
import ArtistFollowButton from "./ArtistFollowButton";
import Link from "next/link";
import Image from "next/image";

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

  // Find all artworks created by this artist from the main dataset
  const artistArtworks = artworks.filter(
    (a) => a.artist.id === artist.id || a.artist.name.toLowerCase() === artist.name.toLowerCase()
  );

  const availableWorks = artistArtworks.filter((a) => a.inventory.available);
  const archivedWorks = artistArtworks.filter((a) => !a.inventory.available);

  // Related artists (excluding this one)
  const relatedArtists = artists.filter((a) => a.id !== artist.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-black text-white pb-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* COVER BANNER */}
      <div className="relative w-full h-56 sm:h-72 md:h-96 overflow-hidden bg-neutral-950 border-b border-yellow-600/25">
        <Image
          src={artist.coverImage || artist.profileImage}
          alt={`${artist.name} Studio Banner`}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute top-6 left-5 md:left-16 z-10">
          <nav aria-label="Breadcrumb" className="text-xs text-neutral-300 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-yellow-600/30">
            <Link href="/" className="hover:text-yellow-400 transition">Home</Link>
            <span>/</span>
            <Link href="/artists" className="hover:text-yellow-400 transition">Artists</Link>
            <span>/</span>
            <span className="text-yellow-400 font-medium">{artist.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-12 -mt-20 sm:-mt-24 relative z-20">
        {/* ARTIST HEADER PROFILE CARD */}
        <div className="bg-neutral-950/95 border border-yellow-600/30 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-md mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-6 border-b border-yellow-600/15">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-yellow-500/80 overflow-hidden flex-shrink-0 bg-neutral-900 shadow-[0_0_25px_rgba(234,179,8,0.2)]">
                <Image
                  src={artist.profileImage}
                  alt={artist.name}
                  fill
                  sizes="(max-width: 640px) 112px, 144px"
                  className="object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-yellow-400 font-semibold tracking-wide">
                    {artist.name}
                  </h1>
                  {artist.verified && (
                    <span className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs px-3 py-1 rounded-full font-medium">
                      ✓ Verified Independent Artist
                    </span>
                  )}
                </div>

                <p className="text-neutral-400 text-sm flex items-center gap-2 mb-2">
                  <span>📍 {artist.location}</span>
                  {artist.studioLocation && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-500/80">Studio: {artist.studioLocation}</span>
                    </>
                  )}
                </p>

                <p className="text-neutral-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  {artist.bio}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
              <ArtistFollowButton artistId={artist.id} artistName={artist.name} />
              <Link
                href={`/custom-request?artist=${artist.id}`}
                className="bg-neutral-900 border border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10 px-4 py-2.5 rounded-full text-xs font-semibold transition"
              >
                Inquire
              </Link>
            </div>
          </div>

          {/* ARTIST METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-center sm:text-left">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Practice Tenure</p>
              <p className="text-lg font-semibold text-white mt-0.5">{artist.experience}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Catalogue Works</p>
              <p className="text-lg font-semibold text-white mt-0.5">{artistArtworks.length} Pieces Listed</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Collector Rating</p>
              <p className="text-lg font-semibold text-yellow-400 mt-0.5">⭐ {artist.rating} / 5.0</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Pledged Artworks</p>
              <p className="text-lg font-semibold text-white mt-0.5">{artist.totalSales}+ Original Pieces</p>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN DETAILS: ARTISTIC PRACTICE & EXHIBITIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="md:col-span-2 bg-neutral-900/60 border border-yellow-600/20 rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-xl text-yellow-400 mb-4 flex items-center gap-2">
              <span>🎨</span> Artistic Practice & Technique
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed mb-6 whitespace-pre-line">
              {artist.artisticPractice ||
                `${artist.name}'s oeuvre explores authentic Indian heritage through traditional pigments, gold leaf accents, and expressive natural narratives passed down across generational master ateliers.`}
            </p>

            <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-3 font-semibold">
              Signature Disciplines & Mediums
            </h3>
            <div className="flex flex-wrap gap-2">
              {artist.specialties.map((spec) => (
                <span
                  key={spec}
                  className="text-xs px-3 py-1.5 rounded-lg bg-black border border-yellow-600/30 text-yellow-400 font-medium"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/60 border border-yellow-600/20 rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-xl text-yellow-400 mb-4 flex items-center gap-2">
              <span>🏛️</span> Exhibitions & Shows
            </h2>
            {artist.exhibitions && artist.exhibitions.length > 0 ? (
              <ul className="space-y-3 text-xs text-neutral-300">
                {artist.exhibitions.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 border-b border-yellow-600/10 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500">
                Independent artist represented by Kala Setu verified creator guild.
              </p>
            )}
          </div>
        </div>

        {/* ARTIST CATALOGUE: AVAILABLE ARTWORKS */}
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-yellow-600/20 gap-2">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-yellow-400">
                Studio Works Available for Acquisition
              </h2>
              <p className="text-neutral-400 text-xs mt-1">
                Authentic originals dispatched directly from {artist.name}&apos;s studio atelier.
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              {availableWorks.length} {availableWorks.length === 1 ? "Artwork" : "Artworks"} Available
            </span>
          </div>

          {availableWorks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {availableWorks.map((art) => (
                <Link
                  key={art.id}
                  href={`/explore/${art.slug}`}
                  className="group bg-neutral-900/80 border border-yellow-600/25 rounded-2xl overflow-hidden hover:border-yellow-500/80 hover:shadow-2xl hover:shadow-yellow-500/10 transition duration-500 flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
                    <Image
                      src={art.images[0] || art.thumbnail}
                      alt={art.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-[10px] uppercase tracking-wider text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/30">
                      {art.details.medium}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display text-lg text-white group-hover:text-yellow-400 transition line-clamp-1 mb-1">
                        {art.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mb-3">
                        {art.details.dimensions || "Original Format"} · {art.details.category}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-yellow-600/15">
                      <span className="text-base font-semibold text-yellow-400">
                        ₹ {art.pricing.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-neutral-400 group-hover:text-white transition">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-900/40 rounded-2xl border border-yellow-600/20">
              <p className="text-neutral-400 text-sm">All currently catalogued studio originals by {artist.name} are reserved.</p>
            </div>
          )}
        </div>

        {/* ARCHIVED / PRIVATE COLLECTION WORKS */}
        {archivedWorks.length > 0 && (
          <div className="mb-16">
            <h3 className="font-display text-xl text-neutral-400 mb-2">
              In Private Collections / Archives
            </h3>
            <p className="text-neutral-500 text-xs mb-6">
              Acquired artworks from past exhibitions. Similar works can be commissioned upon request.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
              {archivedWorks.map((art) => (
                <div
                  key={art.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden relative"
                >
                  <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
                    <Image
                      src={art.images[0] || art.thumbnail}
                      alt={art.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover grayscale"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-neutral-900/90 text-yellow-400 border border-yellow-600/40 text-xs px-3 py-1.5 rounded-full font-medium">
                        Acquired · In Private Collection
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-display text-neutral-300 text-sm">{art.title}</h4>
                    <p className="text-xs text-neutral-500">{art.details.medium}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BESPOKE COMMISSION INVITATION */}
        <div className="border border-yellow-600/40 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 rounded-2xl p-8 md:p-12 mb-16 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="text-yellow-500 text-xs uppercase tracking-widest font-semibold block mb-2">
              Bespoke Studio Atelier
            </span>
            <h2 className="font-display text-2xl md:text-3xl text-white mb-3">
              Commission an Original Canvas from {artist.name}
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed mb-6">
              Collaborate directly with the artist on bespoke dimensions, ceremonial color palettes, or regional motifs. All custom commissions receive direct studio progress updates.
            </p>
            <Link
              href={`/custom-request?artist=${artist.id}`}
              className="inline-block bg-yellow-500 text-black px-8 py-3.5 rounded-lg font-bold hover:bg-yellow-400 transition text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            >
              Initiate Commission Request →
            </Link>
          </div>
        </div>

        {/* VERIFIED COLLECTOR REVIEWS */}
        <div className="mb-16">
          <ReviewSection initialReviews={artist.reviews || []} />
        </div>

        {/* RELATED ARTISTS DISCOVERY */}
        <div>
          <div className="pb-4 mb-6 border-b border-yellow-600/20">
            <h3 className="font-display text-xl text-yellow-400">Explore More Master Artists</h3>
            <p className="text-neutral-400 text-xs mt-1">
              Curated creators practicing traditional, spiritual, and contemporary Indian fine art.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedArtists.map((rel) => (
              <Link
                key={rel.id}
                href={`/artists/${rel.id}`}
                className="group p-5 rounded-2xl bg-neutral-950 border border-yellow-600/20 hover:border-yellow-500/70 transition flex items-center gap-4"
              >
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-yellow-600/40 shrink-0">
                  <Image src={rel.profileImage} alt={rel.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-display text-sm text-white group-hover:text-yellow-400 transition font-semibold">
                    {rel.name}
                  </h4>
                  <p className="text-xs text-neutral-400">{rel.location}</p>
                  <p className="text-[10px] text-yellow-500 mt-1">⭐ {rel.rating} · {rel.experience}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}