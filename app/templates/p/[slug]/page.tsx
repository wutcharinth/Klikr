import { redirect } from "next/navigation";

type Params = Promise<{ slug: string }>;

export default async function MentimeterCompatRedirect({ params }: { params: Params }) {
  const { slug } = await params;
  redirect(`/templates/${slug}`);
}
