"use client";

import { calcularTendencia, progressoDoMes } from "@/lib/cop2026-tendencia";

/**
 * Cartão TENDÊNCIA — ocupa no velocímetro o lugar que era do cartão
 * "Ritmo necessário", que exibia a constante 73 escrita à mão.
 *
 * Desenho deliberadamente igual ao do cartão que substitui: mesmo raio, mesma
 * borda na cor da faixa, mesmo fundo. O que muda é o conteúdo — três ritmos no
 * lugar de um número só, conforme a decisão do Maj PM em 31/08/2026.
 *
 * Unidade: o Batalhão sai POR DIA. Somar turnos de frações diferentes num só
 * denominador mistura o agregado com o turno que a fração realiza — é o motivo
 * do veto a 960 ÷ 300 = 3,20.
 */

const N2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const N0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const N1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const COR_ALVO = "#2563eb";
const COR_REAL = "#d97706";
const COR_RECUP = "#ca0202";

function hojeSP() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [ano, mes, dia] = p.split("-").map(Number);
  return { ano, mes, referencia: new Date(Date.UTC(ano, mes - 1, dia, 12)) };
}

function Linha({
  cor,
  rotulo,
  valor,
  unidade,
}: {
  cor: string;
  rotulo: string;
  valor: string;
  unidade: string;
}) {
  return (
    <div className="flex w-full items-baseline justify-between gap-2 border-b border-slate-200 py-1 last:border-b-0">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: cor }} />
        <span className="text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: cor }}>
          {rotulo}
        </span>
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className="dados text-[19px] font-black leading-none tabular-nums sm:text-[21px]"
          style={{ color: cor }}
        >
          {valor}
        </span>
        <span className="text-[8px] font-semibold text-slate-500">{unidade}</span>
      </span>
    </div>
  );
}

export function CaixaRitmos({ meta, total }: { meta: number; total: number }) {
  const { ano, mes, referencia } = hojeSP();
  const p = progressoDoMes(referencia, ano, mes);

  // turnosMes/turnosDecorridos em DIAS: no Batalhão o ritmo é diário.
  const t = calcularTendencia({
    meta,
    realizado: total,
    turnosMes: p.diasMes,
    turnosDecorridos: p.diasDecorridos,
  });

  const saldo = t.saldoTrajetoria;
  const corSaldo = saldo >= 0 ? COR_ALVO : COR_RECUP;

  return (
    <div
      className="pulso-faixa-card flex min-h-[130px] flex-col items-center justify-center rounded-2xl border-2 bg-white/95 px-2.5 py-3 shadow-[0_7px_18px_rgba(15,23,42,0.14)] sm:min-h-[136px] sm:px-3"
      style={{ borderColor: "color-mix(in srgb, var(--faixa) 55%, white)" }}
    >
      <span
        className="pulso-faixa-texto text-[10px] font-black uppercase tracking-[0.12em]"
        style={{ color: "var(--faixa)" }}
      >
        Tendência
      </span>

      <div className="mt-1.5 flex w-full flex-col">
        <Linha
          cor={COR_ALVO}
          rotulo="Alvo"
          valor={N2.format(t.ritmoAlvo)}
          unidade="/dia"
        />
        <Linha
          cor={COR_REAL}
          rotulo="Real"
          valor={t.ritmoReal === null ? "—" : N2.format(t.ritmoReal)}
          unidade="/dia"
        />
        <Linha
          cor={COR_RECUP}
          rotulo="Recuperação"
          valor={t.irrecuperavel ? "—" : N2.format(t.ritmoRecuperacao)}
          unidade="/dia"
        />
      </div>

      <div className="mt-1.5 flex w-full items-center justify-between gap-1.5 border-t-2 border-slate-300 pt-1.5">
        <span className="text-[8.5px] font-bold uppercase tracking-wide text-slate-500">
          Trajetória
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="dados text-[13px] font-black tabular-nums" style={{ color: corSaldo }}>
            {saldo >= 0 ? "+" : ""}
            {N0.format(saldo)}
          </span>
          <span className="dados text-[11px] font-bold tabular-nums text-slate-600">
            {t.aderencia === null ? "—" : `${N1.format(t.aderencia)}%`}
          </span>
        </span>
      </div>
    </div>
  );
}
