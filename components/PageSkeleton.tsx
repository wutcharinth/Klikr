// Shown by route-level loading.tsx files so navigation paints immediately
// while the server fetches data, instead of the old page sitting frozen.
export function PageSkeleton({
  variant = "list",
  label = "Loading",
}: {
  variant?: "list" | "editor" | "stage";
  label?: string;
}) {
  return (
    <main
      className={variant === "stage" ? "flex h-screen flex-col px-4 py-3 lg:px-8 lg:py-4" : "mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12"}
      aria-busy="true"
    >
      <span className="sr-only" role="status">{label}…</span>
      {variant === "stage" ? (
        <div className="skeleton mt-8 flex-1 rounded-2xl" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="skeleton h-8 w-28 rounded-lg" />
            <div className="skeleton h-9 w-36 rounded-full" />
          </div>
          <div className="skeleton mt-10 h-7 w-56 rounded-lg" />
          {variant === "editor" ? (
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
              <div className="space-y-5">
                {Array.from({ length: 2 }, (_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          )}
        </>
      )}
    </main>
  );
}
