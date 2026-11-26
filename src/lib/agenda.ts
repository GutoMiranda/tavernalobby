/**
 * "Adicionar à agenda": link do Google Agenda e arquivo .ics (Apple, Outlook e outros) para a
 * aventura (dia inteiro, do início ao fim) e para o depósito mensal do plano do núcleo.
 * Datas em "aaaa-mm-dd" (fuso America/Sao_Paulo, sem hora).
 */

const compacta = (data: string) => data.replaceAll("-", "");

/** Dia seguinte ("aaaa-mm-dd"): o fim de evento de dia inteiro é exclusivo no Google e no .ics. */
export function diaSeguinte(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type EventoAgenda = {
  titulo: string;
  inicio: string;
  /** Último dia (inclusivo). */
  fim: string;
  descricao?: string;
  local?: string | null;
  /** Repetição mensal no dia do mês; `ate` = última data (inclusiva), ou null para sem fim. */
  mensal?: { ate: string | null } | null;
};

function regra(e: EventoAgenda): string | null {
  if (!e.mensal) return null;
  const dia = Number(e.inicio.slice(8, 10));
  return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dia}${e.mensal.ate ? `;UNTIL=${compacta(e.mensal.ate)}` : ""}`;
}

export function linkGoogleAgenda(e: EventoAgenda): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${compacta(e.inicio)}/${compacta(diaSeguinte(e.fim))}`,
    ctz: "America/Sao_Paulo",
  });
  if (e.descricao) p.set("details", e.descricao);
  if (e.local) p.set("location", e.local);
  const r = regra(e);
  if (r) p.set("recur", r);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Texto de .ics com escape de vírgula, ponto e vírgula, barra e quebra de linha. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function arquivoIcs(e: EventoAgenda & { uid: string; lembreteDiasAntes?: number }): string {
  const agora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taverna O Lobby//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${agora}`,
    `DTSTART;VALUE=DATE:${compacta(e.inicio)}`,
    `DTEND;VALUE=DATE:${compacta(diaSeguinte(e.fim))}`,
    `SUMMARY:${escapar(e.titulo)}`,
  ];
  if (e.descricao) linhas.push(`DESCRIPTION:${escapar(e.descricao)}`);
  if (e.local) linhas.push(`LOCATION:${escapar(e.local)}`);
  const r = regra(e);
  if (r) linhas.push(r);
  if (e.lembreteDiasAntes != null) {
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapar(e.titulo)}`,
      `TRIGGER:-P${e.lembreteDiasAntes}D`,
      "END:VALARM",
    );
  }
  linhas.push("END:VEVENT", "END:VCALENDAR");
  return linhas.join("\r\n") + "\r\n";
}

/**
 * Primeiro depósito do plano: o dia do mês combinado neste mês, ou no próximo se já passou.
 * O banco só aceita dias de 1 a 28, então o dia existe em todo mês.
 */
export function proximoDeposito(hoje: string, diaDoMes: number): string {
  const [a, m, d] = hoje.split("-").map(Number);
  const mes = d > diaDoMes ? m + 1 : m;
  const ano = a + Math.floor((mes - 1) / 12);
  const mesNorm = ((mes - 1) % 12) + 1;
  return `${ano}-${String(mesNorm).padStart(2, "0")}-${String(diaDoMes).padStart(2, "0")}`;
}
