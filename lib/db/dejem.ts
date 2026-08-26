import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import {
  type CiaDejem,
  type Faixa,
  DIAS_SEMANA,
  FAIXAS_ORDEM,
  faixaDeHora,
  pct,
  pearson,
  razao,
  regressao,
  ROTULO_CIA,
} from "@/lib/dejem-calculo";

/**
 * Camada de leitura do DEJEM (migration 022).
 *
 * Estratégia: um fetcher-raiz traz o dataset já RECORTADO no servidor, e os
 * quadros da página saem de helpers puros sobre ele. É o mesmo desenho de
 * lib/db/secao.ts, ajustado ao volume: as tabelas somam ~37 mil linhas, mas o
 * recorte que a página usa cabe em ~9 mil objetos.
 *
 * O único recorte que estoura o teto de 1000 linhas do PostgREST é o das
 * escalas do CPA/M-5 inteiro (4.712, para o benchmark entre unidades) — por
 * isso `buscarTudo()` pagina.
 */

const AISP_BATALHAO = "16bpmm";

/** Efetivo aproximado do batalhão, usado só como denominador da penetração.
 *  Vem de lib/dados-16bpmm.ts (NUMEROS: "550+" policiais), que é o número
 *  institucional publicado na vitrine. É BRUTO: inclui férias, LTS, restrição
 *  e agregados. O efetivo elegível ao DEJEM é menor e não é conhecido aqui. */
export const EFETIVO_ESTIMADO = 550;

export type Jornada = {
  re: string; nome: string; posto: string | null; postoNorm: string | null;
  cia: CiaDejem; dataJornada: string; horaInicio: string; horas: number;
  tipoCod: number; tipoRotulo: string; mes: number; dow: number;
};

export type Escala = {
  aisp: string; aispNorm: string; data: string; periodo: string;
  mes: number; dow: number;
  vagas: number; inscritos: number; escalados: number; presentes: number;
};

export type LogPresenca = {
  escala: string; re: string; nome: string; posto: string | null;
  dataInicio: string; convenio: string | null; atualizadoEm: string;
  horasDe: number | null; horasPara: number | null; zerouPresenca: boolean;
  alteradoPorRe: string | null; alteradoPorNome: string | null; mes: number;
};

export type EscaladoOpm = { mes: number; opmCod: string; opmNome: string; qtde: number; cia: CiaDejem };
export type BenchmarkGc = { grandeComando: string; mes: number; vagas: number; escalados: number; presentes: number; preenchimento: number | null };
export type ArquivoDejem = { caminho: string; sha256: string | null; linhas: number | null; observacao: string | null; ingeridoEm: string };

export type DejemDataset = {
  jornadas: Jornada[];
  escalas: Escala[];        // só o 16º BPM/M
  escalasCpam5: Escala[];   // todas as unidades do CPA/M-5
  log: LogPresenca[];       // só o 16º BPM/M
  escalados: EscaladoOpm[]; // só OPMs 5051* (o 16º BPM/M)
  benchmark: BenchmarkGc[];
  arquivos: ArquivoDejem[];
  temDados: boolean;
};

const VAZIO: DejemDataset = {
  jornadas: [], escalas: [], escalasCpam5: [], log: [],
  escalados: [], benchmark: [], arquivos: [], temDados: false,
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error("[db/dejem] falha na consulta, usando fallback:", erro);
    return fallback;
  }
}

/** supabase-js v2 NÃO lança em erro de query — destructurar só `data` engole
 *  a falha e devolve página vazia como se fosse "sem dados". */
function unwrap<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

/** Pagina em blocos de 1000 (teto do PostgREST).
 *
 *  ATENÇÃO ao chamador: ordene SEMPRE por coluna única (a PK `id`). Ordenar
 *  por data, que se repete muitas vezes, torna a ordem indefinida entre um
 *  bloco e o seguinte — o Postgres pode devolver a mesma linha duas vezes e
 *  pular outra. O total continua batendo, então o erro passa despercebido, mas
 *  a composição sai errada. Foi exatamente o que aconteceu aqui: com `order by
 *  data_jornada`, o Estado-Maior aparecia com 537 jornadas e a Força Tática
 *  com 311, quando o banco tem 538 e 310.
 *
 *  O retorno do supabase-js é tipado a partir do schema; aqui só precisamos do
 *  par {data,error}, então a assinatura fica deliberadamente frouxa. */
async function buscarTudo<T>(
  montar: (de: number, ate: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const BLOCO = 1000;
  const todas: T[] = [];
  for (let de = 0; ; de += BLOCO) {
    const res = await montar(de, de + BLOCO - 1);
    const parte = unwrap({ data: res.data as T[] | null, error: res.error });
    todas.push(...parte);
    if (parte.length < BLOCO) return todas;
  }
}

type LinhaEscala = {
  aisp: string; aisp_norm: string; data: string; periodo: string; mes: number; dow: number;
  vagas: number; inscritos: number; escalados: number; presentes: number;
};

const mapEscala = (r: LinhaEscala): Escala => ({
  aisp: r.aisp, aispNorm: r.aisp_norm, data: r.data, periodo: r.periodo,
  mes: r.mes, dow: r.dow,
  vagas: r.vagas ?? 0, inscritos: r.inscritos ?? 0,
  escalados: r.escalados ?? 0, presentes: r.presentes ?? 0,
});

export function getDejemDataset(): Promise<DejemDataset> {
  return safe(async () => {
    const c = createAdminClient();
    const COLS_ESCALA = "aisp, aisp_norm, data, periodo, mes, dow, vagas, inscritos, escalados, presentes";

    const [jornadasRes, escalasCpam5, logRes, escaladosRes, benchRes, arquivosRes] = await Promise.all([
      buscarTudo<Record<string, string | number | null>>((de, ate) =>
        c.from("dejem_jornadas")
          .select("re, nome, posto, posto_norm, cia, data_jornada, hora_inicio, horas, tipo_cod, tipo_rotulo, mes, dow")
          .order("id").range(de, ate),
      ),
      buscarTudo<LinhaEscala>((de, ate) =>
        c.from("dejem_escalas").select(COLS_ESCALA).order("id").range(de, ate),
      ),
      c.from("dejem_log_presenca")
        .select("escala, re, nome, posto, data_inicio, convenio, atualizado_em, horas_de, horas_para, zerou_presenca, alterado_por_re, alterado_por_nome, mes")
        .eq("aisp_norm", AISP_BATALHAO).order("data_inicio"),
      c.from("dejem_escalados_opm")
        .select("mes, opm_cod, opm_nome, qtde, cia").eq("eh_16bpmm", true).order("mes"),
      c.from("dejem_benchmark_gc")
        .select("grande_comando, mes, vagas, escalados, presentes, preenchimento").order("preenchimento", { ascending: false }),
      c.from("arquivos_fonte")
        .select("caminho_unc, sha256, linhas_reais, observacao, ingerido_em")
        .eq("secao", "dejem").order("caminho_unc"),
    ]);

    const jornadas: Jornada[] = (jornadasRes as unknown as Record<string, string | number | null>[]).map((r) => ({
      re: String(r.re), nome: String(r.nome),
      posto: (r.posto as string) ?? null, postoNorm: (r.posto_norm as string) ?? null,
      cia: ((r.cia as string) ?? "sem") as CiaDejem,
      dataJornada: String(r.data_jornada), horaInicio: String(r.hora_inicio),
      horas: Number(r.horas), tipoCod: Number(r.tipo_cod), tipoRotulo: String(r.tipo_rotulo),
      mes: Number(r.mes), dow: Number(r.dow),
    }));

    const todasEscalas = escalasCpam5.map(mapEscala);
    const log: LogPresenca[] = unwrap(logRes).map((r: Record<string, unknown>) => ({
      escala: String(r.escala), re: String(r.re), nome: String(r.nome),
      posto: (r.posto as string) ?? null, dataInicio: String(r.data_inicio),
      convenio: (r.convenio as string) ?? null, atualizadoEm: String(r.atualizado_em),
      horasDe: r.horas_de === null ? null : Number(r.horas_de),
      horasPara: r.horas_para === null ? null : Number(r.horas_para),
      zerouPresenca: Boolean(r.zerou_presenca),
      alteradoPorRe: (r.alterado_por_re as string) ?? null,
      alteradoPorNome: (r.alterado_por_nome as string) ?? null,
      mes: Number(r.mes),
    }));

    const escalados: EscaladoOpm[] = unwrap(escaladosRes).map((r: Record<string, unknown>) => ({
      mes: Number(r.mes), opmCod: String(r.opm_cod), opmNome: String(r.opm_nome),
      qtde: Number(r.qtde), cia: ((r.cia as string) ?? "sem") as CiaDejem,
    }));

    const benchmark: BenchmarkGc[] = unwrap(benchRes).map((r: Record<string, unknown>) => ({
      grandeComando: String(r.grande_comando), mes: Number(r.mes),
      vagas: Number(r.vagas), escalados: Number(r.escalados), presentes: Number(r.presentes),
      preenchimento: r.preenchimento === null ? null : Number(r.preenchimento),
    }));

    const arquivos: ArquivoDejem[] = unwrap(arquivosRes).map((r: Record<string, unknown>) => ({
      caminho: String(r.caminho_unc), sha256: (r.sha256 as string) ?? null,
      linhas: r.linhas_reais === null ? null : Number(r.linhas_reais),
      observacao: (r.observacao as string) ?? null, ingeridoEm: String(r.ingerido_em),
    }));

    return {
      jornadas,
      escalas: todasEscalas.filter((e) => e.aispNorm === AISP_BATALHAO),
      escalasCpam5: todasEscalas,
      log, escalados, benchmark, arquivos,
      temDados: jornadas.length > 0 && todasEscalas.length > 0,
    };
  }, VAZIO);
}

/* ======================================================================== */
/* Helpers puros. Nenhum toca o banco — todos derivam do dataset acima.     */
/* ======================================================================== */

export type FiltroDejem = { mes?: number; cia?: CiaDejem };

/**
 * Aplica o filtro da URL.
 *
 * Cuidado deliberado: o filtro de Cia recorta APENAS o que tem Companhia no
 * grão (jornadas, escalados). As escalas do gerencial não têm Cia — a vaga é
 * ofertada ao batalhão e disputada por inscrição individual —, então filtrar
 * escala por Cia produziria zero e a página mentiria dizendo "esta Cia não
 * recebeu vaga". Por isso as escalas passam intactas no recorte de Cia, e a
 * página rotula esse fato onde ele importa.
 */
export function aplicarFiltro(ds: DejemDataset, f: FiltroDejem): DejemDataset {
  const porMes = <T extends { mes: number }>(xs: T[]) => (f.mes ? xs.filter((x) => x.mes === f.mes) : xs);
  const porCia = <T extends { cia: CiaDejem }>(xs: T[]) => (f.cia ? xs.filter((x) => x.cia === f.cia) : xs);
  return {
    ...ds,
    jornadas: porCia(porMes(ds.jornadas)),
    escalas: porMes(ds.escalas),
    escalasCpam5: porMes(ds.escalasCpam5),
    log: porMes(ds.log),
    escalados: porCia(porMes(ds.escalados)),
  };
}

const soma = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export type Funil = {
  vagas: number; inscritos: number; escalados: number; presentes: number;
  confirmadas: number; homensHora: number;
  inscricoesPorVaga: number | null;
  taxaEscalacao: number | null; taxaPresenca: number | null;
  ociosas: number; ociosasComInscrito: number; ociosasSemInscrito: number;
  faltas: number; perdaTotal: number; perdaPct: number | null;
  gapDeBase: number;
};

/**
 * Os dois blocos do estudo.
 *
 * NÃO é um funil único descendente. Há 8.828 inscrições para 3.916 vagas — um
 * funil que começasse nas inscrições sugeriria ~6 mil "perdas", o que é falso:
 * inscrição é PRESSÃO DE DEMANDA (várias por vaga), não etapa de conversão.
 *
 * `gapDeBase` é a diferença entre `presentes` (relatório gerencial, grão de
 * escala) e `confirmadas` (relatório analítico, grão de jornada nominal). São
 * DUAS FONTES diferentes, não faltas. A página é obrigada a rotular assim.
 */
export function funil(escalas: Escala[], jornadas: Jornada[]): Funil {
  const vagas = soma(escalas, (e) => e.vagas);
  const inscritos = soma(escalas, (e) => e.inscritos);
  const escalados = soma(escalas, (e) => e.escalados);
  const presentes = soma(escalas, (e) => e.presentes);
  const ociosas = vagas - escalados;
  // Por bloco de escala: quanto da ociosidade tinha candidato disponível.
  const semInscrito = soma(escalas, (e) => Math.max(0, e.vagas - e.inscritos));
  const comInscrito = soma(escalas, (e) => Math.max(0, Math.min(e.vagas, e.inscritos) - e.escalados));
  const faltas = escalados - presentes;
  return {
    vagas, inscritos, escalados, presentes,
    confirmadas: jornadas.length,
    homensHora: soma(jornadas, (j) => j.horas),
    inscricoesPorVaga: razao(inscritos, vagas),
    taxaEscalacao: pct(escalados, vagas),
    taxaPresenca: pct(presentes, escalados),
    ociosas, ociosasComInscrito: comInscrito, ociosasSemInscrito: semInscrito,
    faltas, perdaTotal: vagas - presentes, perdaPct: pct(vagas - presentes, vagas),
    gapDeBase: presentes - jornadas.length,
  };
}

export function serieMensal(escalas: Escala[], jornadas: Jornada[]) {
  const meses = [...new Set(escalas.map((e) => e.mes))].sort((a, b) => a - b);
  return meses.map((mes) => {
    const e = escalas.filter((x) => x.mes === mes);
    const vagas = soma(e, (x) => x.vagas);
    const escalados = soma(e, (x) => x.escalados);
    return {
      chave: `2026-${String(mes).padStart(2, "0")}`,
      mes,
      vagas: vagas || null,
      inscritos: soma(e, (x) => x.inscritos) || null,
      escalados: escalados || null,
      presentes: soma(e, (x) => x.presentes) || null,
      confirmadas: jornadas.filter((j) => j.mes === mes).length || null,
      ociosas: vagas - escalados,
      preenchimento: pct(escalados, vagas),
      concorrencia: razao(soma(e, (x) => x.inscritos), vagas),
    };
  });
}

export function porCompanhia(jornadas: Jornada[], escalados: EscaladoOpm[]) {
  return (["4", "em", "2", "1", "ft", "3", "sem"] as CiaDejem[])
    .map((cia) => {
      const js = jornadas.filter((j) => j.cia === cia);
      const pms = new Set(js.map((j) => j.re)).size;
      const escalasTotais = soma(escalados.filter((e) => e.cia === cia), (e) => e.qtde);
      // As duas fontes só reconciliam quando o total de escalas de TODAS as
      // modalidades cobre as jornadas DEJEM confirmadas. No balde "sem Cia"
      // isso não acontece: são 44 jornadas cujo relatório analítico não traz
      // Companhia, contra pouquíssimas escalas no quantitativo por OPM. Nesse
      // caso o percentual e a Delegada estimada não têm significado, e exibir
      // "2.200%" seria pior do que não exibir nada.
      const reconcilia = escalasTotais >= js.length;
      const cargas = [...new Map<string, number>(
        js.reduce((m, j) => m.set(j.re, (m.get(j.re) ?? 0) + 1), new Map<string, number>()),
      ).values()];
      return {
        cia, rotulo: ROTULO_CIA[cia],
        jornadas: js.length, pms,
        mediaPorPm: pms ? Math.round((js.length / pms) * 10) / 10 : null,
        maiorCarga: cargas.length ? Math.max(...cargas) : 0,
        homensHora: soma(js, (j) => j.horas),
        escalasTotais,
        reconcilia,
        // DERIVADO, não oficial: a tela de origem (Qtde. PM Escalados) não
        // filtra tipo de escala, então "todas as modalidades menos DEJEM
        // confirmado" é a melhor aproximação da Atividade Delegada.
        delegadaEstimada: reconcilia ? escalasTotais - js.length : null,
        percentualDejem: reconcilia ? pct(js.length, escalasTotais) : null,
        mensal: [1, 2, 3, 4, 5, 6].map((m) => js.filter((j) => j.mes === m).length),
      };
    })
    .filter((c) => c.jornadas > 0 || c.escalasTotais > 0);
}

export function porDiaSemana(escalas: Escala[], jornadas: Jornada[]) {
  return [1, 2, 3, 4, 5, 6, 7].map((dow) => {
    const e = escalas.filter((x) => x.dow === dow);
    const vagas = soma(e, (x) => x.vagas);
    const escalados = soma(e, (x) => x.escalados);
    return {
      dow, rotulo: DIAS_SEMANA[dow],
      vagas, inscritos: soma(e, (x) => x.inscritos), escalados,
      presentes: soma(e, (x) => x.presentes),
      ociosas: vagas - escalados,
      confirmadas: jornadas.filter((j) => j.dow === dow).length,
      preenchimento: pct(escalados, vagas),
    };
  }).filter((d) => d.vagas > 0);
}

export function porTurno(escalas: Escala[], minimoVagas = 20) {
  const mapa = new Map<string, Escala[]>();
  for (const e of escalas) mapa.set(e.periodo, [...(mapa.get(e.periodo) ?? []), e]);
  return [...mapa.entries()]
    .map(([periodo, es]) => {
      const vagas = soma(es, (x) => x.vagas);
      const escalados = soma(es, (x) => x.escalados);
      return {
        periodo: periodo.replace(/\s*[àa]s\s*/i, " às "),
        vagas, inscritos: soma(es, (x) => x.inscritos), escalados,
        presentes: soma(es, (x) => x.presentes),
        ociosas: vagas - escalados,
        concorrencia: razao(soma(es, (x) => x.inscritos), vagas),
        preenchimento: pct(escalados, vagas),
      };
    })
    .filter((t) => t.vagas >= minimoVagas)
    .sort((a, b) => b.vagas - a.vagas);
}

export function heatmapDiaFaixa(jornadas: Jornada[]) {
  const grade = new Map<string, number>();
  for (const j of jornadas) {
    const k = `${j.dow}|${faixaDeHora(j.horaInicio)}`;
    grade.set(k, (grade.get(k) ?? 0) + 1);
  }
  const maximo = Math.max(1, ...grade.values());
  return {
    maximo,
    linhas: [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
      dow, rotulo: DIAS_SEMANA[dow],
      celulas: FAIXAS_ORDEM.map((faixa: Faixa) => ({
        faixa, jornadas: grade.get(`${dow}|${faixa}`) ?? 0,
      })),
    })),
  };
}

export function pareto(jornadas: Jornada[]) {
  const porPm = new Map<string, number>();
  for (const j of jornadas) porPm.set(j.re, (porPm.get(j.re) ?? 0) + 1);
  const ordenado = [...porPm.values()].sort((a, b) => b - a);
  const total = ordenado.reduce((s, v) => s + v, 0);
  const n = ordenado.length;
  let acc = 0;
  const curva = ordenado.map((v, i) => {
    acc += v;
    return { posicao: i + 1, pmsPct: pct(i + 1, n) ?? 0, acumuladoPct: pct(acc, total) ?? 0 };
  });
  const marcos = [10, 20, 30, 50, Math.round(n / 2)]
    .filter((k, i, arr) => k > 0 && k <= n && arr.indexOf(k) === i)
    .sort((a, b) => a - b)
    .map((k) => ({ pms: k, pmsPct: pct(k, n), jornadasPct: curva[k - 1]?.acumuladoPct ?? null }));
  const faixa = (v: number) =>
    v >= 40 ? "40 ou mais" : v >= 30 ? "30 a 39" : v >= 20 ? "20 a 29"
      : v >= 10 ? "10 a 19" : v >= 5 ? "5 a 9" : "1 a 4";
  const contagem = new Map<string, number>();
  for (const v of ordenado) contagem.set(faixa(v), (contagem.get(faixa(v)) ?? 0) + 1);
  return {
    curva, total, pms: n,
    marcos,
    faixas: ["40 ou mais", "30 a 39", "20 a 29", "10 a 19", "5 a 9", "1 a 4"]
      .map((rotulo) => ({ rotulo, pms: contagem.get(rotulo) ?? 0 })),
  };
}

export function porPosto(jornadas: Jornada[]) {
  const mapa = new Map<string, { jornadas: number; pms: Set<string> }>();
  for (const j of jornadas) {
    const k = j.posto ?? "(não informado)";
    const atual = mapa.get(k) ?? { jornadas: 0, pms: new Set<string>() };
    atual.jornadas += 1; atual.pms.add(j.re);
    mapa.set(k, atual);
  }
  return [...mapa.entries()]
    .map(([posto, v]) => ({
      posto, jornadas: v.jornadas, pms: v.pms.size,
      mediaPorPm: v.pms.size ? Math.round((v.jornadas / v.pms.size) * 10) / 10 : null,
      participacao: pct(v.jornadas, jornadas.length),
    }))
    .sort((a, b) => b.jornadas - a.jornadas);
}

export function porAtividade(jornadas: Jornada[]) {
  const mapa = new Map<string, number>();
  for (const j of jornadas) mapa.set(j.tipoRotulo, (mapa.get(j.tipoRotulo) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([tipoRotulo, qtd]) => ({ tipoRotulo, jornadas: qtd, participacao: pct(qtd, jornadas.length) }))
    .sort((a, b) => b.jornadas - a.jornadas);
}

export function penetracao(jornadas: Jornada[], efetivo = EFETIVO_ESTIMADO) {
  const pms = new Set(jornadas.map((j) => j.re)).size;
  return { pms, efetivo, percentual: pct(pms, efetivo) };
}

/** Eixo da elasticidade: a oferta cresceu e o preenchimento caiu junto? */
export function elasticidadeOferta(escalas: Escala[]) {
  const serie = serieMensal(escalas, []);
  const pontos = serie
    .filter((s) => s.vagas && s.preenchimento !== null)
    .map((s) => ({ mes: s.mes, vagas: s.vagas as number, preenchimento: s.preenchimento as number }));
  const xs = pontos.map((p) => p.vagas);
  const ys = pontos.map((p) => p.preenchimento);
  const reta = regressao(xs, ys);
  return {
    pontos,
    correlacao: pearson(xs, ys),
    // p.p. de preenchimento por +100 vagas ofertadas no mês.
    inclinacaoPor100: reta ? Math.round(reta.a * 100 * 10) / 10 : null,
    reta,
  };
}

export function ociosidadeComInscrito(escalas: Escala[]) {
  const comInscrito = (e: Escala) => Math.max(0, Math.min(e.vagas, e.inscritos) - e.escalados);
  const semInscrito = (e: Escala) => Math.max(0, e.vagas - e.inscritos);
  const agrupar = <K extends string | number>(chave: (e: Escala) => K, rotulo: (k: K) => string) => {
    const m = new Map<K, number>();
    for (const e of escalas) m.set(chave(e), (m.get(chave(e)) ?? 0) + comInscrito(e));
    return [...m.entries()]
      .map(([k, v]) => ({ chave: rotulo(k), valor: v }))
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  };
  return {
    total: soma(escalas, (e) => e.vagas - e.escalados),
    comInscrito: soma(escalas, comInscrito),
    semInscrito: soma(escalas, semInscrito),
    porDia: agrupar((e) => e.dow, (d) => DIAS_SEMANA[d as number]),
    porTurno: agrupar((e) => e.periodo, (p) => String(p).replace(/\s*[àa]s\s*/i, " às ")),
  };
}

export function cargaIndividual(jornadas: Jornada[], meses = 6) {
  const porPm = new Map<string, { jornadas: number; horas: number; nome: string; posto: string | null; cia: CiaDejem }>();
  for (const j of jornadas) {
    const a = porPm.get(j.re) ?? { jornadas: 0, horas: 0, nome: j.nome, posto: j.posto, cia: j.cia };
    a.jornadas += 1; a.horas += j.horas;
    porPm.set(j.re, a);
  }
  const lista = [...porPm.entries()]
    .map(([re, v]) => ({
      re, ...v,
      horasMes: Math.round((v.horas / meses) * 10) / 10,
    }))
    .sort((a, b) => b.jornadas - a.jornadas);
  return {
    nominal: lista,
    anonimo: lista.map((l, i) => ({
      posicao: i + 1, cia: l.cia, rotuloCia: ROTULO_CIA[l.cia],
      jornadas: l.jornadas, horas: l.horas, horasMes: l.horasMes,
    })),
  };
}

/** Trilha de auditoria: quem lança a confirmação de presença. */
export function trilhaAuditoria(log: LogPresenca[]) {
  const mapa = new Map<string, { nome: string | null; eventos: number }>();
  for (const l of log) {
    const k = l.alteradoPorRe ?? "(não identificado)";
    const a = mapa.get(k) ?? { nome: l.alteradoPorNome, eventos: 0 };
    a.eventos += 1;
    mapa.set(k, a);
  }
  const autores = [...mapa.entries()]
    .map(([re, v]) => ({ re, nome: v.nome, eventos: v.eventos, participacao: pct(v.eventos, log.length) }))
    .sort((a, b) => b.eventos - a.eventos);
  return {
    autores,
    total: log.length,
    concentracaoTop1: autores[0]?.participacao ?? null,
    concentracaoTop2: autores.length > 1 ? pct(autores[0].eventos + autores[1].eventos, log.length) : autores[0]?.participacao ?? null,
  };
}

/**
 * Cobertura do log: das faltas que o gerencial contabiliza, quantas o log
 * nomeia. NÃO é indicador de falta — é indicador de PRÁTICA DE LANÇAMENTO.
 * Falta em que ninguém mexeu no lançamento não gera evento no log.
 */
export function coberturaLog(log: LogPresenca[], escalas: Escala[]) {
  const meses = [...new Set(escalas.map((e) => e.mes))].sort((a, b) => a - b);
  return meses.map((mes) => {
    const e = escalas.filter((x) => x.mes === mes);
    const faltasGerencial = soma(e, (x) => x.escalados) - soma(e, (x) => x.presentes);
    const nomeadas = log.filter((l) => l.mes === mes && l.zerouPresenca).length;
    return { mes, faltasGerencial, nomeadas, cobertura: pct(nomeadas, faltasGerencial) };
  });
}

export function faltasNominais(log: LogPresenca[]) {
  const zeradas = log.filter((l) => l.zerouPresenca);
  const porPm = new Map<string, { nome: string; posto: string | null; ocorrencias: number }>();
  for (const l of zeradas) {
    const a = porPm.get(l.re) ?? { nome: l.nome, posto: l.posto, ocorrencias: 0 };
    a.ocorrencias += 1;
    porPm.set(l.re, a);
  }
  const consolidado = [...porPm.entries()]
    .map(([re, v]) => ({ re, ...v }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias || a.nome.localeCompare(b.nome));
  return {
    eventos: zeradas,
    consolidado,
    total: zeradas.length,
    pmsDistintos: consolidado.length,
    reincidentes: consolidado.filter((c) => c.ocorrencias > 1).length,
    teto: consolidado[0]?.ocorrencias ?? 0,
  };
}

export function benchmarkUnidades(escalasCpam5: Escala[], minimoVagas = 100) {
  const mapa = new Map<string, Escala[]>();
  for (const e of escalasCpam5) mapa.set(e.aisp, [...(mapa.get(e.aisp) ?? []), e]);
  return [...mapa.entries()]
    .map(([aisp, es]) => {
      const vagas = soma(es, (x) => x.vagas);
      const escalados = soma(es, (x) => x.escalados);
      const presentes = soma(es, (x) => x.presentes);
      return {
        aisp, aispNorm: es[0].aispNorm,
        vagas, inscritos: soma(es, (x) => x.inscritos), escalados, presentes,
        preenchimento: pct(escalados, vagas),
        concorrencia: razao(soma(es, (x) => x.inscritos), vagas),
        perda: pct(vagas - presentes, vagas),
        ehDoBatalhao: es[0].aispNorm === AISP_BATALHAO,
      };
    })
    .filter((u) => u.vagas >= minimoVagas)
    .sort((a, b) => (b.preenchimento ?? 0) - (a.preenchimento ?? 0))
    .map((u, i) => ({ ...u, posicao: i + 1 }));
}

export function benchmarkEstadual(bench: BenchmarkGc[], minimoVagas = 300) {
  const filtrado = bench
    .filter((b) => b.vagas >= minimoVagas)
    .sort((a, b) => (b.preenchimento ?? 0) - (a.preenchimento ?? 0))
    .map((b, i) => ({
      ...b,
      posicao: i + 1,
      ehCpam5: /^CPA\/M-5/i.test(b.grandeComando),
      rotulo: b.grandeComando || "(sem Grande Comando)",
    }));
  const totVagas = soma(filtrado, (b) => b.vagas);
  const totEsc = soma(filtrado, (b) => b.escalados);
  return {
    linhas: filtrado,
    total: filtrado.length,
    mediaEstado: pct(totEsc, totVagas),
    vagasEstado: totVagas,
    escaladosEstado: totEsc,
    cpam5: filtrado.find((b) => b.ehCpam5) ?? null,
  };
}
