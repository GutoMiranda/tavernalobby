import { isIP } from "node:net";

/** true se o IP é privado, local ou reservado (não pode ser buscado pelo servidor). */
export function ipPrivado(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    const s = ip.toLowerCase();
    if (s.startsWith("::ffff:")) return ipPrivado(s.slice(7));
    return (
      s === "::" ||
      s === "::1" ||
      s.startsWith("fc") ||
      s.startsWith("fd") ||
      s.startsWith("fe80") ||
      s.startsWith("ff")
    );
  }
  return true;
}
