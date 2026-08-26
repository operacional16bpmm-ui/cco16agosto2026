import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth-simples";
import { excluirDocumento } from "@/lib/db/documentos";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });

  const { id } = await params;
  try {
    await excluirDocumento(id);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao excluir documento." },
      { status: 500 }
    );
  }
}
