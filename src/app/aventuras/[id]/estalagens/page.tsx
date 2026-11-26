import type { Metadata } from "next";

import { TelaEstalagens } from "./tela";

export const metadata: Metadata = { title: "Estalagens" };

export default async function EstalagensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TelaEstalagens id={id} gerenciar={false} />;
}
