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
  Cell,
  LabelList,
} from "recharts";

/* Dados agregados reais — p2_kpi_agregados (Supabase soic-16bpmm).
   Sem coordenadas, sem endereço, sem dado pessoal: a vitrine é pública. */

const NATUREZA = [
  { natureza: "Tráfico de drogas", valor: 2435, destaque: true },
  { natureza: "Procurado", valor: 393, destaque: false },
  { natureza: "Roubo (outros)", valor: 188, destaque: false },
  { natureza: "Violência doméstica", valor: 89, destaque: false },
  { natureza: "Receptação", valor: 86, destaque: false },
  { natureza: "Jogo de azar", valor: 73, destaque: false },
  { natureza: "Roubo de carga", valor: 69, destaque: false },
  { natureza: "Furto (outros)", valor: 67, destaque: false },
  { natureza: "Desmanche", valor: 65, destaque: false },
  { natureza: "Crime ambiental", valor: 59, destaque: false },
  { natureza: "Roubo de veículos", valor: 56, destaque: false },
  { natureza: "Estupro", valor: 51, destaque: false },
];

const IMPACTO = [
  { mes: "nov/25", rotulo: "novembro/2025", valor: 20, parcial: false },
  { mes: "dez/25", rotulo: "dezembro/2025", valor: 22, parcial: false },
  { mes: "jan/26", rotulo: "janeiro/2026", valor: 32, parcial: false },
  { mes: "fev/26", rotulo: "fevereiro/2026", valor: 36, parcial: false },
  { mes: "mar/26", rotulo: "março/2026", valor: 37, parcial: false },
  { mes: "abr/26", rotulo: "abril/2026", valor: 51, parcial: false },
  { mes: "mai/26", rotulo: "maio/2026", valor: 27, parcial: false },
  { mes: "jun/26", rotulo: "junho/2026", valor: 27, parcial: false },
  { mes: "jul/26", rotulo: "julho/2026", valor: 18, parcial: true },
];

const AZUL = "#305388";
const VERMELHO = "#d53441";

function TooltipNatureza({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = ((d.valor / 3930) * 100).toFixed(1).replace(".", ",");
  return (
    <div className="rounded-lg border border-borda bg-branco px-3 py-2 text-xs shadow-inst">
      <p className="font-semibold text-azul-noite">{d.natureza}</p>
      <p className="mt-0.5" style={{ color: d.destaque ? VERMELHO : AZUL }}>
        {d.valor.toLocaleString("pt-BR")} denúncias ·{" "}
        <span className="text-texto-suave">{pct}% do total</span>
      </p>
    </div>
  );
}

function TooltipImpacto({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-borda bg-branco px-3 py-2 text-xs shadow-inst">
      <p className="font-semibold text-azul-noite">{d.rotulo}</p>
      <p className="mt-0.5" style={{ color: AZUL }}>
        {d.valor} prisões
        {d.parcial && <span className="text-texto-suave"> · mês em curso</span>}
      </p>
    </div>
  );
}

/** Denúncias por natureza — o que a população efetivamente reporta. */
export function DenunciasNaturezaChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={NATUREZA}
          layout="vertical"
          margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke="#23303f14" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#8b93a7" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="natureza"
            width={158}
            tick={{ fontSize: 12, fill: "#1b1a1f", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<TooltipNatureza />} cursor={{ fill: "#23303f0a" }} />
          <Bar dataKey="valor" radius={4} isAnimationActive animationDuration={900}>
            {NATUREZA.map((d) => (
              <Cell key={d.natureza} fill={d.destaque ? VERMELHO : AZUL} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(v: unknown) => Number(v).toLocaleString("pt-BR")}
              style={{ fontSize: 12, fontWeight: 700, fill: "#1b1a1f" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Operação Impacto — prisões por mês, nov/2025 a jul/2026. */
export function ImpactoMensalChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={IMPACTO} margin={{ top: 16, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="#23303f14" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: "#8b93a7" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8b93a7" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<TooltipImpacto />} cursor={{ stroke: "#23303f22" }} />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={AZUL}
            strokeWidth={2}
            dot={{ r: 4, fill: AZUL, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: AZUL, stroke: "#fcfeff", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={900}
          >
            <LabelList
              dataKey="valor"
              position="top"
              style={{ fontSize: 11, fontWeight: 700, fill: "#55535e" }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
