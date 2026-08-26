"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";

const DADOS = [
  { metrica: "Abordagens de carros", valor: 231, tipo: "esforco" as const },
  { metrica: "Apreensão de entorpecentes", valor: 546, tipo: "esforco" as const },
  { metrica: "Veículos recuperados", valor: -37, tipo: "resultado" as const },
  { metrica: "Flagrantes", valor: -27, tipo: "resultado" as const },
];

const COR = { esforco: "#305388", resultado: "#d53441" };

function TooltipCustom({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-borda bg-branco px-3 py-2 text-xs shadow-inst">
      <p className="font-semibold text-azul-noite">{d.metrica}</p>
      <p className="mt-0.5" style={{ color: COR[d.tipo as keyof typeof COR] }}>
        {d.valor > 0 ? "+" : ""}
        {d.valor}% ·{" "}
        <span className="text-texto-suave">
          {d.tipo === "esforco" ? "esforço em alta" : "resultado em queda"}
        </span>
      </p>
    </div>
  );
}

export function ProblemaChart() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-texto-suave">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR.esforco }} />
          Esforço em alta
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR.resultado }} />
          Resultado em queda
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={DADOS} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="#23303f14" horizontal={false} />
          <XAxis type="number" domain={[-100, 600]} tick={{ fontSize: 11, fill: "#8b93a7" }} axisLine={false} tickLine={false} unit="%" />
          <YAxis
            type="category"
            dataKey="metrica"
            width={170}
            tick={{ fontSize: 12, fill: "#1b1a1f", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="#231e2433" />
          <Tooltip content={<TooltipCustom />} cursor={{ fill: "#23303f0a" }} />
          <Bar dataKey="valor" radius={4} isAnimationActive animationDuration={900}>
            {DADOS.map((d) => (
              <Cell key={d.metrica} fill={COR[d.tipo]} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v: unknown) => {
                const n = Number(v);
                return `${n > 0 ? "+" : ""}${n}%`;
              }}
              style={{ fontSize: 12, fontWeight: 700, fill: "#1b1a1f" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
