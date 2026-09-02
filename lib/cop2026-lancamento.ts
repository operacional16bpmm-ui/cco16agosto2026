/**
 * Regras do lançamento próprio da Auditoria de COP 2026 — `/cop2026/lancar`.
 *
 * Módulo PURO de propósito: não importa `next/server`, não toca banco e não lê
 * variável de ambiente. É a mesma razão que separou `lib/cop2026-leitura.ts` de
 * `lib/cop2026.ts` — o formulário roda no cliente (validação ao digitar), a
 * Server Action roda no servidor e o backfill roda em `node`, e os três
 * precisam da MESMA função. Regra que existe em duas cópias vira duas contagens.
 *
 * O que este arquivo decide, e por quê, está medido nos 103 lançamentos reais
 * de agosto/2026 (471 campos de ID preenchidos) — não em suposição de desenho.
 */

import { hojeBrt } from "@/lib/cop2026-ciclo";
import {
  ORDEM_SUBUNIDADES,
  classificarIdentificador,
  normalizarIdentificador,
  separarIdentificadores,
  type TipoIdentificador,
} from "@/lib/cop2026";

/* ------------------------------------------------------------------ turnos */

/**
 * Os turnos que a escala 12x36 do Batalhão produz. Lista fechada porque a
 * Diretriz fixa o mínimo POR TURNO: turno em texto livre torna dois lançamentos
 * do mesmo dia indistinguíveis de duplicata.
 *
 * RÓTULO E VALOR SÃO COISAS DIFERENTES, e a confusão entre os dois era um
 * defeito real. O formulário do portal nasceu gravando `1º Turno (07h às 19h)`
 * — texto que não existe em lugar nenhum do resto do sistema. Medido em
 * 01/09/2026 na aba de respostas publicada: **118 lançamentos, só `Diurno`
 * (65) e `Noturno` (53)**. E o filtro do painel casa por prefixo
 * (`startsWith("diurno" | "noturno")`, lib/cop2026-metricas.ts): todo
 * lançamento feito pelo portal desaparecia quando o Comando filtrava por
 * turno.
 *
 * Então: `rotulo` é o que a tropa lê no botão — sem horário, por determinação
 * do Fabrício em 01/09/2026 (a escala está na Diretriz; repetir "(07h às 19h)"
 * só engorda o botão no celular, que é onde se preenche). `valor` é o que vai
 * para o banco, para a chave de agrupamento e para o filtro: o vocabulário dos
 * 118 registros que já existem. Mexer no rótulo é livre; **mexer no `valor`
 * quebra o histórico.**
 */
export const OPCOES_TURNO = [
  { valor: "Diurno", rotulo: "1º Turno" },
  { valor: "Noturno", rotulo: "2º Turno" },
  { valor: "Administrativo", rotulo: "Administrativo" },
] as const;

export const TURNOS = OPCOES_TURNO.map((o) => o.valor) as readonly Turno[];
export type Turno = (typeof OPCOES_TURNO)[number]["valor"];

export function turnoValido(bruto: string): bruto is Turno {
  return (TURNOS as readonly string[]).includes(bruto);
}

/* ---------------------------------------------------------------------- RE */

/**
 * Normalização do RE.
 *
 * Medido em 31/08/2026 nas duas pontas:
 *
 * - `p4_efetivo` (570 linhas, foto de 19/07): **100% no formato `NNNNNN-X`** —
 *   524 com dígito verificador numérico e 46 com letra. Zero exceções.
 * - O Forms de agosto: CINCO formatos — `972607-1` (80), `120146` (12),
 *   `121898A` (6), `970462-A` (3), `9759662` (2).
 *
 * Ou seja: o cadastro é uniforme e quem digita é que varia. A chave canônica
 * portanto é a BASE de 6 dígitos, e não o texto completo: é o único pedaço que
 * o auditor não omite nem reescreve. O dígito verificador entra na exibição,
 * nunca no casamento — quem digitou `120146` e quem digitou `120146-3` é a
 * mesma pessoa, e tratá-los como dois auditores duplicaria a contagem dele.
 *
 * Colisão conhecida e aceita: 568 bases distintas em 570 linhas do efetivo (2
 * pares compartilham os 6 primeiros dígitos). É o motivo de o roster
 * ENRIQUECER e nunca bloquear — ver `lib/db/cop2026-auditor.ts`.
 */
export type ReNormalizado = {
  /** Forma de exibição: `NNNNNN-X`, ou `NNNNNN` quando não veio verificador. */
  canonico: string;
  /** Os 6 dígitos. É a chave de casamento, dedup e agregação. */
  base: string;
  digito: string;
  valido: boolean;
};

export function normalizarRe(bruto: string): ReNormalizado {
  const cru = String(bruto ?? "")
    // O filtro alfanumérico faz toda a limpeza de uma vez: tira hífen, ponto,
    // espaço e também os invisíveis que vêm na colagem de PDF e de WhatsApp
    // (zero-width, NBSP) — que no meio de um número ninguém enxerga.
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");

  const digitos = cru.replace(/[^0-9]/g, "");
  const base = digitos.slice(0, 6);
  if (base.length < 6) return { canonico: cru, base, digito: "", valido: false };

  // O 7º caractere do texto limpo é o verificador — dígito ou letra. Depois
  // dele não existe RE nenhum: `1201461234` é outra coisa, não um RE longo.
  const setimo = cru.charAt(6);
  const digito = /^[0-9A-Z]$/.test(setimo) ? setimo : "";
  return {
    canonico: digito ? `${base}-${digito}` : base,
    base,
    digito,
    valido: cru.length <= 7,
  };
}

/** Só a base, para quem precisa de chave e não de objeto. */
export function reBase(bruto: string): string {
  return normalizarRe(bruto).base;
}

/* -------------------------------------------------------------- evidências */

/** Por que uma colagem foi recusada. O texto é da TELA: nomear o que a pessoa
 *  colou é o que faz ela corrigir; "inválido" faz ela desistir ou insistir. */
export type MotivoRecusa =
  | "cpf"
  | "numero_solto"
  | "re"
  | "truncado"
  | "parte"
  | "desconhecido";

export const EXPLICACAO_RECUSA: Record<MotivoRecusa, string> = {
  cpf: "Isso é um CPF. A plataforma mostra o CPF do operador junto do nome — copie só o ID da mídia ou da gravação.",
  numero_solto:
    "Esse número não é identificador de mídia nem de gravação; parece o número que a plataforma exibe na listagem.",
  re: "Isso é um RE, não o identificador da mídia.",
  truncado: "Identificador incompleto — faltaram caracteres na cópia.",
  parte: "Isso parece o número da parte. O número da parte tem campo próprio, mais abaixo.",
  desconhecido: "Não reconheci isso como identificador da plataforma.",
};

export type Evidencia = {
  /** EXATAMENTE o que o auditor colou, antes de qualquer conserto. É o que tem
   *  valor probatório; o resto é interpretação nossa. */
  bruto: string;
  tipo: TipoIdentificador;
  idMidia: string | null;
  idGravacao: string | null;
  idPagina: number | null;
};

export type Recusa = {
  bruto: string;
  motivo: MotivoRecusa;
  /** Mensagem já pronta, com o detalhe do caso (ex.: quantos caracteres vieram). */
  explicacao: string;
};

const SO_DIGITOS = /^[0-9]+$/;
const HEX = /^[0-9a-f]+$/i;

/**
 * Diz o que É a coisa que não é identificador. Todos os padrões abaixo saíram
 * dos 43,1% de agosto que não resolvem para objeto nenhum da plataforma.
 */
function motivoDaRecusa(valor: string): { motivo: MotivoRecusa; explicacao: string } {
  // CPF primeiro, e com recusa dura: o campo Operador da plataforma é
  // `13934852785 (SOLDADO PM 231936 FABRICIO -16BPMM)` e 22 células de agosto
  // entraram na planilha com o CPF de terceiro colado junto. Exatamente 11
  // dígitos — o ID de página tem 10 e o número solto tem 12 a 15.
  if (/^\d{11}$/.test(valor)) return { motivo: "cpf", explicacao: EXPLICACAO_RECUSA.cpf };

  if (SO_DIGITOS.test(valor)) {
    // `20260824916201`: data concatenada com um sequencial da listagem. É o
    // campeão do lixo de agosto, e vem sempre começando pelo ano corrente.
    if (valor.length >= 12) {
      return { motivo: "numero_solto", explicacao: EXPLICACAO_RECUSA.numero_solto };
    }
    // 7 dígitos é RE sem hífen (`9759662`); 6 é RE sem verificador.
    if (valor.length === 6 || valor.length === 7) {
      return { motivo: "re", explicacao: EXPLICACAO_RECUSA.re };
    }
    return { motivo: "numero_solto", explicacao: EXPLICACAO_RECUSA.numero_solto };
  }

  // Hex quase-do-tamanho: erro de seleção do mouse, não erro de conceito. Vale
  // dizer o número exato — agosto tem 2 casos, e a pessoa reencontra o que
  // faltou. 24 é o piso para não chamar qualquer palavra hexadecimal de ID.
  if (HEX.test(valor) && valor.length >= 24 && valor.length <= 40 && valor.length !== 32) {
    return {
      motivo: "truncado",
      explicacao: `Identificador incompleto: o ID da mídia tem 32 caracteres e vieram ${valor.length}.`,
    };
  }

  if (/^\d{2,5}[/-]\d{2,4}$/.test(valor)) {
    return { motivo: "parte", explicacao: EXPLICACAO_RECUSA.parte };
  }

  return { motivo: "desconhecido", explicacao: EXPLICACAO_RECUSA.desconhecido };
}

export type LeituraEvidencias = {
  evidencias: Evidencia[];
  recusas: Recusa[];
  /** Colagens que resolveram para um identificador que já veio antes NO MESMO
   *  envio. Não é erro do auditor — é a lista da plataforma com repetição. */
  duplicadasNoEnvio: string[];
};

/**
 * Lê os campos de identificador de um lançamento inteiro.
 *
 * Aceita colagem múltipla por construção: o auditor cola a lista inteira da
 * plataforma num campo só e nós separamos. Recusar a colagem múltipla é o que
 * o Forms fazia, e o custo era ~60 interações e 10 trocas de aplicativo para 5
 * vídeos — trocar de aplicativo no celular é exatamente o que mata a aba.
 */
export function lerEvidencias(campos: string[]): LeituraEvidencias {
  const evidencias: Evidencia[] = [];
  const recusas: Recusa[] = [];
  const duplicadasNoEnvio: string[] = [];
  const vistos = new Set<string>();

  for (const campo of campos) {
    for (const pedaco of separarIdentificadores(campo)) {
      const { tipo, valor } = classificarIdentificador(pedaco);
      if (!valor) continue;

      if (tipo === "desconhecido") {
        const { motivo, explicacao } = motivoDaRecusa(valor);
        recusas.push({ bruto: pedaco, motivo, explicacao });
        continue;
      }

      // A chave de unicidade é o valor JÁ classificado, e nunca o texto cru: a
      // mesma gravação colada como URL e como hex é uma evidência, não duas.
      const chave = `${tipo}:${valor}`;
      if (vistos.has(chave)) {
        duplicadasNoEnvio.push(pedaco);
        continue;
      }
      vistos.add(chave);

      evidencias.push({
        bruto: pedaco.trim(),
        tipo,
        idMidia: tipo === "midia" ? valor : null,
        // O hífen do UUID É PRESERVADO: um UUID sem hífen também é 32 hex, e o
        // hífen é o único discriminador entre gravação e mídia.
        idGravacao: tipo === "gravacao" ? valor : null,
        idPagina: tipo === "pagina" ? Number(valor) : null,
      });
    }
  }

  return { evidencias, recusas, duplicadasNoEnvio };
}

/** Chave de unicidade da evidência, atravessando o tipo. É o que sustenta o
 *  índice `(re_operador, id)` do banco — replay do mesmo ID pelo mesmo PM. */
export function chaveEvidencia(e: Evidencia): string | null {
  return e.idMidia ?? e.idGravacao ?? null;
}

/** Prefixo de exibição (`Vídeo 1 · 2df795bc…`), para o auditor saber qual campo
 *  é qual. SÓ EXIBIÇÃO: 8 hex são 32 bits, e comparar por ele produziria
 *  acusação falsa de duplicidade. */
export function prefixoExibicao(valor: string): string {
  const v = normalizarIdentificador(valor);
  return v.length > 8 ? `${v.slice(0, 8)}…` : v;
}

/* ------------------------------------------------------------------- tetos */

/**
 * Tetos de plausibilidade do lançamento.
 *
 * Mudam de FUNÇÃO em relação ao `TETO_VIDEOS_POR_LANCAMENTO = 60` da planilha.
 * Lá o teto defende a contagem de um erro de digitação (o campo era texto livre
 * e virou 202 bilhões em 29/08). Aqui a contagem é derivada de identificadores
 * colados um a um, e cada unidade custa um hex válido: não existe erro de
 * digitação que produza 5.000. O que sobra é limite de ABUSO.
 *
 * Base medida em agosto: maior quantidade declarada = 32; maior efetivamente
 * evidenciada = 6 (teto artificial do Forms); mínimo do Batalhão = 3.
 * `SOFT` pede confirmação, `HARD` recusa.
 */
export const TETO_SOFT_EVIDENCIAS = 20;
export const TETO_HARD_EVIDENCIAS = 40;

/** Janela de retroatividade. Fora dela o lançamento é ACEITO e marcado como
 *  pendência — nunca recusado: auditoria antiga lançada tarde é falha de
 *  processo, e recusar produz o registro que não existe em lugar nenhum. */
export const JANELA_RETROATIVA_HORAS = 72;

/* --------------------------------------------------------------- validação */

export type EntradaLancamento = {
  dataAuditoria: string;
  turno: string;
  re: string;
  nomeGuerra: string;
  posto: string;
  funcao: string;
  auditou: boolean;
  quantidadeDeclarada: number;
  camposId: string[];
  numeroParte: string;
  justificativa: string;
  /** UUID gerado no CLIENTE. Em 4G ruim o POST estoura depois de o servidor
   *  aceitar, o app reenvia e nasce a duplicata. */
  idSubmissao: string;
};

export type LancamentoValidado = {
  dataAuditoria: string;
  turno: Turno;
  re: ReNormalizado;
  nomeGuerra: string;
  posto: string;
  funcao: string;
  auditou: boolean;
  quantidadeDeclarada: number;
  evidencias: Evidencia[];
  recusas: Recusa[];
  duplicadasNoEnvio: string[];
  numeroParte: string;
  justificativa: string;
  idSubmissao: string;
  /** Data de auditoria mais antiga que a janela: entra como pendência. */
  retroativo: boolean;
};

export type ResultadoValidacao =
  | { ok: true; valor: LancamentoValidado; avisos: string[] }
  | { ok: false; erros: string[] };

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function diasEntreIso(inicioIso: string, fimIso: string): number {
  const a = Date.parse(`${inicioIso}T00:00:00Z`);
  const b = Date.parse(`${fimIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Validação de servidor. Roda TAMBÉM no cliente, para o erro aparecer ao
 * digitar — mas quem manda é esta chamada no servidor: Server Action é
 * endpoint público, e `curl` com o identificador da ação ignora a tela inteira.
 * Nada aqui confia no que veio do formulário, nem o campo de subunidade, que
 * sequer existe na entrada: ele é DERIVADO do RE em `lib/db/cop2026-auditor.ts`.
 */
export function validarLancamento(
  entrada: EntradaLancamento,
  agora: Date = new Date()
): ResultadoValidacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  const data = String(entrada.dataAuditoria ?? "").trim();
  const hoje = hojeBrt(agora);
  if (!DATA_ISO.test(data)) {
    erros.push("Informe a data da auditoria.");
  } else if (data > hoje) {
    // C-2: sem isto, 30 dias × 3 turnos × 40 IDs saem de uma conta só, contra
    // uma meta de 960, sem violar índice nenhum. Agosto já tem 2 lançamentos
    // com data de auditoria POSTERIOR ao próprio envio.
    erros.push("A data da auditoria não pode estar no futuro.");
  }

  const turno = String(entrada.turno ?? "").trim();
  if (!turnoValido(turno)) erros.push("Escolha o turno de serviço.");

  const re = normalizarRe(entrada.re ?? "");
  if (re.base.length < 6) {
    erros.push("Informe o seu RE (6 dígitos, com ou sem o verificador).");
  } else if (!re.valido) {
    erros.push("O RE tem 6 dígitos e um verificador — confira o que foi digitado.");
  }

  const nomeGuerra = String(entrada.nomeGuerra ?? "").trim();
  if (nomeGuerra.length < 2) erros.push("Informe o nome de guerra.");
  // A-2 / LGPD: o nome é pedido, nunca devolvido a partir do RE. A diferença
  // entre "RE do efetivo" e "RE de fora" é um oráculo de 1 bit sobre o efetivo
  // nominal do Batalhão, e a própria migration 008 marca isso como sensível.

  // O campo Operador da plataforma carrega CPF; nenhum campo livre deste
  // formulário pode aceitar 11 dígitos, e não só o de identificador.
  for (const [rotulo, texto] of [
    ["nome de guerra", nomeGuerra],
    ["número da parte", String(entrada.numeroParte ?? "")],
    ["justificativa", String(entrada.justificativa ?? "")],
  ] as const) {
    if (/(?<!\d)\d{11}(?!\d)/.test(texto)) {
      erros.push(`Retire o CPF do campo ${rotulo} — esse dado não pode ser registrado aqui.`);
    }
  }

  const leitura = lerEvidencias(entrada.auditou ? (entrada.camposId ?? []) : []);
  const quantidade = Number.isFinite(entrada.quantidadeDeclarada)
    ? Math.max(0, Math.round(entrada.quantidadeDeclarada))
    : 0;

  if (entrada.auditou) {
    if (leitura.evidencias.length === 0) {
      erros.push(
        "Informe ao menos um identificador de mídia ou de gravação — é ele que prova a auditoria."
      );
    }
    if (leitura.evidencias.length > TETO_HARD_EVIDENCIAS) {
      erros.push(
        `São ${leitura.evidencias.length} identificadores num lançamento só. O limite por lançamento é ${TETO_HARD_EVIDENCIAS}; divida por turno.`
      );
    } else if (leitura.evidencias.length > TETO_SOFT_EVIDENCIAS) {
      avisos.push(
        `${leitura.evidencias.length} identificadores neste lançamento — bem acima do usual (o maior de agosto foi 32 declarados). Confira antes de enviar.`
      );
    }
    if (quantidade > TETO_HARD_EVIDENCIAS) {
      erros.push(`A quantidade declarada não pode passar de ${TETO_HARD_EVIDENCIAS} por turno.`);
    }
    // Divergência declarado × evidenciado NÃO é erro: é o indicador de
    // qualidade. Em agosto, 18,4% das linhas já divergem.
    if (quantidade > 0 && quantidade !== leitura.evidencias.length) {
      avisos.push(
        `Você declarou ${quantidade} e informou ${leitura.evidencias.length} identificador${leitura.evidencias.length === 1 ? "" : "es"}. O lançamento vale mesmo assim — a diferença fica registrada.`
      );
    }
  } else {
    // Quem não auditou tem caminho curto. A `justificativa` chega já com o
    // motivo padronizado escolhido na tela (o action prepende
    // `MOTIVO — detalhe`, ver `app/(public)/cop2026/lancar/actions.ts`), então
    // este piso de 5 caracteres continua sendo só um bloqueio contra envio
    // completamente vazio; o motivo em si tem 40+ caracteres em qualquer
    // opção. Número da parte NÃO pode ser obrigatório: exigir força a pessoa
    // a inventar um antes de a parte ser redigida.
    if (String(entrada.justificativa ?? "").trim().length < 5) {
      erros.push("Informe a justificativa de não ter auditado no turno.");
    }
  }

  const idSubmissao = String(entrada.idSubmissao ?? "").trim();
  if (idSubmissao.length < 8) erros.push("Envio sem identificador — recarregue a página.");

  if (erros.length > 0) return { ok: false, erros };

  const retroativo = DATA_ISO.test(data)
    ? diasEntreIso(data, hoje) * 24 > JANELA_RETROATIVA_HORAS
    : false;
  if (retroativo) {
    avisos.push(
      "Lançamento fora da janela de 72 horas: entra registrado como pendência de conferência do Comando."
    );
  }

  return {
    ok: true,
    avisos,
    valor: {
      dataAuditoria: data,
      turno: turno as Turno,
      re,
      nomeGuerra,
      posto: String(entrada.posto ?? "").trim(),
      funcao: String(entrada.funcao ?? "").trim(),
      auditou: Boolean(entrada.auditou),
      quantidadeDeclarada: entrada.auditou ? quantidade : 0,
      evidencias: leitura.evidencias,
      recusas: leitura.recusas,
      duplicadasNoEnvio: leitura.duplicadasNoEnvio,
      numeroParte: String(entrada.numeroParte ?? "").trim(),
      justificativa: String(entrada.justificativa ?? "").trim(),
      idSubmissao,
      retroativo,
    },
  };
}

/* ------------------------------------------------------------------ dedup */

/**
 * Chave que atravessa as ORIGENS (A-5).
 *
 * O lançamento de setembro pelo formulário e o mesmo lançamento importado da
 * planilha de agosto precisam colidir; um índice escopado em
 * `origem='formulario'` deixaria a importação sem unicidade nenhuma, e é assim
 * que 960 vira 1920.
 *
 * Base do RE (não o canônico) porque `120146` e `120146-3` são a mesma pessoa.
 */
export function chaveDedup(re: string, dataIso: string, turno: string): string {
  return `${reBase(re)}|${dataIso}|${turno.trim().toLowerCase()}`;
}

/** Subunidades aceitas pelo banco. `outros` existe para o RE que não casa com o
 *  roster: o lançamento entra e aparece, em vez de sumir num balde errado. */
export const SUBUNIDADES_VALIDAS = [...ORDEM_SUBUNIDADES, "outros"] as const;
export type SubunidadeValida = (typeof SUBUNIDADES_VALIDAS)[number];

export function subunidadeValida(bruto: string): bruto is SubunidadeValida {
  return (SUBUNIDADES_VALIDAS as readonly string[]).includes(bruto);
}
