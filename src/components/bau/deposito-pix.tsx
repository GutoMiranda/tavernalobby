"use client";

import { ArrowDownCircle, QrCode, Zap } from "lucide-react";
import QRCode from "qrcode";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { CopiarBotao } from "@/components/copiar-botao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/dinheiro";
import type { EstadoAcao } from "@/lib/erros";
import { pixCopiaECola } from "@/lib/finance/pix";
import { formatarCentavos } from "@/lib/format";

export type ModoValor = "mes" | "semana" | "dia" | "livre";

type Props = {
  evento: string;
  fundo: string;
  chave: string | null;
  titular: string | null;
  banco: string | null;
  /** Pix automático (InfinitePay) configurado no servidor. */
  automatico: boolean;
  porMesCentavos: number;
  porSemanaCentavos: number | null;
  porDiaCentavos: number | null;
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
};

/**
 * Um card só para depositar: primeiro a pessoa escolhe o valor (começa em 0,00), depois paga
 * pelo Pix automático ou pelo QR/copia e cola da chave. Sem valor, nada de pagamento.
 */
export function DepositoPix(props: Props) {
  const { automatico, chave } = props;
  const [modo, setModo] = useState<ModoValor | null>(null);
  const [texto, setTexto] = useState("0,00");
  const [estado, executar] = useActionState(props.acao, {});
  const [tentou, setTentou] = useState(false);
  const id = useId();

  const centavos = reaisParaCentavos(texto) ?? 0;
  const valido = centavos >= 100 && centavos <= 5_000_000;

  const opcoes: { modo: ModoValor; rotulo: string; centavos: number | null }[] = [
    { modo: "mes", rotulo: "Por mês", centavos: props.porMesCentavos || null },
    { modo: "semana", rotulo: "Por semana", centavos: props.porSemanaCentavos },
    { modo: "dia", rotulo: "Por dia", centavos: props.porDiaCentavos },
    { modo: "livre", rotulo: "Outro valor", centavos: null },
  ];

  function escolher(m: ModoValor, valor: number | null) {
    setModo(m);
    setTentou(false);
    if (valor) setTexto(centavosParaCampo(valor));
    else if (m === "livre") {
      setTexto("0,00");
      requestAnimationFrame(() => document.getElementById(`${id}-valor`)?.focus());
    }
  }

  const copiaECola =
    chave && valido ? pixCopiaECola({ chave, nome: props.titular ?? "Taverna", valorCentavos: centavos }) : null;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    if (!copiaECola) {
      setQr(null);
      return;
    }
    QRCode.toString(copiaECola, { type: "svg", margin: 1, color: { dark: "#1d1611", light: "#FFFFFF" } })
      .then((svg) => ativo && setQr(svg))
      .catch(() => ativo && setQr(null));
    return () => {
      ativo = false;
    };
  }, [copiaECola]);

  const avisoValor = tentou && !valido;

  /** Leva ao card "Paguei por fora" já com o valor escolhido no campo. */
  function irParaPagueiPorFora() {
    const card = document.getElementById("paguei-por-fora");
    const campo = document.getElementById("dep-valor") as HTMLInputElement | null;
    if (campo && valido) campo.value = centavosParaCampo(centavos);
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
    campo?.focus({ preventScroll: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-display text-lg text-wood">1. Escolha o valor</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como calcular o valor">
          {opcoes.map((o) => {
            const desativado = o.modo !== "livre" && !o.centavos;
            const ativo = modo === o.modo;
            return (
              <button
                key={o.modo}
                type="button"
                role="radio"
                aria-checked={ativo}
                disabled={desativado}
                onClick={() => escolher(o.modo, o.centavos)}
                className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-2 py-2.5 text-center transition-colors disabled:opacity-40 ${
                  ativo
                    ? "border-gold bg-gold/15 text-wood shadow-[0_0_14px_-4px_var(--gold)]"
                    : "border-border bg-surface hover:border-gold/60"
                }`}
              >
                <span className="font-semibold">{o.rotulo}</span>
                <span className="text-sm text-muted-foreground">
                  {o.centavos ? formatarCentavos(o.centavos) : o.modo === "livre" ? "você digita" : "sem data"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-valor`}>Valor do depósito (R$)</Label>
          <Input
            id={`${id}-valor`}
            inputMode="decimal"
            value={texto}
            aria-invalid={avisoValor || undefined}
            aria-describedby={`${id}-ajuda`}
            onFocus={(e) => {
              if (centavos === 0) e.currentTarget.select();
            }}
            onChange={(e) => {
              setTexto(e.target.value);
              setModo("livre");
              setTentou(false);
            }}
            className="text-center text-2xl font-bold text-wood tabular-nums"
          />
          <p
            id={`${id}-ajuda`}
            className={`text-sm ${avisoValor ? "font-medium text-alert" : "text-muted-foreground"}`}
          >
            {avisoValor
              ? "Escolha ou digite um valor antes de pagar (mínimo R$ 1,00)."
              : "Começa em 0,00. Toque em uma opção acima ou digite o valor."}
          </p>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <p className="font-display text-lg text-wood">2. Pague</p>
        {automatico && (
          <form
            action={executar}
            onSubmit={(e) => {
              if (!valido) {
                e.preventDefault();
                setTentou(true);
              }
            }}
            className="flex flex-col gap-2 rounded-xl border border-bottle/50 bg-bottle/5 p-3"
          >
            <input type="hidden" name="evento" value={props.evento} />
            <input type="hidden" name="fundo" value={props.fundo} />
            <input type="hidden" name="valor" value={valido ? centavosParaCampo(centavos) : ""} />
            <BotaoPagar valido={valido} centavos={centavos} />
            <p className="text-sm text-muted-foreground">
              Abre a página segura da InfinitePay. O depósito entra no baú já confirmado.
            </p>
            <p role="status" aria-live="polite" className="text-sm">
              {estado.ok && <span className="text-bottle">{estado.ok}</span>}
              {estado.erro && <span className="font-medium text-alert">{estado.erro}</span>}
            </p>
          </form>
        )}

        {chave ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <p className="flex items-center gap-2 font-semibold">
              <QrCode className="size-5 text-bottle" aria-hidden />
              {automatico ? "Ou Pix direto na chave" : "Pix direto na chave"}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Banco</dt>
              <dd>{props.banco ?? "—"}</dd>
              <dt className="text-muted-foreground">Titular</dt>
              <dd>{props.titular ?? "—"}</dd>
              <dt className="text-muted-foreground">Chave</dt>
              <dd className="break-all font-medium">{chave}</dd>
            </dl>
            {qr ? (
              <div
                className="mx-auto w-48 rounded-md border border-border bg-white p-2"
                role="img"
                aria-label={`QR code Pix de ${formatarCentavos(centavos)}`}
                // SVG gerado no navegador pela biblioteca qrcode a partir do código Pix.
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            ) : (
              <div className="mx-auto flex size-48 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                <QrCode className="size-10 opacity-50" aria-hidden />O QR aparece aqui depois que você escolher o valor.
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {copiaECola && <CopiarBotao texto={copiaECola} rotulo={`Copiar Pix de ${formatarCentavos(centavos)}`} />}
              <CopiarBotao texto={chave} rotulo="Copiar chave" />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-gold/50 bg-gold/10 p-3 text-sm">
              <p>
                <strong className="text-wood">Este Pix não avisa o site sozinho.</strong> Depois de pagar pelo QR ou
                pela chave, registre o depósito para o Tesoureiro conferir.
                {automatico && " Para entrar na hora, com explosão de ouro, use o Pix automático acima."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={irParaPagueiPorFora}
                className="h-auto min-h-10 whitespace-normal"
              >
                <ArrowDownCircle aria-hidden /> Já paguei pela chave: registrar depósito
              </Button>
            </div>
          </div>
        ) : (
          !automatico && <p className="text-muted-foreground">O admin ainda não cadastrou a chave Pix.</p>
        )}
      </div>
    </div>
  );
}

function BotaoPagar({ valido, centavos }: { valido: boolean; centavos: number }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-disabled={!valido}
      className={`h-auto min-h-11 py-2.5 whitespace-normal ${valido ? "" : "opacity-60"}`}
    >
      <Zap aria-hidden />
      {pending
        ? "Abrindo…"
        : valido
          ? `Pagar ${formatarCentavos(centavos)} com Pix automático`
          : "Pagar com Pix automático"}
    </Button>
  );
}
