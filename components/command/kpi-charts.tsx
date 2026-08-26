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
  ReferenceLine,
} from "recharts";

const eixo = { fontSize: 11, fill: "#55535e" };
const grid = "#1d1d1d1f";

export function TempoRespostaChart({
  data,
}: {
  data: { mes: string; deteccao_despacho: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} unit="s" />
        <Tooltip
          contentStyle={{
            background: "#1d1d1d",
            border: "1px solid #c4c8cc",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#fff" }}
          formatter={(v) => [`${v}s`, "Detecção→despacho"]}
        />
        {/* ifOverflow="extendDomain": sem isso, o Recharts descarta a linha
            quando y=60 fica fora do range do eixo (comum com poucos dados
            reais ou o placeholder [0,0]) — a meta ficava invisível. */}
        <ReferenceLine
          y={60}
          ifOverflow="extendDomain"
          stroke="#ded845"
          strokeDasharray="4 4"
          label={{ value: "meta 60s", fill: "#ded845", fontSize: 10, position: "insideTopRight" }}
        />
        <Line type="monotone" dataKey="deteccao_despacho" stroke="#305388" strokeWidth={2.5} dot={{ r: 3, fill: "#305388" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ResultadosChart({
  data,
}: {
  data: { mes: string; recuperados: number; flagrantes: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "#1d1d1d",
            border: "1px solid #c4c8cc",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#fff" }}
        />
        <Bar dataKey="recuperados" name="Veículos recuperados" fill="#34d399" radius={[3, 3, 0, 0]} />
        <Bar dataKey="flagrantes" name="Flagrantes" fill="#d53441" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
