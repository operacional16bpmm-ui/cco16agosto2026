"use client";

/**
 * Sistema visual do Briefing Executivo (/cop2026/briefing).
 *
 * Existe porque o briefing vinha inventando tipografia e cor slide a slide.
 * Três decisões moram aqui e em lugar nenhum mais:
 *
 *  1. TIPOGRAFIA (T) — seis degraus, três famílias. Cinzel nos títulos
 *     institucionais, Inter no texto corrido e IBM Plex Mono em TODO número,
 *     via as classes `.dados` / `.metric-card` / `.metric-hero` que o
 *     globals.css já define. Número em fonte de texto muda de largura quando o
 *     valor muda, e no telão isso aparece como tremor.
 *
 *  2. COR — verde, âmbar, vermelho e azul pertencem ao SEMÁFORO e só falam de
 *     desempenho; o hex vem de COR_FAIXA, o mesmo que o velocímetro e o
 *     dashboard usam. Nada decorativo pode usá-los: para isso existe INST, a
 *     paleta institucional (vermelho PM, ouro, azul), que ninguém confunde com
 *     faixa de meta.
 *
 *  3. MOVIMENTO — entrada em cascata (`--bf-d`), barra que cresce, número que
 *     conta. Os keyframes ficam em globals.css, seção "BRIEFING EXECUTIVO", e
 *     morrem inteiros em prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FMT, PCT, ROTULO_NIVEL, type Nivel } from "@/lib/cop2026-metricas";
import { COR_FAIXA } from "@/components/publico16/cop/graficos";

// ---------------------------------------------------------------------------
// 1. Tipografia
// ---------------------------------------------------------------------------
export const T = {
  /** Capa. Único lugar do briefing com esse porte. */
  display:
    "font-serif font-bold tracking-tight leading-[1.04] text-[1.7rem] sm:text-[2.6rem] lg:text-[3.1rem]",
  /** Título do slide. */
  titulo: "font-serif font-bold leading-tight text-xl sm:text-[1.7rem] lg:text-[1.95rem]",
  /** Título de bloco dentro do slide. */
  bloco: "font-serif font-bold uppercase tracking-[0.1em] text-[13px] sm:text-[15px]",
  /** Rótulo de eixo, cabeçalho de coluna e legenda (mono, caixa alta, 10px). */
  rotulo: "rotulo-dado",
  /** Texto corrido. */
  corpo: "text-[13px] sm:text-sm leading-relaxed",
  /** Nota de apoio dentro de cartão. */
  apoio: "text-[11px] leading-snug",
  /** Indicador principal. */
  kpi: "metric-hero text-[1.9rem] sm:text-[2.6rem]",
  /** Indicador de cartão. */
  numero: "metric-card text-[1.45rem] sm:text-[1.7rem]",
  /** Número dentro de texto, tabela ou legenda. */
  dado: "dados text-[12.5px]",
} as const;

// ---------------------------------------------------------------------------
// 2. Cor
// ---------------------------------------------------------------------------
/** Classes de texto/borda/fundo por faixa, para superfície ESCURA. O hex de
 *  preenchimento não se repete aqui: vem de COR_FAIXA, para o briefing e o
 *  velocímetro nunca discordarem sobre a cor de uma mesma faixa. */
export const FAIXA: Record<Nivel, { texto: string; borda: string; fundo: string; chip: string }> = {
  superacao: {
    texto: "text-blue-300",
    borda: "border-blue-400/35",
    fundo: "bg-blue-500/[0.08]",
    chip: "border-blue-400/30 bg-blue-500/15 text-blue-200",
  },
  conforme: {
    texto: "text-emerald-300",
    borda: "border-emerald-400/35",
    fundo: "bg-emerald-500/[0.08]",
    chip: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  },
  atencao: {
    texto: "text-amber-300",
    borda: "border-amber-400/35",
    fundo: "bg-amber-500/[0.08]",
    chip: "border-amber-400/30 bg-amber-500/15 text-amber-200",
  },
  critico: {
    texto: "text-red-300",
    borda: "border-red-400/35",
    fundo: "bg-red-500/[0.08]",
    chip: "border-red-400/30 bg-red-500/15 text-red-200",
  },
  neutro: {
    texto: "text-slate-300",
    borda: "border-white/15",
    fundo: "bg-white/[0.04]",
    chip: "border-white/20 bg-white/10 text-slate-200",
  },
};

export const corFaixa = (n: Nivel) => COR_FAIXA[n];

/** Paleta institucional — identidade, não desempenho. Enfeite, numeração e
 *  destaque de norma saem daqui para não roubarem o significado do semáforo. */
export const INST = {
  vermelho: "#ca0202",
  vermelhoClaro: "#ff5a5a",
  ouro: "#c8a44a",
  azul: "#4a7bc8",
  fundo: "#0b0b0e",
} as const;

/** Superfície padrão de cartão. Um valor só, para os cartões do briefing
 *  pararem de ter cinco opacidades diferentes de branco. */
export const SUPERFICIE =
  "rounded-xl border border-white/[0.14] bg-white/[0.055] backdrop-blur-sm";

// ---------------------------------------------------------------------------
// 3. Movimento
// ---------------------------------------------------------------------------
export const atraso = (i: number, passo = 60): CSSProperties =>
  ({ "--bf-d": `${i * passo}ms` }) as CSSProperties;

/** Entrada em cascata. `i` é a posição do item na lista — é o que transforma
 *  seis cartões aparecendo juntos em seis cartões que se leem em ordem. */
export function Entra({
  i = 0,
  passo = 60,
  className = "",
  children,
}: {
  i?: number;
  passo?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`bf-entra ${className}`} style={atraso(i, passo)}>
      {children}
    </div>
  );
}

/** Número que conta até o valor. `animado` guarda o quadro corrente da
 *  animação e volta a `null` quando ela acaba — a partir daí quem manda é a
 *  prop, o que deixa o efeito sem nenhum setState síncrono e faz o caminho de
 *  prefers-reduced-motion custar zero render. Conta desde 0 na primeira
 *  montagem: é a entrada do slide. */
export function Contador({
  valor,
  casas = 0,
  duracao = 900,
}: {
  valor: number;
  casas?: number;
  duracao?: number;
}) {
  const [animado, setAnimado] = useState<number | null>(null);
  const anterior = useRef(0);

  useEffect(() => {
    const parado =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const de = anterior.current;
    anterior.current = valor;
    if (parado || !Number.isFinite(valor) || de === valor) return;

    const t0 = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / duracao);
      const suave = 1 - Math.pow(1 - k, 3);
      if (k < 1) {
        setAnimado(de + (valor - de) * suave);
        raf = requestAnimationFrame(passo);
      } else {
        setAnimado(null);
      }
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracao]);

  const atual = animado ?? valor;
  const fmt =
    casas > 0 ? PCT.format(Number(atual.toFixed(casas))) : FMT.format(Math.round(atual));
  return <>{fmt}</>;
}

// ---------------------------------------------------------------------------
// 4. Primitivos
// ---------------------------------------------------------------------------
export function Cartao({
  nivel,
  className = "",
  children,
  i = 0,
}: {
  nivel?: Nivel;
  className?: string;
  children: ReactNode;
  i?: number;
}) {
  const f = nivel ? FAIXA[nivel] : null;
  return (
    <div
      className={`bf-entra rounded-xl border backdrop-blur-sm ${
        f ? `${f.borda} ${f.fundo}` : "border-white/[0.14] bg-white/[0.055]"
      } ${className}`}
      style={atraso(i)}
    >
      {children}
    </div>
  );
}

/** Indicador. `nota` é a linha que explica o número — indicador sem unidade e
 *  sem base de comparação não decide nada. */
export function Kpi({
  rotulo,
  valor,
  casas = 0,
  sufixo,
  nota,
  nivel,
  icone,
  grande = false,
  i = 0,
}: {
  rotulo: string;
  valor: number;
  casas?: number;
  sufixo?: string;
  nota?: ReactNode;
  nivel?: Nivel;
  icone?: ReactNode;
  grande?: boolean;
  i?: number;
}) {
  const cor = nivel ? FAIXA[nivel].texto : "text-white";
  return (
    <Cartao nivel={nivel} i={i} className="p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 text-white/55">
        {icone}
        <span className={T.rotulo}>{rotulo}</span>
      </div>
      <p className={`mt-1 ${grande ? T.kpi : T.numero} ${cor}`}>
        <Contador valor={valor} casas={casas} />
        {sufixo && <span className="ml-1 text-[0.5em] font-normal text-white/50">{sufixo}</span>}
      </p>
      {nota && <p className={`mt-1 ${T.apoio} text-white/50`}>{nota}</p>}
    </Cartao>
  );
}

/** Barra de cumprimento. Piso de 2% para uma fração em zero continuar
 *  visível como trilho — barra invisível lê-se como dado ausente. */
export function Barra({
  pct,
  nivel,
  altura = "h-2.5",
  i = 0,
}: {
  pct: number;
  nivel: Nivel;
  altura?: string;
  i?: number;
}) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${altura}`}>
      <div
        className="bf-barra h-full rounded-full"
        style={{
          ...atraso(i, 70),
          width: `${Math.min(100, Math.max(2, pct))}%`,
          background: corFaixa(nivel),
        }}
      />
    </div>
  );
}

export function Chip({ nivel, children }: { nivel: Nivel; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${FAIXA[nivel].chip}`}
    >
      {children ?? ROTULO_NIVEL[nivel]}
    </span>
  );
}

/** Cabeçalho de bloco dentro de um slide. */
export function Bloco({
  icone,
  titulo,
  acao,
  className = "",
  children,
  i = 0,
}: {
  icone?: ReactNode;
  titulo: string;
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
  i?: number;
}) {
  return (
    <section className={`bf-entra ${SUPERFICIE} p-4 ${className}`} style={atraso(i)}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`flex items-center gap-2 ${T.bloco} text-white`}>
          {icone}
          {titulo}
        </h3>
        {acao}
      </header>
      {children}
    </section>
  );
}

/** Frase-conclusão do bloco: o painel dizendo o que ele mesmo mostra. */
export function Leitura({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <p
      className={`bf-entra mt-3 border-l-2 border-[#ca0202]/70 pl-3 ${T.apoio} text-white/70`}
      style={atraso(i)}
    >
      {children}
    </p>
  );
}

// ===========================================================================
// 5. Mini-gráficos NATIVOS do escuro
//
// Os gráficos de components/publico16/cop/graficos.tsx são calibrados para o
// tema institucional CLARO (eixo #55535e, grade #1d1d1d1f, tooltip branco):
// no fundo #0b0b0e do briefing, o eixo some e a grade não existe. Em vez de
// forçar aqueles componentes num tema que não é o deles, o briefing desenha os
// seus — mesma matemática, já pronta em `calcularPainel`, cores do sistema
// acima, legíveis a três metros do telão. Recharts fica de fora de propósito:
// SVG e div a mão pesam menos e não brigam com o tema.
// ===========================================================================

const EIXO_ESCURO = "rgba(255,255,255,0.45)";
const GRADE_ESCURA = "rgba(255,255,255,0.09)";

/** Produção diária: área + linha + faixa de variação normal (±3σ) e linha de
 *  meta/dia. Os dias fora de controle piscam como ponto ao vivo. */
export function AreaDiaria({
  dados,
  mediaDia,
  lsc,
  lic,
  metaDia,
  foraRotulos,
}: {
  dados: { data: string; rotulo: string; v: number }[];
  mediaDia: number;
  lsc: number;
  lic: number;
  metaDia: number;
  foraRotulos: Set<string>;
}) {
  const W = 720;
  const H = 236;
  const pad = { t: 16, r: 14, b: 26, l: 34 };
  const n = dados.length;
  const max = Math.max(1, lsc, metaDia, ...dados.map((d) => d.v)) * 1.08;
  const ix = (i: number) =>
    n <= 1 ? (pad.l + (W - pad.r)) / 2 : pad.l + (i * (W - pad.l - pad.r)) / (n - 1);
  const iy = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  if (n === 0) {
    return <p className={`${T.apoio} text-white/45`}>Sem série diária no recorte.</p>;
  }

  const linha = dados.map((d, i) => `${ix(i)},${iy(d.v)}`).join(" ");
  const area = `${ix(0)},${iy(0)} ${linha} ${ix(n - 1)},${iy(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="bf-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INST.vermelhoClaro} stopOpacity={0.4} />
          <stop offset="100%" stopColor={INST.vermelhoClaro} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Faixa de variação normal ±3σ */}
      {lsc > lic && (
        <rect
          x={pad.l}
          y={iy(lsc)}
          width={W - pad.l - pad.r}
          height={Math.max(0, iy(lic) - iy(lsc))}
          fill="rgba(255,255,255,0.05)"
        />
      )}

      {/* Grade horizontal */}
      {[0, 0.5, 1].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={W - pad.r}
          y1={iy(max * g)}
          y2={iy(max * g)}
          stroke={GRADE_ESCURA}
        />
      ))}

      {/* Média diária do Batalhão — a referência do que vem sendo entregue,
          contra a meta logo abaixo/acima dela. */}
      {mediaDia > 0 && (
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={iy(mediaDia)}
          y2={iy(mediaDia)}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.25}
          strokeDasharray="2 4"
        />
      )}

      {/* Linha de meta por dia */}
      {metaDia > 0 && (
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={iy(metaDia)}
          y2={iy(metaDia)}
          stroke={INST.ouro}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}

      {/* Área + linha */}
      <polygon points={area} fill="url(#bf-area)" />
      <polyline
        className="bf-linha"
        style={{ "--bf-traco": "2000" } as CSSProperties}
        points={linha}
        fill="none"
        stroke={INST.vermelhoClaro}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Pontos; fora-de-controle marcado */}
      {dados.map((d, i) => {
        const fora = foraRotulos.has(d.data);
        return (
          <circle
            key={d.data}
            className={fora ? "bf-ao-vivo" : undefined}
            cx={ix(i)}
            cy={iy(d.v)}
            r={fora ? 4.5 : 2.6}
            fill={fora ? INST.ouro : INST.vermelhoClaro}
            stroke="#0b0b0e"
            strokeWidth={fora ? 1.5 : 0}
          />
        );
      })}

      {/* Rótulos do eixo X: primeiro, meio, último — telão não lê 30 datas */}
      {[0, Math.floor((n - 1) / 2), n - 1]
        .filter((v, idx, a) => a.indexOf(v) === idx && v >= 0)
        .map((i) => (
          <text
            key={i}
            x={ix(i)}
            y={H - 8}
            fill={EIXO_ESCURO}
            fontSize={11}
            textAnchor="middle"
            className="dados"
          >
            {dados[i].rotulo}
          </text>
        ))}
    </svg>
  );
}

/** Histograma de qualidade: quantas auditorias trouxeram 0,1,2,…,5+ evidências.
 *  Verde a partir do mínimo (conforme), cinza abaixo. */
export function ColunasQualidade({
  dados,
}: {
  dados: { faixa: string; q: number; conforme: boolean }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.q));
  return (
    <div className="flex h-40 items-end gap-2">
      {dados.map((d, i) => (
        <div key={d.faixa} className="flex flex-1 flex-col items-center gap-1.5">
          <span className={`${T.dado} text-white/70`}>{FMT.format(d.q)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="bf-coluna w-full rounded-t"
              style={{
                ...atraso(i, 55),
                height: `${(d.q / max) * 100}%`,
                minHeight: d.q > 0 ? 4 : 0,
                background: d.conforme ? COR_FAIXA.conforme : "rgba(255,255,255,0.22)",
              }}
            />
          </div>
          <span className={`${T.rotulo} text-white/45`}>{d.faixa}</span>
        </div>
      ))}
    </div>
  );
}

/** Matriz hora × dia (heatmap). Intensidade pela contagem sobre o máximo. */
export function MatrizHorario({
  matriz,
  max,
  dias,
  faixas,
}: {
  matriz: number[][];
  max: number;
  dias: string[];
  faixas: string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[380px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-9" />
            {faixas.map((f) => (
              <th key={f} className={`pb-1 ${T.rotulo} text-white/45`}>
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.map((linha, d) => (
            <tr key={d}>
              <th className={`pr-1 text-right ${T.rotulo} text-white/45`}>{dias[d]}</th>
              {linha.map((v, f) => {
                const k = max > 0 ? v / max : 0;
                return (
                  <td
                    key={f}
                    className="rounded text-center"
                    style={{
                      background:
                        v === 0
                          ? "rgba(255,255,255,0.04)"
                          : `rgba(255,90,90,${0.14 + k * 0.72})`,
                    }}
                    title={`${dias[d]} · ${faixas[f]}h · ${FMT.format(v)}`}
                  >
                    <span
                      className={`dados block py-1.5 text-[11px] ${
                        k > 0.5 ? "text-white" : "text-white/70"
                      }`}
                    >
                      {v > 0 ? FMT.format(v) : ""}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pareto de carga: barras por auditor + curva acumulada. Marca a linha dos
 *  80% — quantos poucos respondem por quase tudo. */
export function ParetoCarga({
  dados,
}: {
  dados: { nome: string; v: number; acumulado: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.v));
  const cortou = dados.findIndex((d) => d.acumulado >= 80);
  return (
    <ul className="space-y-1.5">
      {dados.map((d, i) => {
        const noCorte = cortou !== -1 && i <= cortou;
        return (
          <li key={d.nome} className="flex items-center gap-2.5" title={`${d.nome}: ${FMT.format(d.v)}`}>
            <span className="w-24 shrink-0 truncate text-[12px] text-white/75 sm:w-28">{d.nome}</span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="bf-barra h-full rounded-full"
                style={{
                  ...atraso(i, 45),
                  width: `${(d.v / max) * 100}%`,
                  background: noCorte ? INST.vermelhoClaro : "rgba(255,255,255,0.32)",
                }}
              />
            </div>
            <span className={`${T.dado} w-9 shrink-0 text-right text-white/70`}>{FMT.format(d.v)}</span>
            <span className={`${T.dado} w-11 shrink-0 text-right text-white/45`}>
              {PCT.format(d.acumulado)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Barras horizontais rotuladas (por posto, por função). Genérico. */
export function BarrasRotulo({
  dados,
  unidade = "",
}: {
  dados: { rotulo: string; v: number; pms?: number }[];
  unidade?: string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.v));
  return (
    <ul className="space-y-2">
      {dados.map((d, i) => (
        <li key={d.rotulo} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 truncate text-[12px] text-white/75 sm:w-32">{d.rotulo}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="bf-barra h-full rounded-full"
              style={{ ...atraso(i, 45), width: `${(d.v / max) * 100}%`, background: INST.vermelhoClaro }}
            />
          </div>
          <span className={`${T.dado} w-9 shrink-0 text-right text-white/70`}>{FMT.format(d.v)}</span>
          {d.pms !== undefined && (
            <span className="w-12 shrink-0 text-right text-[11px] text-white/45">
              <span className="dados">{FMT.format(d.pms)}</span> PM
            </span>
          )}
          {unidade && d.pms === undefined && (
            <span className="w-12 shrink-0 text-right text-[11px] text-white/40">{unidade}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Funil de rastreabilidade: recebido → auditou → cumpriu mínimo → com IDs. */
export function FunilRastreio({ etapas }: { etapas: { etapa: string; v: number }[] }) {
  const base = Math.max(1, etapas[0]?.v ?? 1);
  return (
    <ol className="space-y-2.5">
      {etapas.map((e, i) => {
        const p = (e.v / base) * 100;
        return (
          <li key={e.etapa}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-white/80">{e.etapa}</span>
              <span className={`${T.dado} text-white/55`}>
                {FMT.format(e.v)} · {PCT.format(p)}%
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded bg-white/10">
              <div
                className="bf-barra flex h-full items-center justify-end rounded pr-2 text-[11px] font-bold text-white"
                style={{
                  ...atraso(i, 70),
                  width: `${Math.max(9, p)}%`,
                  background: `linear-gradient(90deg, #7a0101, ${INST.vermelho})`,
                  opacity: 1 - i * 0.08,
                }}
              >
                {FMT.format(e.v)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
