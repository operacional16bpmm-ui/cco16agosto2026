import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarSessao } from "@/lib/auth-simples";
import {
  COOKIE_ACESSO_COP,
  ROTAS_RESTRITAS_COP,
  ROTA_ACESSO_COP,
  verificarAssinaturaAcesso,
} from "@/lib/cop2026-acesso";

// Fail-closed: TODA rota exige sessão válida por padrão. Só as rotas listadas
// abaixo (Vitrine pública + /login) ficam livres — uma página nova da Sala de
// Comando nasce protegida automaticamente, sem precisar lembrar de listá-la
// aqui (era exatamente esse esquecimento que deixava /p2 e /comunicacao
// abertas na internet sem login).
//
// "/estudos" é público de propósito: é o Núcleo de Análise Criminal, uma
// biblioteca de estudos com tratamento agregado e fonte aberta. Regra geral:
// sem dado pessoal. A exceção é "alvo-farmacia.html", que reproduz o quadro de
// autoria da P/2 (nome e fotografia), por decisão do Comando, e o declara na
// própria página. Qualquer estudo novo com dado pessoal exige a mesma decisão.
// O startsWith("/estudos/") também libera os arquivos estáticos dos estudos
// em public/estudos/*.html — que, por terem extensão .html (fora da lista de
// exceções do matcher abaixo), passariam pelo proxy e cairiam no /login.
//
// "/16bpmm" é a página oficial do Batalhão: conteúdo institucional (histórico,
// brasão, patrono, companhias, Galeria de Heróis) transcrito do site da Unidade
// na intranet PMESP. É material de divulgação, sem dado operacional ou pessoal
// sensível — nasceu para ser lido por qualquer um, então fica fora do login.
//
// "/api/documentos-secoes/publico" serve SÓ documentos marcados como
// "publico" no painel de Administração → Documentos (ver
// lib/db/documentos.ts:buscarDocumentoPublico) — é o link de download usado
// pela seção de documentos da /16bpmm. Documentos restritos a seção seguem
// em /api/documentos-secoes/[id]/download, que continua exigindo sessão.
// "/16bpmminventario" é a central de planilhas do levantamento patrimonial.
// Aberta a pedido do usuário em 03/08/2026, para que as frações e o Comando
// abram o link direto, sem passar pela credencial única da Sala de Comando.
//
// Ela expõe, para quem tiver o endereço: número de patrimônio, localização
// física do bem e a descrição do material — o que inclui armamento, colete
// balístico e taser das planilhas das companhias e da Reserva de Armas. Não há
// dado pessoal, mas há dado administrativo sensível. Para voltar a proteger,
// basta remover esta entrada da lista: a rota volta a exigir login pelo
// fail-closed, sem mais nenhuma alteração.
// "/cop2026" é o painel da auditoria de câmera operacional corporal. Aberto a
// pedido do usuário em 03/08/2026: a tropa inteira precisa alcançar o
// formulário e conferir o próprio lançamento, e o link vai circular por
// WhatsApp, sem passar pela credencial única da Sala de Comando.
//
// Ele expõe, para quem tiver o endereço, os lançamentos individuais do
// formulário: RE, nome de guerra, posto, função, fração e justificativa. É dado
// pessoal de policial militar, exibido por decisão expressa do usuário, que
// pretende restringir o alcance pelo controle do link. Para voltar a proteger,
// basta remover esta entrada: a rota volta a exigir login pelo fail-closed.
// "/painel" é o instalador do bookmarklet do Painel Tempo Real, que antes vivia
// no projeto cco16-whatsapp.vercel.app, aberto na internet. Ele veio para cá na
// migração do portal para o servidor local, e continua sem login porque agora o
// servidor inteiro só responde dentro da rede interna do Batalhão.
const ROTAS_PUBLICAS = [
  "/",
  "/login",
  "/estudos",
  "/16bpmm",
  "/16bpmminventario",
  "/cop2026",
  "/painel",
  "/api/documentos-secoes/publico",
  // Handshake do acesso restrito da COP: a própria porta não pode estar
  // trancada por dentro.
  "/api/cop2026/acesso",
  // RE → nome, para o formulário de lançamento preencher sozinho. Pública
  // porque /cop2026/lancar é público: atrás do login ela não serviria a quem
  // lança. É a rota que o cabeçalho de lib/db/cop2026-auditor.ts chama de
  // oráculo sobre o efetivo nominal — decisão de Comando, e o conserto (mover
  // esta linha para ROTAS_RESTRITAS_COP) está descrito no próprio route.ts.
  "/api/cop2026/efetivo",
  // A Diretriz da COP é norma aberta à tropa e fica embutida na /cop2026;
  // sem esta exceção o leitor de PDF cairia no login.
  "/documentos/diretriz-pm3-001-02-25.pdf",
];

// Um único deploy responde por três domínios *.vercel.app com "caras"
// diferentes na raiz "/", sem trocar a URL visível no navegador (reescrita,
// não redirect): 16bpmm-pmesp.vercel.app abre direto no site institucional
// (16bpmm.vercel.app já pertence a outra conta Vercel, fora do nosso alcance),
// 16bpmmcomando.vercel.app abre direto no login. 16bpmmoperacao.vercel.app
// não entra no mapa porque a raiz já é o painel operacional por padrão.
const REESCRITA_RAIZ_POR_HOST: Record<string, string> = {
  "16bpmm-pmesp.vercel.app": "/16bpmm",
  "16bpmmcomando.vercel.app": "/login",
};

/* /cop2026 é público por prefixo, e o Dashboard, o Briefing e a tela de
   Autorizados herdavam esse "aberto" sem ninguém decidir isso. Eles carregam nome, RE e justificativa de
   policial — são do Comando, não da tropa. Esta lista quebra a herança e é
   conferida ANTES da lista de públicas; a página de acesso e o handshake com o
   Google seguem abertos, senão não haveria como entrar. */
function ehRotaRestritaCop(pathname: string): boolean {
  return ROTAS_RESTRITAS_COP.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );
}

function ehRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((rota) =>
    rota === "/" ? pathname === "/" : pathname === rota || pathname.startsWith(`${rota}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ehRotaRestritaCop(pathname)) {
    /* Só a assinatura: a borda não fala com o Supabase. A recheca da lista de
       autorizados — que é o que faz a revogação valer na hora — acontece na
       própria página, em sessaoCop()/exigirAcessoCop() de
       lib/db/cop2026-autorizados.ts. */
    const acesso = await verificarAssinaturaAcesso(request.cookies.get(COOKIE_ACESSO_COP)?.value);
    if (acesso) return NextResponse.next();
    /* Rota de API chamada por FETCH não pode levar redirect para a tela de
       login: o fetch seguiria o 307 e o cliente receberia HTML no lugar do
       arquivo, com status 200 — falha que se parece com sucesso. 401 seco
       deixa o botão saber que a sessão caiu.

       Mas a mesma rota também é aberta por NAVEGAÇÃO: o botão de exportar o
       painel é um <a href> justamente para o celular baixar o PNG sem passar
       pelo JavaScript. Aí o 401 vira uma tela de JSON cru no Safari — a pessoa
       toca em "exportar" e recebe `{"erro":"..."}` no lugar do arquivo. Com a
       sessão da COP durando 12h, esse é o caso comum de segunda-feira de manhã,
       não a exceção. Navegação segue para a tela de acesso e volta ao PNG
       depois do login, pelo `?redirect=`. */
    const ehNavegacao =
      request.headers.get("sec-fetch-mode") === "navigate" ||
      (!request.headers.get("sec-fetch-mode") &&
        (request.headers.get("accept") ?? "").includes("text/html"));
    if (pathname.startsWith("/api/") && !ehNavegacao) {
      return NextResponse.json({ erro: "Sessão da COP expirada." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = ROTA_ACESSO_COP;
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const host = request.headers.get("host")?.split(":")[0] ?? "";
    const destinoRaiz = REESCRITA_RAIZ_POR_HOST[host];
    if (destinoRaiz) return NextResponse.rewrite(new URL(destinoRaiz, request.url));
  }

  if (ehRotaPublica(pathname)) return NextResponse.next();

  const cookieValor = request.cookies.get(COOKIE_SESSAO)?.value;
  const sessao = cookieValor ? await verificarSessao(cookieValor) : null;

  if (!sessao) {
    // Preserva path + querystring (ex.: "/p3?ano=2026&mes=6&cia=2") — antes
    // só gravava `pathname`, então qualquer filtro/estado na URL (a base do
    // FiltroBar das páginas de seção) se perdia silenciosamente ao expirar a
    // sessão e voltar a logar. url.search é limpo antes para não herdar os
    // params da URL original misturados com o próprio ?redirect=.
    const destino = pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", destino);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // robots.txt/sitemap.xml precisam sair do proxy: sao arquivos de metadata
    // gerados por app/robots.ts, e sem esta excecao o middleware devolvia 307
    // para o /login — o buscador nunca lia o Disallow e o portal ficava sem a
    // unica protecao contra indexacao depois que a meta noindex saiu da /cop2026.
    // media/ (vídeos e fotos da vitrine pública) faltava aqui — arquivos
    // .mp4 não batem nenhuma extensão da lista, então caíam no proxy() e,
    // com o fail-closed do B1, passaram a redirecionar para /login.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
