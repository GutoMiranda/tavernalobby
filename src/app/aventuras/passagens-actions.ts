"use server";

import { exigirMembro } from "@/lib/auth";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { linkSeguro } from "@/lib/passagens";
import { revalidarAventura } from "@/lib/revalidar";

const UUID = /^[0-9a-f-]{36}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function txt(d: FormData, campo: string, max = 200) {
  return String(d.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

/** Registra um preço de passagem encontrado (por pessoa) para o núcleo de quem está logado. */
export async function registrarPrecoPassagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const modo = txt(d, "modo", 10);
  const preco = reaisParaCentavos(txt(d, "preco", 20));
  const linkTexto = txt(d, "link", 500);
  const link = linkSeguro(linkTexto);
  const ida = txt(d, "ida", 10);
  const volta = txt(d, "volta", 10);
  if (!UUID.test(eventId)) return { erro: "Aventura inválida." };
  if (modo !== "onibus" && modo !== "aviao") return { erro: "Escolha ônibus ou avião." };
  if (!txt(d, "de", 120) || !txt(d, "para", 120)) return { erro: "Informe de onde e para onde." };
  if (!preco) return { erro: "Informe o preço por pessoa em reais." };
  if (linkTexto && !link) return { erro: "O link precisa começar com https://" };
  if (ida && volta && DATA.test(ida) && DATA.test(volta) && volta < ida)
    return { erro: "A volta não pode ser antes da ida." };
  const { error } = await supabase.from("ticket_prices").insert({
    event_id: eventId,
    household_id: pessoa.household_id,
    mode: modo,
    origin: txt(d, "de", 120),
    destination: txt(d, "para", 120),
    travel_date: DATA.test(ida) ? ida : null,
    return_date: DATA.test(volta) ? volta : null,
    price_cents: preco,
    link,
    notes: txt(d, "obs", 300) || null,
    created_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  revalidarAventura(eventId);
  return { ok: "Preço registrado. Valeu pela pesquisa!" };
}

export async function removerPrecoPassagem(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { data, error } = await supabase
    .from("ticket_prices")
    .delete()
    .eq("id", txt(d, "id", 40))
    .select("id");
  if (error) return { erro: mensagemErro(error) };
  if (!data?.length) return { erro: "Só quem registrou remove este preço." };
  revalidarAventura(txt(d, "evento", 40));
  return { ok: "Preço removido." };
}
