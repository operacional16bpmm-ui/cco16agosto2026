"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileWarning,
  Filter,
  Printer,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { ROTULO_SUBUNIDADE, type LancamentoCop, type MetaSubunidade } from "@/lib/cop2026";
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
import { Cartao, Selo, SemDados } from "./primitivos";
import {
  BarrasSimples,
  Boxplot,
  Funil,
  Heatmap,
  Histograma,
  Pareto,
  ProducaoDiaria,
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
  const primeiroRender = useRef(true);

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

  const definir = (patch: Partial<Filtros>) => setF((a) => ({ ...a, ...patch }));

  const chips = [
    f.fracao !== "todas" && {
      k: "fracao",
      t: ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao,
      limpar: () => definir({ fracao: "todas" }),
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
      nota: `${FMT.format(p.falta)} evidências a realizar`,
      icone: <TrendingUp size={17} aria-hidden />,
    },
    {
      rotulo: "Evidências auditadas",
      valor: FMT.format(p.total),
      nota: `meta do período: ${FMT.format(p.meta)}`,
      icone: <Target size={17} aria-hidden />,
    },
    {
      rotulo: "Auditores ativos",
      valor: `${FMT.format(p.ativos)}/${FMT.format(p.auditores)}`,
      nota: `${PCT.format(p.auditores ? (p.ativos / p.auditores) * 100 : 0)}% do efetivo designado`,
      icone: <Users size={17} aria-hidden />,
    },
    {
      rotulo: `Conformidade (≥${p.minimo})`,
      valor: `${PCT.format(p.taxaConf)}%`,
      nota: `${FMT.format(p.conformes)} de ${FMT.format(p.dados.length)} lançamentos`,
      icone: <CheckCircle2 size={17} aria-hidden />,
    },
  ];

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
    const blob = new Blob([auditoresParaCsv(tabela)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-cop-2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baixarLancamentosCsv = () => {
    const blob = new Blob([lancamentosParaCsv(p.dados)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-cop-2026-respostas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ordenarPor = (col: Coluna) =>
    setOrdem((o) => ({ col, desc: o.col === col ? !o.desc : true }));

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-12">
      {/* ---------------- Filtros ---------------- */}
      <div className="nao-imprime sticky top-0 z-20 -mx-5 mb-6 border-b border-borda bg-tatico-fundo/95 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-texto-suave">
            <Filter size={15} aria-hidden /> Recorte
          </span>
          <select
            value={f.fracao}
            onChange={(e) => definir({ fracao: e.target.value })}
            aria-label="Filtrar por fração"
            className="rounded-md border border-borda bg-tatico-super px-3 py-2 font-semibold text-branco"
          >
            <option value="todas">Todas as frações</option>
            {metas.map((m) => (
              <option key={m.subunidade} value={m.subunidade}>
                {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
              </option>
            ))}
          </select>
          <select
            value={f.turno}
            onChange={(e) => definir({ turno: e.target.value })}
            aria-label="Filtrar por turno"
            className="rounded-md border border-borda bg-tatico-super px-3 py-2 font-semibold text-branco"
          >
            <option value="todos">Todos os turnos</option>
            <option value="diurno">Diurno</option>
            <option value="noturno">Noturno</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-texto-suave">
            de
            <input
              type="date"
              value={f.de}
              onChange={(e) => definir({ de: e.target.value })}
              className="dados rounded-md border border-borda bg-tatico-super px-2 py-1.5 text-branco"
            />
          </label>
          <label className="inline-flex items-center gap-1.5 text-texto-suave">
            até
            <input
              type="date"
              value={f.ate}
              onChange={(e) => definir({ ate: e.target.value })}
              className="dados rounded-md border border-borda bg-tatico-super px-2 py-1.5 text-branco"
            />
          </label>
          <button
            type="button"
            onClick={() => setF(FILTROS_VAZIOS)}
            className="rounded-md border border-borda px-3 py-2 font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
          >
            Limpar
          </button>

          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={atualizar}
              className="inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
            >
              <RefreshCw size={14} className={cn(atualizando && "animate-spin")} aria-hidden />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
            >
              <Printer size={14} aria-hidden /> Imprimir
            </button>
          </span>
        </div>

        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.k}
                type="button"
                onClick={c.limpar}
                className="inline-flex items-center gap-1.5 rounded-full border border-vermelho/30 bg-vermelho/5 px-2.5 py-1 text-[11.5px] font-semibold text-vermelho"
              >
                {c.t}
                <X size={12} aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

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

      {/* ---------------- Camada 1: Situação ---------------- */}
      <section aria-label="Situação" className="mb-6">
        <div
          className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border-l-4 bg-tatico-super p-5 shadow-inst"
          style={{ borderLeftColor: `var(--sinal-${v.nivel})` }}
        >
          <Selo nivel={v.nivel} />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-bold leading-snug text-branco">{v.titulo}</p>
            <p className="mt-1 text-[13.5px] text-texto-suave">{v.detalhe}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.rotulo} className="cartao-painel rounded-xl border border-borda bg-tatico-super p-4 shadow-inst">
              <div className="flex items-center justify-between text-texto-suave">
                <span className="rotulo-dado">{k.rotulo}</span>
                {k.icone}
              </div>
              <p className="dados-destaque mt-2 text-3xl leading-none text-branco">{k.valor}</p>
              <p className="mt-1.5 text-[12px] text-texto-suave">{k.nota}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-borda bg-tatico-super px-4 py-3 text-[12.5px] text-texto-suave">
          <span>
            Mediana por lançamento <strong className="dados text-branco">{FMT.format(p.mediana)}</strong> · p90{" "}
            <strong className="dados text-branco">{FMT.format(p.p90)}</strong>
          </span>
          <span>
            Turnos cumpridos <strong className="dados text-branco">{FMT.format(p.turnosCumpridos)}</strong> de{" "}
            {FMT.format(p.turnosPrevistos)}
          </span>
          <span>
            Partes confeccionadas <strong className="dados text-branco">{FMT.format(p.partes)}</strong>
          </span>
        </div>
      </section>

      {/* ---------------- Camada 2: Onde agir ---------------- */}
      <section aria-label="Onde agir" className="mb-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Cartao
          titulo="Onde agir · frações"
          nota="ordenado da mais distante da meta para a mais próxima — clique para filtrar o painel"
          ajuda={
            <p>
              A barra mostra quanto da meta a fração já cumpriu. O texto abaixo diz quantas evidências
              faltam e o ritmo por turno necessário para fechar no prazo.
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

        <Cartao
          titulo="Exceções"
          nota="clique para ver os nomes na tabela analítica"
          ajuda={
            <p>
              Exceção não é punição: é a lista do que precisa de justificativa ou de correção antes do
              fechamento do período.
            </p>
          }
        >
          <ul className="space-y-2.5">
            {excecoes.map((e) => {
              const ativo = f.excecao === e.chave;
              return (
                <li key={e.chave}>
                  <button
                    type="button"
                    onClick={() => definir({ excecao: ativo ? "" : e.chave })}
                    aria-pressed={ativo}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                      ativo
                        ? "border-vermelho/50 bg-vermelho/5"
                        : "border-borda hover:border-vermelho/30 hover:bg-branco/[0.03]"
                    )}
                  >
                    <span className={cn(e.v ? "text-sinal-critico" : "text-sinal-conforme")}>{e.icone}</span>
                    <span className="min-w-0 flex-1 text-[13px] text-branco/85">{e.rotulo}</span>
                    <span
                      className={cn(
                        "dados-destaque text-xl",
                        e.v ? "text-sinal-critico" : "text-sinal-conforme"
                      )}
                    >
                      {FMT.format(e.v)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-l-2 border-vermelho/50 pl-3 text-[12.5px] leading-relaxed text-texto-suave">
            {conclusaoFunil(p)}
          </p>
        </Cartao>
      </section>

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

      {/* ---------------- Glossário ---------------- */}
      <details className="mt-6 rounded-xl border border-borda bg-tatico-super p-5 shadow-inst">
        <summary className="cursor-pointer font-serif text-[15px] font-bold uppercase tracking-wide text-branco">
          Glossário do painel
        </summary>
        <dl className="mt-4 grid gap-4 text-[13px] leading-relaxed sm:grid-cols-2">
          {[
            ["Evidência", "Cada mídia de COP auditada e registrada no formulário, com o ID informado."],
            [
              "Meta do período",
              `Auditores designados × ${p.minimo} evidências mínimas por turno × ${FMT.format(p.turnosPrevistos)} turnos.`,
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
        segundos. Meta do período = auditores designados × {p.minimo} evidências mínimas por turno ×{" "}
        {FMT.format(p.turnosPrevistos)} turnos. Uso interno do 16º BPM/M.
      </p>
    </div>
  );
}
