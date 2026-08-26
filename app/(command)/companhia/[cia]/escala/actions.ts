"use server";

import { revalidatePath } from "next/cache";
import { sessaoAtual } from "@/lib/auth-simples";
import { podeLancar } from "@/lib/autorizacao";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  criarDocumento,
  definirVisibilidade,
  documentoTemVisibilidade,
  excluirDocumento,
} from "@/lib/db/documentos";
import { ehUnidadeValida, secaoDocumento, type Unidade } from "@/lib/unidades";
import type { SecaoDocumento } from "@/lib/secoes-documentos";

export type EscalaState = { ok: boolean; error: string | null };

const TIPOS_ACEITOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
/** 15 MB — folga generosa para um PDF de escala ou foto de mural, sem abrir
 * a porta para upload de arquivo grande demais no bucket. */
const LIMITE_BYTES = 15 * 1024 * 1024;
const ID_VALIDO = /^[0-9a-f-]{36}$/i;

async function autorizar(unidadeBruta: string) {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: "Sessão inválida. Faça login novamente." as string, sessao: null, unidade: null };
  if (!ehUnidadeValida(unidadeBruta)) return { erro: "Unidade inválida.", sessao: null, unidade: null };
  const unidade = unidadeBruta as Unidade;
  if (!podeLancar(sessao, unidade)) {
    return { erro: "Sem permissão para lançar a escala desta unidade.", sessao: null, unidade: null };
  }
  return { erro: null, sessao, unidade };
}

/**
 * Envia a escala do dia/semana da Companhia: reusa o mesmo framework de
 * documentos_secoes (upload no bucket "documentos-secoes" + visibilidade
 * cia_N) do painel Administrativo, com categoria='escala' e data_referencia
 * (migration 024) para a aba Escala listar só isto, mais recente primeiro.
 */
export async function enviarEscalaAction(
  _prev: EscalaState,
  formData: FormData
): Promise<EscalaState> {
  const { erro, sessao, unidade } = await autorizar(String(formData.get("unidade") ?? ""));
  if (erro || !sessao || !unidade) return { ok: false, error: erro ?? "Falha de autorização." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, error: "Selecione um arquivo (PDF ou imagem)." };
  }
  if (!TIPOS_ACEITOS.has(arquivo.type)) {
    return { ok: false, error: "Envie um PDF ou uma imagem (JPG, PNG ou WEBP)." };
  }
  if (arquivo.size > LIMITE_BYTES) {
    return { ok: false, error: "Arquivo maior que 15 MB." };
  }

  const dataReferencia = String(formData.get("dataReferencia") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
    return { ok: false, error: "Informe a data a que a escala se refere." };
  }
  const abrangencia = String(formData.get("abrangencia") ?? "dia") === "semana" ? "semana" : "dia";
  const dataExibicao = new Date(`${dataReferencia}T00:00:00`).toLocaleDateString("pt-BR");
  const nomeExibicao =
    abrangencia === "semana" ? `Escala da semana — ${dataExibicao}` : `Escala do dia — ${dataExibicao}`;

  try {
    const documento = await criarDocumento({
      nomeExibicao,
      nomeArquivoOriginal: arquivo.name,
      arquivo,
      enviadoPor: sessao.usuario,
      categoria: "escala",
      dataReferencia,
    });
    await definirVisibilidade(documento.id, secaoDocumento(unidade) as SecaoDocumento, true);

    const supabase = createAdminClient();
    await supabase.from("audit_events").insert({
      action: "escala_enviada",
      entity_type: "documentos_secoes",
      entity_id: documento.id,
      details: { unidade, dataReferencia, abrangencia, operador: sessao.usuario },
    });
  } catch (e) {
    console.error("[escala] enviar:", e);
    return { ok: false, error: "Não foi possível enviar a escala." };
  }

  revalidatePath(`/companhia/${unidade}/escala`);
  return { ok: true, error: null };
}

export async function excluirEscalaAction(
  _prev: EscalaState,
  formData: FormData
): Promise<EscalaState> {
  const { erro, sessao, unidade } = await autorizar(String(formData.get("unidade") ?? ""));
  if (erro || !sessao || !unidade) return { ok: false, error: erro ?? "Falha de autorização." };

  const id = String(formData.get("id") ?? "");
  if (!ID_VALIDO.test(id)) return { ok: false, error: "Escala inválida." };

  try {
    // Confere que o documento é MESMO uma escala desta unidade antes de
    // apagar — um id de outra Companhia (adivinhado ou colado na URL) não
    // pode ser removido só porque o formulário chegou com a própria unidade.
    const pertence = await documentoTemVisibilidade(id, secaoDocumento(unidade) as SecaoDocumento);
    if (!pertence) return { ok: false, error: "Escala não encontrada para esta unidade." };

    await excluirDocumento(id);
    const supabase = createAdminClient();
    await supabase.from("audit_events").insert({
      action: "escala_excluida",
      entity_type: "documentos_secoes",
      entity_id: id,
      details: { unidade, operador: sessao.usuario },
    });
  } catch (e) {
    console.error("[escala] excluir:", e);
    return { ok: false, error: "Não foi possível excluir a escala." };
  }

  revalidatePath(`/companhia/${unidade}/escala`);
  return { ok: true, error: null };
}
