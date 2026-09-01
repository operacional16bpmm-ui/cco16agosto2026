import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_ACESSO_COP, assinarAcesso } from "@/lib/cop2026-acesso";
import { sessaoCop } from "@/lib/db/cop2026-autorizados";
import { capturarPainel } from "@/lib/cop2026-briefing-png";

/**
 * PNG do painel da COP, desenhado no servidor.
 *
 * Existe porque a rasterização no navegador do usuário não tem conserto no
 * iPhone — o diagnóstico completo está em lib/cop2026-briefing-png.ts. Aqui o
 * celular não desenha nada: ele baixa um arquivo que um Chromium de verdade
 * produziu no viewport de 1240px, idêntico em qualquer aparelho.
 *
 * Também vale como URL colável: o Comando pode receber o endereço no WhatsApp
 * em vez do arquivo — quem abrir precisa da mesma conta Google que abre o
 * painel, porque o PNG carrega RE e nome de guerra.
 *
 * Proteção em duas camadas, na mesma ordem das páginas restritas:
 *   1. o proxy confere a ASSINATURA do cookie na borda (a rota está em
 *      ROTAS_RESTRITAS_COP);
 *   2. aqui, sessaoCop() recheca a LISTA de autorizados no banco — é o que faz
 *      a revogação valer na hora, e não só na expiração do cookie.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Subir o Chromium na instância fria custa 2–4s e a página ainda lê a planilha
   ao vivo. 60s é folga para o pior caso; o caminho quente fecha em poucos
   segundos. */
export const maxDuration = 60;

/** Recorte da tela vai junto para o arquivo: o PNG tem de sair com o mesmo
 *  filtro que a pessoa estava vendo quando clicou. Lista fechada de propósito —
 *  a querystring é repassada a um navegador headless, então nada que não esteja
 *  aqui atravessa. */
const FILTROS_ACEITOS = ["fracao", "semana", "turno", "de", "ate", "busca", "excecao"] as const;

/** O nome do arquivo carrega a data de São Paulo, não a do datacenter — um PNG
 *  gerado às 22h de Brasília não pode nascer com a data de amanhã. */
function dataDeHoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  const sessao = await sessaoCop();
  if (!sessao) {
    return NextResponse.json({ erro: "Sem acesso à Auditoria de COP 2026." }, { status: 401 });
  }

  /* A origem vem do request e não de env: o mesmo deploy responde por vários
     domínios *.vercel.app (ver REESCRITA_RAIZ_POR_HOST no proxy) e o headless
     precisa bater no mesmo host que serviu esta requisição. */
  const origem = request.nextUrl.origin;
  const alvo = new URL("/cop2026/dashboard/v3", origem);
  alvo.searchParams.set("briefing", "1");
  for (const chave of FILTROS_ACEITOS) {
    const valor = request.nextUrl.searchParams.get(chave);
    if (valor) alvo.searchParams.set(chave, valor);
  }

  try {
    /* Cookie próprio, curto e emitido agora: o headless não faz o handshake com
       o Google, e reaproveitar o cookie de quem chamou significaria mandar a
       sessão do usuário para dentro de outro processo. A identidade continua
       sendo a mesma — a assinatura é da conta que já passou pelo sessaoCop(). */
    const valorCookie = await assinarAcesso(sessao.email, sessao.nome);

    const png = await capturarPainel(alvo.toString(), {
      nome: COOKIE_ACESSO_COP,
      valor: valorCookie,
      dominio: alvo.hostname,
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.byteLength),
        "Content-Disposition": `attachment; filename="painel-cop-2026-${dataDeHoje()}.png"`,
        /* Nunca em cache: o painel muda a cada leitura da planilha e o arquivo
           carrega dado nominal — cache de CDN aqui serviria o PNG de um recorte
           para outra pessoa. */
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (erro) {
    console.error("[briefing-png] falha ao gerar:", erro);
    return NextResponse.json(
      {
        erro: "Não foi possível gerar o painel em PNG.",
        detalhe: erro instanceof Error ? erro.message : String(erro),
      },
      { status: 500 }
    );
  }
}
