import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { derivarSenha, ITERACOES_PADRAO } from "@/lib/auth-usuarios";
import type { Perfil } from "@/lib/auth-simples";
import type { Unidade } from "@/lib/unidades";

/**
 * Gestão de contas do portal (usuarios_portal + usuarios_paginas, migrations
 * 019 e 023). É o que o script scripts/criar_usuario.mjs fazia no terminal,
 * agora disponível para o Comando dentro do site — mesmos parâmetros de hash,
 * para os dois caminhos nunca divergirem.
 */

export type UsuarioAdmin = {
  id: string;
  usuario: string;
  nome_exibicao: string;
  perfil: Perfil;
  unidade: Unidade | null;
  ativo: boolean;
  deve_trocar_senha: boolean;
  criado_em: string;
  ultimo_acesso_em: string | null;
  criado_por: string | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
  /** Rotas liberadas em usuarios_paginas. */
  rotas: string[];
};

function hex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Chave de acesso provisória: 14 caracteres de um alfabeto sem ambíguos
 * (0/O, 1/l/I), porque ela é ditada ou anotada em papel antes do primeiro
 * acesso. Mesmo alfabeto do script de terminal.
 */
export function chaveDeAcesso(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  if (!supabaseConfigurado()) return [];
  const c = createAdminClient();

  const { data, error } = await c
    .from("usuarios_portal")
    .select(
      "id, usuario, nome_exibicao, perfil, unidade, ativo, deve_trocar_senha, criado_em, ultimo_acesso_em, criado_por, atualizado_por, atualizado_em"
    )
    .order("perfil")
    .order("usuario");
  if (error) throw new Error(error.message);

  const { data: paginas, error: erroPaginas } = await c
    .from("usuarios_paginas")
    .select("usuario_id, rota");
  if (erroPaginas) throw new Error(erroPaginas.message);

  const porUsuario = new Map<string, string[]>();
  for (const p of paginas ?? []) {
    const lista = porUsuario.get(p.usuario_id) ?? [];
    lista.push(p.rota);
    porUsuario.set(p.usuario_id, lista);
  }

  return (data ?? []).map((u) => ({
    ...(u as Omit<UsuarioAdmin, "rotas">),
    rotas: porUsuario.get(u.id) ?? [],
  }));
}

/** Cria (ou recadastra) a conta com chave de acesso provisória. */
export async function criarUsuario(dados: {
  usuario: string;
  nome: string;
  perfil: Perfil;
  unidade: Unidade | null;
  operador: string;
}): Promise<{ chave: string; id: string }> {
  const c = createAdminClient();
  const chave = chaveDeAcesso();
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const senhaHash = await derivarSenha(chave, salt, ITERACOES_PADRAO);

  const { data, error } = await c
    .from("usuarios_portal")
    .insert({
      usuario: dados.usuario,
      senha_hash: senhaHash,
      senha_salt: salt,
      iteracoes: ITERACOES_PADRAO,
      nome_exibicao: dados.nome,
      perfil: dados.perfil,
      unidade: dados.unidade,
      ativo: true,
      deve_trocar_senha: true,
      criado_por: dados.operador,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return { chave, id: data.id as string };
}

/**
 * Gera nova chave de acesso para uma conta existente e derruba as sessões em
 * curso (sessao_versao + 1), para que uma senha trocada por perda de sigilo
 * não conviva com o cookie antigo ainda válido.
 */
export async function redefinirSenha(
  id: string,
  operador: string
): Promise<string> {
  const c = createAdminClient();
  const chave = chaveDeAcesso();
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const senhaHash = await derivarSenha(chave, salt, ITERACOES_PADRAO);

  const { error } = await c.rpc("incrementar_sessao_versao", { p_id: id });
  if (error) throw new Error(error.message);

  const { error: erroUpdate } = await c
    .from("usuarios_portal")
    .update({
      senha_hash: senhaHash,
      senha_salt: salt,
      iteracoes: ITERACOES_PADRAO,
      deve_trocar_senha: true,
      atualizado_por: operador,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (erroUpdate) throw new Error(erroUpdate.message);

  return chave;
}

/** Senha definida pelo próprio titular: encerra a pendência de troca. */
export async function trocarSenhaPropria(
  usuario: string,
  senhaNova: string
): Promise<void> {
  const c = createAdminClient();
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const senhaHash = await derivarSenha(senhaNova, salt, ITERACOES_PADRAO);

  const { error } = await c
    .from("usuarios_portal")
    .update({
      senha_hash: senhaHash,
      senha_salt: salt,
      iteracoes: ITERACOES_PADRAO,
      deve_trocar_senha: false,
      atualizado_por: usuario,
      atualizado_em: new Date().toISOString(),
    })
    .eq("usuario", usuario);
  if (error) throw new Error(error.message);
}

export async function definirAtivo(
  id: string,
  ativo: boolean,
  operador: string
): Promise<void> {
  const c = createAdminClient();
  // Desativar sem revogar deixaria a pessoa trabalhando até 12h com o cookie
  // já emitido: as duas coisas andam juntas.
  if (!ativo) {
    const { error } = await c.rpc("incrementar_sessao_versao", { p_id: id });
    if (error) throw new Error(error.message);
  }
  const { error } = await c
    .from("usuarios_portal")
    .update({ ativo, atualizado_por: operador, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Corta na hora toda sessão já emitida do usuário. */
export async function revogarSessoes(id: string, operador: string): Promise<void> {
  const c = createAdminClient();
  const { error } = await c.rpc("incrementar_sessao_versao", { p_id: id });
  if (error) throw new Error(error.message);
  const { error: erroUpdate } = await c
    .from("usuarios_portal")
    .update({ atualizado_por: operador, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (erroUpdate) throw new Error(erroUpdate.message);
}

/** Substitui o conjunto de páginas liberadas do usuário. */
export async function definirPaginas(
  id: string,
  rotas: string[],
  operador: string
): Promise<void> {
  const c = createAdminClient();
  const { error: erroDelete } = await c
    .from("usuarios_paginas")
    .delete()
    .eq("usuario_id", id);
  if (erroDelete) throw new Error(erroDelete.message);

  if (rotas.length > 0) {
    const { error } = await c.from("usuarios_paginas").insert(
      rotas.map((rota) => ({ usuario_id: id, rota, concedido_por: operador }))
    );
    if (error) throw new Error(error.message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registrarAuditoria(
  acao: string,
  id: string,
  detalhes: Record<string, unknown>,
  // Default preservado para os call sites de usuários; a tela de Autorizados
  // da COP grava na mesma trilha passando o próprio tipo de entidade.
  entityType = "usuarios_portal"
): Promise<void> {
  try {
    const c = createAdminClient();
    // entity_id é uuid na tabela (migration 006). Nem toda entidade é
    // identificada por uuid — a lista de autorizados da COP tem o email como
    // chave —, e mandar texto ali faz o insert falhar dentro do catch abaixo,
    // ou seja, some a trilha sem ninguém notar. Quando o id não for uuid, ele
    // vai para details.entity_ref, que é jsonb e aceita qualquer chave.
    const ehUuid = UUID.test(id);
    await c.from("audit_events").insert({
      action: acao,
      entity_type: entityType,
      entity_id: ehUuid ? id : null,
      details: ehUuid ? detalhes : { ...detalhes, entity_ref: id },
    });
  } catch (erro) {
    // Auditoria não pode derrubar a operação já concluída, mas o silêncio
    // total esconderia a falha da trilha: registra no log do servidor.
    console.error("[usuarios] falha ao registrar auditoria:", erro);
  }
}
