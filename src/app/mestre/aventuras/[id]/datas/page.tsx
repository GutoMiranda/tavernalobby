import type { Metadata } from "next";

import { TelaDatas } from "@/app/aventuras/[id]/datas/tela";
import { exigirPermissao } from "@/lib/auth";

export const metadata: Metadata = { title: "Datas" };

export default async function SalaoDatasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPermissao("datas", "ver");
  return <TelaDatas id={id} gerenciar />;
}
