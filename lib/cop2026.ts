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
 * A PARTIR DE SETEMBRO/2026 a planilha deixa de ser a única fonte: o
 * lançamento passa a ser feito em `/cop2026/lancar`, no próprio portal, e
 * gravado em `cop_auditoria_lancamento` (migration 026). Este módulo continua
 * sendo a fonte única do PARSER — as regras de identificador, subunidade e
 * quantidade valem para as duas origens, e é `lib/cop2026-leitura.ts` que
 * escolhe de onde os números vêm (`COP2026_FONTE`).
 *
 * A tabela cop_auditoria_respostas (migration 008) era um terceiro desenho, por
 * importação manual de CSV; nunca recebeu uma linha e foi derrubada pela 026,
 * junto de lib/db/cop-auditoria.ts, que calculava meta própria e era uma
 * segunda fonte de classificação.
 */

export const PLANILHA_ID = "11tdaTRSSf-K-y13rIg3hmHCGmyOeWFhkBfRbCqKF1Bg";

/**
 * Onde a tropa lança. Rota do próprio portal desde 01/09/2026 — era
 * `https://forms.gle/kqiRxSbCHqYKRkf2A`.
 *
 * O Forms NÃO é desligado junto com esta troca, e o endereço antigo continua
 * abaixo de propósito: `forms.gle` é domínio do Google e não redireciona, então
 * o corte não é uma configuração — é fechar o Forms e usar a mensagem de
 * encerramento apontando o novo endereço. Enquanto isso não acontece, os dois
 * convivem: quem chegar pelo QR Code antigo ou por um print de WhatsApp de
 * agosto continua conseguindo lançar. Em escala 12x36, avisar todo o efetivo
 * leva ~4 dias por aritmética da escala, não por falha de comunicação.
 */
export const URL_FORMULARIO = "/cop2026/lancar";
export const URL_FORMULARIO_GOOGLE = "https://forms.gle/kqiRxSbCHqYKRkf2A";
export const URL_PLANILHA = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;

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
  /** Número implausível que veio no campo de quantidade e ficou de fora da
   *  contagem; 0 quando não houve. Guardado para o painel COBRAR a correção na
   *  planilha, em vez de descartar calado — ver `TETO_VIDEOS_POR_LANCAMENTO`. */
  quantidadeDescartada: number;
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
  /** Verdadeiro quando os números vieram do último retrato bom, e não da
   *  planilha agora. Anda sempre junto de `erro`. */
  stale?: boolean;
  /** Momento da última leitura que deu certo — não o momento da tentativa.
   *  É o que o painel anuncia como "última leitura confiável". */
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
 * Tira CPF do texto que o auditor colou no campo de ID.
 *
 * A tela "Visão geral" da plataforma Motorola identifica o dono da câmera como
 * `13934852785 (SOLDADO PM 231936 FABRICIO -16BPMM)`: os 11 dígitos da frente
 * são CPF. Quem copia esse bloco cola o CPF de um TERCEIRO — o operador da
 * câmera, que quase nunca é o próprio auditor. Medido na planilha em
 * 31/08/2026: 31 células com CPF, de 16 pessoas distintas, todas nas seis
 * colunas de ID e em nenhuma outra.
 *
 * Daqui o dado seguia para a tabela do painel, para o relatório impresso e para
 * o CSV que `lancamentosParaCsv` descreve como "anexo de processo" — dado
 * pessoal de terceiro em peça disciplinar.
 *
 * Por que exatamente 11 dígitos, e não `\d{11,}`: o identificador de página da
 * plataforma (`/app/videos/4710984476/info`) tem 10 dígitos, e os números
 * soltos que a tropa cola no lugar do ID têm de 12 a 15. Um intervalo aberto
 * apagaria justamente o lixo que o Comando precisa enxergar para cobrar a
 * correção na planilha.
 *
 * O que sobra na tela é `260823 - [CPF removido]`: o Comando continua vendo que
 * aquela célula está errada e mandando corrigir, sem que o CPF trafegue junto.
 */
export function redigirCpf(texto: string): string {
  /* Token a token, e não sobre o texto inteiro.
   *
   * O último grupo de um UUID tem 12 caracteres hexadecimais. Quando 11 deles
   * saem dígitos — e sai, é 1 em 16 —, o hífen antes e o hex depois formam a
   * fronteira que a expressão procura, e a redação come o miolo de um
   * identificador de gravação legítimo. Foi ao ar em 02/09/2026:
   * `395ab763-49cc-4eb2-acef-[CPF removido]f` no painel, no lugar do UUID que
   * o auditor lançou. Evidência boa apagada como se fosse dado pessoal.
   *
   * Identificador da plataforma nunca é CPF: se o token resolve para mídia,
   * gravação ou página, ele passa inteiro. O resto — inclusive o número solto
   * que o Comando precisa enxergar para cobrar a correção — continua sendo
   * varrido pela mesma regra de 11 dígitos exatos de antes.
   *
   * A separação preserva os espaços originais: o texto volta com a mesma
   * quebra de linha que veio da planilha, que é o que a tabela e o CSV exibem.
   */
  return String(texto ?? "")
    .split(/(\s+)/)
    .map((parte) => {
      if (!parte.trim()) return parte;
      if (classificarIdentificador(parte).tipo !== "desconhecido") return parte;
      return parte.replace(/(?<!\d)\d{11}(?!\d)/g, "[CPF removido]");
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Identificadores da plataforma Motorola
// ---------------------------------------------------------------------------

/**
 * A tela "Visão geral" da plataforma expõe TRÊS identificadores da mesma
 * gravação, e a pergunta do formulário ("ID da midia/gravacao") aceita
 * qualquer um dos três — mais o que não é nenhum deles:
 *
 *   ID da mídia    044f5fd643c7401b06503db90c67a3dc      32 hex, sem hífen
 *   ID da gravação 2df795bc-e91e-41ce-819e-95e0f88f0ab6  UUID, com hífen
 *   ID de página   /app/videos/3946270937/info           numérico, na URL
 *
 * Levantamento do que a tropa realmente colou em agosto/2026 (471 células):
 * 42,0% ID da mídia · 6,6% ID da gravação · 2,5% URL inteira · 43,1% número
 * solto que não é identificador de nada · 5,7% outros. Só 48,6% do que está
 * gravado como "evidência" resolve para um objeto da plataforma.
 *
 * ATENÇÃO — nunca remover o hífen ao normalizar: um UUID sem hífen também tem
 * 32 caracteres hexadecimais, e o hífen é o ÚNICO discriminador entre os dois
 * identificadores. Conferido nos dados: dos 198 valores de 32 hex, só 3 (1,5%)
 * casam com o padrão de UUID v4 — exatamente a taxa do acaso, ou seja, são ID
 * de mídia de verdade e não UUID com o hífen removido.
 */
export type TipoIdentificador = "midia" | "gravacao" | "pagina" | "desconhecido";

const RE_MIDIA = /^[0-9a-f]{32}$/i;
const RE_GRAVACAO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_URL_COP = /cop\.pmesp\.br\.evm\.online\/app\/videos\/(\d+)/i;

/** Tira espaço, zero-width e NBSP — que vêm junto na colagem do navegador — e
 *  baixa a caixa. O hífen FICA: ver o aviso acima. Os invisíveis vão por
 *  escape de propósito — literal aqui é caractere que ninguém enxerga na
 *  revisão do código. */
export function normalizarIdentificador(bruto: string): string {
  return String(bruto ?? "")
    .replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, "")
    .toLowerCase();
}

/**
 * Classifica UM valor colado. A URL é reconhecida antes dos demais porque
 * carrega o ID de página dentro dela — e, em 11 das 12 URLs coladas em agosto,
 * o fragmento `#:~:text=` ainda trazia o ID da mídia de brinde.
 */
export function classificarIdentificador(bruto: string): {
  tipo: TipoIdentificador;
  valor: string;
} {
  const v = normalizarIdentificador(bruto);
  if (!v) return { tipo: "desconhecido", valor: "" };

  const url = v.match(RE_URL_COP);
  if (url) {
    // Dentro da URL pode vir o ID da mídia no fragmento de texto destacado;
    // quando vem, ele vale mais que o número da página, que é volátil.
    const embutido = v.match(/[0-9a-f]{32}/i);
    if (embutido) return { tipo: "midia", valor: embutido[0] };
    return { tipo: "pagina", valor: url[1] };
  }
  if (RE_GRAVACAO.test(v)) return { tipo: "gravacao", valor: v };
  if (RE_MIDIA.test(v)) return { tipo: "midia", valor: v };
  return { tipo: "desconhecido", valor: v };
}

/** Identificador que resolve para um objeto da plataforma. O ID de página fica
 *  de fora de propósito: é sequencial da interface, não do acervo. */
export function ehIdentificadorValido(bruto: string): boolean {
  const { tipo } = classificarIdentificador(bruto);
  return tipo === "midia" || tipo === "gravacao";
}

/** Quebra o texto de um campo em identificadores. O auditor cola vários de uma
 *  vez — separar é sempre melhor que recusar, que é o que o Forms fazia. */
export function separarIdentificadores(bruto: string): string[] {
  return String(bruto ?? "")
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Teto de plausibilidade da quantidade auditada em UM lançamento.
 *
 * "Se auditou 5 ou mais, informe a quantidade exata" é campo de texto livre ao
 * lado de uma lista fechada, e em 29/08/2026 um auditor colou ali o ID da
 * mídia (202608298084). Como toda métrica soma o número cru, aquele lançamento
 * sozinho virou 202 bilhões de evidências: total do Batalhão, ranking de
 * frações, evolução semanal, carta de controle ±3σ e o briefing executivo
 * saíram errados de uma vez — e o painel não deu sinal nenhum.
 *
 * Sessenta é generoso de propósito: é uma auditoria a cada 12 minutos num turno
 * de 12 horas, mais do que o triplo do maior lançamento real já registrado
 * (18). Não é regra de negócio nem limite de esforço — é a linha entre um
 * número e um erro de digitação.
 */
export const TETO_VIDEOS_POR_LANCAMENTO = 60;

/**
 * Quantidade auditada do lançamento, com o número implausível posto de lado.
 *
 * Vale o maior entre a lista e o campo exato, mas só entre os que passam no
 * teto. Descartado o exato, sobra o que a pessoa marcou na lista — campo
 * fechado, que não aceita ID: o lançamento de 29/08 voltou a valer 3 em vez de
 * zerar. Zerar seria punir o auditor por um erro de digitação; somar seria
 * mentir para o Comando.
 */
export function quantidadeAuditada(lista: number, exata: number) {
  const brutos = [lista, exata];
  const plausiveis = brutos.filter((n) => n <= TETO_VIDEOS_POR_LANCAMENTO);
  const descartados = brutos.filter((n) => n > TETO_VIDEOS_POR_LANCAMENTO);
  return {
    videos: plausiveis.length > 0 ? Math.max(...plausiveis) : 0,
    descartado: descartados.length > 0 ? Math.max(...descartados) : 0,
  };
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

export function extrairLancamentos(linhas: string[][]): LancamentoCop[] {
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
    const auditou = ehSim(bruto.auditou ?? "");
    const quantidade = quantidadeAuditada(
      inteiro(bruto.videos ?? ""),
      inteiro(bruto.videosExatos ?? "")
    );
    // Sem data de auditoria a linha não entra em nenhum recorte temporal;
    // ainda assim é preservada com data vazia para não sumir da tabela.
    lancamentos.push({
      id: i,
      data,
      // O Forms passou a mandar "dd/mm/aaaa hh:mm" desde que o campo de data
      // ganhou horário; a hora da auditoria não é a do envio (essa é o carimbo).
      hora: (bruto.data ?? "").match(/(\d{1,2}):(\d{2})/)?.[0] ?? "",
      // A redação de CPF acontece aqui, na porta de entrada, e não em cada
      // saída: `idsMidia` é o ÚNICO campo que carrega texto copiado da
      // plataforma, e alimenta ao mesmo tempo a tabela do painel, o relatório
      // impresso e o CSV de anexo. Sanear num lugar só é o que garante que uma
      // superfície nova não nasça vazando.
      idsMidia: redigirCpf(
        idxIds
          .map((i) => (linha[i] ?? "").trim())
          .filter(Boolean)
          .join("\n")
      ),
      turno: bruto.turno ?? "",
      enviadoEm: carimbo(bruto.enviadoEm ?? ""),
      re: bruto.re ?? "",
      nomeGuerra: bruto.nomeGuerra ?? "",
      posto: bruto.posto ?? "",
      funcao: bruto.funcao ?? "",
      subunidade: chaveSubunidade(bruto.subunidade),
      auditou,
      videos: auditou ? quantidade.videos : 0,
      videosExatos: inteiro(bruto.videosExatos ?? ""),
      // Quem respondeu NÃO não tem quantidade a corrigir: o campo fica vazio e
      // qualquer lixo nele é ruído, não achado de auditoria.
      quantidadeDescartada: auditou ? quantidade.descartado : 0,
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

export function extrairMetas(linhas: string[][]): MetaSubunidade[] {
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
