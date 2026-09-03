import { type NextRequest, NextResponse } from "next/server";
import { gerarPainelPdf } from "@/lib/cop2026-briefing-arquivo";
import {
  dataDeHoje,
  dataPorExtenso,
  prepararExportacao,
  respostaDeArquivo,
  respostaDeFalha,
} from "@/lib/cop2026-briefing-rota";

/**
 * PDF paginado do painel da COP — o formato para LER, e não só para colar.
 *
 * O PNG é uma imagem só, e o painel passa de 6.000px de altura: numa tela de
 * celular ou no WhatsApp isso vira uma tira ilegível, porque imagem não pagina.
 * Aqui o mesmo painel sai em A4 deitado, colorido, com os quadros inteiros
 * (nenhum cartão parte no meio entre duas folhas), cabeçalho institucional e
 * numeração de página — o que se leva para uma reunião de Comando.
 *
 * Mesma porta e mesmo recorte do PNG: as duas rotas compartilham
 * lib/cop2026-briefing-rota.ts de propósito, para que um filtro novo não entre
 * em um formato e falte no outro.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const preparo = await prepararExportacao(request);
  if (preparo instanceof NextResponse) return preparo;

  try {
    const pdf = await gerarPainelPdf(
      preparo.alvo,
      preparo.cookie,
      `Emitido em ${dataPorExtenso()}`
    );
    return respostaDeArquivo(pdf, "application/pdf", `painel-cop-2026-${dataDeHoje()}.pdf`);
  } catch (erro) {
    return respostaDeFalha(erro, "pdf", request);
  }
}
