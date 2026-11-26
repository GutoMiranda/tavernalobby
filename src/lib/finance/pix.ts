/**
 * Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central), gerado a partir da chave.
 * Só cria o texto/QR para pagamento; o site não movimenta dinheiro.
 */

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Remove acentos e caracteres fora do padrão, em maiúsculas, com limite de tamanho. */
export function textoPix(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no fim do BR Code. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chave sem espaços; e-mail em minúsculas. */
export function normalizarChave(chave: string): string {
  const c = chave.trim().replace(/\s+/g, "");
  return c.includes("@") ? c.toLowerCase() : c;
}

export function pixCopiaECola(params: {
  chave: string;
  nome: string;
  cidade?: string;
  valorCentavos?: number;
}): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", normalizarChave(params.chave));
  const valor =
    params.valorCentavos && params.valorCentavos > 0 ? campo("54", (params.valorCentavos / 100).toFixed(2)) : "";
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    valor +
    campo("58", "BR") +
    campo("59", textoPix(params.nome, 25) || "TAVERNA") +
    campo("60", textoPix(params.cidade ?? "BRASIL", 15) || "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return semCrc + crc16(semCrc);
}
