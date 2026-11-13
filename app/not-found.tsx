/** Shown for unknown URLs and for sponsor pages that aren't published (or no longer exist). */
export default function NotFound() {
  return (
    <div className="page max-w-[440px] mx-auto text-center">
      <div className="font-bold text-[22px] tracking-[-.01em] mb-6">SponsorStory</div>
      <h1 className="h1">This page isn&apos;t here</h1>
      <p className="text-muted">The link may be mistyped, or this sponsor page hasn&apos;t been published yet.</p>
    </div>
  );
}
