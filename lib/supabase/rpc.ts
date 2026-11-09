// Helpers for calling the Postgres functions added in migration 0027.
//
// Code can ship before the migration runs (deploys don't apply migrations),
// so every caller falls back to the previous query path when the function
// doesn't exist yet. PostgREST reports a missing function as PGRST202 ("Could
// not find the function ... in the schema cache"); Postgres itself as 42883.

type MaybePgError = { code?: string | null; message?: string | null } | null | undefined;

export function isMissingRpc(error: MaybePgError): boolean {
  if (!error) return false;
  if (error.code === "PGRST202" || error.code === "42883") return true;
  return /could not find the function|function .* does not exist/i.test(error.message ?? "");
}
