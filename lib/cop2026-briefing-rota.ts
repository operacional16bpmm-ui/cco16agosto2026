import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_ACESSO_COP, assinarAcesso } from "@/lib/cop2026-acesso";
import { sessaoCop } from "@/lib/db/cop2026-autorizados";
import type { CookieDeAcesso } from "@/lib/cop2026-briefing-arquivo";

/**
 * O preparo comum das duas rotas de exportação do painel (PNG e PDF).
 *
 * Existe para que autenticação, recorte e nome de arquivo sejam LITERALMENTE o
 * mesmo código nos dois formatos. Duplicado, o par envelhece torto: um filtro
 * novo entra na lista de um e não do outro, e o PDF passa a mostrar um recorte
 * que o PNG não mostra — divergência que ninguém percebe até o Comando comparar
 * os dois arquivos numa reunião.
 */

/** Recorte da tela vai junto para o arquivo. Lista fechada de propósito: a
 *  querystring é repassada a um navegador headless, então nada que não esteja
 *  aqui atravessa. */
const FILTROS_ACEITOS = ["fracao", "semana", "turno", "de", "ate", "busca", "excecao"] as const;

/** Data de São Paulo, não a do datacenter: um arquivo gerado às 22h de Brasília
 *  não pode nascer com a data de amanhã. */
export function dataDeHoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mesma data, na forma que se lê num documento oficial. */
export function dataPorExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export type PreparoExportacao = {
  /** Endereço absoluto do painel em modo briefing, com o recorte repassado. */
  alvo: string;
  /** Sessão curta emitida agora para o headless — nunca a de quem chamou. */
  cookie: CookieDeAcesso;
};

/**
 * Confere o acesso e monta o alvo. Devolve `NextResponse` quando a requisição
 * deve parar aqui — o chamador só precisa repassar.
 */
export async function prepararExportacao(
  request: NextRequest
): Promise<PreparoExportacao | NextResponse> {
  /* Segunda camada de proteção: o proxy já conferiu a ASSINATURA do cookie na
     borda, e aqui sessaoCop() recheca a LISTA de autorizados no banco — é o que
     faz a revogação valer na hora, e não só na expiração do cookie. */
  const sessao = await sessaoCop();
  if (!sessao) {
    return NextResponse.json({ erro: "Sem acesso à Auditoria de COP 2026." }, { status: 401 });
  }

  /* A origem vem do request e não de env: o mesmo deploy responde por vários
     domínios *.vercel.app (ver REESCRITA_RAIZ_POR_HOST no proxy) e o headless
     precisa bater no mesmo host que serviu esta requisição. */
  const alvo = new URL("/cop2026/dashboard", request.nextUrl.origin);
  alvo.searchParams.set("briefing", "1");
  for (const chave of FILTROS_ACEITOS) {
    const valor = request.nextUrl.searchParams.get(chave);
    if (valor) alvo.searchParams.set(chave, valor);
  }

  /* Cookie próprio, curto e emitido agora: o headless não faz o handshake com o
     Google, e reaproveitar o cookie de quem chamou seria mandar a sessão da
     pessoa para dentro de outro processo. A identidade é a mesma — a assinatura
     sai para a conta que acabou de passar pelo sessaoCop(). */
  const valorCookie = await assinarAcesso(sessao.email, sessao.nome);

  return {
    alvo: alvo.toString(),
    cookie: { nome: COOKIE_ACESSO_COP, valor: valorCookie, dominio: alvo.hostname },
  };
}

/** Resposta de arquivo para download, com os cabeçalhos que fazem o celular
 *  abrir o download nativo em vez de exibir o conteúdo. */
export function respostaDeArquivo(
  corpo: Buffer,
  tipo: string,
  nomeArquivo: string
): NextResponse {
  return new NextResponse(new Uint8Array(corpo), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(corpo.byteLength),
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      /* Nunca em cache: o painel muda a cada leitura da planilha e o arquivo
         carrega dado nominal — cache de CDN aqui serviria o recorte de uma
         pessoa para outra. */
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

/** Falha de geração, com o detalhe técnico para o console do chamador. */
export function respostaDeFalha(erro: unknown, formato: string): NextResponse {
  console.error(`[briefing-${formato}] falha ao gerar:`, erro);
  return NextResponse.json(
    {
      erro: `Não foi possível gerar o painel em ${formato.toUpperCase()}.`,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    },
    { status: 500 }
  );
}
