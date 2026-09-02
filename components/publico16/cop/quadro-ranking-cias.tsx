import Image from "next/image";
import { FMT, PCT, nivelPorCumprimento, type LinhaFracao, type Nivel } from "@/lib/cop2026-metricas";

/**
 * Quadro 08 do bloco "Registro Operacional" — posição de cada fração na meta.
 *
 * Os sete primeiros quadros da Diretriz em Foco são normativos e estáticos;
 * este é o único que fala do agora, e por isso repete a casca dos outros
 * (mesma moldura, mesmo número em Cinzel amarelo, mesma foto sob gradiente) em
 * vez de inventar um cartão claro no meio de um bloco escuro. O que muda é só
 * o miolo: no lugar da frase normativa, o ranking que o Comando lê no painel.
 *
 * Sem dados (`linhas` vazio) ele desenha o próprio esqueleto, com as seis
 * faixas na altura definitiva — é o fallback do <Suspense> da página, e um
 * esqueleto de altura diferente faria o bloco inteiro pular quando a planilha
 * respondesse.
 */

/** Régua de faixas do painel, reancorada para fundo escuro.
 *  As variáveis --sinal-* de globals.css foram calibradas para o branco do
 *  dashboard (#1c7a4a, #b3261e); sobre o azul #1d2c46 deste bloco elas ficam
 *  quase invisíveis. Mesma semântica, luminosidade corrigida. */
const COR_BARRA: Record<Nivel, string> = {
  superacao: "#4d8bff",
  conforme: "#35c07d",
  atencao: "#e9a13b",
  critico: "#ea4b4b",
  neutro: "#7b8494",
};

const COR_TEXTO: Record<Nivel, string> = {
  superacao: "text-[#7dabff]",
  conforme: "text-[#5fd6a0]",
  atencao: "text-[#f2b862]",
  critico: "text-[#ff7b7b]",
  neutro: "text-white/55",
};

/** Só o que cabe na largura de uma faixa: o resto do ranking vive no Dashboard. */
export type LinhaRanking = Pick<
  LinhaFracao,
  "chave" | "rotulo" | "meta" | "feito" | "pct" | "falta" | "nivel"
>;

export function QuadroRankingCias({
  linhas = [],
  pctBatalhao,
  mes,
}: {
  linhas?: LinhaRanking[];
  pctBatalhao?: number;
  /** Mês do recorte ("Setembro"), só para a tela dizer de que mês ela fala. */
  mes?: string;
}) {
  const temDados = linhas.length > 0;
  // A ordem do painel é a ordem regimental (EM, 1ª… FT); ranking é por
  // desempenho, então reordena aqui em vez de pedir outra derivação à lib.
  const ordenadas = [...linhas].sort((a, b) => b.pct - a.pct);
  const lider = ordenadas[0];
  // A última colocada, e não a de maior déficit — é quem o Comando cobra. Regra
  // herdada do espelho branco que ficava no hero até 31/08/2026: enquanto os
  // dois blocos conviveram, cada um apontando uma fração diferente na mesma
  // frase, era contradição na cara de quem lia.
  const ultima = ordenadas.length > 1 ? ordenadas[ordenadas.length - 1] : undefined;
  // Mês recém-aberto: há dado, e o dado é zero. Não é o esqueleto (que fala de
  // leitura em curso) nem é ranking — "Força Tática lidera com 0%" no dia 1º
  // seria disputa entre seis zeros. A ordem exibida volta a ser a regimental.
  const mesZerado = temDados && ordenadas.every((l) => l.feito === 0);
  const nivelBatalhao: Nivel = nivelPorCumprimento(pctBatalhao ?? 0, pctBatalhao !== undefined);

  return (
    <div className="relative isolate min-h-72 overflow-hidden rounded-xl border border-white/20 bg-[#1d2c46] shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-1 sm:col-span-2">
      <Image
        src="/16bpmm/carrossel/slide-13.jpg"
        alt=""
        fill
        sizes="(min-width: 640px) 100vw, 100vw"
        className="-z-20 object-cover object-top"
      />
      {/* Gradiente mais fechado que o dos quadros normativos: aqui a foto
          concorre com seis linhas de número, não com uma frase de três palavras. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#071225] via-[#071225]/92 to-[#071225]/70" />

      <div className="flex min-h-72 flex-col justify-end p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <span className="text-4xl font-black leading-none text-[#e5d332]/90">08</span>
            <h4 className="mt-2 text-sm font-black uppercase leading-tight">
              Companhias e Força Tática
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              Posição de cada fração na meta{mes ? ` de ${mes}` : " do mês"} · atualiza a cada
              minuto
            </p>
          </div>

          <div className="text-right">
            <span
              className={`dados block text-2xl font-black leading-none sm:text-3xl ${COR_TEXTO[nivelBatalhao]}`}
            >
              {pctBatalhao === undefined ? "—" : `${PCT.format(pctBatalhao)}%`}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              Batalhão
            </span>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5 border-t border-white/15 pt-4">
          {(temDados ? ordenadas : ESQUELETO).map((l, i) => (
            <li key={l.chave} className="flex items-center gap-3">
              <span
                className="dados flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-[#071225]"
                style={{ background: COR_BARRA[l.nivel] }}
                aria-hidden
              >
                {/* Com todo mundo em zero não há colocação: numerar de 1 a 6 diria
                    que o Estado-Maior está à frente da 2ª Cia por ordem alfabética
                    do array. */}
                {mesZerado ? "·" : i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[11px] font-black uppercase tracking-wide text-white/90 sm:text-xs">
                    {l.rotulo}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">
                    <span className={`dados text-xs font-black sm:text-sm ${COR_TEXTO[l.nivel]}`}>
                      {temDados ? `${PCT.format(l.pct)}%` : "—"}
                    </span>
                    <span className="dados ml-1.5 text-[10px] font-bold text-white/50">
                      {temDados ? `${FMT.format(l.feito)}/${FMT.format(l.meta)}` : ""}
                    </span>
                  </span>
                </div>

                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: temDados ? `${Math.min(100, Math.max(0, l.pct))}%` : "0%",
                      background: COR_BARRA[l.nivel],
                    }}
                  />
                </div>
              </div>

              <span className="w-24 shrink-0 text-right text-[10px] font-bold leading-tight text-white/55 sm:w-28 sm:text-[11px]">
                {!temDados ? (
                  "lendo a planilha…"
                ) : l.falta > 0 ? (
                  <>
                    faltam <span className="dados font-black text-white/80">{FMT.format(l.falta)}</span>
                  </>
                ) : (
                  <span className="font-black uppercase tracking-wide text-[#7dabff]">Meta batida</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {mesZerado && (
          <div className="mt-4 border-t border-white/15 pt-3 text-[10px] font-semibold text-white/55 sm:text-[11px]">
            <span>
              {mes ? `${mes} ` : "O mês "}começou. Nenhum lançamento registrado ainda — a meta de{" "}
              <span className="dados font-black text-white/80">
                {FMT.format(ordenadas.reduce((s, l) => s + l.meta, 0))}
              </span>{" "}
              evidências está inteira pela frente.
            </span>
          </div>
        )}

        {temDados && !mesZerado && lider && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/15 pt-3 text-[10px] font-semibold text-white/55 sm:text-[11px]">
            <span>
              <span className="font-black text-white/85">{lider.rotulo}</span> lidera com{" "}
              <span className={`dados font-black ${COR_TEXTO[lider.nivel]}`}>
                {PCT.format(lider.pct)}%
              </span>
            </span>
            {ultima && ultima.falta > 0 && (
              <span>
                <span className="font-black text-white/85">{ultima.rotulo}</span> precisa de{" "}
                <span className="dados font-black text-[#ff7b7b]">{FMT.format(ultima.falta)}</span>{" "}
                evidências para alcançar a meta
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Seis faixas mudas, na ordem regimental, só para o esqueleto ter a altura
 *  exata do quadro preenchido. */
const ESQUELETO: LinhaRanking[] = [
  { chave: "ft", rotulo: "Força Tática", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
  { chave: "em", rotulo: "Estado-Maior", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
  { chave: "1cia", rotulo: "1ª Cia", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
  { chave: "2cia", rotulo: "2ª Cia", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
  { chave: "3cia", rotulo: "3ª Cia", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
  { chave: "4cia", rotulo: "4ª Cia", meta: 0, feito: 0, pct: 0, falta: 0, nivel: "neutro" },
];
