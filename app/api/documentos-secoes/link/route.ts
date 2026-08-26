import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth-simples";
import { criarDocumentoLink } from "@/lib/db/documentos";

export async function POST(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  const nomeExibicao = typeof corpo?.nomeExibicao === "string" ? corpo.nomeExibicao.trim() : "";
  const urlExterna = typeof corpo?.urlExterna === "string" ? corpo.urlExterna.trim() : "";

  if (!nomeExibicao) return NextResponse.json({ erro: "Informe um nome para o link." }, { status: 400 });
  if (!/^https:\/\//.test(urlExterna)) {
    return NextResponse.json({ erro: "Informe uma URL válida (começando com https://)." }, { status: 400 });
  }

  try {
    const documento = await criarDocumentoLink({
      nomeExibicao,
      urlExterna,
      enviadoPor: sessao.usuario,
    });
    return NextResponse.json({ documento });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao registrar link." },
      { status: 500 }
    );
  }
}
