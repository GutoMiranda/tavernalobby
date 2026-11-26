/**
 * Converte um valor digitado em reais ("1.234,56", "1234,5", "R$ 300", "300.00") para centavos inteiros.
 * Retorna null se não for um valor válido.
 */
export function reaisParaCentavos(texto: string): number | null {
  let s = texto.replace(/R\$|\s/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ou "1.234.567": pontos de milhar sem centavos.
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [inteiro, decimal = ""] = s.split(".");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

/** Centavos para o texto de um campo de formulário ("1234,56"). */
export function centavosParaCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}
