import Link from "next/link";

/** Wordmark left; anything passed in (e.g. Sign out) sits on the right. */
export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex-none flex items-center gap-2.5 px-3.5 py-2 bg-bar border-b border-line">
      <Link href="/dashboard" className="text-accent font-bold text-[15px] tracking-[-.01em] no-underline">SponsorStory</Link>
      <div className="ml-auto">{children}</div>
    </header>
  );
}
