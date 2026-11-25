import type { Metadata } from "next";

import { TelaPresenca } from "./tela";

export const metadata: Metadata = { title: "Presença" };

export default async function PresencaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TelaPresenca id={id} gerenciar={false} />;
}
