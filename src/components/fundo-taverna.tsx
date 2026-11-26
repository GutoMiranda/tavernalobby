"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo vivo da taverna: brasas subindo devagar, como de uma lareira.
 * Leve: poucas partículas, para quando a aba fica oculta e não roda com "reduzir movimento".
 */
export function FundoTaverna() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let largura = 0;
    let altura = 0;
    type Brasa = { x: number; y: number; r: number; vy: number; fase: number; vida: number };
    let brasas: Brasa[] = [];

    const nova = (inicio = false): Brasa => ({
      x: Math.random() * largura,
      y: inicio ? Math.random() * altura : altura + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.15 + Math.random() * 0.45,
      fase: Math.random() * Math.PI * 2,
      vida: 0.4 + Math.random() * 0.6,
    });

    const medir = () => {
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const quantidade = largura < 640 ? 18 : 38;
      brasas = Array.from({ length: quantidade }, () => nova(true));
    };
    medir();
    window.addEventListener("resize", medir);

    let quadro = 0;
    let t = 0;
    const desenhar = () => {
      t += 1;
      ctx.clearRect(0, 0, largura, altura);
      for (const b of brasas) {
        b.y -= b.vy;
        b.x += Math.sin(t / 60 + b.fase) * 0.25;
        if (b.y < -10) Object.assign(b, nova());
        const brilho = b.vida * (0.55 + 0.45 * Math.sin(t / 25 + b.fase)) * Math.min(1, b.y / (altura * 0.6));
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 5);
        g.addColorStop(0, `rgba(255, 196, 110, ${0.9 * brilho})`);
        g.addColorStop(0.35, `rgba(242, 140, 50, ${0.35 * brilho})`);
        g.addColorStop(1, "rgba(242, 120, 40, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      quadro = requestAnimationFrame(desenhar);
    };
    const visibilidade = () => {
      cancelAnimationFrame(quadro);
      if (!document.hidden) quadro = requestAnimationFrame(desenhar);
    };
    document.addEventListener("visibilitychange", visibilidade);
    quadro = requestAnimationFrame(desenhar);

    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", medir);
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
