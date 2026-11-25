import { redirect } from "next/navigation";

/** Endereço antigo: as permissões agora são por pessoa. */
export default function TagsAntigo() {
  redirect("/mestre/permissoes");
}
