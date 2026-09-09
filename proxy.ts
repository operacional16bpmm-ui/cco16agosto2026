import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarSessao } from "@/lib/auth-simples";
import {
  ABERTAS_SOB_ADMIN_COP,
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
  /* Organograma Comando → Batalhão → Fração, para o seletor de unidade do
     mesmo formulário público (08/09/2026). Sem esta linha o policial de outro
     batalhão trocava o comando e o seletor caía no login — e a fração é
     obrigatória, então ele não lançaria.

     Aberta com folga menor que a `/efetivo`: aqui não há pessoa nenhuma, só
     nome e código de OPM, que é o que qualquer boletim publica. NÃO existe
     subrota, e não deve existir: a lista casa por prefixo. */
  "/api/cop2026/unidades",
  /* Saúde do painel para o vigia externo (pc2). Não é rota aberta: ela tem
     gate PRÓPRIO por `Authorization: Bearer CCO16_SAUDE_TOKEN` e responde 503
     se a variável não existir. Fica aqui porque o vigia é uma máquina — não
     tem conta Google para atravessar o gate do Dashboard. Só devolve
     contadores e nomes de invariante; nada que identifique policial.

     ATENÇÃO — esta lista casa por PREFIXO (`pathname.startsWith(rota + "/")`),
     então as subrotas herdam o "aberto" daqui. As duas que existem hoje têm
     gate próprio de ADMIN, não de bearer:
       /api/cop2026/saude/painel     → exigirAdminCop()
       /api/cop2026/saude/perguntar  → exigirAdminCop() + custa dinheiro por chamada
     Subrota nova sob /api/cop2026/saude NASCE ABERTA. Quem criar a próxima
     põe o gate na primeira linha do handler, ou move a entrada para a lista
     restrita. */
  "/api/cop2026/saude",
  /* Exportação para o backup diário do pc2. Passa aqui porque o gate dela é
     BEARER, não sessão: quem chama é um systemd timer às 03h05, que não tem
     conta Google e nunca terá. O handler exige `CCO16_BACKUP_TOKEN` na primeira
     linha e responde 503 se a variável não existir — rota de despejo aberta
     seria a pior superfície do sistema inteiro.

     Diferente de `/api/cop2026/saude`, aqui NÃO existe subrota, e não deve
     existir: a lista casa por prefixo e qualquer `/api/cop2026/backup/algo`
     nasceria aberta. O que a rota exporta é lista fechada no servidor. */
  "/api/cop2026/backup",
  /* EXPORTAÇÃO DO PAINEL — PNG e PDF. Abertas em 09/09/2026 porque fechá-las
     não protegia nada e quebrava o botão no celular.

     O gate que esta lista aplica é o COOKIE_SESSAO da Sala de Comando, NÃO a
     conta Google da COP. Fora da lista, as duas rotas caíam no fail-closed e
     respondiam 307 para /login a qualquer pessoa sem a credencial única do
     Batalhão — inclusive a quem já estava lendo o Dashboard. No celular o botão
     de exportar é um `<a href>` de propósito (o toque tem de virar navegação,
     ver BotaoExportar em components/publico16/cop/dashboard-cop.tsx), então a
     navegação ia parar na tela de login em vez de baixar o arquivo. No desktop
     o defeito ficava escondido: quem trabalha na Sala de Comando tem a sessão, e
     o PNG ainda tinha o plano B de rasterizar no próprio navegador.

     Não expõem nada novo: o arquivo é a fotografia do /cop2026/dashboard, que
     está ABERTO desde 08/09/2026 por determinação do Comando (ver
     ROTAS_RESTRITAS_COP em lib/cop2026-acesso.ts). Fechar a exportação sem
     fechar o painel escondia o botão, não o dado. A identidade continua valendo
     para quem TEM sessão: prepararExportacao() assina o cookie do headless com
     o e-mail de quem exportou e emite `null` para quem chegou pelo link.

     NÃO existe subrota sob nenhuma das duas, e não deve existir: a lista casa
     por prefixo. */
  "/api/cop2026/briefing-png",
  "/api/cop2026/briefing-pdf",
  /* Carimbo do que está no ar: commit, horário da publicação e versão do
     portal. Aberta porque quem mais precisa dela é quem NÃO tem sessão — o
     `scripts/publicar.mjs` conferindo se o deploy subiu, e o policial que quer
     saber se o portal dele está velho antes de relatar um bug já corrigido.

     Não devolve pessoa, lançamento nem fração: três campos de metadado de
     build. NÃO existe subrota, e não deve existir — a lista casa por prefixo. */
  "/api/cop2026/versao",
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

/* /cop2026 é público por prefixo. Esta lista quebra a herança para o que ainda
   é restrito — hoje só a ADMINISTRAÇÃO — e é conferida ANTES da lista de
   públicas. O Dashboard, o Briefing e os Relatórios saíram dela em 08/09/2026
   por determinação do Comando: ver ROTAS_RESTRITAS_COP em lib/cop2026-acesso.ts,
   onde está escrito o que essa abertura expõe. */
function ehRotaRestritaCop(pathname: string): boolean {
  // A exceção vem primeiro: `/cop2026/admin/lancamentos` é consulta aberta
  // morando sob um prefixo restrito — ver ABERTAS_SOB_ADMIN_COP.
  if (ABERTAS_SOB_ADMIN_COP.some((rota) => pathname === rota)) return false;
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
