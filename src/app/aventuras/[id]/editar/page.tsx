import { redirect } from "next/navigation";

/** Endereço antigo: editar a aventura agora fica no Salão do Mestre. */
export default async function EditarAntigo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/mestre/aventuras/${id}/aventura`);
}
