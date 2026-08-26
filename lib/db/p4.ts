import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * Camada de leitura do módulo P4 · Logística.
 *
 * Segue o padrão das p2_* (tabelas dedicadas por domínio), e não o framework
 * genérico fato_secao/agregado_dimensional: o dado do P4 é item-a-item
 * (patrimônio, nº de série da arma, quem é o detentor), e agregá-lo em série
 * temporal perderia justamente o que a seção precisa consultar — qual arma
 * está com qual PM, qual colete vence quando.
 *
 * Fonte: Z:\16BPMM_EM\P4\P4 2026\ — ingerido por scripts/ingest_p4.py.
 */

export type KpiP4 = { fonte: string; dimensao: string; chave: string; valor: number };

export type ItemPatrimonio = {
  patrimonio: string;
  tipo_mat: string | null;
  nome_material: string | null;
  especificacao: string | null;
  valor: number | null;
  num_serie_arma: string | null;
  placa_vtr: string | null;
  detentor_nome: string | null;
};

export type ItemBelico = {
  unidade: string;
  categoria: string;
  tipo: string | null;
  calibre: string | null;
  num_serie: string | null;
  patrimonio: string | null;
  estado: string | null;
  re: string | null;
  nome: string | null;
  observacoes: string | null;
};

export type AtivoTelematica = {
  classe: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  patrimonio: string | null;
  num_serie: string | null;
  unidade: string | null;
  situacao: string | null;
  nome: string | null;
  quantidade: number | null;
};

export type MembroEfetivo = {
  posto_grad: string | null;
  re: string | null;
  nome: string;
  cia: string | null;
  situacao: string | null;
  funcao: string | null;
  antiguidade: number | null;
};

export type FotoInventario = {
  unidade: string;
  categoria: string | null;
  nome_arquivo: string;
  thumb_path: string | null;
  caminho_unc: string;
  largura: number | null;
  altura: number | null;
};

export type ItemInventarioSecao = {
  secao: string;
  patrimonio: string | null;
  nome_material: string | null;
  especificacao: string | null;
  valor: number | null;
};

export type DocumentoP4 = {
  categoria: string;
  subcategoria: string | null;
  nome_arquivo: string;
  extensao: string | null;
  caminho_unc: string;
  bytes: number | null;
  modificado_em: string | null;
};

export type ArquivoFonteP4 = {
  nome_arquivo: string;
  caminho_unc: string;
  tipo: string | null;
  linhas_reais: number | null;
  observacao: string | null;
  ingerido_em: string;
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db/p4] ${label} falhou, usando fallback:`, erro);
    return fallback;
  }
}

function unwrap<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

/** Todos os KPIs agregados do P4 — o dataset é pequeno (~60 linhas). */
export function getKpisP4(): Promise<KpiP4[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      return unwrap<KpiP4>(
        await c.from("p4_kpi_agregados").select("fonte, dimensao, chave, valor")
      );
    },
    [],
    "getKpisP4"
  );
}

/** Valor único de um KPI (fonte/dimensao/chave). */
export function kpi(kpis: KpiP4[], fonte: string, dimensao: string, chave: string): number | null {
  const l = kpis.find((k) => k.fonte === fonte && k.dimensao === dimensao && k.chave === chave);
  return l ? Number(l.valor) : null;
}

/**
 * Ranking de uma dimensão, já ordenado por valor decrescente — evita a
 * armadilha de ordenar por chave e fatiar depois (bug conhecido do p2-charts).
 */
export function ranking(
  kpis: KpiP4[],
  fonte: string,
  dimensao: string,
  topN?: number
): { chave: string; valor: number }[] {
  const r = kpis
    .filter((k) => k.fonte === fonte && k.dimensao === dimensao)
    .map((k) => ({ chave: k.chave, valor: Number(k.valor) }))
    .sort((a, b) => b.valor - a.valor);
  return topN ? r.slice(0, topN) : r;
}

/** Itens de maior valor do Livro de Carga — capa da página de inventário. */
export function getPatrimonioTop(limite = 100): Promise<ItemPatrimonio[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      return unwrap<ItemPatrimonio>(
        await c
          .from("p4_patrimonio")
          .select(
            "patrimonio, tipo_mat, nome_material, especificacao, valor, num_serie_arma, placa_vtr, detentor_nome"
          )
          .order("valor", { ascending: false })
          .limit(limite)
      );
    },
    [],
    "getPatrimonioTop"
  );
}

export function getMaterialBelico(unidade?: string): Promise<ItemBelico[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      let q = c
        .from("p4_material_belico")
        .select("unidade, categoria, tipo, calibre, num_serie, patrimonio, estado, re, nome, observacoes");
      // 'GERAL' é o consolidado do batalhão; sem filtro, mostrá-lo junto das
      // Cias duplicaria cada item. Por padrão devolvemos só o consolidado.
      q = unidade ? q.eq("unidade", unidade) : q.eq("unidade", "GERAL");
      return unwrap<ItemBelico>(await q.order("categoria").order("ordem").limit(5000));
    },
    [],
    "getMaterialBelico"
  );
}

/**
 * @param unidadeP4 Rótulo exato da coluna `unidade` das tabelas p4_* (ver
 * lib/unidades.ts:rotuloP4). Sem filtro, devolve tudo — inclui os blocos
 * administrativos sem Cia (CFP, CMT, COORDOP) que a planilha SISTEL mistura
 * com as Companhias, então o chamador que precisa SÓ da Cia deve sempre
 * passar o filtro.
 */
export function getTelematica(unidadeP4?: string): Promise<AtivoTelematica[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      let q = c
        .from("p4_telematica_ativos")
        .select("classe, tipo, marca, modelo, patrimonio, num_serie, unidade, situacao, nome, quantidade");
      if (unidadeP4) q = q.eq("unidade", unidadeP4);
      return unwrap<AtivoTelematica>(await q.order("classe").limit(3000));
    },
    [],
    "getTelematica"
  );
}

/** @param cia '1'..'4'|'ft'|'em' exatamente como gravado em p4_efetivo.cia (minúsculo). */
export function getEfetivoP4(cia?: string): Promise<MembroEfetivo[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      let q = c
        .from("p4_efetivo")
        .select("posto_grad, re, nome, cia, situacao, funcao, antiguidade");
      if (cia) q = q.eq("cia", cia);
      return unwrap<MembroEfetivo>(await q.order("ordem").limit(1000));
    },
    [],
    "getEfetivoP4"
  );
}

/** @param unidadeP4 Rótulo exato da coluna `unidade` (ver getTelematica). */
export function getFotosInventario(unidadeP4?: string): Promise<FotoInventario[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      let q = c
        .from("p4_fotos_inventario")
        .select("unidade, categoria, nome_arquivo, thumb_path, caminho_unc, largura, altura");
      if (unidadeP4) q = q.eq("unidade", unidadeP4);
      return unwrap<FotoInventario>(await q.order("unidade").order("categoria").limit(1000));
    },
    [],
    "getFotosInventario"
  );
}

export function getInventarioSecao(): Promise<ItemInventarioSecao[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      return unwrap<ItemInventarioSecao>(
        await c
          .from("p4_inventario_secao")
          .select("secao, patrimonio, nome_material, especificacao, valor")
          .order("secao")
          .limit(3000)
      );
    },
    [],
    "getInventarioSecao"
  );
}

export function getDocumentosP4(): Promise<DocumentoP4[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      return unwrap<DocumentoP4>(
        await c
          .from("p4_documentos")
          .select("categoria, subcategoria, nome_arquivo, extensao, caminho_unc, bytes, modificado_em")
          .order("categoria")
          .order("modificado_em", { ascending: false })
          .limit(2000)
      );
    },
    [],
    "getDocumentosP4"
  );
}

export function getArquivosFonteP4(): Promise<ArquivoFonteP4[]> {
  return safe(
    async () => {
      const c = createAdminClient();
      return unwrap<ArquivoFonteP4>(
        await c
          .from("p4_arquivos_fonte")
          .select("nome_arquivo, caminho_unc, tipo, linhas_reais, observacao, ingerido_em")
          .order("ingerido_em", { ascending: false })
      );
    },
    [],
    "getArquivosFonteP4"
  );
}

/** Formatação de moeda em pt-BR — usada nas capas de valor patrimoniado. */
export function brl(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
