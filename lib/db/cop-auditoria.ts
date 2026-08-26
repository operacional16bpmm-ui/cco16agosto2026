import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * Camada de leitura da Auditoria de COP (câmera operacional portátil).
 * Módulo próprio (não lib/db/secao.ts) porque a fonte é resposta crua de
 * formulário (cop_auditoria_respostas), não indicador agregado do framework
 * de seções — mesmo motivo documentado na migration 008.
 */

export type RespostaAuditoria = {
  data_auditoria: string;
  subunidade: string;
  auditou_video: boolean;
  quantidade_videos: number;
};

export type EfetivoSubunidade = {
  subunidade: string;
  efetivo: number;
};

export type AuditoriaDashboard = {
  respostas: RespostaAuditoria[];
  efetivos: EfetivoSubunidade[];
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db/cop-auditoria] ${label} falha na consulta, usando fallback:`, erro);
    return fallback;
  }
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function getAuditoriaDashboard(): Promise<AuditoriaDashboard> {
  return safe(
    async () => {
      const c = createAdminClient();
      const [respostasRes, efetivosRes] = await Promise.all([
        c
          .from("cop_auditoria_respostas")
          .select("data_auditoria, subunidade, auditou_video, quantidade_videos")
          .order("data_auditoria"),
        c.from("cop_auditoria_efetivo").select("subunidade, efetivo").order("subunidade"),
      ]);

      return {
        respostas: unwrap(respostasRes) ?? [],
        efetivos: unwrap(efetivosRes) ?? [],
      };
    },
    { respostas: [], efetivos: [] },
    "getAuditoriaDashboard"
  );
}

export type ResumoSubunidade = {
  subunidade: string;
  efetivo: number;
  meta: number;
  realizado: number;
  saldoRestante: number;
  percentualMeta: number;
};

/**
 * meta por subunidade = efetivo × 2 evidências mínimas por turno (Diretriz
 * PM3-001/02/25) × dias do período — aproximação combinada com o usuário,
 * não um número oficial de meta publicado. `dias` é o tamanho do recorte
 * (mês corrente por padrão, ver page.tsx) — mudar a janela muda a meta.
 */
const EVIDENCIAS_MIN_POR_TURNO = 2;

export function calcularResumoPorSubunidade(
  efetivos: EfetivoSubunidade[],
  respostas: RespostaAuditoria[],
  dias: number
): ResumoSubunidade[] {
  const realizadoPorSubunidade = new Map<string, number>();
  for (const r of respostas) {
    if (!r.auditou_video) continue;
    realizadoPorSubunidade.set(
      r.subunidade,
      (realizadoPorSubunidade.get(r.subunidade) ?? 0) + Number(r.quantidade_videos)
    );
  }

  return efetivos
    .map((e) => {
      const meta = Math.max(0, Math.round(e.efetivo * EVIDENCIAS_MIN_POR_TURNO * dias));
      const realizado = realizadoPorSubunidade.get(e.subunidade) ?? 0;
      return {
        subunidade: e.subunidade,
        efetivo: e.efetivo,
        meta,
        realizado,
        saldoRestante: Math.max(0, meta - realizado),
        percentualMeta: meta > 0 ? Math.round((realizado / meta) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.percentualMeta - a.percentualMeta);
}

/** Dias corridos do mês corrente (referência padrão da meta — ver page.tsx). */
export function diasNoMesCorrente(): number {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0)).getUTCDate();
}
