import "server-only";
import type { Browser, Page } from "puppeteer-core";

/**
 * Rasterização do painel da COP no SERVIDOR — e o motivo de ela existir.
 *
 * O botão de exportar desenhava o PNG dentro do navegador de quem clicava
 * (modern-screenshot → <foreignObject> → <canvas>). No WebKit do iPhone essa
 * cadeia falha CALADA em quatro pontos independentes: o `data:` URL do SVG
 * serializado passa de vários MB e não decodifica; o carregador da biblioteca
 * resolve tanto no `load` quanto no `error`; o iOS descarta canvas acima de
 * ~16,7 Mpx devolvendo superfície em branco; e a primeira chamada volta vazia
 * por bug conhecido do WebKit. Como o bloco exportado passa de 5.000px de
 * altura a 1240px de largura, o painel caía exatamente nessa faixa — daí os
 * "espaços dos dados em branco" e o erro que só aparecia em alguns aparelhos.
 *
 * Nada disso é ajustável: depende do modelo do iPhone e da memória livre no
 * instante do clique. Por isso o desenho mudou de lado. Aqui o Chromium é de
 * verdade, o viewport é sempre o mesmo, e o celular só faz baixar o arquivo.
 */

/** Largura de captura. Não é um número de estética: é o menor viewport em que a
 *  tabela "Tendência por Fração" cabe SEM rolagem. Ela pede ~1.250px de colunas
 *  e o container do painel é `max-w-[1400px]` com 20px de recuo de cada lado —
 *  a 1240px as duas últimas colunas (QUINZENA e AÇÃO) saíam cortadas na borda
 *  do PNG. Mudar este número muda o LAYOUT (breakpoints do Tailwind), não só o
 *  tamanho do arquivo. */
export const BRIEFING_LARGURA = 1440;
/** Altura inicial do viewport. O painel é mais alto que isso; quem define o
 *  recorte final é a caixa do elemento, não esta altura. */
const BRIEFING_ALTURA = 2000;
/** 2× para o PNG aguentar projeção e zoom sem serrilhar. */
const BRIEFING_ESCALA = 2;

/* O Chromium não tem o limite do iOS, mas tem os seus: a superfície de
   composição não passa de 16.384px por lado, e cada megapixel custa 4 MB de
   bitmap na memória da função. O teto de área abaixo mantém o pico bem longe
   do limite de memória mesmo com o painel crescendo. */
const CAPTURA_LADO_MAX = 16_000;
const CAPTURA_AREA_MAX = 40_000_000;

/* Os 30s de fábrica do Puppeteer não cobrem o pior caso real: na instância fria
   o @sparticuz descompacta o Chromium para /tmp ANTES de o processo subir, e a
   máquina pode estar disputando CPU. Medido no pc1 sob carga, só o lançamento
   levou 14s. Estourar aqui derruba a exportação inteira por impaciência. */
const ESPERA_LANCAMENTO_MS = 60_000;
/* A captura de um painel de vários milhares de pixels é uma única chamada de
   protocolo demorada; o teto de fábrica (180s) é generoso, mas fixá-lo abaixo
   do maxDuration da rota faz o erro chegar como mensagem em vez de 504 mudo. */
const ESPERA_PROTOCOLO_MS = 50_000;

export const SELETOR_PAINEL = '[data-briefing="painel"]';

/**
 * O Chromium é reaproveitado entre requisições da MESMA instância quente. Subir
 * o binário custa 2–4s; num turno de Comando com vários cliques seguidos, pagar
 * isso uma vez só é a diferença entre "demorou" e "travou". Instância fria abre
 * um novo, e o `connected` garante que um processo morto não seja servido.
 */
let navegador: Browser | null = null;

async function abrirNavegador(): Promise<Browser> {
  if (navegador?.connected) return navegador;

  const puppeteer = await import("puppeteer-core");

  /* Em desenvolvimento o binário do @sparticuz/chromium não serve: ele é
     compilado para a Amazon Linux das funções da Vercel. Na máquina local o
     caminho vem do CHROME_PATH — ver README da rota. Sem a variável, o import
     do pacote falha com mensagem explícita em vez de erro obscuro. */
  const caminhoLocal = process.env.CHROME_PATH;
  if (caminhoLocal) {
    navegador = await puppeteer.launch({
      executablePath: caminhoLocal,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      timeout: ESPERA_LANCAMENTO_MS,
      protocolTimeout: ESPERA_PROTOCOLO_MS,
    });
    return navegador;
  }

  const chromium = (await import("@sparticuz/chromium")).default;

  /* WebGL desligado: o painel é SVG e CSS, não usa canvas 3D. Ligado, o pacote
     descompacta o swiftshader junto — memória e espaço em /tmp gastos à toa numa
     função que tem pouco dos dois. */
  chromium.setGraphicsMode = false;

  navegador = await puppeteer.launch({
    /* `chromium.args` já traz `--headless='shell'`, `--no-sandbox` e
       `--single-process`. O `headless: "shell"` aqui é para o puppeteer-core
       falar o protocolo do binário certo: este Chromium é compilado com
       `headless.gn` e não entende o `--headless=new` que `headless: true`
       dispara. */
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: "shell",
    timeout: ESPERA_LANCAMENTO_MS,
    protocolTimeout: ESPERA_PROTOCOLO_MS,
  });
  return navegador;
}

/** Chamado quando a captura falha: um Chromium em estado ruim envenenaria todas
 *  as requisições seguintes da mesma instância quente. */
async function descartarNavegador() {
  const morto = navegador;
  navegador = null;
  await morto?.close().catch(() => {});
}

/** Escala que cabe nos limites do compositor e da memória da função. Derivada
 *  da altura real do painel, nunca fixada num número mágico. */
function escalaSegura(largura: number, altura: number) {
  const limite = Math.min(
    BRIEFING_ESCALA,
    CAPTURA_LADO_MAX / Math.max(largura, altura),
    Math.sqrt(CAPTURA_AREA_MAX / (largura * altura))
  );
  return Math.max(1, Number(limite.toFixed(2)));
}

export type CookieDeAcesso = { nome: string; valor: string; dominio: string };

/**
 * FILA DE UMA CAPTURA POR VEZ — e por que ela é obrigatória aqui.
 *
 * O cookie de sessão é posto com `browser.setCookie()`, que vale para o
 * NAVEGADOR inteiro, não para a aba (ver o comentário do `--single-process`
 * abaixo: contexto isolado não é possível neste binário). O navegador, por sua
 * vez, é reaproveitado entre requisições da mesma instância quente.
 *
 * Sem serializar, duas exportações simultâneas na mesma instância se atropelam:
 * a segunda chama `setCookie` antes de a primeira ter navegado, e a primeira
 * fotografa o painel com a sessão da segunda — o recorte nominal de um auditor
 * dentro do arquivo do outro. Pior ainda, o `finally` de uma apaga o cookie que
 * a outra ainda está usando.
 *
 * O custo é real e aceito: capturas concorrentes na mesma instância viram
 * sequenciais (a Vercel continua livre para escalar em instâncias novas, que
 * têm cada uma o seu Chromium). Numa exportação que já leva dezenas de segundos,
 * esperar a anterior é muito mais barato que vazar sessão entre auditores.
 */
let filaDeCaptura: Promise<unknown> = Promise.resolve();

function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  /* O `catch` no encadeamento é o que impede uma captura que falhou de derrubar
     todas as seguintes: a fila segue viva, o erro continua indo para quem
     chamou pelo `resultado`. */
  const resultado = filaDeCaptura.then(tarefa, tarefa);
  filaDeCaptura = resultado.catch(() => {});
  return resultado;
}

/**
 * Abre a página em modo briefing, entrega a aba pronta a `render` e limpa tudo
 * depois. Existe para que PNG e PDF compartilhem exatamente a mesma preparação
 * — mesma sessão, mesmo viewport, mesma espera de rede e de fonte — e difiram
 * só no último passo. Quando os dois formatos divergem na preparação, um deles
 * envelhece em silêncio.
 */
function comPaginaDoPainel<T>(
  url: string,
  cookie: CookieDeAcesso,
  render: (pagina: Page) => Promise<T>
): Promise<T> {
  return emFila(() => capturar(url, cookie, render));
}

async function capturar<T>(
  url: string,
  cookie: CookieDeAcesso,
  render: (pagina: Page) => Promise<T>
): Promise<T> {
  const biscoito = {
    name: cookie.nome,
    value: cookie.valor,
    domain: cookie.dominio,
    path: "/",
    httpOnly: true,
    secure: cookie.dominio !== "localhost",
  };

  let pagina: Page | null = null;
  let navegadorUsado: Browser | null = null;
  try {
    const browser = await abrirNavegador();
    navegadorUsado = browser;

    /* Contexto PADRÃO, e não um contexto isolado por captura.
       `createBrowserContext()` seria o isolamento certo — o navegador é
       reaproveitado entre requisições e cookie de sessão não pode sobreviver de
       uma para a seguinte — mas o `chromium.args` do @sparticuz inclui
       `--single-process`, obrigatório no Lambda para não esbarrar em
       `prctl(PR_SET_NO_NEW_PRIVS) failed`. Nesse modo o Chromium não consegue
       criar um segundo contexto: ele morre ao abrir a primeira aba, e o erro
       sobe como `Protocol error (Target.createTarget): Target closed`, que não
       menciona contexto nenhum.
       O isolamento é feito à mão, apagando o cookie no `finally`. */
    await browser.setCookie(biscoito);

    pagina = await browser.newPage();
    await pagina.setViewport({
      width: BRIEFING_LARGURA,
      height: BRIEFING_ALTURA,
      deviceScaleFactor: BRIEFING_ESCALA,
    });

    /* Sem isto o PNG sai não-determinístico: a faixa que atravessa a barra-resumo,
       o pulso do "ao vivo" e o tremor da agulha são animações infinitas, e cada
       captura pegaria uma pose diferente. O globals.css já desliga todas em
       `prefers-reduced-motion: reduce` PRESERVANDO o estado base — então emular
       a preferência é mais fiel do que injetar `animation: none`, que apagaria
       elementos cuja entrada começa em opacidade zero. */
    await pagina.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);

    /* `networkidle0` e não `load`: o painel lê a planilha no servidor e monta
       os gráficos depois da hidratação. Esperar só o `load` fotografa o
       esqueleto. */
    const resposta = await pagina.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
    if (!resposta?.ok()) {
      throw new Error(`a página do painel respondeu ${resposta?.status() ?? "sem status"}`);
    }

    const alvo = await pagina.waitForSelector(SELETOR_PAINEL, { timeout: 20_000 });
    if (!alvo) throw new Error("o bloco do briefing não apareceu na página");

    /* As fontes são do next/font, auto-hospedadas. Sem esta espera o arquivo sai
       na fonte de fallback e os números mudam de largura entre uma exportação e
       outra. */
    await pagina.evaluate(() => document.fonts.ready);

    return await render(pagina);
  } catch (erro) {
    await descartarNavegador();
    throw erro;
  } finally {
    /* Sem contexto isolado a limpeza é manual, e não pode ser esquecida: o
       navegador sobrevive à requisição e o cookie é de sessão nominal. A
       remoção vai pela ABA — é a única assinatura que aceita a chave do cookie
       em vez do objeto inteiro — e por isso acontece ANTES de fechá-la. No
       caminho de erro o navegador já foi descartado, e aí não sobra jarra
       nenhuma para limpar. */
    if (navegadorUsado?.connected) {
      await pagina
        ?.deleteCookie({ name: biscoito.name, domain: biscoito.domain, path: biscoito.path })
        .catch(() => {});
    }
    await pagina?.close().catch(() => {});
  }
}

/**
 * PNG do bloco `[data-briefing]` — uma imagem só, para colar no WhatsApp.
 *
 * O arquivo sai alto (o painel passa de 3.000px de altura a 1440 de largura),
 * e essa é a natureza do formato: imagem não pagina. Quem precisa LER o
 * conteúdo com calma, ou imprimir, usa o PDF.
 */
export async function capturarPainel(url: string, cookie: CookieDeAcesso): Promise<Buffer> {
  return comPaginaDoPainel(url, cookie, async (pagina) => {
    const alvo = await pagina.$(SELETOR_PAINEL);
    if (!alvo) throw new Error("o bloco do briefing sumiu antes da captura");

    const caixa = await alvo.boundingBox();
    if (!caixa || caixa.height < 200) {
      throw new Error(`o bloco do briefing mediu ${caixa?.height ?? 0}px de altura`);
    }

    const escala = escalaSegura(caixa.width, caixa.height);
    if (escala !== BRIEFING_ESCALA) {
      await pagina.setViewport({
        width: BRIEFING_LARGURA,
        height: BRIEFING_ALTURA,
        deviceScaleFactor: escala,
      });
    }

    const png = await alvo.screenshot({ type: "png", captureBeyondViewport: true });
    return Buffer.from(png);
  });
}

/* ------------------------------------------------------------------ PDF */

/* A4 DEITADO, e não em pé. Em pé o papel tem 794px de largura útil a 96dpi —
   abaixo do breakpoint `lg` (1024px), então o painel cairia no layout de
   celular e a tabela de Tendência por Fração, que pede ~1.250px de colunas,
   estouraria a margem. Deitado o papel dá 1.123px, e o `escala` abaixo abre
   ainda mais espaço. */
const PDF_ESCALA = 0.78;
/* Margem lateral curta porque o conteúdo é tabela larga; a de cima e a de baixo
   precisam caber o cabeçalho e o rodapé institucionais. */
const PDF_MARGEM = { top: "13mm", bottom: "13mm", left: "8mm", right: "8mm" };

/** Cabeçalho e rodapé são HTML próprio do Chromium: não herdam a folha de
 *  estilo da página, então tudo aqui é inline e em `pt`. */
function moldura(titulo: string) {
  const base =
    "font-family:Georgia,'Times New Roman',serif;font-size:8pt;color:#55535e;width:100%;padding:0 9mm;";
  return {
    cabecalho: `<div style="${base}display:flex;justify-content:space-between;align-items:center;border-bottom:0.5pt solid #ca0202;padding-bottom:2mm;">
        <span style="font-weight:bold;color:#ca0202;letter-spacing:0.08em;text-transform:uppercase;">16º BPM/M — Auditoria de COP 2026</span>
        <span>${titulo}</span>
      </div>`,
    /* "Página X de Y" com as classes que o Chromium substitui sozinho. Num
       documento que circula impresso, folha sem número é folha que se perde. */
    rodape: `<div style="${base}display:flex;justify-content:space-between;align-items:center;padding-top:2mm;">
        <span style="font-style:italic;">Documento operacional — não distribuir fora do Batalhão.</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`,
  };
}

/**
 * PDF paginado do mesmo painel — a resposta para o PNG que ficou alto demais.
 *
 * Roda em mídia `print`, e não `screen`: a folha de impressão do globals.css já
 * resolve o que o papel precisa — `break-inside: avoid` nos cartões para nenhum
 * quadro nascer partido entre duas páginas, sombras removidas, fundo branco.
 * Reaproveitar essa folha em vez de inventar outra é o que mantém o PDF
 * coerente com o botão "Imprimir" que já existia na tela.
 *
 * `printBackground: true` é obrigatório: sem ele o Chromium descarta TODA cor
 * de fundo, e o semáforo operacional — que é o que o Comando lê primeiro —
 * sairia em cinza. Faixa sem cor num painel de faixa é papel em branco.
 */
export async function gerarPainelPdf(
  url: string,
  cookie: CookieDeAcesso,
  titulo: string
): Promise<Buffer> {
  return comPaginaDoPainel(url, cookie, async (pagina) => {
    await pagina.emulateMediaType("print");
    /* Trocar de mídia refaz o layout: sem um quadro de folga a medição e a
       paginação saem do estado anterior. */
    await pagina.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
    );

    const { cabecalho, rodape } = moldura(titulo);
    const pdf = await pagina.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      scale: PDF_ESCALA,
      margin: PDF_MARGEM,
      displayHeaderFooter: true,
      headerTemplate: cabecalho,
      footerTemplate: rodape,
      /* O `@page { size: A4 portrait }` do globals.css serve ao Ctrl+P do
         navegador. Aqui quem manda é o `format`/`landscape` acima — daí o
         `preferCSSPageSize` ficar falso, que é o padrão, dito em voz alta. */
      preferCSSPageSize: false,
    });
    return Buffer.from(pdf);
  });
}
