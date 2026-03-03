"use client";

import { Suspense } from "react";
import ExploreClient from "./ExploreClient";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="text-white p-20">Loading...</div>}>
      <ExploreClient />
    </Suspense>
  );
}