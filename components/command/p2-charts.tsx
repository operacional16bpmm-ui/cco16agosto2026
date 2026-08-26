"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const eixo = { fontSize: 11, fill: "#55535e" };
const grid = "#1d1d1d1f";
const tooltipStyle = {
  contentStyle: { background: "#1d1d1d", border: "1px solid #c4c8cc", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#fff" },
};

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-07" → "jul/26". Chaves fora do padrão YYYY-MM voltam como vieram. */
function formatarMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const abrev = MESES_ABREV[Number(mes) - 1];
  return abrev ? `${abrev}/${ano.slice(2)}` : chave;
}

export function DisqueDenunciaChart({
  data,
}: {
  data: { mes: string; pendente?: number | null; encerrada?: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        {/* tickFormatter encurta o rótulo e interval="preserveStartEnd" evita
            que o Recharts esconda quase todos os meses por colisão — antes
            só "2026-07" (o último) sobrava visível. */}
        <XAxis
          dataKey="mes"
          tick={eixo}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatarMes}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(label) => formatarMes(String(label ?? ""))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {/* connectNulls (default false): mês sem dado na fonte vira gap
            visível, não um 0 fabricado que faria a linha despencar. */}
        <Line type="monotone" dataKey="encerrada" name="Encerradas" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} />
        <Line type="monotone" dataKey="pendente" name="Pendentes" stroke="#ded845" strokeWidth={2.5} dot={{ r: 3, fill: "#ded845" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function NaturezaBarChart({ data }: { data: { natureza: string; total: number }[] }) {
  // kpiSerie (lib/db.ts) ordena por chave alfabética (correto para séries
  // mensais YYYY-MM) — para um ranking como este, é preciso reordenar por
  // valor aqui antes do corte, senão o top-8 sai em ordem A-Z em vez de
  // maior→menor frequência.
  const top = [...data].sort((a, b) => b.total - a.total).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={grid} horizontal={false} />
        <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="natureza"
          tick={{ ...eixo, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="total" name="Ocorrências" fill="#305388" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProcuradosPorCiaChart({ data }: { data: { cia: string; total: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: `${d.cia}ª Cia` }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="label" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="total" name="Procurados" fill="#d53441" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CapturaSspChart({ data }: { data: { mes: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="total" name="Capturas" fill="#ded845" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
