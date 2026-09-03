import { type NextRequest, NextResponse } from "next/server";
import { capturarPainel } from "@/lib/cop2026-briefing-arquivo";
import {
  dataDeHoje,
  prepararExportacao,
  respostaDeArquivo,
  respostaDeFalha,
} from "@/lib/cop2026-briefing-rota";

/**
 * PNG do painel da COP, desenhado no servidor.
 *
 * Existe porque a rasterização no navegador do usuário não tem conserto no
 * iPhone — o diagnóstico completo está em lib/cop2026-briefing-arquivo.ts. Aqui
 * o celular não desenha nada: ele baixa um arquivo que um Chromium de verdade
 * produziu no viewport de 1440px, idêntico em qualquer aparelho.
 *
 * Também vale como URL colável: o Comando pode receber o endereço no WhatsApp
 * em vez do arquivo — quem abrir precisa da mesma conta Google que abre o
 * painel, porque o PNG carrega RE e nome de guerra.
 *
 * Para LER o painel com calma, ou imprimir, existe o irmão em
 * /api/cop2026/briefing-pdf: imagem não pagina, e este arquivo passa de 6.000px
 * de altura.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Subir o Chromium na instância fria custa alguns segundos e a página ainda lê
   a planilha ao vivo. 60s é folga para o pior caso; o caminho quente fecha em
   menos de 10. */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const preparo = await prepararExportacao(request);
  if (preparo instanceof NextResponse) return preparo;

  try {
    const png = await capturarPainel(preparo.alvo, preparo.cookie);
    return respostaDeArquivo(png, "image/png", `painel-cop-2026-${dataDeHoje()}.png`);
  } catch (erro) {
    return respostaDeFalha(erro, "png", request);
  }
}
