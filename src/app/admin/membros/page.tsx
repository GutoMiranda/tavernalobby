import { redirect } from "next/navigation";

/** Endereço antigo: os membros agora ficam no Salão do Mestre. */
export default function MembrosAntigo() {
  redirect("/mestre/membros");
}
