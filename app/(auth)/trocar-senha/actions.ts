"use server";

import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/auth-simples";
import { autenticar } from "@/lib/auth-usuarios";
import { trocarSenhaPropria } from "@/lib/db/usuarios";
import { rotaInicialPermitida } from "@/lib/db/permissoes";

export type TrocaState = { error: string | null };

/**
 * Troca da chave de acesso provisória pela senha pessoal do titular.
 *
 * Exige a chave atual mesmo já havendo sessão: o cookie prova que ALGUÉM
 * entrou com a chave provisória, não que quem está no teclado agora é o
 * titular (a chave circula em papel até este momento). A conferência reusa
 * autenticar(), então segue o mesmo PBKDF2 e a mesma comparação constante do
 * login, sem caminho de verificação paralelo.
 */
export async function trocarSenhaAction(
  _prev: TrocaState,
  formData: FormData
): Promise<TrocaState> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (nova.length < 10) {
    return { error: "A nova senha precisa ter ao menos 10 caracteres." };
  }
  if (nova !== confirmacao) {
    return { error: "A confirmação não confere com a nova senha." };
  }
  if (nova === atual) {
    return { error: "A nova senha precisa ser diferente da chave de acesso recebida." };
  }

  const conferida = await autenticar(sessao.usuario, atual);
  if (!conferida) {
    return { error: "Chave de acesso atual incorreta." };
  }

  try {
    await trocarSenhaPropria(sessao.usuario, nova);
  } catch (e) {
    console.error("[trocar-senha]:", e);
    return { error: "Não foi possível salvar a nova senha." };
  }

  redirect(await rotaInicialPermitida(sessao));
}
