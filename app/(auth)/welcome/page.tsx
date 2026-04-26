import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WelcomeFlow from "@/components/WelcomeFlow";

export const metadata = { title: "Welcome — Klikr" };

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/dashboard");

  return <WelcomeFlow />;
}
