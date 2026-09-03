"use client";

import {
  COR_TRAJETORIA,
  ROTULO_TRAJETORIA,
  SUBTITULO_TRAJETORIA,
  calcularTendencia,
  progressoDoMes,
  progressoDaJanela,
} from "@/lib/cop2026-tendencia";

/**
 * Cartão TRAJETÓRIA — par do cartão de CUMPRIMENTO (o "63,5% da meta").
 *
 * Ocupa no velocímetro o lugar que era do cartão "Ritmo necessário", que
 * exibia a constante 73 escrita à mão. Antes desta versão o lugar era do
 * cartão TENDÊNCIA, que empilhava três ritmos, um saldo e um percentual num
 * espaço de 130px — cinco grandezas heterogêneas sem hierarquia. Os ritmos
 * saíram para a FaixaRitmos, logo abaixo, onde há largura para compará-los.
 *
 * Aqui fica só a segunda leitura de posição, que é o par natural do
 * cumprimento e responde a outra pergunta:
 *
 *   cumprimento  — quanto da meta do MÊS já foi feito;
 *   trajetória   — quanto do que já DEVERIA estar feito a esta altura foi feito.
 *
 * As duas réguas são ortogonais por decisão do Comando
 * (docs/cop2026-padroes-comando.md §2): a de cumprimento continua sendo
 * `nivelPorCumprimento`, e a de trajetória vive inteira em cop2026-tendencia.ts
 * — rótulo, subtítulo e cor. Este componente não classifica nada.
 *
 * Unidade: o Batalhão mede POR DIA. Somar turnos de frações diferentes num só
 * denominador mistura o agregado com o turno que a fração realiza — é o motivo
 * do veto a 960 ÷ 360 = 2,67.
 */

const N0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const N1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

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

export function CartaoTrajetoria({
  meta,
  total,
  janela,
}: {
  meta: number;
  total: number;
  /* A janela do recorte. Com uma semana selecionada ela tem 7 dias, e a
     trajetória passa a comparar a cota da semana com os dias da semana. Sem
     ela, cai no mês — que é o que a janela devolve quando não há filtro. */
  janela?: { dias: number; decorridos: number; encerrado: boolean };
}) {
  const { ano, mes, referencia } = hojeSP();
  const p = janela ? progressoDaJanela(janela) : progressoDoMes(referencia, ano, mes);

  // turnosMes/turnosDecorridos em DIAS: no Batalhão o ritmo é diário.
  const t = calcularTendencia({
    meta,
    realizado: total,
    turnosMes: p.diasMes,
    turnosDecorridos: p.diasDecorridos,
  });

  const cor = COR_TRAJETORIA[t.situacao];
  const saldo = t.saldoTrajetoria;

  return (
    <div
      className="pulso-faixa-card flex min-h-[130px] flex-col items-center justify-center rounded-2xl border-2 bg-white/95 px-2.5 py-3 text-center shadow-[0_7px_18px_rgba(15,23,42,0.14)] sm:min-h-[136px] sm:px-3"
      style={{ borderColor: `color-mix(in srgb, ${cor} 55%, white)` }}
    >
      <span
        className="text-[10px] font-black uppercase tracking-[0.12em]"
        style={{ color: cor }}
      >
        Trajetória
      </span>

      <span
        className="dados mt-0.5 text-[40px] font-black leading-none tracking-tight tabular-nums sm:text-[46px]"
        style={{ color: cor }}
        title={`Realizado ${N0.format(total)} sobre ${N0.format(t.metaAcumulada)} previstos até aqui`}
      >
        {t.aderencia === null ? "—" : `${N1.format(t.aderencia)}%`}
      </span>

      <span className="mt-1 text-[9.5px] font-black uppercase leading-tight tracking-[0.1em] text-slate-600">
        do previsto até aqui
      </span>

      <span
        title={SUBTITULO_TRAJETORIA[t.situacao]}
        className="mt-2 inline-block rounded-full border-2 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
        style={{ color: cor, borderColor: cor }}
      >
        {ROTULO_TRAJETORIA[t.situacao]}
      </span>

      <span className="mt-1.5 text-[10px] font-semibold leading-tight text-slate-600">
        previsto{" "}
        <span className="dados font-black text-slate-800">{N0.format(t.metaAcumulada)}</span> ·
        saldo{" "}
        <span className="dados font-black" style={{ color: cor }}>
          {saldo >= 0 ? "+" : ""}
          {N0.format(saldo)}
        </span>
      </span>
    </div>
  );
}
