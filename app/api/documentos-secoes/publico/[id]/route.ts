import { NextResponse } from "next/server";
import { buscarDocumentoPublico, gerarUrlAssinada } from "@/lib/db/documentos";

/**
 * Download sem sessão — só serve documentos marcados como "publico" no
 * painel de Administração. Usada pela página institucional /16bpmm (rota
 * pública, sem login). Nunca reaproveitar para documentos restritos a
 * seção: use /api/documentos-secoes/[id]/download (autenticada) para isso.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documento = await buscarDocumentoPublico(id);
  if (!documento) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  if (documento.tipo === "link" && documento.url_externa) {
    return NextResponse.redirect(documento.url_externa);
  }
  if (!documento.storage_path) {
    return NextResponse.json({ erro: "Documento sem arquivo associado." }, { status: 404 });
  }

  try {
    const url = await gerarUrlAssinada(documento.storage_path);
    return NextResponse.redirect(url);
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao gerar link." },
      { status: 500 }
    );
  }
}
