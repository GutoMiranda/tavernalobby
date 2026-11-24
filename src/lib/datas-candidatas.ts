/** Datas candidatas digitadas na criação (linhas sem início são ignoradas). */
export function lerDatasCandidatas(d: FormData) {
  const valida = (v: FormDataEntryValue | undefined) => {
    const s = String(v ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  const inicios = d.getAll("data_inicio");
  const fins = d.getAll("data_fim");
  const motivos = d.getAll("data_motivo");
  const datas: { start_date: string; end_date: string; note: string | null }[] = [];
  for (let i = 0; i < inicios.length; i++) {
    const inicio = valida(inicios[i]);
    if (!inicio) continue;
    const fim = valida(fins[i]) ?? inicio;
    if (fim < inicio) return { erro: `Na opção ${i + 1}, o fim precisa ser depois do início.` };
    datas.push({ start_date: inicio, end_date: fim, note: String(motivos[i] ?? "").trim().slice(0, 200) || null });
  }
  return { datas };
}
