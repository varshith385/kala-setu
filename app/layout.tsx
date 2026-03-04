"use client";

import "./globals.css";
import Link from "next/link";
import { useState } from "react";
import { CartProvider, useCart } from "./context/CartContext";
import CartDrawer from "./components/CartDrawer";
import { artists } from "./data/artists";

function Navbar() {
  const { cart, openCart } = useCart();
  const [artistOpen, setArtistOpen] = useState(false);

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <nav className="flex justify-between items-center px-16 py-6 border-b border-yellow-600/20 bg-black text-white relative">

      {/* Logo */}
      <Link href="/" className="text-2xl text-yellow-500 tracking-widest">
        KALA SETU
      </Link>

      <div className="flex items-center gap-10 relative">

        {/* Explore */}
        <Link
          href="/explore"
          className="hover:text-yellow-500 transition"
        >
          Explore
        </Link>
	
	{/* Custom Artwork */}
<Link
  href="/custom-request"
  className="hover:text-yellow-500 transition"
>
  Custom Artwork
</Link>

        {/* Artists Section */}
        <div
          className="relative"
          onMouseEnter={() => setArtistOpen(true)}
          onMouseLeave={() => setArtistOpen(false)}
        >
          {/* Clickable Artists text */}
          <Link
            href="/artists"
            className="hover:text-yellow-500 transition"
          >
            Artists ▾
          </Link>

          {/* Hover Mega Menu */}
          {artistOpen && (
            <div className="absolute right-0 top-full w-[650px] bg-black border border-yellow-600/20 shadow-2xl p-8 z-50 rounded-xl">

              <div className="grid grid-cols-2 gap-8">

                {artists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    className="group block border border-yellow-600/10 p-6 rounded-lg transition hover:border-yellow-500/50 hover:bg-yellow-600/5"
                  >

                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={artist.profileImage}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full border-2 border-yellow-600 object-cover transition group-hover:border-yellow-400"
                      />

                      <div>
                        <h3 className="text-yellow-500 font-semibold group-hover:text-yellow-400 transition">
                          {artist.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          ⭐ {artist.rating} • {artist.location}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1 mb-4">
                      <p>Experience: {artist.experience}</p>
                      <p>Followers: {artist.followers}</p>
                      <p>Total Sales: {artist.totalSales}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {artist.specialties.map((spec, index) => (
                        <span
                          key={index}
                          className="text-[10px] px-2 py-1 border border-yellow-600/30 rounded text-yellow-400"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-yellow-500 group-hover:text-yellow-400 transition">
                      View Profile →
                    </div>

                  </Link>
                ))}

              </div>

            </div>
          )}
        </div>

        {/* Cart */}
        <button
          onClick={openCart}
          className="relative hover:text-yellow-500 transition"
        >
          Cart
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-4 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </button>

      </div>

    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
  <Navbar />

  {children}

  {/* LUXURY FOOTER */}
  <footer className="border-t border-yellow-600/20 bg-black text-white mt-24">
    <div className="max-w-7xl mx-auto px-6 md:px-16 py-16 grid md:grid-cols-4 gap-12">

      {/* Brand */}
      <div>
        <h2 className="text-2xl text-yellow-500 tracking-widest mb-4">
          KALA SETU
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Connecting collectors with India's finest physical and digital artists.
          Discover curated artworks and commission custom pieces directly from creators.
        </p>
      </div>

      {/* Marketplace */}
      <div>
        <h3 className="text-yellow-500 mb-4">Marketplace</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li><Link href="/explore">Explore Art</Link></li>
          <li><Link href="/artists">Artists</Link></li>
          <li><Link href="/custom-request">Custom Artwork</Link></li>
          <li><Link href="/cart">Cart</Link></li>
        </ul>
      </div>

      {/* For Artists */}
      <div>
        <h3 className="text-yellow-500 mb-4">For Artists</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>Join Kala Setu</li>
          <li>Sell Your Art</li>
          <li>Artist Guidelines</li>
          <li>Commission Requests</li>
        </ul>
      </div>

      {/* Social */}
      <div>
        <h3 className="text-yellow-500 mb-4">Follow Us</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>Instagram</li>
          <li>Twitter</li>
          <li>LinkedIn</li>
          <li>YouTube</li>
        </ul>
      </div>

    </div>

    {/* Bottom copyright */}
    <div className="border-t border-yellow-600/20 text-center text-gray-500 text-sm py-6">
      © 2026 Kala Setu. All rights reserved.
    </div>
  </footer>

  <CartDrawer />
</CartProvider>
      </body>
    </html>
  );
}