"use client";

import {
  FMT_CONTAGEM,
  FMT_RITMO,
  calcularTendencia,
  fmtDias,
  progressoDaJanela,
  progressoDoMes,
} from "@/lib/cop2026-tendencia";
import { ComoLer } from "@/components/publico16/cop/primitivos";
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

/** Régua única de ritmo — ver `cop2026-tendencia.ts`. */
const N2 = FMT_RITMO;
const N0 = FMT_CONTAGEM;
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
  unidade = "/dia",
}: {
  rotulo: string;
  glosa: string;
  valor: string;
  pct: number;
  cor: string;
  /** Marca o trecho vazio como "o que falta", em vez de deixá-lo neutro. */
  tracejado?: string;
  /** Unidade impressa ao lado do número. O REAL usa "em média/dia" e não
   *  "/dia": ele é a média dos dias decorridos, não a produção de hoje —
   *  distinção que o Fabrício cobrou em 08/09/2026 ("é a média diária, não é
   *  o que está fazendo no dia; ele não consegue medir assim"). */
  unidade?: string;
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
          <span className="text-[8.5px] font-bold text-slate-500">{unidade}</span>
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
    encerrado: p.encerrado,
  });

  /* O cartão AMANHÃ saiu daqui em 08/09/2026, por decisão do Fabrício na
     reunião de revisão do painel ("e aqui, esse amanhã a gente tira, beleza?").
     Ele havia entrado em 02/09/2026 a pedido da Coordenadoria Operacional
     ("sempre a recuperação dia seguinte") — a decisão nova é posterior e vence.
     O raciocínio dele: com o Batalhão adiantado, a cota de amanhã não informa
     nada que o ALVO e o REAL já não digam. `metaDeAmanha` continua exportada em
     `cop2026-tendencia.ts`, com teste, para o dia em que o Comando pedir de
     volta — o que saiu foi a exibição, não o cálculo. */

  const alvo = t.ritmoAlvo;
  const real = t.ritmoReal;
  const pctReal = real === null || alvo <= 0 ? 0 : (real / alvo) * 100;
  const faltaPorDia = real === null ? null : Math.max(0, alvo - real);
  /* Dias vêm do PROGRESSO da janela, não de `t.turnosRestantes`: os campos
     `turnos*` de `Tendencia` carregam a unidade que o chamador entregou — aqui
     são dias, no ranking por fração são turnos-fração — e ler a contagem de
     tempo por ali é como o velocímetro do briefing acabou anunciando "54 dias
     restantes" onde faltavam 27. Ver a régua em `cop2026-tendencia.ts`. */
  const diasRestantes = Math.max(0, p.diasMes - p.diasDecorridos);
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
              : `${fmtDias(diasRestantes)} restante${diasRestantes === 1 ? "" : "s"}`}
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
          glosa="praticado até aqui, em média"
          valor={real === null ? "—" : N2.format(real)}
          unidade="em média/dia"
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

      {t.deficit > 0 && (
        <div
          className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border-2 px-2.5 py-1.5"
          style={{ borderColor: `color-mix(in srgb, ${COR_RECUP} 45%, white)`, background: "#fdf0f0" }}
        >
          {/* Texto na frente do número, pedido do Fabrício em 08/09/2026: o
              rótulo sozinho não diz de onde sai a recuperação, e quem lê o
              painel confundia com um terceiro ritmo comparável ao ALVO e ao
              REAL. A glosa é a definição que ele deu, em palavra de comando —
              "resultado do acumulado entre o real e o alvo da média dos dias
              anteriores". */}
          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className="text-[9.5px] font-black uppercase tracking-[0.1em]"
              style={{ color: COR_RECUP }}
            >
              Recuperação
            </span>
            <span className="text-[9px] font-semibold text-slate-500">
              o atraso acumulado até aqui, diluído nos dias que restam
            </span>
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

      {/* O manual do quadro, embaixo do quadro — e em todos os meios. Ver a
          nota de `ComoLer` em primitivos.tsx. */}
      <ComoLer
        titulo="Tendência · ritmo diário"
        className="mt-3 pt-2.5"
        resumo={
          <>
            O <strong>alvo</strong> é quanto o Batalhão precisa auditar por dia para fechar a meta
            {rotuloPeriodo === "mês" ? " do mês" : ` da ${rotuloPeriodo}`}. O{" "}
            <strong>real</strong> é a média que vem sendo feita por dia até aqui — não é a
            produção de hoje. Real acima do alvo é estar adiantado.
          </>
        }
        calculo={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>Alvo</strong> = meta do período ÷ dias do período.
            </li>
            <li>
              <strong>Real</strong> = evidências já auditadas ÷ dias decorridos. É uma{" "}
              <em>média</em>: um dia forte e um dia parado dão o mesmo real de dois dias medianos.
            </li>
            <li>
              A porcentagem compara os dois na mesma régua: real ÷ alvo. Acima de 100% o Batalhão
              está à frente do passo normal.
            </li>
            {t.deficit > 0 && (
              <li>
                <strong>Recuperação</strong> = o que falta para a meta ÷ dias que ainda restam. Ela
                não é um terceiro ritmo: é o preço de ter ficado atrás.
              </li>
            )}
          </ul>
        }
        exemplo={
          real === null ? undefined : (
            <>
              Alvo <strong className="dados">{N2.format(alvo)}</strong> e real{" "}
              <strong className="dados">{N2.format(real)}</strong> por dia:{" "}
              {pctReal >= 100 ? (
                <>
                  o Batalhão está fazendo{" "}
                  <strong className="dados">{N1.format(Math.min(pctReal, 999))}%</strong> do passo
                  normal — mantido esse ritmo, a meta fecha antes do fim do período.
                </>
              ) : (
                <>
                  faltam <strong className="dados">{N2.format(Math.max(0, alvo - real))}</strong>{" "}
                  evidências por dia para voltar ao passo normal.
                </>
              )}
            </>
          )
        }
      />
    </div>
  );
}
