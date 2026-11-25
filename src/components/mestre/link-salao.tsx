import { Crown } from "lucide-react";
import Link from "next/link";

/** Atalho discreto nas páginas comuns para quem pode gerenciar aquela área no Salão do Mestre. */
export function LinkSalao({ href, texto = "Gerenciar no Salão do Mestre" }: { href: string; texto?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 self-start rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-wood hover:bg-gold/20 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Crown className="size-4" aria-hidden /> {texto}
    </Link>
  );
}
