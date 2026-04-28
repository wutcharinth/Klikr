import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // We can't execute raw SQL via REST, but we can execute a function if we create one.
  // Wait, if we can't create one, we can't execute raw SQL.
  // Let's just check if we can insert a dummy row into a dummy table? No.
  
  // Let's at least check the connection
  const { data, error } = await supabase.from("presentations").select("id").limit(1);

  return NextResponse.json({ success: true, data, error });
}
