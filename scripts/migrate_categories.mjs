import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching Classroom templates...");
  const { data: templates, error: fetchErr } = await supabase
    .from("templates")
    .select("id, title, tags")
    .eq("category", "Classroom");

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    process.exit(1);
  }

  let updated = 0;
  for (const t of templates) {
    if (t.tags && (t.tags.includes("quiz") || t.tags.includes("kahoot"))) {
      console.log(`Updating "${t.title}" -> Quiz`);
      const { error: upErr } = await supabase
        .from("templates")
        .update({ category: "Quiz" })
        .eq("id", t.id);
      
      if (upErr) {
        console.error("Update error for", t.name, upErr);
      } else {
        updated++;
      }
    }
  }

  console.log(`Successfully updated ${updated} templates.`);
}

run();
