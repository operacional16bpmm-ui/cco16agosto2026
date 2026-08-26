"use client";

/**
 * Gráficos do painel da Auditoria de COP.
 *
 * Divisão de trabalho: o que tem eixo, tooltip e leitura de valor exato vai
 * para o Recharts — a mesma biblioteca já usada em `components/command` e
 * `components/dejem`, para o portal inteiro falar uma língua só. O que é
 * comparação de barra contra barra (ranking, funil, dispersão, matriz)
 * continua em CSS: a lib faz pior e pesa mais.
 */
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DIAS,
  FAIXAS_HORA,
  FMT,
  PCT,
  type LinhaFracao,
  type Nivel,
} from "@/lib/cop2026-metricas";
import { COR_NIVEL, Selo } from "./primitivos";

const VERM = "#ca0202";
const OURO = "#a3121d";
const EIXO = { fontSize: 11, fill: "#55535e" };
const GRID = "#1d1d1d1f";
const TOOLTIP = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #c4c8cc",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(22, 41, 74, 0.12)",
  },
  labelStyle: { color: "#1d1d1d", fontWeight: 700 },
} as const;

// ---------------------------------------------------------------------------
export function ProducaoDiaria({
  dados,
  mediaDia,
  lsc,
  lic,
  metaDia,
}: {
  dados: { data: string; rotulo: string; v: number }[];
  mediaDia: number;
  lsc: number;
  lic: number;
  metaDia: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={dados} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="areaCop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VERM} stopOpacity={0.35} />
            <stop offset="100%" stopColor={VERM} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="rotulo" tick={EIXO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
        {/* Faixa de variação normal do Batalhão (±3σ). ifOverflow="extendDomain"
            para a banda não sumir quando o range dos dados é estreito. */}
        {lsc > 0 && (
          <ReferenceArea
            y1={lic}
            y2={lsc}
            ifOverflow="extendDomain"
            fill="#55535e"
            fillOpacity={0.07}
          />
        )}
        {mediaDia > 0 && (
          <ReferenceLine y={mediaDia} stroke="#55535e" strokeDasharray="3 5" ifOverflow="extendDomain" />
        )}
        {metaDia > 0 && (
          <ReferenceLine
            y={metaDia}
            stroke={OURO}
            strokeDasharray="6 5"
            ifOverflow="extendDomain"
            label={{
              value: `meta/turno ${FMT.format(Math.round(metaDia))}`,
              fill: OURO,
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
        )}
        <Tooltip
          {...TOOLTIP}
          formatter={(v) => [FMT.format(Number(v ?? 0)), "Evidências"]}
          labelFormatter={(l) => `Dia ${l}`}
        />
        <Area type="monotone" dataKey="v" stroke="none" fill="url(#areaCop)" />
        <Line
          type="monotone"
          dataKey="v"
          stroke={VERM}
          strokeWidth={2.5}
          dot={{ r: 3, fill: VERM }}
          activeDot={{ r: 5 }}
          name="Evidências"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Histograma({ dados }: { dados: { faixa: string; q: number; conforme: boolean }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="faixa" tick={EIXO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          {...TOOLTIP}
          cursor={{ fill: "#1d1d1d0a" }}
          formatter={(v) => [FMT.format(Number(v ?? 0)), "Lançamentos"]}
          labelFormatter={(l) => `${l} evidência(s) no turno`}
        />
        <Bar dataKey="q" radius={[4, 4, 0, 0]}>
          {dados.map((d) => (
            <Cell key={d.faixa} fill={d.conforme ? VERM : "#c4c8cc"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Pareto({
  dados,
  onSelecionar,
}: {
  dados: { nome: string; v: number; acumulado: number }[];
  onSelecionar?: (nome: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart
        data={dados}
        margin={{ top: 12, right: 8, left: -18, bottom: 46 }}
        onClick={(e) => {
          const nome = e?.activeLabel;
          if (typeof nome === "string" && onSelecionar) onSelecionar(nome);
        }}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="nome"
          tick={{ ...EIXO, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-38}
          textAnchor="end"
          interval={0}
          height={54}
        />
        <YAxis yAxisId="e" tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          yAxisId="a"
          orientation="right"
          domain={[0, 100]}
          unit="%"
          tick={{ ...EIXO, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          {...TOOLTIP}
          cursor={{ fill: "#1d1d1d0a" }}
          formatter={(v, n) =>
            n === "acumulado"
              ? [`${PCT.format(Number(v ?? 0))}%`, "Acumulado"]
              : [FMT.format(Number(v ?? 0)), "Evidências"]
          }
        />
        <ReferenceLine yAxisId="a" y={80} stroke={OURO} strokeDasharray="4 4" />
        <Bar yAxisId="e" dataKey="v" fill={VERM} radius={[4, 4, 0, 0]} className="cursor-pointer" />
        <Line
          yAxisId="a"
          type="monotone"
          dataKey="acumulado"
          stroke={OURO}
          strokeWidth={2}
          dot={{ r: 2.5, fill: OURO }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// CSS puro
// ---------------------------------------------------------------------------
export function RankingFracoes({
  dados,
  onSelecionar,
}: {
  dados: LinhaFracao[];
  onSelecionar?: (chave: string) => void;
}) {
  return (
    <ul className="space-y-3.5">
      {dados.map((d) => (
        <li key={d.chave}>
          <button
            type="button"
            onClick={() => onSelecionar?.(d.chave)}
            className="w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-branco/[0.04] focus-visible:outline-2 focus-visible:outline-vermelho"
            aria-label={`Filtrar por ${d.rotulo} — ${PCT.format(d.pct)}% da meta`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-branco">
                {d.rotulo}
                <Selo nivel={d.nivel} />
              </span>
              <span className="dados text-[12.5px] text-texto-suave">
                {FMT.format(d.feito)} / {FMT.format(d.meta)} · {PCT.format(d.pct)}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-branco/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, d.pct)}%`, background: COR_NIVEL[d.nivel] }}
              />
            </div>
            <p className="mt-1 text-[11.5px] text-texto-suave">
              <span className="dados">{FMT.format(d.lancaram)}</span> de{" "}
              <span className="dados">{FMT.format(d.efetivo)}</span> auditores lançaram ·{" "}
              {d.falta > 0
                ? `Faltam ${FMT.format(d.falta)} · ${FMT.format(
                    Math.ceil(d.ritmoNecessario)
                  )} por turno nos ${FMT.format(d.turnosRestantes)} restantes`
                : "Meta cumprida."}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BarrasSimples({
  dados,
  titulo,
}: {
  dados: { rotulo: string; v: number; pms?: number }[];
  titulo?: string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.v));
  return (
    <div>
      {titulo && <p className="mb-2 rotulo-dado text-texto-suave">{titulo}</p>}
      <ul className="space-y-2.5">
        {dados.map((d) => (
          <li key={d.rotulo} className="flex items-center gap-3" title={`${d.rotulo}: ${FMT.format(d.v)}`}>
            <span className="w-36 shrink-0 truncate text-[12.5px] text-texto-suave">{d.rotulo}</span>
            <div className="h-3.5 flex-1 overflow-hidden rounded bg-branco/10">
              <div className="h-full rounded bg-vermelho/85" style={{ width: `${(d.v / max) * 100}%` }} />
            </div>
            <span className="dados w-12 shrink-0 text-right text-[12.5px] text-texto-suave">
              {FMT.format(d.v)}
            </span>
            {d.pms !== undefined && (
              <span className="w-16 shrink-0 text-right text-[11.5px] text-texto-suave">
                <span className="dados">{FMT.format(d.pms)}</span> PM
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Boxplot({
  dados,
}: {
  dados: { rotulo: string; min: number; q1: number; med: number; q3: number; p90: number; max: number; n: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.max));
  const px = (v: number) => `${(v / max) * 100}%`;
  return (
    <ul className="space-y-4">
      {dados.map((d) => (
        <li
          key={d.rotulo}
          title={`${d.rotulo}: mínimo ${FMT.format(d.min)}, q1 ${FMT.format(d.q1)}, mediana ${FMT.format(
            d.med
          )}, q3 ${FMT.format(d.q3)}, p90 ${FMT.format(d.p90)}, máximo ${FMT.format(d.max)}`}
        >
          <div className="flex flex-wrap justify-between gap-x-3 text-[12.5px]">
            <span className="font-bold text-branco">{d.rotulo}</span>
            <span className="dados text-texto-suave">
              med {FMT.format(d.med)} · p90 {FMT.format(d.p90)} · n={FMT.format(d.n)}
            </span>
          </div>
          <div className="relative mt-2 h-6">
            <div className="absolute inset-y-1/2 h-px w-full bg-branco/15" />
            <div
              className="absolute inset-y-1 rounded bg-vermelho/25 ring-1 ring-vermelho/50"
              style={{ left: px(d.q1), width: px(Math.max(0.001, d.q3 - d.q1)) }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-branco" style={{ left: px(d.med) }} />
            <div className="absolute inset-y-1.5 w-0.5 bg-ouro-velho" style={{ left: px(d.p90) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Heatmap({ matriz, max }: { matriz: number[][]; max: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1">
        <caption className="sr-only">Evidências auditadas por dia da semana e faixa de horário</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Dia
            </th>
            {FAIXAS_HORA.map((f) => (
              <th key={f} scope="col" className="pb-1 rotulo-dado text-texto-suave">
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.map((linha, d) => (
            <tr key={DIAS[d]}>
              <th scope="row" className="pr-2 text-right text-[12px] font-medium text-texto-suave">
                {DIAS[d]}
              </th>
              {linha.map((v, i) => (
                <td key={FAIXAS_HORA[i]}>
                  <div
                    title={`${DIAS[d]}, ${FAIXAS_HORA[i]}h: ${FMT.format(v)} evidências`}
                    className="dados flex h-9 items-center justify-center rounded text-[12px] font-bold"
                    style={{
                      background: v ? `rgba(202,2,2,${0.12 + (v / max) * 0.72})` : "rgba(29,29,29,0.05)",
                      color: v / max > 0.45 ? "#fff" : "#1d1d1d",
                    }}
                  >
                    {v || ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Funil({ etapas }: { etapas: { etapa: string; v: number }[] }) {
  const base = Math.max(1, etapas[0]?.v ?? 1);
  return (
    <ol className="space-y-3">
      {etapas.map((e, i) => {
        const p = (e.v / base) * 100;
        return (
          <li key={e.etapa}>
            <div className="flex flex-wrap justify-between gap-x-3 text-[12.5px]">
              <span className="text-branco/85">{e.etapa}</span>
              <span className="dados text-texto-suave">
                {FMT.format(e.v)} · {PCT.format(p)}%
              </span>
            </div>
            <div className="mt-1.5 h-6 overflow-hidden rounded bg-branco/10">
              <div
                className="dados flex h-full items-center justify-end rounded bg-gradient-to-r from-[#7a0101] to-[#ca0202] pr-3 text-[11.5px] font-bold text-white transition-all duration-700"
                style={{ width: `${Math.max(8, p)}%`, opacity: 1 - i * 0.1 }}
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

export type { Nivel };
