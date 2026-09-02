"use server";

import { revalidatePath } from "next/cache";

import { subunidadeValida } from "@/lib/cop2026-lancamento";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { excluirLancamento, reclassificarSubunidade } from "@/lib/db/cop2026-lancamentos";
import { confirmarVinculo, bloquearVinculo } from "@/lib/db/cop2026-auditor";
import { salvarParametro } from "@/lib/db/cop2026-parametros";
import { gravarJanelaAtencaoDias } from "@/lib/cop2026-config-atencao";
import { JANELA_ATENCAO_MAX_DIAS, JANELA_ATENCAO_MIN_DIAS } from "@/lib/cop2026-metricas";

/**
 * Manejo dos lançamentos, da fila de vínculos e das metas.
 *
 * `exigirAdminCop()` na PRIMEIRA linha de cada ação, sempre: a proteção da
 * página não protege a ação — server action é endpoint próprio, invocável por
 * quem souber o identificador. Mesma doutrina da tela de Autorizados.
 */

export type ManejoState = { ok: boolean; error: string | null; aviso: string | null };

const vazio: ManejoState = { ok: false, error: null, aviso: null };
const ROTA = "/cop2026/admin/lancamentos";

function falha(error: string): ManejoState {
  return { ...vazio, error };
}

function revalidarPaineis() {
  revalidatePath(ROTA);
  revalidatePath("/cop2026");
  revalidatePath("/cop2026/dashboard");
}

export async function excluirLancamentoAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  const admin = await exigirAdminCop();

  const id = String(formData.get("id") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!id) return falha("Lançamento não informado.");
  // Motivo obrigatório: exclusão sem motivo é exatamente o registro que um
  // processo disciplinar vai perguntar e ninguém vai saber responder.
  if (motivo.length < 5) return falha("Informe o motivo da exclusão.");

  try {
    await excluirLancamento(id, motivo, admin.email);
    revalidarPaineis();
    return {
      ok: true,
      error: null,
      aviso:
        "Lançamento excluído. Os identificadores dele voltaram a ficar disponíveis para relançamento.",
    };
  } catch (e) {
    console.error("[cop2026-admin] excluir lançamento:", e);
    return falha("Não foi possível excluir o lançamento.");
  }
}

export async function reclassificarAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  const admin = await exigirAdminCop();

  const id = String(formData.get("id") ?? "").trim();
  const subunidade = String(formData.get("subunidade") ?? "").trim();
  if (!id) return falha("Lançamento não informado.");
  if (!subunidadeValida(subunidade)) return falha("Fração inválida.");

  try {
    await reclassificarSubunidade(id, subunidade, admin.email);
    revalidarPaineis();
    return { ...vazio, ok: true };
  } catch (e) {
    console.error("[cop2026-admin] reclassificar:", e);
    return falha("Não foi possível reclassificar a fração.");
  }
}

export async function confirmarVinculoAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  const admin = await exigirAdminCop();

  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return falha("E-mail inválido.");

  try {
    await confirmarVinculo(email, admin.email);
    revalidatePath("/cop2026/admin/auditores");
    revalidarPaineis();
    return { ...vazio, ok: true };
  } catch (e) {
    console.error("[cop2026-admin] confirmar vínculo:", e);
    return falha("Não foi possível confirmar o vínculo.");
  }
}

export async function bloquearVinculoAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  const admin = await exigirAdminCop();

  const email = String(formData.get("email") ?? "").trim();
  const bloquear = String(formData.get("bloquear") ?? "") === "1";
  if (!email.includes("@")) return falha("E-mail inválido.");

  try {
    await bloquearVinculo(email, bloquear, admin.email);
    revalidatePath("/cop2026/admin/auditores");
    revalidarPaineis();
    return { ...vazio, ok: true };
  } catch (e) {
    console.error("[cop2026-admin] bloquear vínculo:", e);
    return falha("Não foi possível alterar o vínculo.");
  }
}

export async function salvarParametroAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  const admin = await exigirAdminCop();

  const numero = (campo: string) => Number.parseInt(String(formData.get(campo) ?? "0"), 10) || 0;
  const periodo = String(formData.get("periodo") ?? "").trim();
  const subunidade = String(formData.get("subunidade") ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(periodo)) return falha("Período inválido (use AAAA-MM).");
  if (!subunidadeValida(subunidade) || subunidade === "outros") {
    return falha("Fração inválida.");
  }

  const meta = numero("meta");
  if (meta <= 0) return falha("A meta precisa ser maior que zero.");

  try {
    await salvarParametro(
      {
        periodo,
        subunidade,
        efetivo: numero("efetivo"),
        evidenciasPorTurno: numero("evidenciasPorTurno"),
        turnos: numero("turnos"),
        dias: numero("dias"),
        meta,
      },
      admin.email
    );
    revalidatePath("/cop2026/admin/parametros");
    revalidarPaineis();
    return {
      ok: true,
      error: null,
      // A meta só muda o painel quando a fonte é o banco — dizer isso aqui
      // evita a conclusão errada de que "editar não funcionou".
      aviso:
        "Meta gravada. Ela passa a valer no painel quando COP2026_FONTE estiver em `banco` ou `uniao`.",
    };
  } catch (e) {
    console.error("[cop2026-admin] salvar parâmetro:", e);
    return falha("Não foi possível gravar a meta.");
  }
}

/**
 * Janela em DIAS para caracterizar padrão de desvio na caixa "Pontos de
 * atenção". Determinação do Comando em 02/09/2026: um lançamento isolado não é
 * padrão, e a janela mínima para virar ponto de atenção é uma semana. Guardado
 * em cookie — ver `lib/cop2026-config-atencao.ts`.
 */
export async function salvarJanelaAtencaoAction(
  _prev: ManejoState,
  formData: FormData
): Promise<ManejoState> {
  await exigirAdminCop();
  const dias = Number.parseInt(String(formData.get("janelaAtencaoDias") ?? "0"), 10);
  if (
    !Number.isInteger(dias) ||
    dias < JANELA_ATENCAO_MIN_DIAS ||
    dias > JANELA_ATENCAO_MAX_DIAS
  ) {
    return falha(
      `Informe um número entre ${JANELA_ATENCAO_MIN_DIAS} e ${JANELA_ATENCAO_MAX_DIAS} dias.`
    );
  }
  try {
    const gravado = await gravarJanelaAtencaoDias(dias);
    revalidarPaineis();
    return {
      ok: true,
      error: null,
      aviso: `Janela do padrão de atenção passa a ser ${gravado} dia${gravado === 1 ? "" : "s"}.`,
    };
  } catch (e) {
    console.error("[cop2026-admin] salvar janela de atenção:", e);
    return falha("Não foi possível gravar a janela.");
  }
}
