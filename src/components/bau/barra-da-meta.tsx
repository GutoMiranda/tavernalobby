/** Barra da meta do baú: trilho de pedra, ouro que enche com brilho correndo e marcas de 25%, 50% e 75%. */
export function BarraDaMeta({ progresso }: { progresso: number }) {
  const p = Math.min(100, Math.max(0, progresso));
  return (
    <div
      className="barra-meta relative h-6 overflow-hidden rounded-full border-2 border-[#7a5220] bg-[#1b1511] shadow-[inset_0_2px_6px_rgb(0_0_0/0.8)]"
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso da meta"
    >
      <div className="barra-meta-ouro h-full rounded-full" style={{ width: `${p}%` }} />
      {[25, 50, 75].map((m) => (
        <span
          key={m}
          aria-hidden
          className={`absolute top-0 h-full w-0.5 ${p >= m ? "bg-[#7a5220]/60" : "bg-[#5c4d40]"}`}
          style={{ left: `${m}%` }}
        />
      ))}
    </div>
  );
}
