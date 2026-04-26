#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error(
    "Missing DATABASE_URL. Set it to the postgres connection string for your Supabase database (e.g. postgresql://postgres:<password>@<host>:5432/postgres) and re-run."
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
await client.connect();

await client.query(`
  create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );
`);

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
const { rows: applied } = await client.query("select name from _migrations");
const appliedSet = new Set(applied.map((r) => r.name));

let ran = 0;
for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`✓ ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  console.log(`→ applying ${file}`);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into _migrations(name) values($1)", [file]);
    await client.query("commit");
    console.log(`✓ ${file}`);
    ran++;
  } catch (e) {
    await client.query("rollback");
    console.error(`✗ ${file} failed:`, e.message);
    process.exit(1);
  }
}

console.log(`Done. ${ran} new migration(s) applied.`);
await client.end();
