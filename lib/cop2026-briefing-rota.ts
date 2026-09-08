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
  /** `null` quando quem pediu não tem sessão. O painel está aberto desde
   *  08/09/2026, então o headless não precisa de credencial para abri-lo — o
   *  cookie só existe para o arquivo sair com a identidade de quem exportou. */
  cookie: CookieDeAcesso | null;
};

/**
 * Confere o acesso e monta o alvo. Devolve `NextResponse` quando a requisição
 * deve parar aqui — o chamador só precisa repassar.
 */
export async function prepararExportacao(
  request: NextRequest
): Promise<PreparoExportacao | NextResponse> {
  /* A exportação acompanha a tela: o Dashboard ficou aberto por determinação
     do Comando em 08/09/2026, e recusar o PDF do que já se lê na tela só
     produziria um botão que não funciona. `sessaoCop()` continua sendo
     chamado — quem TEM sessão exporta com a própria identidade, e é isso que
     mantém a revogação valendo para o arquivo nominal. */
  const sessao = await sessaoCop();

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
  const valorCookie = sessao ? await assinarAcesso(sessao.email, sessao.nome) : null;

  return {
    alvo: alvo.toString(),
    cookie: valorCookie
      ? { nome: COOKIE_ACESSO_COP, valor: valorCookie, dominio: alvo.hostname }
      : null,
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

/**
 * Requisição aberta por NAVEGAÇÃO (o `<a href>` do botão) e não por `fetch`.
 *
 * Mesma sonda que o `proxy.ts` usa para não devolver 401 cru ao Safari — aqui
 * pelo mesmo motivo: a rota é aberta das duas formas, e a resposta de erro
 * precisa mudar de forma junto.
 */
function ehNavegacao(request: NextRequest): boolean {
  const modo = request.headers.get("sec-fetch-mode");
  if (modo) return modo === "navigate";
  return (request.headers.get("accept") ?? "").includes("text/html");
}

/**
 * Falha de geração, com o detalhe técnico para o console do chamador.
 *
 * O PDF NUNCA é interceptado pelo JavaScript (ver `aoTocarExportar` — no iOS a
 * ativação do toque expira antes do fetch de ~30s terminar), então ele chega
 * aqui sempre por navegação. Devolver JSON nesse caminho põe `{"erro":...}` na
 * cara de quem tocou no botão, ou baixa um ".pdf" com JSON dentro — é o mesmo
 * defeito que o 401 cru já teve no proxy em 02/09/2026. Navegação recebe uma
 * página que se lê; `fetch` continua recebendo o JSON que o PNG sabe tratar.
 */
export function respostaDeFalha(
  erro: unknown,
  formato: string,
  request?: NextRequest
): NextResponse {
  console.error(`[briefing-${formato}] falha ao gerar:`, erro);
  const titulo = `Não foi possível gerar o painel em ${formato.toUpperCase()}.`;

  if (request && ehNavegacao(request)) {
    /* Sem `detalhe` na tela: a mensagem do erro pode carregar endereço interno
       e recorte de quem chamou. O técnico fica no log da função. */
    return new NextResponse(paginaDeFalha(titulo), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    { erro: titulo, detalhe: erro instanceof Error ? erro.message : String(erro) },
    { status: 500 }
  );
}

/** Tela mínima de falha — sem dependência de build, porque é servida de uma
 *  rota de API que não passa pelo layout do portal. */
function paginaDeFalha(titulo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1520;color:#e8edf4;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <main style="max-width:34rem;padding:2rem;text-align:center">
    <p style="font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:#8fa0b8;margin:0 0 .75rem">
      Auditoria de COP 2026
    </p>
    <h1 style="font-size:1.35rem;margin:0 0 1rem;color:#fff">${titulo}</h1>
    <p style="margin:0 0 1.75rem;color:#b8c4d4">
      O gerador não respondeu desta vez. Volte ao painel e toque em exportar de novo —
      se insistir, exporte em PNG, que tem um segundo caminho no próprio navegador.
    </p>
    <a href="/cop2026/dashboard"
       style="display:inline-block;padding:.7rem 1.4rem;border-radius:.5rem;background:#ca0202;color:#fff;text-decoration:none;font-weight:700">
      Voltar ao painel
    </a>
  </main>
</body>
</html>`;
}
