"use client";

import {
  calcularTendencia,
  metaDeAmanha,
  progressoDoMes,
  progressoDaJanela,
} from "@/lib/cop2026-tendencia";
import { cn } from "@/lib/utils";

/**
 * FAIXA DOS TRÊS RITMOS — a leitura comparativa que o cartão de 130px não
 * comportava.
 *
 * O cartão TENDÊNCIA anterior imprimia ALVO 30,97 · REAL 20,33 · RECUPERAÇÃO
 * 350,00 um sob o outro, no mesmo tamanho e sem escala comum: cabia ao leitor
 * fazer a divisão de cabeça para saber que o ritmo praticado é dois terços do
 * necessário, e nada dizia por que a recuperação é dez vezes maior que o alvo.
 *
 * Aqui ALVO e REAL dividem a MESMA régua — o alvo é a largura inteira, e o
 * vazio ao fim da barra do real é exatamente o que falta por dia. A recuperação
 * sai da régua de propósito: ela não é um terceiro ritmo comparável, é o preço
 * do atraso, e aparece com a PRESSÃO (quantas vezes o ritmo normal) que a lib
 * já calcula.
 *
 * Unidade: Batalhão POR DIA (docs/cop2026-padroes-comando.md §4 e a decisão do
 * Maj PM em 31/08/2026). Nada aqui é fixo no código.
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

/** Uma linha da régua: rótulo, glosa, barra na escala do alvo e o valor. */
function Barra({
  rotulo,
  glosa,
  valor,
  pct,
  cor,
  tracejado,
}: {
  rotulo: string;
  glosa: string;
  valor: string;
  pct: number;
  cor: string;
  /** Marca o trecho vazio como "o que falta", em vez de deixá-lo neutro. */
  tracejado?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          <span
            className="text-[9.5px] font-black uppercase tracking-[0.1em]"
            style={{ color: cor }}
          >
            {rotulo}
          </span>
          <span className="text-[9.5px] font-semibold leading-none text-slate-500">{glosa}</span>
        </span>
        <span className="flex items-baseline gap-1">
          <span
            className="dados text-[17px] font-black leading-none tabular-nums"
            style={{ color: cor }}
          >
            {valor}
          </span>
          <span className="text-[8.5px] font-bold text-slate-500">/dia</span>
        </span>
      </div>

      <div className="relative h-[13px] w-full overflow-hidden rounded-[3px] border border-slate-300 bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-r-[2px]"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }}
        />
        {tracejado && (
          <span className="absolute inset-y-0 right-1 flex items-center text-[8.5px] font-black uppercase tracking-wide text-slate-500">
            {tracejado}
          </span>
        )}
      </div>
    </div>
  );
}

/** Posição do mês pelo calendário civil de São Paulo. Fonte única do "dia X de Y"
 *  — usada tanto pelo card quanto pelo cabeçalho da seção que o hospeda, para os
 *  dois nunca divergirem. */
export function progressoMesSP() {
  const { ano, mes, referencia } = hojeSP();
  return { ano, mes, progresso: progressoDoMes(referencia, ano, mes) };
}

export function FaixaRitmos({
  meta,
  total,
  titulo = "Tendência · ritmo diário",
  className,
  variante = "solo",
  mostrarDias = true,
  janela,
  rotuloPeriodo = "mês",
}: {
  meta: number;
  total: number;
  /** Cabeçalho do cartão. Default é o card do Batalhão; a grade por fração passa o nome da Cia. */
  titulo?: string;
  /** Mesclada por último na raiz — a grade neutraliza o mt-3/max-w-[390px] do uso solo. */
  className?: string;
  /** "solo" flutua sobre o velocímetro (moldura própria); "embutido" mora dentro
   *  de outro card e usa só um divisor no topo, sem caixa-dentro-de-caixa. */
  variante?: "solo" | "embutido";
  /** O "dia X de Y" sai quando a seção já mostra o contador uma vez no cabeçalho. */
  mostrarDias?: boolean;
  /** A janela do recorte. Com uma semana selecionada tem 7 dias, e o ritmo-alvo
   *  passa a ser a cota da semana dividida pelos dias dela. */
  janela?: { dias: number; decorridos: number; encerrado: boolean };
  /** Como o período se chama no texto: "mês" ou "semana". */
  rotuloPeriodo?: string;
}) {
  const { progresso: pMes } = progressoMesSP();
  const p = janela ? progressoDaJanela(janela) : pMes;

  const t = calcularTendencia({
    meta,
    realizado: total,
    turnosMes: p.diasMes,
    turnosDecorridos: p.diasDecorridos,
  });

  /* "Sempre a recuperação dia seguinte" — Coordenadoria Operacional, 02/09/2026.
     O ritmo de recuperação responde "se eu diluir o que falta pelos dias que
     sobram"; a ordem do dia é outra pergunta, e é esta. */
  const amanha = metaDeAmanha({
    meta,
    realizado: total,
    turnosMes: p.diasMes,
    turnosDecorridos: p.diasDecorridos,
  });

  const alvo = t.ritmoAlvo;
  const real = t.ritmoReal;
  const pctReal = real === null || alvo <= 0 ? 0 : (real / alvo) * 100;
  const faltaPorDia = real === null ? null : Math.max(0, alvo - real);
  const diasRestantes = t.turnosRestantes;
  /** No último dia (≤1) a recuperação por dia dispara para 15–20× e lê como
   *  pânico. Aí vale mais o déficit absoluto do que o ritmo. */
  const ultimoDia = t.deficit > 0 && !t.irrecuperavel && diasRestantes <= 1;

  return (
    <div
      className={cn(
        variante === "embutido"
          ? "mt-3.5 w-full border-t-2 border-slate-200 pt-3"
          : "relative z-10 mt-3 w-full max-w-[390px] rounded-2xl border-2 border-slate-300 bg-white/95 px-3 py-2.5 shadow-[0_5px_14px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b-2 border-slate-200 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-800">
          {titulo}
        </span>
        {mostrarDias && (
          <span className="dados text-[9.5px] font-semibold text-slate-500">
            dia {N0.format(p.diasDecorridos)} de {N0.format(p.diasMes)} ·{" "}
            {diasRestantes === 0
              ? `${rotuloPeriodo} encerrado`
              : `${N0.format(diasRestantes)} dia${diasRestantes === 1 ? "" : "s"} restante${diasRestantes === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <Barra
          rotulo="Alvo"
          glosa={`passo normal ${rotuloPeriodo === "mês" ? "do mês" : `da ${rotuloPeriodo}`}`}
          valor={N2.format(alvo)}
          pct={100}
          cor={COR_ALVO}
        />
        <Barra
          rotulo="Real"
          glosa="praticado até aqui"
          valor={real === null ? "—" : N2.format(real)}
          pct={pctReal}
          cor={COR_REAL}
          tracejado={
            faltaPorDia === null || faltaPorDia <= 0
              ? undefined
              : `falta ${N2.format(faltaPorDia)}`
          }
        />
      </div>

      <p className="mt-1.5 text-[10px] font-semibold leading-tight text-slate-600">
        O ritmo praticado é{" "}
        <span className="dados font-black" style={{ color: COR_REAL }}>
          {t.aderencia === null ? "—" : `${N1.format(Math.min(pctReal, 999))}%`}
        </span>{" "}
        do alvo — mesma régua, mesma unidade.
      </p>

      {!amanha.ultimo && p.diasDecorridos > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1.5">
          <span className="flex flex-col leading-tight">
            <span className="text-[9.5px] font-black uppercase tracking-[0.1em] text-slate-800">
              Amanhã
            </span>
            <span className="text-[9px] font-semibold text-slate-500">
              {amanha.divida > 0
                ? `cota ${N2.format(amanha.cota)} + dívida ${N0.format(Math.round(amanha.divida))}`
                : `cota do dia · ${N0.format(Math.round(amanha.agio))} de folga`}
            </span>
          </span>
          <span className="flex items-baseline gap-1">
            <span
              className="dados text-[17px] font-black leading-none tabular-nums"
              style={{ color: amanha.alvo > amanha.cota ? COR_RECUP : COR_ALVO }}
            >
              {N2.format(amanha.alvo)}
            </span>
            <span className="text-[8.5px] font-bold text-slate-500">/dia seguinte</span>
          </span>
        </div>
      )}

      {t.deficit > 0 && (
        <div
          className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border-2 px-2.5 py-1.5"
          style={{ borderColor: `color-mix(in srgb, ${COR_RECUP} 45%, white)`, background: "#fdf0f0" }}
        >
          <span
            className="text-[9.5px] font-black uppercase tracking-[0.1em]"
            style={{ color: COR_RECUP }}
          >
            Recuperação
          </span>
          {t.irrecuperavel ? (
            <span className="text-[10px] font-bold text-slate-700">
              sem dia restante · déficit final de{" "}
              <span className="dados font-black" style={{ color: COR_RECUP }}>
                {N0.format(t.deficit)}
              </span>
            </span>
          ) : ultimoDia ? (
            <span className="text-[10px] font-bold text-slate-700">
              último dia · faltam{" "}
              <span className="dados font-black" style={{ color: COR_RECUP }}>
                {N0.format(t.deficit)}
              </span>{" "}
              evidências
            </span>
          ) : (
            <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
              <span className="flex items-baseline gap-1">
                <span
                  className="dados text-[17px] font-black leading-none tabular-nums"
                  style={{ color: COR_RECUP }}
                >
                  {N2.format(t.ritmoRecuperacao)}
                </span>
                <span className="text-[8.5px] font-bold text-slate-500">/dia</span>
              </span>
              {t.pressaoRecuperacao !== null && (
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[9px] font-black tabular-nums"
                  style={{ color: COR_RECUP, borderColor: COR_RECUP }}
                  title="Quantas vezes a recuperação exige acima do ritmo normal"
                >
                  {N1.format(t.pressaoRecuperacao)}× o normal
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
