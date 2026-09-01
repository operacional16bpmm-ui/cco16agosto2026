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

/** Verdadeiro depois do instante de encerramento do mês. */
export function periodoEncerrado(mes: RelatorioMes): boolean {
  if (!mes.encerraEm) return false;
  const limite = Date.parse(mes.encerraEm);
  return Number.isFinite(limite) && Date.now() > limite;
}

/**
 * Publicação read-only da planilha, para embed inline no relatório de dados.
 * É a porta pública ("Publicar na web"), separada do `/edit` — não esbarra em
 * compartilhamento e nunca deixa editar por acidente. O ID de publicação é o
 * mesmo que `lib/cop2026-leitura.ts` usa para a leitura ao vivo por CSV.
 */
const PUB_ID_PLANILHA =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";

export const URL_PLANILHA_EMBED = `https://docs.google.com/spreadsheets/d/e/${PUB_ID_PLANILHA}/pubhtml?widget=true&headers=false`;
