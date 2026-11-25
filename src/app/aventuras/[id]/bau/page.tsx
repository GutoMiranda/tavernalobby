import type { Metadata } from "next";

import { TelaBau } from "./tela";

export const metadata: Metadata = { title: "Baú" };

export default async function BauPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pix?: string }>;
}) {
  const { id } = await params;
  const { pix } = await searchParams;
  return <TelaBau id={id} gerenciar={false} retornoPix={pix} />;
}
