"use client";

export default function AddToCartButton({ artwork }: { artwork: any }) {

  const addToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem("cart") || "[]");

    existingCart.push({
      id: artwork.id,
      title: artwork.title,
      price: artwork.price,
      image: artwork.image,
    });

    localStorage.setItem("cart", JSON.stringify(existingCart));

    alert("Added to cart!");
  };

  return (
    <button
      onClick={addToCart}
      className="border border-yellow-500 text-yellow-500 px-8 py-3 rounded-md hover:bg-yellow-500 hover:text-black transition"
    >
      Add to Cart
    </button>
  );
}