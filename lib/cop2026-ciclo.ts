/**
 * O "agora" do ciclo de auditoria — em horário de Brasília.
 *
 * `cop2026-relatorios.ts` diz QUAIS são os meses; este arquivo diz EM QUAL
 * deles o Batalhão está hoje. Separado de propósito: a lista dos meses é
 * decisão do Comando (mês novo = uma linha lá), o calendário é aritmética.
 *
 * Toda comparação é feita sobre strings `YYYY-MM-DD`, nunca sobre `Date`: as
 * bordas do período já estão nesse formato e a ordem lexicográfica de uma data
 * ISO é a ordem cronológica. Assim não existe a classe de bug que este portal
 * já pagou uma vez — servidor da Vercel em UTC virando o dia às 21h de
 * Brasília e a página anunciando o mês errado para a tropa que está de serviço.
 *
 * Nada aqui lê planilha e nada aqui importa `next/*`: é puro, para poder ser
 * chamado por qualquer página, servidor ou cliente.
 */

import { RELATORIOS_MENSAIS, type RelatorioMes } from "@/lib/cop2026-relatorios";

const FUSO = "America/Sao_Paulo";

/** Hoje em Brasília, como `YYYY-MM-DD` — que é exatamente o formato do en-CA. */
export function hojeBrt(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Aceita só data ISO de calendário. Serve de porteiro do override de preview. */
export function ehDataIso(valor: string | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

const diaDe = (iso: string) => Number(iso.slice(8, 10));

/** Datas de calendário viram meia-noite UTC as duas: a diferença é em dias
 *  cheios e nenhum fuso entra na conta. */
function paraUtc(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / 86_400_000);
}

/**
 * `vespera` é só o dia imediatamente anterior à abertura — é o estado em que a
 * faixa anuncia a virada ("começa à meia-noite") em vez de anunciar o mês
 * corrente. Dois dias antes já é `futuro` e a faixa nem fala do mês.
 */
export type EstadoCiclo = "encerrado" | "em-curso" | "vespera" | "futuro";

export function estadoDoCiclo(mes: RelatorioMes, hoje = hojeBrt()): EstadoCiclo {
  if (hoje > mes.periodo.ate) return "encerrado";
  if (hoje >= mes.periodo.de) return "em-curso";
  return diasEntre(hoje, mes.periodo.de) === 1 ? "vespera" : "futuro";
}

export type Ciclo = {
  mes: RelatorioMes;
  estado: EstadoCiclo;
  /** Nº do dia corrente dentro do mês (1…totalDias). Zero antes de abrir. */
  dia: number;
  totalDias: number;
  /** Dias que ainda faltam para fechar o período. */
  restam: number;
  /** Quanto do período já correu, em % — é tempo, não conformidade. */
  pct: number;
};

export function lerCiclo(mes: RelatorioMes, hoje = hojeBrt()): Ciclo {
  // Os períodos sempre terminam no último dia do mês, então o dia final é o
  // total de dias — não precisa de tabela de meses nem de bissexto.
  const totalDias = diaDe(mes.periodo.ate);
  const estado = estadoDoCiclo(mes, hoje);
  const dia = estado === "em-curso" ? diaDe(hoje) : estado === "encerrado" ? totalDias : 0;
  return {
    mes,
    estado,
    dia,
    totalDias,
    restam: Math.max(0, totalDias - dia),
    pct: Math.round((dia / totalDias) * 100),
  };
}

/**
 * O ciclo de que a faixa fala.
 *
 * Em regra é o mês que a tropa está lançando. A exceção é o ÚLTIMO DIA do
 * período: aí a faixa passa a anunciar o mês seguinte, em estado `vespera`.
 * O motivo é o propósito da peça — ela existe para dizer que a meta recomeça,
 * e quem abre a página às 22h do dia 31 precisa saber que à meia-noite o
 * contador zera. "AGOSTO COMEÇOU · dia 31 de 31" não é notícia para ninguém.
 * O botão de lançar continua sendo o do turno de hoje: quem está de serviço no
 * dia 31 ainda está lançando agosto.
 */
export function cicloCorrente(hoje = hojeBrt()): Ciclo {
  const emCurso = RELATORIOS_MENSAIS.find((m) => estadoDoCiclo(m, hoje) === "em-curso");
  const proximo = RELATORIOS_MENSAIS.find((m) => m.periodo.de > hoje);
  if (emCurso) {
    const ciclo = lerCiclo(emCurso, hoje);
    return ciclo.restam === 0 && proximo ? lerCiclo(proximo, hoje) : ciclo;
  }
  // Passado dezembro não existe "próximo": o último ciclo fica como referência
  // e a faixa cai no estado `encerrado`, sem quebrar a página.
  return lerCiclo(proximo ?? RELATORIOS_MENSAIS[RELATORIOS_MENSAIS.length - 1], hoje);
}

/**
 * O mês cujo relatório está publicado — é para ele que aponta o botão de
 * relatório da faixa.
 *
 * Sai de `disponivel`, não do relógio, de propósito: quem libera o relatório é
 * o Comando, depois de fechar a consolidação. Um mês pode ter terminado ontem
 * e ainda não estar liberado; nesse caso o botão continua apontando para o
 * anterior, em vez de levar a tropa a um 404.
 */
/**
 * O mês imediatamente anterior na lista — o que ESTÁ FECHANDO quando a faixa
 * já anuncia o seguinte.
 *
 * Existe por causa de um erro que foi ao ar: no estado `vespera` a faixa fala
 * de dois meses ao mesmo tempo (o título anuncia o que abre à meia-noite, o
 * corpo explica o que encerra às 23h59) e o corpo estava pegando o mês do
 * título. Em 30/09 a página dizia "OUTUBRO COMEÇA À MEIA-NOITE" logo acima de
 * "O período de outubro encerra hoje".
 */
export function mesAnterior(mes: RelatorioMes): RelatorioMes | undefined {
  const i = RELATORIOS_MENSAIS.findIndex((m) => m.chave === mes.chave);
  return i > 0 ? RELATORIOS_MENSAIS[i - 1] : undefined;
}

export function ultimoRelatorioPublicado(): RelatorioMes | undefined {
  const publicados = RELATORIOS_MENSAIS.filter((m) => m.disponivel);
  return publicados[publicados.length - 1];
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "1º a 31 de agosto de 2026" — a forma que o Batalhão usa nos documentos. */
export function periodoPorExtenso(mes: RelatorioMes): string {
  const indice = Number(mes.periodo.de.slice(5, 7)) - 1;
  return `1º a ${diaDe(mes.periodo.ate)} de ${MESES_EXTENSO[indice]} de ${mes.ano}`;
}
