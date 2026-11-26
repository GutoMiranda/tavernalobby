import type { Metadata } from "next";

import { TelaDatas } from "./tela";

export const metadata: Metadata = { title: "Datas" };

export default async function DatasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TelaDatas id={id} gerenciar={false} />;
}
