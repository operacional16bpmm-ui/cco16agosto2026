"use server";

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/auth-simples";
import { createAdminClient } from "@/lib/supabase/admin";
import { podeLancar } from "@/lib/autorizacao";
import { ehUnidadeValida, type Unidade } from "@/lib/unidades";

export type LancamentoState = { ok: boolean; error: string | null };

const TIPOS = ["pendencia", "ocorrencia_relevante", "justificativa_meta", "nota_escala"];
const STATUS = ["aberto", "em_andamento", "concluido"];

function dataValida(v: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * Autoriza a operação: exige sessão, unidade válida e permissão de lançamento
 * (o comandante da própria unidade ou o Comando — lib/autorizacao.ts). O
 * operador vai para a linha em texto, no padrão da migration 006, já que o
 * app não usa Supabase Auth.
 */
async function autorizar(unidadeBruta: string) {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: "Sessão inválida. Faça login novamente." as string, sessao: null, unidade: null };
  if (!ehUnidadeValida(unidadeBruta)) return { erro: "Unidade inválida.", sessao: null, unidade: null };
  const unidade = unidadeBruta as Unidade;
  if (!podeLancar(sessao, unidade))
    return { erro: "Sem permissão para lançar nesta unidade.", sessao: null, unidade: null };
  return { erro: null, sessao, unidade };
}

export async function criarLancamentoAction(
  _prev: LancamentoState,
  formData: FormData
): Promise<LancamentoState> {
  const { erro, sessao, unidade } = await autorizar(String(formData.get("unidade") ?? ""));
  if (erro || !sessao || !unidade) return { ok: false, error: erro ?? "Falha de autorização." };

  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  const prazo = dataValida(String(formData.get("prazo") ?? ""));
  const dataRef = dataValida(String(formData.get("data_ref") ?? "")) ?? undefined;

  if (!TIPOS.includes(tipo)) return { ok: false, error: "Tipo de lançamento inválido." };
  if (titulo.length < 3) return { ok: false, error: "Informe um título com ao menos 3 caracteres." };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cia_lancamentos")
      .insert({
        unidade,
        tipo,
        titulo,
        texto: texto || null,
        prazo,
        ...(dataRef ? { data_ref: dataRef } : {}),
        criado_por_usuario: sessao.usuario,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("audit_events").insert({
      action: "cia_lancamento_criado",
      entity_type: "cia_lancamentos",
      entity_id: data.id,
      details: { unidade, tipo, titulo, operador: sessao.usuario },
    });
  } catch (e) {
    console.error("[companhia] criarLancamento:", e);
    return { ok: false, error: "Não foi possível registrar o lançamento." };
  }

  revalidatePath(`/companhia/${unidade}`);
  return { ok: true, error: null };
}

export async function atualizarStatusLancamentoAction(
  _prev: LancamentoState,
  formData: FormData
): Promise<LancamentoState> {
  const { erro, sessao, unidade } = await autorizar(String(formData.get("unidade") ?? ""));
  if (erro || !sessao || !unidade) return { ok: false, error: erro ?? "Falha de autorização." };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Lançamento inválido." };
  if (!STATUS.includes(status)) return { ok: false, error: "Situação inválida." };

  try {
    const supabase = createAdminClient();
    // O eq(unidade) impede alterar, por id, um lançamento de outra unidade.
    const { error } = await supabase
      .from("cia_lancamentos")
      .update({
        status,
        atualizado_por_usuario: sessao.usuario,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("unidade", unidade);
    if (error) throw new Error(error.message);

    await supabase.from("audit_events").insert({
      action: "cia_lancamento_status",
      entity_type: "cia_lancamentos",
      entity_id: id,
      details: { unidade, status, operador: sessao.usuario },
    });
  } catch (e) {
    console.error("[companhia] atualizarStatus:", e);
    return { ok: false, error: "Não foi possível atualizar a situação." };
  }

  revalidatePath(`/companhia/${unidade}`);
  return { ok: true, error: null };
}
