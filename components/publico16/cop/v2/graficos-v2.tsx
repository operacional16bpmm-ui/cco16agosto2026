"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Nivel, LinhaFracao, ProgressoSemana } from "@/lib/cop2026-metricas";
import { cn } from "@/lib/utils";

const FMT = new Intl.NumberFormat("pt-BR");
const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const COR_NIVEL: Record<Nivel, string> = {
  superacao: "#3b82f6",
  critico: "#ef4444",
  atencao: "#f59e0b",
  conforme: "#10b981",
  neutro: "#94a3b8",
};

const ROTULO_NIVEL: Record<Nivel, string> = {
  superacao: "Superação",
  critico: "Crítica",
  atencao: "Atenção",
  conforme: "Conformidade",
  neutro: "Sem Dados",
};

const GRID_DARK = "#ffffff10";
const EIXO_DARK = { fill: "#94a3b8", fontSize: 11 };
const TOOLTIP_DARK = {
  contentStyle: {
    backgroundColor: "#0b1220",
    borderColor: "#ffffff1a",
    borderRadius: "0.75rem",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    fontSize: "12px",
    color: "#f8fafc",
  },
};

export function SeloV2({ nivel }: { nivel: Nivel }) {
  const styles: Record<Nivel, string> = {
    superacao: "border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
    critico: "border-red-500/40 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]",
    atencao: "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
    conforme: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    neutro: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
        styles[nivel]
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: COR_NIVEL[nivel] }}
        aria-hidden
      />
      {ROTULO_NIVEL[nivel]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Agulhão Executivo V2 (Dark Glass)
// ---------------------------------------------------------------------------
export function AgulhaoMetasV2({
  pct,
  total,
  meta,
  titulo = "Ritmo Operacional do Efetivo",
  subtitulo = "Desempenho consolidado no ciclo de 960 evidências",
}: {
  pct: number;
  total: number;
  meta: number;
  titulo?: string;
  subtitulo?: string;
}) {
  const angulo = useMemo(() => {
    const lim = Math.max(0, Math.min(100, pct));
    return -90 + (lim / 100) * 180;
  }, [pct]);

  const nivel: Nivel = pct > 100 ? "superacao" : pct >= 80 ? "conforme" : pct >= 50 ? "atencao" : "critico";

  const polarParaCartesiano = (cx: number, cy: number, r: number, angGraus: number) => {
    const rad = ((angGraus - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const descreverArco = (cx: number, cy: number, r: number, startAng: number, endAng: number) => {
    const start = polarParaCartesiano(cx, cy, r, endAng);
    const end = polarParaCartesiano(cx, cy, r, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  const cx = 150;
  const cy = 135;
  const r = 95;
  const espessura = 18;

  const dVermelho = descreverArco(cx, cy, r, -90, 0);
  const dAmarelo = descreverArco(cx, cy, r, 0, 54);
  const dVerde = descreverArco(cx, cy, r, 54, 90);

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#131e34]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="w-full text-center">
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-white">
          {titulo}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400 font-medium">{subtitulo}</p>
      </div>

      <div className="relative my-1 flex w-full max-w-[280px] items-center justify-center">
        <svg
          viewBox="0 0 300 180"
          className="w-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
          aria-label={`Velocímetro indicando ${PCT.format(pct)}% da meta atingida`}
          role="img"
        >
          <defs>
            <linearGradient id="v2-vermelho" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="v2-amarelo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="v2-verde" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="v2-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Arcos das 3 zonas de meta */}
          <path
            d={dVermelho}
            fill="none"
            stroke="url(#v2-vermelho)"
            strokeWidth={espessura}
            strokeLinecap="round"
            className="opacity-90"
          />
          <path
            d={dAmarelo}
            fill="none"
            stroke="url(#v2-amarelo)"
            strokeWidth={espessura}
            className="opacity-90"
          />
          <path
            d={dVerde}
            fill="none"
            stroke="url(#v2-verde)"
            strokeWidth={espessura}
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Marcas de escala */}
          <text x="35" y="152" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
            0%
          </text>
          <text x="150" y="30" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
            50%
          </text>
          <text x="228" y="55" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">
            80%
          </text>
          <text x="265" y="152" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
            100%
          </text>

          {/* Agulha tática com rotação dinâmica */}
          <g
            transform={`rotate(${angulo}, ${cx}, ${cy})`}
            className="transition-transform duration-1000 ease-out"
          >
            <polygon
              points={`${cx - 3.5},${cy} ${cx + 3.5},${cy} ${cx},${cy - 85}`}
              fill="#f8fafc"
              filter="url(#v2-glow)"
            />
            <circle cx={cx} cy={cy} r="8" fill="#ca0202" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Métrica Central de Alto Impacto */}
      <div className="text-center mt-1">
        <p className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
          {PCT.format(pct)}%
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          <strong className="text-white font-extrabold">{FMT.format(total)}</strong> de{" "}
          <span className="text-slate-400">{FMT.format(meta)} evidências</span>
        </p>
        <div className="mt-2.5">
          <SeloV2 nivel={nivel} />
        </div>
      </div>

      {/* Régua de Faixas de Desempenho */}
      <div className="mt-4 grid w-full grid-cols-4 gap-1 border-t border-white/10 pt-3 text-center">
        <div className="rounded-lg border border-red-500/20 bg-red-950/40 p-1.5">
          <span className="block text-[11px] font-bold text-red-400">Crítica</span>
          <span className="text-[9px] text-slate-400">&lt; 50% · Abaixo da Meta</span>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/40 p-1.5">
          <span className="block text-[11px] font-bold text-amber-300">50% a 79%</span>
          <span className="text-[9px] text-slate-400">Atenção</span>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/40 p-1.5">
          <span className="block text-[11px] font-bold text-emerald-400">80% a 100%</span>
          <span className="text-[9px] text-slate-400">Conformidade</span>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-950/40 p-1.5">
          <span className="block text-[11px] font-bold text-blue-400">&gt; 100%</span>
          <span className="text-[9px] text-slate-400">Superação</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quadro Semanal V2 (4 Blocos Escuros Elegantes)
// ---------------------------------------------------------------------------
export function QuadroSemanalV2({
  semanas,
  semanaAtiva,
  onSelecionarSemana,
}: {
  semanas: ProgressoSemana[];
  semanaAtiva?: string;
  onSelecionarSemana?: (semana: string) => void;
}) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {semanas.map((s) => {
        const ativa = semanaAtiva === String(s.semana);
        return (
          <button
            key={s.semana}
            type="button"
            onClick={() => onSelecionarSemana?.(ativa ? "todas" : String(s.semana))}
            className={cn(
              "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 backdrop-blur-md",
              ativa
                ? "border-ouro bg-gradient-to-b from-ouro/20 via-[#18233c] to-[#0d1627] shadow-[0_0_25px_rgba(212,175,55,0.25)] ring-2 ring-ouro/60"
                : "border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 hover:border-ouro/40 hover:bg-white/[0.04] shadow-xl"
            )}
            aria-pressed={ativa}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-serif text-sm font-bold text-white group-hover:text-ouro transition-colors">
                {s.rotulo}
              </span>
              <SeloV2 nivel={s.nivel} />
            </div>
            <p className="mt-0.5 text-[11.5px] text-slate-400 font-medium">Dias {s.diasRotulo}</p>

            <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {FMT.format(s.feito)}
                <span className="text-xs font-normal text-slate-400"> / {FMT.format(s.meta)}</span>
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-extrabold",
                  s.pct > 100
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                    : s.pct >= 80
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : s.pct >= 50
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : s.pct > 0
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : "bg-white/5 text-slate-400"
                )}
              >
                {PCT.format(s.pct)}%
              </span>
            </div>

            {/* Barra de Progresso com Brilho Neon */}
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 shadow-sm"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  backgroundColor: COR_NIVEL[s.nivel],
                }}
              />
            </div>

            <p className="mt-2.5 text-xs text-slate-400 font-medium">
              {s.falta > 0 ? (
                <>
                  Faltam <strong className="font-bold text-white">{FMT.format(s.falta)}</strong> p/ meta
                </>
              ) : (
                <span className="font-bold text-emerald-400">Meta semanal atingida</span>
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranking das Frações V2 (Estilo Dark Muralha Executivo)
// ---------------------------------------------------------------------------
export function RankingFracoesV2({
  dados,
  onSelecionar,
}: {
  dados: LinhaFracao[];
  onSelecionar?: (chave: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {dados.map((d) => (
        <li key={d.chave}>
          <div className="group rounded-2xl border border-white/10 bg-gradient-to-r from-[#131d31]/95 via-[#0d1627]/95 to-[#080e1b]/95 p-4 text-left transition-all hover:border-ouro/40 hover:shadow-2xl shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => onSelecionar?.(d.chave)}
              className="w-full text-left focus-visible:outline-2 focus-visible:outline-ouro"
              aria-label={`Filtrar por ${d.rotulo}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-white group-hover:text-ouro transition-colors">
                    {d.rotulo}
                  </span>
                  <SeloV2 nivel={d.nivel} />

                  {/* Badge de Cota no Padrão Muralha */}
                  {d.pctBatalhao !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-black/60 bg-[#070b14] px-2.5 py-1 text-[11.5px] font-bold text-white shadow-md">
                      <span>Cota: {PCT.format(d.pctBatalhao)}%</span>
                      <span className="font-black text-[#ef4444]">({FMT.format(d.meta)})</span>
                    </span>
                  )}
                </div>

                {/* Caixa de Produção com Cores Semafóricas */}
                <div
                  className={cn(
                    "rounded-xl border px-3 py-1 text-sm font-black shadow-md transition-colors",
                    d.pct > 100
                      ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                      : d.pct >= 80
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : d.pct >= 50
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-red-500/40 bg-red-500/15 text-red-400"
                  )}
                >
                  <span>
                    {FMT.format(d.feito)} / {FMT.format(d.meta)}
                  </span>
                  <span className="ml-1.5 opacity-80">· {PCT.format(d.pct)}%</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(100, d.pct)}%`,
                    backgroundColor: COR_NIVEL[d.nivel],
                  }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>
                  <strong className="font-bold text-white">{FMT.format(d.lancaram)}</strong> de{" "}
                  <span className="font-semibold text-slate-300">{FMT.format(d.efetivo)}</span> auditores
                  {d.efetivoQuadro ? ` (quadro total: ${FMT.format(d.efetivoQuadro)} PMs)` : ""}
                </span>
                <span>
                  {d.falta > 0 ? (
                    <>
                      Faltam <strong className="font-bold text-white">{FMT.format(d.falta)}</strong> (
                      {FMT.format(Math.ceil(d.ritmoNecessario))}/turno em {FMT.format(d.turnosRestantes)} rest.)
                    </>
                  ) : (
                    <span className="font-bold text-emerald-400">Meta 100% cumprida</span>
                  )}
                </span>
              </div>
            </button>

            {/* Evolução Semanal da Companhia */}
            {d.semanas && d.semanas.length > 0 && (
              <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-white/10 pt-3">
                {d.semanas.map((s) => (
                  <div
                    key={s.semana}
                    className="rounded-xl border border-white/5 bg-[#080e1b]/80 p-2 text-center"
                  >
                    <span className="block text-[10.5px] font-bold uppercase text-slate-400">
                      Semana {s.semana}
                    </span>
                    <span className="mt-0.5 block text-xs font-black text-white">
                      {FMT.format(s.feito)} / {FMT.format(s.meta)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 inline-block text-[10px] font-bold",
                        s.pct > 100 ? "text-blue-400" : s.pct >= 80 ? "text-emerald-400" : s.pct >= 50 ? "text-amber-400" : s.pct > 0 ? "text-red-400" : "text-slate-500"
                      )}
                    >
                      {PCT.format(s.pct)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Gráfico de Produção Diária V2 (Dark Mode)
// ---------------------------------------------------------------------------
export function ProducaoDiariaV2({
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
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={dados} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID_DARK} vertical={false} />
        <XAxis dataKey="rotulo" tick={EIXO_DARK} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO_DARK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          {...TOOLTIP_DARK}
          formatter={(v, n) => [
            `${FMT.format(Number(v ?? 0))} evidências`,
            n === "v" ? "Lançadas no Dia" : String(n),
          ]}
        />
        {lic > 0 && lsc > lic && (
          <ReferenceArea y1={lic} y2={lsc} fill="#ffffff" fillOpacity={0.03} />
        )}
        <ReferenceLine
          y={mediaDia}
          stroke="#94a3b8"
          strokeDasharray="3 3"
          label={{ value: `Média (${FMT.format(mediaDia)})`, fill: "#94a3b8", fontSize: 10 }}
        />
        {metaDia > 0 && (
          <ReferenceLine
            y={metaDia}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: `Meta/Dia (${FMT.format(metaDia)})`, fill: "#ef4444", fontSize: 10 }}
          />
        )}
        <Bar dataKey="v" fill="#dc2626" radius={[4, 4, 0, 0]}>
          {dados.map((d) => (
            <Cell
              key={d.data}
              fill="#dc2626"
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Barras Simples V2 (Dark Mode)
// ---------------------------------------------------------------------------
export function BarrasSimplesV2({
  dados,
  titulo,
}: {
  dados: { rotulo: string; v: number; pms?: number }[];
  titulo?: string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.v));
  return (
    <div>
      {titulo && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{titulo}</p>}
      <ul className="space-y-2.5">
        {dados.map((d) => (
          <li key={d.rotulo} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs font-medium text-slate-300">{d.rotulo}</span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 shadow-sm"
                style={{ width: `${(d.v / max) * 100}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-bold text-white">
              {FMT.format(d.v)}
            </span>
            {d.pms !== undefined && (
              <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
                <strong className="text-slate-200">{FMT.format(d.pms)}</strong> PMs
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
