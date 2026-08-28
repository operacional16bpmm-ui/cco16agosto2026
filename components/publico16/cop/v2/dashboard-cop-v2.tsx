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
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
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
  AgulhaoMetasV2,
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
    if (p.pct >= 80) {
      return {
        titulo: "Meta Geral Atingida pelo Batalhão",
        detalhe: `O 16º BPM/M registrou ${FMT.format(p.total)} evidências (${PCT.format(p.pct)}% da meta global de 960). O ritmo operacional está em total conformidade com a Diretriz PM3-001/02/25.`,
        nivel: "conforme" as Nivel,
      };
    }
    if (p.pct >= 50) {
      return {
        titulo: "Ciclo de Auditorias em Andamento",
        detalhe: `Foram lançadas ${FMT.format(p.total)} de ${FMT.format(p.meta)} evidências previstas (${PCT.format(p.pct)}%). Faltam ${FMT.format(p.falta)} evidências para a conclusão do período.`,
        nivel: "atencao" as Nivel,
      };
    }
    return {
      titulo: "Abaixo da Meta Prevista para o Período",
      detalhe: `Apenas ${FMT.format(p.total)} de ${FMT.format(p.meta)} evidências auditadas (${PCT.format(p.pct)}%). É necessário intensificar o cumprimento da cota mínima de 3 evidências por turno.`,
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

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 pb-16">
      {/* ---------------- Barra de Filtros Escura Tática ---------------- */}
      <div className="sticky top-[100px] z-20 -mx-4 sm:-mx-6 mb-6 border-b border-white/10 bg-[#070b14]/95 px-4 sm:px-6 py-3 backdrop-blur-md shadow-2xl">
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
          <div className="hidden sm:flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-4 w-4 text-ouro" />
            <span>Filtros:</span>
          </div>

          <div className="w-full sm:w-auto flex-1 sm:flex-none">
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

          <select
            value={f.fracao}
            onChange={(e) => definir({ fracao: e.target.value })}
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-[#0d1627] px-3 py-2 font-semibold text-white text-xs sm:text-sm focus:border-ouro focus:outline-none"
          >
            <option value="todas">Todas as Frações</option>
            {metas.map((m) => (
              <option key={m.subunidade} value={m.subunidade}>
                {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
              </option>
            ))}
          </select>

          <select
            value={f.semana}
            onChange={(e) => definir({ semana: e.target.value })}
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-[#0d1627] px-3 py-2 font-semibold text-white text-xs sm:text-sm focus:border-ouro focus:outline-none"
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
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-[#0d1627] px-3 py-2 font-semibold text-white text-xs sm:text-sm focus:border-ouro focus:outline-none"
          >
            <option value="todos">Todos os Turnos</option>
            <option value="diurno">Diurno</option>
            <option value="noturno">Noturno</option>
          </select>

          <button
            type="button"
            onClick={() => setF(FILTROS_VAZIOS)}
            className="rounded-xl border border-white/10 px-3 py-2 font-bold text-slate-400 hover:border-red-500/40 hover:text-red-400 text-xs"
          >
            Limpar
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={atualizar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-300 hover:text-white text-xs transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", atualizando && "animate-spin")} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-300 hover:text-white text-xs transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

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
                diag.nivel === "conforme"
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

          {/* Lado Direito: Agulhão / Manômetro Escuro */}
          <AgulhaoMetasV2
            pct={p.pct}
            total={p.total}
            meta={p.meta}
            titulo={f.fracao === "todas" ? "Desempenho Geral do 16º Batalhão" : `Ritmo Operacional · ${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao}`}
            subtitulo={f.semana !== "todas" ? `Recorte da Semana ${f.semana}` : "Ciclo completo de 960 evidências"}
          />
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
              Desempenho por Companhia e Fração
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
    </div>
  );
}
