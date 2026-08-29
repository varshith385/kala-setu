import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-display text-8xl text-yellow-500 mb-6">404</p>
        <h1 className="font-display text-2xl text-white mb-4">
          This piece isn't here
        </h1>
        <p className="text-gray-400 mb-10">
          The page you're looking for doesn't exist, or may have been moved.
        </p>
        <Link
          href="/explore"
          className="inline-block border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
        >
          Explore Collection →
        </Link>
      </div>
    </main>
  );
}