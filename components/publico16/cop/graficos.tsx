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
  SUBTITULO_NIVEL,
  nivelPorCumprimento,
  type LinhaFracao,
  type ProgressoSemana,
  type Nivel,
} from "@/lib/cop2026-metricas";
import { useState, useRef, useCallback } from "react";
import { AlertCircle, Download, Check, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
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
// Semáforo de faixas — parametrização do Comando
// ---------------------------------------------------------------------------
/** Cores vivas das faixas para o velocímetro e para as caixas de percentual.
 *  As barras de progresso continuam no `COR_NIVEL` (tokens do tema); aqui o
 *  contraste precisa ser alto porque o painel é projetado em telão. */
const COR_FAIXA: Record<Nivel, string> = {
  superacao: "#2563eb",
  conforme: "#16a34a",
  atencao: "#d97706",
  critico: VERM, // "sempre vermelho vivido"
  neutro: "#94a3b8",
};

/** Caixa de percentual (ranking e quadro semanal) por faixa. */
const CAIXA_FAIXA: Record<Nivel, string> = {
  superacao: "border-blue-300 bg-blue-50 text-blue-800",
  conforme: "border-emerald-300 bg-emerald-50 text-emerald-800",
  atencao: "border-amber-300 bg-amber-50 text-amber-800",
  critico: "border-red-300 bg-red-50 text-red-800",
  neutro: "border-slate-200 bg-slate-100 text-slate-600",
};

/** Cor do texto de fecho ("Meta Cumprida" / "Meta Superada"). */
const TEXTO_FAIXA: Record<Nivel, string> = {
  superacao: "text-blue-700",
  conforme: "text-emerald-700",
  atencao: "text-amber-700",
  critico: "text-red-700",
  neutro: "text-slate-600",
};

/** Fecho positivo: acima de 100% vira "Meta Superada"; empatado em 100%,
 *  "Meta Cumprida". Evita cair no subtítulo vazio de `neutro` (meta zerada). */
function nivelDeFecho(nivel: Nivel): Nivel {
  return nivel === "superacao" ? "superacao" : "conforme";
}

// ---------------------------------------------------------------------------
// Geometria do arco do velocímetro
// ---------------------------------------------------------------------------
/**
 * O arco de 0% a 100% ocupa 180° (de 180° a 0°), passo linear de 1,8° por ponto
 * percentual. A faixa de SUPERAÇÃO (>100%) não cabe como fatia dessa escala sem
 * distorcê-la, então ela avança 15° ALÉM do fim do arco — mantendo o mesmo passo
 * — e a agulha satura só no fim desse trecho azul (~108,3%).
 */
const CX = 140;
const CY = 125;
const RAIO_EXT = 95;
const RAIO_INT = 68;
const RAIO_ROTULO = 110;
const ANG_0 = 180; // 0%
const ANG_100 = 0; // 100%
const ANG_FIM = -15; // fim da faixa de superação
const GRAUS_POR_PCT = (ANG_0 - ANG_100) / 100; // 1,8°/p.p.
const PCT_MAX_ARCO = (ANG_0 - ANG_FIM) / GRAUS_POR_PCT; // ≈ 108,33%
const ANG_50 = ANG_0 - 50 * GRAUS_POR_PCT; // 90°
const ANG_80 = ANG_0 - 80 * GRAUS_POR_PCT; // 36°

/** Ponto do arco em coordenadas SVG (y cresce para baixo, daí o seno subtraído). */
function pontoArco(raio: number, graus: number) {
  const r = (graus * Math.PI) / 180;
  return { x: CX + raio * Math.cos(r), y: CY - raio * Math.sin(r) };
}

const nn = (v: number) => v.toFixed(2);

/** Fatia anelar entre dois ângulos (percorrida em sentido horário na tela). */
function fatiaArco(grausInicio: number, grausFim: number) {
  const extIni = pontoArco(RAIO_EXT, grausInicio);
  const extFim = pontoArco(RAIO_EXT, grausFim);
  const intFim = pontoArco(RAIO_INT, grausFim);
  const intIni = pontoArco(RAIO_INT, grausInicio);
  return [
    `M ${nn(extIni.x)} ${nn(extIni.y)}`,
    `A ${RAIO_EXT} ${RAIO_EXT} 0 0 1 ${nn(extFim.x)} ${nn(extFim.y)}`,
    `L ${nn(intFim.x)} ${nn(intFim.y)}`,
    `A ${RAIO_INT} ${RAIO_INT} 0 0 0 ${nn(intIni.x)} ${nn(intIni.y)}`,
    "Z",
  ].join(" ");
}

/** As quatro fatias do arco, na ordem crescente de cumprimento. */
const FATIAS_ARCO: { nivel: Nivel; d: string }[] = [
  { nivel: "critico", d: fatiaArco(ANG_0, ANG_50) },
  { nivel: "atencao", d: fatiaArco(ANG_50, ANG_80) },
  { nivel: "conforme", d: fatiaArco(ANG_80, ANG_100) },
  { nivel: "superacao", d: fatiaArco(ANG_100, ANG_FIM) },
];

/** Divisores brancos nas fronteiras de 50%, 80% e 100%. */
const DIVISORES_ARCO = [ANG_50, ANG_80, ANG_100].map((g) => ({
  g,
  ext: pontoArco(RAIO_EXT, g),
  int: pontoArco(RAIO_INT, g),
}));

/** Marcas de texto do arco. `raio` maior no >100% para não colar no 100%. */
const MARCAS_ARCO: { texto: string; g: number; cor: string; raio?: number }[] = [
  { texto: "0%", g: ANG_0, cor: "#1d1d1d" },
  { texto: "50%", g: ANG_50, cor: "#1d1d1d" },
  { texto: "80%", g: ANG_80, cor: "#1d1d1d" },
  { texto: "100%", g: ANG_100, cor: "#1d1d1d" },
  { texto: ">100%", g: ANG_FIM, cor: COR_FAIXA.superacao, raio: 116 },
];

/** Régua de rodapé: CRÍTICA → ATENÇÃO → CONFORMIDADE → SUPERAÇÃO. */
const REGUA_FAIXAS: {
  nivel: Nivel;
  intervalo: string;
  caixa: string;
  valor: string;
  rotulo: string;
}[] = [
  {
    nivel: "critico",
    intervalo: "< 50%",
    caixa: "border-red-600 bg-[#ca0202] shadow-sm",
    valor: "text-white",
    rotulo: "font-black text-white",
  },
  {
    nivel: "atencao",
    intervalo: "50% a 79%",
    caixa: "border-amber-200 bg-amber-50 shadow-2xs",
    valor: "text-amber-700",
    rotulo: "font-bold text-amber-900",
  },
  {
    nivel: "conforme",
    intervalo: "80% a 100%",
    caixa: "border-emerald-200 bg-emerald-50 shadow-2xs",
    valor: "text-emerald-700",
    rotulo: "font-bold text-emerald-900",
  },
  {
    nivel: "superacao",
    intervalo: "> 100%",
    caixa: "border-blue-200 bg-blue-50 shadow-2xs",
    valor: "text-blue-700",
    rotulo: "font-bold text-blue-900",
  },
];

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
  subtitulo = {
    linha1: "META GLOBAL — 960 EVIDÊNCIAS",
    linha2: "DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
    linha3: "Distribuição Proporcional por Matriz Operacional",
  },
}: {
  pct: number;
  total: number;
  meta: number;
  titulo?: string;
  subtitulo?: string | { linha1: string; linha2?: string; linha3?: string };
}) {
  const painelRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // A agulha não satura mais em 100%: só para no fim do arco de superação.
  const pctBruto = Number.isFinite(pct) ? pct : 0;
  const pctClamped = Math.min(PCT_MAX_ARCO, Math.max(0, pctBruto));
  const angulo = ANG_0 - pctClamped * GRAUS_POR_PCT;
  const rad = (angulo * Math.PI) / 180;
  const needleLen = 78;
  const nx = CX + needleLen * Math.cos(rad);
  const ny = CY - needleLen * Math.sin(rad);

  const nivel: Nivel = nivelPorCumprimento(pct, true);
  const corAgulha = COR_FAIXA[nivel];

  const exportarPNG = useCallback(async () => {
    if (!painelRef.current || exportando) return;
    setExportando(true);
    try {
      const node = painelRef.current;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: (child: HTMLElement) => {
          if (child.tagName === "VIDEO" || child.dataset?.noExport === "true") {
            return false;
          }
          return true;
        },
      });

      const nomeArquivo = `painel-metas-16bpmm-${new Date().toISOString().slice(0, 10)}.png`;

      // Tentativa de compartilhamento nativo em aparelhos móveis
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
          await navigator.share({
            title: "16º BPM/M — Auditoria COP 2026",
            text: `Meta Global COP 2026: ${PCT.format(pct)}% (${FMT.format(total)} de ${FMT.format(meta)} evidências)`,
            files: [arquivo],
          });
          toast.success("Painel compartilhado com sucesso!");
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
          return;
        }
      } catch (shareErr: unknown) {
        if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
      }

      // Download do PNG
      const link = document.createElement("a");
      link.download = nomeArquivo;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Copiar imagem para a área de transferência como comodidade
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("PNG baixado e copiado para a área de transferência!");
        } else {
          toast.success("Painel exportado em PNG com sucesso!");
        }
      } catch {
        toast.success("Painel exportado em PNG com sucesso!");
      }

      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (erro) {
      console.error("Erro ao exportar painel PNG:", erro);
      toast.error("Não foi possível exportar a imagem. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }, [exportando, pct, total, meta]);

  return (
    <div ref={painelRef} className="relative flex h-full w-full max-w-none flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.10)] sm:p-6 card-interativo">
      {/* Botão de Exportar / Compartilhar PNG no topo direito */}
      <div data-no-export="true" className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20">
        <button
          type="button"
          onClick={exportarPNG}
          disabled={exportando}
          title="Exportar painel em imagem PNG de alta resolução para download ou compartilhamento"
          aria-label="Exportar painel em PNG"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs",
            copiado
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white/95 text-slate-800 border-slate-300/90 hover:bg-[#ca0202] hover:text-white hover:border-[#ca0202] hover:shadow-md active:scale-95"
          )}
        >
          {exportando ? (
            <>
              <Loader2 size={12} className="animate-spin text-slate-600 group-hover:text-white" />
              <span className="text-[10px]">Gerando...</span>
            </>
          ) : copiado ? (
            <>
              <Check size={12} className="stroke-[3] text-white" />
              <span className="text-[10px]">Salvo!</span>
            </>
          ) : (
            <>
              <Download size={12} className="text-slate-600 group-hover:text-white transition-colors" />
              <span className="text-[10.5px] font-bold">Exportar PNG</span>
            </>
          )}
        </button>
      </div>
      {/* Vídeo de Viatura em Cores Vívidas e Giroflex Iluminado */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 saturate-150 contrast-110 scale-110"
      >
        <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />

      {/* Título com Alto Contraste */}
      <div className="relative z-10 w-full text-center">
        <p className="font-serif text-base sm:text-lg font-black uppercase tracking-wider text-[#1d1d1d]">
          {titulo}
        </p>
        {subtitulo && (
          <div className="mt-1.5 flex w-full max-w-full flex-col items-center justify-center rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-1 shadow-xs backdrop-blur-md">
            {typeof subtitulo === "string" ? (
              <span className="w-full max-w-full break-words text-center text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-wider leading-tight text-[#ca0202]">
                {subtitulo}
              </span>
            ) : (
              <>
                <span className="w-full max-w-full break-words text-center text-[11px] sm:text-[11.5px] font-black uppercase tracking-wider text-[#ca0202]">
                  {subtitulo.linha1}
                </span>
                {subtitulo.linha2 && (
                  <span className="w-full max-w-full break-words text-center text-[10px] sm:text-[10.5px] font-bold leading-snug text-slate-700">
                    {subtitulo.linha2}
                  </span>
                )}
                {subtitulo.linha3 && (
                  <span className="w-full max-w-full break-words text-center text-[9.5px] sm:text-[10px] font-semibold leading-snug text-slate-600">
                    {subtitulo.linha3}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-2 flex items-center justify-center">
        <svg viewBox="0 0 280 168" className="h-40 w-68 overflow-visible">
          <defs>
            <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Faixas: crítica (180°→90°), atenção (90°→36°), conformidade
              (36°→0°) e superação (0°→-15°, além do fim da escala). */}
          {FATIAS_ARCO.map((f) => (
            <path key={f.nivel} d={f.d} fill={COR_FAIXA[f.nivel]} opacity={0.95} />
          ))}

          {/* Divisores sutis entre faixas */}
          {DIVISORES_ARCO.map((d) => (
            <line
              key={d.g}
              x1={nn(d.ext.x)}
              y1={nn(d.ext.y)}
              x2={nn(d.int.x)}
              y2={nn(d.int.y)}
              stroke="#ffffff"
              strokeWidth="2"
              opacity="0.8"
            />
          ))}

          {/* Agulha Indicadora — tremor sutil, como aparelho analógico */}
          <g filter="url(#needleShadow)" className="animar-tremer-agulha">
            <line
              x1={CX}
              y1={CY}
              x2={nx}
              y2={ny}
              stroke={corAgulha}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r="8" fill="#1d1d1d" stroke={corAgulha} strokeWidth="3" />
            <circle cx={CX} cy={CY} r="2.5" fill="#ffffff" />
          </g>

          {/* Rótulos dos marcos, posicionados no próprio ângulo da fronteira */}
          {MARCAS_ARCO.map((m) => {
            const p = pontoArco(m.raio ?? RAIO_ROTULO, m.g);
            return (
              <text
                key={m.texto}
                x={nn(p.x)}
                y={nn(p.y + 3.6)}
                fontSize="10.5"
                fontWeight="800"
                fill={m.cor}
                textAnchor="middle"
                className="dados"
              >
                {m.texto}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Métrica Central — número empilhado, sem gap fantasma da vírgula */}
      <div className="relative z-10 mt-1 text-center flex flex-col items-center">
        <div className="flex flex-col items-center rounded-3xl bg-white/95 border border-slate-300 px-7 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span
            className="text-5xl sm:text-6xl font-black text-[#1d1d1d] leading-none"
            style={{ letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 0' }}
          >
            {PCT.format(pct)}%
          </span>
          <span
            className="mt-1.5 text-[11px] font-black uppercase text-slate-600"
            style={{ letterSpacing: "0.14em" }}
          >
            da meta
          </span>
        </div>
        <p className="mt-2 text-xs sm:text-sm font-bold text-slate-800 bg-white/85 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
          <strong className="dados text-[#ca0202] font-black text-sm sm:text-base">{FMT.format(total)}</strong> de{" "}
          <span className="dados font-extrabold text-[#1d1d1d]">{FMT.format(meta)} evidências</span>
        </p>
        <div className="mt-2.5">
          {nivel === "critico" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ca0202] border-2 border-red-700 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
              <AlertCircle size={13} className="text-white shrink-0" />
              <span>{SUBTITULO_NIVEL.critico}</span>
            </span>
          ) : (
            <Selo nivel={nivel} />
          )}
        </div>
      </div>

      {/* Régua de Zonas — cada card leva barra superior colorida; a faixa
          onde a leitura atual cai fica com anel vermelho de destaque. */}
      <div className="relative z-10 mt-4 grid w-full grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-slate-200 pt-3 text-center">
        {REGUA_FAIXAS.map((f) => {
          const ativo = f.nivel === nivel;
          return (
            <div
              key={f.nivel}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 pt-2.5 pb-2 px-1.5 shadow-xs",
                f.caixa,
                ativo && "ring-2 ring-offset-2 ring-offset-white ring-[#ca0202]"
              )}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: COR_FAIXA[f.nivel] }}
              />
              <span className={cn("block text-xs font-black leading-tight", f.valor)}>
                {f.intervalo}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-[10px] uppercase tracking-tight leading-tight",
                  f.rotulo
                )}
              >
                {SUBTITULO_NIVEL[f.nivel]}
              </span>
            </div>
          );
        })}
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
          <div className="w-full rounded-2xl border-2 border-slate-300/85 bg-gradient-to-r from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-4 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
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

                {/* Caixa destacada com as cores da régua de faixas
                    (Azul >100%, Verde 80-100%, Âmbar 50-79%, Vermelho <50%) */}
                <div
                  className={cn(
                    "dados rounded-xl border-2 px-3 py-1 text-[13px] font-black shadow-xs transition-colors",
                    CAIXA_FAIXA[d.nivel]
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
                      {FMT.format(d.ritmoProporcional ?? Math.ceil(d.ritmoNecessario))}/turno proporcional em {FMT.format(d.turnosRestantes)} rest.)
                    </>
                  ) : (
                    <span className={cn("font-black", TEXTO_FAIXA[nivelDeFecho(d.nivel)])}>
                      {SUBTITULO_NIVEL[nivelDeFecho(d.nivel)]}
                    </span>
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
                        className="h-full rounded-full transition-all duration-700"
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
    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
      {semanas.map((s) => {
        const ativa = semanaAtiva === String(s.semana);
        return (
          <button
            key={s.semana}
            type="button"
            onClick={() => onSelecionarSemana?.(ativa ? "todas" : String(s.semana))}
            className={cn(
              "card-semana group flex min-h-[158px] flex-col rounded-xl border-2 p-3 text-left sm:p-3.5",
              ativa
                ? "border-vermelho bg-gradient-to-b from-red-50 via-white to-red-50/50 shadow-md ring-2 ring-vermelho"
                : "border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] hover:border-vermelho/60"
            )}
            aria-pressed={ativa}
            aria-label={`Filtrar por ${s.rotulo} — ${PCT.format(s.pct)}% da meta`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-serif text-[13px] font-black text-[#1d1d1d] group-hover:text-vermelho sm:text-sm">
                {s.rotulo}
              </span>
              <Selo nivel={s.nivel} />
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-slate-600">Dias {s.diasRotulo}</p>

            <div className="mt-2.5 sm:mt-3 flex flex-wrap items-baseline justify-between gap-1">
              <span className="metric-card text-2xl font-black text-[#1d1d1d] sm:text-3xl">
                {FMT.format(s.feito)}
                <span className="text-xs font-bold text-slate-500"> / {FMT.format(s.meta)}</span>
              </span>
              <span
                className={cn(
                  "dados rounded-lg border px-2 py-0.5 text-[11px] font-black",
                  CAIXA_FAIXA[s.nivel]
                )}
              >
                {PCT.format(s.pct)}%
              </span>
            </div>

            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, s.pct)}%`,
                  background: COR_NIVEL[s.nivel],
                }}
              />
            </div>

            <p className="mt-2.5 text-[11px] font-bold text-slate-700">
              {s.falta > 0 ? (
                <>
                  Faltam <strong className="dados font-black text-[#ca0202]">{FMT.format(s.falta)}</strong> p/ meta
                </>
              ) : (
                <span className={cn("font-black", TEXTO_FAIXA[nivelDeFecho(s.nivel)])}>
                  {s.nivel === "superacao" ? "Meta semanal superada" : "Meta semanal atingida"}
                </span>
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
