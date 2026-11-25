import type { Metadata } from "next";

import { TelaCustos } from "@/app/aventuras/[id]/custos/tela";
import { exigirPermissao } from "@/lib/auth";

export const metadata: Metadata = { title: "Custos" };

export default async function SalaoCustosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPermissao("custos", "ver");
  return <TelaCustos id={id} gerenciar />;
}
