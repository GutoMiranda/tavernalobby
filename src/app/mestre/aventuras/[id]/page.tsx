import { notFound, redirect } from "next/navigation";

import { exigirSalao } from "@/lib/auth";

import { primeiraAreaDaAventura } from "../../areas";

export default async function SalaoAventuraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permissoes } = await exigirSalao();
  const area = primeiraAreaDaAventura(permissoes);
  if (!area) notFound();
  redirect(`/mestre/aventuras/${id}/${area}`);
}
