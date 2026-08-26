"use server";

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/auth-simples";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmarAlertaAction(formData: FormData) {
  const sessao = await sessaoAtual();
  if (!sessao) return;

  const id = String(formData.get("id") ?? "");
  const resultado = String(formData.get("resultado") ?? "");
  if (!id || !["confirmado", "falso_positivo"].includes(resultado)) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("alertas_placa")
    .update({
      status: resultado,
      confirmacao_humana: resultado === "confirmado",
      confirmado_em: new Date().toISOString(),
      confirmado_por_usuario: sessao.usuario,
    })
    .eq("id", id)
    .eq("status", "pendente");

  // alertas_placa não tem trigger de auditoria (a RPC confirmar_alerta_placa
  // da migration 002 exige auth.uid()/Supabase Auth, que este app não usa) —
  // a confirmação/rejeição de um alerta de placa é decisão sensível o
  // bastante para precisar de trilha própria; gravamos explicitamente aqui.
  if (!error) {
    await supabase.from("audit_events").insert({
      action: "confirmar",
      entity_type: "alertas_placa",
      entity_id: id,
      details: { resultado, operador: sessao.usuario },
    });
  }

  revalidatePath("/alertas-placa");
}
