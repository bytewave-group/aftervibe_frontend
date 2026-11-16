export function StubPage({ title }: { title: string }) {
  return (
    <main className="px-6 pt-16 text-white">
      <h1 className="text-[20px] font-bold">{title}</h1>
      <p className="mt-3 text-[14px] leading-snug text-white/70">
        This page is not in the static prototype yet.
      </p>
    </main>
  );
}
