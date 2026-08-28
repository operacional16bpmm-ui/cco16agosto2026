"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileWarning,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  ROTULO_SUBUNIDADE,
  RITMO_GLOBAL_RESTANTE,
  TURNOS_RESTANTES_GLOBAL,
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";
import {
  FILTROS_VAZIOS,
  FMT,
  PCT,
  auditoresParaCsv,
  calcularPainel,
  lancamentosParaCsv,
  conclusaoDistribuicao,
  conclusaoFunil,
  conclusaoHorario,
  conclusaoPareto,
  conclusaoQualidade,
  conclusaoRitmo,
  escreverFiltros,
  veredito,
  type Excecao,
  type Filtros,
  type LinhaAuditor,
} from "@/lib/cop2026-metricas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Cartao, Selo, SemDados } from "./primitivos";
import { PaletaComando } from "./paleta-comando";
import {
  AgulhaoMetas,
  BarrasSimples,
  Boxplot,
  COR_FAIXA,
  Funil,
  Heatmap,
  Histograma,
  Pareto,
  ProducaoDiaria,
  QuadroSemanalBatalhao,
  RankingFracoes,
} from "./graficos";

const ABAS = [
  { id: "ritmo", rotulo: "Ritmo" },
  { id: "qualidade", rotulo: "Qualidade" },
  { id: "distribuicao", rotulo: "Distribuição" },
  { id: "pessoas", rotulo: "Pessoas" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

type Coluna = "nome" | "lanc" | "videos" | "media" | "abaixo";

/** A aba inativa continua no DOM, só escondida: é o que permite ao
 *  `@media print` expandir as quatro de uma vez sem obrigar o Comando a
 *  imprimir quatro páginas, uma por clique. `display: contents` para o grupo
 *  não criar um nível extra dentro do grid. */
function ListaExcecao({
  titulo,
  itens,
  vazio,
  semJustificativa,
  comParte,
}: {
  titulo: string;
  itens: Excecao[];
  vazio: string;
  semJustificativa: string;
  comParte?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center justify-between gap-2 rotulo-dado text-texto-suave">
        {titulo}
        <span
          className={cn(
            "dados-destaque text-lg",
            itens.length ? "text-sinal-critico" : "text-sinal-conforme"
          )}
        >
          {FMT.format(itens.length)}
        </span>
      </p>
      {itens.length ? (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={`${i.id}-${i.parte}`} className="rounded-lg border border-borda px-3 py-2.5">
              <p className="text-[13px] font-semibold text-branco">
                {comParte ? `Parte ${i.parte}` : i.quem}
              </p>
              <p className="dados mt-0.5 text-[11.5px] text-texto-suave">
                {i.fracao} · {formatarData(i.data)}
                {i.turno ? ` · ${i.turno}` : ""}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
                {comParte ? i.quem : i.justificativa || semJustificativa}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-borda px-3 py-4 text-center text-[12.5px] text-texto-suave">
          {vazio}
        </p>
      )}
    </div>
  );
}

function Th({
  col,
  children,
  num,
  ordem,
  ordenar,
}: {
  col: Coluna;
  children: React.ReactNode;
  num?: boolean;
  ordem: { col: Coluna; desc: boolean };
  ordenar: (col: Coluna) => void;
}) {
  return (
    <th scope="col" className={cn("px-4 py-3", num && "text-right")}>
      <button
        type="button"
        onClick={() => ordenar(col)}
        className="inline-flex items-center gap-1 hover:text-vermelho"
        aria-label={`Ordenar por ${String(children)}`}
      >
        {children}
        <ArrowUpDown
          size={12}
          className={cn("opacity-40", ordem.col === col && "opacity-100")}
          aria-hidden
        />
      </button>
    </th>
  );
}

/** A planilha guarda ISO; o Batalhão lê dd/mm/aaaa. */
function formatarData(iso: string) {
  if (!iso) return "sem data";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

function Grupo({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  return (
    <div className={ativo ? "contents" : "hidden print:contents"} aria-hidden={!ativo}>
      {children}
    </div>
  );
}

export function DashboardCop({
  lancamentos,
  metas,
  lidoEm,
  erro,
  filtrosIniciais,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  erro?: string;
  filtrosIniciais: Filtros;
}) {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(filtrosIniciais);
  const [aba, setAba] = useState<Aba>("ritmo");
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: "videos", desc: true });
  const [atualizando, setAtualizando] = useState(false);
  const [exportandoBriefing, setExportandoBriefing] = useState(false);
  const primeiroRender = useRef(true);
  const painelBriefingRef = useRef<HTMLDivElement>(null);

  /* O recorte vive na URL para o link ser colável no WhatsApp com o filtro
     dentro. `history.replaceState` em vez de router.replace: trocar de filtro
     não é navegar — não deve empilhar histórico nem repetir a leitura da
     planilha no servidor. */
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const qs = escreverFiltros(f);
    window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [f]);

  /* A planilha revalida a cada 60s; o painel fica no telão do CCO e precisa
     acompanhar sem ninguém apertar nada. */
  const atualizar = useCallback(() => {
    setAtualizando(true);
    router.refresh();
    window.setTimeout(() => setAtualizando(false), 1200);
  }, [router]);

  useEffect(() => {
    const t = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(t);
  }, [atualizar]);

  const p = useMemo(() => calcularPainel(lancamentos, metas, f), [lancamentos, metas, f]);
  const v = veredito(p);

  const exportarBriefingPng = useCallback(async () => {
    if (!painelBriefingRef.current || exportandoBriefing) return;

    setExportandoBriefing(true);
    const node = painelBriefingRef.current;
    try {
      await document.fonts?.ready;
      const captureOptions = {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: "#edf2f7",
        filter: (child: HTMLElement) =>
          child.tagName !== "VIDEO" && child.dataset.noBriefing !== "true",
      } as const;
      // Captura sempre uma cópia estática: vídeos e controles interativos não
      // entram na rasterização e não conseguem travar a geração do arquivo.
      const copia = node.cloneNode(true) as HTMLElement;
      // Só saem o vídeo de fundo e o próprio botão de exportar (data-no-briefing).
      // Os cards clicáveis (semanas, frações) SÃO conteúdo e precisam ficar no PNG.
      copia
        .querySelectorAll('video, [data-no-briefing="true"]')
        .forEach((elemento) => elemento.remove());
      copia.style.position = "fixed";
      copia.style.left = "-100000px";
      copia.style.top = "0";
      copia.style.width = `${node.getBoundingClientRect().width}px`;
      document.body.appendChild(copia);
      let dataUrl: string;
      try {
        dataUrl = await toPng(copia, captureOptions);
      } finally {
        copia.remove();
      }
      const nomeArquivo = `painel-cop-2026-${new Date().toISOString().slice(0, 10)}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const urlDownload = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = nomeArquivo;
      link.href = urlDownload;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(urlDownload);
        link.remove();
      }, 1000);
      toast.success("Painel completo exportado em PNG.");
    } catch {
      toast.error("Não foi possível gerar o briefing em PNG. Tente novamente.");
    } finally {
      setExportandoBriefing(false);
    }
  }, [exportandoBriefing]);

  const definir = (patch: Partial<Filtros>) => setF((a) => ({ ...a, ...patch }));

  const chips = [
    f.fracao !== "todas" && {
      k: "fracao",
      t: ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao,
      limpar: () => definir({ fracao: "todas" }),
    },
    f.semana !== "todas" && {
      k: "semana",
      t: `Semana ${f.semana} (${f.semana === "1" ? "01–07" : f.semana === "2" ? "08–14" : f.semana === "3" ? "15–21" : "22–31"})`,
      limpar: () => definir({ semana: "todas" }),
    },
    f.turno !== "todos" && {
      k: "turno",
      t: f.turno === "diurno" ? "Diurno" : "Noturno",
      limpar: () => definir({ turno: "todos" }),
    },
    (f.de || f.ate) && {
      k: "periodo",
      t: `${f.de || "início"} → ${f.ate || "hoje"}`,
      limpar: () => definir({ de: "", ate: "" }),
    },
    f.excecao && {
      k: "excecao",
      t:
        f.excecao === "naoauditou"
          ? "Não auditaram"
          : f.excecao === "abaixo"
            ? `Abaixo de ${p.minimo}`
            : "Sem IDs de mídia",
      limpar: () => definir({ excecao: "" }),
    },
    f.busca && { k: "busca", t: `"${f.busca}"`, limpar: () => definir({ busca: "" }) },
  ].filter(Boolean) as { k: string; t: string; limpar: () => void }[];

  const kpis = [
    {
      rotulo: "Cumprimento da meta",
      valor: `${PCT.format(p.pct)}%`,
      nota:
        f.semana !== "todas"
          ? `${FMT.format(p.falta)} a realizar na Sem. ${f.semana}`
          : `${FMT.format(p.falta)} evidências a realizar`,
      foto: "/media/foto-viatura.jpg",
      icone: <Target size={22} strokeWidth={2.4} aria-hidden />,
    },
    {
      rotulo: "Evidências auditadas",
      valor: FMT.format(p.total),
      nota:
        f.semana !== "todas"
          ? `meta da semana ${f.semana}: ${FMT.format(p.meta)}`
          : `meta do período: ${FMT.format(p.meta)}`,
      foto: "/media/foto_operacao.jpg",
      icone: <Target size={18} aria-hidden />,
    },
    {
      rotulo: "Auditores ativos",
      valor: `${FMT.format(p.ativos)}/${FMT.format(p.auditores)}`,
      nota: `${PCT.format(p.auditores ? (p.ativos / p.auditores) * 100 : 0)}% do efetivo designado`,
      foto: "/media/foto-oficial.jpg",
      icone: <Users size={18} aria-hidden />,
    },
    {
      rotulo: `Conformidade (≥${p.minimo})`,
      valor: `${PCT.format(p.taxaConf)}%`,
      nota: `${FMT.format(p.conformes)} de ${FMT.format(p.dados.length)} lançamentos`,
      foto: "/media/foto-rua.jpg",
      icone: <CheckCircle2 size={18} aria-hidden />,
    },
    {
      rotulo: "Ritmo necessário",
      valor: FMT.format(RITMO_GLOBAL_RESTANTE),
      nota: `evidências/turno · ${FMT.format(TURNOS_RESTANTES_GLOBAL)} turnos restantes`,
      foto: "/media/reel-operacao.jpg",
      icone: <TrendingUp size={22} strokeWidth={2.4} aria-hidden />,
    },
  ];

  const kpisPrincipais = [kpis[0]];
  const kpisApoio = [kpis[1], kpis[2], kpis[3]];

  const renderKpi = (k: (typeof kpis)[number], principal: boolean, className?: string) => (
    <div
      key={k.rotulo}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(202,2,2,0.22)] hover:border-vermelho",
        principal
          ? "min-h-[220px] border-[#ca0202]/45 p-6 shadow-[0_10px_26px_rgba(202,2,2,0.12)] sm:min-h-[250px] sm:p-7"
          : "min-h-[148px] p-4 sm:min-h-[164px] sm:p-5",
        className
      )}
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={k.foto}
          alt={k.rotulo}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover opacity-35 saturate-135 contrast-105 transition-transform duration-700 ease-out group-hover:scale-115 group-hover:opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-white/65" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-serif text-xs font-black uppercase tracking-wider text-[#1d1d1d] sm:text-sm">
            {k.rotulo}
          </span>
          <div className={cn(
            "flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 group-hover:bg-vermelho group-hover:text-white",
            principal
              ? "h-11 w-11 rounded-xl border-[#ca0202]/40 bg-[#ca0202]/10 text-[#ca0202] shadow-[0_5px_14px_rgba(202,2,2,0.16)]"
              : "h-8 w-8 rounded-lg border-red-200 bg-red-50 text-[#ca0202] shadow-xs"
          )}>
            {k.icone}
          </div>
        </div>
        <p
          className={cn(
            "metric-hero font-black text-[#1d1d1d] tracking-tight drop-shadow-2xs",
            principal ? "mt-5 text-5xl sm:text-6xl lg:text-7xl" : "mt-2.5 text-3xl sm:text-4xl"
          )}
        >
          {k.valor}
        </p>
        <div className={cn(principal ? "mt-4" : "mt-2")}>
          <span className="inline-block rounded-md border border-slate-200 bg-white/90 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
            {k.nota}
          </span>
        </div>
      </div>
    </div>
  );

  const excecoes = [
    {
      chave: "naoauditou" as const,
      rotulo: "Declararam não ter auditado",
      v: p.naoAuditou,
      icone: <AlertTriangle size={16} aria-hidden />,
    },
    {
      chave: "abaixo" as const,
      rotulo: `Auditaram abaixo do mínimo de ${p.minimo}`,
      v: p.abaixo,
      icone: <TrendingUp size={16} aria-hidden />,
    },
    {
      chave: "semids" as const,
      rotulo: "Auditaram sem informar IDs de mídia",
      v: p.semIds,
      icone: <FileWarning size={16} aria-hidden />,
    },
  ];

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

  const baixarCsv = () => {
    try {
      const blob = new Blob([auditoresParaCsv(tabela)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-cop-2026-auditores-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV de Auditores exportado!", {
        description: `${tabela.length} registros exportados com sucesso.`,
      });
    } catch {
      toast.error("Erro ao gerar o arquivo CSV.");
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
      toast.success("CSV de Lançamentos exportado!", {
        description: `${p.dados.length} registros brutos exportados com sucesso.`,
      });
    } catch {
      toast.error("Erro ao gerar o arquivo CSV.");
    }
  };

  const [gavetaFiltrosAberta, setGavetaFiltrosAberta] = useState(false);
  const totalFiltrosAtivos = chips.length;

  const ordenarPor = (col: Coluna) =>
    setOrdem((o) => ({ col, desc: o.col === col ? !o.desc : true }));

  return (
    <div className="mx-auto max-w-[1400px] px-3.5 sm:px-5 pb-12">
      {/* ---------------- HERO INSTITUCIONAL — 16º BPM/M ---------------- */}
      <header className="relative mb-8 pt-4 pb-6">
        {/* Filete superior institucional */}
        <div className="mb-5 flex items-center gap-3">
          <span className="h-[3px] w-10 bg-[#ca0202]" aria-hidden />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.32em] text-slate-600">
            Governo do Estado de São Paulo · Polícia Militar
          </span>
          <span className="h-px flex-1 bg-slate-300/80" aria-hidden />
        </div>

        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 md:grid md:grid-cols-[220px_minmax(0,1fr)_220px] md:items-stretch md:gap-x-0">
          {/* Brasão oficial do 16º BPM/M */}
          <div className="relative shrink-0 flex items-center justify-center md:pr-2 md:border-r md:border-slate-300/70">
            <Image
              src="/brand/brasao-16bpmm-hd.png"
              alt="Brasão do 16º BPM/M"
              width={2481}
              height={3508}
              className="h-auto w-40 object-contain drop-shadow-[0_18px_34px_rgba(7,24,45,0.4)] sm:w-48 md:w-64"
              priority
            />
          </div>

          {/* Bloco tipográfico */}
          <div className="min-w-0 flex-1 text-center md:text-left flex flex-col justify-center">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.28em] text-[#ca0202]">
              16º Batalhão de Polícia Militar Metropolitano
            </p>
            <h1 className="font-serif text-[26px] sm:text-4xl lg:text-[44px] font-black uppercase tracking-tight text-[#141414] mt-2 leading-[1.05]">
              Auditoria e Governança
              <span className="block text-[#1d1d1d]/85 font-bold normal-case tracking-tight italic mt-1 text-xl sm:text-2xl lg:text-[26px]">
                das Câmeras Operacionais Corporais
              </span>
            </h1>

            <div className="mt-4 h-px w-full max-w-md mx-auto md:mx-0 bg-gradient-to-r from-slate-300/90 via-slate-300/50 to-transparent" aria-hidden />

            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-[11px] sm:text-[12px] uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-2 rounded-sm bg-[#ca0202] px-3 py-1.5 font-black text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" aria-hidden />
                COP 2026
              </span>
              <span className="font-bold text-slate-700">
                Diretriz PM3-001/02/25
              </span>
              <span className="hidden sm:inline h-3 w-px bg-slate-300" aria-hidden />
              <span className="font-semibold text-slate-600 normal-case tracking-normal text-xs italic">
                Ambiente Executivo de Gestão e Controle
              </span>
            </div>
          </div>

          {/* Logomarca da Auditoria COP 2026 */}
          <div className="order-3 flex shrink-0 items-center justify-center md:order-none md:pl-2">
            <Image
              src="/brand/logo-auditoria-cop2026-transparent.png"
              alt="16º BPM/M — Auditoria COP 2026"
              width={1536}
              height={1536}
              className="h-auto w-48 object-contain drop-shadow-[0_16px_30px_rgba(7,24,45,0.34)] sm:w-64 md:w-80"
            />
          </div>
        </div>

        {/* Filete inferior */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" aria-hidden />
      </header>

      {/* ---------------- BARRA DE FILTROS RESPONSIVA SÊNIOR ---------------- */}
      <div className="nao-imprime sticky top-0 z-30 -mx-3.5 sm:-mx-5 mb-6 border-b-2 border-slate-300/80 bg-white/95 px-3.5 sm:px-5 py-2.5 backdrop-blur-md shadow-sm transition-all">
        
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
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                    ativo
                      ? "bg-vermelho text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
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
                ? "border-vermelho bg-vermelho/10 text-vermelho shadow-xs"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
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
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 text-xs">
              <Filter size={14} aria-hidden /> Recorte:
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
              aria-label="Filtrar por fração"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todas">Todas as frações (Batalhão)</option>
              {metas.map((m) => (
                <option key={m.subunidade} value={m.subunidade}>
                  {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
                </option>
              ))}
            </select>

            <select
              value={f.semana}
              onChange={(e) => definir({ semana: e.target.value })}
              aria-label="Filtrar por semana"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todas">Todas as semanas (Mês)</option>
              <option value="1">Semana 1 (01 a 07)</option>
              <option value="2">Semana 2 (08 a 14)</option>
              <option value="3">Semana 3 (15 a 21)</option>
              <option value="4">Semana 4 (22 a 31)</option>
            </select>

            <select
              value={f.turno}
              onChange={(e) => definir({ turno: e.target.value })}
              aria-label="Filtrar por turno"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todos">Todos os turnos</option>
              <option value="diurno">Diurno</option>
              <option value="noturno">Noturno</option>
            </select>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-xs">
              <label className="flex items-center gap-1">
                De
                <input
                  type="date"
                  value={f.de}
                  onChange={(e) => definir({ de: e.target.value })}
                  className="dados rounded bg-slate-50 px-1.5 py-0.5 text-branco text-xs"
                />
              </label>
              <label className="flex items-center gap-1">
                Até
                <input
                  type="date"
                  value={f.ate}
                  onChange={(e) => definir({ ate: e.target.value })}
                  className="dados rounded bg-slate-50 px-1.5 py-0.5 text-branco text-xs"
                />
              </label>
            </div>

            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={() => setF(FILTROS_VAZIOS)}
                className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho transition-colors text-xs"
              >
                Limpar ({totalFiltrosAtivos})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={atualizar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho shadow-xs transition-colors text-xs"
            >
              <RefreshCw size={13} className={cn(atualizando && "animate-spin")} aria-hidden />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho shadow-xs transition-colors text-xs"
            >
              <Printer size={13} aria-hidden /> Imprimir
            </button>
          </div>
        </div>

        {/* Chips de Filtros Ativos (Exibição Dinâmica) */}
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Ativos:</span>
            {chips.map((c) => (
              <button
                key={c.k}
                type="button"
                onClick={c.limpar}
                className="inline-flex items-center gap-1 rounded-full border border-vermelho/40 bg-vermelho/10 px-2.5 py-0.5 text-[11px] font-extrabold text-vermelho hover:bg-vermelho/20 transition-colors"
              >
                {c.t}
                <X size={11} aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- GAVETA TÁTICA MOBILE (BOTTOM SHEET) ---------------- */}
      {gavetaFiltrosAberta && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in"
        >
          <div
            className="fixed inset-0"
            onClick={() => setGavetaFiltrosAberta(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-4 border-vermelho bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="font-serif text-lg font-extrabold uppercase tracking-wide text-branco">
                  Filtros & Recortes
                </p>
                <p className="text-xs text-slate-500">Isole frações, semanas e turnos de auditoria</p>
              </div>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Fechar gaveta"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Fração */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Fração / Subunidade
                </label>
                <select
                  value={f.fracao}
                  onChange={(e) => definir({ fracao: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-3 font-bold text-branco text-sm"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                          ? "border-vermelho bg-vermelho text-white shadow-xs"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                          ? "border-vermelho bg-vermelho text-white shadow-xs"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervalo de Datas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Período de Datas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-slate-500">De:</span>
                    <input
                      type="date"
                      value={f.de}
                      onChange={(e) => definir({ de: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 font-bold text-branco text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500">Até:</span>
                    <input
                      type="date"
                      value={f.ate}
                      onChange={(e) => definir({ ate: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 font-bold text-branco text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações da Gaveta */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setF(FILTROS_VAZIOS);
                  setGavetaFiltrosAberta(false);
                }}
                className="rounded-xl border-2 border-slate-300 bg-slate-100 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="rounded-xl bg-vermelho py-3 text-center text-sm font-extrabold text-white shadow-md hover:bg-vermelho-escuro"
              >
                Aplicar Recorte
              </button>
            </div>
          </div>
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13px] text-sinal-critico"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-bold">Leitura da planilha falhou.</strong> Os números abaixo podem
            estar desatualizados ou zerados — não decida em cima deles. Última leitura confiável:{" "}
            {lidoEm}. Detalhe técnico: {erro}
          </span>
        </p>
      )}

      {/* O bloco exportado em PNG abarca a Situação (KPIs + termômetro) e a
          camada semanal (Meta Semanal + Companhias/Força Tática): é o conjunto
          que o Comando lê junto para decidir, então sai junto no arquivo. */}
      <div ref={painelBriefingRef} className="bg-[#edf2f7]">
      {/* ---------------- Camada 1: Situação ---------------- */}
      <section aria-label="Situação" className="relative mb-8">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-stretch">
          {/* Faixa superior: diagnóstico executivo ocupando toda a largura */}
          <div
            className="relative flex min-h-[122px] flex-wrap items-center gap-3.5 overflow-hidden rounded-2xl border-2 border-l-4 border-slate-700/80 bg-[#071225] p-5 shadow-[0_12px_30px_rgba(7,18,37,0.28)] sm:p-6 lg:col-span-12 lg:-mr-4"
            style={{ borderLeftColor: `var(--sinal-${v.nivel})` }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-65 saturate-110 contrast-110"
            >
              <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050c1a]/92 via-[#071225]/80 to-[#071225]/88" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#ca0202]/20" />

            <div className="relative z-10 ml-[18%] flex w-[82%] flex-wrap items-center gap-3.5 pr-4 md:ml-[24%] md:w-[76%] lg:ml-[22%] lg:w-[76%]">
              <Selo nivel={v.nivel} />
              <div className="min-w-0 flex-1 px-1 py-1 text-white">
                <p className="font-serif text-lg font-black leading-snug text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)] sm:text-xl">{v.titulo}</p>
                <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:text-sm">{v.detalhe}</p>
              </div>
            </div>
          </div>

          {/* Matriz de indicadores: sempre dois blocos por linha no desktop */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {kpisPrincipais.map((k) => renderKpi(k, true, "sm:col-span-2"))}
            {kpisApoio.map((k, indice) =>
              renderKpi(k, false, indice === kpisApoio.length - 1 ? "sm:col-span-2" : undefined)
            )}
          </div>

          {/* Termômetro ampliado, começando após a matriz de indicadores */}
          <div className="min-w-0 lg:col-span-5">
            <AgulhaoMetas
              pct={p.pct}
              total={p.total}
              meta={p.meta}
              ritmo={RITMO_GLOBAL_RESTANTE}
              turnosRestantes={TURNOS_RESTANTES_GLOBAL}
              titulo={f.fracao === "todas" ? '16º BPM/M — "1º Ten PM Fernão"' : `Ritmo Operacional · ${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao}`}
              subtitulo={{
                linha1: "META GLOBAL — 960 EVIDÊNCIAS",
                linha2: "DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
                linha3: "Distribuição Proporcional por Matriz Operacional",
              }}
            />
          </div>

          {/* Barra-resumo com destaque e movimento institucional sutil */}
          <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 border-[#ca0202]/45 bg-gradient-to-r from-white via-red-50/80 to-white px-5 py-4 text-[13px] font-semibold text-slate-700 shadow-[0_8px_20px_rgba(202,2,2,0.12)] lg:col-span-12">
            <span className="animar-bala pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-red-200/55 to-transparent" aria-hidden="true" />
            <span className="relative flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ca0202] animar-ao-vivo" aria-hidden="true" />
              Mediana por lançamento: <strong className="dados font-black text-slate-950">{FMT.format(p.mediana)}</strong> · p90{" "}
              <strong className="dados font-black text-slate-950">{FMT.format(p.p90)}</strong>
            </span>
            <span className="relative">
              Turnos cumpridos: <strong className="dados font-black text-slate-950">{FMT.format(p.turnosCumpridos)}</strong> de{" "}
              {FMT.format(p.turnosPrevistos)}
            </span>
            <span className="relative">
              Partes confeccionadas: <strong className="dados font-black text-slate-950">{FMT.format(p.partes)}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={exportarBriefingPng}
            disabled={exportandoBriefing}
            data-no-briefing="true"
            aria-label="Exportar painel completo (situação + semanal) em PNG"
            title="Exportar painel completo em PNG"
            className="group absolute right-[-16px] top-3 z-30 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#ca0202] text-white shadow-[0_10px_24px_rgba(202,2,2,0.38)] transition-all duration-300 hover:scale-110 hover:bg-[#a80000] hover:shadow-[0_14px_30px_rgba(202,2,2,0.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ca0202] disabled:cursor-wait disabled:opacity-80 lg:right-[-70px] lg:top-5"
          >
            {exportandoBriefing ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true">
                <path d="M6.5 3.5h7l4 4v13h-11z" />
                <path d="M13.5 3.5v4h4" />
                <path d="M8.5 15.5h7" />
                <path d="M12 10.5v5" />
                <path d="m9.8 13.3 2.2 2.2 2.2-2.2" />
              </svg>
            )}
            <span className="sr-only">Exportar briefing PNG</span>
          </button>
        </div>
      </section>

      {/* ---------------- Camada Semanal: Metas por Semana ---------------- */}
      <section aria-label="Evolução Semanal" className="mb-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-base font-bold text-branco">
                  Meta Semanal · {f.fracao === "todas" ? "240 Evidências / Semana (Btl)" : `${FMT.format(p.meta)} Evidências / Semana (${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao})`}
                </h2>
                <p className="text-[12.5px] text-texto-suave">
                  Divisão do ciclo de auditoria em 4 semanas operacionais · clique no card de uma semana para isolar o recorte
                </p>
              </div>
              {f.semana !== "todas" && (
                <button
                  type="button"
                  onClick={() => definir({ semana: "todas" })}
                  className="rounded-md border border-vermelho/30 bg-vermelho/5 px-2.5 py-1 text-[12px] font-semibold text-vermelho hover:bg-vermelho/10"
                >
                  Exibindo Semana {f.semana} · Ver Todas as Semanas
                </button>
              )}
            </div>

            {/* Faixa de apoio: registro visual do ciclo semanal, em degradê */}
            <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4 nao-imprime">
              {[
                { src: "/media/reel-patrulha.jpg", etiqueta: "Ciclo", legenda: "Patrulhamento Diário" },
                { src: "/media/controle-bg-poster.jpg", etiqueta: "Coleta", legenda: "Evidências Gravadas" },
                { src: "/media/reel-operacao.jpg", etiqueta: "Ritmo", legenda: "Empenho Operacional" },
                { src: "/media/foto_cpchq.jpg", etiqueta: "Fechamento", legenda: "Auditoria da Semana" },
              ].map((img) => (
                <div
                  key={img.src}
                  className="relative h-20 overflow-hidden rounded-xl border border-slate-300/85 bg-slate-900 shadow-sm sm:h-24"
                >
                  <Image
                    src={img.src}
                    alt=""
                    aria-hidden
                    width={400}
                    height={200}
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-vermelho">
                      {img.etiqueta}
                    </span>
                    <p className="text-[11px] font-bold leading-snug text-white">{img.legenda}</p>
                  </div>
                </div>
              ))}
            </div>

            <QuadroSemanalBatalhao
              semanas={p.semanasBatalhao}
              semanaAtiva={f.semana}
              onSelecionarSemana={(sem) => definir({ semana: sem })}
            />
          </div>

          {/* Visão lateral somente com as barras das Companhias e Força Tática */}
          <aside className="rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.09)] sm:p-5" aria-label="Barras de progresso das frações">
            <div className="mb-4 border-b border-slate-300/80 pb-3">
              <p className="font-serif text-sm font-black uppercase tracking-[0.1em] text-slate-950">
                Companhias e Força Tática
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Progresso visual por fração</p>
            </div>
            <ol className="space-y-3">
              {p.fracoes.map((fracao) => {
                const largura = Math.min(100, Math.max(0, fracao.pct));
                return (
                  <li key={fracao.chave}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px]">
                      <span className="truncate font-black uppercase tracking-wide text-slate-800">
                        {fracao.rotulo}
                      </span>
                      <span className="dados font-bold text-slate-500">{PCT.format(fracao.pct)}%</span>
                    </div>
                    <div
                      className="mt-1.5 h-6 overflow-hidden rounded bg-slate-200"
                      role="img"
                      aria-label={`${fracao.rotulo}: ${PCT.format(fracao.pct)}% da meta`}
                    >
                      <div
                        className="h-full rounded transition-[width] duration-700"
                        style={{
                          width: `${largura}%`,
                          background: `linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 100%), ${COR_FAIXA[fracao.nivel]}`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </section>
      </div>

      {/* ---------------- Camada 2: Onde agir ---------------- */}
      <section aria-label="Onde agir" className="mb-6">
        <Cartao
          titulo="Onde agir · frações"
          nota="rateio proporcional ao quadro COP (570 PMs) · clique para filtrar o painel"
          ajuda={
            <p>
              A meta de cada fração é proporcional ao efetivo fixo que usa COP diariamente (universo de
              570 PMs). A barra mostra o percentual já atingido, a cota em relação às 960 evidências do
              Batalhão e o ritmo necessário por turno restante.
            </p>
          }
        >
          {p.fracoes.length ? (
            <RankingFracoes
              dados={p.fracoes}
              onSelecionar={(chave) => definir({ fracao: f.fracao === chave ? "todas" : chave })}
            />
          ) : (
            <SemDados texto="Sem metas cadastradas na aba Parâmetros." />
          )}
        </Cartao>

      </section>

      {/* ---------------- Faixa horizontal: Exceções ---------------- */}
      <Cartao
        titulo="Exceções"
        nota="clique para ver os nomes na tabela analítica"
        className="mb-6"
        ajuda={
          <p>
            Exceção não é punição: é a lista do que precisa de justificativa ou de correção antes do
            fechamento do período.
          </p>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {excecoes.map((e) => {
            const ativo = f.excecao === e.chave;
            return (
              <button
                key={e.chave}
                type="button"
                onClick={() => definir({ excecao: ativo ? "" : e.chave })}
                aria-pressed={ativo}
                className={cn(
                  "flex min-h-[72px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                  ativo
                    ? "border-vermelho/50 bg-vermelho/5 shadow-sm"
                    : "border-borda bg-branco/[0.02] hover:border-vermelho/30 hover:bg-branco/[0.04]"
                )}
              >
                <span className={cn("shrink-0", e.v ? "text-sinal-critico" : "text-sinal-conforme")}>{e.icone}</span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-branco/85">{e.rotulo}</span>
                <span className={cn("dados-destaque text-2xl", e.v ? "text-sinal-critico" : "text-sinal-conforme")}>
                  {FMT.format(e.v)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 border-l-2 border-vermelho/50 pl-3 text-[12.5px] leading-relaxed text-texto-suave">
          {conclusaoFunil(p)}
        </p>
      </Cartao>

      {/* ---------------- Pontos de atenção ---------------- */}
      <Cartao
        titulo="Pontos de atenção"
        nota="o que a Diretriz PM3-001/02/25 manda olhar de perto, com a justificativa registrada"
        className="mb-6"
        ajuda={
          <p>
            Contagem não se cobra — nome se cobra. Aqui cada exceção aparece com quem, quando e a
            justificativa que a própria pessoa lançou no formulário.
          </p>
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          <ListaExcecao
            titulo="Respondeu NÃO auditei"
            itens={p.naoAuditouLista}
            vazio="Ninguém deixou de auditar no recorte."
            semJustificativa="Sem justificativa registrada."
          />
          <ListaExcecao
            titulo={`Abaixo do mínimo de ${p.minimo}`}
            itens={p.abaixoLista}
            vazio="Todos cumpriram o mínimo no recorte."
            semJustificativa={`Auditou abaixo do mínimo de ${p.minimo} por turno.`}
          />
          <ListaExcecao
            titulo="Partes confeccionadas"
            itens={p.partesLista}
            vazio="Nenhuma parte confeccionada no recorte."
            semJustificativa="Sem observação registrada."
            comParte
          />
        </div>
      </Cartao>

      {/* ---------------- Camada 3: Análise técnica ---------------- */}
      <section aria-label="Análise técnica" className="mb-6">
        <div className="nao-imprime mb-4 flex flex-wrap gap-1.5 border-b border-borda" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors",
                aba === a.id
                  ? "border-vermelho text-vermelho"
                  : "border-transparent text-texto-suave hover:text-branco"
              )}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className="impressao-expande grid gap-6 lg:grid-cols-2">
          <Grupo ativo={aba === "ritmo"}>
            <Cartao
              titulo="Produção por dia"
              nota="com a meta por turno e a faixa de variação normal (±3σ)"
              className="lg:col-span-2"
              conclusao={conclusaoRitmo(p)}
              ajuda={
                <>
                  <p>
                    A faixa cinza é a variação normal do Batalhão: quase todo dia cai dentro dela.
                  </p>
                  <p className="mt-1.5">
                    Ponto fora da faixa não é automaticamente ruim — é atípico, e atípico se verifica.
                    A linha tracejada vermelha é a meta por turno.
                  </p>
                </>
              }
            >
              {p.porDia.length ? (
                <ProducaoDiaria
                  dados={p.porDia}
                  mediaDia={p.mediaDia}
                  lsc={p.lsc}
                  lic={p.lic}
                  metaDia={p.metaDia}
                />
              ) : (
                <SemDados />
              )}
            </Cartao>
          </Grupo>

          <Grupo ativo={aba === "qualidade"}>
              <Cartao
                titulo="Evidências por lançamento"
                nota={`quantos lançamentos trouxeram 0, 1, 2… evidências (mínimo: ${p.minimo})`}
                conclusao={conclusaoQualidade(p)}
                ajuda={
                  <p>
                    Cada barra conta lançamentos, não evidências. As barras vermelhas cumprem o mínimo
                    do Batalhão; as cinzas ficam abaixo dele.
                  </p>
                }
              >
                {p.dados.length ? <Histograma dados={p.histograma} /> : <SemDados />}
              </Cartao>
              <Cartao
                titulo="Funil de conformidade"
                nota="do lançamento recebido até o ID de mídia informado"
                conclusao={conclusaoFunil(p)}
                ajuda={
                  <p>
                    Cada degrau é um filtro sobre o anterior. A perda entre degraus mostra onde o
                    processo está vazando.
                  </p>
                }
              >
                {p.dados.length ? <Funil etapas={p.funil} /> : <SemDados />}
              </Cartao>
          </Grupo>

          <Grupo ativo={aba === "distribuicao"}>
              <Cartao
                titulo="Dispersão por fração"
                nota="mediana, quartis e p90 de cada companhia"
                conclusao={conclusaoDistribuicao(p)}
                ajuda={
                  <>
                    <p>A caixa concentra a metade central dos lançamentos da fração.</p>
                    <p className="mt-1.5">
                      A barra branca é a mediana; a dourada é o p90 — o patamar que só os 10% mais
                      produtivos alcançam.
                    </p>
                  </>
                }
              >
                {p.dados.length ? <Boxplot dados={p.dispersao} /> : <SemDados />}
              </Cartao>
              <Cartao
                titulo="Matriz dia × horário"
                nota="onde a auditoria se concentra na semana"
                conclusao={conclusaoHorario(p)}
                ajuda={
                  <p>
                    Quanto mais escura a célula, mais evidências naquele dia e faixa de horário. Ajuda a
                    ver se a auditoria acompanha o turno de serviço ou se acumula no fim.
                  </p>
                }
              >
                {p.dados.length ? <Heatmap matriz={p.matriz} max={p.maxMatriz} /> : <SemDados />}
              </Cartao>
          </Grupo>

          <Grupo ativo={aba === "pessoas"}>
              <Cartao
                titulo="Pareto de auditores"
                nota="quem concentra a produção — clique numa barra para buscar o nome"
                className="lg:col-span-2"
                conclusao={conclusaoPareto(p)}
                ajuda={
                  <p>
                    As barras vão do maior para o menor produtor; a linha dourada acumula o percentual.
                    Onde ela cruza os 80% está o grupo que sustenta a auditoria — e o risco, se ele sair
                    de escala.
                  </p>
                }
              >
                {p.pareto.length ? (
                  <Pareto dados={p.pareto} onSelecionar={(nome) => definir({ busca: nome })} />
                ) : (
                  <SemDados />
                )}
              </Cartao>
              <Cartao titulo="Turno e função" nota="em que atribuição a auditoria acontece">
                {p.dados.length ? (
                  <div className="space-y-5">
                    <BarrasSimples dados={p.porTurno} titulo="Por turno" />
                    <BarrasSimples dados={p.porFuncao} titulo="Por função" />
                  </div>
                ) : (
                  <SemDados />
                )}
              </Cartao>
              <Cartao
                titulo="Por posto e graduação"
                nota="em que nível hierárquico a auditoria acontece — é por aqui que o Comando cobra"
              >
                {p.dados.length ? <BarrasSimples dados={p.porPosto} /> : <SemDados />}
              </Cartao>
          </Grupo>
        </div>
      </section>

      {/* ---------------- Tabela analítica ---------------- */}
      <Cartao
        titulo="Tabela analítica"
        nota="produção por auditor no recorte selecionado"
        ajuda={
          <p>
            Clique num cabeçalho para ordenar. O CSV exporta exatamente o que está na tela, já com o
            filtro aplicado.
          </p>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <input
            value={f.busca}
            onChange={(e) => definir({ busca: e.target.value })}
            placeholder="Buscar por nome de guerra ou posto…"
            aria-label="Buscar auditor"
            className="w-full max-w-sm rounded-md border border-borda bg-tatico-super px-3 py-2 text-sm text-branco placeholder:text-texto-suave"
          />
          <button
            type="button"
            onClick={baixarCsv}
            disabled={!tabela.length}
            className="nao-imprime inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 text-[13px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho disabled:opacity-40"
          >
            <Download size={14} aria-hidden /> Exportar CSV
          </button>
          <span className="dados text-[12.5px] text-texto-suave">
            {FMT.format(tabela.length)} auditor(es)
          </span>
        </div>

        {tabela.length ? (
          <div className="tabela-rolante max-h-[28rem] overflow-auto rounded-lg border border-borda">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-superficie-2 rotulo-dado text-texto-suave">
                <tr>
                  <Th col="nome" ordem={ordem} ordenar={ordenarPor}>Auditor</Th>
                  <th scope="col" className="px-4 py-3">
                    Posto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fração
                  </th>
                  <Th col="lanc" num ordem={ordem} ordenar={ordenarPor}>
                    Lanç.
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
                  <th scope="col" className="px-4 py-3">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((r: LinhaAuditor) => (
                  <tr key={r.chave} className="border-t border-borda hover:bg-branco/[0.03]">
                    <td className="px-4 py-2.5 font-semibold text-branco">{r.nome}</td>
                    <td className="px-4 py-2.5 text-texto-suave">{r.posto}</td>
                    <td className="px-4 py-2.5 text-texto-suave">{r.fracao}</td>
                    <td className="dados px-4 py-2.5 text-right">{FMT.format(r.lanc)}</td>
                    <td className="dados px-4 py-2.5 text-right font-bold text-branco">
                      {FMT.format(r.videos)}
                    </td>
                    <td className="dados px-4 py-2.5 text-right text-texto-suave">
                      {PCT.format(r.media)}
                    </td>
                    <td className="dados px-4 py-2.5 text-right text-texto-suave">
                      {FMT.format(r.abaixo + r.naoAuditou)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Selo nivel={r.nivel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <SemDados texto="Nenhum auditor lançou no recorte." />
        )}
      </Cartao>

      {/* ---------------- Lançamentos (planilha bruta) ---------------- */}
      <Cartao
        titulo="Lançamentos"
        nota={`${FMT.format(p.dados.length)} de ${FMT.format(lancamentos.length)} respostas na planilha`}
        className="mt-6"
        ajuda={
          <p>
            A resposta como foi lançada no formulário, sem agregação. É esta a linha que instrui
            parte e vira anexo de processo — por isso o CSV daqui é diferente do da tabela analítica.
          </p>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={baixarLancamentosCsv}
            disabled={!p.dados.length}
            className="nao-imprime inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 text-[13px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho disabled:opacity-40"
          >
            <Download size={14} aria-hidden /> Exportar CSV das respostas
          </button>
        </div>
        {p.dados.length ? (
          <div className="tabela-rolante max-h-[28rem] overflow-auto rounded-lg border border-borda">
            <table className="w-full min-w-[1080px] text-left text-[13px]">
              <thead className="sticky top-0 bg-superficie-2 rotulo-dado text-texto-suave">
                <tr>
                  {[
                    "Data",
                    "Turno",
                    "RE",
                    "Nome de guerra",
                    "Posto",
                    "Função",
                    "Fração",
                    "Auditou",
                    "Evid.",
                    "IDs auditados",
                    "Parte",
                    "Justificativa",
                  ].map((c) => (
                    <th key={c} scope="col" className="whitespace-nowrap px-3 py-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.dados.map((l) => (
                  <tr key={l.id} className="border-t border-borda align-top hover:bg-branco/[0.03]">
                    <td className="dados whitespace-nowrap px-3 py-2">
                      {formatarData(l.data)}
                      {l.hora && <span className="block text-texto-suave">{l.hora}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.turno}</td>
                    <td className="dados whitespace-nowrap px-3 py-2">{l.re}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-branco">
                      {l.nomeGuerra}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.posto}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.funcao}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">
                      {ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade}
                    </td>
                    <td className="px-3 py-2">
                      <Selo
                        nivel={l.auditou ? "conforme" : "critico"}
                        texto={l.auditou ? "Sim" : "Não"}
                      />
                    </td>
                    <td className="dados px-3 py-2 text-right font-bold text-branco">
                      {FMT.format(l.videos)}
                    </td>
                    <td className="dados max-w-[14rem] px-3 py-2 text-[11.5px] text-texto-suave">
                      {l.idsMidia || "—"}
                    </td>
                    <td className="dados whitespace-nowrap px-3 py-2 text-texto-suave">
                      {l.numeroParte || "—"}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2 text-[12px] leading-relaxed text-texto-suave">
                      {l.justificativa || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <SemDados texto="Nenhuma resposta no recorte." />
        )}
      </Cartao>

      {/* ---------------- Galeria Tática & Operacional 16º BPM/M ---------------- */}
      <section className="mt-8 mb-6 nao-imprime" aria-label="Galeria Tática Operacional">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-base font-bold uppercase tracking-wider text-branco">
              Registro Operacional · Fiscalização de COP no 16º BPM/M
            </h2>
            <p className="text-xs text-texto-suave">
              Atuação da tropa no patrulhamento motorizado e auditoria das evidências digitais gravadas
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vermelho/10 border border-vermelho/30 px-3 py-1 text-xs font-bold text-vermelho">
            16º BPM/M em Ação
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-viatura.jpg"
              alt="Viatura em Patrulhamento 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Fiscalização</span>
              <p className="text-xs font-bold text-white leading-snug">Patrulhamento Motorizado</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto_operacao.jpg"
              alt="Operação Policial 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Auditoria</span>
              <p className="text-xs font-bold text-white leading-snug">Abordagem & Gravação</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-rua.jpg"
              alt="Ponto de Estacionamento"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Presença</span>
              <p className="text-xs font-bold text-white leading-snug">Ponto de Estacionamento</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-oficial.jpg"
              alt="Comando e Gestão 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Gestão</span>
              <p className="text-xs font-bold text-white leading-snug">Sala de Operações</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Glossário ---------------- */}
      <details className="mt-6 rounded-xl border border-borda bg-tatico-super p-5 shadow-inst">
        <summary className="cursor-pointer font-serif text-[15px] font-bold uppercase tracking-wide text-branco">
          Glossário do painel
        </summary>
        <dl className="mt-4 grid gap-4 text-[13px] leading-relaxed sm:grid-cols-2">
          {[
            ["Evidência", "Cada mídia de COP auditada e registrada no formulário, com o ID informado."],
            [
              "Meta global do Batalhão (960)",
              "Universo total de 960 evidências distribuído de forma justa e proporcional ao quadro fixo com COP (570 PMs): 1ª Cia (195 / 20,32%), 2ª Cia (180 / 18,74%), 3ª Cia (210 / 21,97%), 4ª Cia (180 / 18,74%), FT (147 / 15,23%) e EM (48 / 5,00%).",
            ],
            [
              "Metas Semanais (240/sem)",
              "Divisão do universo mensal em 4 semanas operacionais (240 evidências/semana para o Batalhão). O rateio semanal proporcional é: 1ª Cia (49/sem), 2ª Cia (45/sem), 3ª Cia (53/sem), 4ª Cia (45/sem), FT (37/sem) e EM (12/sem).",
            ],
            [
              "Matriz de Proporcionalidade",
              "Critério técnico aprovado que pondera o efetivo real de cada subunidade para que a cobrança seja justa com a capacidade operacional de cada fração.",
            ],
            ["Turno 12x36", "Cada escala de 12 horas de serviço. A meta é contada por turno, não por dia corrido."],
            [
              "Conformidade",
              `Percentual de lançamentos que trouxeram ${p.minimo} ou mais evidências — o mínimo determinado pelo Batalhão (a Diretriz PM3-001/02/25 pede 2).`,
            ],
            ["Mediana", "O valor do meio: metade dos lançamentos ficou acima dele, metade abaixo. Não se deixa distorcer por um recorde isolado."],
            ["p90", "O patamar alcançado pelos 10% mais produtivos."],
            ["±3σ (carta de controle)", "A faixa de variação normal do próprio Batalhão. Dia fora dela é atípico e merece verificação — não é, por si só, falta."],
            ["Pareto", "Ordenação do maior para o menor produtor, com o acumulado. Mostra se a auditoria depende de poucos."],
            ["IDs de mídia", "O identificador da imagem ou vídeo auditado. Sem ele a evidência não é rastreável na conferência."],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="font-bold text-branco">{t}</dt>
              <dd className="text-texto-suave">{d}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="mt-6 text-[12px] leading-relaxed text-texto-suave">
        Leitura direta da planilha de respostas do formulário da auditoria, revalidada a cada 60
        segundos. Meta global: 960 evidências rateadas proporcionalmente pelo quadro fixo operacional
        com COP (570 PMs). Diretriz PM3-001/02/25. Uso interno do 16º BPM/M.
      </p>
    </div>
  );
}
