"use server";

import { revalidatePath } from "next/cache";

import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { importarMes, type ResultadoImportacao } from "@/lib/db/cop2026-importacao";

/**
 * Importação da planilha, disparada da tela de admin.
 *
 * `exigirAdminCop()` na PRIMEIRA linha, pelo mesmo motivo das demais ações da
 * COP: server action é um endpoint próprio e invocável direto — a proteção da
 * página não protege a ação. Aqui isso pesa mais que no resto, porque esta
 * ação escreve em lote na tabela que sustenta o painel do Comando.
 */
export async function importarMesAction(
  _prev: ResultadoImportacao | null,
  formData: FormData
): Promise<ResultadoImportacao> {
  await exigirAdminCop();

  const chave = String(formData.get("mes") ?? "");
  const simular = String(formData.get("acao") ?? "") !== "gravar";

  const resultado = await importarMes(chave, { simular });

  // Só o que grava invalida cache: a simulação não mudou nada.
  if (!simular && resultado.ok) {
    revalidatePath("/cop2026/admin/importar");
    revalidatePath("/cop2026/admin/lancamentos");
    revalidatePath("/cop2026/dashboard");
    revalidatePath("/cop2026/briefing");
  }

  return resultado;
}
