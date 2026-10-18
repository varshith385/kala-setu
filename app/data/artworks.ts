export interface ArtworkDetails {
  category: string;
  medium: string;
  dimensions: string;
  yearCreated: number;
  weight: string;
  framed: boolean;
  signed: boolean;
  style: string;
  regionalTradition: string;
  roomSuitability: string[];
  mood: string[];
}

export interface ArtworkArtist {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  totalSales: number;
}

export interface ArtworkPricing {
  amount: number;
  currency: string;
  discountPercentage: number;
  isOnSale: boolean;
}

export interface ArtworkInventory {
  available: boolean;
  quantity: number;
  limitedEdition: boolean;
}

export interface ArtworkShipping {
  freeShipping: boolean;
  shipsFrom: string;
  estimatedDeliveryDays: number;
}

export interface ArtworkEngagement {
  rating: number;
  totalReviews: number;
  views: number;
  likes: number;
}

export interface Artwork {
  id: string;
  title: string;
  slug: string;
  type: "physical" | "digital";
  description: string;
  artist: ArtworkArtist;
  pricing: ArtworkPricing;
  details: ArtworkDetails;
  images: string[];
  thumbnail: string;
  inventory: ArtworkInventory;
  shipping: ArtworkShipping;
  engagement: ArtworkEngagement;
  tags: string[];
  featured: boolean;
  commissionAvailable: boolean;
  customizable: boolean;
}

export const artworks: Artwork[] = [
  // -------- AARAV SHARMA (Hyderabad) --------
  {
    id: "art-001",
    title: "Golden Heritage",
    slug: "golden-heritage",
    type: "physical",
    description: "A celebration of Indian royal heritage using rich gold textures, layered impasto, and burnished gold leaf.",
    artist: {
      id: "artist-001",
      name: "Aarav Sharma",
      verified: true,
      rating: 4.8,
      totalSales: 120,
    },
    pricing: {
      amount: 15000,
      currency: "INR",
      discountPercentage: 10,
      isOnSale: true,
    },
    details: {
      category: "Physical Art",
      medium: "Acrylic on Canvas",
      dimensions: "24x36 inches",
      yearCreated: 2024,
      weight: "2kg",
      framed: true,
      signed: true,
      style: "Heritage & Royal",
      regionalTradition: "Deccan & Mughal Gold",
      roomSuitability: ["Living Room", "Executive Suite", "Foyer"],
      mood: ["Regal", "Opulent", "Warm"],
    },
    images: ["/art1.jpg"],
    thumbnail: "/art1.jpg",
    inventory: {
      available: true,
      quantity: 1,
      limitedEdition: false,
    },
    shipping: {
      freeShipping: true,
      shipsFrom: "Hyderabad",
      estimatedDeliveryDays: 5,
    },
    engagement: {
      rating: 4.8,
      totalReviews: 34,
      views: 1500,
      likes: 240,
    },
    tags: ["gold", "heritage", "acrylic", "royal"],
    featured: true,
    commissionAvailable: true,
    customizable: false,
  },

  {
    id: "art-002",
    title: "Sacred Flow",
    slug: "sacred-flow",
    type: "physical",
    description: "Inspired by spiritual Indian river energy, devotional dawn rituals, and rhythmic currents of the sacred waters.",
    artist: {
      id: "artist-001",
      name: "Aarav Sharma",
      verified: true,
      rating: 4.8,
      totalSales: 120,
    },
    pricing: {
      amount: 12000,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Oil on Canvas",
      dimensions: "30x40 inches",
      yearCreated: 2023,
      weight: "2.5kg",
      framed: true,
      signed: true,
      style: "Spiritual & Devotional",
      regionalTradition: "Vedic & Sacred River",
      roomSuitability: ["Living Room", "Pooja Room", "Bedroom"],
      mood: ["Serene", "Spiritual", "Fluid"],
    },
    images: ["/art2.jpg"],
    thumbnail: "/art2.jpg",
    inventory: {
      available: true,
      quantity: 1,
      limitedEdition: false,
    },
    shipping: {
      freeShipping: true,
      shipsFrom: "Hyderabad",
      estimatedDeliveryDays: 6,
    },
    engagement: {
      rating: 4.6,
      totalReviews: 20,
      views: 980,
      likes: 180,
    },
    tags: ["spiritual", "oil", "devotional", "river"],
    featured: false,
    commissionAvailable: true,
    customizable: false,
  },

  {
    id: "art-003",
    title: "Urban Maharaja",
    slug: "urban-maharaja",
    type: "digital",
    description: "Modern royal identity reimagined in urban neon tones, merging classical court silhouettes with street culture.",
    artist: {
      id: "artist-001",
      name: "Aarav Sharma",
      verified: true,
      rating: 4.8,
      totalSales: 120,
    },
    pricing: {
      amount: 18000,
      currency: "INR",
      discountPercentage: 15,
      isOnSale: true,
    },
    details: {
      category: "Digital Art",
      medium: "Digital Illustration",
      dimensions: "High Resolution",
      yearCreated: 2024,
      weight: "Digital",
      framed: false,
      signed: true,
      style: "Contemporary Surrealism",
      regionalTradition: "Contemporary Urban India",
      roomSuitability: ["Modern Lounge", "Creative Studio", "Living Room"],
      mood: ["Bold", "Energetic", "Modern"],
    },
    images: ["/art3.jpg"],
    thumbnail: "/art3.jpg",
    inventory: {
      available: true,
      quantity: 5,
      limitedEdition: true,
    },
    shipping: {
      freeShipping: false,
      shipsFrom: "Digital Download",
      estimatedDeliveryDays: 0,
    },
    engagement: {
      rating: 4.9,
      totalReviews: 50,
      views: 2000,
      likes: 450,
    },
    tags: ["modern", "digital", "urban", "maharaja"],
    featured: true,
    commissionAvailable: true,
    customizable: true,
  },

  // -------- RIYA VERMA (Mumbai) --------
  {
    id: "art-004",
    title: "Temple Silence",
    slug: "temple-silence",
    type: "physical",
    description: "Minimalistic sacred Dravidian temple architecture captured in deep charcoal chiaroscuro and atmospheric negative space.",
    artist: {
      id: "artist-002",
      name: "Riya Verma",
      verified: true,
      rating: 4.7,
      totalSales: 85,
    },
    pricing: {
      amount: 10000,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Charcoal on Paper",
      dimensions: "18x24 inches",
      yearCreated: 2022,
      weight: "1kg",
      framed: false,
      signed: true,
      style: "Modern Minimalist",
      regionalTradition: "Dravidian Temple Architecture",
      roomSuitability: ["Pooja Room", "Study / Library", "Bedroom"],
      mood: ["Contemplative", "Quiet", "Sacred"],
    },
    images: ["/art4.jpg"],
    thumbnail: "/art4.jpg",
    inventory: {
      available: true,
      quantity: 1,
      limitedEdition: false,
    },
    shipping: {
      freeShipping: true,
      shipsFrom: "Mumbai",
      estimatedDeliveryDays: 4,
    },
    engagement: {
      rating: 4.5,
      totalReviews: 12,
      views: 700,
      likes: 95,
    },
    tags: ["minimal", "charcoal", "temple", "sacred"],
    featured: false,
    commissionAvailable: false,
    customizable: false,
  },

  {
    id: "art-005",
    title: "Divine Feminine",
    slug: "divine-feminine",
    type: "digital",
    description: "Bold tribute to feminine mythology, depicting the cosmic Devi through vibrant geometry, sacred botanicals, and mixed-media layers.",
    artist: {
      id: "artist-002",
      name: "Riya Verma",
      verified: true,
      rating: 4.7,
      totalSales: 85,
    },
    pricing: {
      amount: 20000,
      currency: "INR",
      discountPercentage: 5,
      isOnSale: true,
    },
    details: {
      category: "Digital Art",
      medium: "Mixed Media",
      dimensions: "36x48 inches",
      yearCreated: 2024,
      weight: "3kg",
      framed: true,
      signed: true,
      style: "Folk & Mythological",
      regionalTradition: "Tantric & Shakta Iconography",
      roomSuitability: ["Living Room", "Modern Lounge", "Gallery Wall"],
      mood: ["Powerful", "Mystical", "Vibrant"],
    },
    images: ["/art5.jpg"],
    thumbnail: "/art5.jpg",
    inventory: {
      available: true,
      quantity: 1,
      limitedEdition: false,
    },
    shipping: {
      freeShipping: true,
      shipsFrom: "Mumbai",
      estimatedDeliveryDays: 7,
    },
    engagement: {
      rating: 4.9,
      totalReviews: 60,
      views: 2500,
      likes: 600,
    },
    tags: ["mythology", "devi", "goddess", "mixed media"],
    featured: true,
    commissionAvailable: true,
    customizable: true,
  },

  {
    id: "art-006",
    title: "Monsoon Reverie",
    slug: "monsoon-reverie",
    type: "physical",
    description: "An atmospheric study of the first monsoon rains over an Indian courtyard, with shimmering wet slate and petrichor hues.",
    artist: {
      id: "artist-001",
      name: "Aarav Sharma",
      verified: true,
      rating: 4.8,
      totalSales: 120,
    },
    pricing: {
      amount: 13000,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Oil on Canvas",
      dimensions: "26x36 inches",
      yearCreated: 2025,
      weight: "2.2kg",
      framed: true,
      signed: true,
      style: "Impressionistic",
      regionalTradition: "Ganga Ghats & Monsoon",
      roomSuitability: ["Living Room", "Dining Room", "Bedroom"],
      mood: ["Nostalgic", "Gentle", "Reflective"],
    },
    images: ["/art6.jpg"],
    thumbnail: "/art6.jpg",
    inventory: { available: true, quantity: 1, limitedEdition: false },
    shipping: { freeShipping: true, shipsFrom: "Hyderabad", estimatedDeliveryDays: 5 },
    engagement: { rating: 4.7, totalReviews: 11, views: 610, likes: 102 },
    tags: ["monsoon", "atmospheric", "rain", "oil"],
    featured: false,
    commissionAvailable: true,
    customizable: false,
  },

  {
    id: "art-007",
    title: "Neon Ganesha",
    slug: "neon-ganesha",
    type: "digital",
    description: "A bold, neon-lit reinterpretation of Lord Ganesha for the digital age, rendered with cyber-holographic lighting and sacred modakas.",
    artist: {
      id: "artist-002",
      name: "Riya Verma",
      verified: true,
      rating: 4.7,
      totalSales: 85,
    },
    pricing: {
      amount: 16000,
      currency: "INR",
      discountPercentage: 25,
      isOnSale: true,
    },
    details: {
      category: "Digital Art",
      medium: "Digital Illustration",
      dimensions: "High Resolution",
      yearCreated: 2025,
      weight: "Digital",
      framed: false,
      signed: true,
      style: "Neo-Indian Cyberpunk",
      regionalTradition: "Contemporary Digital India",
      roomSuitability: ["Modern Lounge", "Creative Studio"],
      mood: ["Electric", "Futuristic", "Playful"],
    },
    images: ["/art7.jpg"],
    thumbnail: "/art7.jpg",
    inventory: { available: true, quantity: 10, limitedEdition: true },
    shipping: { freeShipping: false, shipsFrom: "Digital Download", estimatedDeliveryDays: 0 },
    engagement: { rating: 4.8, totalReviews: 33, views: 1450, likes: 410 },
    tags: ["neon", "mythology", "ganesha", "cyberpunk"],
    featured: true,
    commissionAvailable: true,
    customizable: true,
  },

  // -------- MEERA IYER (Chennai) --------
  {
    id: "art-008",
    title: "Kerala Mural Dreams",
    slug: "kerala-mural-dreams",
    type: "physical",
    description: "Traditional Kerala temple mural technique reimagined with hand-ground Panchavarna mineral pigments on aged teakwood.",
    artist: {
      id: "artist-003",
      name: "Meera Iyer",
      verified: true,
      rating: 4.9,
      totalSales: 65,
    },
    pricing: {
      amount: 16500,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Natural Pigments on Wood Panel",
      dimensions: "20x30 inches",
      yearCreated: 2024,
      weight: "1.5kg",
      framed: true,
      signed: true,
      style: "Traditional Temple Mural",
      regionalTradition: "Kerala Temple Murals",
      roomSuitability: ["Pooja Room", "Living Room", "Dining Room"],
      mood: ["Sacred", "Devotional", "Harmonious"],
    },
    images: ["/art8.jpg"],
    thumbnail: "/art8.jpg",
    inventory: { available: true, quantity: 1, limitedEdition: false },
    shipping: { freeShipping: true, shipsFrom: "Chennai", estimatedDeliveryDays: 6 },
    engagement: { rating: 4.9, totalReviews: 22, views: 890, likes: 210 },
    tags: ["mural", "heritage", "kerala", "temple"],
    featured: true,
    commissionAvailable: true,
    customizable: false,
  },

  {
    id: "art-009",
    title: "Digital Devi",
    slug: "digital-devi",
    type: "digital",
    description: "A goddess reimagined through glitch art, sacred yantras, and traditional Tamil bronze silhouette styling.",
    artist: {
      id: "artist-003",
      name: "Meera Iyer",
      verified: true,
      rating: 4.9,
      totalSales: 65,
    },
    pricing: {
      amount: 14000,
      currency: "INR",
      discountPercentage: 20,
      isOnSale: true,
    },
    details: {
      category: "Digital Art",
      medium: "Digital Illustration",
      dimensions: "High Resolution",
      yearCreated: 2025,
      weight: "Digital",
      framed: false,
      signed: true,
      style: "Digital Visionary",
      regionalTradition: "Contemporary Cyber Mythology",
      roomSuitability: ["Creative Studio", "Modern Lounge"],
      mood: ["Surreal", "Intriguing", "Vibrant"],
    },
    images: ["/art9.jpg"],
    thumbnail: "/art9.jpg",
    inventory: { available: true, quantity: 8, limitedEdition: true },
    shipping: { freeShipping: false, shipsFrom: "Digital Download", estimatedDeliveryDays: 0 },
    engagement: { rating: 4.7, totalReviews: 18, views: 1100, likes: 300 },
    tags: ["mythology", "glitch", "devi", "visionary"],
    featured: false,
    commissionAvailable: true,
    customizable: true,
  },

  {
    id: "art-010",
    title: "Backwater Silence",
    slug: "backwater-silence",
    type: "physical",
    description: "A quiet, meditative watercolor study of Kerala's Vembanad backwaters at dawn with mist rising over coconut groves.",
    artist: {
      id: "artist-003",
      name: "Meera Iyer",
      verified: true,
      rating: 4.9,
      totalSales: 65,
    },
    pricing: {
      amount: 11000,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Watercolor on Paper",
      dimensions: "16x22 inches",
      yearCreated: 2023,
      weight: "0.8kg",
      framed: false,
      signed: true,
      style: "Natural Landscape",
      regionalTradition: "Malabar Coast Nature",
      roomSuitability: ["Bedroom", "Study / Library", "Dining Room"],
      mood: ["Tranquil", "Peaceful", "Subtle"],
    },
    images: ["/art10.jpg"],
    thumbnail: "/art10.jpg",
    inventory: { available: true, quantity: 1, limitedEdition: false },
    shipping: { freeShipping: true, shipsFrom: "Chennai", estimatedDeliveryDays: 5 },
    engagement: { rating: 4.6, totalReviews: 9, views: 540, likes: 76 },
    tags: ["nature", "watercolor", "kerala", "landscape"],
    featured: false,
    commissionAvailable: false,
    customizable: false,
  },

  // -------- KABIR KHAN (Jaipur) --------
  {
    id: "art-011",
    title: "Miniature Durbar",
    slug: "miniature-durbar",
    type: "physical",
    description: "A royal court durbar scene rendered in the microscopic brushwork of traditional Mewar miniature style on wasli paper.",
    artist: {
      id: "artist-004",
      name: "Kabir Khan",
      verified: true,
      rating: 4.8,
      totalSales: 95,
    },
    pricing: {
      amount: 22000,
      currency: "INR",
      discountPercentage: 10,
      isOnSale: true,
    },
    details: {
      category: "Physical Art",
      medium: "Gouache on Handmade Paper",
      dimensions: "12x16 inches",
      yearCreated: 2024,
      weight: "0.5kg",
      framed: true,
      signed: true,
      style: "Court Miniature",
      regionalTradition: "Rajasthani Court Miniatures",
      roomSuitability: ["Executive Suite", "Living Room", "Study / Library"],
      mood: ["Intricate", "Prestigious", "Historic"],
    },
    images: ["/art11.jpg"],
    thumbnail: "/art11.jpg",
    inventory: { available: true, quantity: 1, limitedEdition: true },
    shipping: { freeShipping: true, shipsFrom: "Jaipur", estimatedDeliveryDays: 7 },
    engagement: { rating: 4.9, totalReviews: 40, views: 1600, likes: 380 },
    tags: ["miniature", "royal", "heritage", "rajasthan"],
    featured: true,
    commissionAvailable: true,
    customizable: true,
  },

  {
    id: "art-012",
    title: "Camel Caravan at Dusk",
    slug: "camel-caravan-at-dusk",
    type: "physical",
    description: "A desert caravan captured in warm ochre and terracotta dusk tones using traditional miniature line work on handmade paper.",
    artist: {
      id: "artist-004",
      name: "Kabir Khan",
      verified: true,
      rating: 4.8,
      totalSales: 95,
    },
    pricing: {
      amount: 13500,
      currency: "INR",
      discountPercentage: 0,
      isOnSale: false,
    },
    details: {
      category: "Physical Art",
      medium: "Gouache on Paper",
      dimensions: "14x18 inches",
      yearCreated: 2023,
      weight: "0.6kg",
      framed: false,
      signed: true,
      style: "Desert Folklore",
      regionalTradition: "Thar Desert Folklore",
      roomSuitability: ["Living Room", "Dining Room", "Foyer"],
      mood: ["Warm", "Earthy", "Timeless"],
    },
    images: ["/art12.jpg"],
    thumbnail: "/art12.jpg",
    inventory: { available: true, quantity: 1, limitedEdition: false },
    shipping: { freeShipping: true, shipsFrom: "Jaipur", estimatedDeliveryDays: 6 },
    engagement: { rating: 4.7, totalReviews: 15, views: 720, likes: 140 },
    tags: ["desert", "rajasthan", "camel", "gouache"],
    featured: false,
    commissionAvailable: true,
    customizable: false,
  },

  {
    id: "art-013",
    title: "Peacock Throne Study",
    slug: "peacock-throne-study",
    type: "digital",
    description: "A high-definition digital reinterpretation of Mughal-era royal throne iconography, lapis lazuli inlays, and feather symmetry.",
    artist: {
      id: "artist-004",
      name: "Kabir Khan",
      verified: true,
      rating: 4.8,
      totalSales: 95,
    },
    pricing: {
      amount: 17500,
      currency: "INR",
      discountPercentage: 15,
      isOnSale: true,
    },
    details: {
      category: "Digital Art",
      medium: "Digital Illustration",
      dimensions: "High Resolution",
      yearCreated: 2025,
      weight: "Digital",
      framed: false,
      signed: true,
      style: "Mughal Heritage",
      regionalTradition: "Mughal Royal Court",
      roomSuitability: ["Executive Suite", "Modern Lounge", "Living Room"],
      mood: ["Majestic", "Luminous", "Cultured"],
    },
    images: ["/art13.jpg"],
    thumbnail: "/art13.jpg",
    inventory: { available: true, quantity: 6, limitedEdition: true },
    shipping: { freeShipping: false, shipsFrom: "Digital Download", estimatedDeliveryDays: 0 },
    engagement: { rating: 4.8, totalReviews: 27, views: 1350, likes: 310 },
    tags: ["mughal", "royal", "digital", "peacock"],
    featured: true,
    commissionAvailable: true,
    customizable: true,
  },
];
