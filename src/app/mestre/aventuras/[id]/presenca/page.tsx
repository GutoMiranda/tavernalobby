import type { Metadata } from "next";

import { TelaPresenca } from "@/app/aventuras/[id]/presenca/tela";
import { exigirPermissao } from "@/lib/auth";

export const metadata: Metadata = { title: "Presença" };

export default async function SalaoPresencaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPermissao("presenca", "ver");
  return <TelaPresenca id={id} gerenciar />;
}
