"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IconeCoroa } from "@/components/icones";
import { ehDepositoNovo, type LinhaDoBau, metaAlcancadaAgora } from "@/lib/finance/tesouro";
import { formatarCentavos } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Props = {
  fundoId: string;
  /** Ids das entradas já confirmadas quando a página foi montada (não explodem de novo). */
  confirmados: string[];
  progresso: number;
  nomesNucleo: Record<string, string>;
  /** Volta do Pix automático com sucesso (?pix=ok): comemora ao abrir. */
  celebrarAoAbrir?: boolean;
};

type Aviso = { id: number; texto: string; meta?: boolean };

/**
 * Efeitos vivos do baú (fase 2): quando um depósito é confirmado (Pix automático ou Tesoureiro),
 * todo mundo com o baú aberto vê uma explosão de moedas saindo da pilha e um aviso.
 * Ao bater a meta, chuva de ouro maior e o selo "Meta alcançada".
 */
export function TesouroVivo({ fundoId, confirmados, progresso, nomesNucleo, celebrarAoAbrir }: Props) {
  const conhecidos = useRef(new Set(confirmados));
  const progressoAnterior = useRef(progresso);
  const nomes = useRef(nomesNucleo);
  nomes.current = nomesNucleo;
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const avisar = useCallback((texto: string, meta = false) => {
    setAviso({ id: Date.now(), texto, meta });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.meta ? 7000 : 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Depósitos confirmados ao vivo.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`bau-efeitos-${fundoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fund_transactions", filter: `fund_id=eq.${fundoId}` },
        (payload) => {
          const linha = payload.new as Partial<LinhaDoBau & { household_id: string | null }>;
          if (!ehDepositoNovo(linha, conhecidos.current)) return;
          conhecidos.current.add(linha.id!);
          const quem = linha.household_id ? nomes.current[linha.household_id] : null;
          explodirMoedas(70);
          avisar(`Loot no baú! ${formatarCentavos(linha.amount_cents ?? 0)}${quem ? ` de ${quem}` : ""}`);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [fundoId, avisar]);

  // Meta: comemora quando cruza 100% e, uma vez por pessoa, na primeira visita com a meta batida.
  useEffect(() => {
    const antes = progressoAnterior.current;
    progressoAnterior.current = progresso;
    let primeiraVez = false;
    if (progresso >= 100) {
      try {
        const chave = `taverna-meta-${fundoId}`;
        if (!localStorage.getItem(chave)) {
          localStorage.setItem(chave, "1");
          primeiraVez = true;
        }
      } catch {
        // Sem armazenamento (aba anônima, bloqueado): só comemora quando cruzar a meta ao vivo.
      }
    }
    if (metaAlcancadaAgora(antes, progresso) || primeiraVez) {
      const t = setTimeout(() => {
        explodirMoedas(160, true);
        avisar("Meta alcançada! O baú está cheio para a aventura.", true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [progresso, fundoId, avisar]);

  useEffect(() => {
    if (!celebrarAoAbrir) return;
    const t = setTimeout(() => explodirMoedas(70), 500);
    return () => clearTimeout(t);
  }, [celebrarAoAbrir]);

  if (!aviso) return null;
  return (
    <div
      key={aviso.id}
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border-2 px-5 py-3 font-display text-lg shadow-[0_10px_40px_-10px_rgb(0_0_0/0.9)] ${
        aviso.meta ? "selo-meta border-gold bg-[#2a1f17] text-wood" : "border-gold/70 bg-[#231a13] text-parchment"
      }`}
    >
      {aviso.meta ? <IconeCoroa className="size-8 shrink-0 text-gold" /> : <span aria-hidden>🪙</span>}
      {aviso.texto}
    </div>
  );
}

/**
 * Explosão de moedas num canvas por cima da página, saindo da pilha de ouro (ou do meio da tela).
 * Não roda com "reduzir movimento". O canvas some sozinho no fim.
 */
export function explodirMoedas(quantidade: number, chuva = false) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "60", pointerEvents: "none" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pilha = document.querySelector("[data-pilha]")?.getBoundingClientRect();
  const visivel = pilha && pilha.bottom > 0 && pilha.top < h;
  const ox = visivel ? pilha.left + pilha.width / 2 : w / 2;
  const oy = visivel ? pilha.top + pilha.height * 0.7 : h * 0.6;

  type Moeda = { x: number; y: number; vx: number; vy: number; r: number; giro: number; vg: number; atraso: number };
  const moedas: Moeda[] = Array.from({ length: quantidade }, (_, i) => {
    if (chuva && i % 2 === 0) {
      // Metade cai do topo como chuva de ouro.
      return {
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.5,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 3,
        r: 6 + Math.random() * 6,
        giro: Math.random() * Math.PI,
        vg: 0.1 + Math.random() * 0.2,
        atraso: Math.random() * 40,
      };
    }
    const angulo = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const vel = 7 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angulo) * vel,
      vy: Math.sin(angulo) * vel,
      r: 6 + Math.random() * 6,
      giro: Math.random() * Math.PI,
      vg: 0.12 + Math.random() * 0.25,
      atraso: Math.random() * 12,
    };
  });

  const inicio = performance.now();
  const duracao = chuva ? 4200 : 2600;
  let quadro = 0;
  const passo = (agora: number) => {
    const t = agora - inicio;
    quadro++;
    ctx.clearRect(0, 0, w, h);
    const alpha = t > duracao - 600 ? Math.max(0, (duracao - t) / 600) : 1;
    for (const m of moedas) {
      if (quadro < m.atraso) continue;
      m.vy += 0.35;
      m.vx *= 0.99;
      m.x += m.vx;
      m.y += m.vy;
      m.giro += m.vg;
      const larg = Math.abs(Math.cos(m.giro)) * m.r + 1;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, larg, m.r, 0, 0, Math.PI * 2);
      ctx.fillStyle = Math.cos(m.giro) > 0 ? "#f2c15a" : "#d99530";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#8a5b20";
      ctx.stroke();
      if (larg > m.r * 0.5) {
        ctx.beginPath();
        ctx.ellipse(m.x - larg * 0.25, m.y - m.r * 0.3, larg * 0.3, m.r * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,241,199,0.8)";
        ctx.fill();
      }
    }
    if (t < duracao) requestAnimationFrame(passo);
    else canvas.remove();
  };
  requestAnimationFrame(passo);
}
