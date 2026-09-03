"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { listarBatalhoes, listarFracoes, nomearCpa } from "@/lib/db/cop2026-unidade";

/**
 * Ações da tela de Unidades. Toda ação chama `exigirAdminCop()` na PRIMEIRA
 * linha — pelo mesmo motivo já registrado em `admin/actions.ts`: a proteção da
 * página não protege a ação. Server action é endpoint próprio, invocável direto
 * por quem souber o identificador.
 */

export type UnidadeState = { ok: boolean; erro: string | null; aviso: string | null };

const ROTA = "/cop2026/admin/unidades";
const VAZIO: UnidadeState = { ok: false, erro: null, aviso: null };

export async function nomearCpaAction(
  _prev: UnidadeState,
  formData: FormData
): Promise<UnidadeState> {
  const admin = await exigirAdminCop();

  const cod = String(formData.get("cod") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();

  /* O código vem do formulário, então é entrada de usuário: confere o formato
     antes de tocar no banco. Três dígitos é o que a migration 029 define para
     comando pai — qualquer outra coisa é tentativa de renomear outra linha. */
  if (!/^\d{3}$/.test(cod)) return { ...VAZIO, erro: "Código de comando inválido." };

  const r = await nomearCpa(cod, nome, admin.email);
  if (!r.ok) return { ...VAZIO, erro: r.erro };

  revalidatePath(ROTA);
  return { ok: true, erro: null, aviso: `Comando ${cod} agora é "${nome}".` };
}

/** Carrega os batalhões de um CPA sob demanda — a árvore inteira são 3.895 nós. */
export async function batalhoesDoCpaAction(codCpa: string) {
  await exigirAdminCop();
  if (!/^\d{3}$/.test(codCpa)) return [];
  return listarBatalhoes(codCpa);
}

/** Idem para as frações de um batalhão. */
export async function fracoesDoBatalhaoAction(codBatalhao: string) {
  await exigirAdminCop();
  if (!/^\d{5}$/.test(codBatalhao)) return [];
  return listarFracoes(codBatalhao);
}
