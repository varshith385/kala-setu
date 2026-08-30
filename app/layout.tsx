"use client";

import "./globals.css";
import Link from "next/link";
import { useState } from "react";
import { Playfair_Display, Inter } from "next/font/google";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import CartDrawer from "./components/CartDrawer";
import { artists } from "./data/artists";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

function Navbar() {
  const { cart, openCart } = useCart();
  const { user, signOut } = useAuth();
  const [artistOpen, setArtistOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <nav className="bg-black text-white border-b border-yellow-600/20 relative">
        <div className="flex justify-between items-center px-6 md:px-16 py-6">

          <Link href="/" className="font-display text-xl md:text-2xl text-yellow-500 tracking-widest whitespace-nowrap">
            KALA SETU
          </Link>

          <div className="hidden lg:flex items-center gap-10 relative">

            <Link href="/explore" className="hover:text-yellow-500 transition">
              Explore
            </Link>

            <Link href="/custom-request" className="hover:text-yellow-500 transition">
              Custom Artwork
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setArtistOpen(true)}
              onMouseLeave={() => setArtistOpen(false)}
            >
              <Link href="/artists" className="hover:text-yellow-500 transition">
                Artists ▾
              </Link>

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

            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/orders" className="hover:text-yellow-500 transition text-sm">
                  My Orders
                </Link>
                <span className="text-xs text-gray-400">{user.email}</span>
                <button onClick={() => signOut()} className="hover:text-yellow-500 transition text-sm">
                  Log Out
                </button>
              </div>
            ) : (
              <Link href="/login" className="hover:text-yellow-500 transition">
                Log In
              </Link>
            )}

            <button onClick={openCart} className="relative hover:text-yellow-500 transition">
              Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-4 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-5 lg:hidden">
            <button onClick={openCart} className="relative">
              <span className="text-sm">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-4 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            <button onClick={() => setMobileOpen(true)} className="flex flex-col gap-1.5 w-7" aria-label="Menu">
              <span className="h-0.5 bg-yellow-500" />
              <span className="h-0.5 bg-yellow-500" />
              <span className="h-0.5 bg-yellow-500" />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* MOBILE DRAWER PANEL */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-black text-white shadow-2xl z-50 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex justify-between items-center border-b border-yellow-600/30">
          <span className="font-display text-lg text-yellow-500">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Link href="/explore" onClick={() => setMobileOpen(false)} className="block hover:text-yellow-500 transition">
            Explore
          </Link>
          <Link href="/custom-request" onClick={() => setMobileOpen(false)} className="block hover:text-yellow-500 transition">
            Custom Artwork
          </Link>
          <Link href="/artists" onClick={() => setMobileOpen(false)} className="block hover:text-yellow-500 transition">
            Artists
          </Link>

          <div className="border-t border-yellow-600/20 pt-5">
            {user ? (
              <div className="space-y-3">
                <Link href="/orders" onClick={() => setMobileOpen(false)} className="block hover:text-yellow-500 transition">
                  My Orders
                </Link>
                <p className="text-xs text-gray-400">{user.email}</p>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="hover:text-yellow-500 transition text-sm"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block hover:text-yellow-500 transition">
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
        <CartProvider>
  <Navbar />

  {children}

  {/* LUXURY FOOTER */}
  <footer className="border-t border-yellow-600/20 bg-black text-white mt-16 md:mt-24">
    <div className="max-w-7xl mx-auto px-5 md:px-16 py-10 md:py-16">

      <div className="mb-8 md:hidden">
        <h2 className="font-display text-xl text-yellow-500 tracking-widest mb-3">
          KALA SETU
        </h2>
        <p className="text-gray-400 text-xs leading-relaxed">
          Connecting collectors with India's finest physical and digital artists.
        </p>
      </div>

      <div className="hidden md:block mb-0">
        <h2 className="font-display text-2xl text-yellow-500 tracking-widest mb-4">
          KALA SETU
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-12">
          Connecting collectors with India's finest physical and digital artists.
          Discover curated artworks and commission custom pieces directly from creators.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">

        <div>
          <h3 className="text-yellow-500 text-sm md:text-base mb-3 md:mb-4">Marketplace</h3>
          <ul className="space-y-2 text-gray-400 text-xs md:text-sm">
            <li><Link href="/explore">Explore Art</Link></li>
            <li><Link href="/artists">Artists</Link></li>
            <li><Link href="/custom-request">Custom Artwork</Link></li>
            <li><Link href="/cart">Cart</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-yellow-500 text-sm md:text-base mb-3 md:mb-4">For Artists</h3>
          <ul className="space-y-2 text-gray-400 text-xs md:text-sm">
            <li>Join Kala Setu</li>
            <li>Sell Your Art</li>
            <li>Artist Guidelines</li>
            <li>Commission Requests</li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <h3 className="text-yellow-500 text-sm md:text-base mb-3 md:mb-4">Follow Us</h3>
          <ul className="flex gap-4 md:block md:space-y-2 text-gray-400 text-xs md:text-sm">
            <li>Instagram</li>
            <li>Twitter</li>
            <li>LinkedIn</li>
            <li>YouTube</li>
          </ul>
        </div>

      </div>

    </div>

    <div className="border-t border-yellow-600/20 text-center text-gray-500 text-xs md:text-sm py-4 md:py-6">
      © 2026 Kala Setu. All rights reserved.
    </div>
  </footer>

  <CartDrawer />
</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}