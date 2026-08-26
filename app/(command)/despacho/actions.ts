"use server";

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/auth-simples";
import { createAdminClient } from "@/lib/supabase/admin";

export async function validarDespachoAction(formData: FormData) {
  const sessao = await sessaoAtual();
  if (!sessao) return;

  const ocorrenciaId = String(formData.get("ocorrencia_id") ?? "");
  const viaturaId = String(formData.get("viatura_id") ?? "");
  const tempoSeg = formData.get("tempo_seg");
  const distanciaM = formData.get("distancia_m");
  if (!ocorrenciaId || !viaturaId) return;

  const supabase = createAdminClient();

  // validar_despacho() (migration 005) faz as 3 escritas — guarda da
  // ocorrência, guarda da viatura, insert do despacho — numa única chamada
  // de função, atômica: dois operadores validando a mesma ocorrência em
  // paralelo não conseguem mais duplicar o despacho nem empenhar 2 viaturas.
  const { error } = await supabase.rpc("validar_despacho", {
    p_ocorrencia_id: ocorrenciaId,
    p_viatura_id: viaturaId,
    p_operador: sessao.usuario,
    p_tempo_seg: tempoSeg ? Number(tempoSeg) : null,
    p_distancia_m: distanciaM ? Number(distanciaM) : null,
  });
  if (error) {
    console.error("[despacho] validar_despacho falhou:", error.message);
  }

  revalidatePath("/despacho");
  revalidatePath("/sala-operacoes");
  revalidatePath("/overview");
  revalidatePath("/logistica");
}
