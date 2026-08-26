/**
 * As 5 unidades subordinadas do 16º BPM/M para efeito de controle por
 * comandante: 1ª a 4ª Cia e a Cia de Força Tática.
 *
 * Módulo compartilhado entre server e client (a navegação lateral é client
 * component), por isso não tem "server-only" e não importa nada do Supabase.
 *
 * A FT é o caso que justifica o tipo `Unidade` ser texto e não um número de
 * Cia: em `fato_secao` as Companhias aparecem como secao='p1'|'p3'|'motomec'
 * com cia=1..4, enquanto a Força Tática é uma seção própria (secao='ft',
 * cia=null). `ciaNumerica()` e `secaoFato()` resolvem essa diferença em um
 * lugar só, para nenhuma página precisar saber disso.
 */

export const UNIDADES = [
  { valor: "1", rotulo: "1ª Companhia", curto: "1ª Cia", area: "Portal do Morumbi", cia: 1 },
  { valor: "2", rotulo: "2ª Companhia", curto: "2ª Cia", area: "Morumbi", cia: 2 },
  { valor: "3", rotulo: "3ª Companhia", curto: "3ª Cia", area: "Campo Limpo", cia: 3 },
  { valor: "4", rotulo: "4ª Companhia", curto: "4ª Cia", area: "Arpoador", cia: 4 },
  { valor: "ft", rotulo: "Cia de Força Tática", curto: "Cia FT", area: "Toda a área do Batalhão", cia: null },
] as const;

export type Unidade = (typeof UNIDADES)[number]["valor"];

export function ehUnidadeValida(valor: string): valor is Unidade {
  return UNIDADES.some((u) => u.valor === valor);
}

export function dadosUnidade(unidade: Unidade) {
  return UNIDADES.find((u) => u.valor === unidade)!;
}

export function rotuloUnidade(unidade: Unidade): string {
  return dadosUnidade(unidade).rotulo;
}

/** Número da Cia em fato_secao.cia, ou null quando a unidade é a FT. */
export function ciaNumerica(unidade: Unidade): number | null {
  return dadosUnidade(unidade).cia;
}

/**
 * Seções de fato_secao que descrevem a unidade. As Companhias se leem em
 * p1/p3/motomec filtrando por cia; a FT tem indicadores próprios na seção
 * 'ft' (efetivo_total, dias_empregados, ferias_concedidas).
 */
export function secoesFato(unidade: Unidade): string[] {
  return unidade === "ft" ? ["ft"] : ["p1", "p3", "motomec"];
}

/** Chave de visibilidade de documento da unidade (migration 021). */
export function secaoDocumento(unidade: Unidade): string {
  return `cia_${unidade}`;
}

/**
 * Rótulo de unidade como gravado nas tabelas p4_* (coluna `unidade`, texto
 * livre da planilha de origem: "1ª Cia".."4ª Cia", "FT", "EM", "GERAL") —
 * diferente do `rotulo` acima ("1ª Companhia", "Cia de Força Tática"), que é
 * o nome de exibição da tela. Usado só por lib/db/p4.ts para filtrar por Cia.
 */
export function rotuloP4(unidade: Unidade): string {
  return unidade === "ft" ? "FT" : `${dadosUnidade(unidade).cia}ª Cia`;
}

/**
 * Rótulo de unidade como gravado em p4_efetivo.cia — MESMA ideia de
 * rotuloP4, mas essa tabela grava só o ordinal ("1ª", sem o " Cia"), FT em
 * maiúsculas e sem entrada para EM (o Estado-Maior aparece como "EM", fora
 * do domínio de `Unidade`). Tabela própria, formato próprio: por isso não
 * reaproveita rotuloP4.
 */
export function rotuloEfetivoP4(unidade: Unidade): string {
  return unidade === "ft" ? "FT" : `${dadosUnidade(unidade).cia}ª`;
}

export function href(unidade: Unidade): string {
  return `/companhia/${unidade}`;
}
