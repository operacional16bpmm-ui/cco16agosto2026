/**
 * Relatórios mensais da Auditoria de COP 2026 — fonte única dos meses.
 *
 * Dirige tanto a grade do hub (`/cop2026/relatorios`) quanto o recorte de datas
 * que o relatório executivo passa a `calcularPainel`. Mês novo = uma linha aqui,
 * não código espalhado. Puro de propósito: nada de `next/server` nem leitura de
 * planilha, para poder ser importado por qualquer página (server ou client).
 */

export type ChaveMes = "agosto" | "setembro" | "outubro" | "novembro" | "dezembro";

export type RelatorioMes = {
  chave: ChaveMes;
  rotulo: string;
  abrev: string;
  ano: number;
  /** Recorte que vira o `de`/`ate` dos Filtros do painel. */
  periodo: { de: string; ate: string };
  /** Mês liberado (tem relatório) ou ainda em preparação. */
  disponivel: boolean;
  /** Instante de encerramento do período, com fuso — quando presente, o
   *  relatório carimba "período encerrado" depois dele. */
  encerraEm?: string;
};

export const RELATORIOS_MENSAIS: RelatorioMes[] = [
  {
    chave: "agosto",
    rotulo: "Agosto",
    abrev: "AGO",
    ano: 2026,
    periodo: { de: "2026-08-01", ate: "2026-08-31" },
    disponivel: true,
    encerraEm: "2026-08-31T23:59:00-03:00",
  },
  {
    chave: "setembro",
    rotulo: "Setembro",
    abrev: "SET",
    ano: 2026,
    periodo: { de: "2026-09-01", ate: "2026-09-30" },
    disponivel: false,
  },
  {
    chave: "outubro",
    rotulo: "Outubro",
    abrev: "OUT",
    ano: 2026,
    periodo: { de: "2026-10-01", ate: "2026-10-31" },
    disponivel: false,
  },
  {
    chave: "novembro",
    rotulo: "Novembro",
    abrev: "NOV",
    ano: 2026,
    periodo: { de: "2026-11-01", ate: "2026-11-30" },
    disponivel: false,
  },
  {
    chave: "dezembro",
    rotulo: "Dezembro",
    abrev: "DEZ",
    ano: 2026,
    periodo: { de: "2026-12-01", ate: "2026-12-31" },
    disponivel: false,
  },
];

export function relatorioPorChave(chave: string): RelatorioMes | undefined {
  return RELATORIOS_MENSAIS.find((m) => m.chave === chave);
}

/**
 * Mês do ciclo em que a data cai — `undefined` fora do ciclo de 2026.
 *
 * Existe porque a meta de 960 evidências é MENSAL (`turnos: 15`, `dias: 30`, e
 * `metasSemanais` com quatro semanas), enquanto o painel sem filtro de data
 * somava todos os lançamentos já recebidos. Enquanto só existia agosto isso
 * passava despercebido; a partir de setembro o percentual passaria de 100% por
 * empilhar dois meses contra a meta de um.
 *
 * O fuso é obrigatório, não decoração: às 21h de 31/08 em São Paulo já é 1º de
 * setembro em UTC, e sem `America/Sao_Paulo` o painel viraria o mês algumas
 * horas antes da tropa — mostrando zero enquanto o turno da noite ainda lança
 * em agosto. `sv-SE` é o atalho conhecido para formatar como `aaaa-mm-dd`, que
 * é o mesmo formato de `periodo.de`/`periodo.ate` e compara direto como texto.
 */
export function mesCorrente(agora: Date = new Date()): RelatorioMes | undefined {
  const hoje = agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return RELATORIOS_MENSAIS.find((m) => hoje >= m.periodo.de && hoje <= m.periodo.ate);
}

/** Verdadeiro depois do instante de encerramento do mês. */
export function periodoEncerrado(mes: RelatorioMes): boolean {
  if (!mes.encerraEm) return false;
  const limite = Date.parse(mes.encerraEm);
  return Number.isFinite(limite) && Date.now() > limite;
}
