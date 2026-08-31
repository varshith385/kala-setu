"use client";

import { useState, useRef } from "react";

export default function RoomPreview({ artworkImage, artworkTitle }: { artworkImage: string; artworkTitle: string }) {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [size, setSize] = useState(200);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRoomImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left - size / 2,
      y: e.clientY - rect.top - size / 2,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - rect.left - size / 2,
      y: touch.clientY - rect.top - size / 2,
    });
  };

  return (
    <div className="bg-neutral-900 border border-yellow-600/30 rounded-xl p-5 md:p-8">
      <h3 className="font-display text-xl md:text-2xl text-yellow-500 mb-2">
        See It On Your Wall
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Upload a photo of your room and preview how "{artworkTitle}" would look there.
      </p>

      {!roomImage ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-yellow-600/40 rounded-xl py-16 cursor-pointer hover:border-yellow-500/60 transition">
          <span className="text-4xl mb-3">📷</span>
          <span className="text-yellow-400 font-medium mb-1">Upload a Room Photo</span>
          <span className="text-gray-500 text-xs">JPG or PNG</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      ) : (
        <div>
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="relative w-full rounded-xl overflow-hidden border border-yellow-600/30 select-none"
            style={{ touchAction: "none" }}
          >
            <img src={roomImage} alt="Your room" className="w-full h-auto block" draggable={false} />
            <img
              src={artworkImage}
              alt={artworkTitle}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              draggable={false}
              className="absolute shadow-2xl border-4 border-white cursor-move"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${position.x}px`,
                top: `${position.y}px`,
                objectFit: "cover",
              }}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <span className="text-gray-400 text-sm whitespace-nowrap">Size</span>
            <input
              type="range"
              min="100"
              max="400"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
          </div>

          <button
            onClick={() => setRoomImage(null)}
            className="mt-4 text-gray-400 hover:text-yellow-500 text-sm underline transition"
          >
            Try a different photo
          </button>
        </div>
      )}
    </div>
  );
}