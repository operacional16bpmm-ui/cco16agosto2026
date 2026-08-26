"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

/**
 * Velocímetro genérico (0–100% da meta) — não existia componente de gauge no
 * projeto antes desta página; segue o mesmo tema de cores/tooltip de
 * charts.tsx (RadialBarChart do Recharts em vez de SVG à mão: já ganha
 * responsividade e animação de entrada de graça).
 */
export function Gauge({
  percentual,
  rotulo,
  cor = "#305388",
  altura = 200,
}: {
  percentual: number;
  rotulo?: string;
  cor?: string;
  altura?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percentual));
  const data = [{ nome: rotulo ?? "meta", valor: clamped, fill: cor }];

  return (
    <div className="relative" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={210}
          endAngle={-30}
          innerRadius="70%"
          outerRadius="100%"
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="valor" cornerRadius={8} background={{ fill: "#ffffff14" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight text-branco">{clamped}%</span>
        {rotulo && <span className="mt-1 text-[11px] uppercase tracking-wide text-branco/40">{rotulo}</span>}
      </div>
    </div>
  );
}
