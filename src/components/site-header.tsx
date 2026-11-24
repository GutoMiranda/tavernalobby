import Link from "next/link";

import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="bg-madeira sticky top-0 z-40 border-b-2 border-gold/70 pt-[env(safe-area-inset-top)] text-parchment shadow-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          <Logo size={36} />
          <span className="font-display text-lg leading-none font-bold tracking-wide text-gold">
            Taverna O Lobby
          </span>
        </Link>
      </div>
    </header>
  );
}
