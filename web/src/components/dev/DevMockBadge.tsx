import { getDevMockSources } from "@/lib/mock/devFallback";

/**
 * Dev-only marker that this page is showing mock data. Render it after the
 * page's loaders have awaited (e.g. at the end of the async content component)
 * so the request-scoped sources are already recorded. Renders nothing in
 * production or when no mock was used.
 */
export async function DevMockBadge() {
  const sources = await getDevMockSources();
  if (sources.length === 0) {
    return null;
  }
  return (
    <div
      role="status"
      data-dev-mock={sources.join(",")}
      title={`Mock data: ${sources.join(", ")}. Add ?mock=off to clear forced mode.`}
      className="pointer-events-none fixed right-2 bottom-[calc(env(safe-area-inset-bottom,0px)+112px)] max-w-[70vw] z-[9999] rounded-md border border-amber-300/70 bg-amber-500/90 px-2 py-1 text-[10px] leading-tight font-extrabold tracking-wide text-black shadow-lg"
    >
      MOCK · {sources.join(", ")}
    </div>
  );
}
