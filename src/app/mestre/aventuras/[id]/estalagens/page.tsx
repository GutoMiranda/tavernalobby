import type { Metadata } from "next";

import { TelaEstalagens } from "@/app/aventuras/[id]/estalagens/tela";
import { exigirPermissao } from "@/lib/auth";

export const metadata: Metadata = { title: "Estalagens" };

export default async function SalaoEstalagensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPermissao("estalagens", "ver");
  return <TelaEstalagens id={id} gerenciar />;
}
