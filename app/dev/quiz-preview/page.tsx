import { notFound } from "next/navigation";
import { QuizPreviewClient } from "./ClientOnly";

// Dev-only gallery of every quiz phase with mock data (no Supabase needed),
// used for visual QA and screenshots. 404 in production builds.
export const dynamic = "force-dynamic";

export default async function QuizPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return <QuizPreviewClient view={view ?? "index"} />;
}
