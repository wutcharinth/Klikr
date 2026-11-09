"use client";

import dynamic from "next/dynamic";

// Mock timestamps are generated at render time, so render the gallery on the
// client only (no SSR) to keep the preview free of hydration noise.
export const QuizPreviewClient = dynamic(() => import("./QuizPreview").then((m) => m.QuizPreview), {
  ssr: false,
});
