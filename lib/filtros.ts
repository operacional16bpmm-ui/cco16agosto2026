/**
 * Parser central de filtros de seção (ano/mes/cia) a partir de searchParams.
 * Usado por todas as páginas de seção (P1, P3, P4, Motomec, Força Tática,
 * SPJMD...). Valor ausente ou fora de faixa cai em `undefined` (filtro
 * "todos") — nunca lança, para não derrubar o render de uma page inteira por
 * causa de um parâmetro de URL malformado.
 */

export type FiltroSecao = {
  ano?: number;
  mes?: number;
  cia?: number;
};

export type SearchParamsCru = Record<string, string | string[] | undefined>;

function paramUnico(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function inteiroEmFaixa(bruto: string, min: number, max: number): number | undefined {
  if (!bruto) return undefined;
  const n = Number.parseInt(bruto, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function parseFiltroSecao(sp: SearchParamsCru): FiltroSecao {
  const anoMax = new Date().getUTCFullYear() + 1;
  return {
    ano: inteiroEmFaixa(paramUnico(sp.ano), 2010, anoMax),
    mes: inteiroEmFaixa(paramUnico(sp.mes), 1, 12),
    // 0 = nível batalhão (sem quebra por Cia); 1–7 = Cia específica.
    cia: inteiroEmFaixa(paramUnico(sp.cia), 0, 7),
  };
}

/** Monta a query string mesclando o filtro atual com uma alteração pontual,
 * preservando os demais parâmetros — usado por FiltroBar para gerar os
 * <Link> de cada opção sem precisar de estado client. */
export function mesclarFiltro(
  atual: FiltroSecao,
  alteracao: Partial<Record<keyof FiltroSecao, number | undefined>>
): string {
  const proximo: FiltroSecao = { ...atual, ...alteracao };
  const params = new URLSearchParams();
  if (proximo.ano != null) params.set("ano", String(proximo.ano));
  if (proximo.mes != null) params.set("mes", String(proximo.mes));
  if (proximo.cia != null) params.set("cia", String(proximo.cia));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
