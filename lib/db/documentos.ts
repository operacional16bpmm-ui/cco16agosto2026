import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SecaoDocumento } from "@/lib/secoes-documentos";

/**
 * Camada de dados do painel "Documentos por Seção": arquivos enviados via
 * upload no Setor Administrativo e distribuídos seletivamente para as
 * páginas de seção do batalhão (ver migration 017_documentos_secoes.sql).
 * Todo acesso passa pelo admin client (service role) — não há policy de
 * authenticated/anon nestas tabelas.
 */

const BUCKET = "documentos-secoes";

const CAMPOS_DOCUMENTO =
  "id, nome_exibicao, nome_arquivo_original, storage_path, tipo_mime, tamanho_bytes, criado_em, tipo, url_externa, categoria, data_referencia";

export type Documento = {
  id: string;
  nome_exibicao: string;
  nome_arquivo_original: string;
  storage_path: string | null;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  criado_em: string;
  tipo: "arquivo" | "link";
  url_externa: string | null;
  /** Rótulo livre (migration 024) — ex.: 'escala' para a aba Escala da Companhia. */
  categoria: string | null;
  /** Data a que o documento se refere (ex.: dia da escala), não a de envio. */
  data_referencia: string | null;
};

export type DocumentoComVisibilidade = Documento & { secoes: SecaoDocumento[] };

export async function listarDocumentosComVisibilidade(): Promise<DocumentoComVisibilidade[]> {
  const supabase = createAdminClient();
  const [{ data: documentos, error: erroDocs }, { data: visibilidade, error: erroVis }] =
    await Promise.all([
      supabase
        .from("documentos_secoes")
        .select(CAMPOS_DOCUMENTO)
        .order("criado_em", { ascending: false }),
      supabase.from("documentos_secoes_visibilidade").select("documento_id, secao"),
    ]);

  if (erroDocs) throw new Error(`Falha ao listar documentos: ${erroDocs.message}`);
  if (erroVis) throw new Error(`Falha ao listar visibilidade: ${erroVis.message}`);

  return (documentos ?? []).map((doc) => ({
    ...doc,
    secoes: (visibilidade ?? [])
      .filter((v) => v.documento_id === doc.id)
      .map((v) => v.secao as SecaoDocumento),
  }));
}

/**
 * @param categoria Quando informado, restringe ao rótulo (ex.: 'escala'); sem
 * ele, mantém o comportamento original (todo documento da seção, qualquer
 * categoria). `excluirCategoria` faz o oposto — usado pela lista de
 * "Documentos" da Visão Geral, que já não repete o que a aba Escala mostra.
 */
export async function listarDocumentosPorSecao(
  secao: SecaoDocumento,
  opcoes?: { categoria?: string; excluirCategoria?: string }
): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data: ids, error: erroIds } = await supabase
    .from("documentos_secoes_visibilidade")
    .select("documento_id")
    .in("secao", secao === "publico" ? ["publico"] : [secao, "publico"]);

  if (erroIds) throw new Error(`Falha ao consultar visibilidade: ${erroIds.message}`);
  const documentoIds = Array.from(new Set((ids ?? []).map((r) => r.documento_id)));
  if (documentoIds.length === 0) return [];

  let query = supabase
    .from("documentos_secoes")
    .select(CAMPOS_DOCUMENTO)
    .in("id", documentoIds);
  if (opcoes?.categoria) query = query.eq("categoria", opcoes.categoria);
  if (opcoes?.excluirCategoria) {
    // .neq direto excluiria também quem tem categoria NULL (SQL de três
    // valores: NULL <> 'x' não é verdadeiro) — documento sem categoria
    // precisa continuar na lista geral, então o "ou" cobre os dois casos.
    query = query.or(`categoria.is.null,categoria.neq.${opcoes.excluirCategoria}`);
  }

  const { data: documentos, error: erroDocs } = await query.order(
    opcoes?.categoria ? "data_referencia" : "criado_em",
    { ascending: false, nullsFirst: false }
  );

  if (erroDocs) throw new Error(`Falha ao listar documentos da seção: ${erroDocs.message}`);
  return documentos ?? [];
}

/**
 * O Supabase Storage rejeita chaves com espaço, acento ou símbolos fora de
 * [A-Za-z0-9._-] (ex.: "º", erro "Invalid key"). O nome original continua
 * intacto em nome_arquivo_original/nome_exibicao para exibição — só a chave
 * de storage precisa ser uma versão "achatada".
 */
const REGEX_MARCAS_DIACRITICAS = new RegExp("[\\u0300-\\u036f]", "g");

function sanitizarNomeParaStorage(nome: string): string {
  const semAcento = nome.normalize("NFD").replace(REGEX_MARCAS_DIACRITICAS, "");
  return semAcento.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function criarDocumento(params: {
  nomeExibicao: string;
  nomeArquivoOriginal: string;
  arquivo: File;
  enviadoPor?: string;
  categoria?: string;
  dataReferencia?: string;
}): Promise<Documento> {
  const supabase = createAdminClient();
  const storagePath = `${crypto.randomUUID()}-${sanitizarNomeParaStorage(params.nomeArquivoOriginal)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, params.arquivo, {
      contentType: params.arquivo.type || "application/octet-stream",
      upsert: false,
    });
  if (erroUpload) throw new Error(`Falha ao enviar arquivo: ${erroUpload.message}`);

  const { data, error } = await supabase
    .from("documentos_secoes")
    .insert({
      nome_exibicao: params.nomeExibicao,
      nome_arquivo_original: params.nomeArquivoOriginal,
      storage_path: storagePath,
      tipo_mime: params.arquivo.type || null,
      tamanho_bytes: params.arquivo.size,
      enviado_por: params.enviadoPor ?? null,
      tipo: "arquivo",
      categoria: params.categoria ?? null,
      data_referencia: params.dataReferencia ?? null,
    })
    .select(CAMPOS_DOCUMENTO)
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Falha ao registrar documento: ${error?.message ?? "sem retorno"}`);
  }
  return data;
}

/**
 * Cadastra um link externo (ex.: planilha do Google Sheets publicada) na
 * mesma tabela dos arquivos, sem subir nada ao storage. Exibido em prévia
 * (iframe) do mesmo jeito que um documento normal.
 */
export async function criarDocumentoLink(params: {
  nomeExibicao: string;
  urlExterna: string;
  enviadoPor?: string;
}): Promise<Documento> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos_secoes")
    .insert({
      nome_exibicao: params.nomeExibicao,
      nome_arquivo_original: params.nomeExibicao,
      tipo: "link",
      url_externa: params.urlExterna,
      enviado_por: params.enviadoPor ?? null,
    })
    .select(CAMPOS_DOCUMENTO)
    .single();

  if (error || !data) throw new Error(`Falha ao registrar link: ${error?.message ?? "sem retorno"}`);
  return data;
}

export async function excluirDocumento(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: doc, error: erroBusca } = await supabase
    .from("documentos_secoes")
    .select("storage_path, tipo")
    .eq("id", id)
    .single();
  if (erroBusca || !doc) throw new Error(`Documento não encontrado: ${erroBusca?.message ?? id}`);

  if (doc.tipo === "arquivo" && doc.storage_path) {
    const { error: erroStorage } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    if (erroStorage) throw new Error(`Falha ao remover arquivo do storage: ${erroStorage.message}`);
  }

  const { error: erroDelete } = await supabase.from("documentos_secoes").delete().eq("id", id);
  if (erroDelete) throw new Error(`Falha ao excluir documento: ${erroDelete.message}`);
}

/**
 * Confere se um documento está de fato liberado para a seção informada —
 * usado antes de excluir a partir de uma tela restrita a uma unidade (aba
 * Escala da Companhia), para um id adivinhado ou copiado de outra unidade
 * não conseguir apagar documento alheio.
 */
export async function documentoTemVisibilidade(
  documentoId: string,
  secao: SecaoDocumento
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos_secoes_visibilidade")
    .select("documento_id")
    .eq("documento_id", documentoId)
    .eq("secao", secao)
    .maybeSingle();
  if (error) throw new Error(`Falha ao conferir visibilidade: ${error.message}`);
  return Boolean(data);
}

export async function definirVisibilidade(
  documentoId: string,
  secao: SecaoDocumento,
  ativo: boolean
): Promise<void> {
  const supabase = createAdminClient();
  if (ativo) {
    const { error } = await supabase
      .from("documentos_secoes_visibilidade")
      .upsert({ documento_id: documentoId, secao }, { onConflict: "documento_id,secao" });
    if (error) throw new Error(`Falha ao ativar visibilidade: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("documentos_secoes_visibilidade")
      .delete()
      .eq("documento_id", documentoId)
      .eq("secao", secao);
    if (error) throw new Error(`Falha ao remover visibilidade: ${error.message}`);
  }
}

/**
 * Busca um documento só se ele estiver marcado como "publico" — usado pela
 * rota de download sem sessão (/api/documentos-secoes/publico/[id]), que
 * atende a página institucional /16bpmm. Nunca expor documentos restritos
 * a seções por esse caminho.
 */
export async function buscarDocumentoPublico(id: string): Promise<Documento | null> {
  const supabase = createAdminClient();
  const { data: vis, error: erroVis } = await supabase
    .from("documentos_secoes_visibilidade")
    .select("documento_id")
    .eq("documento_id", id)
    .eq("secao", "publico")
    .maybeSingle();
  if (erroVis) throw new Error(`Falha ao consultar visibilidade: ${erroVis.message}`);
  if (!vis) return null;

  const { data: documento, error } = await supabase
    .from("documentos_secoes")
    .select(CAMPOS_DOCUMENTO)
    .eq("id", id)
    .single();
  if (error || !documento) return null;
  return documento;
}

export async function gerarUrlAssinada(storagePath: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error || !data) throw new Error(`Falha ao gerar link de download: ${error?.message ?? storagePath}`);
  return data.signedUrl;
}
