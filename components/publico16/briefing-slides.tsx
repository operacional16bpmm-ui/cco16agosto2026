"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Home,
  Printer,
  Maximize2,
  Minimize2,
  Shield,
  Award,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { ROTULO_SUBUNIDADE, type LancamentoCop, type MetaSubunidade } from "@/lib/cop2026";
import { AssinaturaDesenvolvimento, SelosSeguranca } from "@/components/publico16/cop/rodape-cop";
import { calcularPainel, FMT, PCT } from "@/lib/cop2026-metricas";
import { AgulhaoMetas } from "@/components/publico16/cop/graficos";

/**
 * Briefing Executivo Interativo em Slides para o Comando:
 * Apresentação cinematográfica, dinâmica, didática com métricas em tempo real,
 * gráficos vetoriais, termômetro/manômetro e projeção de ritmo operacional.
 */
export function BriefingSlides({
  lancamentos,
  metas,
  lidoEm,
  email,
  ehAdmin = false,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  email?: string;
  ehAdmin?: boolean;
}) {
  const [i, setI] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Métrica consolidada usando o mesmo motor de cálculo do Dashboard
  const p = calcularPainel(lancamentos, metas, {
    fracao: "todas",
    semana: "todas",
    turno: "todos",
    de: "",
    ate: "",
    excecao: "",
    busca: "",
  });

  const videos = p.total;
  const meta = p.meta;
  const auditoresTotal = metas.reduce((s, m) => s + m.efetivo, 0);
  const pct = p.pct;

  // Toggle Tela Cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const slides = [
    // ---------------- SLIDE 0: CAPA MONUMENTAL DO COMANDO ----------------
    {
      selo: "Apresentação Executiva do Comando",
      titulo: "Auditoria & Governança das Câmeras Operacionais Corporais",
      subtitulo: '16º BPM/M — "1º Ten PM Fernão" · Diretriz PM3-001/02/25',
      corpo: (
        <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-3xl mx-auto py-2">
          {/* Brasão Monumental com efeito de destaque */}
          <div className="relative group">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#ca0202]/30 via-amber-500/20 to-[#ca0202]/30 blur-xl opacity-75 animate-pulse" />
            <div className="relative w-64 sm:w-96 aspect-[3/2] overflow-hidden rounded-2xl bg-black/60 shadow-2xl ring-1 ring-white/20">
              <Image
                src="/cop2026/cop-colete-pmesp.webp"
                alt="Câmera operacional corporal Motorola acoplada ao uniforme da Polícia Militar do Estado de São Paulo"
                width={1200}
                height={800}
                className="h-full w-full object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-black tracking-[0.3em] uppercase text-[#ff5a5a]">
              Polícia Militar do Estado de São Paulo · CPM
            </p>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              16º Batalhão de Polícia Militar Metropolitano
            </h1>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-1.5 backdrop-blur-md">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ca0202] animate-ping" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pt-4">
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white/60 uppercase">Meta Global</span>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">960</p>
              <span className="text-[10px] text-white/50">Evidências</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white/60 uppercase">Auditadas</span>
              <p className="text-xl sm:text-2xl font-black text-[#ff5a5a] mt-0.5">{FMT.format(videos)}</p>
              <span className="text-[10px] text-white/50">{PCT.format(pct)}% cumprido</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white/60 uppercase">Auditores</span>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{auditoresTotal}</p>
              <span className="text-[10px] text-white/50">Designados</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-3 text-center backdrop-blur-sm">
              <span className="text-xs font-bold text-white/60 uppercase">Turnos Restantes</span>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{p.turnosRestantes}</p>
              <span className="text-[10px] text-white/50">de 15 turnos</span>
            </div>
          </div>

          <p className="text-xs text-white/45">
            Dados sincronizados em tempo real com a planilha corporativa · {lidoEm}
          </p>
        </div>
      ),
    },

    // ---------------- SLIDE 1: CONFORMIDADE & RITMO OPERACIONAL ----------------
    {
      selo: "Desempenho Geral do 16º BPM/M",
      titulo: "Conformidade e Ritmo da Gestão Operacional da Meta",
      subtitulo: "Aferição em tempo real da meta mensal de 960 evidências",
      corpo: (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-center">
          {/* Manômetro / Agulhão Tático */}
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <AgulhaoMetas
                pct={pct}
                total={videos}
                meta={meta}
                titulo='16º BPM/M — "1º Ten PM Fernão"'
                subtitulo="DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE"
              />
            </div>
          </div>

          {/* Destaques Didáticos & Projeção */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-5 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-[#ff5a5a]">
                <AlertTriangle size={20} />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                  Diagnóstico Operacional do Período
                </h3>
              </div>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                Com <strong className="text-white font-black">{FMT.format(videos)} evidências auditadas</strong> ({PCT.format(pct)}% da meta global de 960), o Batalhão encontra-se na{" "}
                <span className="font-black text-[#ff5a5a] uppercase">Faixa Crítica (Abaixo de 50%)</span>.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Ritmo Necessário</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {FMT.format(Math.ceil(p.ritmoNecessario))} <span className="text-sm font-normal text-white/60">evidências / turno</span>
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Para atingir os 100% nos {p.turnosRestantes} turnos restantes
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-center gap-2 text-[#ff5a5a] mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Saldo Restante</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {FMT.format(p.falta)} <span className="text-sm font-normal text-white/60">evidências</span>
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Déficit a recuperar nas 6 Frações
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ---------------- SLIDE 2: MATRIZ OPERACIONAL POR FRAÇÃO ----------------
    {
      selo: "Distribuição Proporcional por Matriz Operacional",
      titulo: "Desempenho Comparativo",
      subtitulo: "Rateio proporcional com base no efetivo de auditores designados",
      corpo: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {p.fracoes.map((f) => {
              const nivel = f.nivel;
              const corBarra =
                nivel === "superacao"
                  ? "bg-blue-600"
                  : nivel === "conforme"
                  ? "bg-emerald-500"
                  : nivel === "atencao"
                  ? "bg-amber-500"
                  : "bg-[#ca0202]";
              const corTexto =
                nivel === "superacao"
                  ? "text-blue-400"
                  : nivel === "conforme"
                  ? "text-emerald-400"
                  : nivel === "atencao"
                  ? "text-amber-400"
                  : "text-[#ff5a5a]";

              return (
                <div
                  key={f.chave}
                  className="rounded-xl border border-white/15 bg-white/[0.06] p-4 hover:bg-white/[0.1] transition-all"
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={corTexto} />
                      <span className="font-bold text-white text-sm sm:text-base">{f.rotulo}</span>
                    </div>
                    <span className={`font-mono text-base font-black ${corTexto}`}>
                      {PCT.format(f.pct)}%
                    </span>
                  </div>

                  {/* Barra de Progresso com Transição */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/10 my-2">
                    <div
                      className={`h-full rounded-full ${corBarra} transition-all duration-1000`}
                      style={{ width: `${Math.min(100, Math.max(3, f.pct))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/65 mt-2 pt-1 border-t border-white/10">
                    <span>
                      Feito: <strong className="text-white">{FMT.format(f.feito)}</strong> de {FMT.format(f.meta)}
                    </span>
                    <span>
                      Efetivo: <strong className="text-white">{f.efetivo} auditores</strong>
                    </span>
                    <span>
                      Faltam: <strong className={corTexto}>{FMT.format(f.falta)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },

    // ---------------- SLIDE 3: CICLO OPERACIONAL POR SEMANAS ----------------
    {
      selo: "Evolução Temporal do Mês",
      titulo: "Cumprimento da Meta por Semanas Operacionais",
      subtitulo: "Divisão do ciclo mensal em 4 janelas de auditoria contínua",
      corpo: (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {p.semanasBatalhao.map((s) => {
              const nivel = s.nivel;
              const cor =
                nivel === "superacao"
                  ? "border-blue-500/50 bg-blue-950/20"
                  : nivel === "conforme"
                  ? "border-emerald-500/50 bg-emerald-950/20"
                  : nivel === "atencao"
                  ? "border-amber-500/50 bg-amber-950/20"
                  : "border-red-500/50 bg-red-950/20";
              const corBadge =
                nivel === "superacao"
                  ? "text-blue-400 bg-blue-500/20"
                  : nivel === "conforme"
                  ? "text-emerald-400 bg-emerald-500/20"
                  : nivel === "atencao"
                  ? "text-amber-400 bg-amber-500/20"
                  : "text-red-400 bg-red-500/20";
              const corBarra =
                nivel === "superacao"
                  ? "bg-blue-600"
                  : nivel === "conforme"
                  ? "bg-emerald-500"
                  : nivel === "atencao"
                  ? "bg-amber-500"
                  : "bg-[#ca0202]";

              return (
                <div
                  key={s.semana}
                  className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 backdrop-blur-sm ${cor}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-white/70">{s.rotulo}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${corBadge}`}>
                        {PCT.format(s.pct)}%
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{s.diasRotulo}</p>
                  </div>

                  <div className="py-2">
                    <p className="text-3xl font-black text-white">{FMT.format(s.feito)}</p>
                    <p className="text-xs text-white/60">de {FMT.format(s.meta)} previstas</p>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${corBarra} transition-all duration-1000`}
                      style={{ width: `${Math.min(100, Math.max(3, s.pct))}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs text-white/60">
                    <span>Saldo:</span>
                    <strong className="text-white">{FMT.format(s.falta)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4 text-xs sm:text-sm text-white/75 flex items-center gap-3">
            <Sparkles size={18} className="text-amber-400 shrink-0" />
            <p>
              <strong>Controle por Ciclo:</strong> Cada semana possui meta de <strong>240 evidências</strong> para o Batalhão (60 por turno). Manter a regularidade semanal impede acúmulo de saldo no fechamento do mês.
            </p>
          </div>
        </div>
      ),
    },

    // ---------------- SLIDE 4: CONTROLE DE QUALIDADE & CONFORMIDADE ----------------
    {
      selo: "Diretriz PM3-001/02/25 · Padrão Técnico",
      titulo: "Qualidade da Auditoria & Engajamento do Efetivo",
      subtitulo: "Métricas de aderência ao mínimo de 3 evidências e preenchimento de IDs de mídia",
      corpo: (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Conformidade ≥ 3</span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-white">{PCT.format(p.taxaConf)}%</p>
              <p className="text-xs text-white/60 mt-1">
                {p.conformes} de {p.dados.length} auditorias atingiram a cota mínima
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Users size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Auditores Ativos</span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-white">{p.ativos} <span className="text-base font-normal text-white/60">/ {auditoresTotal}</span></p>
              <p className="text-xs text-white/60 mt-1">
                Policiais com lançamentos registrados no período
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5">
              <div className="flex items-center gap-2 text-[#ff5a5a] mb-2">
                <AlertTriangle size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Desvios Registrados</span>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-[#ff5a5a]">{p.naoAuditou + p.abaixo}</p>
              <p className="text-xs text-white/60 mt-1">
                {p.naoAuditou} &quot;Não auditei&quot; + {p.abaixo} abaixo do mínimo
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-white/15 bg-white/[0.05] p-4 text-xs sm:text-sm">
              <strong className="text-white block mb-1">Mediana de Evidências por Lançamento:</strong>
              <p className="text-white/75">
                Mediana de <strong>{p.mediana} evidências/turno</strong>. Os 10% mais produtivos (p90) entregam <strong>{p.p90} ou mais</strong> evidências por escala.
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/[0.05] p-4 text-xs sm:text-sm">
              <strong className="text-white block mb-1">Rastreabilidade & IDs de Mídia:</strong>
              <p className="text-white/75">
                {p.dados.filter((l) => l.idsMidia.trim()).length} de {p.dados.length} lançamentos possuem identificação completa das gravações auditadas.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    // ---------------- SLIDE 5: DIRETRIZES & PLANO DE AÇÃO ----------------
    {
      selo: "Encerramento & Recomendações",
      titulo: "Plano de Ação para os Turnos Restantes",
      subtitulo: "Diretrizes executivas para Comandantes de Companhia e Oficiais de Operações",
      corpo: (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border-l-4 border-l-[#ca0202] border-white/15 bg-white/[0.06] p-4 space-y-2">
              <span className="text-xs font-black uppercase text-[#ff5a5a]">1. Cota por Turno</span>
              <h4 className="font-bold text-white text-base">Garantir Mínimo de 3</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Todo auditor escalado deve fiscalizar no mínimo 3 evidências no turno de serviço, lançando no formulário oficial imediatamente após o término.
              </p>
            </div>

            <div className="rounded-xl border-l-4 border-l-amber-500 border-white/15 bg-white/[0.06] p-4 space-y-2">
              <span className="text-xs font-black uppercase text-amber-400">2. Recuperação do Déficit</span>
              <h4 className="font-bold text-white text-base">Ritmo de 73 / Turno</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Distribuir os lançamentos pendentes entre os auditores das frações com menor índice para fechar as 960 evidências antes do encerramento do mês.
              </p>
            </div>

            <div className="rounded-xl border-l-4 border-l-emerald-500 border-white/15 bg-white/[0.06] p-4 space-y-2">
              <span className="text-xs font-black uppercase text-emerald-400">3. Governança & Auditoria</span>
              <h4 className="font-bold text-white text-base">Justificativas Formais</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Auditor que declarar &quot;Não auditei&quot; ou registrar menos de 3 vídeos deve apontar o número da Parte ou a justificativa operacional no CCO16.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-gradient-to-r from-[#ca0202]/30 via-white/10 to-[#ca0202]/30 p-5 text-center backdrop-blur-md">
            <p className="font-serif text-base sm:text-xl font-bold text-white">
              16º BPM/M — Compromisso com a Transparência, Eficiência e a Diretriz PM3-001/02/25
            </p>
            <p className="text-xs text-white/60 mt-1">
              Painel Integrado de Governança e Inteligência Operacional · COP 2026
            </p>
          </div>
        </div>
      ),
    },

    // ---------------- SLIDE 7: POR QUE AUDITAMOS? (FINALIDADES INSTITUCIONAIS) ----------------
    {
      selo: "Diretriz PM3-001/02/25 · Item 6.1.6",
      titulo: "Por que Auditamos?",
      subtitulo: "Cinco finalidades institucionais orientam toda a auditoria das evidências digitais obtidas por COP",
      corpo: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-md">
            <p className="text-sm sm:text-base text-white/90 leading-relaxed font-serif">
              A <strong className="text-white font-bold">Auditoria das Evidências Digitais (COP)</strong> é o exame sistemático, independente e documentado dos registros captados, realizada por meio de credencial pessoal no SiGCED.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                num: "01",
                rotulo: "CONFORMIDADE",
                desc: "Verificar a conformidade com critérios técnicos estabelecidos.",
                cor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
              },
              {
                num: "02",
                rotulo: "FISCALIZAÇÃO E ORIENTAÇÃO",
                desc: "Realizar fiscalização de natureza pedagógica, disciplinar e procedimental.",
                cor: "text-blue-400 border-blue-500/30 bg-blue-950/20",
              },
              {
                num: "03",
                rotulo: "BOAS PRÁTICAS",
                desc: "Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos.",
                cor: "text-amber-400 border-amber-500/30 bg-amber-950/20",
              },
              {
                num: "04",
                rotulo: "MELHORIA CONTÍNUA",
                desc: "Promover melhorias contínuas nos processos operacionais.",
                cor: "text-rose-400 border-rose-500/30 bg-rose-950/20",
              },
              {
                num: "05",
                rotulo: "INTELIGÊNCIA GERENCIAL",
                desc: "Propiciar a extração de indicadores institucionais para subsidiar a gestão.",
                cor: "text-purple-400 border-purple-500/30 bg-purple-950/20",
              },
            ].map((item) => (
              <div
                key={item.num}
                className={`rounded-xl border p-4 backdrop-blur-sm transition-all hover:scale-[1.02] ${item.cor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-2xl font-black opacity-80">{item.num}</span>
                  <span className="text-[11px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/10 text-white">
                    Finalidade
                  </span>
                </div>
                <h4 className="font-serif font-black text-sm sm:text-base text-white tracking-wide mb-1">
                  {item.rotulo}
                </h4>
                <p className="text-xs text-white/75 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const total = slides.length;
  const ir = useCallback((d: number) => setI((v) => Math.min(total - 1, Math.max(0, v + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") ir(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") ir(-1);
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(total - 1);
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, total]);

  const s = slides[i];

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0e] text-white relative overflow-hidden select-none">
      {/* Background Operacional Sutil */}
      <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-luminosity">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0b0b0e]/95 via-[#0b0b0e]/85 to-[#0b0b0e]/95" />

      {/* ---------------- BARRA SUPERIOR DE CONTROLE EXECUTIVO ---------------- */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0b0e]/80 px-4 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/cop2026/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-[#ca0202] hover:bg-[#ca0202]/15 shadow-sm"
            title="Retornar ao Dashboard de Controle"
          >
            <BarChart3 size={15} />
            <span className="hidden sm:inline">Painel de Controle</span>
          </Link>
          <Link
            href="/cop2026"
            className="hidden items-center gap-1 text-xs font-semibold text-white/60 transition-colors hover:text-white sm:inline-flex"
            title="Ir para página de lançamento"
          >
            <Home size={13} />
            <span>Início</span>
          </Link>
        </div>

        {/* Indicador Central de Slide */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white/50">SLIDE</span>
          <span className="rounded-md bg-[#ca0202] px-2 py-0.5 text-xs font-mono font-black text-white">
            0{i + 1} / 0{total}
          </span>
          <span className="hidden md:inline text-xs font-serif font-bold text-white/70 uppercase tracking-wider truncate max-w-[280px]">
            · {s.selo}
          </span>
        </div>

        {/* Ações Rápidas: Tela Cheia & Imprimir */}
        <div className="flex items-center gap-2">
          {email && (
            <span className="hidden items-center gap-2 text-[12px] text-white/45 lg:inline-flex mr-2">
              {ehAdmin && (
                <a href="/cop2026/admin" className="font-bold hover:text-white">
                  Autorizados
                </a>
              )}
              <span className="font-mono">{email}</span>
            </span>
          )}
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-white hover:text-white cursor-pointer"
            title="Alternar Modo Tela Cheia (Atalho: tecla F)"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">{fullscreen ? "Sair Tela Cheia" : "Tela Cheia"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-[#ca0202] hover:text-white cursor-pointer"
            title="Imprimir apresentação ou salvar como PDF"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* ---------------- CORPO DO SLIDE ATUAL COM ANIMAÇÃO ---------------- */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto">
        <div
          key={i}
          className="w-full max-w-5xl animate-[slideIn_350ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          {/* Cabeçalho do Slide */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#ff5a5a] backdrop-blur-sm">
              <Award size={12} />
              <span>{s.selo}</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              {s.titulo}
            </h2>
            {s.subtitulo && (
              <p className="mt-1 text-xs sm:text-sm text-white/60 tracking-wide font-medium">
                {s.subtitulo}
              </p>
            )}
          </div>

          {/* Conteúdo Dinâmico */}
          <div>{s.corpo}</div>
        </div>
      </div>

      {/* ---------------- BARRA INFERIOR DE NAVEGAÇÃO & PROGRESSO ---------------- */}
      <div className="relative z-20 flex items-center justify-between border-t border-white/10 bg-[#0b0b0e]/90 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-md">
        <button
          onClick={() => ir(-1)}
          disabled={i === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Seletor Rápido de Slides com Clique Direto */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {slides.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                k === i ? "w-8 sm:w-10 bg-[#ca0202]" : "w-2.5 bg-white/25 hover:bg-white/50"
              }`}
              title={`Ir para o Slide ${k + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => ir(1)}
          disabled={i === total - 1}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ca0202] px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-[#e40707] hover:shadow-lg hover:shadow-[#ca0202]/30 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <span className="hidden sm:inline">Próximo</span> <ArrowRight size={16} />
        </button>
      </div>

      {/* ---------------- RODAPÉ DE SEGURANÇA & CRÉDITOS ---------------- */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 bg-[#0b0b0e] px-4 py-2.5 sm:px-6 text-white">
        <SelosSeguranca />
        <AssinaturaDesenvolvimento />
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
