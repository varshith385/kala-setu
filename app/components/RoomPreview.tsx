"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export interface RoomPreviewProps {
  artworkImage: string;
  artworkTitle: string;
  artworkDimensions?: string;
  artworkId?: string;
  artworkPrice?: number;
  artworkSlug?: string;
}

type RoomPreset = "living-room" | "minimal-gallery" | "home-office" | "bedroom-suite" | "custom-photo";
type WallFinish = "warm-ivory" | "gallery-white" | "slate-charcoal" | "sage-heritage" | "royal-terracotta" | "muted-indigo";
type FrameStyle = "none" | "studio-black" | "natural-oak" | "gallery-white" | "antiqued-gold";
type LightingMode = "gallery-spotlight" | "warm-ambient" | "natural-daylight";
type ScalePreset = "small" | "medium" | "large" | "statement";

const WALL_COLORS: Record<WallFinish, { name: string; hex: string; textDark: boolean }> = {
  "warm-ivory": { name: "Warm Ivory", hex: "#FAF7F2", textDark: true },
  "gallery-white": { name: "Gallery White", hex: "#F2F1ED", textDark: true },
  "slate-charcoal": { name: "Slate Charcoal", hex: "#22262C", textDark: false },
  "sage-heritage": { name: "Sage Heritage", hex: "#3C4840", textDark: false },
  "royal-terracotta": { name: "Terracotta", hex: "#5C342C", textDark: false },
  "muted-indigo": { name: "Muted Indigo", hex: "#262E3E", textDark: false },
};

const ROOM_PRESETS: Record<RoomPreset, { name: string; icon: string; description: string }> = {
  "living-room": { name: "Living Room", icon: "🛋️", description: "Modern salon with walnut credenza" },
  "minimal-gallery": { name: "Gallery", icon: "🏛️", description: "Museum exhibition wall with bench" },
  "home-office": { name: "Study", icon: "📚", description: "Architect's study with oak desk" },
  "bedroom-suite": { name: "Bedroom", icon: "🛏️", description: "Peaceful suite above headboard" },
  "custom-photo": { name: "Your Photo", icon: "📷", description: "Upload your personal room photo" },
};

const FRAMES: Record<FrameStyle, { name: string; borderCss: string; shadowCss: string }> = {
  none: {
    name: "Unframed Canvas",
    borderCss: "border-0 ring-1 ring-black/20",
    shadowCss: "shadow-[0_20px_50px_rgba(0,0,0,0.4),0_10px_20px_rgba(0,0,0,0.3)]",
  },
  "studio-black": {
    name: "Studio Black",
    borderCss: "border-[12px] border-[#181818] ring-1 ring-black/40",
    shadowCss: "shadow-[0_25px_60px_rgba(0,0,0,0.5),0_10px_25px_rgba(0,0,0,0.35)]",
  },
  "natural-oak": {
    name: "Natural Oak",
    borderCss: "border-[14px] border-[#C2A176] ring-1 ring-[#9E7D54]",
    shadowCss: "shadow-[0_25px_60px_rgba(0,0,0,0.45),0_12px_24px_rgba(0,0,0,0.3)]",
  },
  "gallery-white": {
    name: "Gallery White",
    borderCss: "border-[12px] border-[#F8F8F8] ring-1 ring-neutral-300",
    shadowCss: "shadow-[0_25px_60px_rgba(0,0,0,0.35),0_10px_20px_rgba(0,0,0,0.25)]",
  },
  "antiqued-gold": {
    name: "Antiqued Gold",
    borderCss: "border-[14px] border-[#C79D4C] ring-1 ring-[#8C6924]",
    shadowCss: "shadow-[0_25px_60px_rgba(0,0,0,0.5),0_12px_28px_rgba(0,0,0,0.35)]",
  },
};

const STORAGE_KEY = "kala_setu_room_preferences";

export default function RoomPreview({
  artworkImage,
  artworkTitle,
  artworkDimensions,
  artworkId,
  artworkPrice,
}: RoomPreviewProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  // Room Studio Customization States
  const [selectedRoom, setSelectedRoom] = useState<RoomPreset>("living-room");
  const [wallFinish, setWallFinish] = useState<WallFinish>("warm-ivory");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("studio-black");
  const [hasMat, setHasMat] = useState(true);
  const [lighting, setLighting] = useState<LightingMode>("gallery-spotlight");
  const [scalePreset, setScalePreset] = useState<ScalePreset>("medium");
  const [customRoomImage, setCustomRoomImage] = useState<string | null>(null);

  // Positioning & Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const [imgError, setImgError] = useState(false);

  // Reset imgError if artwork image changes
  useEffect(() => {
    setImgError(false);
  }, [artworkImage]);

  const isHydrated = useRef(false);

  // Restore saved preferences on mount with strict validation against known keys
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wallFinish && Object.prototype.hasOwnProperty.call(WALL_COLORS, parsed.wallFinish)) {
          setWallFinish(parsed.wallFinish);
        }
        if (parsed.frameStyle && Object.prototype.hasOwnProperty.call(FRAMES, parsed.frameStyle)) {
          setFrameStyle(parsed.frameStyle);
        }
        if (typeof parsed.hasMat === "boolean") {
          setHasMat(parsed.hasMat);
        }
        if (parsed.lighting && ["gallery-spotlight", "warm-ambient", "natural-daylight"].includes(parsed.lighting)) {
          setLighting(parsed.lighting);
        }
      }
    } catch {
      // Ignore storage errors safely
    } finally {
      isHydrated.current = true;
    }
  }, []);

  // Save preferences on change only after initial hydration
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          wallFinish,
          frameStyle,
          hasMat,
          lighting,
        })
      );
    } catch {
      // Ignore storage errors safely
    }
  }, [wallFinish, frameStyle, hasMat, lighting]);

  // Handle custom room photo upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomRoomImage(event.target?.result as string);
        setSelectedRoom("custom-photo");
      };
      reader.readAsDataURL(file);
    }
  };

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(-280, Math.min(280, e.clientX - dragStart.x));
    const newY = Math.max(-160, Math.min(160, e.clientY - dragStart.y));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = Math.max(-280, Math.min(280, touch.clientX - dragStart.x));
    const newY = Math.max(-160, Math.min(160, touch.clientY - dragStart.y));
    setPosition({ x: newX, y: newY });
  };

  const handleKeyDownNudge = (e: React.KeyboardEvent) => {
    const step = 15;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((p) => ({ ...p, x: Math.max(-280, p.x - step) }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((p) => ({ ...p, x: Math.min(280, p.x + step) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPosition((p) => ({ ...p, y: Math.max(-160, p.y - step) }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPosition((p) => ({ ...p, y: Math.min(160, p.y + step) }));
    }
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScalePreset("medium");
  };

  // Artwork display scale width in pixels
  const artworkWidth = useMemo(() => {
    const base = isFullscreen ? 360 : 250;
    switch (scalePreset) {
      case "small":
        return Math.round(base * 0.75);
      case "large":
        return Math.round(base * 1.3);
      case "statement":
        return Math.round(base * 1.55);
      case "medium":
      default:
        return base;
    }
  }, [scalePreset, isFullscreen]);

  const activeWall = WALL_COLORS[wallFinish] || WALL_COLORS["warm-ivory"];
  const activeFrame = FRAMES[frameStyle] || FRAMES["studio-black"];

  const handleAddToCartFromStudio = () => {
    if (!artworkId || !artworkPrice) return;
    addToCart({
      id: artworkId,
      title: artworkTitle,
      pricing: { amount: artworkPrice },
      quantity: 1,
    });
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  // Keyboard escape listener for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Room view renderer
  const renderRoomCanvas = () => (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      className={`relative w-full overflow-hidden select-none transition-colors duration-500 ${
        isFullscreen ? "h-[75vh] md:h-[80vh] rounded-2xl" : "h-[360px] md:h-[460px] rounded-xl"
      }`}
      style={{
        backgroundColor: selectedRoom === "custom-photo" && customRoomImage ? "#111" : activeWall.hex,
        touchAction: "none",
      }}
    >
      {/* 1. CUSTOM PHOTO BACKGROUND */}
      {selectedRoom === "custom-photo" && customRoomImage && (
        <img
          src={customRoomImage}
          alt="Your Custom Room"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      )}

      {/* 2. ARCHITECTURAL INTERIOR ELEMENTS (CSS SCENES) */}
      {selectedRoom !== "custom-photo" && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Wall ambient shading */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/30" />

          {/* LIGHTING OVERLAY */}
          {lighting === "gallery-spotlight" && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] md:w-[70%] h-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 15%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 35%, transparent 70%)",
              }}
            />
          )}

          {lighting === "warm-ambient" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 80% 20%, rgba(245,185,100,0.3) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(230,170,80,0.15) 0%, transparent 60%)",
              }}
            />
          )}

          {lighting === "natural-daylight" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 45%, transparent 70%)",
              }}
            />
          )}

          {/* ROOM FLOORING & ARCHITECTURAL FURNITURE ACCENTS */}
          {selectedRoom === "living-room" && (
            <>
              {/* Hardwood floor */}
              <div className="absolute bottom-0 inset-x-0 h-[22%] bg-gradient-to-t from-[#201813] to-[#3A2C22] border-t-2 border-[#544033]" />
              <div className="absolute bottom-[22%] inset-x-0 h-3 bg-black/30 shadow-md" />
              {/* Mid-century walnut credenza / sideboard silhouette */}
              <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[65%] md:w-[50%] h-[18%] bg-gradient-to-b from-[#2E1F16] to-[#1F150F] rounded-t-lg shadow-2xl border-t border-amber-900/40 flex items-center justify-between px-6">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 shadow-sm" />
                <div className="w-8 h-1 bg-amber-900/60 rounded" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 shadow-sm" />
              </div>
              {/* Table lamp glow silhouette */}
              <div className="absolute bottom-[22%] left-[22%] w-5 h-12 bg-neutral-800/80 rounded-t-sm" />
              <div className="absolute bottom-[24%] left-[20%] w-9 h-8 bg-amber-100/30 rounded-t-lg blur-[2px]" />
            </>
          )}

          {selectedRoom === "minimal-gallery" && (
            <>
              {/* Light oak parquet floor */}
              <div className="absolute bottom-0 inset-x-0 h-[20%] bg-gradient-to-t from-[#B8A287] to-[#D5C4AC] border-t border-[#A89379]" />
              {/* Baseboard */}
              <div className="absolute bottom-[20%] inset-x-0 h-4 bg-white/70 shadow-sm border-t border-neutral-300" />
              {/* Museum bench */}
              <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[42%] md:w-[32%] h-[10%] bg-[#2B2B2B] rounded shadow-2xl flex justify-between px-4 items-end">
                <div className="w-3 h-full bg-[#1A1A1A] rounded-b" />
                <div className="w-3 h-full bg-[#1A1A1A] rounded-b" />
              </div>
            </>
          )}

          {selectedRoom === "home-office" && (
            <>
              {/* Dark walnut flooring */}
              <div className="absolute bottom-0 inset-x-0 h-[24%] bg-gradient-to-t from-[#1A1512] to-[#2E241E] border-t border-[#4A3A31]" />
              {/* Executive study desk top */}
              <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[72%] md:w-[58%] h-[20%] bg-gradient-to-b from-[#241B15] to-[#16100C] rounded-t-md shadow-2xl border-t-2 border-[#544033] flex justify-between items-start px-6 pt-2">
                <div className="w-10 h-3 bg-neutral-800/70 rounded-sm" />
                <div className="w-14 h-4 bg-amber-900/50 rounded-sm" />
              </div>
            </>
          )}

          {selectedRoom === "bedroom-suite" && (
            <>
              {/* Soft bedroom carpet */}
              <div className="absolute bottom-0 inset-x-0 h-[22%] bg-gradient-to-t from-[#6E675F] to-[#8C847A] border-t border-[#5E5851]" />
              {/* Upholstered headboard top edge */}
              <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[75%] md:w-[60%] h-[18%] bg-gradient-to-b from-[#3D3833] to-[#26221E] rounded-t-2xl shadow-2xl border-t-4 border-[#615A52]" />
            </>
          )}
        </div>
      )}

      {/* 3. INTERACTIVE ARTWORK (WITH DRAG, FRAME, AND MAT) */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Interactive artwork on wall. Use arrow keys to reposition or drag with mouse/touch."
        onKeyDown={handleKeyDownNudge}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          touchAction: "none",
        }}
      >
        <div
          className={`relative ${activeFrame.borderCss} ${activeFrame.shadowCss} transition-all duration-300 ${
            hasMat && frameStyle !== "none" ? "p-3 sm:p-4 bg-[#F8F7F2] shadow-inner" : ""
          }`}
          style={{ width: `${artworkWidth}px` }}
        >
          {/* Subtle mat bevel effect */}
          {hasMat && frameStyle !== "none" && (
            <div className="absolute inset-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] pointer-events-none" />
          )}

          {(!artworkImage || imgError) ? (
            <div className="w-full aspect-[4/3] bg-neutral-900 border border-yellow-600/30 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-3xl mb-1">🖼️</span>
              <span className="font-display text-white text-xs line-clamp-1">{artworkTitle}</span>
              <span className="text-[10px] text-yellow-500/80 mt-0.5">{artworkDimensions || "Original Canvas"}</span>
            </div>
          ) : (
            <img
              src={artworkImage}
              alt={artworkTitle}
              onError={() => setImgError(true)}
              draggable={false}
              className="w-full h-auto block select-none"
              style={{
                maxHeight: isFullscreen ? "55vh" : "280px",
                objectFit: "contain",
              }}
            />
          )}

          {/* Wall Ambient drop reflection on bottom */}
          <div className="absolute -bottom-2 inset-x-0 h-4 bg-black/20 blur-sm pointer-events-none" />
        </div>
      </div>

      {/* 4. OVERLAY CONTROLS (EXPAND & RESET POSITION) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {(position.x !== 0 || position.y !== 0) && (
          <button
            type="button"
            onClick={resetPosition}
            className="bg-black/70 hover:bg-black text-gray-200 text-xs px-2.5 py-1.5 rounded-lg border border-white/20 backdrop-blur-md transition flex items-center gap-1 shadow-lg"
            title="Center Artwork"
          >
            <span>⌖</span>
            <span>Center</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-black/70 hover:bg-yellow-500 hover:text-black text-yellow-400 text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 backdrop-blur-md transition flex items-center gap-1.5 shadow-lg font-medium"
        >
          <span>{isFullscreen ? "✕" : "⛶"}</span>
          <span>{isFullscreen ? "Exit Studio" : "Expand Studio"}</span>
        </button>
      </div>

      {/* DRAG HINT BADGE */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-gray-300 text-[10px] md:text-xs px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
        <span>✋</span>
        <span>Drag to reposition artwork</span>
      </div>
    </div>
  );

  return (
    <div className="bg-neutral-900 border border-yellow-600/30 rounded-2xl p-5 md:p-7 shadow-xl">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-yellow-600/20">
        <div>
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-yellow-500 font-bold block mb-0.5">
            Collector Visualization Studio
          </span>
          <h3 className="font-display text-xl md:text-2xl text-white">
            See &quot;{artworkTitle}&quot; On Your Wall
          </h3>
          {artworkDimensions && (
            <p className="text-gray-400 text-xs mt-0.5">
              Scale based on authentic artist dimensions: <strong className="text-yellow-400">{artworkDimensions}</strong>
            </p>
          )}
        </div>

        {artworkPrice && (
          <div className="text-right hidden sm:block">
            <span className="text-xs text-gray-400 block">Acquisition Value</span>
            <span className="text-lg font-bold text-white">₹ {artworkPrice.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>

      {/* EMBEDDED CANVAS */}
      <div className="mb-6">{renderRoomCanvas()}</div>

      {/* STUDIO CONTROLS TOOLBAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* ROOM INTERIOR PRESET */}
        <div className="bg-black/40 border border-yellow-600/15 p-3 rounded-xl">
          <label className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] block mb-2">
            1. Interior Preset
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(ROOM_PRESETS) as RoomPreset[]).map((key) => {
              const preset = ROOM_PRESETS[key];
              if (key === "custom-photo") return null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedRoom(key)}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] transition flex items-center gap-1.5 justify-start ${
                    selectedRoom === key
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-400 font-semibold"
                      : "border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white"
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span className="truncate">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Photo upload trigger */}
          <label
            htmlFor="room-photo-upload-input"
            className="mt-2 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-yellow-600/30 rounded-lg text-gray-400 hover:text-yellow-400 hover:border-yellow-500/50 cursor-pointer text-[11px] transition"
          >
            <span>📷</span>
            <span>{customRoomImage ? "Change Room Photo" : "Upload Your Room"}</span>
            <input
              id="room-photo-upload-input"
              name="roomPhoto"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* WALL COLOR FINISH */}
        <div className="bg-black/40 border border-yellow-600/15 p-3 rounded-xl">
          <label className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] block mb-2">
            2. Wall Finish
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(WALL_COLORS) as WallFinish[]).map((finish) => {
              const item = WALL_COLORS[finish];
              return (
                <button
                  key={finish}
                  type="button"
                  onClick={() => {
                    setWallFinish(finish);
                    if (selectedRoom === "custom-photo") setSelectedRoom("living-room");
                  }}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition ${
                    wallFinish === finish && selectedRoom !== "custom-photo"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-transparent hover:border-gray-700"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/30 shadow-sm"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className="text-[10px] text-gray-300 truncate max-w-[50px]">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FRAME STYLE & MAT */}
        <div className="bg-black/40 border border-yellow-600/15 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              3. Frame & Mat
            </label>
            <button
              type="button"
              onClick={() => setHasMat(!hasMat)}
              className={`text-[10px] px-2 py-0.5 rounded transition ${
                hasMat ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "text-gray-500 border border-gray-800"
              }`}
            >
              Mat: {hasMat ? "On" : "Off"}
            </button>
          </div>

          <div className="space-y-1">
            {(Object.keys(FRAMES) as FrameStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setFrameStyle(style)}
                className={`w-full text-left px-2.5 py-1 rounded-md text-[11px] transition flex justify-between items-center ${
                  frameStyle === style
                    ? "bg-yellow-500/15 text-yellow-400 font-semibold border border-yellow-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>{FRAMES[style].name}</span>
                {frameStyle === style && <span className="text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* SCALE & LIGHTING */}
        <div className="bg-black/40 border border-yellow-600/15 p-3 rounded-xl flex flex-col justify-between">
          <div>
            <label className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] block mb-2">
              4. Scale & Lighting
            </label>

            {/* Scale buttons */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {(["small", "medium", "large", "statement"] as ScalePreset[]).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setScalePreset(scale)}
                  className={`py-1 text-[10px] uppercase font-bold rounded border transition ${
                    scalePreset === scale
                      ? "border-yellow-500 bg-yellow-500 text-black"
                      : "border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {scale[0].toUpperCase()}
                </button>
              ))}
            </div>

            {/* Lighting selector */}
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "gallery-spotlight", label: "Spotlight" },
                  { id: "warm-ambient", label: "Ambient" },
                  { id: "natural-daylight", label: "Daylight" },
                ] as const
              ).map((light) => (
                <button
                  key={light.id}
                  type="button"
                  onClick={() => setLighting(light.id)}
                  className={`py-1 text-[10px] rounded border transition truncate ${
                    lighting === light.id
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                      : "border-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {light.label}
                </button>
              ))}
            </div>
          </div>

          {/* ADD TO CART ACTION FROM STUDIO */}
          {artworkId && (
            <div className="pt-3 mt-3 border-t border-yellow-600/15 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddToCartFromStudio}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg text-xs transition shadow-md flex items-center justify-center gap-1.5"
              >
                <span>🛒</span>
                <span>{addedNotice ? "Added to Cart!" : "Add to Cart"}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(artworkId)}
                className={`p-2 rounded-lg border transition ${
                  isWishlisted(artworkId)
                    ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
                    : "border-gray-800 text-gray-400 hover:text-white"
                }`}
                title="Save to Wishlist"
              >
                {isWishlisted(artworkId) ? "♥" : "♡"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN STUDIO MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-yellow-600/20 mb-4">
            <div>
              <span className="text-yellow-500 text-xs uppercase tracking-widest font-bold">
                Kala Setu Room Preview Studio
              </span>
              <h2 className="font-display text-2xl text-white">
                {artworkTitle}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {artworkPrice && (
                <span className="text-xl font-bold text-yellow-400 mr-2">
                  ₹ {artworkPrice.toLocaleString("en-IN")}
                </span>
              )}
              {artworkId && (
                <button
                  type="button"
                  onClick={handleAddToCartFromStudio}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  {addedNotice ? "✓ Added!" : "Add to Cart"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg text-sm transition"
              >
                Close ✕
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            {renderRoomCanvas()}
          </div>
        </div>
      )}
    </div>
  );
}