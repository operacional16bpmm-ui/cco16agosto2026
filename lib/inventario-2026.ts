/**
 * Inventário 2026 — 16º BPM/M
 *
 * Central de planilhas do levantamento patrimonial. Cada unidade (companhias,
 * Força Tática) e cada seção do Estado-Maior mantém a SUA planilha no Google
 * Sheets, todas no mesmo modelo "PLANILHA ÚNICA DE CONTROLE DE MATERIAL"
 * (aba única, 17 colunas). Esta página lê as planilhas AO VIVO e consolida.
 *
 * Por que ler CSV do Google e não ingerir no Supabase: decisão do usuário em
 * 03/08/2026. O levantamento está em andamento e as unidades editam a planilha
 * o dia todo; o Comando precisa ver o número de agora, não o da última carga.
 * A fonte de verdade continua sendo a planilha — esta página é leitura.
 *
 * Endpoint usado: /gviz/tq?tqx=out:csv. Funciona sem "Publicar na web" porque
 * as planilhas estão compartilhadas por link (verificado em 03/08/2026: as 14
 * respondem 200). Se alguma voltar a ficar restrita, o endpoint responde 401
 * com HTML de login — daí a checagem de content-type/HTML em lerFonte(), que
 * transforma isso em fonte "sem acesso" no cartão em vez de linhas fantasma.
 */

/** Ícone do cartão. Mapeado para o componente lucide no lado do cliente. */
export type IconeFonte =
  | "estado-maior"
  | "companhia"
  | "forca-tatica"
  | "pessoal"
  | "inteligencia"
  | "operacoes"
  | "logistica"
  | "comunicacao"
  | "justica"
  | "frota"
  | "armamento"
  | "ordenanca"
  | "auditoria";

export type GrupoFonte = "Companhias e Força Tática" | "Seções do Estado-Maior" | "Outros controles";

export type FonteInventario = {
  /** Slug estável — usado na URL da própria página (?fonte=) e como key. */
  chave: string;
  /** Título do cartão, exatamente como o Batalhão chama a planilha. */
  titulo: string;
  /** Responsável pelo preenchimento, exibido no rodapé do cartão. */
  responsavel: string;
  grupo: GrupoFonte;
  icone: IconeFonte;
  id: string;
  gid: string;
  /**
   * Fonte que NÃO é do levantamento patrimonial: entra na central como link
   * e visor, mas fica fora dos números consolidados (colunas diferentes).
   */
  foraDoInventario?: boolean;
  /** Observação fixa do cartão, quando há algo que o dado não conta sozinho. */
  nota?: string;
};

export const FONTES_INVENTARIO: FonteInventario[] = [
  // Companhias e Força Tática — planilhas criadas em 22/07/2026
  {
    chave: "1-cia",
    titulo: "1ª Companhia",
    responsavel: "Cmt da 1ª Cia",
    grupo: "Companhias e Força Tática",
    icone: "companhia",
    id: "1Mr-PNdDajnfluklDP9l35sncueEr-y0fIGNtMJrL1c4",
    gid: "1193287425",
  },
  {
    chave: "2-cia",
    titulo: "2ª Companhia",
    responsavel: "Cmt da 2ª Cia",
    grupo: "Companhias e Força Tática",
    icone: "companhia",
    id: "1jj2d_SZY18e-YX5OJGXjQsAQ15lc24BMTeVzGaMJ54Q",
    gid: "1193287425",
  },
  {
    chave: "3-cia",
    titulo: "3ª Companhia",
    responsavel: "Cmt da 3ª Cia",
    grupo: "Companhias e Força Tática",
    icone: "companhia",
    id: "1BEmgetgXxaOxPjPnJvj3CFQ29829duEUh_HxbovFLx4",
    gid: "1193287425",
  },
  {
    chave: "4-cia",
    titulo: "4ª Companhia",
    responsavel: "Cmt da 4ª Cia",
    grupo: "Companhias e Força Tática",
    icone: "companhia",
    id: "1_bibxEfqsAfzUFsQrwhAILQRN6y7LRAbZ1EDfCmsM-c",
    gid: "1193287425",
  },
  {
    chave: "forca-tatica",
    titulo: "Força Tática",
    responsavel: "Cmt da Força Tática",
    grupo: "Companhias e Força Tática",
    icone: "forca-tatica",
    id: "1iaTwSbVddUyL7_2B42IjviX5ExwNNs70BWUF6Au0blc",
    gid: "1193287425",
  },

  // Seções do Estado-Maior — P-1 em 20/07, demais em 03/08/2026
  {
    chave: "p1",
    titulo: "P-1 · Pessoal",
    responsavel: "Chefe da P/1",
    grupo: "Seções do Estado-Maior",
    icone: "pessoal",
    id: "10Hu3swD2Q8oCbFNFP-675NDAabeMKt-e0Yo9EvSDyvQ",
    gid: "1193287425",
  },
  {
    chave: "p2",
    titulo: "P-2 · Inteligência",
    responsavel: "Chefe da P/2",
    grupo: "Seções do Estado-Maior",
    icone: "inteligencia",
    id: "1h8LLISC3elfzQqxBA9XxhVRbUiwyFmbi6tNF6LGYTBE",
    gid: "0",
  },
  {
    chave: "p3",
    titulo: "P-3 · Operações",
    responsavel: "Chefe da P/3",
    grupo: "Seções do Estado-Maior",
    icone: "operacoes",
    id: "1iQ5l8Wu7ToJ1N9LylEY5zuz77Se6Wkp_wzysRSJG3p0",
    gid: "0",
  },
  {
    chave: "p4",
    titulo: "P-4 · Logística",
    responsavel: "Chefe da P/4",
    grupo: "Seções do Estado-Maior",
    icone: "logistica",
    id: "1SBBgRld6ZYqFU0ufwpljJMUCqZArpXOzjP2U8K83sD0",
    gid: "0",
  },
  {
    chave: "p5",
    titulo: "P-5 · Comunicação Social",
    responsavel: "Chefe da P/5",
    grupo: "Seções do Estado-Maior",
    icone: "comunicacao",
    id: "1eeXaUsZS7R2nwScUyvih0T5gPVvu1DVN1TyyJ-6TaI4",
    gid: "0",
  },
  {
    chave: "spjmd",
    titulo: "SPJMD",
    responsavel: "Encarregado do SPJMD",
    grupo: "Seções do Estado-Maior",
    icone: "justica",
    id: "1w-pjnAXcqdHimcR1c0n0WOcSNifcfPquvS1hAvwbp8Y",
    gid: "0",
  },
  {
    chave: "motomec",
    titulo: "MOTOMEC",
    responsavel: "Encarregado da MOTOMEC",
    grupo: "Seções do Estado-Maior",
    icone: "frota",
    id: "1NyUzOzDsYibXriB7WmIL5pefsP7BdK6nqpuUL_4xMvI",
    gid: "0",
  },
  {
    chave: "reserva-armas",
    titulo: "Reserva de Armas",
    responsavel: "Encarregado da Reserva",
    grupo: "Seções do Estado-Maior",
    icone: "armamento",
    id: "1sO_uOlIPPyqkGsFNCHSwrqbePVMzC04Yrvxz6jqBMbg",
    gid: "0",
  },
  {
    chave: "ordenanca",
    titulo: "Ordenança",
    responsavel: "Encarregado da Ordenança",
    grupo: "Seções do Estado-Maior",
    icone: "ordenanca",
    id: "1JVqrBSty4QoW8uepAOsl6RkMl15nsYYXpclEPWPRreA",
    gid: "0",
  },

  // Outros controles — mesma central, natureza diferente
  {
    chave: "auditoria-cop",
    titulo: "Auditoria de COP",
    responsavel: "Respostas do formulário",
    grupo: "Outros controles",
    icone: "auditoria",
    id: "11tdaTRSSf-K-y13rIg3hmHCGmyOeWFhkBfRbCqKF1Bg",
    gid: "305359783",
    foraDoInventario: true,
    nota: "Respostas do formulário de auditoria de câmera operacional portátil. Colunas próprias, fora do consolidado patrimonial.",
  },
  {
    chave: "fonte-restrita",
    titulo: "Planilha restrita",
    responsavel: "A identificar",
    grupo: "Outros controles",
    icone: "auditoria",
    id: "1QkWwphBcjvMRtn2RA_BtJQ8tw-7w2G1pjbgaGD5gE6k",
    gid: "441427834",
    foraDoInventario: true,
    nota: "Compartilhamento restrito: a leitura ao vivo responde sem autorização. Liberar o acesso por link para entrar no consolidado.",
  },
];

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Modelo da planilha. As unidades receberam o modelo de MATERIAL (Descrição /
 * Nº Patrimônio / Qtd). SPJMD, MOTOMEC, Reserva de Armas e Ordenança foram
 * criadas a partir do modelo de VIATURAS (Prefixo / Placa / Marca), que só faz
 * sentido para a MOTOMEC — as outras três precisam trocar o cabeçalho antes de
 * começar a lançar. A página detecta isso e avisa em vez de contar errado.
 */
export type ModeloPlanilha = "material" | "viaturas" | "desconhecido";

export type ItemInventario = {
  fonte: string;
  fonteTitulo: string;
  item: string;
  descricao: string;
  patrimonio: string;
  qtd: string;
  /** Só no modelo de viaturas. */
  prefixo: string;
  placa: string;
  marca: string;
  estaNoLcm: string;
  codigoLcm: string;
  localLcm: string;
  existeFisicamente: string;
  localFisico: string;
  comparativo: string;
  providencia: string;
  detalhe: string;
  fase: string;
  situacao: string;
  cofim: string;
  cofimNumero: string;
  observacoes: string;
};

export type LeituraFonte = {
  fonte: FonteInventario;
  /** false quando a planilha respondeu 401/HTML, ou o modelo não bateu. */
  ok: boolean;
  erro?: string;
  modelo: ModeloPlanilha;
  itens: ItemInventario[];
};

/**
 * Minúsculas, sem acento, sem quebra de linha, espaços colapsados.
 *
 * Os indicadores ordinais viram letra ("Nº" → "no", "1ª" → "1a"): sem isso o
 * cabeçalho "Nº Patrimônio / Série" nunca casava com nada, porque "º" é
 * U+00BA e não um acento removido pelo NFD — a coluna de patrimônio ficava
 * silenciosamente vazia em todas as planilhas.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/º/g, "o")
    .replace(/ª/g, "a")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parser CSV (RFC 4180): campos entre aspas podem conter vírgula, aspas
 * escapadas ("") e quebra de linha — e contêm, porque os cabeçalhos do modelo
 * são multilinha ("Está no LCM?\n(Sim/Não)"). Split por vírgula quebraria a
 * planilha inteira, então o parser é caractere a caractere de propósito.
 */
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      // \r\n conta como uma quebra só.
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }

  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/**
 * Trecho procurado DENTRO do cabeçalho (normalizado) → campo do item.
 *
 * Duas razões para casar por conteúdo e não por posição nem por prefixo:
 *
 * 1. O endpoint gviz funde as linhas de título mescladas do modelo dentro da
 *    linha de cabeçalho. A primeira coluna chega como "PLANILHA ÚNICA DE
 *    CONTROLE DE MATERIAL ... IDENTIFICAÇÃO DO BEM Item", e a quinta como
 *    "1. LCM (CONTÁBIL) Está no LCM? (Sim/Não)". Prefixo não casa nada.
 * 2. A planilha da 4ª Cia não tem a coluna "Providência" que as outras têm,
 *    então índice fixo jogaria "Detalhe da providência" dentro de
 *    "Providência" e contaminaria o quadro de divergências.
 *
 * A ORDEM é significativa, do mais específico para o mais genérico: "detalhe
 * da providencia" antes de "providencia"; "fase da administracao" antes de
 * "situacao atual" (o cabeçalho "4. SITUAÇÃO ATUAL Fase da administração"
 * contém os dois); e "item" por último, porque é a palavra que sobra na
 * primeira coluna depois de todo o título mesclado.
 */
const COLUNAS: [string, keyof ItemInventario][] = [
  ["descricao do material", "descricao"],
  ["no patrimonio", "patrimonio"],
  ["prefixo", "prefixo"],
  ["placa", "placa"],
  ["marca / modelo", "marca"],
  ["esta no lcm", "estaNoLcm"],
  ["codigo lcm", "codigoLcm"],
  ["local no lcm", "localLcm"],
  ["existe fisicamente", "existeFisicamente"],
  ["onde esta", "localFisico"],
  ["local (lcm", "comparativo"],
  ["detalhe da providencia", "detalhe"],
  ["providencia", "providencia"],
  ["fase da administracao", "fase"],
  ["situacao atual", "situacao"],
  ["no / data do cofim", "cofimNumero"],
  ["cofim necessario", "cofim"],
  ["observacoes", "observacoes"],
  ["qtd", "qtd"],
  ["item", "item"],
];

function itemVazio(fonte: FonteInventario): ItemInventario {
  return {
    fonte: fonte.chave,
    fonteTitulo: fonte.titulo,
    item: "",
    descricao: "",
    patrimonio: "",
    qtd: "",
    prefixo: "",
    placa: "",
    marca: "",
    estaNoLcm: "",
    codigoLcm: "",
    localLcm: "",
    existeFisicamente: "",
    localFisico: "",
    comparativo: "",
    providencia: "",
    detalhe: "",
    fase: "",
    situacao: "",
    cofim: "",
    cofimNumero: "",
    observacoes: "",
  };
}

/** Casa uma linha de cabeçalho com COLUNAS, respeitando a ordem da lista. */
function mapearCabecalho(linha: string[]): Map<number, keyof ItemInventario> {
  const cabecalho = linha.map(normalizar);
  const mapa = new Map<number, keyof ItemInventario>();
  const usados = new Set<keyof ItemInventario>();
  for (const [trecho, campo] of COLUNAS) {
    if (usados.has(campo)) continue;
    const i = cabecalho.findIndex((c, idx) => !mapa.has(idx) && c.includes(trecho));
    if (i === -1) continue;
    mapa.set(i, campo);
    usados.add(campo);
  }
  return mapa;
}

/** Converte o CSV bruto em itens, achando o cabeçalho pelo nome das colunas. */
export function extrairItens(
  csv: string,
  fonte: FonteInventario
): { itens: ItemInventario[]; modelo: ModeloPlanilha } {
  const linhas = parseCsv(csv);

  // O cabeçalho costuma ser a linha 0 (o gviz absorve as linhas de título),
  // mas se alguma unidade inserir linhas acima ele desce. Em vez de fixar o
  // índice, pontua as primeiras linhas e fica com a que casa mais colunas.
  let iCabecalho = -1;
  let mapa = new Map<number, keyof ItemInventario>();
  for (let i = 0; i < Math.min(6, linhas.length); i++) {
    const candidato = mapearCabecalho(linhas[i]);
    if (candidato.size > mapa.size) {
      mapa = candidato;
      iCabecalho = i;
    }
  }
  // Menos de 8 colunas reconhecidas não é o modelo do Batalhão: é outra
  // planilha qualquer, e contar linhas dela seria inventar número.
  if (iCabecalho === -1 || mapa.size < 8) return { itens: [], modelo: "desconhecido" };

  const campos = new Set(mapa.values());
  const modelo: ModeloPlanilha = campos.has("prefixo") || campos.has("placa")
    ? "viaturas"
    : "material";

  const itens: ItemInventario[] = [];
  for (const linha of linhas.slice(iCabecalho + 1)) {
    const item = itemVazio(fonte);
    for (const [i, campo] of mapa) {
      if (campo === "fonte" || campo === "fonteTitulo") continue;
      item[campo] = (linha[i] ?? "").replace(/\s+/g, " ").trim();
    }
    // No modelo de viaturas o bem é identificado por prefixo/placa/modelo.
    // Espelha nos campos de descrição e patrimônio para que os quadros
    // consolidados mostrem as duas origens na mesma tabela.
    if (!item.descricao) item.descricao = [item.marca, item.prefixo].filter(Boolean).join(" · ");
    if (!item.patrimonio) item.patrimonio = item.placa || item.prefixo;

    // Linha só existe se identifica um bem. O modelo vem com centenas de
    // linhas em branco pré-formatadas, e a primeira linha é o exemplo que
    // toda planilha nova ainda carrega e não pode entrar na contagem.
    if (!item.descricao && !item.patrimonio) continue;
    if (normalizar(item.observacoes).includes("exemplo")) continue;
    itens.push(item);
  }
  return { itens, modelo };
}

function urlCsv(fonte: FonteInventario): string {
  return `https://docs.google.com/spreadsheets/d/${fonte.id}/gviz/tq?tqx=out:csv&gid=${fonte.gid}`;
}

/** Visor embutido: read-only, respeita o compartilhamento da planilha. */
export function urlVisor(fonte: FonteInventario): string {
  return `https://docs.google.com/spreadsheets/d/${fonte.id}/preview?gid=${fonte.gid}`;
}

/** Link para abrir e EDITAR no Google Sheets — é lá que a unidade preenche. */
export function urlPlanilha(fonte: FonteInventario): string {
  return `https://docs.google.com/spreadsheets/d/${fonte.id}/edit?gid=${fonte.gid}`;
}

export async function lerFonte(fonte: FonteInventario): Promise<LeituraFonte> {
  if (fonte.foraDoInventario) {
    return { fonte, ok: true, modelo: "desconhecido", itens: [] };
  }
  try {
    const resposta = await fetch(urlCsv(fonte), {
      // Cinco minutos: curto o bastante para o Comando ver o preenchimento
      // andando durante a reunião, longo o bastante para não bater 14 vezes
      // no Google a cada F5.
      next: { revalidate: 300 },
    });
    if (!resposta.ok) {
      return {
        fonte,
        ok: false,
        erro: `A planilha respondeu ${resposta.status}. Provável compartilhamento restrito.`,
        modelo: "desconhecido",
        itens: [],
      };
    }
    const texto = await resposta.text();
    // Sem acesso, o Google devolve 200 com a tela de login em HTML.
    if (texto.trimStart().startsWith("<")) {
      return {
        fonte,
        ok: false,
        erro: "A planilha exigiu autenticação em vez de devolver os dados.",
        modelo: "desconhecido",
        itens: [],
      };
    }
    const { itens, modelo } = extrairItens(texto, fonte);
    if (modelo === "desconhecido") {
      return {
        fonte,
        ok: false,
        erro: "O conteúdo não bate com o modelo de controle de material do Batalhão.",
        modelo,
        itens: [],
      };
    }
    return { fonte, ok: true, modelo, itens };
  } catch {
    return {
      fonte,
      ok: false,
      erro: "Não foi possível alcançar a planilha.",
      modelo: "desconhecido",
      itens: [],
    };
  }
}

export async function lerTodasAsFontes(): Promise<LeituraFonte[]> {
  return Promise.all(FONTES_INVENTARIO.map(lerFonte));
}

// ---------------------------------------------------------------------------
// Consolidação
// ---------------------------------------------------------------------------

export type ResumoFonte = {
  chave: string;
  total: number;
  confere: number;
  divergente: number;
  /**
   * Item já relacionado, mas sem o comparativo LCM × físico preenchido. É a
   * medida real do que falta fazer: a 1ª e a 4ª Cia importaram a carga inteira
   * do LCM de uma vez, então o total alto sozinho passaria a impressão errada
   * de levantamento adiantado.
   */
  semConferencia: number;
  naoLocalizado: number;
  descarga: number;
  cofim: number;
};

export function classificar(item: ItemInventario) {
  const comparativo = normalizar(item.comparativo);
  const fase = normalizar(item.fase);
  const providencia = normalizar(item.providencia);

  return {
    confere: comparativo.includes("confere"),
    divergente: comparativo.includes("divergente"),
    semConferencia: !comparativo.includes("confere") && !comparativo.includes("divergente"),
    // "Não localizado" é só o bem que a unidade declarou perdido ou mandou
    // procurar. Não entra aqui o "Existe fisicamente? Não" isolado: na 2ª Cia
    // ele marca os bens JÁ ENTREGUES ao FUSSESP, que estão contabilizados em
    // descarga. Contar os dois juntos inflaria "não localizado" de poucas
    // unidades para quase 300 e daria ao Comando um alarme falso.
    naoLocalizado: fase.includes("nao localizado") || providencia.includes("localizar"),
    descarga:
      fase.includes("descarga") ||
      fase.includes("exclusao") ||
      providencia.includes("exclusao") ||
      providencia.includes("descarga"),
    cofim: normalizar(item.cofim) === "sim",
  };
}

export function resumir(leitura: LeituraFonte): ResumoFonte {
  const base: ResumoFonte = {
    chave: leitura.fonte.chave,
    total: leitura.itens.length,
    confere: 0,
    divergente: 0,
    semConferencia: 0,
    naoLocalizado: 0,
    descarga: 0,
    cofim: 0,
  };
  for (const item of leitura.itens) {
    const c = classificar(item);
    if (c.confere) base.confere++;
    if (c.divergente) base.divergente++;
    if (c.semConferencia) base.semConferencia++;
    if (c.naoLocalizado) base.naoLocalizado++;
    if (c.descarga) base.descarga++;
    if (c.cofim) base.cofim++;
  }
  return base;
}

export type Consolidado = {
  resumos: Record<string, ResumoFonte>;
  geral: Omit<ResumoFonte, "chave">;
  /** Fontes de inventário que ainda não têm nenhum item lançado. */
  semLancamento: string[];
  /** Fontes que não puderam ser lidas. */
  semAcesso: string[];
  divergencias: ItemInventario[];
  descargas: ItemInventario[];
};

export function consolidar(leituras: LeituraFonte[]): Consolidado {
  const resumos: Record<string, ResumoFonte> = {};
  const geral = {
    total: 0,
    confere: 0,
    divergente: 0,
    semConferencia: 0,
    naoLocalizado: 0,
    descarga: 0,
    cofim: 0,
  };
  const semLancamento: string[] = [];
  const semAcesso: string[] = [];
  const divergencias: ItemInventario[] = [];
  const descargas: ItemInventario[] = [];

  for (const leitura of leituras) {
    if (leitura.fonte.foraDoInventario) continue;
    if (!leitura.ok) {
      semAcesso.push(leitura.fonte.chave);
      continue;
    }
    const resumo = resumir(leitura);
    resumos[leitura.fonte.chave] = resumo;
    if (resumo.total === 0) semLancamento.push(leitura.fonte.chave);

    geral.total += resumo.total;
    geral.confere += resumo.confere;
    geral.divergente += resumo.divergente;
    geral.semConferencia += resumo.semConferencia;
    geral.naoLocalizado += resumo.naoLocalizado;
    geral.descarga += resumo.descarga;
    geral.cofim += resumo.cofim;

    for (const item of leitura.itens) {
      const c = classificar(item);
      if (c.divergente || c.naoLocalizado) divergencias.push(item);
      if (c.descarga) descargas.push(item);
    }
  }

  return { resumos, geral, semLancamento, semAcesso, divergencias, descargas };
}
