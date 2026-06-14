# Supabase region migration runbook

When to run this: only if `vercel.json` regions + Tokyo Supabase isn't enough — i.e. your audience is concentrated outside Asia and Tokyo Supabase is the only remaining bottleneck. Otherwise the cheaper fix in `vercel.json` (Vercel functions in `hnd1`) gets you most of the win without the data migration.

This runbook moves the project from `mmucypuxjczogilhkhqb` (Tokyo) to a new project in your target region. Plan for ~30 minutes of downtime depending on data size.

---

## Pre-flight

- [ ] Decide target region. For users in US/EU, `us-east-1` (`iad`) or `eu-west-1` is typical.
- [ ] Pick a quiet maintenance window. Existing JWTs become invalid at cutover (different project = different signing key) — every signed-in host must re-login. Audience participants get re-issued tokens implicitly via the new `joinSession` call, so they don't notice.
- [ ] Decide whether to keep the old project running for a week as a fallback (recommended).
- [ ] Take a fresh `pg_dump` even before you start, regardless of any other backups.

---

## Step 1 — Create the new project

1. https://supabase.com/dashboard/projects → **New project**
2. Same org as the current project. Name it `Klikr (region)` or similar.
3. Pick the target region.
4. Set a strong DB password — you'll need the connection string from this in step 3.
5. Wait for provisioning to complete.

## Step 2 — Apply schema + seed data via the existing migration runner

The repo's `npm run migrate` is idempotent (tracks applied files in a `_migrations` table) so it works as the schema source-of-truth.

```bash
cd /Users/oui/Klikr
DATABASE_URL="postgresql://postgres:<NEW-PASSWORD>@<NEW-HOST>:5432/postgres" npm run migrate
```

Verify all 25 migrations show as applied:

```bash
psql "<NEW-CONNECTION-STRING>" -c "select count(*), max(created_at) from _migrations;"
```

Should report `25` rows.

## Step 3 — Copy data from old → new

`pg_dump` the data tables. Skip schema — it's already there from migrations.

```bash
OLD="postgresql://postgres:<OLD-PASSWORD>@db.mmucypuxjczogilhkhqb.supabase.co:5432/postgres"
NEW="postgresql://postgres:<NEW-PASSWORD>@<NEW-HOST>:5432/postgres"

pg_dump --data-only --no-owner --no-privileges \
  --table=public.profiles \
  --table=public.presentations \
  --table=public.slides \
  --table=public.participants \
  --table=public.responses \
  --table=public.question_votes \
  --table=public.reactions \
  --table=public.quiz_slide_scores \
  --table=public.presentation_editors \
  --table=public.api_keys \
  --table=public.ai_credits \
  --table=public.ai_usage \
  --table=public.slide_ai_summaries \
  --table=public.app_feedback \
  --table=public.page_views \
  --table=public.templates \
  --table=public.template_slides \
  "$OLD" > klikr-data.sql

psql "$NEW" < klikr-data.sql
```

Add any tables introduced by future migrations to that `--table=` list before running.

## Step 4 — Migrate auth users

Auth users live in `auth.users` (and `auth.identities` for OAuth). Supabase doesn't expose a clean migration command, but `pg_dump` of the auth schema works if you preserve column order.

```bash
pg_dump --data-only --no-owner --no-privileges \
  --table=auth.users \
  --table=auth.identities \
  "$OLD" > klikr-auth.sql

# Disable triggers during the import so you don't double-fire them.
psql "$NEW" -c "alter table auth.users disable trigger all; alter table auth.identities disable trigger all;"
psql "$NEW" < klikr-auth.sql
psql "$NEW" -c "alter table auth.users enable trigger all; alter table auth.identities enable trigger all;"
```

If you hit conflicts on `auth.users.email`, the user already exists on the new project — drop those rows first or use `INSERT ON CONFLICT DO NOTHING`.

After this, every host's existing JWT is invalid (the new project signs with a different secret). They will need to re-login. The OAuth identity rows make Google sign-in work without re-consenting.

## Step 5 — Reconfigure Auth provider on the new project

You did this once already on the old project; redo on the new one:

1. **Auth → Providers → Google** → enable
2. Paste the same Client ID + Secret from your existing Google Cloud OAuth client
3. Copy the **new** project's Callback URL — it'll be different (`https://<new-ref>.supabase.co/auth/v1/callback`)
4. Add this new callback URL to **Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs** (don't remove the old one yet — keep it until cutover is done)
5. **Auth → URL Configuration**:
   - Site URL: `https://klikrapp.com`
   - Redirect URLs: `https://klikrapp.com/auth/callback`, `http://localhost:3000/auth/callback`, `https://*.vercel.app/auth/callback`
6. Verify with `curl -s -H "Authorization: Bearer <PAT>" "https://api.supabase.com/v1/projects/<NEW-REF>/config/auth"`

## Step 6 — Replicate the realtime publication

The `0001_init.sql` migration adds key tables to `supabase_realtime`. The new project should already have this from running migrations, but verify:

```bash
psql "$NEW" -c "select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;"
```

Expect: `presentations`, `slides`, `participants`, `responses`, `question_votes`, `reactions`. If anything's missing, add via `alter publication supabase_realtime add table <name>;`.

## Step 7 — Update environment variables

In **Vercel → Project → Settings → Environment Variables**, update:

- `NEXT_PUBLIC_SUPABASE_URL` → `https://<new-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → from new project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` → from new project Settings → API

Apply to Production, Preview, and Development env scopes.

In your local `.env.local`, do the same.

## Step 8 — Cutover

1. **Pause writes on the old project**: in Vercel, change `NEXT_PUBLIC_SUPABASE_URL` to a clearly-broken value briefly (or take the deployment offline). This is to avoid new writes landing on the old DB while you copy.
2. Re-run step 3 (data) and step 4 (auth) one more time so any rows that landed during your earlier dump get picked up.
3. Switch Vercel env vars back to the new project (step 7) and redeploy.
4. Hard-reload `https://klikrapp.com` in an incognito window. Sign in. Run a smoke test (start a session, join from your phone, advance a slide).

## Step 9 — Wait, then decommission

Keep the old project running and read-only for **at least 7 days** in case you need to roll back or recover any missed row. After that:

1. Final dump: `pg_dump --no-owner --no-privileges "$OLD" > klikr-old-final.sql.gz` and store somewhere safe.
2. **Auth → URL Configuration** on the OLD project: clear Redirect URLs so it can't accept logins.
3. Remove the **old** callback URL from Google Cloud Console → OAuth client.
4. Pause or delete the old Supabase project.

---

## Rollback

If anything is on fire after cutover:

1. In Vercel, revert the env vars (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key) to the old project.
2. Redeploy.
3. The old project still has all data because we didn't truncate it.
4. You'll need to manually replay any writes that landed on the new project after cutover. There's no automated way — best to keep the cutover window short and quiet so this is rare.

The non-destructive flow above (don't truncate the old project, keep both running for a week) is what makes rollback workable. Don't skip that step.
