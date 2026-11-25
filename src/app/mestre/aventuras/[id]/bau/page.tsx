import type { Metadata } from "next";

import { TelaBau } from "@/app/aventuras/[id]/bau/tela";
import { exigirPermissao } from "@/lib/auth";

export const metadata: Metadata = { title: "Baú" };

export default async function SalaoBauPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPermissao("bau", "ver");
  return <TelaBau id={id} gerenciar />;
}
