import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * Camada de leitura da SPJMD — tabelas dedicadas (spjmd_processos, spjmd_ipm,
 * spjmd_acervo_contagem), não o framework genérico fato_secao: por decisão
 * do usuário (2026-07-19) a página mostra detalhe completo (não só
 * agregados) para qualquer usuário autenticado do portal.
 */

export type SpjmdProcesso = {
  numerador: string | null;
  origem: string | null;
  encaminhado_para: string | null;
  natureza: string | null;
  prioridade: string | null;
  dias_parado: number | null;
  dias_prazo_vencido: number | null;
  status: string | null;
};

export type SpjmdIpm = {
  numero_ipm: string | null;
  ano: number | null;
  tipo: string | null;
  encarregado: string | null;
  situacao: string | null;
  dias_atraso: number | null;
};

export type SpjmdAcervo = {
  subarea: string;
  ano: number | null;
  quantidade_arquivos: number;
};

export type SpjmdArquivoFonte = {
  dataset: string;
  nome_arquivo: string;
  caminho_unc: string;
  linhas_reais: number | null;
  ingerido_em: string;
};

export type SpjmdOverview = {
  processos: SpjmdProcesso[];
  ipm: SpjmdIpm[];
  acervo: SpjmdAcervo[];
  arquivosFonte: SpjmdArquivoFonte[];
  temDados: boolean;
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db/spjmd] ${label} falha na consulta, usando fallback:`, erro);
    return fallback;
  }
}

export function getSpjmdOverview(): Promise<SpjmdOverview> {
  return safe(
    async () => {
      const c = createAdminClient();
      const [processosRes, ipmRes, acervoRes, fontesRes] = await Promise.all([
        c
          .from("spjmd_processos")
          .select("numerador, origem, encaminhado_para, natureza, prioridade, dias_parado, dias_prazo_vencido, status")
          .order("dias_prazo_vencido", { ascending: false, nullsFirst: false })
          .limit(500),
        c
          .from("spjmd_ipm")
          .select("numero_ipm, ano, tipo, encarregado, situacao, dias_atraso")
          .order("ano", { ascending: false })
          .limit(500),
        c.from("spjmd_acervo_contagem").select("subarea, ano, quantidade_arquivos"),
        c
          .from("spjmd_arquivos_fonte")
          .select("dataset, nome_arquivo, caminho_unc, linhas_reais, ingerido_em")
          .order("ingerido_em", { ascending: false }),
      ]);

      if (processosRes.error) throw new Error(processosRes.error.message);
      if (ipmRes.error) throw new Error(ipmRes.error.message);
      if (acervoRes.error) throw new Error(acervoRes.error.message);
      if (fontesRes.error) throw new Error(fontesRes.error.message);

      const processos = processosRes.data ?? [];
      const ipm = ipmRes.data ?? [];
      const acervo = acervoRes.data ?? [];
      const arquivosFonte = fontesRes.data ?? [];

      return {
        processos,
        ipm,
        acervo,
        arquivosFonte,
        temDados: processos.length > 0 || ipm.length > 0 || acervo.length > 0,
      };
    },
    { processos: [], ipm: [], acervo: [], arquivosFonte: [], temDados: false },
    "getSpjmdOverview"
  );
}

export function kpiProcessosVencidos(processos: SpjmdProcesso[]): number {
  return processos.filter((p) => (p.dias_prazo_vencido ?? 0) > 0).length;
}

export function kpiIpmEmAndamento(ipm: SpjmdIpm[]): number {
  return ipm.filter((i) => (i.situacao ?? "").toLowerCase().includes("andamento")).length;
}

export function acervoTotal(acervo: SpjmdAcervo[]): number {
  return acervo.reduce((soma, a) => soma + a.quantidade_arquivos, 0);
}

export function acervoPorSubarea(acervo: SpjmdAcervo[]): { chave: string; valor: number }[] {
  const porSub = new Map<string, number>();
  for (const a of acervo) {
    porSub.set(a.subarea, (porSub.get(a.subarea) ?? 0) + a.quantidade_arquivos);
  }
  return Array.from(porSub.entries())
    .map(([chave, valor]) => ({ chave, valor }))
    .sort((a, b) => b.valor - a.valor);
}
