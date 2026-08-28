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
  type ProgressoSemana,
  type Nivel,
} from "@/lib/cop2026-metricas";
import { AlertCircle } from "lucide-react";
import { COR_NIVEL, Selo } from "./primitivos";
import { cn } from "@/lib/utils";

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
// Agulhão Executivo (Velocímetro / Manômetro de Atingimento da Meta)
// ---------------------------------------------------------------------------
export function AgulhaoMetas({
  pct,
  total,
  meta,
  titulo = '16º BPM/M — "1º Ten PM Fernão"',
  subtitulo = "DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
}: {
  pct: number;
  total: number;
  meta: number;
  titulo?: string;
  subtitulo?: string | { linha1: string; linha2?: string };
}) {
  const pctClamped = Math.min(100, Math.max(0, pct));
  const angulo = 180 - pctClamped * 1.8;
  const rad = (angulo * Math.PI) / 180;
  const cx = 140;
  const cy = 125;
  const needleLen = 78;
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy - needleLen * Math.sin(rad);

  const nivel: Nivel = pct >= 80 ? "conforme" : pct >= 50 ? "atencao" : "critico";
  const corAgulha = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#ca0202";

  return (
    <div className="relative overflow-hidden card-interativo flex flex-col items-center justify-between rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      {/* Vídeo de Viatura em Segundo Plano Mais Forte & Marcante */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-65 mix-blend-luminosity scale-110"
      >
        <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/90" />

      {/* Título com Alto Contraste */}
      <div className="relative z-10 w-full text-center">
        <p className="font-serif text-base sm:text-lg font-black uppercase tracking-wider text-[#1d1d1d]">
          {titulo}
        </p>
        {subtitulo && (
          <div className="mt-2 inline-flex items-center justify-center rounded-xl bg-white/95 border border-slate-300/90 px-3.5 py-1.5 shadow-xs backdrop-blur-md max-w-full">
            <span className="text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-wider text-[#ca0202] text-center leading-tight">
              {typeof subtitulo === "string"
                ? subtitulo
                : `${subtitulo.linha1}${subtitulo.linha2 ? ` · ${subtitulo.linha2}` : ""}`}
            </span>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-center">
        <svg viewBox="0 0 280 150" className="h-36 w-68 overflow-visible">
          <defs>
            <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Segmento 1: Vermelho (< 50% = 180° a 90°) */}
          <path
            d="M 45 125 A 95 95 0 0 1 140 30 L 140 57 A 68 68 0 0 0 72 125 Z"
            fill="#ca0202"
            opacity={0.95}
          />

          {/* Segmento 2: Amarelo (50% a 80% = 90° a 36°) */}
          <path
            d="M 140 30 A 95 95 0 0 1 216.85 69.16 L 195.01 85.03 A 68 68 0 0 0 140 57 Z"
            fill="#d97706"
            opacity={0.95}
          />

          {/* Segmento 3: Verde (>= 80% = 36° a 0°) */}
          <path
            d="M 216.85 69.16 A 95 95 0 0 1 235 125 L 208 125 A 68 68 0 0 0 195.01 85.03 Z"
            fill="#16a34a"
            opacity={0.95}
          />

          {/* Divisores sutis entre faixas */}
          <line x1="140" y1="30" x2="140" y2="57" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
          <line x1="216.85" y1="69.16" x2="195.01" y2="85.03" stroke="#ffffff" strokeWidth="2" opacity="0.8" />

          {/* Agulha Indicadora */}
          <g filter="url(#needleShadow)" className="transition-all duration-700 ease-out">
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={corAgulha}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="8" fill="#1d1d1d" stroke={corAgulha} strokeWidth="3" />
            <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
          </g>

          {/* Rótulos dos marcos no arco em preto de alto contraste */}
          <text x="36" y="142" fontSize="10.5" fontWeight="800" fill="#1d1d1d" textAnchor="middle" className="dados">0%</text>
          <text x="140" y="18" fontSize="10.5" fontWeight="800" fill="#1d1d1d" textAnchor="middle" className="dados">50%</text>
          <text x="216" y="52" fontSize="10.5" fontWeight="800" fill="#1d1d1d" textAnchor="middle" className="dados">80%</text>
          <text x="244" y="142" fontSize="10.5" fontWeight="800" fill="#1d1d1d" textAnchor="middle" className="dados">100%</text>
        </svg>
      </div>

      {/* Métrica Central de Alto Impacto */}
      <div className="relative z-10 mt-1 text-center flex flex-col items-center">
        <div className="inline-flex items-baseline gap-1.5 rounded-2xl bg-white/95 border-2 border-slate-300 px-5 py-1.5 shadow-sm">
          <span className="metric-hero text-4xl sm:text-5xl font-black text-[#1d1d1d] tracking-tight">
            {PCT.format(pct)}%
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-600">da meta</span>
        </div>
        <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 bg-white/85 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
          <strong className="dados text-[#ca0202] font-black text-sm sm:text-base">{FMT.format(total)}</strong> de{" "}
          <span className="dados font-extrabold text-[#1d1d1d]">{FMT.format(meta)} evidências</span>
        </p>
        <div className="mt-2.5">
          {nivel === "critico" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ca0202] border-2 border-red-700 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md animate-pulse">
              <AlertCircle size={13} className="text-white shrink-0" />
              <span>Abaixo da Meta</span>
            </span>
          ) : (
            <Selo nivel={nivel} />
          )}
        </div>
      </div>

      {/* Régua de Zonas de Atingimento Nítida */}
      <div className="relative z-10 mt-4 grid w-full grid-cols-3 gap-2 border-t-2 border-slate-200 pt-3 text-center">
        <div className="rounded-xl border-2 border-red-600 bg-[#ca0202] p-1.5 shadow-sm text-white">
          <span className="block text-xs font-black text-white">&lt; 50%</span>
          <span className="text-[10px] font-black text-white uppercase tracking-tight">Abaixo da Meta</span>
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-1.5 shadow-2xs">
          <span className="block text-xs font-black text-amber-700">50% a 79%</span>
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-tight leading-tight">Faixa de Atenção da Meta</span>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-1.5 shadow-2xs">
          <span className="block text-xs font-black text-emerald-700">≥ 80%</span>
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-tight">Meta Cumprida</span>
        </div>
      </div>
    </div>
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
          <div className="card-interativo w-full rounded-2xl border-2 border-slate-300/85 bg-gradient-to-r from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-4 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => onSelecionar?.(d.chave)}
              className="w-full text-left focus-visible:outline-2 focus-visible:outline-vermelho"
              aria-label={`Filtrar por ${d.rotulo} — ${PCT.format(d.pct)}% da meta`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span className="flex items-center gap-2 text-sm sm:text-base font-black text-[#1d1d1d]">
                  {d.rotulo}
                  <Selo nivel={d.nivel} />
                  {d.pctBatalhao !== undefined && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-xs">
                      <span className="text-slate-600 font-bold">Cota:</span>
                      <span className="text-slate-900 font-black">{PCT.format(d.pctBatalhao)}%</span>
                      <span className="dados font-black text-[#ca0202]">({FMT.format(d.meta)})</span>
                    </span>
                  )}
                </span>

                {/* Caixa destacada com cores de semáforo (Verde >=80%, Amarelo 50-79%, Vermelho <50%) */}
                <div
                  className={cn(
                    "dados rounded-xl border-2 px-3 py-1 text-[13px] font-black shadow-xs transition-colors",
                    d.pct >= 80
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : d.pct >= 50
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-red-300 bg-red-50 text-red-800"
                  )}
                >
                  <span>
                    {FMT.format(d.feito)} / {FMT.format(d.meta)}
                  </span>
                  <span className="ml-1.5 opacity-90">· {PCT.format(d.pct)}%</span>
                </div>
              </div>

              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, d.pct)}%`, background: COR_NIVEL[d.nivel] }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-slate-700">
                <span>
                  <strong className="dados font-black text-slate-900">{FMT.format(d.lancaram)}</strong> de{" "}
                  <span className="dados font-bold">{FMT.format(d.efetivo)}</span> auditores lançaram
                  {d.efetivoQuadro ? ` (quadro: ${FMT.format(d.efetivoQuadro)} PMs)` : ""}
                </span>
                <span>
                  {d.falta > 0 ? (
                    <>
                      Faltam <strong className="dados font-black text-[#ca0202]">{FMT.format(d.falta)}</strong> (
                      {FMT.format(Math.ceil(d.ritmoNecessario))}/turno em {FMT.format(d.turnosRestantes)} rest.)
                    </>
                  ) : (
                    <span className="font-black text-emerald-700">Meta cumprida</span>
                  )}
                </span>
              </div>
            </button>

            {/* Evolução semana a semana da Cia */}
            {d.semanas && d.semanas.length > 0 && (
              <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-slate-200 pt-3">
                {d.semanas.map((s) => (
                  <div
                    key={s.semana}
                    className="rounded-xl border-2 border-slate-200 bg-white p-2.5 text-center shadow-xs transition-colors hover:border-vermelho"
                    title={`${s.rotulo} (${s.diasRotulo}): ${FMT.format(s.feito)} de ${FMT.format(
                      s.meta
                    )} evidências (${PCT.format(s.pct)}%)`}
                  >
                    <div className="flex items-center justify-between text-xs font-black text-slate-800">
                      <span className="font-serif">Sem {s.semana}</span>
                      <span className="dados text-[11px] font-extrabold text-slate-900">
                        {PCT.format(s.pct)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, s.pct)}%`,
                          background: COR_NIVEL[s.nivel],
                        }}
                      />
                    </div>
                    <div className="mt-1.5 dados text-[11px] font-bold text-slate-700">
                      <strong className="font-black text-slate-950">{FMT.format(s.feito)}</strong> / {FMT.format(s.meta)}
                    </div>
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

export function QuadroSemanalBatalhao({
  semanas,
  semanaAtiva,
  onSelecionarSemana,
}: {
  semanas: ProgressoSemana[];
  semanaAtiva?: string;
  onSelecionarSemana?: (semana: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:gap-3.5 grid-cols-2 lg:grid-cols-4">
      {semanas.map((s) => {
        const ativa = semanaAtiva === String(s.semana);
        return (
          <button
            key={s.semana}
            type="button"
            onClick={() => onSelecionarSemana?.(ativa ? "todas" : String(s.semana))}
            className={cn(
              "card-interativo group rounded-2xl border-2 p-3.5 sm:p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
              ativa
                ? "border-vermelho bg-gradient-to-b from-red-50 via-white to-red-50/50 shadow-md ring-2 ring-vermelho"
                : "border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] hover:border-vermelho/60"
            )}
            aria-pressed={ativa}
            aria-label={`Filtrar por ${s.rotulo} — ${PCT.format(s.pct)}% da meta`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-serif text-sm sm:text-base font-black text-[#1d1d1d] group-hover:text-vermelho">
                {s.rotulo}
              </span>
              <Selo nivel={s.nivel} />
            </div>
            <p className="mt-0.5 text-xs font-bold text-slate-600">Dias {s.diasRotulo}</p>

            <div className="mt-2.5 sm:mt-3 flex flex-wrap items-baseline justify-between gap-1">
              <span className="metric-card text-2xl sm:text-3xl font-black text-[#1d1d1d]">
                {FMT.format(s.feito)}
                <span className="text-xs font-bold text-slate-500"> / {FMT.format(s.meta)}</span>
              </span>
              <span
                className={cn(
                  "dados rounded-lg border px-2 py-0.5 text-xs font-black",
                  s.pct >= 80
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : s.pct >= 50
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : s.pct > 0
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                )}
              >
                {PCT.format(s.pct)}%
              </span>
            </div>

            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  background: COR_NIVEL[s.nivel],
                }}
              />
            </div>

            <p className="mt-2.5 text-xs font-bold text-slate-700">
              {s.falta > 0 ? (
                <>
                  Faltam <strong className="dados font-black text-[#ca0202]">{FMT.format(s.falta)}</strong> p/ meta
                </>
              ) : (
                <span className="font-black text-emerald-700">Meta semanal atingida</span>
              )}
            </p>
          </button>
        );
      })}
    </div>
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
