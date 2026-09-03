import {
  FMT_CONTAGEM,
  FMT_RITMO,
  ORDEM_PRIORIDADE,
  ROTULO_DISPERSAO,
  ROTULO_PRIORIDADE,
  ROTULO_REGULARIDADE,
  ROTULO_TRAJETORIA,
  SUBTITULO_TRAJETORIA,
  TURNOS_POR_DIA,
  alertaLote,
  calcularTendencia,
  capacidadeExcedente,
  conferirSomaCotas,
  diasDoMes,
  dispersaoQuinzenal,
  indiceDispersao,
  indiceEquilibrio,
  marcosMetaAcumulada,
  prioridadeAcao,
  progressoDaJanela,
  progressoDoMes,
  quinzenasIniciadas,
  regularidadeProducao,
  semanasIniciadas,
  turnosDoMes,
  type ClasseEquilibrio,
  type Prioridade,
  type SituacaoTrajetoria,
  type Tendencia,
} from "@/lib/cop2026-tendencia";
import { MATRIZ_PROPORCIONAL_2026, META_TOTAL_BATALHAO } from "@/lib/cop2026";
import type { LinhaFracao } from "@/lib/cop2026-metricas";

/**
 * Detalhamento da TENDÊNCIA por fração — o que não cabe no cartão do
 * velocímetro. Reúne os indicadores pedidos pelo Maj PM em 30 e 31/08/2026 e
 * os dois que o Red Team encaminhado por ele apontou:
 *
 * - três ritmos, saldo e aderência à trajetória (pedido direto);
 * - equilíbrio de produção — a FT sozinha sustentando o resultado;
 * - regularidade — quem produz 0+0+0+100 fecha a meta e anula o efeito
 *   preventivo da auditoria contínua;
 * - dispersão (IDA) — cota batida por um punhado de auditores;
 * - pressão de recuperação — quanto o esforço exigido está acima do normal;
 * - calendário até dezembro, que o Comando pediu para já deixar pronto.
 *
 * Unidades: fração por TURNO (2/dia, inclusive o EM, que cobre dia e tarde por
 * DEJEM); Batalhão por DIA — somar turnos de frações distintas num denominador
 * só é o que o Major vetou: 12 turnos-fração por dia no Batalhão, 360 no mês,
 * e 960 ÷ 360 = 2,67 não se compara com a cota de fração nenhuma.
 */

const COR = {
  alvo: "#2563eb",
  real: "#d97706",
  recuperacao: "#ca0202",
  agio: "#2563eb",
  deficit: "#ca0202",
  verde: "#16a34a",
} as const;

/** Régua única de ritmo — ver `cop2026-tendencia.ts`. */
const N2 = FMT_RITMO;
const N0 = FMT_CONTAGEM;
const P1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const MESES_ATE_DEZEMBRO = [
  { mes: 9, rotulo: "SET" },
  { mes: 10, rotulo: "OUT" },
  { mes: 11, rotulo: "NOV" },
  { mes: 12, rotulo: "DEZ" },
] as const;

/** Data civil em São Paulo — o servidor roda em UTC e viraria o dia 3h antes. */
function hojeEmSaoPaulo(): { ano: number; mes: number; referencia: Date } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [ano, mes, dia] = partes.split("-").map(Number);
  return { ano, mes, referencia: new Date(Date.UTC(ano, mes - 1, dia, 12)) };
}

const CLASSE_SITUACAO: Record<SituacaoTrajetoria, string> = {
  ADIANTADA: "bg-[#eef3fe] text-[#2563eb] border-[#2563eb]",
  EM_TRAJETORIA: "bg-[#eff9f2] text-[#16a34a] border-[#16a34a]",
  ATRASADA: "bg-[#fdf5e9] text-[#d97706] border-[#d97706]",
  DEFICIT_SEVERO: "bg-[#ca0202] text-white border-[#ca0202]",
  NAO_AFERIVEL: "bg-slate-100 text-slate-500 border-slate-300",
};

function Selo({ s }: { s: SituacaoTrajetoria }) {
  return (
    <span
      title={SUBTITULO_TRAJETORIA[s]}
      className={`inline-block whitespace-nowrap rounded-sm border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${CLASSE_SITUACAO[s]}`}
    >
      {ROTULO_TRAJETORIA[s]}
    </span>
  );
}

/** Etiqueta neutra usada por regularidade e dispersão. */
function Marca({ texto, cor, titulo }: { texto: string; cor: string; titulo?: string }) {
  return (
    <span
      title={titulo}
      className="inline-block whitespace-nowrap rounded-sm border bg-white px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider"
      style={{ color: cor, borderColor: cor }}
    >
      {texto}
    </span>
  );
}

const sinal = (v: number) => (v > 0 ? `+${N0.format(v)}` : N0.format(v));
const corSaldo = (v: number) => (v >= 0 ? COR.agio : COR.deficit);

const CORES_REGULARIDADE: Record<string, string> = {
  REGULAR: COR.verde,
  IRREGULAR: COR.real,
  CONCENTRADA: COR.recuperacao,
  SEM_BASE: "#64748b",
};
const CORES_DISPERSAO: Record<string, string> = {
  DISTRIBUIDA: COR.verde,
  CONCENTRADA: COR.real,
  POUCOS_AUDITORES: COR.recuperacao,
  SEM_BASE: "#64748b",
};

/**
 * A torre de controle tem dezesseis colunas. Sem agrupamento elas viram uma
 * parede de números: o leitor não sabe onde termina "quanto foi feito" e onde
 * começa "isso está no prazo". Os quatro grupos abaixo respondem, na ordem,
 * quatro perguntas — e a coluna SITUAÇÃO passou a viver dentro de TRAJETÓRIA,
 * ao lado dos números que ela classifica, em vez de ficar no fim da linha.
 *
 * O cabeçalho de grupo é deliberadamente CINZA. Cor no painel é classificação
 * (docs/cop2026-padroes-comando.md §2): pintar um grupo de verde sugeriria
 * conformidade onde há apenas um rótulo de seção.
 */
const GRUPOS = [
  { rotulo: "Produção", pergunta: "quanto foi feito", colunas: 3 },
  { rotulo: "Ritmo por turno", pergunta: "em que passo", colunas: 4 },
  { rotulo: "Trajetória", pergunta: "está no prazo?", colunas: 4 },
  { rotulo: "Governança", pergunta: "quem auditou", colunas: 3 },
] as const;

const COLUNAS: { rotulo: string; inicio?: boolean; ajuda?: string }[] = [
  { rotulo: "Peso", inicio: true, ajuda: "Cota da fração na Matriz Proporcional" },
  { rotulo: "Meta", ajuda: "Evidências do período selecionado" },
  { rotulo: "Realizado", ajuda: "Evidências auditadas até aqui" },
  { rotulo: "Alvo", inicio: true, ajuda: "Passo normal para fechar a meta do período" },
  { rotulo: "Real", ajuda: "Passo efetivamente praticado até aqui" },
  { rotulo: "Recuperação", ajuda: "Passo necessário daqui em diante para zerar o déficit" },
  { rotulo: "Pressão", ajuda: "Quantas vezes a recuperação exige acima do ritmo normal" },
  { rotulo: "Saldo", inicio: true, ajuda: "Evidências acima (+) ou abaixo (−) do previsto até aqui" },
  { rotulo: "Aderência", ajuda: "Realizado sobre o previsto até aqui" },
  { rotulo: "Projeção", ajuda: "Onde a fração fecha o mês mantido o ritmo real" },
  { rotulo: "Situação", ajuda: "Régua de trajetória — ortogonal à régua de cumprimento" },
  { rotulo: "Regularidade", inicio: true, ajuda: "Produção distribuída ou lançada em lote" },
  { rotulo: "Dispersão", ajuda: "Quanto do efetivo de fato auditou" },
  { rotulo: "Quinzena", ajuda: "Participação do efetivo na 1ª e na 2ª quinzena" },
];

/** Fronteira visual entre grupos de coluna. */
const SEP = "border-l-2 border-slate-300";

/** A classe vinha para a tela por `classe.replace(/_/g, " ").toLowerCase()`, que
 *  devolvia "assimetria critica" — sem acento, numa frase que o Comando lê. */
const ROTULO_EQUILIBRIO: Record<ClasseEquilibrio, string> = {
  EQUILIBRADO: "produção equilibrada",
  ASSIMETRIA_MODERADA: "assimetria moderada",
  ASSIMETRIA_ELEVADA: "assimetria elevada",
  ASSIMETRIA_CRITICA: "assimetria crítica",
};

const CORES_PRIORIDADE: Record<Prioridade, string> = {
  MAXIMA: "#ca0202",
  MUITO_ALTA: "#dc2626",
  ALTA: "#d97706",
  NORMAL: "#16a34a",
  REDISTRIBUICAO: "#2563eb",
};

export function CaixaTendencia({
  fracoes,
  auditoresPorQuinzena,
  referencia,
  semFracao,
  janela,
  rotuloPeriodo = "mês",
  diaDoMes,
}: {
  fracoes: LinhaFracao[];
  /** Auditores distintos na 1a e na 2a quinzena, por fracao. */
  auditoresPorQuinzena?: Record<string, [number, number]>;
  referencia?: Date;
  /** Evidências de lançamentos sem fração declarada — não têm cota e por isso
   *  não aparecem em linha nenhuma da tabela. Ver abaixo. */
  semFracao?: { lancamentos: number; videos: number; auditores: number };
  /** Janela do recorte. Com uma semana selecionada as metas das frações já são
   *  as da semana, e medir o passo contra os 60 turnos do mês punha "ALVO
   *  0,18/turno · ADERÊNCIA 1.000%" na linha do Estado-Maior. */
  janela?: { dias: number; decorridos: number; encerrado: boolean };
  /** Como o período se chama no cabeçalho: "mês" ou "semana". */
  rotuloPeriodo?: string;
  /** Dia corrido DO MÊS. Semana e quinzena iniciadas são posições no calendário
   *  mensal: medi-las pelo dia dentro da semana diria "1 semana iniciada" no
   *  dia 24. Sem a prop, cai no dia da própria janela. */
  diaDoMes?: number;
}) {
  const { ano, mes, referencia: agora } = hojeEmSaoPaulo();
  const p = janela ? progressoDaJanela(janela) : progressoDoMes(referencia ?? agora, ano, mes);

  const diaNoMes = diaDoMes ?? p.diasDecorridos;
  /* "no mês" / "na semana" — a preposição vem pronta para o texto não sair
     como "14 no semana". */
  const noPeriodo = rotuloPeriodo === "semana" ? "na semana" : `no ${rotuloPeriodo}`;

  const metaGlobal = fracoes.reduce((s, f) => s + f.meta, 0);
  /* A meta do MÊS, para o que é mensal por natureza: a conferência da Matriz
     Proporcional e o calendário até dezembro. Com uma semana selecionada,
     `f.meta` é a cota da semana — a conferência acusava "as cotas somam 288 e
     não 960" e o calendário projetava dezembro com a cota de nove dias. */
  const metaMensalGlobal = fracoes.reduce((s, f) => s + (f.metaMes ?? f.meta), 0);
  /* O total do Batalhão soma TODAS as evidências do recorte, inclusive as de
     quem não declarou a fração. Somando só as linhas da tabela, esta caixa
     anunciava "Realizado 65" ao lado do KPI "EVIDÊNCIAS AUDITADAS 87" no topo
     da mesma tela — 22 evidências de quatro auditores sem fração no meio, e
     duas verdades no mesmo painel. */
  const orfas = semFracao?.videos ?? 0;
  const feitoGlobal = fracoes.reduce((s, f) => s + f.feito, 0) + orfas;

  const btl = calcularTendencia({
    meta: metaGlobal,
    realizado: feitoGlobal,
    turnosMes: p.diasMes,
    turnosDecorridos: p.diasDecorridos,
    encerrado: p.encerrado,
  });

  const linhas = fracoes.map((f) => {
    const t: Tendencia = calcularTendencia({
      meta: f.meta,
      realizado: f.feito,
      turnosMes: p.turnosMes,
      turnosDecorridos: p.turnosDecorridos,
      encerrado: p.encerrado,
    });
    const semanas = f.semanas ?? [];
    return {
      f,
      t,
      peso: MATRIZ_PROPORCIONAL_2026[f.chave]?.pctMeta,
      regularidade: regularidadeProducao(
        semanas.map((s) => s.feito),
        semanasIniciadas(diaNoMes)
      ),
      dispersao: indiceDispersao(f.lancaram, f.efetivo),
      quinzenal: dispersaoQuinzenal(
        auditoresPorQuinzena?.[f.chave] ?? [0, 0],
        f.efetivo,
        quinzenasIniciadas(diaNoMes)
      ),
      lote: alertaLote(semanas.map((s) => ({ semana: s.semana, meta: s.meta, feito: s.feito }))),
      prioridade: prioridadeAcao(t),
      excedente: capacidadeExcedente(t),
      marcos: marcosMetaAcumulada(f.meta, p.turnosMes),
    };
  });

  /* Modelo de turnos confirmado pelo Maj PM em 02/09/2026: cada fração roda 2
     turnos por dia — o Batalhão, portanto, roda 2 × o número de frações. Conta a
     MATRIZ, não a lista da tela: com um filtro de fração ligado, `fracoes` tem
     uma linha só e a frase viraria "o Batalhão roda 2 turnos-fração por dia". */
  const turnosDiaBatalhao = Object.keys(MATRIZ_PROPORCIONAL_2026).length * TURNOS_POR_DIA;
  const turnosMesBatalhao = turnosDiaBatalhao * p.diasMes;

  const equilibrio = indiceEquilibrio(linhas.map((l) => l.t.aderencia));
  /* A conferência é da MATRIZ, não da tela. Lendo `fracoes` — que é a lista
     filtrada — um simples `?fracao=1cia` fazia a soma dar 195 e o painel
     imprimia a tarja vermelha "as cotas somam 195, e não 960: falta de 765".
     Alarme puramente artificial, criado pelo próprio filtro. Mesma lição da
     linha logo acima (`turnosDiaBatalhao`) e do §4 dos padrões do Comando:
     ler a fonte, nunca a tela. */
  const soma = conferirSomaCotas(
    Object.values(MATRIZ_PROPORCIONAL_2026).map((m) => m.meta),
    META_TOTAL_BATALHAO
  );
  const filaDeAcao = [...linhas]
    .filter((l) => l.prioridade !== "NORMAL" && l.prioridade !== "REDISTRIBUICAO")
    .sort(
      (a, b) =>
        ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] ||
        a.t.saldoTrajetoria - b.t.saldoTrajetoria
    );
  const sustentam = linhas
    .filter((l) => l.excedente > 0)
    .sort((a, b) => b.excedente - a.excedente);
  const semBase = p.diasDecorridos === 0;
  const emLote = linhas.filter((l) => l.lote.emLote);
  const poucosAuditores = linhas.filter((l) => l.dispersao.classe === "POUCOS_AUDITORES");

  const celula = "px-2.5 py-2.5 text-right text-[13px] tabular-nums";

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <span className="font-cinzel text-[15px] font-black uppercase tracking-[0.14em] text-slate-900">
            Tendência por Fração
          </span>
          <span className="dados text-[11.5px] tracking-wide text-slate-500">
            Meta {N0.format(metaGlobal)} · Realizado {N0.format(feitoGlobal)} ·{" "}
            {N0.format(p.diasDecorridos)} de {N0.format(p.diasMes)} dias ·{" "}
            {N0.format(p.turnosMes)} turnos por fração
            {orfas > 0 && (
              <>
                {" · "}
                <strong
                  className="font-black text-[#ca0202]"
                  title="Evidências de lançamentos sem fração declarada. Somam para o Batalhão e não têm cota — o conserto é o auditor informar a fração na planilha."
                >
                  {N0.format(orfas)} sem fração
                </strong>
              </>
            )}
          </span>
        </header>

        {/* ---------- torre de controle ---------- */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th
                  rowSpan={2}
                  className="dados border-y-2 border-slate-300 px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-600"
                >
                  Fração
                </th>
                {GRUPOS.map((g) => (
                  <th
                    key={g.rotulo}
                    colSpan={g.colunas}
                    className={`dados border-y-2 border-slate-300 px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 ${SEP}`}
                  >
                    {g.rotulo}
                    <span className="ml-1.5 font-bold normal-case tracking-normal text-slate-400">
                      {g.pergunta}
                    </span>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className={`dados border-y-2 border-slate-300 px-2.5 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-600 ${SEP}`}
                >
                  Ação
                </th>
              </tr>
              <tr className="bg-slate-50">
                {COLUNAS.map((c) => (
                  <th
                    key={c.rotulo}
                    title={c.ajuda}
                    className={`dados border-b-2 border-slate-200 px-2.5 py-2 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 ${
                      c.inicio ? SEP : ""
                    }`}
                  >
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ f, t, peso, regularidade, dispersao, lote, quinzenal, prioridade, excedente }) => (
                <tr key={f.chave} className="border-b border-slate-200 last:border-b-0">
                  <td className="px-2.5 py-2.5 text-left text-[14px] font-black text-slate-900">
                    {f.rotulo}
                    {lote.emLote && (
                      <span
                        title={`Semana ${lote.semanas.join(", ")} com ${P1.format(lote.maiorPct)}% da cota — lançamento concentrado`}
                        className="ml-1.5 align-middle text-[11px] font-black text-[#ca0202]"
                      >
                        ⚠
                      </span>
                    )}
                  </td>

                  {/* produção */}
                  <td className={`${celula} ${SEP} dados text-slate-600`}>
                    {peso === undefined ? "—" : `${P1.format(peso)}%`}
                  </td>
                  <td className={`${celula} dados text-slate-700`}>{N0.format(f.meta)}</td>
                  <td className={`${celula} dados text-slate-700`}>{N0.format(f.feito)}</td>

                  {/* ritmo por turno */}
                  <td className={`${celula} ${SEP} dados font-bold`} style={{ color: COR.alvo }}>
                    {N2.format(t.ritmoAlvo)}
                  </td>
                  <td className={`${celula} dados font-bold`} style={{ color: COR.real }}>
                    {t.ritmoReal === null ? "—" : N2.format(t.ritmoReal)}
                  </td>
                  <td className={`${celula} dados font-bold`} style={{ color: COR.recuperacao }}>
                    {t.deficit === 0 || t.irrecuperavel ? "—" : N2.format(t.ritmoRecuperacao)}
                  </td>
                  <td
                    className={`${celula} dados font-bold`}
                    title="Quanto a recuperação exige acima do ritmo normal"
                    style={{
                      color:
                        t.pressaoRecuperacao === null || t.pressaoRecuperacao <= 1
                          ? "#16a34a"
                          : t.pressaoRecuperacao <= 2
                            ? COR.real
                            : COR.recuperacao,
                    }}
                  >
                    {t.pressaoRecuperacao === null || t.deficit === 0
                      ? "—"
                      : `${N2.format(t.pressaoRecuperacao)}×`}
                  </td>

                  {/* trajetória */}
                  <td
                    className={`${celula} ${SEP} dados font-black`}
                    style={{ color: semBase ? "#64748b" : corSaldo(t.saldoTrajetoria) }}
                  >
                    {semBase ? "—" : sinal(t.saldoTrajetoria)}
                  </td>
                  <td className={`${celula} dados font-bold text-slate-900`}>
                    {t.aderencia === null ? "—" : `${P1.format(t.aderencia)}%`}
                  </td>
                  <td
                    className={`${celula} dados text-slate-600`}
                    title={
                      t.projecaoPct === null
                        ? undefined
                        : `${P1.format(t.projecaoPct)}% da meta, mantido o ritmo real`
                    }
                  >
                    {t.projecaoFechamento === null ? "—" : N0.format(t.projecaoFechamento)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <Selo s={t.situacao} />
                  </td>

                  {/* governança */}
                  <td className={`px-2.5 py-2.5 text-right ${SEP}`}>
                    <Marca
                      texto={ROTULO_REGULARIDADE[regularidade.classe]}
                      cor={CORES_REGULARIDADE[regularidade.classe]}
                      titulo={
                        regularidade.gini === null
                          ? "Sem produção no período"
                          : `Concentração ${P1.format(regularidade.gini * 100)}% — 0 é produção uniforme, 100 é tudo num período só`
                      }
                    />
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <Marca
                      texto={
                        dispersao.pct === null
                          ? ROTULO_DISPERSAO.SEM_BASE
                          : `${N0.format(dispersao.pct)}%`
                      }
                      cor={CORES_DISPERSAO[dispersao.classe]}
                      titulo={`${ROTULO_DISPERSAO[dispersao.classe]} — ${N0.format(f.lancaram)} de ${N0.format(f.efetivo)} do efetivo lançaram`}
                    />
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <Marca
                      texto={
                        quinzenal.quinzenas
                          .map((q) => (q.pct === null ? "—" : `${N0.format(q.pct)}%`))
                          .join(" · ") || "—"
                      }
                      cor={CORES_DISPERSAO[quinzenal.pior]}
                      titulo="Participação do efetivo na 1ª e na 2ª quinzena"
                    />
                  </td>

                  {/* ação */}
                  <td className={`px-2.5 py-2.5 text-right ${SEP}`}>
                    <Marca
                      texto={ROTULO_PRIORIDADE[prioridade]}
                      cor={CORES_PRIORIDADE[prioridade]}
                      titulo={
                        prioridade === "REDISTRIBUICAO"
                          ? `Capacidade excedente de ${N0.format(excedente)} evidências`
                          : "Ordem de intervenção pela aderência à trajetória"
                      }
                    />
                  </td>
                </tr>
              ))}

              <tr className="border-t-2 border-slate-400 bg-slate-50">
                <td className="px-2.5 py-3 text-left text-[14px] font-black text-slate-900">
                  Batalhão
                  <span className="ml-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
                    /dia
                  </span>
                </td>

                <td className={`${celula} ${SEP} dados font-black text-slate-700`}>100%</td>
                <td className={`${celula} dados font-black text-slate-900`}>
                  {N0.format(metaGlobal)}
                </td>
                <td className={`${celula} dados font-black text-slate-900`}>
                  {N0.format(feitoGlobal)}
                </td>

                <td className={`${celula} ${SEP} dados font-black`} style={{ color: COR.alvo }}>
                  {N2.format(btl.ritmoAlvo)}
                </td>
                <td className={`${celula} dados font-black`} style={{ color: COR.real }}>
                  {btl.ritmoReal === null ? "—" : N2.format(btl.ritmoReal)}
                </td>
                <td className={`${celula} dados font-black`} style={{ color: COR.recuperacao }}>
                  {btl.irrecuperavel ? "—" : N2.format(btl.ritmoRecuperacao)}
                </td>
                <td className={`${celula} dados font-black text-slate-700`}>
                  {btl.pressaoRecuperacao === null || btl.deficit === 0
                    ? "—"
                    : `${N2.format(btl.pressaoRecuperacao)}×`}
                </td>

                <td
                  className={`${celula} ${SEP} dados font-black`}
                  style={{ color: semBase ? "#64748b" : corSaldo(btl.saldoTrajetoria) }}
                >
                  {semBase ? "—" : sinal(btl.saldoTrajetoria)}
                </td>
                <td className={`${celula} dados font-black text-slate-900`}>
                  {btl.aderencia === null ? "—" : `${P1.format(btl.aderencia)}%`}
                </td>
                <td className={`${celula} dados font-black text-slate-700`}>
                  {btl.projecaoFechamento === null ? "—" : N0.format(btl.projecaoFechamento)}
                </td>
                <td className="px-2.5 py-3 text-right">
                  <Selo s={btl.situacao} />
                </td>

                <td colSpan={3} className={`px-2.5 py-3 text-right ${SEP}`}>
                  {equilibrio.cv !== null && (
                    <Marca
                      texto={`Equilíbrio ${P1.format(equilibrio.cv * 100)}%`}
                      cor={
                        equilibrio.classe === "EQUILIBRADO"
                          ? COR.verde
                          : equilibrio.classe === "ASSIMETRIA_MODERADA"
                            ? COR.real
                            : COR.recuperacao
                      }
                      titulo="Dispersão da aderência à trajetória entre as frações"
                    />
                  )}
                </td>

                <td className={`px-2.5 py-3 text-right ${SEP}`}>
                  <Marca
                    texto={ROTULO_PRIORIDADE[prioridadeAcao(btl)]}
                    cor={CORES_PRIORIDADE[prioridadeAcao(btl)]}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ---------- leituras de governança ---------- */}
        <div className="grid grid-cols-1 gap-px border-t-2 border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div className="flex flex-col gap-1 bg-white p-4 sm:px-5">
            <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Equilíbrio de produção
            </span>
            <span className="text-[13px] leading-snug text-slate-700">
              {equilibrio.cv === null ? (
                "Sem base para comparar as frações."
              ) : (
                <>
                  Dispersão de{" "}
                  <strong className="dados font-black text-slate-900">
                    {P1.format(equilibrio.cv * 100)}%
                  </strong>{" "}
                  entre as frações —{" "}
                  {ROTULO_EQUILIBRIO[equilibrio.classe]}. Uma fração muito acima e
                  outras abaixo se anulam na média e somem do total do Batalhão.
                </>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1 bg-white p-4 sm:px-5">
            <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Regularidade da produção
            </span>
            <span className="text-[13px] leading-snug text-slate-700">
              {emLote.length === 0 ? (
                "Nenhuma fração concentrou produção acima de 300% da cota semanal."
              ) : (
                <>
                  <strong className="font-black text-[#ca0202]">
                    {emLote.map((l) => l.f.rotulo).join(", ")}
                  </strong>{" "}
                  lançaram em lote. Auditoria feita de uma vez no fim do mês perde o efeito
                  preventivo que a Diretriz pede.
                </>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1 bg-white p-4 sm:px-5">
            <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Dispersão de auditoria (IDA)
            </span>
            <span className="text-[13px] leading-snug text-slate-700">
              {poucosAuditores.length === 0 ? (
                "Participação do efetivo dentro do esperado em todas as frações."
              ) : (
                <>
                  <strong className="font-black text-[#ca0202]">
                    {poucosAuditores.map((l) => l.f.rotulo).join(", ")}
                  </strong>{" "}
                  com menos de 30% do efetivo lançando. A cota fecha, mas o controle continua nas
                  mãos de poucos.
                </>
              )}
            </span>
          </div>
        </div>

        {/* ---------- onde agir e quem sustenta ---------- */}
        <div className="grid grid-cols-1 gap-px border-t-2 border-slate-200 bg-slate-200 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 bg-white p-4 sm:px-5">
            <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Onde agir — por ordem
            </span>
            {filaDeAcao.length === 0 ? (
              <span className="text-[13px] text-slate-700">
                Nenhuma fração abaixo da trajetória prevista.
              </span>
            ) : (
              <ol className="flex flex-col gap-1">
                {filaDeAcao.map((l, i) => (
                  <li key={l.f.chave} className="flex items-center gap-2 text-[13px] text-slate-700">
                    <span className="dados w-4 shrink-0 text-right font-black text-slate-400">
                      {i + 1}
                    </span>
                    <strong className="font-black text-slate-900">{l.f.rotulo}</strong>
                    <Marca
                      texto={ROTULO_PRIORIDADE[l.prioridade]}
                      cor={CORES_PRIORIDADE[l.prioridade]}
                    />
                    <span className="dados text-[12px] text-[#ca0202]">
                      {N0.format(l.t.saldoTrajetoria)}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      · recuperar a {N2.format(l.t.ritmoRecuperacao)}/turno
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex flex-col gap-1.5 bg-white p-4 sm:px-5">
            <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Quem sustenta o resultado
            </span>
            {sustentam.length === 0 ? (
              <span className="text-[13px] text-slate-700">
                Nenhuma fração acima da própria trajetória — não há folga para redistribuir.
              </span>
            ) : (
              <>
                <ol className="flex flex-col gap-1">
                  {sustentam.map((l) => (
                    <li
                      key={l.f.chave}
                      className="flex items-center gap-2 text-[13px] text-slate-700"
                    >
                      <strong className="font-black text-slate-900">{l.f.rotulo}</strong>
                      <span className="dados font-black text-[#2563eb]">
                        +{N0.format(l.excedente)}
                      </span>
                      <span className="text-[12px] text-slate-500">
                        evidências além da própria trajetória
                      </span>
                    </li>
                  ))}
                </ol>
                <span className="text-[12px] leading-snug text-slate-500">
                  Capacidade institucional excedente: é daqui que sai esforço para as frações em
                  déficit, e não um simples “acima da meta”.
                </span>
              </>
            )}
          </div>
        </div>

        {/* ---------- conferência da soma das cotas ---------- */}
        {!soma.fecha && (
          <div className="border-t-2 border-[#ca0202] bg-[#fdf0f0] px-5 py-3 text-[13px] font-bold text-[#ca0202] sm:px-6">
            ⚠ As cotas das frações somam {N0.format(soma.soma)}, e não{" "}
            {N0.format(META_TOTAL_BATALHAO)} —{" "}
            {soma.diferenca > 0 ? "excesso" : "falta"} de {N0.format(Math.abs(soma.diferenca))}{" "}
            evidências na Matriz Proporcional. Corrigir antes de levar o número adiante.
          </div>
        )}

        {/* ---------- calendário até dezembro ---------- */}
        <div className="border-t-2 border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Calendário operacional até 31 de dezembro · ritmo-alvo por turno
          </span>
          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="dados px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Fração
                  </th>
                  {MESES_ATE_DEZEMBRO.map((m) => (
                    <th
                      key={m.mes}
                      className="dados px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-500"
                    >
                      {m.rotulo}
                      <span className="ml-1 font-bold text-slate-400">
                        {diasDoMes(ano, m.mes)}d · {turnosDoMes(ano, m.mes)}t
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fracoes.map((f) => (
                  <tr key={f.chave} className="border-t border-slate-200">
                    <td className="px-2 py-1.5 text-left text-[12.5px] font-bold text-slate-800">
                      {f.rotulo}
                    </td>
                    {MESES_ATE_DEZEMBRO.map((m) => (
                      <td
                        key={m.mes}
                        className={`dados px-2 py-1.5 text-right text-[12.5px] tabular-nums ${
                          m.mes === mes ? "font-black text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {N2.format((f.metaMes ?? f.meta) / turnosDoMes(ano, m.mes))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td className="px-2 py-1.5 text-left text-[12.5px] font-black text-slate-900">
                    Batalhão <span className="text-[10px] font-bold text-slate-500">/dia</span>
                  </td>
                  {MESES_ATE_DEZEMBRO.map((m) => (
                    <td
                      key={m.mes}
                      className={`dados px-2 py-1.5 text-right text-[12.5px] font-black tabular-nums ${
                        m.mes === mes ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {N2.format(metaMensalGlobal / diasDoMes(ano, m.mes))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- meta acumulada por turno ---------- */}
        <div className="border-t-2 border-slate-200 px-5 py-4 sm:px-6">
          <span className="dados text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Meta acumulada por turno · {N0.format(p.turnosMes)} turnos {noPeriodo}
          </span>
          <p className="mt-1 text-[12px] leading-snug text-slate-500">
            O ritmo-alvo é fracionário e se acumula turno a turno. A produção real é sempre
            inteira, e a diferença entre as duas é o saldo de trajetória — por isso a meta não
            vira “3 por turno”, que distorceria a cota.
          </p>
          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className="dados px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Fração
                  </th>
                  {(linhas[0]?.marcos ?? []).map((m) => (
                    <th
                      key={m.turno}
                      className="dados px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-500"
                    >
                      Turno {m.turno}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.f.chave} className="border-t border-slate-200">
                    <td className="px-2 py-1.5 text-left text-[12.5px] font-bold text-slate-800">
                      {l.f.rotulo}
                    </td>
                    {l.marcos.map((m) => (
                      <td
                        key={m.turno}
                        className={`dados px-2 py-1.5 text-right text-[12.5px] tabular-nums ${
                          m.turno <= p.turnosDecorridos
                            ? "font-black text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {N2.format(m.acumulada)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-7 gap-y-2 border-t border-slate-200 px-5 py-3.5 text-[12px] leading-snug text-slate-500 sm:grid-cols-2 sm:px-6">
          <p>
            <strong className="font-black uppercase tracking-wide text-slate-700">Produção</strong>{" "}
            — cota da fração na Matriz Proporcional, meta do período e o que já foi auditado.
          </p>
          <p>
            <strong className="font-black uppercase tracking-wide text-slate-700">
              Ritmo por turno
            </strong>{" "}
            — <span style={{ color: COR.alvo }}>alvo</span> é o passo normal;{" "}
            <span style={{ color: COR.real }}>real</span> é o praticado;{" "}
            <span style={{ color: COR.recuperacao }}>recuperação</span> é o que resta fazer no tempo
            que sobra, e <strong>pressão</strong> mostra quantas vezes isso está acima do normal. A
            fração mede por turno de serviço — 2 por dia, {N0.format(p.turnosMes)} {noPeriodo}, inclusive
            o Estado-Maior, que cobre dia e tarde por DEJEM. O Batalhão roda{" "}
            {N0.format(turnosDiaBatalhao)} turnos-fração por dia ({N0.format(turnosMesBatalhao)}{" "}
            {noPeriodo}) e por isso se mede por DIA: dividir a meta global pelo total de turnos misturaria
            turnos de frações distintas num denominador só, e o resultado não se compara com a cota
            de fração nenhuma.
          </p>
          <p>
            <strong className="font-black uppercase tracking-wide text-slate-700">Trajetória</strong>{" "}
            — responde se, a esta altura do período, o resultado está no prazo. Régua própria
            (ADIANTADA → EM TRAJETÓRIA → ATRASADA → DÉFICIT SEVERO), que não se confunde com a de
            cumprimento da meta.
          </p>
          <p>
            <strong className="font-black uppercase tracking-wide text-slate-700">Governança</strong>{" "}
            — regularidade distingue produção distribuída de lançamento em lote; dispersão e
            quinzena medem quanto do efetivo de fato auditou.
          </p>
          <p className="sm:col-span-2">
            Todos os valores são calculados a cada leitura — nenhum é fixo no código.
          </p>
        </div>
      </div>
    </section>
  );
}
