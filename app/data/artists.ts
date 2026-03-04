export const artists = [
  {
    id: "artist-001",
    name: "Aarav Sharma",
    bio: "A contemporary Indian artist blending traditional motifs with modern luxury aesthetics.",
    profileImage: "/artist1.jpg",
    verified: true,
    rating: 4.8,
    totalSales: 120,
    followers: 540,
    location: "Hyderabad",
    phone: "+918522847389",
    experience: "8 Years",
    specialties: ["Acrylic", "Heritage Themes", "Luxury Art"],
    social: {
      instagram: "@aarav.art",
      website: "www.aaravart.com",
    },

    artworks: [
      {
        id: "art-001",
        slug: "golden-heritage",
        title: "Golden Heritage",
        image: "/art1.jpg",
        price: 13500,
        originalPrice: 15000,
        category: "Physical Art",
        medium: "Acrylic on Canvas",
        dimensions: "24x36 inches",
        year: 2024,
        framed: true,
        signed: true,
        description:
          "A celebration of Indian royal heritage using rich gold textures and layered brush techniques.",
      },
      {
        id: "art-002",
        slug: "royal-essence",
        title: "Royal Essence",
        image: "/art2.jpg",
        price: 22000,
        originalPrice: 25000,
        category: "Physical Art",
        medium: "Oil on Canvas",
        dimensions: "30x40 inches",
        year: 2023,
        framed: false,
        signed: true,
        description:
          "A bold exploration of regal themes with deep contrast and dramatic highlights.",
      },
    ],

    reviews: [
      {
        id: "rev-001",
        name: "Rahul",
        rating: 5,
        comment: "Absolutely stunning artwork and premium finish!",
      },
      {
        id: "rev-002",
        name: "Meera",
        rating: 4,
        comment: "Loved the detailing and communication.",
      },
    ],
  },

  {
    id: "artist-002",
    name: "Riya Verma",
    bio: "A digital illustrator known for futuristic Indian themes and bold storytelling.",
    profileImage: "/artist2.jpg",
    verified: true,
    rating: 4.7,
    totalSales: 85,
    followers: 420,
    location: "Mumbai",
    phone: "+918522847389",
    experience: "5 Years",
    specialties: ["Digital Art", "Modern Portraits", "Mythology"],
    social: {
      instagram: "@riya.creates",
      website: "www.riyaverma.art",
    },

    artworks: [
      {
        id: "art-003",
        slug: "neo-bharat",
        title: "Neo Bharat",
        image: "/art3.jpg",
        price: 7500,
        originalPrice: 8000,
        category: "Digital Art",
        medium: "Digital Illustration",
        dimensions: "High Resolution (Printable)",
        year: 2024,
        framed: false,
        signed: false,
        description:
          "A futuristic reimagination of Bharat blending mythology with sci-fi aesthetics.",
      },
      {
        id: "art-004",
        slug: "future-devi",
        title: "Future Devi",
        image: "/art4.jpg",
        price: 11000,
        originalPrice: 12000,
        category: "Digital Art",
        medium: "Concept Art",
        dimensions: "4K Resolution",
        year: 2024,
        framed: false,
        signed: true,
        description:
          "A powerful depiction of a modern divine feminine figure in a futuristic Indian setting.",
      },
    ],

    reviews: [
      {
        id: "rev-003",
        name: "Arjun",
        rating: 5,
        comment: "Creative and futuristic designs. Highly recommended!",
      },
    ],
  },
];