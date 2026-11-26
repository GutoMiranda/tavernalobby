"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { revalidarAventura } from "@/lib/revalidar";
import { exigirAdmin, exigirMembro } from "@/lib/auth";
import { reaisParaCentavos } from "@/lib/dinheiro";
import { enviarEmail } from "@/lib/email";
import { type EstadoAcao, mensagemErro } from "@/lib/erros";
import { urlDoAviso } from "@/lib/finance/infinitepay";
import { hojeEmSaoPaulo } from "@/lib/format";
import { criarLink, handleInfinitePay } from "@/lib/infinitepay";

const UUID = /^[0-9a-f-]{36}$/i;

function txt(d: FormData, campo: string, max = 200) {
  return String(d.get(campo) ?? "")
    .trim()
    .slice(0, max);
}

function dataValida(d: FormData, campo: string): string | null {
  const v = txt(d, campo, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v > hojeEmSaoPaulo() ? null : v;
}

function atualizar(eventId: string) {
  revalidarAventura(eventId);
}

/** Comprovante: só aceita arquivo enviado pela própria pessoa (pasta = id do usuário). */
function caminhoComprovante(d: FormData, userId: string): string | null | false {
  const c = txt(d, "comprovante", 300);
  if (!c) return null;
  if (!c.startsWith(`${userId}/`) || c.includes("..")) return false;
  return c;
}

// ---------------------------------------------------------------- configuração (admin)

export async function abrirBau(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const { error } = await supabase.from("funds").insert({ event_id: eventId, created_by: pessoa.id });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Baú aberto." };
}

export async function salvarMeta(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const texto = txt(d, "meta", 20);
  const meta = texto ? reaisParaCentavos(texto) : null;
  if (texto && meta == null) return { erro: "Informe a meta em reais (ex.: 5.000,00) ou deixe vazio." };
  const { error } = await supabase
    .from("funds")
    .update({ goal_cents: meta, updated_by: pessoa.id })
    .eq("id", txt(d, "fundo", 40));
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: meta == null ? "Meta igual à soma dos custos." : "Meta salva." };
}

/** Banco, titular e chave Pix. Na troca: histórico, aviso de 7 dias, notificação (no banco) e e-mail a todos. */
export async function salvarDadosPix(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const eventId = txt(d, "evento", 40);
  const fundId = txt(d, "fundo", 40);
  const banco = txt(d, "banco", 80) || null;
  const titular = txt(d, "titular", 80) || null;
  const chave = txt(d, "chave", 120) || null;
  if (!chave) return { erro: "Informe a chave Pix." };

  const { data: antes } = await supabase
    .from("funds")
    .select("bank, holder, pix_key")
    .eq("id", fundId)
    .maybeSingle<{ bank: string | null; holder: string | null; pix_key: string | null }>();
  const { error } = await supabase.rpc("update_fund_banking", {
    p_fund_id: fundId,
    p_bank: banco,
    p_holder: titular,
    p_pix_key: chave,
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);

  const eraTroca =
    !!antes &&
    (antes.bank || antes.holder || antes.pix_key) &&
    (antes.bank !== banco || antes.holder !== titular || antes.pix_key !== chave);
  if (!eraTroca) return { ok: "Dados do baú salvos." };

  const { data: membros } = await supabase
    .from("people")
    .select("email")
    .eq("status", "approved")
    .not("email", "is", null)
    .returns<{ email: string }[]>();
  const { data: ev } = await supabase.from("events").select("name").eq("id", eventId).maybeSingle();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const enviado = await enviarEmail(
    (membros ?? []).map((m) => m.email),
    "Atenção: os dados do baú foram alterados",
    [
      `Os dados de pagamento do baú da aventura "${ev?.name ?? ""}" foram alterados pelo Mestre da Taverna.`,
      "",
      `Banco: ${banco ?? "-"}`,
      `Titular: ${titular ?? "-"}`,
      `Chave Pix: ${chave}`,
      "",
      "Confira no site antes de depositar. Se você não esperava essa troca, fale com o grupo.",
      `${site}/aventuras/${eventId}/bau`,
    ].join("\n"),
  );
  return {
    ok: enviado
      ? "Dados trocados. Todos foram avisados no site e por e-mail."
      : "Dados trocados. Todos foram avisados no site (o e-mail não foi enviado: configure o Gmail no .env.local).",
  };
}

// ---------------------------------------------------------------- depósitos

export async function registrarDeposito(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa, user } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const valor = reaisParaCentavos(txt(d, "valor", 20));
  const data = dataValida(d, "data");
  const comprovante = caminhoComprovante(d, user.id);
  if (!valor) return { erro: "Informe o valor em reais (ex.: 150,00)." };
  if (!data) return { erro: "Informe a data do depósito (hoje ou antes)." };
  if (comprovante === false) return { erro: "Comprovante inválido. Envie o arquivo de novo." };
  const { error } = await supabase.from("fund_transactions").insert({
    fund_id: txt(d, "fundo", 40),
    kind: "entrada",
    household_id: pessoa.household_id,
    amount_cents: valor,
    occurred_on: data,
    description: txt(d, "descricao", 200) || null,
    receipt_path: comprovante,
    created_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(eventId);
  return { ok: "Depósito registrado. Aguarde o Guardião do Baú (Tesoureiro) confirmar." };
}

/**
 * Pix com confirmação automática: cria a cobrança na InfinitePay e leva a pessoa ao pagamento.
 * O crédito no baú acontece quando a InfinitePay avisa ou quando a pessoa volta do pagamento,
 * sempre depois de conferir na API (src/lib/infinitepay.ts).
 */
export async function pagarComInfinitePay(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const handle = handleInfinitePay();
  if (!handle) return { erro: "O Pix automático ainda não foi configurado pelo Mestre da Taverna." };
  const eventId = txt(d, "evento", 40);
  const fundId = txt(d, "fundo", 40);
  const valor = reaisParaCentavos(txt(d, "valor", 20));
  if (!UUID.test(eventId) || !UUID.test(fundId)) return { erro: "Baú inválido." };
  if (!valor || valor < 100) return { erro: "Informe o valor em reais, a partir de R$ 1,00." };
  if (valor > 5_000_000) return { erro: "Valor muito alto para um depósito só." };

  const { data: evento } = await supabase.from("events").select("name").eq("id", eventId).maybeSingle();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pedido = randomUUID();
  let url: string;
  try {
    url = await criarLink({
      handle,
      pedido,
      valorCentavos: valor,
      descricao: `Baú: ${evento?.name ?? "aventura"}`.slice(0, 100),
      retorno: new URL("/api/infinitepay/retorno", site).toString(),
      aviso: urlDoAviso(site),
      // Nome e e-mail já preenchidos na página da InfinitePay (encurta o cadastro deles).
      cliente: { name: pessoa.name, ...(pessoa.email ? { email: pessoa.email } : {}) },
    });
  } catch {
    return { erro: 'Não foi possível falar com a InfinitePay agora. Tente de novo ou use "Paguei por fora".' };
  }
  const { error } = await supabase.from("pix_checkouts").insert({
    id: pedido,
    fund_id: fundId,
    household_id: pessoa.household_id,
    amount_cents: valor,
    checkout_url: url,
    created_by: pessoa.id,
  });
  if (error) return { erro: mensagemErro(error) };
  redirect(url);
}

/** Tesoureiro/admin confirma uma cobrança da InfinitePay depois de ver o pagamento no app. */
export async function confirmarCobrancaManual(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase.rpc("confirm_pix_checkout_manual", { p_checkout_id: txt(d, "id", 40) });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Confirmado. Loot guardado!" };
}

/** Tesoureiro/admin cancela uma cobrança da InfinitePay que não foi paga (fica no histórico). */
export async function cancelarCobranca(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase.rpc("cancel_pix_checkout", { p_checkout_id: txt(d, "id", 40) });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Cobrança cancelada." };
}

export async function confirmarDeposito(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase.rpc("confirm_deposit", { p_transaction_id: txt(d, "id", 40) });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Confirmado. Loot guardado!" };
}

export async function recusarDeposito(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase.rpc("refuse_deposit", {
    p_transaction_id: txt(d, "id", 40),
    p_note: txt(d, "motivo", 300),
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Depósito recusado." };
}

// ---------------------------------------------------------------- saídas e estornos

export async function registrarSaida(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, user } = await exigirMembro();
  const valor = reaisParaCentavos(txt(d, "valor", 20));
  const data = dataValida(d, "data");
  const comprovante = caminhoComprovante(d, user.id);
  if (!valor) return { erro: "Informe o valor em reais." };
  if (!data) return { erro: "Informe a data (hoje ou antes)." };
  if (comprovante === false) return { erro: "Comprovante inválido. Envie o arquivo de novo." };
  const { error } = await supabase.rpc("register_withdrawal", {
    p_fund_id: txt(d, "fundo", 40),
    p_amount_cents: valor,
    p_occurred_on: data,
    p_description: txt(d, "descricao", 200),
    p_receipt_path: comprovante,
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Saída registrada." };
}

export async function estornarLancamento(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirMembro();
  const { error } = await supabase.rpc("reverse_transaction", {
    p_transaction_id: txt(d, "id", 40),
    p_reason: txt(d, "motivo", 300),
  });
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Estorno registrado." };
}

// ---------------------------------------------------------------- plano de depósitos

export async function salvarPlano(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const eventId = txt(d, "evento", 40);
  const fundId = txt(d, "fundo", 40);
  const valor = reaisParaCentavos(txt(d, "valor", 20));
  const dia = Number(txt(d, "dia", 2));
  if (!UUID.test(fundId)) return { erro: "Baú não encontrado." };
  if (!valor) return { erro: "Informe o valor mensal em reais." };
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) return { erro: "Escolha um dia entre 1 e 28." };
  const valores = {
    amount_cents: valor,
    day_of_month: dia,
    updated_by: pessoa.id,
    updated_at: new Date().toISOString(),
  };
  const { error, count } = await supabase
    .from("deposit_plans")
    .update(valores, { count: "exact" })
    .eq("fund_id", fundId)
    .eq("household_id", pessoa.household_id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) {
    const { error: e2 } = await supabase.from("deposit_plans").insert({
      fund_id: fundId,
      household_id: pessoa.household_id,
      amount_cents: valor,
      day_of_month: dia,
      updated_by: pessoa.id,
    });
    if (e2) return { erro: mensagemErro(e2) };
  }
  atualizar(eventId);
  return { ok: "Plano salvo. O site vai lembrar seu núcleo todo mês." };
}

export async function removerPlano(_: EstadoAcao, d: FormData): Promise<EstadoAcao> {
  const { supabase, pessoa } = await exigirMembro();
  const { error } = await supabase
    .from("deposit_plans")
    .delete()
    .eq("fund_id", txt(d, "fundo", 40))
    .eq("household_id", pessoa.household_id);
  if (error) return { erro: mensagemErro(error) };
  atualizar(txt(d, "evento", 40));
  return { ok: "Plano removido." };
}
