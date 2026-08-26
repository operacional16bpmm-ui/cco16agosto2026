"use server";

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/auth-simples";
import { createAdminClient } from "@/lib/supabase/admin";

export type CameraState = { ok: boolean; error: string | null };

export async function createCameraAction(
  _prev: CameraState,
  formData: FormData
): Promise<CameraState> {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return { ok: false, error: "Sessão inválida. Faça login novamente." };
  }

  const identificacao = String(formData.get("identificacao") ?? "").trim();
  const origem = String(formData.get("origem") ?? "");
  const endereco = String(formData.get("endereco") ?? "").trim();
  const contato = String(formData.get("contato") ?? "").trim();
  const temOcr = formData.get("tem_ocr") === "on";

  if (identificacao.length < 2 || endereco.length < 3) {
    return { ok: false, error: "Preencha identificação e endereço." };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("cameras").insert({
      identificacao,
      origem,
      natureza: origem === "muralha" || origem === "smart_sampa" ? "publica" : "privada",
      endereco,
      contato_responsavel: contato || null,
      tem_ocr: temOcr,
      status: "proposta",
      // created_by (uuid) fica NULL — este app não usa Supabase Auth. O
      // operador do login simples fica registrado aqui em texto.
      criado_por_usuario: sessao.usuario,
    });
    if (error) return { ok: false, error: "Não foi possível cadastrar a câmera." };
  } catch {
    return { ok: false, error: "Serviço de dados indisponível." };
  }
  // Sem isso, a câmera cadastrada "com sucesso" não aparecia na lista ao
  // lado até um F5 — o payload RSC da rota não era refeito após a mutação.
  revalidatePath("/cameras");
  return { ok: true, error: null };
}
