import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { registrarAuditoria } from "@/lib/db/usuarios";
import {
  COOKIE_ACESSO_COP,
  ROTA_ACESSO_COP,
  adminsDaEnv,
  constaNaLista,
  ehAdminCop,
  emailsAutorizadosDaEnv,
  verificarAssinaturaAcesso,
  type PayloadAcesso,
} from "@/lib/cop2026-acesso";

/**
 * Quem abre o Dashboard e o Briefing da Auditoria de COP 2026
 * (tabela cop2026_autorizados, migration 025).
 *
 * Três decisões que o código sozinho não explica:
 *
 * 1. A LISTA está no banco, mas QUEM ADMINISTRA está na variável de ambiente
 *    COP2026_ADMINS. É o que impede o administrador de se trancar do lado de
 *    fora ao se remover da lista por engano, e o que mantém a administração de
 *    pé com o Supabase fora do ar. Mesma doutrina da credencial de emergência
 *    do portal (CCO16_USUARIO/CCO16_SENHA, lib/auth-usuarios.ts).
 *
 * 2. Administrador também está autorizado ao painel, sem precisar constar na
 *    tabela — corolário de (1).
 *
 * 3. A env COP2026_EMAILS_AUTORIZADOS só vale enquanto a tabela NUNCA foi
 *    semeada (zero linhas, ativas ou não). É a ponte para o deploy não abrir
 *    com o painel trancado para os 14 que já tinham acesso. Depois da
 *    importação, tabela vazia significa "ninguém entra": lista vazia é
 *    decisão, não falha, e continuar caindo na env desfaria uma revogação.
 */

export type Autorizado = {
  email: string;
  nome: string | null;
  observacao: string | null;
  ativo: boolean;
  criado_por: string | null;
  criado_em: string | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
};

export type ListaAutorizados = {
  /** "banco" depois de semeada; "env" enquanto a tabela está zerada. */
  origem: "banco" | "env";
  itens: Autorizado[];
  /** Falha de leitura: a tela precisa dizer isso em vez de mostrar lista vazia. */
  erro: string | null;
};

const TABELA = "cop2026_autorizados";
const ENTIDADE = "cop2026_autorizados";

function daEnv(): Autorizado[] {
  return emailsAutorizadosDaEnv().map((email) => ({
    email,
    nome: null,
    observacao: null,
    ativo: true,
    criado_por: null,
    criado_em: null,
    atualizado_por: null,
    atualizado_em: null,
  }));
}

export function normalizarEmail(bruto: string): string {
  return bruto.trim().toLowerCase();
}

/** Mesmo formato do check do banco: o app recusa antes de a constraint estourar. */
export const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function listarAutorizados(): Promise<ListaAutorizados> {
  if (!supabaseConfigurado()) {
    return { origem: "env", itens: daEnv(), erro: null };
  }
  try {
    const c = createAdminClient();
    const { data, error } = await c
      .from(TABELA)
      .select("email, nome, observacao, ativo, criado_por, criado_em, atualizado_por, atualizado_em")
      .order("ativo", { ascending: false })
      .order("email", { ascending: true });
    if (error) throw new Error(error.message);

    const itens = (data ?? []) as Autorizado[];
    if (itens.length === 0) return { origem: "env", itens: daEnv(), erro: null };
    return { origem: "banco", itens, erro: null };
  } catch (erro) {
    console.error("[cop2026-autorizados] falha ao listar:", erro);
    // Fail-closed na leitura de administração: devolver a env aqui faria a
    // tela mostrar uma lista que não é a que está valendo.
    return { origem: "banco", itens: [], erro: "Não foi possível ler a lista de autorizados." };
  }
}

/**
 * A pergunta que o portão faz a cada requisição. Consulta o banco em vez de
 * reusar listarAutorizados() para não trazer a tabela inteira só para
 * responder sim ou não.
 */
export async function emailAutorizado(email: string): Promise<boolean> {
  const alvo = normalizarEmail(email);
  if (!alvo) return false;
  if (constaNaLista(alvo, adminsDaEnv())) return true;

  if (!supabaseConfigurado()) return constaNaLista(alvo, emailsAutorizadosDaEnv());

  try {
    const c = createAdminClient();
    const { data, error } = await c.from(TABELA).select("email, ativo");
    if (error) throw new Error(error.message);

    const linhas = (data ?? []) as { email: string; ativo: boolean }[];
    if (linhas.length === 0) return constaNaLista(alvo, emailsAutorizadosDaEnv());
    return constaNaLista(
      alvo,
      linhas.filter((l) => l.ativo).map((l) => l.email)
    );
  } catch (erro) {
    // Fail-closed: banco fora do ar não vira porta aberta. O administrador
    // continua entrando pela env, que é justamente o plano B.
    console.error("[cop2026-autorizados] falha ao verificar autorização:", erro);
    return false;
  }
}

/* ------------------------------------------------------------ sessão */

/**
 * Sessão da COP com a lista RECHECADA. É o gate real das páginas restritas: o
 * proxy.ts confere só a assinatura (roda na borda, sem banco), e é aqui que a
 * revogação passa a valer na hora, sem esperar o cookie de 12h vencer.
 */
export async function sessaoCop(): Promise<PayloadAcesso | null> {
  const biscoitos = await cookies();
  const sessao = await verificarAssinaturaAcesso(biscoitos.get(COOKIE_ACESSO_COP)?.value);
  if (!sessao) return null;
  if (!(await emailAutorizado(sessao.email))) return null;
  return sessao;
}

/** Gate das páginas restritas: fail-closed na própria página, e não só no proxy. */
export async function exigirAcessoCop(destino: string): Promise<PayloadAcesso> {
  const sessao = await sessaoCop();
  if (!sessao) redirect(`${ROTA_ACESSO_COP}?redirect=${encodeURIComponent(destino)}`);
  return sessao;
}

/**
 * Gate da tela de administração. Quem não é administrador leva 404, não 403:
 * a rota não confirma que existe para quem não pode abri-la.
 */
export async function exigirAdminCop(): Promise<PayloadAcesso> {
  const sessao = await exigirAcessoCop("/cop2026/admin");
  if (!ehAdminCop(sessao.email)) notFound();
  return sessao;
}

/* ----------------------------------------------------------- mutações */

function db() {
  if (!supabaseConfigurado()) {
    throw new Error("Banco não configurado — a lista de autorizados não pode ser alterada.");
  }
  return createAdminClient();
}

export async function adicionarAutorizado(dados: {
  email: string;
  nome: string | null;
  observacao: string | null;
  operador: string;
}): Promise<void> {
  const email = normalizarEmail(dados.email);
  const { error } = await db()
    .from(TABELA)
    // upsert e não insert: readicionar quem foi revogado é o caso comum, e
    // deve reativar a linha existente em vez de falhar por chave duplicada.
    .upsert(
      {
        email,
        nome: dados.nome,
        observacao: dados.observacao,
        ativo: true,
        criado_por: dados.operador,
        atualizado_por: dados.operador,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
  if (error) throw new Error(error.message);
  await registrarAuditoria("cop_autorizado_incluido", email, { ...dados, email }, ENTIDADE);
}

export async function definirAtivo(email: string, ativo: boolean, operador: string): Promise<void> {
  const alvo = normalizarEmail(email);
  const { error } = await db()
    .from(TABELA)
    .update({ ativo, atualizado_por: operador, atualizado_em: new Date().toISOString() })
    .eq("email", alvo);
  if (error) throw new Error(error.message);
  await registrarAuditoria(
    ativo ? "cop_autorizado_reativado" : "cop_autorizado_revogado",
    alvo,
    { email: alvo, operador },
    ENTIDADE
  );
}

export async function removerAutorizado(email: string, operador: string): Promise<void> {
  const alvo = normalizarEmail(email);
  const { error } = await db().from(TABELA).delete().eq("email", alvo);
  if (error) throw new Error(error.message);
  await registrarAuditoria("cop_autorizado_excluido", alvo, { email: alvo, operador }, ENTIDADE);
}

/**
 * Carga inicial a partir de COP2026_EMAILS_AUTORIZADOS. Idempotente por
 * construção (upsert com ignoreDuplicates), então clicar duas vezes não
 * ressuscita quem foi revogado depois da primeira importação.
 */
export async function importarDaEnv(operador: string): Promise<number> {
  const emails = emailsAutorizadosDaEnv();
  if (emails.length === 0) return 0;

  const agora = new Date().toISOString();
  const { data, error } = await db()
    .from(TABELA)
    .upsert(
      emails.map((email) => ({
        email,
        ativo: true,
        observacao: "Importado da variável de ambiente COP2026_EMAILS_AUTORIZADOS.",
        criado_por: operador,
        criado_em: agora,
      })),
      { onConflict: "email", ignoreDuplicates: true }
    )
    .select("email");
  if (error) throw new Error(error.message);

  const importados = (data ?? []).length;
  await registrarAuditoria("cop_autorizados_importados", "env", { importados, operador }, ENTIDADE);
  return importados;
}
