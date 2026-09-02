/**
 * Derivações do painel da Auditoria de COP 2026.
 *
 * Tudo aqui é função pura sobre o que `lib/cop2026.ts` leu da planilha. O
 * motivo de existir separado do componente: o painel precisa dizer o que os
 * números QUEREM DIZER, não só exibi-los, e uma frase-veredito escrita no meio
 * do JSX não se testa nem se reaproveita. Nenhuma função aqui importa React.
 */
import {
  ORDEM_SUBUNIDADES,
  ROTULO_SUBUNIDADE,
  MATRIZ_PROPORCIONAL_2026,
  META_TOTAL_BATALHAO,
  META_SEMANAL_BATALHAO,
  EFETIVO_TOTAL_BATALHAO,
  RITMO_GLOBAL_RESTANTE,
  TURNOS_RESTANTES_GLOBAL,
  redigirCpf,
  ehIdentificadorValido,
  separarIdentificadores,
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";
import { mesCorrente } from "@/lib/cop2026-relatorios";

export {
  MATRIZ_PROPORCIONAL_2026,
  META_TOTAL_BATALHAO,
  META_SEMANAL_BATALHAO,
  EFETIVO_TOTAL_BATALHAO,
  RITMO_GLOBAL_RESTANTE,
  TURNOS_RESTANTES_GLOBAL,
};

export const FMT = new Intl.NumberFormat("pt-BR");
export const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const FAIXAS_HORA = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"];

export const SEMANAS_ROTULOS = [
  { semana: 1, rotulo: "Semana 1", dias: "01 a 07" },
  { semana: 2, rotulo: "Semana 2", dias: "08 a 14" },
  { semana: 3, rotulo: "Semana 3", dias: "15 a 21" },
  { semana: 4, rotulo: "Semana 4", dias: "22 a 31" },
] as const;

export function identificarSemana(dataIso: string | undefined): number {
  if (!dataIso) return 1;
  const dia = parseInt(dataIso.slice(8, 10), 10);
  if (isNaN(dia)) return 1;
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

/** Mínimo do Batalhão por turno. A Diretriz PM3-001/02/25 pede 2; o Batalhão
 *  determinou 3. O valor real vem da aba Parâmetros — isto é só o piso de
 *  segurança para quando a planilha não trouxer a coluna. */
export const MINIMO_PADRAO = 3;

// ---------------------------------------------------------------------------
// Estatística descritiva
// ---------------------------------------------------------------------------
export function quantil(v: number[], q: number): number {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  const i = (o.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? o[lo] : o[lo] + (o[hi] - o[lo]) * (i - lo);
}

export const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

export const desvio = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};

// ---------------------------------------------------------------------------
// Filtros — o recorte que o usuário escolheu, e que viaja na URL
// ---------------------------------------------------------------------------
export type Filtros = {
  fracao: string;
  turno: string;
  semana: string;
  de: string;
  ate: string;
  busca: string;
  /** Recorte de exceção: só quem não auditou, só quem ficou abaixo do mínimo,
   *  só quem não informou os IDs das mídias, só quem informou algo que não é
   *  identificador da plataforma. Os dois últimos são casos DIFERENTES: um
   *  precisa ser cobrado a informar, o outro a corrigir. */
  excecao: "" | "naoauditou" | "abaixo" | "semids" | "idinvalido";
};

export const FILTROS_VAZIOS: Filtros = {
  fracao: "todas",
  turno: "todos",
  semana: "todas",
  de: "",
  ate: "",
  busca: "",
  excecao: "",
};

/**
 * Recorte padrão de QUALQUER superfície que confronte lançamentos com a meta:
 * o MÊS CORRENTE, nunca "tudo o que já entrou".
 *
 * A meta de 960 é MENSAL. Somar agosto com setembro contra ela faz o
 * percentual passar de 100% sem ninguém ter superado nada — foi exatamente o
 * que o quadro 08 da página pública exibiu em 01/09/2026: 627/960 de agosto
 * anunciados como "posição na meta do mês" no primeiro dia de setembro.
 *
 * Fora do ciclo de 2026 `mesCorrente()` não acha nada e volta a valer o ciclo
 * inteiro, que é a degradação certa: melhor o ciclo todo do que tela vazia.
 */
export function filtrosDoMesCorrente(): Filtros {
  const mes = mesCorrente();
  if (!mes) return FILTROS_VAZIOS;
  return { ...FILTROS_VAZIOS, de: mes.periodo.de, ate: mes.periodo.ate };
}

export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const um = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const excecao = um("excecao");
  const semana = um("semana");

  /* Sem data na URL, o painel abre no mês corrente (ver `filtrosDoMesCorrente`).
   *
   * Fica visível: com `de`/`ate` preenchidos, a barra de filtros mostra a
   * tarja do período, e um clique em limpar volta a ver o ciclo inteiro. É o
   * contrário de um recorte escondido — o link que o Comando compartilha passa
   * a dizer de que mês ele fala. */
  const de = um("de");
  const ate = um("ate");
  const padrao = !de && !ate ? filtrosDoMesCorrente() : undefined;

  return {
    fracao: um("fracao") || "todas",
    turno: um("turno") || "todos",
    semana: ["1", "2", "3", "4"].includes(semana) ? semana : "todas",
    de: de || padrao?.de || "",
    ate: ate || padrao?.ate || "",
    busca: um("busca"),
    excecao: (["naoauditou", "abaixo", "semids"] as const).includes(excecao as never)
      ? (excecao as Filtros["excecao"])
      : "",
  };
}

/** Só o que difere do padrão entra na URL — link curto é link que se cola no
 *  WhatsApp sem parecer rastreador. */
export function escreverFiltros(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.fracao !== "todas") p.set("fracao", f.fracao);
  if (f.turno !== "todos") p.set("turno", f.turno);
  if (f.semana && f.semana !== "todas") p.set("semana", f.semana);
  if (f.de) p.set("de", f.de);
  if (f.ate) p.set("ate", f.ate);
  if (f.busca) p.set("busca", f.busca);
  if (f.excecao) p.set("excecao", f.excecao);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function aplicarFiltros(
  lancamentos: LancamentoCop[],
  f: Filtros,
  minimo: number
): LancamentoCop[] {
  return lancamentos.filter((l) => {
    if (f.fracao !== "todas" && l.subunidade !== f.fracao) return false;
    if (f.turno !== "todos" && !(l.turno || "").toLowerCase().startsWith(f.turno)) return false;
    if (f.semana && f.semana !== "todas" && identificarSemana(l.data) !== parseInt(f.semana, 10)) {
      return false;
    }
    if (f.de && (!l.data || l.data < f.de)) return false;
    if (f.ate && (!l.data || l.data > f.ate)) return false;
    if (f.excecao === "naoauditou" && l.auditou) return false;
    if (f.excecao === "abaixo" && !(l.auditou && l.videos < minimo)) return false;
    if (f.excecao === "semids" && (!l.auditou || l.idsMidia.trim())) return false;
    if (
      f.excecao === "idinvalido" &&
      !(
        l.auditou &&
        l.idsMidia.trim() &&
        !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
      )
    ) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------
export type Nivel = "superacao" | "conforme" | "atencao" | "critico" | "neutro";

export const ROTULO_NIVEL: Record<Nivel, string> = {
  superacao: "Superação",
  conforme: "Conformidade",
  atencao: "Atenção",
  critico: "Crítica",
  neutro: "Sem dados",
};

/** Subtítulo semântico das faixas conforme definição do Comando.
 *  Sequência: Abaixo da Meta → Cumprimento Insuficiente → Meta Cumprida → Meta Superada */
export const SUBTITULO_NIVEL: Record<Nivel, string> = {
  superacao: "Meta Superada",
  conforme: "Meta Cumprida",
  atencao: "Cumprimento Insuficiente",
  critico: "Abaixo da Meta",
  neutro: "",
};

/** Regra sistêmica de classificação por faixa de cumprimento:
 *  - Superação (>100%): superou quantitativamente a referência
 *  - Conformidade (80–100%): limiar mínimo de conformidade atingido
 *  - Atenção (50–80%): em andamento, abaixo do limiar
 *  - Crítica (<50%): abaixo da meta
 *  - Não Aferível: valor inválido, negativo, NaN ou sem base de cálculo
 *
 *  A classificação opera sobre o valor bruto, ANTES de arredondamento.
 *  "Excelência" é reservada para indicador composto (quantidade + qualidade).
 */
export function nivelPorCumprimento(pct: number, temDados: boolean): Nivel {
  if (!temDados || !Number.isFinite(pct) || pct < 0) return "neutro";
  if (pct > 100) return "superacao";
  if (pct >= 80) return "conforme";
  if (pct >= 50) return "atencao";
  return "critico";
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
export type ProgressoSemana = {
  semana: number;
  rotulo: string;
  diasRotulo: string;
  meta: number;
  feito: number;
  pct: number;
  falta: number;
  nivel: Nivel;
};

export type LinhaFracao = {
  chave: string;
  rotulo: string;
  meta: number;
  feito: number;
  pct: number;
  falta: number;
  efetivo: number;
  lancaram: number;
  nivel: Nivel;
  /** Quantas evidências por turno restante essa fração precisa manter. */
  ritmoNecessario: number;
  turnosRestantes: number;
  /** Proporção da meta desta fração em relação ao total do Batalhão (960). */
  pctBatalhao?: number;
  /** Rateio inteiro do ritmo global de 73 evidências por turno. */
  ritmoProporcional?: number;
  /** Efetivo do quadro fixo da fração (base: 570 PMs). */
  efetivoQuadro?: number;
  /** Média semanal da meta da fração. */
  metaSemanalMedia: number;
  /** Desempenho semana a semana (S1, S2, S3, S4). */
  semanas: ProgressoSemana[];
};

export type LinhaAuditor = {
  chave: string;
  nome: string;
  posto: string;
  fracao: string;
  lanc: number;
  videos: number;
  media: number;
  abaixo: number;
  semIds: number;
  naoAuditou: number;
  nivel: Nivel;
};

export type Painel = ReturnType<typeof calcularPainel>;

export function calcularPainel(
  lancamentos: LancamentoCop[],
  metas: MetaSubunidade[],
  f: Filtros
) {
  const minimo =
    metas.find((m) => m.evidenciasPorTurno > 0)?.evidenciasPorTurno ?? MINIMO_PADRAO;

  const dados = aplicarFiltros(lancamentos, f, minimo);
  
  // Normaliza as metas aplicando a Matriz Operacional Proporcional (960 evidências / 570 PMs)
  const metasNormalizadas = metas.map((m) => {
    const mat = MATRIZ_PROPORCIONAL_2026[m.subunidade];
    const metaBase = mat ? mat.meta : m.meta;
    // Se o filtro estiver em uma semana específica, a meta do recorte é a meta daquela semana
    const metaAjustada =
      f.semana !== "todas" && mat
        ? mat.metasSemanais[parseInt(f.semana, 10) - 1]
        : f.semana !== "todas"
          ? Math.round(metaBase / 4)
          : metaBase;

    return {
      ...m,
      meta: metaAjustada,
      efetivo: mat ? mat.efetivo : m.efetivo,
    };
  });

  const metasRecorte =
    f.fracao === "todas"
      ? metasNormalizadas
      : metasNormalizadas.filter((m) => m.subunidade === f.fracao);

  const meta = metasRecorte.reduce((s, m) => s + m.meta, 0);
  const auditores = metasRecorte.reduce((s, m) => s + m.efetivo, 0);
  const turnosPrevistos = Math.max(...metasRecorte.map((m) => m.turnos), 15);

  const videosPorLanc = dados.filter((l) => l.auditou).map((l) => l.videos);
  const total = videosPorLanc.reduce((a, b) => a + b, 0);
  const pct = meta > 0 ? (total / meta) * 100 : 0;
  const falta = Math.max(0, meta - total);

  const ativos = new Set(dados.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
  const conformes = dados.filter((l) => l.auditou && l.videos >= minimo).length;
  const taxaConf = dados.length ? (conformes / dados.length) * 100 : 0;
  const naoAuditou = dados.filter((l) => !l.auditou).length;
  const abaixo = dados.filter((l) => l.auditou && l.videos < minimo).length;
  const semIds = dados.filter((l) => l.auditou && !l.idsMidia.trim()).length;

  /* ---- qualidade da evidência --------------------------------------------
   *
   * O número OFICIAL do Batalhão continua sendo `total`, que soma a quantidade
   * DECLARADA — é o que mantém setembro comparável com agosto e a meta de 960
   * de pé. O que entra aqui ao lado é o quanto dessa declaração está
   * acompanhada de um identificador que resolve para um objeto da plataforma.
   *
   * Medido na planilha em 31/08/2026, sobre 471 identificadores lançados em
   * agosto: 44,6% ID da mídia, 6,6% ID da gravação, 0,2% ID de página e 48,6%
   * que não é identificador de coisa nenhuma — número solto do tipo
   * `20260824916201`, URL, ou texto livre. Índice de rastreabilidade: 51,2%.
   *
   * Por que isto é indicador e não régua: trocar a contagem de "declarado"
   * para "rastreável" derrubaria agosto de 604 para 241 evidências — de 62,9%
   * para 25,1% da meta, atravessando duas faixas de classificação sem que
   * ninguém tenha auditado menos. A régua é decisão do Comando; o painel
   * mostra o tamanho do problema e espera a decisão.
   */
  const evidenciasRastreaveis = dados
    .filter((l) => l.auditou)
    .reduce(
      (s, l) => s + separarIdentificadores(l.idsMidia).filter(ehIdentificadorValido).length,
      0
    );
  const comIdRastreavel = dados.filter(
    (l) => l.auditou && separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
  ).length;
  /* Informou alguma coisa no campo de ID, e nada daquilo é identificador.
   * Separado de `semIds` de propósito: quem não informou nada precisa ser
   * cobrado a informar; quem informou lixo precisa ser cobrado a CORRIGIR, e
   * hoje o painel trata os dois como se fossem o mesmo caso. */
  const comIdInvalido = dados.filter(
    (l) =>
      l.auditou &&
      l.idsMidia.trim() &&
      !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
  ).length;
  const indiceRastreabilidade = total > 0 ? (evidenciasRastreaveis / total) * 100 : 0;
  const partes = dados.filter((l) => l.numeroParte).length;
  const mediana = quantil(videosPorLanc, 0.5);
  const p90 = quantil(videosPorLanc, 0.9);

  // ---- série diária + carta de controle -----------------------------------
  const porDia = (() => {
    const m = new Map<string, number>();
    dados.forEach((l) => {
      if (!l.data) return;
      m.set(l.data, (m.get(l.data) ?? 0) + l.videos);
    });
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, v]) => ({ data, rotulo: `${data.slice(8, 10)}/${data.slice(5, 7)}`, v }));
  })();
  const serie = porDia.map((d) => d.v);
  const mediaDia = media(serie);
  const sigma = desvio(serie);
  const lsc = mediaDia + 3 * sigma;
  const lic = Math.max(0, mediaDia - 3 * sigma);
  const foraDeControle = porDia.filter((d) => sigma > 0 && (d.v > lsc || d.v < lic));
  const metaDia = metasRecorte.reduce((s, m) => s + (m.turnos > 0 ? m.meta / m.turnos : 0), 0);

  /** Turnos já cobertos = dias distintos com lançamento. É a melhor
   *  aproximação disponível: a planilha registra data e turno, não um
   *  calendário de escala. */
  const turnosCumpridos = porDia.length;
  const turnosRestantes = Math.max(0, turnosPrevistos - turnosCumpridos);
  const ritmoNecessario = turnosRestantes > 0 ? falta / turnosRestantes : falta;

  // ---- semanas consolidadas do Batalhão / Recorte --------------------------
  const lancamentosSemanaisBase = lancamentos.filter((l) => {
    if (f.fracao !== "todas" && l.subunidade !== f.fracao) return false;
    if (f.turno !== "todos" && !(l.turno || "").toLowerCase().startsWith(f.turno)) return false;
    return true;
  });

  const semanasBatalhao: ProgressoSemana[] = SEMANAS_ROTULOS.map((s) => {
    const daSemana = lancamentosSemanaisBase.filter(
      (l) => l.auditou && identificarSemana(l.data) === s.semana
    );
    const feito = daSemana.reduce((sum, l) => sum + l.videos, 0);
    const metaSem =
      f.fracao === "todas"
        ? META_SEMANAL_BATALHAO
        : (MATRIZ_PROPORCIONAL_2026[f.fracao]?.metasSemanais[s.semana - 1] ?? 60);
    const p = metaSem > 0 ? (feito / metaSem) * 100 : 0;
    return {
      semana: s.semana,
      rotulo: s.rotulo,
      diasRotulo: s.dias,
      meta: metaSem,
      feito,
      pct: p,
      falta: Math.max(0, metaSem - feito),
      nivel: nivelPorCumprimento(p, feito > 0),
    };
  });

  // ---- ranking de frações --------------------------------------------------
  const fracoes: LinhaFracao[] = metasRecorte
    .map((m) => {
      const daFracao = dados.filter((l) => l.subunidade === m.subunidade);
      const feito = daFracao.reduce((s, l) => s + l.videos, 0);
      const lancaram = new Set(daFracao.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
      const mat = MATRIZ_PROPORCIONAL_2026[m.subunidade];
      const metaReal = mat ? mat.meta : m.meta;
      const p = metaReal > 0 ? (feito / metaReal) * 100 : 0;
      const fa = Math.max(0, metaReal - feito);
      const rest = Math.max(0, (m.turnos || 15) - turnosCumpridos);

      // Desempenho semana a semana da fração
      const todosDaFracao = lancamentos.filter((l) => l.subunidade === m.subunidade && l.auditou);
      const semanasFracao: ProgressoSemana[] = SEMANAS_ROTULOS.map((s) => {
        const lancsSem = todosDaFracao.filter((l) => identificarSemana(l.data) === s.semana);
        const feitoSem = lancsSem.reduce((sum, l) => sum + l.videos, 0);
        const metaSem = mat ? mat.metasSemanais[s.semana - 1] : Math.round(metaReal / 4);
        const pSem = metaSem > 0 ? (feitoSem / metaSem) * 100 : 0;
        return {
          semana: s.semana,
          rotulo: s.rotulo,
          diasRotulo: s.dias,
          meta: metaSem,
          feito: feitoSem,
          pct: pSem,
          falta: Math.max(0, metaSem - feitoSem),
          nivel: nivelPorCumprimento(pSem, feitoSem > 0),
        };
      });

      return {
        chave: m.subunidade,
        rotulo: ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade,
        meta: metaReal,
        feito,
        pct: p,
        falta: fa,
        efetivo: m.efetivo,
        lancaram,
        nivel: nivelPorCumprimento(p, metaReal > 0),
        ritmoNecessario: rest > 0 ? fa / rest : fa,
        turnosRestantes: rest,
        pctBatalhao: mat ? mat.pctMeta : meta > 0 ? (metaReal / meta) * 100 : 0,
        ritmoProporcional: mat?.ritmoProporcional,
        efetivoQuadro: mat ? mat.efetivo : m.efetivo,
        metaSemanalMedia: mat ? mat.metaSemanalMedia : metaReal / 4,
        semanas: semanasFracao,
      };
    })
    .sort((a, b) => {
      const ia = ORDEM_SUBUNIDADES.indexOf(a.chave as (typeof ORDEM_SUBUNIDADES)[number]);
      const ib = ORDEM_SUBUNIDADES.indexOf(b.chave as (typeof ORDEM_SUBUNIDADES)[number]);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.chave.localeCompare(b.chave);
    });

  // ---- comparativos --------------------------------------------------------
  const porTurno = ["diurno", "noturno"].map((t) => ({
    rotulo: t === "diurno" ? "Diurno" : "Noturno",
    v: dados
      .filter((l) => (l.turno || "").toLowerCase().startsWith(t))
      .reduce((s, l) => s + l.videos, 0),
  }));

  const porFuncao = (() => {
    const m = new Map<string, number>();
    dados.forEach((l) =>
      m.set(l.funcao || "Não informada", (m.get(l.funcao || "Não informada") ?? 0) + l.videos)
    );
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([rotulo, v]) => ({ rotulo, v }));
  })();

  /* Função e posto respondem a perguntas diferentes: uma diz em que atribuição
     a auditoria acontece, a outra em que nível hierárquico. O Comando cobra
     por posto. */
  const agruparPor = (chave: (l: LancamentoCop) => string) => {
    const m = new Map<string, { v: number; pms: Set<string> }>();
    dados.forEach((l) => {
      const k = chave(l) || "Não informado";
      const a = m.get(k) ?? { v: 0, pms: new Set<string>() };
      a.v += l.videos;
      const quem = l.re || l.nomeGuerra;
      if (quem) a.pms.add(quem);
      m.set(k, a);
    });
    return [...m.entries()]
      .sort((a, b) => b[1].v - a[1].v)
      .slice(0, 8)
      .map(([rotulo, a]) => ({ rotulo, v: a.v, pms: a.pms.size }));
  };
  const porPosto = agruparPor((l) => l.posto);

  // ---- exceções nominais ---------------------------------------------------
  /* Contagem não se cobra: nome se cobra. A Diretriz PM3-001/02/25 manda olhar
     de perto quem não auditou, quem ficou abaixo do mínimo e as partes — com a
     justificativa que a pessoa registrou, não só o número dela. */
  const detalhar = (l: LancamentoCop) => ({
    id: l.id,
    quem: `${l.posto} ${l.nomeGuerra}`.trim() || l.re,
    fracao: ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade,
    data: l.data,
    turno: l.turno,
    videos: l.videos,
    parte: l.numeroParte,
    justificativa: l.justificativa,
    descartado: l.quantidadeDescartada,
  });
  const naoAuditouLista = dados.filter((l) => !l.auditou).map(detalhar);
  const abaixoLista = dados.filter((l) => l.auditou && l.videos < minimo).map(detalhar);
  const partesLista = dados.filter((l) => l.numeroParte).map(detalhar);
  const semIdsLista = dados.filter((l) => l.auditou && !l.idsMidia.trim()).map(detalhar);
  /* Informou alguma coisa e nada daquilo resolve para a plataforma. É a lista
   * do que se cobra CORRIGIR — distinta de `semIdsLista`, que é o que se cobra
   * INFORMAR. Sem essa separação o Comando manda a mesma cobrança para quem
   * esqueceu e para quem colou o número errado. */
  const idInvalidoLista = dados
    .filter(
      (l) =>
        l.auditou &&
        l.idsMidia.trim() &&
        !separarIdentificadores(l.idsMidia).some(ehIdentificadorValido)
    )
    .map(detalhar);
  /* Quantidade implausível: o campo "informe a quantidade exata" é texto livre
     e já recebeu o ID da mídia no lugar do número. A contagem foi corrigida na
     leitura (lib/cop2026.ts), mas a planilha continua errada — quem conserta é
     o auditor, e só conserta se o painel disser o nome dele. */
  const quantidadeInvalidaLista = dados.filter((l) => l.quantidadeDescartada > 0).map(detalhar);

  // ---- histograma ----------------------------------------------------------
  const histograma = [0, 1, 2, 3, 4, 5].map((n) => ({
    faixa: n === 5 ? "5+" : String(n),
    q: videosPorLanc.filter((v) => (n === 5 ? v >= 5 : v === n)).length,
    conforme: n >= minimo,
  }));

  // ---- dispersão por fração ------------------------------------------------
  const dispersao = fracoes.map((s) => {
    const v = dados.filter((l) => l.subunidade === s.chave && l.auditou).map((l) => l.videos);
    return {
      rotulo: s.rotulo,
      min: v.length ? Math.min(...v) : 0,
      q1: quantil(v, 0.25),
      med: quantil(v, 0.5),
      q3: quantil(v, 0.75),
      p90: quantil(v, 0.9),
      max: v.length ? Math.max(...v) : 0,
      n: v.length,
    };
  });

  // ---- matriz hora × dia ---------------------------------------------------
  const matriz: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
  dados.forEach((l) => {
    if (!l.data) return;
    const d = new Date(`${l.data}T12:00:00`).getDay();
    const h = Number.parseInt((l.hora || "").slice(0, 2), 10);
    const faixa = Number.isFinite(h) ? Math.min(5, Math.floor(h / 4)) : 3;
    matriz[d][faixa] += l.videos;
  });
  const maxMatriz = Math.max(1, ...matriz.flat());

  // ---- Pareto de auditores -------------------------------------------------
  const pareto = (() => {
    const m = new Map<string, number>();
    dados.forEach((l) => {
      const k = l.nomeGuerra || l.re;
      if (k) m.set(k, (m.get(k) ?? 0) + l.videos);
    });
    const lista = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const soma = lista.reduce((s, [, v]) => s + v, 0) || 1;
    let acc = 0;
    return lista.map(([nome, v]) => {
      acc += v;
      return { nome, v, acumulado: (acc / soma) * 100 };
    });
  })();

  // ---- funil ---------------------------------------------------------------
  /* A etapa dos IDs dizia "Com IDs de mídia informados" e contava qualquer
   * coisa digitada no campo — em agosto, 48,6% daquilo não era identificador de
   * nada. O funil anunciava cobertura que não existia. Agora a etapa mede o que
   * o nome dela promete, e a última fecha o funil com a verdade: nada foi
   * conferido contra a plataforma, porque não há integração com ela. Mostrar
   * zero é honesto — e é o argumento mais forte para conseguir o acesso. */
  const funil = [
    { etapa: "Lançamentos recebidos", v: dados.length },
    { etapa: "Auditaram no turno", v: dados.filter((l) => l.auditou).length },
    { etapa: `Cumpriram o mínimo de ${minimo}`, v: conformes },
    { etapa: "Com identificador em formato válido", v: comIdRastreavel },
    { etapa: "Conferidos na plataforma", v: 0 },
  ];

  // ---- tabela analítica ----------------------------------------------------
  const auditoresLinhas: LinhaAuditor[] = (() => {
    const m = new Map<string, LinhaAuditor>();
    dados.forEach((l) => {
      const k = l.re || l.nomeGuerra;
      if (!k) return;
      const a =
        m.get(k) ??
        ({
          chave: k,
          nome: l.nomeGuerra || l.re,
          posto: l.posto,
          fracao: ROTULO_SUBUNIDADE[l.subunidade] ?? "",
          lanc: 0,
          videos: 0,
          media: 0,
          abaixo: 0,
          semIds: 0,
          naoAuditou: 0,
          nivel: "neutro",
        } as LinhaAuditor);
      a.lanc += 1;
      a.videos += l.videos;
      if (!l.auditou) a.naoAuditou += 1;
      if (l.auditou && l.videos < minimo) a.abaixo += 1;
      if (l.auditou && !l.idsMidia.trim()) a.semIds += 1;
      m.set(k, a);
    });
    return [...m.values()].map((a) => {
      a.media = a.lanc ? a.videos / a.lanc : 0;
      const desvios = a.abaixo + a.naoAuditou;
      a.nivel = desvios === 0 ? "conforme" : desvios >= a.lanc ? "critico" : "atencao";
      return a;
    });
  })();

  const nivelGeral = nivelPorCumprimento(pct, meta > 0 && dados.length > 0);

  return {
    minimo,
    /* Quantas respostas existem na planilha inteira, antes de qualquer filtro.
       É o que separa "seu recorte não pegou nada" de "ainda não há auditoria
       lançada" — dizer a primeira quando é a segunda manda o Comando mexer num
       filtro que ele não aplicou. */
    totalNaPlanilha: lancamentos.length,
    dados,
    metasRecorte,
    meta,
    auditores,
    total,
    pct,
    falta,
    ativos,
    conformes,
    taxaConf,
    naoAuditou,
    abaixo,
    semIds,
    // Qualidade da evidência — indicador, não régua. O total oficial acima
    // continua sendo a quantidade declarada (ver comentário em `calcularPainel`).
    evidenciasRastreaveis,
    indiceRastreabilidade,
    comIdRastreavel,
    comIdInvalido,
    partes,
    mediana,
    p90,
    porDia,
    mediaDia,
    sigma,
    lsc,
    lic,
    foraDeControle,
    metaDia,
    turnosPrevistos,
    turnosCumpridos,
    turnosRestantes,
    ritmoNecessario,
    fracoes,
    semanasBatalhao,
    porTurno,
    porFuncao,
    porPosto,
    naoAuditouLista,
    abaixoLista,
    idInvalidoLista,
    partesLista,
    semIdsLista,
    quantidadeInvalidaLista,
    histograma,
    dispersao,
    matriz,
    maxMatriz,
    pareto,
    funil,
    auditoresLinhas,
    nivelGeral,
  };
}

// ---------------------------------------------------------------------------
// Frases-conclusão — o painel dizendo o que ele mesmo está mostrando
// ---------------------------------------------------------------------------
export function veredito(p: Painel): { titulo: string; detalhe: string; nivel: Nivel } {
  if (!p.dados.length) {
    return p.totalNaPlanilha === 0
      ? {
          titulo: "Nenhuma auditoria lançada ainda.",
          detalhe:
            "A planilha de respostas está vazia. O painel passa a medir assim que o primeiro formulário for enviado.",
          nivel: "neutro",
        }
      : {
          titulo: "Sem lançamentos no recorte selecionado.",
          detalhe: `A planilha tem ${FMT.format(p.totalNaPlanilha)} resposta(s), mas nenhuma dentro deste filtro. Limpe o recorte para ver tudo.`,
          nivel: "neutro",
        };
  }
  const ritmo =
    p.turnosRestantes > 0
      ? `Faltam ${FMT.format(p.falta)} evidências em ${FMT.format(p.turnosRestantes)} turno${
          p.turnosRestantes === 1 ? "" : "s"
        } — ${FMT.format(Math.ceil(p.ritmoNecessario))} por turno para fechar a meta.`
      : `Faltam ${FMT.format(p.falta)} evidências e os ${FMT.format(
          p.turnosPrevistos
        )} turnos previstos já foram cumpridos.`;

  const TITULO_POR_NIVEL: Record<Nivel, string> = {
    superacao: "ACIMA da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    conforme: "CUMPRIDA a Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    atencao: "FAIXA DE ATENÇÃO da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    critico: "ABAIXO da Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
    neutro: "Métrica para Monitoramento e Controle de Vídeos (Evidências / Ocorrências)",
  };
  const titulo = TITULO_POR_NIVEL[p.nivelGeral];

  const detalhe =
    p.pct > 100
      ? `Auditoria em ${PCT.format(p.pct)}% da meta — superação quantitativa da referência no 16º BPM/M.`
      : p.falta > 0
        ? `Auditoria em ${PCT.format(p.pct)}% da meta. ${ritmo}`
        : `Auditoria em ${PCT.format(p.pct)}% da meta — meta do período já cumprida no 16º BPM/M.`;

  return { titulo, detalhe, nivel: p.nivelGeral };
}

export function conclusaoRitmo(p: Painel): string {
  if (p.porDia.length < 2) return "Ainda não há dias suficientes para descrever um ritmo.";
  const ultimo = p.porDia[p.porDia.length - 1];
  const comparativo =
    ultimo.v >= p.mediaDia
      ? `acima da média diária de ${FMT.format(Math.round(p.mediaDia))}`
      : `abaixo da média diária de ${FMT.format(Math.round(p.mediaDia))}`;
  const atipicos = p.foraDeControle.length
    ? ` ${p.foraDeControle.length} dia(s) ficaram fora da faixa normal e merecem verificação.`
    : " Nenhum dia saiu da faixa normal de variação.";
  return `Último dia (${ultimo.rotulo}): ${FMT.format(ultimo.v)} evidências, ${comparativo}.${atipicos}`;
}

export function conclusaoQualidade(p: Painel): string {
  const forte = p.histograma.filter((h) => h.conforme).reduce((s, h) => s + h.q, 0);
  const t = p.histograma.reduce((s, h) => s + h.q, 0) || 1;
  return `${PCT.format((forte / t) * 100)}% dos lançamentos trouxeram ${p.minimo} ou mais evidências. A mediana é ${FMT.format(
    p.mediana
  )} e os 10% mais produtivos entregam ${FMT.format(p.p90)} ou mais.`;
}

export function conclusaoPareto(p: Painel): string {
  if (!p.pareto.length) return "Sem auditores no recorte.";
  const oitenta = p.pareto.findIndex((d) => d.acumulado >= 80);
  const n = oitenta === -1 ? p.pareto.length : oitenta + 1;
  return `${FMT.format(n)} auditor(es) respondem por ~80% de tudo que foi auditado no recorte — a carga está concentrada neles.`;
}

export function conclusaoDistribuicao(p: Painel): string {
  const comDados = p.dispersao.filter((d) => d.n > 0);
  if (!comDados.length) return "Sem dispersão a comparar no recorte.";
  const pior = [...comDados].sort((a, b) => a.med - b.med)[0];
  return `${pior.rotulo} tem a menor mediana do recorte (${FMT.format(pior.med)} evidências por lançamento, n=${FMT.format(pior.n)}).`;
}

export function conclusaoFunil(p: Painel): string {
  const recebidos = p.funil[0]?.v || 1;
  const comIds = p.funil[3]?.v ?? 0;
  return `De ${FMT.format(recebidos)} lançamentos recebidos, ${FMT.format(comIds)} (${PCT.format(
    (comIds / recebidos) * 100
  )}%) chegaram com os IDs das mídias — sem o ID, a evidência não é rastreável na conferência.`;
}

export function conclusaoHorario(p: Painel): string {
  let melhorD = 0;
  let melhorF = 0;
  let melhor = 0;
  p.matriz.forEach((linha, d) =>
    linha.forEach((v, f) => {
      if (v > melhor) {
        melhor = v;
        melhorD = d;
        melhorF = f;
      }
    })
  );
  if (!melhor) return "Sem concentração identificável no recorte.";
  return `A auditoria se concentra em ${DIAS[melhorD]}, na faixa das ${FAIXAS_HORA[melhorF]}h (${FMT.format(melhor)} evidências).`;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export function auditoresParaCsv(linhas: LinhaAuditor[]): string {
  const cab = [
    "Auditor",
    "Posto",
    "Fração",
    "Lançamentos",
    "Evidências",
    "Média",
    "Abaixo do mínimo",
    "Sem IDs",
    "Não auditou",
  ];
  const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const corpo = linhas.map((r) =>
    [r.nome, r.posto, r.fracao, r.lanc, r.videos, r.media.toFixed(2), r.abaixo, r.semIds, r.naoAuditou]
      .map(escapar)
      .join(";")
  );
  // BOM: sem ele o Excel em pt-BR abre acentuação quebrada.
  return `﻿${[cab.map(escapar).join(";"), ...corpo].join("\r\n")}`;
}

/** O CSV da tabela analítica agrega por auditor. Este exporta a resposta como
 *  ela está na planilha — é o que instrui parte e vira anexo de processo. */
export function lancamentosParaCsv(dados: LancamentoCop[]): string {
  const cab = [
    "Data",
    "Hora",
    "Turno",
    "RE",
    "Nome de guerra",
    "Posto",
    "Função",
    "Fração",
    "Auditou",
    "Evidências",
    "IDs auditados",
    "Parte",
    "Justificativa",
  ];
  const escapar = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const corpo = dados.map((l) =>
    [
      l.data,
      l.hora,
      l.turno,
      l.re,
      l.nomeGuerra,
      l.posto,
      l.funcao,
      ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade,
      l.auditou ? "Sim" : "Não",
      l.videos,
      // Os três campos de texto livre passam pela redação de CPF: são os únicos
      // em que o auditor cola conteúdo copiado da plataforma. Os demais são
      // fechados (data, turno, fração) ou já institucionais (RE, posto).
      redigirCpf(l.idsMidia.replace(/\s+/g, " ")),
      redigirCpf(l.numeroParte),
      redigirCpf(l.justificativa),
    ]
      .map(escapar)
      .join(";")
  );
  return `\ufeff${[cab.map(escapar).join(";"), ...corpo].join("\r\n")}`;
}

export type Excecao = Painel["naoAuditouLista"][number];

export const ORDEM = ORDEM_SUBUNIDADES;
