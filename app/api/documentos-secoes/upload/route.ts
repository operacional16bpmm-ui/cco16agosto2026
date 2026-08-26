import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth-simples";
import { criarDocumento } from "@/lib/db/documentos";

export async function POST(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão inválida." }, { status: 401 });

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const nomeExibicaoBruto = formData.get("nomeExibicao");
  const nomeExibicao =
    typeof nomeExibicaoBruto === "string" && nomeExibicaoBruto.trim().length > 0
      ? nomeExibicaoBruto.trim()
      : arquivo.name;

  try {
    const documento = await criarDocumento({
      nomeExibicao,
      nomeArquivoOriginal: arquivo.name,
      arquivo,
      enviadoPor: sessao.usuario,
    });
    return NextResponse.json({ documento });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao enviar documento." },
      { status: 500 }
    );
  }
}
