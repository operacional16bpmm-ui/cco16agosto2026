import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { getSecaoDashboard, type LinhaFato, type ArquivoFonte } from "@/lib/db/secao";
import { ciaNumerica, type Unidade } from "@/lib/unidades";

/**
 * Leitura do painel de uma unidade subordinada (1ª a 4ª Cia e Cia FT).
 *
 * Camada fina de propósito: os fatos por Companhia JÁ existem em fato_secao
 * (p1/p3/motomec com cia=1..4; a FT em secao='ft'), e os helpers de
 * lib/db/secao.ts (totalIndicador, serieMensal, deltaMesAnterior,
 * comparativoCia) já sabem filtrar por cia. Aqui só se junta o que está
 * espalhado em três seções e se acrescenta o que é escrito pela própria
 * Companhia: lançamentos (migration 020) e metas.
 */

export type Lancamento = {
  id: string;
  unidade: string;
  tipo: "pendencia" | "ocorrencia_relevante" | "justificativa_meta" | "nota_escala";
  data_ref: string;
  titulo: string;
  texto: string | null;
  prazo: string | null;
  status: "aberto" | "em_andamento" | "concluido";
  criado_por_usuario: string;
  criado_em: string;
};

export type Meta = {
  indicador: string;
  ano: number;
  mes: number;
  valor_meta: number;
};

export type PainelCompanhia = {
  /** Fatos da unidade, já recortados: só as linhas da Cia (ou da seção 'ft'). */
  fatos: LinhaFato[];
  /** Fatos do batalhão inteiro (cia=0/null), para comparar a Cia com o todo. */
  fatosBatalhao: LinhaFato[];
  arquivosFonte: ArquivoFonte[];
  lancamentos: Lancamento[];
  metas: Meta[];
  temDados: boolean;
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db/companhia] ${label} falha na consulta, usando fallback:`, erro);
    return fallback;
  }
}

export function getLancamentos(unidade: Unidade): Promise<Lancamento[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      const { data, error } = await c
        .from("cia_lancamentos")
        .select("id, unidade, tipo, data_ref, titulo, texto, prazo, status, criado_por_usuario, criado_em")
        .eq("unidade", unidade)
        .order("status")
        .order("data_ref", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as Lancamento[];
    },
    [],
    `getLancamentos(${unidade})`
  );
}

export function getMetas(unidade: Unidade): Promise<Meta[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      const { data, error } = await c
        .from("cia_metas")
        .select("indicador, ano, mes, valor_meta")
        .eq("unidade", unidade);
      if (error) throw new Error(error.message);
      return (data ?? []).map((m) => ({ ...m, valor_meta: Number(m.valor_meta) })) as Meta[];
    },
    [],
    `getMetas(${unidade})`
  );
}

/**
 * Monta o painel completo da unidade. Para as Companhias, lê p1, p3 e motomec
 * e separa cada linha entre "da Cia" e "do batalhão" (cia=0), preservando o
 * indicador com prefixo de seção quando o mesmo nome existe em mais de uma
 * (não é o caso hoje, mas evita colisão silenciosa se um dia for).
 */
export async function getPainelCompanhia(unidade: Unidade): Promise<PainelCompanhia> {
  const cia = ciaNumerica(unidade);
  const secoes = unidade === "ft" ? ["ft"] : ["p1", "p3", "motomec"];

  const [dashboards, lancamentos, metas] = await Promise.all([
    Promise.all(secoes.map((s) => getSecaoDashboard(s))),
    getLancamentos(unidade),
    getMetas(unidade),
  ]);

  const todosFatos = dashboards.flatMap((d) => d.fatos);
  const arquivosFonte = dashboards.flatMap((d) => d.arquivosFonte);

  // FT: a seção inteira é a unidade (cia é sempre null), então não há recorte
  // a fazer. Companhias: a linha da Cia é cia === N; cia 0 ou null é o
  // consolidado do batalhão.
  const fatos = cia == null ? todosFatos : todosFatos.filter((f) => f.cia === cia);
  const fatosBatalhao =
    cia == null ? [] : todosFatos.filter((f) => f.cia == null || f.cia === 0);

  return {
    fatos,
    fatosBatalhao,
    arquivosFonte,
    lancamentos,
    metas,
    temDados: fatos.length > 0,
  };
}

/**
 * Comparativo das 5 unidades em um indicador, no recorte de ano/mês. As
 * Companhias saem de fato_secao.cia; a FT, que não tem número de Cia, entra
 * pela seção 'ft' quando o indicador existe lá.
 */
export function valorDaUnidade(
  fatos: LinhaFato[],
  indicador: string,
  cia: number | null,
  ano?: number,
  mes?: number
): number | null {
  const linhas = fatos.filter(
    (f) =>
      f.indicador === indicador &&
      (cia == null ? f.cia == null : f.cia === cia) &&
      (ano == null || f.ano === ano) &&
      (mes == null || f.mes === mes)
  );
  if (linhas.length === 0) return null;
  return linhas.reduce((soma, l) => soma + Number(l.valor), 0);
}
