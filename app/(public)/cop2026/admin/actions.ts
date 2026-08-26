"use server";

import { revalidatePath } from "next/cache";
import {
  EMAIL_VALIDO,
  adicionarAutorizado,
  definirAtivo,
  exigirAdminCop,
  importarDaEnv,
  normalizarEmail,
  removerAutorizado,
} from "@/lib/db/cop2026-autorizados";

/**
 * Ações da tela de Autorizados da COP 2026. Toda ação chama exigirAdminCop()
 * na primeira linha, pelo mesmo motivo da tela de Usuários: a proteção da
 * PÁGINA não protege a ação — server action é um endpoint próprio, invocável
 * direto por quem souber o identificador.
 */

export type AutorizadoState = {
  ok: boolean;
  error: string | null;
  aviso: string | null;
};

const ROTA = "/cop2026/admin";
const vazio: AutorizadoState = { ok: false, error: null, aviso: null };

function falha(error: string): AutorizadoState {
  return { ...vazio, error };
}

export async function incluirAutorizadoAction(
  _prev: AutorizadoState,
  formData: FormData
): Promise<AutorizadoState> {
  const admin = await exigirAdminCop();

  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const nome = String(formData.get("nome") ?? "").trim() || null;
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  if (!EMAIL_VALIDO.test(email)) return falha("Informe um e-mail válido.");

  try {
    await adicionarAutorizado({ email, nome, observacao, operador: admin.email });
    revalidatePath(ROTA);
    return {
      ok: true,
      error: null,
      // O gate é o Google: endereço que não é conta Google entra na lista e
      // mesmo assim não abre o painel. Vale avisar na hora, não na hora do erro.
      aviso: email.endsWith("@gmail.com")
        ? null
        : `${email} só entrará se existir uma conta Google com esse endereço.`,
    };
  } catch (e) {
    console.error("[cop2026-admin] incluir:", e);
    return falha("Não foi possível incluir o e-mail.");
  }
}

export async function alternarAtivoAction(
  _prev: AutorizadoState,
  formData: FormData
): Promise<AutorizadoState> {
  const admin = await exigirAdminCop();

  const email = normalizarEmail(String(formData.get("email") ?? ""));
  const ativar = String(formData.get("ativar") ?? "") === "1";
  if (!EMAIL_VALIDO.test(email)) return falha("E-mail inválido.");

  try {
    await definirAtivo(email, ativar, admin.email);
    revalidatePath(ROTA);
    return { ok: true, error: null, aviso: null };
  } catch (e) {
    console.error("[cop2026-admin] alternar ativo:", e);
    return falha("Não foi possível alterar a situação do e-mail.");
  }
}

export async function excluirAutorizadoAction(
  _prev: AutorizadoState,
  formData: FormData
): Promise<AutorizadoState> {
  const admin = await exigirAdminCop();

  const email = normalizarEmail(String(formData.get("email") ?? ""));
  if (!EMAIL_VALIDO.test(email)) return falha("E-mail inválido.");

  try {
    await removerAutorizado(email, admin.email);
    revalidatePath(ROTA);
    return { ok: true, error: null, aviso: null };
  } catch (e) {
    console.error("[cop2026-admin] excluir:", e);
    return falha("Não foi possível excluir o e-mail.");
  }
}

export async function importarDaEnvAction(
  _prev: AutorizadoState,
  _formData: FormData
): Promise<AutorizadoState> {
  const admin = await exigirAdminCop();

  try {
    const importados = await importarDaEnv(admin.email);
    revalidatePath(ROTA);
    if (importados === 0) {
      return { ...vazio, ok: true, aviso: "Nada a importar: a lista já estava no banco." };
    }
    return {
      ok: true,
      error: null,
      aviso: `${importados} e-mail${importados > 1 ? "s" : ""} importado${importados > 1 ? "s" : ""} da variável de ambiente. A lista agora vale a partir do banco.`,
    };
  } catch (e) {
    console.error("[cop2026-admin] importar:", e);
    return falha("Não foi possível importar a lista.");
  }
}
