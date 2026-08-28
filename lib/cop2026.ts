/**
 * Auditoria de COP 2026 — 16º BPM/M
 *
 * Painel da auditoria de câmera operacional corporal (Diretriz PM3-001/02/25).
 * A fonte é o Google Forms "Auditoria COP Motorola - 16 BPM/M" e a planilha de
 * respostas da conta institucional operacional16bpmm@gmail.com, que tem duas
 * abas: as respostas cruas e "Parametros", onde o Batalhão fixa o efetivo apto
 * por subunidade e a meta do período.
 *
 * Leitura AO VIVO por /gviz/tq?tqx=out:csv, mesmo mecanismo já validado no
 * Inventário 2026 (lib/inventario-2026.ts) e pela mesma razão: a planilha
 * recebe resposta o dia inteiro e o Comando precisa do número de agora. Não há
 * ingestão no Supabase nem script manual no caminho.
 *
 * Existe uma tabela cop_auditoria_respostas (migration 008) de um desenho
 * anterior, por importação de CSV. Ela deixou de ser usada aqui: dependia de
 * alguém exportar e rodar script, e a tela mostraria sempre a última carga, não
 * o dado corrente.
 */

import { parseCsv } from "@/lib/inventario-2026";

export const PLANILHA_ID = "11tdaTRSSf-K-y13rIg3hmHCGmyOeWFhkBfRbCqKF1Bg";
export const URL_FORMULARIO = "https://forms.gle/kqiRxSbCHqYKRkf2A";
export const URL_PLANILHA = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;

/** Documento publicado na web em 26/08/2026 (Arquivo > Compartilhar > Publicar
 *  na Web). É esta publicação que mantém as duas abas legíveis em CSV depois
 *  que o compartilhamento por link do documento foi restringido. */
const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
/** gids da publicação — não são os mesmos gids da edição. */
const GID_RESPOSTAS = "305359783";
const GID_PARAMETROS = "1587286327";

/**
 * Duas rotas de leitura, nesta ordem: a aba publicada na web (`/pub`) e o
 * `gviz`. O gviz só responde enquanto o documento estiver compartilhado por
 * link; quando o Batalhão restringe o acesso — como aconteceu em 26/08/2026 —
 * ele passa a devolver a tela de login e o painel fica sem dado. A publicação
 * na web continua servindo as duas abas em CSV sem abrir o documento.
 */
function urlsDaAba(gid: string, nomeAba: string) {
  return [
    `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${gid}&single=true&output=csv`,
    `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nomeAba)}`,
  ];
}

/** Aba de respostas do Forms. Sem `sheet=`, o gviz devolve a primeira aba. */
const URL_RESPOSTAS = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv`;
/** Aba de metas. Casada pelo NOME e não pelo gid: o gid muda se a aba for
 *  recriada, o nome é o que o usuário controla. */
const URL_PARAMETROS = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv&sheet=Parametros`;

// ---------------------------------------------------------------------------
// Subunidades
// ---------------------------------------------------------------------------

/**
 * As duas abas escrevem a subunidade de jeitos diferentes ("16 BPM/M / EM" nas
 * respostas, "16BPMM / EM" nos parâmetros), então nada é casado por texto: tudo
 * passa por uma chave canônica. O 16º BPM/M não tem 5ª Cia — são EM, 1ª a 4ª
 * Cia e Força Tática.
 */
export const ORDEM_SUBUNIDADES = ["em", "1cia", "2cia", "3cia", "4cia", "ft"] as const;

export const ROTULO_SUBUNIDADE: Record<string, string> = {
  em: "Estado-Maior",
  "1cia": "1ª Cia",
  "2cia": "2ª Cia",
  "3cia": "3ª Cia",
  "4cia": "4ª Cia",
  ft: "Força Tática",
  outros: "Não informada",
};

/**
 * Matriz Operacional Proporcional do 16º BPM/M — Meta Total: 960 Evidências.
 * Rateio por efetivo real com COP (universo de 570 policiais):
 * - EM: 98 PMs (17,19% bruto) fixado em 5,00% (administrativo) = 48 evidências.
 * - 1ª Cia: 102 PMs (17,89% + rateio) = 20,32% = 195 evidências.
 * - 2ª Cia: 93 PMs (16,31% + rateio) = 18,74% = 180 evidências.
 * - 3ª Cia: 111 PMs (19,47% + rateio) = 21,90% = 210 evidências.
 * - 4ª Cia: 93 PMs (16,31% + rateio) = 18,74% = 180 evidências.
 * - FT: 73 PMs (12,80% + rateio) = 15,23% = 147 evidências.
 * Soma: 48 + 195 + 180 + 210 + 180 + 147 = 960 evidências (100,00%).
 */
export const MATRIZ_PROPORCIONAL_2026: Record<
  string,
  {
    efetivo: number;
    pctEfetivo: number;
    pctMeta: number;
    meta: number;
    ritmoProporcional: number;
    metaSemanalMedia: number;
    metasSemanais: [number, number, number, number];
    rotulo: string;
  }
> = {
  em: {
    efetivo: 98,
    pctEfetivo: 17.19,
    pctMeta: 5.0,
    meta: 48,
    ritmoProporcional: 4,
    metaSemanalMedia: 12,
    metasSemanais: [12, 12, 12, 12],
    rotulo: "Estado-Maior",
  },
  "1cia": {
    efetivo: 102,
    pctEfetivo: 17.89,
    pctMeta: 20.32,
    meta: 195,
    ritmoProporcional: 15,
    metaSemanalMedia: 48.75,
    metasSemanais: [49, 49, 49, 48],
    rotulo: "1ª Cia",
  },
  "2cia": {
    efetivo: 93,
    pctEfetivo: 16.31,
    pctMeta: 18.74,
    meta: 180,
    ritmoProporcional: 14,
    metaSemanalMedia: 45,
    metasSemanais: [45, 45, 45, 45],
    rotulo: "2ª Cia",
  },
  "3cia": {
    efetivo: 111,
    pctEfetivo: 19.47,
    pctMeta: 21.9,
    meta: 210,
    ritmoProporcional: 16,
    metaSemanalMedia: 52.5,
    metasSemanais: [53, 52, 53, 52],
    rotulo: "3ª Cia",
  },
  "4cia": {
    efetivo: 93,
    pctEfetivo: 16.31,
    pctMeta: 18.74,
    meta: 180,
    ritmoProporcional: 14,
    metaSemanalMedia: 45,
    metasSemanais: [45, 45, 45, 45],
    rotulo: "4ª Cia",
  },
  ft: {
    efetivo: 73,
    pctEfetivo: 12.8,
    pctMeta: 15.23,
    meta: 147,
    ritmoProporcional: 11,
    metaSemanalMedia: 36.75,
    metasSemanais: [37, 37, 37, 36],
    rotulo: "Força Tática",
  },
};

export const META_TOTAL_BATALHAO = 960;
export const META_SEMANAL_BATALHAO = 240;
export const EFETIVO_TOTAL_BATALHAO = 570;
export const RITMO_GLOBAL_RESTANTE = 73;
export const TURNOS_RESTANTES_GLOBAL = 12;

export const METAS_PADRAO_2026: MetaSubunidade[] = [
  { subunidade: "em", efetivo: 98, evidenciasPorTurno: 2, turnos: 12, dias: 24, meta: 48 },
  { subunidade: "1cia", efetivo: 102, evidenciasPorTurno: 3, turnos: 15, dias: 30, meta: 195 },
  { subunidade: "2cia", efetivo: 93, evidenciasPorTurno: 3, turnos: 15, dias: 30, meta: 180 },
  { subunidade: "3cia", efetivo: 111, evidenciasPorTurno: 3, turnos: 15, dias: 30, meta: 210 },
  { subunidade: "4cia", efetivo: 93, evidenciasPorTurno: 3, turnos: 15, dias: 30, meta: 180 },
  { subunidade: "ft", efetivo: 73, evidenciasPorTurno: 3, turnos: 15, dias: 30, meta: 147 },
];

export function normalizar(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function chaveSubunidade(bruto: string | undefined): string {
  const cauda = (bruto ?? "").split("/").pop() ?? "";
  const n = normalizar(cauda);
  if (!n) return "outros";
  if (n.startsWith("em")) return "em";
  const cia = n.match(/^(\d)/);
  if (cia) return `${cia[1]}cia`;
  if (n.includes("forca") || n.includes("tatica") || n === "ft") return "ft";
  return "outros";
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type LancamentoCop = {
  /** Índice de origem na planilha, só para key estável na tabela. */
  id: number;
  /** ISO yyyy-mm-dd da data da auditoria; string vazia se ilegível. */
  data: string;
  /** Hora da auditoria, quando o campo de data traz data e hora juntas. */
  hora: string;
  /** IDs das mídias/gravações auditadas, um por linha, como vieram do Forms. */
  idsMidia: string;
  /** Turno de serviço declarado. A diretriz fixa o mínimo POR TURNO, então sem
   *  ele dois lançamentos do mesmo dia são indistinguíveis de duplicata. */
  turno: string;
  /** Carimbo de envio, formatado dd/mm/aaaa hh:mm. */
  enviadoEm: string;
  re: string;
  nomeGuerra: string;
  posto: string;
  funcao: string;
  subunidade: string;
  auditou: boolean;
  /** Quantidade auditada. A lista do Forms para em "5 ou mais"; quando o
   *  auditor informa o número exato no campo ao lado, é ele que vale. */
  videos: number;
  numeroParte: string;
  justificativa: string;
  /** Só existe no caminho "5 ou mais"; 0 quando não informado. */
  videosExatos: number;
};

export type MetaSubunidade = {
  subunidade: string;
  /** Base da meta: auditores designados na fração (antes era o efetivo apto do
   *  Batalhão inteiro, que incluía quem sequer pode responder o formulário). */
  efetivo: number;
  evidenciasPorTurno: number;
  /** Turnos de serviço de cada auditor no período — em 12x36, ~15 no mês. */
  turnos: number;
  /** Dias corridos do período. Só serve para ratear a meta quando o Comando
   *  filtra um pedaço do mês; a meta em si não depende dele. */
  dias: number;
  meta: number;
};

export type LeituraCop2026 = {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  /** Mensagem de falha da leitura, quando a planilha não respondeu como CSV. */
  erro?: string;
  lidoEm: string;
};

// ---------------------------------------------------------------------------
// Conversões de campo
// ---------------------------------------------------------------------------

/** dd/mm/aaaa (ou aaaa-mm-dd) para ISO. A planilha guarda no formato BR. */
function dataIso(valor: string): string {
  const s = (valor ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return "";
}

function carimbo(valor: string): string {
  const s = (valor ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]} ${m[4].padStart(2, "0")}:${m[5]}`;
}

/** "5+" e "4" vêm do mesmo campo do Forms; o "+" é do rótulo da opção. */
function inteiro(valor: string): number {
  const s = (valor ?? "").trim().replace("+", "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function ehSim(valor: string): boolean {
  return normalizar(valor ?? "").startsWith("sim");
}

/**
 * Casa o cabeçalho da planilha com o campo interno por trecho normalizado. O
 * Forms reescreve pontuação e acento do enunciado quando a pergunta é editada,
 * então comparar o texto inteiro seria frágil.
 */
const PADROES_COLUNA: Array<[RegExp, keyof LancamentoCop]> = [
  [/^carimbo/, "enviadoEm"],
  [/^datada?auditoria/, "data"],
  [/^informeore|^re$/, "re"],
  [/nomedeguerra/, "nomeGuerra"],
  [/postogradua/, "posto"],
  [/suafuncao|^funcao/, "funcao"],
  [/unidadesubunidade|^subunidade/, "subunidade"],
  [/turno/, "turno"],
  [/auditouvideonestadata/, "auditou"],
  [/quantosvideos/, "videos"],
  [/quantidadeexata/, "videosExatos"],
  [/dapartec|numerodaparte|nodaparte/, "numeroParte"],
  [/^justifique|^justificativa/, "justificativa"],
];

/** Índices de TODAS as colunas de ID de mídia/gravação (o Forms tem seis: três
 *  obrigatórias e três de reserva), na ordem em que aparecem na planilha. */
function colunasDeId(cabecalho: string[]): number[] {
  return cabecalho
    .map((titulo, i) => [normalizar(titulo), i] as const)
    .filter(([n]) => /id.{0,3}(damidia|demidia|midia|gravacao)/.test(n))
    .map(([, i]) => i);
}

function mapearColunas(cabecalho: string[]): Map<number, keyof LancamentoCop> {
  const mapa = new Map<number, keyof LancamentoCop>();
  cabecalho.forEach((titulo, i) => {
    const n = normalizar(titulo);
    if (!n) return;
    // A pergunta condicional "Voce respondeu SIM e auditou apenas 1 video.
    // Confirma?" também casa com /auditouvideo/, mas não é o campo SIM/NÃO —
    // é a confirmação, e fica de fora de propósito.
    if (n.includes("confirma")) return;
    const achado = PADROES_COLUNA.find(([re]) => re.test(n));
    if (achado && ![...mapa.values()].includes(achado[1])) mapa.set(i, achado[1]);
  });
  return mapa;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

async function lerCsv(url: string): Promise<string[][]> {
  const resposta = await fetch(url, {
    // Um minuto: a tropa preenche o formulário e confere na página logo em
    // seguida, então a espera precisa ser curta.
    next: { revalidate: 60 },
  });
  if (!resposta.ok) throw new Error(`A planilha respondeu ${resposta.status}.`);
  const texto = await resposta.text();
  // Sem permissão de leitura o Google devolve 200 com a tela de login em HTML.
  if (texto.trimStart().startsWith("<")) {
    throw new Error("A planilha exigiu autenticação em vez de devolver os dados.");
  }
  return parseCsv(texto);
}

/** Tenta as rotas em ordem e devolve a primeira que vier como CSV de verdade. */
async function lerPrimeiroQueResponder(urls: string[]): Promise<string[][]> {
  let ultimo: unknown;
  for (const url of urls) {
    try {
      return await lerCsv(url);
    } catch (erro) {
      ultimo = erro;
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("A planilha não respondeu.");
}

function extrairLancamentos(linhas: string[][]): LancamentoCop[] {
  if (linhas.length < 2) return [];
  const mapa = mapearColunas(linhas[0]);
  const idxIds = colunasDeId(linhas[0]);
  const lancamentos: LancamentoCop[] = [];

  linhas.slice(1).forEach((linha, i) => {
    if (linha.every((c) => (c ?? "").trim() === "")) return;
    const bruto: Record<string, string> = {};
    mapa.forEach((campo, idx) => {
      bruto[campo] = (linha[idx] ?? "").trim();
    });
    const data = dataIso(bruto.data ?? "");
    // Sem data de auditoria a linha não entra em nenhum recorte temporal;
    // ainda assim é preservada com data vazia para não sumir da tabela.
    lancamentos.push({
      id: i,
      data,
      // O Forms passou a mandar "dd/mm/aaaa hh:mm" desde que o campo de data
      // ganhou horário; a hora da auditoria não é a do envio (essa é o carimbo).
      hora: (bruto.data ?? "").match(/(\d{1,2}):(\d{2})/)?.[0] ?? "",
      idsMidia: idxIds
        .map((i) => (linha[i] ?? "").trim())
        .filter(Boolean)
        .join("\n"),
      turno: bruto.turno ?? "",
      enviadoEm: carimbo(bruto.enviadoEm ?? ""),
      re: bruto.re ?? "",
      nomeGuerra: bruto.nomeGuerra ?? "",
      posto: bruto.posto ?? "",
      funcao: bruto.funcao ?? "",
      subunidade: chaveSubunidade(bruto.subunidade),
      auditou: ehSim(bruto.auditou ?? ""),
      videos: ehSim(bruto.auditou ?? "")
        ? Math.max(inteiro(bruto.videos ?? ""), inteiro(bruto.videosExatos ?? ""))
        : 0,
      videosExatos: inteiro(bruto.videosExatos ?? ""),
      numeroParte: bruto.numeroParte ?? "",
      justificativa: bruto.justificativa ?? "",
    });
  });

  return lancamentos;
}

/**
 * Casa as colunas da aba Parametros pelo cabeçalho, não pela posição: a aba é
 * editada pelo Batalhão e já mudou de desenho uma vez (de "Efetivo Apto" para
 * "Auditores designados", de "Dias" para "Turnos"). Aceita os dois nomes.
 */
function mapearParametros(cabecalho: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  cabecalho.forEach((titulo, i) => {
    const n = normalizar(titulo);
    if (!n) return;
    if (idx.base === undefined && /auditor/.test(n)) idx.base = i;
    if (/efetivo/.test(n)) idx.efetivo = i;
    if (/evidencia/.test(n)) idx.evidencias = i;
    if (/turnonoperiodo|^turnos/.test(n)) idx.turnos = i;
    if (/dia/.test(n)) idx.dias = i;
    if (/meta/.test(n)) idx.meta = i;
  });
  if (idx.base === undefined) idx.base = idx.efetivo ?? 1;
  return idx;
}

function extrairMetas(linhas: string[][]): MetaSubunidade[] {
  if (linhas.length < 2) return [];
  const idx = mapearParametros(linhas[0]);
  const val = (l: string[], i: number | undefined) =>
    i === undefined ? 0 : inteiro(l[i] ?? "");

  return linhas
    .slice(1)
    .map((l) => {
      const efetivo = val(l, idx.base);
      const evidenciasPorTurno = val(l, idx.evidencias) || 2;
      // Sem coluna de turnos, cai no antigo "dias no periodo" — é o que a aba
      // trazia até 25/08/2026 e mantém a página lendo planilha velha sem quebrar.
      const turnos = val(l, idx.turnos) || val(l, idx.dias);
      const dias = val(l, idx.dias) || turnos * 2;
      // A coluna "Meta calculada" é fórmula na planilha e continua sendo a
      // fonte; o produto só entra se ela vier vazia, para a fração não sumir.
      const meta = val(l, idx.meta) || efetivo * evidenciasPorTurno * turnos;
      return {
        subunidade: chaveSubunidade(l[0]),
        efetivo,
        evidenciasPorTurno,
        turnos,
        dias,
        meta,
      };
    })
    // A última linha da aba é o TOTAL, que não é subunidade e viraria "outros";
    // o total é recalculado a partir das linhas reais.
    .filter((m) => m.subunidade !== "outros" && m.meta > 0)
    .sort(
      (a, b) =>
        ORDEM_SUBUNIDADES.indexOf(a.subunidade as (typeof ORDEM_SUBUNIDADES)[number]) -
        ORDEM_SUBUNIDADES.indexOf(b.subunidade as (typeof ORDEM_SUBUNIDADES)[number])
    );
}

export async function lerAuditoriaCop2026(): Promise<LeituraCop2026> {
  const lidoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
  try {
    const [respostas, parametros] = await Promise.all([
      lerPrimeiroQueResponder(urlsDaAba(GID_RESPOSTAS, "Respostas ao formulário 1")),
      lerPrimeiroQueResponder(urlsDaAba(GID_PARAMETROS, "Parametros")),
    ]);
    const metasLidas = extrairMetas(parametros);
    return {
      lancamentos: extrairLancamentos(respostas),
      metas: metasLidas.length > 0 ? metasLidas : METAS_PADRAO_2026,
      lidoEm,
    };
  } catch (erro) {
    return {
      lancamentos: [],
      metas: METAS_PADRAO_2026,
      erro: erro instanceof Error ? erro.message : "Não foi possível alcançar a planilha.",
      lidoEm,
    };
  }
}
