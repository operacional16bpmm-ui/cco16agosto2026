import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/** Camada de leitura do reconhecimento/mérito do P5 (migration 011) —
 * complementa comunicacao_* (lib/db.ts) sem substituí-la. */

export type P5Reconhecimento = {
  lmpTotalAno: number;
  agraciadosTotalAno: number;
  indicadosTotalAno: number;
  campanhasRecentes: { campanha: string; ano: number; mes: number | null; quantidade: number }[];
  temDados: boolean;
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error("[db/p5] falha na consulta, usando fallback:", erro);
    return fallback;
  }
}

export function getP5Reconhecimento(): Promise<P5Reconhecimento> {
  return safe(
    async () => {
      const c = createAdminClient();
      const anoAtual = new Date().getFullYear();
      const [lmpRes, agraciadosRes, indicadosRes, campanhasRes] = await Promise.all([
        c.from("p5_lmp").select("quantidade, ano").eq("ano", anoAtual),
        c.from("p5_agraciados").select("ano").eq("ano", anoAtual),
        c.from("p5_indicados").select("ano").eq("ano", anoAtual),
        c
          .from("p5_campanhas")
          .select("campanha, ano, mes, quantidade")
          .order("ano", { ascending: false })
          .order("mes", { ascending: false })
          .limit(6),
      ]);

      const lmp = lmpRes.data ?? [];
      const agraciados = agraciadosRes.data ?? [];
      const indicados = indicadosRes.data ?? [];
      const campanhas = campanhasRes.data ?? [];

      return {
        lmpTotalAno: lmp.reduce((soma, l) => soma + (l.quantidade ?? 1), 0),
        agraciadosTotalAno: agraciados.length,
        indicadosTotalAno: indicados.length,
        campanhasRecentes: campanhas,
        temDados: lmp.length > 0 || agraciados.length > 0 || indicados.length > 0 || campanhas.length > 0,
      };
    },
    { lmpTotalAno: 0, agraciadosTotalAno: 0, indicadosTotalAno: 0, campanhasRecentes: [], temDados: false }
  );
}
