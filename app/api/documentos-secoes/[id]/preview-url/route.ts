import { NextResponse } from "next/server";
import { contextoSessao, secoesDocumentoPermitidas } from "@/lib/db/permissoes";
import { gerarUrlAssinada, listarDocumentosComVisibilidade } from "@/lib/db/documentos";

/**
 * Devolve a URL (assinada, para arquivos; externa, para links) usada pela
 * prévia inline da tabela administrativa — não redireciona como a rota de
 * download, porque o cliente precisa da URL crua para montar o iframe/img.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessao, aut } = await contextoSessao();
  if (!sessao || !aut.valida) return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });

  const { id } = await params;
  const documentos = await listarDocumentosComVisibilidade();
  const documento = documentos.find((d) => d.id === id);
  if (!documento) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });

  const permitidas = secoesDocumentoPermitidas(sessao, aut);
  const podeVer =
    permitidas === "todas" || documento.secoes.some((s) => permitidas.has(s));
  if (!podeVer) {
    return NextResponse.json({ erro: "Sem permissão para este documento." }, { status: 403 });
  }

  if (documento.tipo === "link" && documento.url_externa) {
    return NextResponse.json({ url: documento.url_externa, tipoMime: documento.tipo_mime });
  }
  if (!documento.storage_path) {
    return NextResponse.json({ erro: "Documento sem arquivo associado." }, { status: 404 });
  }

  try {
    const url = await gerarUrlAssinada(documento.storage_path);
    return NextResponse.json({ url, tipoMime: documento.tipo_mime });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao gerar link." },
      { status: 500 }
    );
  }
}
