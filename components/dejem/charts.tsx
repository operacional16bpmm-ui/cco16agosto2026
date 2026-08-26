"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { MESES_CURTO } from "@/lib/dejem-calculo";

/**
 * Gráficos do estudo DEJEM.
 *
 * Cores em hex literal, e não em token Tailwind, porque o Recharts precisa da
 * cor já resolvida — é a mesma escolha de components/command/secao/charts.tsx.
 * Os hex aqui são exatamente os da paleta institucional da vitrine:
 * azul-noite #16294a, azul #305388, vermelho PM #d53441, ouro-velho #ab9142.
 */

const AZUL = "#305388";
const AZUL_NOITE = "#16294a";
const VERMELHO = "#d53441";
const OURO = "#ab9142";
const VERDE = "#1d6349";

const eixo = { fontSize: 11, fill: "#55535e" };
const grid = "#231e2418";
const tooltipStyle = {
  contentStyle: {
    background: "#16294a",
    border: "1px solid #ab9142",
    borderRadius: 8,
    fontSize: 12,
    color: "#fcfeff",
  },
  labelStyle: { color: "#ded845", fontWeight: 600 },
  itemStyle: { color: "#fcfeff" },
};

const rotuloMes = (m: number | string) => MESES_CURTO[Number(m)] ?? String(m);

/** Oferta × preenchimento mês a mês. Barras = vagas; linha = taxa (eixo dir.). */
export function OfertaVersusPreenchimento({
  data,
  altura = 300,
}: {
  data: { mes: number; vagas: number | null; escalados: number | null; preenchimento: number | null }[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} tickFormatter={rotuloMes} />
        <YAxis yAxisId="q" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="p"
          orientation="right"
          domain={[0, 100]}
          tick={eixo}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => rotuloMes(l as number)} />
        <Bar yAxisId="q" dataKey="vagas" name="Vagas ofertadas" fill="#c9d2df" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="q" dataKey="escalados" name="PMs escalados" fill={AZUL} radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="p"
          type="monotone"
          dataKey="preenchimento"
          name="Preenchimento (%)"
          stroke={VERMELHO}
          strokeWidth={2.5}
          dot={{ r: 4, fill: VERMELHO }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Dispersão oferta × preenchimento: cada ponto é um mês. Serve para mostrar
 * que a queda do preenchimento acompanha o crescimento da oferta — e não uma
 * degradação isolada da unidade.
 */
export function DispersaoOferta({
  pontos,
  reta,
  altura = 300,
}: {
  pontos: { mes: number; vagas: number; preenchimento: number }[];
  reta: { a: number; b: number } | null;
  altura?: number;
}) {
  const xs = pontos.map((p) => p.vagas);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const linha = reta
    ? [
        { vagas: min, preenchimento: reta.a * min + reta.b },
        { vagas: max, preenchimento: reta.a * max + reta.b },
      ]
    : [];
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ScatterChart margin={{ top: 12, right: 16, left: -10, bottom: 12 }}>
        <CartesianGrid stroke={grid} />
        <XAxis
          type="number"
          dataKey="vagas"
          name="Vagas ofertadas"
          tick={eixo}
          axisLine={false}
          tickLine={false}
          domain={["dataMin - 60", "dataMax + 60"]}
          label={{ value: "vagas ofertadas no mês", position: "insideBottom", offset: -6, fontSize: 10, fill: "#8a91a2" }}
        />
        <YAxis
          type="number"
          dataKey="preenchimento"
          name="Preenchimento"
          unit="%"
          tick={eixo}
          axisLine={false}
          tickLine={false}
          domain={[60, 100]}
        />
        <ZAxis range={[130, 131]} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(v, n) => [String(n) === "Preenchimento" ? `${v}%` : String(v), String(n)]}
          labelFormatter={() => ""}
        />
        {linha.length ? (
          <Scatter data={linha} line={{ stroke: OURO, strokeWidth: 1.5, strokeDasharray: "5 4" }} shape={() => <g />} legendType="none" />
        ) : null}
        <Scatter data={pontos} fill={VERMELHO} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontais com destaque opcional de uma linha (o próprio 16º). */
export function BarrasHorizontais({
  data,
  altura = 320,
  cor = AZUL,
  unidade,
  larguraRotulo = 190,
  referencia,
}: {
  data: { chave: string; valor: number; destaque?: boolean }[];
  altura?: number;
  cor?: string;
  unidade?: string;
  larguraRotulo?: number;
  referencia?: { valor: number; rotulo: string };
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 26, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} unit={unidade} />
        <YAxis
          type="category"
          dataKey="chave"
          tick={{ ...eixo, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={larguraRotulo}
        />
        <Tooltip {...tooltipStyle} />
        {referencia ? (
          <ReferenceLine
            x={referencia.valor}
            stroke={OURO}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{ value: referencia.rotulo, position: "top", fontSize: 10, fill: OURO }}
          />
        ) : null}
        <Bar dataKey="valor" name="Total" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.destaque ? VERMELHO : cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras verticais simples (jornadas por Companhia). */
export function BarrasVerticais({
  data,
  altura = 260,
  cor = AZUL,
}: {
  data: { chave: string; valor: number; destaque?: boolean }[];
  altura?: number;
  cor?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="chave" tick={{ ...eixo, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="valor" name="Jornadas" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.destaque ? VERMELHO : cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Curva de concentração (Pareto): % do efetivo × % das jornadas. */
export function CurvaConcentracao({
  curva,
  altura = 300,
}: {
  curva: { pmsPct: number; acumuladoPct: number }[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={curva} margin={{ top: 12, right: 12, left: -12, bottom: 12 }}>
        <defs>
          <linearGradient id="grad-pareto" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VERMELHO} stopOpacity={0.28} />
            <stop offset="100%" stopColor={VERMELHO} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} />
        <XAxis
          dataKey="pmsPct"
          type="number"
          domain={[0, 100]}
          tick={eixo}
          axisLine={false}
          tickLine={false}
          unit="%"
          label={{ value: "% do efetivo, do que mais puxa para o que menos puxa", position: "insideBottom", offset: -6, fontSize: 10, fill: "#8a91a2" }}
        />
        <YAxis domain={[0, 100]} tick={eixo} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`${v}% das jornadas`, ""]}
          labelFormatter={(l) => `${l}% do efetivo`}
        />
        {/* Diagonal = distribuição perfeitamente igualitária. */}
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
          stroke="#8a91a2"
          strokeDasharray="4 4"
        />
        <Area type="monotone" dataKey="acumuladoPct" stroke="none" fill="url(#grad-pareto)" />
        <Line type="monotone" dataKey="acumuladoPct" stroke={VERMELHO} strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Cobertura do log mês a mês — indicador de PROCESSO, não de faltas. */
export function CoberturaLog({
  data,
  altura = 240,
}: {
  data: { mes: number; faltasGerencial: number; nomeadas: number; cobertura: number | null }[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} tickFormatter={rotuloMes} />
        <YAxis yAxisId="q" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={eixo} axisLine={false} tickLine={false} unit="%" />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => rotuloMes(l as number)} />
        <Bar yAxisId="q" dataKey="faltasGerencial" name="Faltas apuradas" fill="#c9d2df" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="q" dataKey="nomeadas" name="Faltas nomeadas" fill={AZUL_NOITE} radius={[3, 3, 0, 0]} />
        <Line yAxisId="p" type="monotone" dataKey="cobertura" name="Cobertura (%)" stroke={VERDE} strokeWidth={2.5} dot={{ r: 4, fill: VERDE }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
