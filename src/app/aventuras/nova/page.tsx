import { redirect } from "next/navigation";

/** Endereço antigo: criar aventura agora fica no Salão do Mestre. */
export default function NovaAventuraAntigo() {
  redirect("/mestre/aventuras/nova");
}
