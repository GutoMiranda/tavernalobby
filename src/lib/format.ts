/** Formatação no padrão do Brasil: R$ 1.234,56, dd/mm/aaaa, fuso America/Sao_Paulo. */

export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata um valor em centavos (inteiro) como "R$ 1.234,56". */
export function formatarCentavos(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new Error("Valores monetários devem ser inteiros em centavos.");
  }
  // Intl usa espaço não separável depois de "R$"; trocamos por espaço comum.
  return moeda.format(centavos / 100).replace(/ /g, " ");
}

const data = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formata uma data como "dd/mm/aaaa" no fuso de São Paulo. */
export function formatarData(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return data.format(d);
}
