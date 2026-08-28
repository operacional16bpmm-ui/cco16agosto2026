"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Layers,
  Lightbulb,
  Printer,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  ROTULO_SUBUNIDADE,
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";
import {
  FILTROS_VAZIOS,
  auditoresParaCsv,
  calcularPainel,
  escreverFiltros,
  lancamentosParaCsv,
  type Filtros,
  type LinhaAuditor,
  type Nivel,
} from "@/lib/cop2026-metricas";
import { PaletaComando } from "@/components/publico16/cop/paleta-comando";
import {
  BarrasSimplesV2,
  ProducaoDiariaV2,
  QuadroSemanalV2,
  RankingFracoesV2,
  SeloV2,
} from "./graficos-v2";
import { cn } from "@/lib/utils";

const FMT = new Intl.NumberFormat("pt-BR");
const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type Coluna = "nome" | "lanc" | "videos" | "media" | "abaixo";

function Th({
  col,
  ordem,
  ordenar,
  num = false,
  children,
}: {
  col: Coluna;
  ordem: { col: Coluna; desc: boolean };
  ordenar: (c: Coluna) => void;
  num?: boolean;
  children: React.ReactNode;
}) {
  const ativo = ordem.col === col;
  return (
    <th
      scope="col"
      aria-sort={ativo ? (ordem.desc ? "descending" : "ascending") : "none"}
      className={cn("px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-300", num && "text-right")}
    >
      <button
        type="button"
        onClick={() => ordenar(col)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors hover:text-ouro",
          ativo ? "text-ouro font-extrabold" : "text-slate-300"
        )}
      >
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );
}

export function DashboardCopV2({
  lancamentos,
  metas,
  lidoEm,
  erro,
  filtrosIniciais = FILTROS_VAZIOS,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  erro?: string;
  filtrosIniciais?: Filtros;
}) {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(filtrosIniciais);
  const [atualizando, setAtualizando] = useState(false);
  const [aba, setAba] = useState<"ritmo" | "qualidade">("ritmo");
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({
    col: "videos",
    desc: true,
  });

  const p = useMemo(() => calcularPainel(lancamentos, metas, f), [lancamentos, metas, f]);

  const tabela = useMemo(() => {
    const termo = f.busca.trim().toLowerCase();
    const filtradas = termo
      ? p.auditoresLinhas.filter(
          (r) => r.nome.toLowerCase().includes(termo) || r.posto.toLowerCase().includes(termo)
        )
      : p.auditoresLinhas;
    const dir = ordem.desc ? -1 : 1;
    return [...filtradas].sort((a, b) => {
      const x = a[ordem.col];
      const y = b[ordem.col];
      if (typeof x === "string" && typeof y === "string") return x.localeCompare(y) * dir;
      return ((x as number) - (y as number)) * dir;
    });
  }, [p.auditoresLinhas, f.busca, ordem]);

  const definir = (parcial: Partial<Filtros>) => {
    const novo = { ...f, ...parcial };
    setF(novo);
    const qs = escreverFiltros(novo);
    router.replace(qs ? `/cop2026/dashboard/v2?${qs}` : "/cop2026/dashboard/v2");
  };

  const atualizar = () => {
    setAtualizando(true);
    router.refresh();
    setTimeout(() => {
      setAtualizando(false);
      toast.success("Dados atualizados com sucesso!");
    }, 600);
  };

  const baixarCsv = () => {
    try {
      const blob = new Blob([auditoresParaCsv(tabela)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-cop-2026-auditores-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tabela exportada em CSV!");
    } catch {
      toast.error("Erro ao gerar o CSV.");
    }
  };

  const baixarLancamentosCsv = () => {
    try {
      const blob = new Blob([lancamentosParaCsv(p.dados)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-cop-2026-respostas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Base bruta exportada em CSV!");
    } catch {
      toast.error("Erro ao gerar o CSV.");
    }
  };

  const ordenarPor = (col: Coluna) =>
    setOrdem((o) => ({ col, desc: o.col === col ? !o.desc : true }));

  // Diagnóstico humano
  const getDiagnostico = () => {
    if (p.pct > 100) {
      return {
        titulo: "Superação Quantitativa da Meta",
        detalhe: `O 16º BPM/M registrou ${FMT.format(p.total)} evidências (${PCT.format(p.pct)}% da meta global de ${FMT.format(p.meta)}). Superação quantitativa da referência prevista na Diretriz PM3-001/02/25.`,
        nivel: "superacao" as Nivel,
      };
    }
    if (p.pct >= 80) {
      return {
        titulo: "Faixa de Conformidade — Meta Atingida",
        detalhe: `O 16º BPM/M registrou ${FMT.format(p.total)} evidências (${PCT.format(p.pct)}% da meta global de ${FMT.format(p.meta)}). O ritmo operacional está em conformidade com a Diretriz PM3-001/02/25.`,
        nivel: "conforme" as Nivel,
      };
    }
    if (p.pct >= 50) {
      return {
        titulo: "Faixa de Atenção — Ciclo em Andamento",
        detalhe: `Foram lançadas ${FMT.format(p.total)} de ${FMT.format(p.meta)} evidências previstas (${PCT.format(p.pct)}%). Faltam ${FMT.format(p.falta)} evidências para a conclusão do período.`,
        nivel: "atencao" as Nivel,
      };
    }
    return {
      titulo: "Faixa Crítica — Abaixo da Meta",
      detalhe: `Apenas ${FMT.format(p.total)} de ${FMT.format(p.meta)} evidências auditadas (${PCT.format(p.pct)}%). É necessário intensificar o cumprimento da cota mínima de ${p.minimo} evidências por turno.`,
      nivel: "critico" as Nivel,
    };
  };

  const diag = getDiagnostico();

  const kpis = [
    {
      rotulo: "Evidências Auditadas",
      valor: FMT.format(p.total),
      nota: `de ${FMT.format(p.meta)} previstas no ciclo`,
      icone: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    },
    {
      rotulo: "Auditores Ativos",
      valor: `${FMT.format(p.ativos)}/${FMT.format(p.auditores)}`,
      nota: `${PCT.format(p.auditores ? (p.ativos / p.auditores) * 100 : 0)}% do efetivo escalado`,
      icone: <Users className="h-5 w-5 text-ouro" />,
    },
    {
      rotulo: "Conformidade das Câmeras",
      valor: `${PCT.format(p.taxaConf)}%`,
      nota: `${FMT.format(p.conformes)} lançamentos conformes (mín. ${p.minimo})`,
      icone: <TrendingUp className="h-5 w-5 text-cyan-400" />,
    },
    {
      rotulo: "Evidências Restantes",
      valor: `${FMT.format(p.falta)}`,
      nota: `ritmo: ${FMT.format(Math.ceil(p.ritmoNecessario))}/turno restante`,
      icone: <Clock className="h-5 w-5 text-rose-400" />,
    },
  ];

  const [gavetaFiltrosAberta, setGavetaFiltrosAberta] = useState(false);
  const totalFiltrosAtivos = [
    f.fracao !== "todas",
    f.semana !== "todas",
    f.turno !== "todos",
    Boolean(f.de || f.ate),
    Boolean(f.excecao),
    Boolean(f.busca),
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-16">
      {/* ---------------- Barra de Filtros Escura Tática Responsiva ---------------- */}
      <div className="sticky top-[54px] sm:top-[64px] z-30 -mx-4 sm:-mx-6 mb-6 border-b border-white/15 bg-[#070b14]/95 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-2xl">
        
        {/* MOBILE (linha única 48px, carrossel de semanas e gaveta tática) */}
        <div className="flex items-center justify-between gap-2 lg:hidden">
          {/* Busca Rápida */}
          <div className="shrink-0">
            <PaletaComando
              lancamentos={lancamentos}
              onSelecionarFracao={(fracao) => {
                definir({ fracao });
                toast.info(`Filtro aplicado: ${ROTULO_SUBUNIDADE[fracao] ?? fracao}`);
              }}
              onSelecionarSemana={(semana) => {
                definir({ semana });
                toast.info(`Filtro aplicado: Semana ${semana}`);
              }}
              onExportarCsv={baixarLancamentosCsv}
            />
          </div>

          {/* Pílulas Rápidas de Semanas (Scroll Horizontal Suave) */}
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {[
              { id: "todas", label: "Mês" },
              { id: "1", label: "Sem 1" },
              { id: "2", label: "Sem 2" },
              { id: "3", label: "Sem 3" },
              { id: "4", label: "Sem 4" },
            ].map((item) => {
              const ativo = f.semana === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => definir({ semana: item.id })}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all",
                    ativo
                      ? "bg-vermelho text-white shadow-xs"
                      : "bg-[#0d1627] text-slate-300 hover:bg-white/10 border border-white/10"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Botão Gaveta de Filtros */}
          <button
            type="button"
            onClick={() => setGavetaFiltrosAberta(true)}
            className={cn(
              "relative shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
              totalFiltrosAtivos > 0
                ? "border-vermelho bg-vermelho/20 text-vermelho shadow-xs"
                : "border-white/15 bg-[#0d1627] text-slate-300 hover:bg-white/10"
            )}
            aria-label="Abrir filtros avançados"
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            {totalFiltrosAtivos > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-vermelho text-[10px] font-black text-white">
                {totalFiltrosAtivos}
              </span>
            )}
          </button>
        </div>

        {/* DESKTOP (Linha completa e espaçosa) */}
        <div className="hidden lg:flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-ouro text-xs">
              <Filter className="h-4 w-4" /> Recorte:
            </span>

            <PaletaComando
              lancamentos={lancamentos}
              onSelecionarFracao={(fracao) => {
                definir({ fracao });
                toast.info(`Filtro aplicado: ${ROTULO_SUBUNIDADE[fracao] ?? fracao}`);
              }}
              onSelecionarSemana={(semana) => {
                definir({ semana });
                toast.info(`Filtro aplicado: Semana ${semana}`);
              }}
              onExportarCsv={baixarLancamentosCsv}
            />

            <select
              value={f.fracao}
              onChange={(e) => definir({ fracao: e.target.value })}
              className="rounded-xl border border-white/15 bg-[#0d1627] px-3 py-1.5 font-bold text-white shadow-xs focus:border-ouro focus:outline-none"
            >
              <option value="todas">Todas as Frações (Batalhão)</option>
              {metas.map((m) => (
                <option key={m.subunidade} value={m.subunidade}>
                  {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
                </option>
              ))}
            </select>

            <select
              value={f.semana}
              onChange={(e) => definir({ semana: e.target.value })}
              className="rounded-xl border border-white/15 bg-[#0d1627] px-3 py-1.5 font-bold text-white shadow-xs focus:border-ouro focus:outline-none"
            >
              <option value="todas">Ciclo Completo (4 Semanas)</option>
              <option value="1">Semana 1 (01 a 07)</option>
              <option value="2">Semana 2 (08 a 14)</option>
              <option value="3">Semana 3 (15 a 21)</option>
              <option value="4">Semana 4 (22 a 31)</option>
            </select>

            <select
              value={f.turno}
              onChange={(e) => definir({ turno: e.target.value })}
              className="rounded-xl border border-white/15 bg-[#0d1627] px-3 py-1.5 font-bold text-white shadow-xs focus:border-ouro focus:outline-none"
            >
              <option value="todos">Todos os Turnos</option>
              <option value="diurno">Diurno</option>
              <option value="noturno">Noturno</option>
            </select>

            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={() => setF(FILTROS_VAZIOS)}
                className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-1.5 font-bold text-red-400 hover:bg-red-900/50 transition-colors text-xs"
              >
                Limpar ({totalFiltrosAtivos})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={atualizar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:text-white text-xs transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", atualizando && "animate-spin")} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:text-white text-xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- GAVETA TÁTICA MOBILE (BOTTOM SHEET DARK) ---------------- */}
      {gavetaFiltrosAberta && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in"
        >
          <div
            className="fixed inset-0"
            onClick={() => setGavetaFiltrosAberta(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-ouro bg-[#0b1222] p-5 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="font-serif text-lg font-extrabold uppercase tracking-wide text-white">
                  Filtros & Recortes
                </p>
                <p className="text-xs text-slate-400">Isole frações, semanas e turnos de auditoria</p>
              </div>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
                aria-label="Fechar gaveta"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Fração */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Fração / Subunidade
                </label>
                <select
                  value={f.fracao}
                  onChange={(e) => definir({ fracao: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-[#0d1627] p-3 font-bold text-white text-sm focus:border-ouro"
                >
                  <option value="todas">Todas as frações (Batalhão)</option>
                  {metas.map((m) => (
                    <option key={m.subunidade} value={m.subunidade}>
                      {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semana */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Semana Operacional
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todas", label: "Todas (Mês)" },
                    { id: "1", label: "Semana 1 (01–07)" },
                    { id: "2", label: "Semana 2 (08–14)" },
                    { id: "3", label: "Semana 3 (15–21)" },
                    { id: "4", label: "Semana 4 (22–31)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => definir({ semana: s.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                        f.semana === s.id
                          ? "border-ouro bg-ouro/20 text-ouro shadow-xs"
                          : "border-white/10 bg-[#0d1627] text-slate-300"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Turno
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "diurno", label: "Diurno" },
                    { id: "noturno", label: "Noturno" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => definir({ turno: t.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                        f.turno === t.id
                          ? "border-ouro bg-ouro/20 text-ouro shadow-xs"
                          : "border-white/10 bg-[#0d1627] text-slate-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações da Gaveta */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setF(FILTROS_VAZIOS);
                  setGavetaFiltrosAberta(false);
                }}
                className="rounded-xl border border-white/15 bg-white/5 py-3 text-center text-sm font-bold text-slate-300 hover:bg-white/10"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="rounded-xl bg-ouro py-3 text-center text-sm font-extrabold text-[#0b1222] shadow-md hover:bg-ouro/90"
              >
                Aplicar Recorte
              </button>
            </div>
          </div>
        </div>
      )}

      {erro && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-300 shadow-xl">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Leitura da planilha indisponível</p>
            <p className="text-xs text-red-300/80 mt-0.5">{erro}</p>
          </div>
        </div>
      )}

      {/* ---------------- SEÇÃO 1: Diagnóstico e Visão Geral ---------------- */}
      <section className="mb-8" aria-label="Diagnóstico Geral">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-ouro" />
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
              Painel de Diagnóstico Geral
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Diretriz nº PM3-001/02/25
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Lado Esquerdo: Diagnóstico e KPIs */}
          <div className="flex flex-col justify-between gap-4">
            {/* Banner de Diagnóstico */}
            <div
              className={cn(
                "rounded-2xl border p-5 shadow-2xl backdrop-blur-md bg-gradient-to-r",
                diag.nivel === "superacao"
                  ? "border-blue-500/30 from-blue-950/40 via-[#0d1627] to-[#070b14]"
                  : diag.nivel === "conforme"
                  ? "border-emerald-500/30 from-emerald-950/40 via-[#0d1627] to-[#070b14]"
                  : diag.nivel === "atencao"
                  ? "border-amber-500/30 from-amber-950/40 via-[#0d1627] to-[#070b14]"
                  : "border-red-500/30 from-red-950/40 via-[#0d1627] to-[#070b14]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif text-base sm:text-lg font-bold text-white">
                  {diag.titulo}
                </p>
                <SeloV2 nivel={diag.nivel} />
              </div>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{diag.detalhe}</p>
            </div>

            {/* Grid dos 4 KPIs Essenciais */}
            <div className="grid gap-3.5 grid-cols-2">
              {kpis.map((k) => (
                <div
                  key={k.rotulo}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-4 shadow-xl backdrop-blur-md hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {k.rotulo}
                    </span>
                    {k.icone}
                  </div>
                  <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{k.valor}</p>
                  <p className="mt-1 text-xs text-slate-400 font-medium">{k.nota}</p>
                </div>
              ))}
            </div>

            {/* Barra de Estatísticas de Apoio */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0b1222]/80 px-4 py-3 text-xs text-slate-400 shadow-sm">
              <span>
                Mediana por Lançamento: <strong className="text-white font-bold">{FMT.format(p.mediana)}</strong>
              </span>
              <span>
                Percentil 90 (p90): <strong className="text-white font-bold">{FMT.format(p.p90)}</strong>
              </span>
              <span>
                Turnos Cumpridos: <strong className="text-white font-bold">{FMT.format(p.turnosCumpridos)}</strong> de {FMT.format(p.turnosPrevistos)}
              </span>
              <span>
                Partes Confeccionadas: <strong className="text-white font-bold">{FMT.format(p.partes)}</strong>
              </span>
            </div>
          </div>

          {/* Lado Direito: Barra de Progresso de Faixas + Ritmo */}
          <div className="flex flex-col gap-4">
            {/* Card principal de progresso */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-5 shadow-2xl backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Conformidade e Ritmo da Gestão Operacional da Meta
              </p>
              <p className="text-[10px] text-slate-500 mb-4">
                {f.fracao === "todas" ? '16º BPM/M — "1º Ten PM Fernão"' : `${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao}`}
                {f.semana !== "todas" ? ` · Semana ${f.semana}` : " · Ciclo completo"}
              </p>

              {/* Percentual grande */}
              <div className="text-center mb-4">
                <span
                  className={cn(
                    "text-5xl font-black tracking-tight",
                    p.pct > 100 ? "text-blue-400" : p.pct >= 80 ? "text-emerald-400" : p.pct >= 50 ? "text-amber-300" : "text-red-400"
                  )}
                >
                  {PCT.format(p.pct)}%
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {FMT.format(p.total)} de {FMT.format(p.meta)} evidências
                </p>
              </div>

              {/* Barra de progresso com faixas */}
              <div className="relative w-full h-5 rounded-full overflow-hidden bg-[#1a2333] border border-white/10">
                {/* Zonas de fundo */}
                <div className="absolute inset-0 flex">
                  <div className="w-[50%] bg-red-950/40 border-r border-white/10" />
                  <div className="w-[30%] bg-amber-950/40 border-r border-white/10" />
                  <div className="w-[20%] bg-emerald-950/40" />
                </div>
                {/* Preenchimento real */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                    p.pct > 100 ? "bg-gradient-to-r from-blue-600 to-blue-400" : p.pct >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : p.pct >= 50 ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400"
                  )}
                  style={{ width: `${Math.min(p.pct, 100)}%` }}
                />
                {/* Marcadores de faixa */}
                <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/30" />
                <div className="absolute top-0 bottom-0 left-[80%] w-px bg-white/30" />
              </div>
              {/* Labels das faixas */}
              <div className="flex mt-1.5 text-[9px] text-slate-500">
                <span className="w-[50%] text-center">Crítica</span>
                <span className="w-[30%] text-center">Atenção</span>
                <span className="w-[20%] text-center">Conformidade</span>
              </div>

              {/* Selo */}
              <div className="flex justify-center mt-3">
                <SeloV2 nivel={p.nivelGeral} />
              </div>
            </div>

            {/* Cards de Ritmo e Saldo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-center">
                <Zap className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">Ritmo Necessário</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">{FMT.format(Math.ceil(p.ritmoNecessario))}</p>
                <p className="text-[9px] text-slate-400">evidências/turno</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 text-center">
                <Target className="h-4 w-4 text-rose-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/70">Saldo Restante</p>
                <p className="text-xl font-black text-rose-300 mt-0.5">{FMT.format(p.falta)}</p>
                <p className="text-[9px] text-slate-400">evidências para 100%</p>
              </div>
            </div>

            {/* Régua de Faixas */}
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="rounded-lg border border-red-500/20 bg-red-950/40 p-1.5">
                <span className="block text-[11px] font-bold text-red-400">Crítica</span>
                <span className="text-[9px] text-slate-400">&lt; 50%</span>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/40 p-1.5">
                <span className="block text-[11px] font-bold text-amber-300">Atenção</span>
                <span className="text-[9px] text-slate-400">50–80%</span>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/40 p-1.5">
                <span className="block text-[11px] font-bold text-emerald-400">Conformidade</span>
                <span className="text-[9px] text-slate-400">80–100%</span>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-950/40 p-1.5">
                <span className="block text-[11px] font-bold text-blue-400">Superação</span>
                <span className="text-[9px] text-slate-400">&gt; 100%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SEÇÃO 2: Metas por Semana ---------------- */}
      <section className="mb-8" aria-label="Evolução Semanal">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
              Evolução das Metas por Semana
            </h2>
          </div>
          {f.semana !== "todas" && (
            <button
              type="button"
              onClick={() => definir({ semana: "todas" })}
              className="rounded-lg border border-ouro/40 bg-ouro/10 px-2.5 py-1 text-xs font-bold text-ouro hover:bg-ouro/20"
            >
              Exibindo Semana {f.semana} · Ver Todas as Semanas
            </button>
          )}
        </div>

        <QuadroSemanalV2
          semanas={p.semanasBatalhao}
          semanaAtiva={f.semana}
          onSelecionarSemana={(sem) => definir({ semana: sem })}
        />
      </section>

      {/* ---------------- SEÇÃO 3: Desempenho por Fração ---------------- */}
      <section className="mb-8" aria-label="Desempenho por Companhia">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
              Desempenho Comparativo
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Cotas proporcionais ao quadro (570 PMs)
          </span>
        </div>

        <RankingFracoesV2
          dados={p.fracoes}
          onSelecionar={(chave) => definir({ fracao: f.fracao === chave ? "todas" : chave })}
        />
      </section>

      {/* ---------------- SEÇÃO 4: Produção Diária e Qualidade ---------------- */}
      <section className="mb-8" aria-label="Análise Técnica">
        <div className="mb-4 flex flex-wrap items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-rose-400" />
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
              Análise Técnica de Produção
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAba("ritmo")}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                aba === "ritmo"
                  ? "bg-ouro/20 text-ouro border border-ouro/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Produção por Dia
            </button>
            <button
              type="button"
              onClick={() => setAba("qualidade")}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                aba === "qualidade"
                  ? "bg-ouro/20 text-ouro border border-ouro/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Por Posto & Graduação
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 to-[#080e1b]/95 p-5 shadow-2xl backdrop-blur-md">
          {aba === "ritmo" ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Histórico Diário com Limites de Controle
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acompanhamento dia a dia e comparação com a meta operacional diária
                  </p>
                </div>
              </div>
              {p.porDia.length ? (
                <ProducaoDiariaV2
                  dados={p.porDia}
                  mediaDia={p.mediaDia}
                  lsc={p.lsc}
                  lic={p.lic}
                  metaDia={p.metaDia}
                />
              ) : (
                <p className="py-12 text-center text-xs text-slate-500">Sem dados no recorte.</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="mb-4 text-sm font-bold text-white">
                Distribuição por Posto e Graduação
              </h3>
              {p.dados.length ? (
                <BarrasSimplesV2 dados={p.porPosto} />
              ) : (
                <p className="py-12 text-center text-xs text-slate-500">Sem dados no recorte.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- SEÇÃO 5: Tabela Analítica de Auditores ---------------- */}
      <section aria-label="Tabela Analítica">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
                Quadro de Auditores e Lançamentos
              </h2>
              <p className="text-xs text-slate-400">
                Detalhamento nominal com ordenação e busca instantânea
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={f.busca}
                  onChange={(e) => definir({ busca: e.target.value })}
                  placeholder="Buscar auditor..."
                  className="rounded-xl border border-white/10 bg-[#070b14] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-ouro focus:outline-none w-48 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={baixarCsv}
                disabled={!tabela.length}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {tabela.length ? (
            <div className="max-h-[30rem] overflow-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
                <thead className="sticky top-0 bg-[#070b14] text-slate-400 shadow-sm">
                  <tr>
                    <Th col="nome" ordem={ordem} ordenar={ordenarPor}>
                      Auditor
                    </Th>
                    <th scope="col" className="px-4 py-3 font-bold text-xs uppercase text-slate-300">
                      Posto/Grad
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold text-xs uppercase text-slate-300">
                      Fração
                    </th>
                    <Th col="lanc" num ordem={ordem} ordenar={ordenarPor}>
                      Lançamentos
                    </Th>
                    <Th col="videos" num ordem={ordem} ordenar={ordenarPor}>
                      Evidências
                    </Th>
                    <Th col="media" num ordem={ordem} ordenar={ordenarPor}>
                      Média
                    </Th>
                    <Th col="abaixo" num ordem={ordem} ordenar={ordenarPor}>
                      Desvios
                    </Th>
                    <th scope="col" className="px-4 py-3 font-bold text-xs uppercase text-slate-300">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tabela.map((r: LinhaAuditor) => (
                    <tr key={r.chave} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{r.nome}</td>
                      <td className="px-4 py-3 text-slate-400">{r.posto}</td>
                      <td className="px-4 py-3 text-slate-400">{r.fracao}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {FMT.format(r.lanc)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-white">
                        {FMT.format(r.videos)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {PCT.format(r.media)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {FMT.format(r.abaixo + r.naoAuditou)}
                      </td>
                      <td className="px-4 py-3">
                        <SeloV2 nivel={r.nivel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-slate-500">
              Nenhum auditor encontrado no recorte atual.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- SEÇÃO 6: FUNDAMENTAÇÃO INSTITUCIONAL & DIRETRIZ ---------------- */}
      <section className="mt-10 space-y-6" aria-label="Fundamentação Institucional">
        {/* Bloco 1: Por que Auditamos? */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-ouro" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
                Por que Auditamos?
              </h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Diretriz PM3-001/02/25 · Item 6.1.6
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed font-serif">
            A <strong className="text-white font-bold">Auditoria das Evidências Digitais (COP)</strong> é o exame sistemático, independente e documentado dos registros captados por Câmeras Operacionais Corporais, realizada por meio de credencial pessoal de acesso ao SiGCED, com base nas <strong className="text-white font-bold">cinco finalidades institucionais</strong> que orientam toda a auditoria das evidências digitais obtidas por COP:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                num: "01",
                rotulo: "CONFORMIDADE",
                desc: "Verificar se os registros e procedimentos atendem aos critérios técnicos estabelecidos.",
                borda: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400",
              },
              {
                num: "02",
                rotulo: "FISCALIZAÇÃO E ORIENTAÇÃO",
                desc: "Subsidiar a fiscalização de natureza pedagógica, disciplinar e procedimental.",
                borda: "border-blue-500/30 bg-blue-950/20 text-blue-400",
              },
              {
                num: "03",
                rotulo: "BOAS PRÁTICAS",
                desc: "Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos.",
                borda: "border-amber-500/30 bg-amber-950/20 text-amber-400",
              },
              {
                num: "04",
                rotulo: "MELHORIA CONTÍNUA",
                desc: "Transformar os achados da auditoria em aperfeiçoamento dos processos operacionais.",
                borda: "border-rose-500/30 bg-rose-950/20 text-rose-400",
              },
              {
                num: "05",
                rotulo: "INTELIGÊNCIA GERENCIAL",
                desc: "Extrair indicadores institucionais capazes de subsidiar decisões de gestão.",
                borda: "border-purple-500/30 bg-purple-950/20 text-purple-400",
              },
            ].map((item) => (
              <div
                key={item.num}
                className={`rounded-xl border p-4 backdrop-blur-sm transition-all hover:scale-[1.02] flex flex-col justify-between ${item.borda}`}
              >
                <div>
                  <span className="font-mono text-xl font-black opacity-80 block mb-1">{item.num}</span>
                  <h3 className="font-serif font-black text-xs sm:text-sm text-white tracking-wide mb-1.5">
                    {item.rotulo}
                  </h3>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 2: Critério de Classificação das Faixas de Desempenho */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#131d31]/90 via-[#0d1627]/90 to-[#080e1b]/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-ouro" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-white">
                Critério de Classificação das Faixas de Desempenho
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Regra Sistêmica de Governança
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3.5">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 mb-2">
                0 ≤ resultado &lt; 50%
              </span>
              <h3 className="font-serif font-black text-sm text-white">FAIXA CRÍTICA</h3>
              <p className="text-xs font-semibold text-red-400 mt-0.5">Abaixo da Meta</p>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Cumprimento insuficiente severo; exige intervenção imediata da gestão de frações.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                50% ≤ resultado &lt; 80%
              </span>
              <h3 className="font-serif font-black text-sm text-white">FAIXA DE ATENÇÃO</h3>
              <p className="text-xs font-semibold text-amber-300 mt-0.5">Cumprimento Insuficiente</p>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ciclo em andamento mas abaixo do limiar institucional de conformidade.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                80% ≤ resultado ≤ 100%
              </span>
              <h3 className="font-serif font-black text-sm text-white">FAIXA DE CONFORMIDADE</h3>
              <p className="text-xs font-semibold text-emerald-400 mt-0.5">Meta Cumprida</p>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Atingimento do limiar institucional de conformidade ou cumprimento integral da referência.
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-2">
                resultado &gt; 100%
              </span>
              <h3 className="font-serif font-black text-sm text-white">FAIXA DE SUPERAÇÃO</h3>
              <p className="text-xs font-semibold text-blue-400 mt-0.5">Meta Superada</p>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Superação quantitativa da referência prevista no ciclo mensal.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * A classificação é realizada sobre o valor numérico original antes de qualquer arredondamento gráfico. 80% equivale ao limiar institucional de conformidade; 100% equivale ao cumprimento integral da referência quantitativa.
          </p>
        </div>
      </section>
    </div>
  );
}
