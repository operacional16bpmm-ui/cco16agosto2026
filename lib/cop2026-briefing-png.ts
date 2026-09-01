import "server-only";
import type { Browser, BrowserContext } from "puppeteer-core";

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

/** A largura em que o painel foi desenhado para ser lido — acima do breakpoint
 *  `lg` (1024px) e abaixo do `xl` (1280px), que é o recorte que o Comando
 *  aprovou no telão. Mudar este número muda o LAYOUT, não só o tamanho. */
export const BRIEFING_LARGURA = 1240;
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
  navegador = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
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

/**
 * Abre a página em modo briefing e devolve o PNG do bloco `[data-briefing]`.
 *
 * @param url    endereço absoluto da própria aplicação, já com `?briefing=1`
 * @param cookie sessão de acesso à COP, emitida pela rota que chama esta função
 */
export async function capturarPainel(
  url: string,
  cookie: { nome: string; valor: string; dominio: string }
): Promise<Buffer> {
  let contexto: BrowserContext | null = null;
  try {
    const browser = await abrirNavegador();

    /* Contexto isolado por captura: o navegador é compartilhado entre
       requisições, e cookie de sessão não pode sobreviver de uma para a
       seguinte. Fechar o contexto leva junto os cookies e o cache. */
    contexto = await browser.createBrowserContext();
    await contexto.setCookie({
      name: cookie.nome,
      value: cookie.valor,
      domain: cookie.dominio,
      path: "/",
      httpOnly: true,
      secure: cookie.dominio !== "localhost",
    });

    const pagina = await contexto.newPage();
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

    /* As fontes são do next/font, auto-hospedadas. Sem esta espera o PNG sai na
       fonte de fallback e os números mudam de largura entre uma exportação e
       outra. */
    await pagina.evaluate(() => document.fonts.ready);

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
  } catch (erro) {
    await descartarNavegador();
    throw erro;
  } finally {
    await contexto?.close().catch(() => {});
  }
}
