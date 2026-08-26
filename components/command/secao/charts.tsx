"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Tema institucional claro (padrão intranet PMESP): eixos grafite suave,
// grade cinza discreta e tooltip escuro para contraste sobre fundo branco.
const eixo = { fontSize: 11, fill: "#55535e" };
const grid = "#1d1d1d1f";
const tooltipStyle = {
  contentStyle: { background: "#1d1d1d", border: "1px solid #c4c8cc", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#fff" },
};

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-07" → "jul/26". Chave fora do padrão YYYY-MM volta como veio. */
function formatarMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const abrev = MESES_ABREV[Number(mes) - 1];
  return abrev ? `${abrev}/${ano.slice(2)}` : chave;
}

/**
 * Série mensal genérica (1 ou mais linhas). Meses sem linha na fonte não
 * aparecem no array de entrada — o Recharts simplesmente não desenha esse
 * ponto (gap, não zero fabricado). Corrige o padrão que causou o bug B7 do
 * P2 (eixo colapsado por falta de tickFormatter/interval).
 */
export function SerieMensalChart({
  data,
  series,
  altura = 240,
}: {
  data: ({ chave: string } & Record<string, number | string | null>)[];
  series: { key: string; nome: string; cor: string }[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis
          dataKey="chave"
          tick={eixo}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatarMes}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(label) => formatarMes(String(label ?? ""))} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.nome}
            stroke={s.cor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: s.cor }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Comparativo por Companhia — barras verticais, uma por Cia (1ª–7ª). */
export function ComparativoCia({
  data,
  altura = 220,
  cor = "#305388",
}: {
  data: { cia: number; valor: number }[];
  altura?: number;
  cor?: string;
}) {
  const formatado = data.map((d) => ({ ...d, label: `${d.cia}ª Cia` }));
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={formatado} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="valor" name="Total" fill={cor} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Ranking horizontal top-N. Reordena por valor decrescente aqui também
 * (defensivo) mesmo que o fetcher (rankingDimensao) já entregue ordenado —
 * foi exatamente confiar só no chamador que causou o bug B6 do P2.
 */
export function RankingBar({
  data,
  altura = 260,
  cor = "#305388",
  unidade,
}: {
  data: { chave: string; valor: number }[];
  altura?: number;
  cor?: string;
  unidade?: string;
}) {
  const ordenado = [...data].sort((a, b) => b.valor - a.valor);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={ordenado} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} unit={unidade} />
        <YAxis
          type="category"
          dataKey="chave"
          tick={{ ...eixo, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="valor" name="Total" fill={cor} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
