/**
 * RELATO DE PROBLEMA DO SISTEMA — o registro de que a fração AVISOU.
 *
 * Por que isto existe, na palavra de quem pediu (Fabrício, 08/09/2026, reunião
 * de revisão do painel):
 *
 *   "Teve a 3ª Cia — os caras simplesmente cagaram pro negócio da COP não
 *    funcionando de sexta até domingo. O de domingo cagou e não falou pra
 *    ninguém, não avisou nada. Não avisou o CFP e nem tomou providência
 *    nenhuma. Aí ficamos sabendo pela imprensa. […] Já que tá sem COP, agora a
 *    gente pode dar uma cagadinha de pau… na segunda-feira já desceu uma
 *    [encrenca] desse tamanho. E essa vai vir com o Ministério Público,
 *    certeza."
 *
 * Daí a natureza do módulo, que não é óbvia pelo nome: **isto não é
 * telemetria**. Um monitor que descobrisse a queda sozinho não resolveria o
 * problema dele. O que ele precisa provar é que a fração comunicou, com data e
 * hora, que o sistema estava fora — para que a ausência de COP não vire
 * justificativa retroativa de desvio de conduta, e para haver documento quando
 * a Corregedoria ou o Ministério Público perguntarem.
 *
 * Três consequências de projeto que seguem daí:
 *
 * 1. **Nunca recusar um relato por forma.** Campo malpreenchido vira pendência
 *    de correção, não porta fechada: a mesma decisão que o Comando tomou para
 *    o identificador de mídia em 07/09/2026 (ver `cop2026-lancamento.ts`).
 *    Quem tenta avisar e é barrado pela tela vira exatamente o caso que este
 *    módulo existe para impedir.
 * 2. **O horário do fato é do relator, não do servidor.** `registradoEm` prova
 *    quando o aviso chegou; `inicio` é o que a fração declara ter acontecido.
 *    Os dois são gravados, e nenhum sobrescreve o outro.
 * 3. **Escopo é a unidade de gravação.** O relato é sobre a COP — a câmera e a
 *    plataforma de vídeo —, não sobre o portal. Por isso o identificador aceito
 *    aqui é o mesmo do lançamento: ID de mídia ou ID de gravação.
 */
import { classificarIdentificador, type TipoIdentificador } from "@/lib/cop2026";

/** Até onde o sistema parou. */
export type Abrangencia = "total" | "parcial";

export const ROTULO_ABRANGENCIA: Record<Abrangencia, string> = {
  total: "Totalmente inoperante",
  parcial: "Parcialmente inoperante",
};

export const AJUDA_ABRANGENCIA: Record<Abrangencia, string> = {
  total: "Não foi possível usar o sistema de jeito nenhum.",
  parcial: "Deu para usar em parte — alguma função respondia e outra não.",
};

/** O que exatamente deixou de funcionar. Mais de um pode valer no mesmo fato. */
export type Efeito = "carregamento" | "download" | "acesso" | "outro";

export const ROTULO_EFEITO: Record<Efeito, string> = {
  carregamento: "Carregamento (subir o vídeo)",
  download: "Download (baixar o vídeo)",
  acesso: "Acesso ao sistema (login/abrir)",
  outro: "Outro",
};

export const AJUDA_EFEITO: Record<Efeito, string> = {
  carregamento: "A câmera não conseguiu enviar a gravação para a plataforma.",
  download: "A gravação está lá, mas não desce para ser auditada.",
  acesso: "Não foi possível entrar na plataforma.",
  outro: "Descreva no campo de baixo o que aconteceu.",
};

export const EFEITOS: Efeito[] = ["carregamento", "download", "acesso", "outro"];

export type SituacaoRelato = "aberto" | "em_analise" | "resolvido" | "improcedente";

export const ROTULO_SITUACAO: Record<SituacaoRelato, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  improcedente: "Improcedente",
};

/**
 * O PADRÃO DO IDENTIFICADOR, escrito para a tela.
 *
 * O Fabrício foi explícito em 08/09/2026: "o usuário deve colocar o padrão
 * certo — deixe isso bem nítido para ele entender no formulário". Os formatos
 * são os mesmos de `classificarIdentificador`; o que muda aqui é que eles
 * aparecem para quem preenche, com exemplo, em vez de só existirem na
 * validação. Ninguém acerta um formato que nunca viu.
 */
export const PADRAO_IDENTIFICADOR = {
  midia: {
    rotulo: "ID de mídia",
    formato: "32 caracteres, só números e letras de A a F, sem hífen",
    exemplo: "9f3c1ab27de40865c1d9a4b7e6f2031c",
  },
  gravacao: {
    rotulo: "ID de gravação",
    formato: "36 caracteres em cinco blocos separados por hífen (8-4-4-4-12)",
    exemplo: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  },
} as const;

export type IdentificadorLido = {
  bruto: string;
  tipo: TipoIdentificador;
  valor: string;
  /** `true` quando resolveu para mídia ou gravação. Os demais entram como
   *  declarados — ver a regra 1 no topo do arquivo. */
  reconhecido: boolean;
};

/**
 * Lê o campo de identificador aceitando colagem múltipla (um por linha, por
 * vírgula ou por espaço), como o formulário de lançamento já faz. O que não
 * resolve **não é descartado**: volta marcado, para a tela avisar sem barrar e
 * para o admin poder cobrar a correção depois.
 */
export function lerIdentificadores(campo: string): IdentificadorLido[] {
  return String(campo ?? "")
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((bruto) => {
      const { tipo, valor } = classificarIdentificador(bruto);
      return {
        bruto,
        tipo,
        valor,
        reconhecido: tipo === "midia" || tipo === "gravacao",
      };
    });
}

export type EntradaRelato = {
  /** Fração que está relatando ('em', '1cia', '2cia', '3cia', 'ft'…). */
  subunidade: string;
  /** Data do início do problema, em ISO (AAAA-MM-DD). */
  dataInicio: string;
  /** Hora do início, HH:MM. */
  horaInicio: string;
  /** Vazio quando ainda está fora do ar. */
  dataFim?: string;
  horaFim?: string;
  emCurso: boolean;
  abrangencia: Abrangencia;
  efeitos: Efeito[];
  identificadores: string;
  descricao: string;
  /** Quem relata — RE e nome, como no lançamento. */
  re: string;
  nome: string;
};

export type ProblemaDeForma = {
  campo: keyof EntradaRelato | "geral";
  texto: string;
  /** `true` impede o envio. Tudo o mais é aviso: o relato entra e a pendência
   *  fica registrada para correção. */
  bloqueia: boolean;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Confere a forma do relato.
 *
 * Só quatro coisas bloqueiam, e todas porque sem elas o registro não prova
 * nada: quem relatou, de qual fração, quando começou e o que parou. Todo o
 * resto — identificador, descrição, hora de fim — vira aviso.
 */
export function conferirRelato(e: EntradaRelato, hojeIso: string): ProblemaDeForma[] {
  const p: ProblemaDeForma[] = [];

  if (!e.subunidade) {
    p.push({ campo: "subunidade", texto: "Escolha a companhia ou fração.", bloqueia: true });
  }
  if (!ISO.test(e.dataInicio)) {
    p.push({ campo: "dataInicio", texto: "Informe o dia em que começou.", bloqueia: true });
  } else if (e.dataInicio > hojeIso) {
    p.push({
      campo: "dataInicio",
      texto: "A data de início está no futuro. Confira o dia.",
      bloqueia: true,
    });
  }
  if (!HORA.test(e.horaInicio)) {
    p.push({ campo: "horaInicio", texto: "Informe a hora em que começou (HH:MM).", bloqueia: true });
  }
  if (!e.efeitos.length) {
    p.push({ campo: "efeitos", texto: "Marque o que deixou de funcionar.", bloqueia: true });
  }
  if (!e.re.trim() || !e.nome.trim()) {
    p.push({
      campo: "re",
      texto: "Informe o seu RE e o seu nome — é o que prova quem avisou.",
      bloqueia: true,
    });
  }

  if (!e.emCurso) {
    if (e.dataFim && !ISO.test(e.dataFim)) {
      p.push({ campo: "dataFim", texto: "Data de normalização inválida.", bloqueia: false });
    }
    if (e.horaFim && !HORA.test(e.horaFim)) {
      p.push({ campo: "horaFim", texto: "Hora de normalização inválida (HH:MM).", bloqueia: false });
    }
    if (
      e.dataFim &&
      e.horaFim &&
      ISO.test(e.dataFim) &&
      HORA.test(e.horaFim) &&
      `${e.dataFim}T${e.horaFim}` < `${e.dataInicio}T${e.horaInicio}`
    ) {
      p.push({
        campo: "dataFim",
        texto: "A normalização está antes do início. Confira as duas datas.",
        bloqueia: false,
      });
    }
  }

  const ids = lerIdentificadores(e.identificadores);
  const naoReconhecidos = ids.filter((i) => !i.reconhecido);
  if (naoReconhecidos.length) {
    p.push({
      campo: "identificadores",
      texto: `${naoReconhecidos.length} identificador${
        naoReconhecidos.length === 1 ? " não confere" : "es não conferem"
      } com o padrão de ID de mídia ou de gravação. O relato vale mesmo assim — a diferença fica registrada para correção.`,
      bloqueia: false,
    });
  }

  if (e.efeitos.includes("outro") && e.descricao.trim().length < 10) {
    p.push({
      campo: "descricao",
      texto: 'Você marcou "Outro" — descreva em uma linha o que aconteceu.',
      bloqueia: false,
    });
  }

  return p;
}

export const bloqueia = (problemas: ProblemaDeForma[]) => problemas.some((x) => x.bloqueia);

/** Resumo de uma linha, usado no Telegram, no admin e no bloco do painel. */
export function resumoDoRelato(r: {
  subunidadeRotulo: string;
  inicio: string;
  abrangencia: Abrangencia;
  efeitos: Efeito[];
}): string {
  const efeitos = r.efeitos.map((x) => ROTULO_EFEITO[x].split(" (")[0]).join(" e ");
  return `${r.subunidadeRotulo} · ${ROTULO_ABRANGENCIA[r.abrangencia].toLowerCase()} · ${efeitos} · desde ${r.inicio}`;
}
