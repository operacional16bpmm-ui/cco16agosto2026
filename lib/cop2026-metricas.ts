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
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";

export const FMT = new Intl.NumberFormat("pt-BR");
export const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const FAIXAS_HORA = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"];

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
  de: string;
  ate: string;
  busca: string;
  /** Recorte de exceção: só quem não auditou, só quem ficou abaixo do mínimo,
   *  só quem não informou os IDs das mídias. */
  excecao: "" | "naoauditou" | "abaixo" | "semids";
};

export const FILTROS_VAZIOS: Filtros = {
  fracao: "todas",
  turno: "todos",
  de: "",
  ate: "",
  busca: "",
  excecao: "",
};

export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const um = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const excecao = um("excecao");
  return {
    fracao: um("fracao") || "todas",
    turno: um("turno") || "todos",
    de: um("de"),
    ate: um("ate"),
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
    if (f.de && (!l.data || l.data < f.de)) return false;
    if (f.ate && (!l.data || l.data > f.ate)) return false;
    if (f.excecao === "naoauditou" && l.auditou) return false;
    if (f.excecao === "abaixo" && !(l.auditou && l.videos < minimo)) return false;
    if (f.excecao === "semids" && (!l.auditou || l.idsMidia.trim())) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Semáforo
// ---------------------------------------------------------------------------
export type Nivel = "conforme" | "atencao" | "critico" | "neutro";

export const ROTULO_NIVEL: Record<Nivel, string> = {
  conforme: "No padrão",
  atencao: "Atenção",
  critico: "Crítico",
  neutro: "Sem dados",
};

/** Um único lugar decide o que é verde, âmbar e vermelho. Espalhar esse
 *  julgamento por dez componentes é como dois relatórios discordarem sobre a
 *  mesma companhia. */
export function nivelPorCumprimento(pct: number, temDados: boolean): Nivel {
  if (!temDados) return "neutro";
  if (pct >= 90) return "conforme";
  if (pct >= 70) return "atencao";
  return "critico";
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
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
  const metasRecorte = f.fracao === "todas" ? metas : metas.filter((m) => m.subunidade === f.fracao);

  const meta = metasRecorte.reduce((s, m) => s + m.meta, 0);
  const auditores = metasRecorte.reduce((s, m) => s + m.efetivo, 0);
  const turnosPrevistos = Math.max(...metasRecorte.map((m) => m.turnos), 0);

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

  // ---- ranking de frações --------------------------------------------------
  const fracoes: LinhaFracao[] = metasRecorte
    .map((m) => {
      const daFracao = dados.filter((l) => l.subunidade === m.subunidade);
      const feito = daFracao.reduce((s, l) => s + l.videos, 0);
      const lancaram = new Set(daFracao.map((l) => l.re || l.nomeGuerra).filter(Boolean)).size;
      const p = m.meta > 0 ? (feito / m.meta) * 100 : 0;
      const fa = Math.max(0, m.meta - feito);
      const rest = Math.max(0, m.turnos - turnosCumpridos);
      return {
        chave: m.subunidade,
        rotulo: ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade,
        meta: m.meta,
        feito,
        pct: p,
        falta: fa,
        efetivo: m.efetivo,
        lancaram,
        nivel: nivelPorCumprimento(p, m.meta > 0),
        ritmoNecessario: rest > 0 ? fa / rest : fa,
        turnosRestantes: rest,
      };
    })
    .sort((a, b) => a.pct - b.pct);

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
  });
  const naoAuditouLista = dados.filter((l) => !l.auditou).map(detalhar);
  const abaixoLista = dados.filter((l) => l.auditou && l.videos < minimo).map(detalhar);
  const partesLista = dados.filter((l) => l.numeroParte).map(detalhar);
  const semIdsLista = dados.filter((l) => l.auditou && !l.idsMidia.trim()).map(detalhar);

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
  const funil = [
    { etapa: "Lançamentos recebidos", v: dados.length },
    { etapa: "Auditaram no turno", v: dados.filter((l) => l.auditou).length },
    { etapa: `Cumpriram o mínimo de ${minimo}`, v: conformes },
    { etapa: "Com IDs de mídia informados", v: dados.filter((l) => l.idsMidia.trim()).length },
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
    porTurno,
    porFuncao,
    porPosto,
    naoAuditouLista,
    abaixoLista,
    partesLista,
    semIdsLista,
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

  const titulo =
    p.nivelGeral === "conforme"
      ? `Auditoria em ${PCT.format(p.pct)}% da meta — dentro do previsto.`
      : p.nivelGeral === "atencao"
        ? `Auditoria em ${PCT.format(p.pct)}% da meta — abaixo do ritmo necessário.`
        : `Auditoria em ${PCT.format(p.pct)}% da meta — bem abaixo do previsto.`;

  return { titulo, detalhe: p.falta > 0 ? ritmo : "Meta do período já cumprida.", nivel: p.nivelGeral };
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
      l.idsMidia.replace(/\s+/g, " "),
      l.numeroParte,
      l.justificativa,
    ]
      .map(escapar)
      .join(";")
  );
  return `\ufeff${[cab.map(escapar).join(";"), ...corpo].join("\r\n")}`;
}

export type Excecao = Painel["naoAuditouLista"][number];

export const ORDEM = ORDEM_SUBUNIDADES;
