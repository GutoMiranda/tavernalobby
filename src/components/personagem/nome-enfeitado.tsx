import { type Papel, PAPEIS } from "@/lib/personagem";
import { cn } from "@/lib/utils";

const COR_NOME: Record<Papel, string> = {
  mestre: "titulo-marca",
  tesoureiro: "text-bottle",
  despensa: "text-[#e0a878]",
  membro: "text-parchment",
};

/**
 * Nome decorado: cor pela função (ouro gravado para o Mestre da Taverna), epíteto em itálico
 * e, se quiser, o título da função com a palavra comum ("Guardião do Baú · tesoureiro").
 */
export function NomeEnfeitado({
  nome,
  epiteto,
  papel = "membro",
  mostrarTitulo = false,
  className,
}: {
  nome: string;
  epiteto?: string | null;
  papel?: Papel;
  mostrarTitulo?: boolean;
  className?: string;
}) {
  const titulo = PAPEIS[papel];
  return (
    <span className={cn("inline-flex min-w-0 flex-col leading-tight", className)}>
      <span className="truncate">
        <span className={cn("font-display font-bold", COR_NOME[papel])}>{nome}</span>
        {epiteto && <span className="ml-1 text-[0.85em] text-muted-foreground italic">{epiteto}</span>}
      </span>
      {mostrarTitulo && titulo.titulo && (
        <span className="truncate text-xs text-gold/90">
          {titulo.titulo} <span className="text-muted-foreground">· {titulo.comum}</span>
        </span>
      )}
    </span>
  );
}
