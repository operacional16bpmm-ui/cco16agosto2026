import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { METAS_PADRAO_2026, type MetaSubunidade } from "@/lib/cop2026";

/**
 * Metas e efetivo por período — a aba "Parametros" da planilha, agora no banco
 * (`cop_auditoria_parametro`, migration 026).
 *
 * Por que isto existe: hoje `calcularPainel()` faz `metaBase = mat ? mat.meta :
 * m.meta`, ou seja, a `MATRIZ_PROPORCIONAL_2026` hardcoded VENCE a planilha.
 * Editar meta era editar código e esperar deploy — e qualquer tela de "editar
 * metas" que não passasse por aqui estaria mentindo para o Comando.
 *
 * A semente da migration é a matriz EXATA (960 evidências / 570 PMs), para que
 * nenhum número da tela mude no dia da virada.
 */

const TABELA = "cop_auditoria_parametro";

export type Parametro = MetaSubunidade & {
  periodo: string;
  metasSemanais: number[];
  atualizadoPor: string | null;
  atualizadoEm: string | null;
};

type Linha = {
  periodo: string;
  subunidade: string;
  efetivo: number;
  evidencias_por_turno: number;
  turnos: number;
  dias: number;
  meta: number;
  metas_semanais: number[] | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
};

function paraParametro(l: Linha): Parametro {
  return {
    periodo: l.periodo,
    subunidade: l.subunidade,
    efetivo: l.efetivo,
    evidenciasPorTurno: l.evidencias_por_turno,
    turnos: l.turnos,
    dias: l.dias,
    meta: l.meta,
    metasSemanais: l.metas_semanais ?? [],
    atualizadoPor: l.atualizado_por,
    atualizadoEm: l.atualizado_em,
  };
}

/** `2026-09` a partir de uma data ISO. O período é o MÊS: a meta de 960 é
 *  mensal, e somar dois meses no mesmo denominador já passou de 100% uma vez. */
export function periodoDe(dataIso: string): string {
  return dataIso.slice(0, 7);
}

export async function lerParametros(periodo: string): Promise<Parametro[]> {
  if (!supabaseConfigurado()) return [];
  try {
    const { data, error } = await createAdminClient()
      .from(TABELA)
      .select("*")
      .eq("periodo", periodo);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Linha[]).map(paraParametro);
  } catch (erro) {
    console.error("[cop2026-parametros] falha ao ler:", erro);
    return [];
  }
}

/**
 * Metas do período no formato que o painel já consome. Sem linha no banco, cai
 * em `METAS_PADRAO_2026` — nunca em zero: meta zerada faria toda fração
 * aparecer em superação, que é o erro mais caro que este painel pode cometer.
 */
export async function lerMetas(periodo: string): Promise<MetaSubunidade[]> {
  const parametros = await lerParametros(periodo);
  if (parametros.length === 0) return METAS_PADRAO_2026;
  return parametros.map(({ subunidade, efetivo, evidenciasPorTurno, turnos, dias, meta }) => ({
    subunidade,
    efetivo,
    evidenciasPorTurno,
    turnos,
    dias,
    meta,
  }));
}

export async function salvarParametro(
  entrada: {
    periodo: string;
    subunidade: string;
    efetivo: number;
    evidenciasPorTurno: number;
    turnos: number;
    dias: number;
    meta: number;
  },
  operador: string
): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABELA)
    .upsert(
      {
        periodo: entrada.periodo,
        subunidade: entrada.subunidade,
        efetivo: entrada.efetivo,
        evidencias_por_turno: entrada.evidenciasPorTurno,
        turnos: entrada.turnos,
        dias: entrada.dias,
        // A meta é gravada como veio da tela, e não recalculada: ela é decisão
        // do Comando (a matriz de 960 tem rateio e arredondamento próprios),
        // não o produto efetivo × evidências × turnos.
        meta: entrada.meta,
        atualizado_por: operador,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "periodo,subunidade" }
    );
  if (error) throw new Error(error.message);
}
