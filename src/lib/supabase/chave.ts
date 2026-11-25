/** Confere, sem expor a chave, se ela é a secreta (service_role) e não a pública (anon). */
export function chaveSecretaValida(chave: string): boolean {
  if (chave.startsWith("sb_secret_")) return true;
  if (chave.startsWith("sb_publishable_")) return false;
  try {
    const payload = JSON.parse(Buffer.from(chave.split(".")[1] ?? "", "base64url").toString("utf8")) as {
      role?: string;
    };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}
