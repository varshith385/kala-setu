"use client";

import { useState } from "react";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
}

export default function ReviewSection({
  initialReviews,
}: {
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newReview = {
      id: Date.now().toString(),
      name,
      rating,
      comment,
    };

    setReviews([newReview, ...reviews]);
    setName("");
    setRating(5);
    setComment("");
  };

  return (
    <div className="mb-16">
      <h2 className="text-2xl text-yellow-500 mb-8">
        Reviews
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mb-10 border border-yellow-600/20 p-6 rounded-lg"
      >
        <input
          id="review-author-name"
          name="authorName"
          type="text"
          placeholder="Your Name"
          aria-label="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 p-2 bg-black border border-yellow-600/30 rounded"
          required
        />

        <select
          id="review-rating-select"
          name="rating"
          aria-label="Rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full mb-4 p-2 bg-black border border-yellow-600/30 rounded"
        >
          {[5,4,3,2,1].map(n => (
            <option key={n} value={n}>{n} Stars</option>
          ))}
        </select>

        <textarea
          id="review-comment-text"
          name="comment"
          placeholder="Write your review..."
          aria-label="Write your review"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full mb-4 p-2 bg-black border border-yellow-600/30 rounded"
          required
        />

        <button
          type="submit"
          className="bg-yellow-500 text-black px-6 py-2 rounded-md"
        >
          Submit Review
        </button>
      </form>

      <div className="space-y-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="border border-yellow-600/20 p-4 rounded-lg"
          >
            <p className="text-yellow-500 mb-1">
              {review.name} • ⭐ {review.rating}
            </p>
            <p className="text-gray-400 text-sm">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}