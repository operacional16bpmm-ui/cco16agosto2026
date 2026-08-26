"use server";

import { revalidatePath } from "next/cache";
import { exigirComando } from "@/lib/db/permissoes";
import {
  criarUsuario,
  definirAtivo,
  definirPaginas,
  redefinirSenha,
  registrarAuditoria,
  revogarSessoes,
} from "@/lib/db/usuarios";
import { ehRotaAdministravel } from "@/lib/paginas";
import { ehUnidadeValida, type Unidade } from "@/lib/unidades";
import type { Perfil } from "@/lib/auth-simples";

/**
 * Ações da tela de Usuários e Acessos. Toda ação chama exigirComando() na
 * primeira linha: a proteção da PÁGINA não protege a ação (server action é um
 * endpoint próprio, invocável direto por quem souber o identificador).
 */

export type UsuarioState = {
  ok: boolean;
  error: string | null;
  /** Chave de acesso recém-gerada, exibida UMA vez na tela do Comando. */
  chave?: { usuario: string; valor: string };
};

const PERFIS: Perfil[] = ["comando", "estado_maior", "cmt_cia", "secao"];
const ID_VALIDO = /^[0-9a-f-]{36}$/i;
/** Só letras minúsculas, números, ponto e traço: o login é ditado e digitado. */
const USUARIO_VALIDO = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export async function criarUsuarioAction(
  _prev: UsuarioState,
  formData: FormData
): Promise<UsuarioState> {
  const operador = await exigirComando();

  const usuario = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const nome = String(formData.get("nome") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "") as Perfil;
  const unidadeBruta = String(formData.get("unidade") ?? "");

  if (!USUARIO_VALIDO.test(usuario)) {
    return {
      ok: false,
      error: "Usuário deve ter de 3 a 32 caracteres, apenas minúsculas, números, ponto, traço e sublinhado.",
    };
  }
  if (nome.length < 3) return { ok: false, error: "Informe o nome de exibição (posto e nome de guerra)." };
  if (!PERFIS.includes(perfil)) return { ok: false, error: "Perfil inválido." };

  const unidade: Unidade | null =
    unidadeBruta && ehUnidadeValida(unidadeBruta) ? (unidadeBruta as Unidade) : null;
  if (perfil === "cmt_cia" && !unidade) {
    return { ok: false, error: "Comandante de Companhia exige a unidade." };
  }

  try {
    const { chave, id } = await criarUsuario({ usuario, nome, perfil, unidade, operador: operador.usuario });
    await registrarAuditoria("usuario_criado", id, {
      usuario,
      perfil,
      unidade,
      operador: operador.usuario,
    });
    revalidatePath("/administrativo/usuarios");
    return { ok: true, error: null, chave: { usuario, valor: chave } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("[usuarios] criar:", e);
    if (msg.includes("duplicate key")) {
      return { ok: false, error: `Já existe conta com o usuário "${usuario}".` };
    }
    return { ok: false, error: "Não foi possível criar a conta." };
  }
}

export async function redefinirSenhaAction(
  _prev: UsuarioState,
  formData: FormData
): Promise<UsuarioState> {
  const operador = await exigirComando();
  const id = String(formData.get("id") ?? "");
  const usuario = String(formData.get("usuario") ?? "");
  if (!ID_VALIDO.test(id)) return { ok: false, error: "Conta inválida." };

  try {
    const chave = await redefinirSenha(id, operador.usuario);
    await registrarAuditoria("usuario_senha_redefinida", id, {
      usuario,
      operador: operador.usuario,
    });
    revalidatePath("/administrativo/usuarios");
    return { ok: true, error: null, chave: { usuario, valor: chave } };
  } catch (e) {
    console.error("[usuarios] redefinir:", e);
    return { ok: false, error: "Não foi possível gerar nova chave de acesso." };
  }
}

export async function alternarAtivoAction(
  _prev: UsuarioState,
  formData: FormData
): Promise<UsuarioState> {
  const operador = await exigirComando();
  const id = String(formData.get("id") ?? "");
  const usuario = String(formData.get("usuario") ?? "");
  const ativar = String(formData.get("ativar") ?? "") === "1";
  if (!ID_VALIDO.test(id)) return { ok: false, error: "Conta inválida." };

  // O Comando não pode desativar a própria conta e se trancar para fora.
  if (!ativar && usuario === operador.usuario) {
    return { ok: false, error: "Não é possível desativar a própria conta." };
  }

  try {
    await definirAtivo(id, ativar, operador.usuario);
    await registrarAuditoria(ativar ? "usuario_ativado" : "usuario_desativado", id, {
      usuario,
      operador: operador.usuario,
    });
    revalidatePath("/administrativo/usuarios");
    return { ok: true, error: null };
  } catch (e) {
    console.error("[usuarios] alternarAtivo:", e);
    return { ok: false, error: "Não foi possível alterar a situação da conta." };
  }
}

export async function revogarSessoesAction(
  _prev: UsuarioState,
  formData: FormData
): Promise<UsuarioState> {
  const operador = await exigirComando();
  const id = String(formData.get("id") ?? "");
  const usuario = String(formData.get("usuario") ?? "");
  if (!ID_VALIDO.test(id)) return { ok: false, error: "Conta inválida." };

  try {
    await revogarSessoes(id, operador.usuario);
    await registrarAuditoria("usuario_sessoes_revogadas", id, {
      usuario,
      operador: operador.usuario,
    });
    revalidatePath("/administrativo/usuarios");
    return { ok: true, error: null };
  } catch (e) {
    console.error("[usuarios] revogar:", e);
    return { ok: false, error: "Não foi possível revogar as sessões." };
  }
}

export async function salvarPaginasAction(
  _prev: UsuarioState,
  formData: FormData
): Promise<UsuarioState> {
  const operador = await exigirComando();
  const id = String(formData.get("id") ?? "");
  const usuario = String(formData.get("usuario") ?? "");
  if (!ID_VALIDO.test(id)) return { ok: false, error: "Conta inválida." };

  // Só rotas do catálogo entram: um campo forjado no formulário não consegue
  // conceder uma rota fora dele (a gestão de acessos, por exemplo).
  const rotas = formData
    .getAll("rota")
    .map((r) => String(r))
    .filter((r) => ehRotaAdministravel(r));

  try {
    await definirPaginas(id, rotas, operador.usuario);
    await registrarAuditoria("usuario_paginas_definidas", id, {
      usuario,
      rotas,
      operador: operador.usuario,
    });
    revalidatePath("/administrativo/usuarios");
    return { ok: true, error: null };
  } catch (e) {
    console.error("[usuarios] salvarPaginas:", e);
    return { ok: false, error: "Não foi possível salvar as páginas liberadas." };
  }
}
