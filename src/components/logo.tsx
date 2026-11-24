import Image from "next/image";

import { cn } from "@/lib/utils";

/** Logo da Taverna O Lobby: caneca de taverna com um dado d20 (public/icons/logo.svg). */
export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/icons/logo.svg"
      alt="Taverna O Lobby"
      width={size}
      height={size}
      unoptimized
      priority
      className={cn("shrink-0", className)}
    />
  );
}
