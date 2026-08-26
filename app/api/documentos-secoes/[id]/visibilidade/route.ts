import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth-simples";
import { definirVisibilidade } from "@/lib/db/documentos";
import { ehSecaoDocumentoValida } from "@/lib/secoes-documentos";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const secao = body?.secao;
  const ativo = body?.ativo;

  if (typeof secao !== "string" || !ehSecaoDocumentoValida(secao) || typeof ativo !== "boolean") {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    await definirVisibilidade(id, secao, ativo);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao atualizar visibilidade." },
      { status: 500 }
    );
  }
}
