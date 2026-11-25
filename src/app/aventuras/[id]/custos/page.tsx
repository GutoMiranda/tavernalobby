import type { Metadata } from "next";

import { TelaCustos } from "./tela";

export const metadata: Metadata = { title: "Custos" };

export default async function CustosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TelaCustos id={id} gerenciar={false} />;
}
