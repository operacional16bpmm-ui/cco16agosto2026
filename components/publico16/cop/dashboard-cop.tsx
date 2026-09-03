"use client";

/**
 * Contrato de largura desta tela — 31/08/2026.
 *
 * O painel só não estoura no celular enquanto as três regras abaixo valerem ao
 * mesmo tempo. Quebrar qualquer uma devolve a rolagem horizontal na PÁGINA
 * INTEIRA, e não no elemento culpado — foi assim que a v3 abriu com 1400px de
 * largura numa tela de 390px sem que nenhum cartão parecesse errado.
 *
 * 1. A página hospedeira não envolve o painel num container `flex-column`.
 *    Ali as margens automáticas do `mx-auto` no container de `max-w-[1400px]`
 *    CANCELAM o `align-self: stretch` (CSS Flexbox §9.4.11): o bloco deixa de
 *    valer a largura do pai e passa a `fit-content`, que cresce até o
 *    min-content das tabelas. Na prática o `max-w` vira `width`.
 * 2. Todo item de grid que receba tabela larga carrega `min-w-0` — sem isso o
 *    `min-width: auto` do item vale o min-content da tabela e estica a trilha.
 * 3. Toda tabela com `min-w-[...]` vive dentro de um envoltório que rola
 *    sozinho (`overflow-x-auto` / `overflow-auto`).
 *
 * Medir sempre por `document.documentElement.scrollWidth` contra o
 * `clientWidth`, nunca por `window.innerWidth`, que mente sob emulação.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileWarning,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { domToPng } from "modern-screenshot";
import { CartaoTrajetoria } from "@/components/publico16/cop/ciclo/cartao-trajetoria";
import { FaixaRitmos } from "@/components/publico16/cop/ciclo/faixa-ritmos";
import { CaixaTendencia } from "@/components/publico16/cop/ciclo/caixa-tendencia";
import { CurvaPlanoRealizado } from "@/components/publico16/cop/ciclo/curva-plano";
import { fmtDias, fmtRitmo, progressoDoMes } from "@/lib/cop2026-tendencia";
import {
  MATRIZ_PROPORCIONAL_2026,
  META_TOTAL_BATALHAO,
  ORDEM_SUBUNIDADES,
  ROTULO_SUBUNIDADE,
  type LancamentoCop,
  type MetaSubunidade,
} from "@/lib/cop2026";
import {
  FILTROS_VAZIOS,
  FMT,
  PCT,
  auditoresParaCsv,
  calcularPainel,
  diasDaSemana,
  lancamentosParaCsv,
  conclusaoDistribuicao,
  conclusaoFunil,
  conclusaoHorario,
  conclusaoPareto,
  conclusaoQualidade,
  conclusaoRitmo,
  escreverFiltros,
  veredito,
  type Excecao,
  type Filtros,
  type LinhaAuditor,
} from "@/lib/cop2026-metricas";
import { cn } from "@/lib/utils";
import { entregarArquivo, suportaEntregaNativa } from "@/lib/entregar-arquivo";
import { toast } from "sonner";
import { Cartao, Selo, SemDados } from "./primitivos";
import { PaletaComando } from "./paleta-comando";
import {
  AgulhaoMetas,
  BarrasSimples,
  Boxplot,
  COR_FAIXA,
  Funil,
  Heatmap,
  Histograma,
  Pareto,
  ProducaoDiaria,
  QuadroSemanalBatalhao,
  RankingFracoes,
} from "./graficos";

const ABAS = [
  { id: "ritmo", rotulo: "Ritmo" },
  { id: "qualidade", rotulo: "Qualidade" },
  { id: "distribuicao", rotulo: "Distribuição" },
  { id: "pessoas", rotulo: "Pessoas" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

type Coluna = "nome" | "lanc" | "turnos" | "videos" | "media" | "abaixo";

/** A aba inativa continua no DOM, só escondida: é o que permite ao
 *  `@media print` expandir as quatro de uma vez sem obrigar o Comando a
 *  imprimir quatro páginas, uma por clique. `display: contents` para o grupo
 *  não criar um nível extra dentro do grid. */
function ListaExcecao({
  titulo,
  itens,
  vazio,
  semJustificativa,
  comParte,
  emCurso,
  diasDecorridos,
  janelaDias,
  totalNoRecorte,
}: {
  titulo: string;
  itens: Excecao[];
  vazio: string;
  semJustificativa: string;
  comParte?: boolean;
  /** Janela para virar padrão de atenção ainda não fechou — mostra "em curso"
   *  em vez de listar quem teve um único desvio no dia 2 do período mínimo. */
  emCurso?: boolean;
  diasDecorridos?: number;
  janelaDias?: number;
  /** Quantos lançamentos do desvio existem no RECORTE, mesmo antes de virarem
   *  ponto de atenção. Fica visível como cinza para o Comando saber que o dado
   *  existe, mesmo com a lista contida. */
  totalNoRecorte?: number;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center justify-between gap-2 rotulo-dado text-texto-suave">
        {titulo}
        <span
          className={cn(
            "dados-destaque text-lg",
            emCurso ? "text-texto-suave" : itens.length ? "text-sinal-critico" : "text-sinal-conforme"
          )}
        >
          {emCurso ? "—" : FMT.format(itens.length)}
        </span>
      </p>
      {emCurso ? (
        <div className="rounded-lg border border-dashed border-borda px-3 py-4 text-center text-[12.5px] leading-relaxed text-texto-suave">
          Em curso — padrão só se caracteriza a partir de {janelaDias} dia
          {janelaDias === 1 ? "" : "s"} de auditoria.
          <br />
          <span className="dados text-[11.5px]">
            {FMT.format(diasDecorridos ?? 0)} de {FMT.format(janelaDias ?? 0)} decorrido
            {(diasDecorridos ?? 0) === 1 ? "" : "s"}
            {totalNoRecorte ? ` · ${FMT.format(totalNoRecorte)} caso(s) no recorte` : ""}
          </span>
        </div>
      ) : itens.length ? (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={`${i.id}-${i.parte}`} className="rounded-lg border border-borda px-3 py-2.5">
              <p className="text-[13px] font-semibold text-branco">
                {comParte ? `Parte ${i.parte}` : i.quem}
              </p>
              <p className="dados mt-0.5 text-[11.5px] text-texto-suave">
                {i.fracao} · {formatarData(i.data)}
                {i.turno ? ` · ${i.turno}` : ""}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
                {comParte ? i.quem : i.justificativa || semJustificativa}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-borda px-3 py-4 text-center text-[12.5px] text-texto-suave">
          {vazio}
        </p>
      )}
    </div>
  );
}

function Th({
  col,
  children,
  num,
  ordem,
  ordenar,
}: {
  col: Coluna;
  children: React.ReactNode;
  num?: boolean;
  ordem: { col: Coluna; desc: boolean };
  ordenar: (col: Coluna) => void;
}) {
  return (
    <th scope="col" className={cn("px-4 py-3", num && "text-right")}>
      <button
        type="button"
        onClick={() => ordenar(col)}
        className="inline-flex items-center gap-1 hover:text-vermelho"
        aria-label={`Ordenar por ${String(children)}`}
      >
        {children}
        <ArrowUpDown
          size={12}
          className={cn("opacity-40", ordem.col === col && "opacity-100")}
          aria-hidden
        />
      </button>
    </th>
  );
}

/** A planilha guarda ISO; o Batalhão lê dd/mm/aaaa. */
function formatarData(iso: string) {
  if (!iso) return "sem data";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

/* Regras do modo briefing (`?briefing=1`) — o que faz o arquivo conter só o
   painel, e conter o painel INTEIRO:
   1. tudo que é irmão do bloco exportado — hero, barra de recorte, abas,
      tabelas analíticas — sai da árvore visual. Fora reduzir o arquivo, isso
      corta o tempo de render do headless e evita que a barra `sticky` de
      filtros cubra o topo do painel quando o Chromium rola até ele;
   2. o botão de exportar vive DENTRO do bloco (é ele que dispara a captura) e
      apareceria no próprio arquivo. `data-no-briefing` já era a marca usada
      pelo modo antigo, então a mesma marca serve aos dois caminhos;
   3. as tabelas largas (Tendência por Fração, calendário) vivem em envoltórios
      com `overflow-x-auto`: na tela quem rola é o dedo, mas no PNG a rolagem
      não existe e as últimas colunas — QUINZENA e AÇÃO — sumiam cortadas na
      borda direita. Soltar o recorte é o que faz o arquivo conter a tabela
      inteira; a largura de captura (BRIEFING_LARGURA) é escolhida para
      caber nelas;
   4. no PDF o mesmo bloco é PAGINADO, e o que na tela é uma rolagem contínua no
      papel vira corte. Sem estas regras a folha 2 começava no meio do
      velocímetro e a tabela de frações partia entre a linha da 3ª Cia e a da
      4ª — o leitor perde a referência da coluna. `break-inside: avoid` mantém
      cada quadro inteiro, e a folha de impressão do globals.css já faz o mesmo
      por `.cartao-painel`; aqui a regra alcança as seções e as linhas de tabela,
      que ela não cobre. */
const MODO_BRIEFING_CSS = `
.modo-briefing > *:not([data-briefing="painel"]) { display: none !important; }
.modo-briefing [data-no-briefing="true"] { display: none !important; }
.modo-briefing .overflow-x-auto,
.modo-briefing .overflow-auto { overflow: visible !important; }

@media print {
  /* A4 DEITADO, declarado aqui e não só na chamada do Puppeteer: o globals.css
     traz um @page com size A4 portrait para o Ctrl+P do navegador, e essa
     declaracao VENCE a flag landscape do gerador — o PDF saia em pe, com a
     tabela de fracoes espremida. Em modo briefing a ultima palavra e esta.
     (Sem acento grave neste bloco: ele vive dentro de um template literal.) */
  @page { size: A4 landscape; }

  /* O mapa do site mora no layout do grupo publico, FORA desta arvore, entao a
     regra de irmaos ali em cima nao o alcanca. No PNG ele nunca apareceu porque
     a captura recorta no elemento; o PDF imprime a pagina inteira, e a folha 4
     terminava com a barra azul-noite de navegacao no meio do documento. Layout
     nao recebe searchParams no Next, entao o corte e por CSS mesmo. */
  [aria-label="Mapa do site"] { display: none !important; }

  .modo-briefing [data-briefing="painel"] > section,
  .modo-briefing [data-briefing="painel"] table,
  .modo-briefing [data-briefing="painel"] tr,
  /* Marca explicita nos cartoes de KPI. Sem ela o "Conformidade" nascia partido
     entre a folha 1 e a 2, com o numero de um lado e o rotulo do outro.
     Proteger todo filho de grid, em vez destes, custava duas folhas a mais: os
     envoltorios de 12 colunas viravam blocos indivisiveis e o navegador parava
     de preencher a pagina. */
  .modo-briefing .cartao-kpi { break-inside: avoid; page-break-inside: avoid; }
  /* Cabeçalho de tabela se repete em toda folha: tabela longa sem cabeçalho na
     página seguinte é coluna de números sem nome. */
  .modo-briefing [data-briefing="painel"] thead { display: table-header-group; }
  /* O fundo do bloco é claro por definição (#edf2f7); no papel ele só gastaria
     tinta na borda de cada folha. */
  .modo-briefing [data-briefing="painel"] { background: #fff !important; }
}
`;

/**
 * Botão redondo de exportação.
 *
 * `<a>` e não `<button>`: no celular o toque tem de virar NAVEGAÇÃO, não
 * JavaScript — é o que faz o Safari abrir o download nativo em vez de esperar
 * uma folha de compartilhamento que a ativação do toque já não autoriza (ver
 * `aoTocarExportar` e lib/entregar-arquivo.ts). O `href` de verdade também
 * deixa o endereço copiável pelo menu de contexto, para colar no WhatsApp.
 *
 * O rótulo fica ESCRITO no botão, e não só no `title`: dois círculos vermelhos
 * com ícone de documento seriam indistinguíveis, e num painel de Comando quem
 * erra o botão baixa 4 MB pelo 4G à toa.
 */
function BotaoExportar({
  href,
  onClick,
  ocupado,
  rotulo,
  titulo,
  className,
}: {
  href: string;
  onClick: (evento: React.MouseEvent<HTMLAnchorElement>) => void;
  ocupado: boolean;
  rotulo: string;
  titulo: string;
  className: string;
}) {
  return (
    <a
      href={href}
      download
      onClick={onClick}
      aria-disabled={ocupado || undefined}
      aria-label={titulo}
      title={titulo}
      className={cn(
        "group flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border-2 text-white transition-all duration-300 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-wait aria-disabled:opacity-80",
        className
      )}
    >
      {ocupado ? (
        <Loader2 size={20} className="animate-spin" aria-hidden="true" />
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5"
            aria-hidden="true"
          >
            <path d="M6.5 3.5h7l4 4v13h-11z" />
            <path d="M13.5 3.5v4h4" />
            <path d="M12 10.5v5" />
            <path d="m9.8 13.3 2.2 2.2 2.2-2.2" />
          </svg>
          <span className="dados text-[9px] font-black leading-none tracking-wider">{rotulo}</span>
        </>
      )}
    </a>
  );
}

function Grupo({ ativo, children }: { ativo: boolean; children: React.ReactNode }) {
  return (
    <div className={ativo ? "contents" : "hidden print:contents"} aria-hidden={!ativo}>
      {children}
    </div>
  );
}

/* ---------------- Exportação do briefing em PNG ----------------

   O painel é rasterizado dentro de um <iframe> de largura fixa, e não num clone
   solto no documento. O motivo é que as media queries do Tailwind (`md:`, `lg:`)
   respondem ao VIEWPORT, não ao container: um clone esticado para 1240px dentro
   de uma tela de celular continua com o layout empilhado do celular, só que mais
   largo — o PNG sai numa tira vertical de vários milhares de pixels. O iframe dá
   um viewport de verdade, então o celular exporta exatamente o painel que o
   Comando lê no telão do CCO.

   Duas armadilhas já custaram entregas erradas e estão resolvidas aqui:
   - esconder o palco com `visibility: hidden` ou `opacity: 0` NO NÓ capturado: o
     modern-screenshot copia o estilo computado para dentro do foreignObject, e o
     PNG volta liso, sem erro nenhum. Quem fica escondido é o <iframe>, que é
     outro documento; o conteúdo dentro dele permanece visível.
   - fixar a altura e cortar com `overflow: hidden`: isso recorta o painel, não o
     ajusta. A altura aqui é sempre a altura natural do conteúdo. */

/* MESMO valor de `BRIEFING_LARGURA` em lib/cop2026-briefing-arquivo.ts, que é
   `server-only` e por isso não dá para importar daqui — se um mudar, mude o
   outro. Era 1240 (A4 retrato a 150 dpi) e ficou para trás quando o servidor
   subiu para 1440: a tabela "Tendência por Fração" pede ~1.250px de colunas, e
   a 1240 as duas últimas (QUINZENA e AÇÃO) saíam cortadas na borda. O plano B
   entregava justamente o PNG defeituoso no momento em que ele mais importa —
   quando o gerador do servidor já falhou. */
const BRIEFING_LARGURA = 1440;
/* Altura provisória do palco só para o primeiro cálculo de layout; qualquer
   coisa em `vh` precisa de um viewport plausível antes da medição real. */
const BRIEFING_ALTURA_INICIAL = 1754;
/* Canvas grande demais falha calado: o Safari/iOS descarta acima de ~16,7 Mpx e
   GPUs móveis não alocam dimensão acima de 8192px. A escala é derivada disso,
   nunca fixada num número mágico. */
const CANVAS_DIMENSAO_MAX = 8192;
const CANVAS_AREA_MAX = 16_000_000;
/* Um PNG legítimo deste painel passa de centenas de KB em base64. Abaixo disso a
   rasterização voltou em branco e é melhor falhar alto do que baixar um retângulo
   cinza achando que deu certo. */
const BRIEFING_BYTES_MIN = 20_000;

function escalaSegura(largura: number, altura: number) {
  const limite = Math.min(
    CANVAS_DIMENSAO_MAX / largura,
    CANVAS_DIMENSAO_MAX / altura,
    Math.sqrt(CANVAS_AREA_MAX / (largura * altura)),
  );
  return Math.max(0.6, Math.min(2, limite));
}

/* Nenhuma espera do palco pode ser indefinida: uma folha de estilo que não
   responde ou uma imagem que nunca dispara `load` travaria o botão em "gerando"
   para sempre. Depois do limite a exportação segue com o que já carregou. */
const ESPERA_MAX_MS = 10_000;

function comLimite<T>(promessa: Promise<T>, ms = ESPERA_MAX_MS) {
  return Promise.race([
    promessa,
    new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
  ]);
}

function esperarRecurso(alvo: HTMLElement, pronto: () => boolean) {
  if (pronto()) return Promise.resolve();
  return comLimite(
    new Promise<void>((resolve) => {
      const fim = () => resolve();
      alvo.addEventListener("load", fim, { once: true });
      alvo.addEventListener("error", fim, { once: true });
    }),
  );
}

/* Um quadro para o layout aplicar as folhas de estilo recém-inseridas e outro
   para o navegador reconciliar; sem os dois, a medição sai do estado anterior. */
function proximoQuadro() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/* O painel herda do documento hospedeiro mais do que parece: as fontes chegam
   por variável CSS na className do <html> (next/font) e o tema institucional
   redefine tokens no ancestral `.tema-institucional` — `--branco`, por exemplo,
   vira grafite. Recriar a cadeia de ancestrais é o que impede o bloco de nascer
   com texto branco sobre fundo claro dentro do palco. */
function replicarContexto(doc: Document, node: HTMLElement) {
  doc.documentElement.className = document.documentElement.className;
  doc.documentElement.setAttribute(
    "style",
    `${document.documentElement.getAttribute("style") ?? ""};overflow:hidden`,
  );
  doc.body.className = document.body.className;
  doc.body.setAttribute("style", document.body.getAttribute("style") ?? "");
  doc.body.style.margin = "0";

  const ancestrais: HTMLElement[] = [];
  for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
    ancestrais.unshift(el);
  }

  let destino: HTMLElement = doc.body;
  for (const ancestral of ancestrais) {
    const envoltorio = doc.createElement(ancestral.tagName);
    envoltorio.className = ancestral.className;
    const inline = ancestral.getAttribute("style");
    if (inline) envoltorio.setAttribute("style", inline);
    /* O palco não rola: qualquer recorte herdado de um ancestral cortaria o
       painel exatamente como o bug que esta função existe para corrigir. */
    envoltorio.style.overflow = "visible";
    destino.appendChild(envoltorio);
    destino = envoltorio;
  }
  return destino;
}

async function copiarEstilos(doc: Document) {
  const base = doc.createElement("base");
  base.href = window.location.href;
  doc.head.appendChild(base);

  /* Clonar os nós em vez de ler `cssRules`: em produção o Next serve as folhas
     por <link> e em desenvolvimento por <style> inline, e ler regras de uma
     folha externa esbarra em CORS. Clonar cobre os dois casos sem exceção. */
  document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]').forEach((folha) => {
    doc.head.appendChild(doc.importNode(folha, true));
  });

  /* Tailwind v4 pode registrar camadas via adoptedStyleSheets, que não aparecem
     como nó no <head>. */
  const adotadas = document.adoptedStyleSheets ?? [];
  if (adotadas.length) {
    const extra = doc.createElement("style");
    extra.textContent = adotadas
      .flatMap((folha) => {
        try {
          return Array.from(folha.cssRules).map((regra) => regra.cssText);
        } catch {
          return [];
        }
      })
      .join("\n");
    if (extra.textContent) doc.head.appendChild(extra);
  }

  await Promise.all(
    Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((link) =>
      esperarRecurso(link, () => Boolean(link.sheet)),
    ),
  );
}

type PalcoBriefing = {
  alvo: HTMLElement;
  altura: number;
  desmontar: () => void;
};

/* Monta o palco, devolve o nó já posicionado e a altura natural que ele ocupa em
   1240px de viewport. Quem chama é responsável por `desmontar()`. */
async function montarPalcoBriefing(node: HTMLElement): Promise<PalcoBriefing> {
  const palco = document.createElement("iframe");
  palco.setAttribute("aria-hidden", "true");
  palco.setAttribute("tabindex", "-1");
  palco.setAttribute("scrolling", "no");
  /* Esconder é atribuição do <iframe>, nunca do conteúdo: o palco sai da tela
     por posição, e o documento de dentro continua plenamente visível. */
  palco.style.cssText = [
    "position:fixed",
    "top:0",
    `left:-${BRIEFING_LARGURA + 1000}px`,
    `width:${BRIEFING_LARGURA}px`,
    `height:${BRIEFING_ALTURA_INICIAL}px`,
    "border:0",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(palco);

  const desmontar = () => palco.remove();

  try {
    const doc = palco.contentDocument;
    if (!doc) throw new Error("o palco de exportacao nao abriu um documento");

    const destino = replicarContexto(doc, node);
    await copiarEstilos(doc);

    const alvo = doc.importNode(node, true) as HTMLElement;
    /* O que não vai para o arquivo sai do palco em vez de ser filtrado durante a
       rasterização: o `filter` do modern-screenshot percorre nós de texto junto
       e já apagou o conteúdo inteiro uma vez. Ambos são posicionados de forma
       absoluta, então remover não desloca nada. */
    alvo.querySelectorAll("video, [data-no-briefing='true']").forEach((no) => no.remove());
    /* O palco fica fora da tela, então imagem com `loading="lazy"` — o padrão do
       next/image — nunca entra no viewport e nunca carrega: a espera abaixo
       ficaria pendurada e o PNG sairia sem os brasões. */
    alvo.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.decoding = "sync";
    });
    destino.appendChild(alvo);

    await proximoQuadro();
    if (doc.fonts) await comLimite(doc.fonts.ready);
    await Promise.all(
      Array.from(doc.images).map((img) => esperarRecurso(img, () => img.complete)),
    );
    await proximoQuadro();

    /* Duas medições: a primeira acontece com o palco na altura provisória, e
       ajustar a altura do iframe muda o valor de `100vh` — o que pode mexer no
       layout. A segunda medição lê o estado já estabilizado. */
    const primeira = Math.ceil(alvo.getBoundingClientRect().height);
    palco.style.height = `${Math.max(primeira, 1)}px`;
    await proximoQuadro();
    const altura = Math.max(Math.ceil(alvo.getBoundingClientRect().height), primeira, 1);

    return { alvo, altura, desmontar };
  } catch (erro) {
    desmontar();
    throw erro;
  }
}

export function DashboardCop({
  lancamentos,
  metas,
  lidoEm,
  erro,
  filtrosIniciais,
  tendencia,
  janelaAtencaoDias,
  modoBriefing,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  erro?: string;
  filtrosIniciais: Filtros;
  /** Liga a caixa TENDENCIA. Nasceu como diferenca da V3; hoje o painel unico
   *  em /cop2026/dashboard sempre envia. Ausente = painel sem tendencia. */
  tendencia?: boolean;
  /** Janela para virar "ponto de atencao" — configurada pelo Comando no admin
   *  (cookie), padrao 7 dias. Ver lib/cop2026-config-atencao.ts. */
  janelaAtencaoDias?: number;
  /** Pagina aberta pelo Chromium de /api/cop2026/briefing-png para virar PNG.
   *  Some com a moldura interativa e congela o painel; ver MODO_BRIEFING_CSS. */
  modoBriefing?: boolean;
}) {
  // Ritmo de recuperacao em dias, para o KPI da caixa. Calculado, nunca fixo.
  const agoraSP = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  const progMes = progressoDoMes(
    new Date(Date.UTC(agoraSP[0], agoraSP[1] - 1, agoraSP[2], 12)),
    agoraSP[0],
    agoraSP[1]
  );
  const diasRestantes = progMes.diasMes - progMes.diasDecorridos;

  const router = useRouter();
  const [f, setF] = useState<Filtros>(filtrosIniciais);
  const [aba, setAba] = useState<Aba>("ritmo");
  const [ordem, setOrdem] = useState<{ col: Coluna; desc: boolean }>({ col: "videos", desc: true });
  const [atualizando, setAtualizando] = useState(false);
  /* Qual formato está sendo gerado, e não um booleano: com dois botões, um
     booleano faria os DOIS girarem quando só um foi tocado. Serve de trava
     também — a geração é cara e uma de cada vez basta. */
  const [formatoEmCurso, setFormatoEmCurso] = useState<"png" | "pdf" | null>(null);
  const exportandoBriefing = formatoEmCurso !== null;
  const primeiroRender = useRef(true);
  const painelBriefingRef = useRef<HTMLDivElement>(null);

  /* O recorte vive na URL para o link ser colável no WhatsApp com o filtro
     dentro. `history.replaceState` em vez de router.replace: trocar de filtro
     não é navegar — não deve empilhar histórico nem repetir a leitura da
     planilha no servidor. */
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const qs = escreverFiltros(f);
    window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [f]);

  /* A planilha revalida a cada 60s; o painel fica no telão do CCO e precisa
     acompanhar sem ninguém apertar nada. */
  const atualizar = useCallback(() => {
    setAtualizando(true);
    router.refresh();
    window.setTimeout(() => setAtualizando(false), 1200);
  }, [router]);

  /* Em modo briefing o relógio para: o headless espera a rede ficar ociosa
     antes de fotografar, e um refresh a cada 60s reabre a leitura da planilha
     no meio da captura — `networkidle0` nunca chegaria e a rota estouraria o
     tempo. */
  useEffect(() => {
    if (modoBriefing) return;
    const t = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(t);
  }, [atualizar, modoBriefing]);

  const p = useMemo(
    () => calcularPainel(lancamentos, metas, f, { janelaAtencaoDias }),
    [lancamentos, metas, f, janelaAtencaoDias]
  );
  const vBase = veredito(p);

  /* Como o período ativo se chama na tela. Com uma semana selecionada, meta e
     janela são da semana — e o texto tem que dizer isso, senão o painel escreve
     "passo normal do mês" ao lado de uma cota de 7 dias. */
  const rotuloPeriodo = f.semana === "todas" ? "mês" : "semana";
  const rotuloMeta =
    f.semana === "todas"
      ? `META GLOBAL — ${FMT.format(p.meta)} EVIDÊNCIAS`
      : `META DA SEMANA ${f.semana} — ${FMT.format(p.meta)} EVIDÊNCIAS`;

  /* GLOSSÁRIO — texto derivado da fonte única, nunca digitado.
     Os dois verbetes traziam números fixos ("240/sem", "1ª Cia 49/sem", "3ª Cia
     210 / 21,97%") que ficaram para trás quando o rateio semanal passou a ser
     por DIAS (§3-C dos padrões do Comando): o glossário afirmava 240 enquanto os
     cartões logo acima mostravam 225/224/223/288. Duas verdades na mesma tela,
     no lugar em que o leitor vai justamente tirar a dúvida. */
  const rateioDaMatriz = ORDEM_SUBUNIDADES.map((chave) => {
    const m = MATRIZ_PROPORCIONAL_2026[chave];
    return m ? `${m.rotulo} (${FMT.format(m.meta)} / ${PCT.format(m.pctMeta)}%)` : null;
  })
    .filter(Boolean)
    .join(", ");
  const rateioSemanal = p.semanasBatalhao
    .map((s) => `${s.rotulo} ${FMT.format(s.meta)}`)
    .join(" · ");

  /* Na V3 o prazo vem do CALENDARIO. O `veredito` de producao mede o que resta
     pelo numero de turnos com lancamento, e por isso anunciava "os 15 turnos
     previstos ja foram cumpridos" faltando um dia de mes — o mesmo defeito que
     a caixa TENDENCIA corrigiu no motor. Sem a prop, producao segue igual. */
  /* Dias restantes DO RECORTE, não do mês: com a Semana 1 isolada, a falta é de
     7 dias e dividi-la pelos 27 dias que sobram no mês pedia 6 por dia para uma
     cota que exige 32. */
  const diasRestantesRecorte = p.janela.diasRestantes;
  const v =
    tendencia && p.dados.length && p.pct <= 100 && p.falta > 0
      ? {
          ...vBase,
          detalhe:
            diasRestantesRecorte > 0
              ? `Auditoria em ${PCT.format(p.pct)}% da meta. Faltam ${FMT.format(
                  p.falta
                )} evidências em ${fmtDias(diasRestantesRecorte)} — ${fmtRitmo(
                  p.falta / diasRestantesRecorte
                )} por dia para fechar a meta.`
              : `Auditoria em ${PCT.format(p.pct)}% da meta. Faltam ${FMT.format(
                  p.falta
                )} evidências e o ${rotuloPeriodo} se encerrou — não há mais dia para recuperar.`,
        }
      : vBase;

  /* Nome do arquivo pela data de São Paulo. `toISOString()` devolve UTC, e às
     21h de Brasília isso já é o dia seguinte — o PNG do fechamento do mês
     nascia datado do mês que vem. */
  const nomeDoArquivo = useCallback(
    () =>
      `painel-cop-2026-${new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())}.png`,
    []
  );

  /* Endereço do PNG. É o mesmo `href` do botão: no celular o toque vai direto
     para cá como navegação, e no desktop o fetch abaixo o consome. Carrega o
     recorte da tela para o arquivo sair com o mesmo filtro. */
  const urlBriefingPng = `/api/cop2026/briefing-png${escreverFiltros(f)}`;
  const urlBriefingPdf = `/api/cop2026/briefing-pdf${escreverFiltros(f)}`;

  /* CAMINHO DO DESKTOP — o PNG vem pronto do servidor, por fetch.
     O navegador não desenha nada: a rota abre esta mesma página num Chromium
     headless e devolve o arquivo. O fetch existe pelo giro no botão, pelo aviso
     de erro e pela queda para o rasterizador local. No celular ele é PULADO de
     propósito — a espera de ~30s mata a ativação do toque; ver
     `aoTocarExportar` e lib/entregar-arquivo.ts. */
  const exportarPeloServidor = useCallback(async (): Promise<Blob> => {
    const resposta = await fetch(urlBriefingPng, {
      /* O cookie de acesso é httpOnly: sem `same-origin` a rota devolve 401. */
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!resposta.ok) {
      throw new Error(`a rota do briefing respondeu ${resposta.status}`);
    }
    const blob = await resposta.blob();
    if (blob.size < BRIEFING_BYTES_MIN) {
      throw new Error(`o servidor devolveu ${blob.size} bytes`);
    }
    return blob;
  }, [urlBriefingPng]);

  /* PLANO B — rasterização no próprio navegador, o método antigo.
     Fica de reserva para o caso de a função do Chromium falhar ou estourar o
     tempo: no desktop ela funciona bem, e é melhor entregar um PNG imperfeito
     do que nada na frente do Comando. NÃO é o caminho principal — ver o bloco
     "Exportação do briefing em PNG" no topo deste arquivo. */
  const exportarNoNavegador = useCallback(async (): Promise<Blob> => {
    if (!painelBriefingRef.current) throw new Error("o painel ainda não montou");
    const node = painelBriefingRef.current;
    let palco: PalcoBriefing | null = null;
    try {
      await document.fonts?.ready;
      palco = await montarPalcoBriefing(node);
      const { alvo, altura } = palco;

      /* modern-screenshot no lugar de html-to-image: o Tailwind v4 gera cores
         em oklch() e o painel usa next/image; o html-to-image rasterizava isso
         em branco (fundo liso, sem erro). O modern-screenshot renderiza pelo
         mesmo foreignObject do navegador, entao o resultado sai identico a tela. */
      const dataUrl = await domToPng(alvo, {
        width: BRIEFING_LARGURA,
        height: altura,
        scale: escalaSegura(BRIEFING_LARGURA, altura),
        backgroundColor: "#edf2f7",
        maximumCanvasSize: CANVAS_DIMENSAO_MAX,
      });

      /* Falhar alto em vez de baixar um retangulo cinza: quando a rasterizacao
         morre ela volta um PNG valido e vazio, sem lancar erro nenhum. */
      if (dataUrl.length < BRIEFING_BYTES_MIN) {
        throw new Error(`rasterizacao voltou vazia (${dataUrl.length} bytes)`);
      }

      return await (await fetch(dataUrl)).blob();
    } finally {
      /* O palco so pode cair depois do PNG estar em memoria: o modern-screenshot
         le estilo computado do no durante toda a rasterizacao. */
      palco?.desmontar();
    }
  }, []);

  const exportarBriefingPng = useCallback(async () => {
    if (exportandoBriefing) return;
    setFormatoEmCurso("png");

    let blob: Blob;
    let peloServidor = true;
    try {
      blob = await exportarPeloServidor();
    } catch (erroServidor) {
      console.error("[briefing] a rota do servidor falhou:", erroServidor);
      peloServidor = false;
      try {
        blob = await exportarNoNavegador();
      } catch (erroLocal) {
        console.error("[briefing] o plano B tambem falhou:", erroLocal);
        toast.error("Nao foi possivel gerar o painel em PNG. Tente novamente em instantes.");
        setFormatoEmCurso(null);
        return;
      }
    }

    try {
      await entregarArquivo(blob, nomeDoArquivo());
      toast.success(
        peloServidor
          ? "Painel completo exportado em PNG."
          : "Painel exportado pelo modo antigo — o gerador do servidor não respondeu."
      );
    } finally {
      setFormatoEmCurso(null);
    }
  }, [exportandoBriefing, exportarPeloServidor, exportarNoNavegador, nomeDoArquivo]);

  /**
   * O CELULAR NÃO PASSA PELO JAVASCRIPT — e é isto que conserta o iPhone.
   *
   * Deixar o toque seguir para o `href` transforma a exportação numa navegação
   * comum, e o `Content-Disposition: attachment` da rota faz o Safari abrir o
   * download nativo. Interceptar aqui com `preventDefault` seria reproduzir o
   * defeito por outra causa: o fetch demora ~30s, a *transient activation* do
   * toque expira em poucos segundos no iOS, e depois disso tanto o
   * `navigator.share` quanto o clique programático de `<a download>` são
   * recusados — 30 segundos de giro e nenhum arquivo.
   *
   * No desktop a interceptação vale a pena PARA O PNG: lá a espera não custa
   * ativação nenhuma, e é ela que dá o giro no botão, o aviso de erro e a queda
   * para o rasterizador local quando a função do servidor não responde. O PDF
   * não tem plano B no navegador — só o Chromium do servidor pagina —, então
   * interceptá-lo não traria nada além de atraso.
   */
  const aoTocarExportar = useCallback(
    (formato: "png" | "pdf") => (evento: React.MouseEvent<HTMLAnchorElement>) => {
      if (exportandoBriefing) {
        evento.preventDefault();
        return;
      }
      if (formato === "pdf" || suportaEntregaNativa()) {
        /* Sem `preventDefault`: a navegação É o caminho. O giro fica alguns
           segundos só para o toque ter resposta — quem mostra o progresso de
           verdade daqui em diante é o próprio navegador. */
        setFormatoEmCurso(formato);
        toast.message(
          `Gerando o painel em ${formato.toUpperCase()} no servidor — o download começa em instantes.`
        );
        window.setTimeout(() => setFormatoEmCurso(null), 8000);
        return;
      }
      evento.preventDefault();
      void exportarBriefingPng();
    },
    [exportandoBriefing, exportarBriefingPng]
  );

  const definir = (patch: Partial<Filtros>) => setF((a) => ({ ...a, ...patch }));

  const chips = [
    f.fracao !== "todas" && {
      k: "fracao",
      t: ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao,
      limpar: () => definir({ fracao: "todas" }),
    },
    f.semana !== "todas" && {
      k: "semana",
      /* O tamanho da 4ª semana vem do MÊS. Lendo `p.janela`, que já está
         encolhida para a semana selecionada, o chip anunciaria "22–07". */
      t: `Semana ${f.semana} (${diasDaSemana(Number(f.semana), p.janelaMes.ate ? Number(p.janelaMes.ate.slice(8, 10)) : 31).replace(" a ", "–")})`,
      limpar: () => definir({ semana: "todas" }),
    },
    f.turno !== "todos" && {
      k: "turno",
      t: f.turno === "diurno" ? "Diurno" : f.turno === "noturno" ? "Noturno" : "Administrativo",
      limpar: () => definir({ turno: "todos" }),
    },
    (f.de || f.ate) && {
      k: "periodo",
      t: `${f.de || "início"} → ${f.ate || "hoje"}`,
      limpar: () => definir({ de: "", ate: "" }),
    },
    f.excecao && {
      k: "excecao",
      t:
        f.excecao === "naoauditou"
          ? "Não auditaram"
          : f.excecao === "abaixo"
            ? `Abaixo de ${p.minimo}`
            : f.excecao === "idinvalido"
              ? "ID fora do formato"
              : f.excecao === "duplicado"
                ? "ID já auditado por outro"
                : "Sem IDs de mídia",
      limpar: () => definir({ excecao: "" }),
    },
    f.busca && { k: "busca", t: `"${f.busca}"`, limpar: () => definir({ busca: "" }) },
  ].filter(Boolean) as { k: string; t: string; limpar: () => void }[];

  const kpis = [
    {
      rotulo: "Cumprimento da meta",
      valor: `${PCT.format(p.pct)}%`,
      nota:
        f.semana !== "todas"
          ? `${FMT.format(p.falta)} a realizar na Sem. ${f.semana}`
          : `${FMT.format(p.falta)} evidências a realizar`,
      foto: "/media/foto-viatura.jpg",
      icone: <Target size={22} strokeWidth={2.4} aria-hidden />,
    },
    {
      rotulo: "Evidências auditadas",
      valor: FMT.format(p.total),
      nota:
        f.semana !== "todas"
          ? `meta da semana ${f.semana}: ${FMT.format(p.meta)}`
          : `meta do período: ${FMT.format(p.meta)}`,
      foto: "/media/foto_operacao.jpg",
      icone: <Target size={18} aria-hidden />,
    },
    {
      rotulo: "Auditores ativos",
      valor: `${FMT.format(p.ativos)}/${FMT.format(p.auditores)}`,
      /* Dois números por decisão do Comando em 03/09/2026: o primeiro é quem
         participou do controle (mede alcance da ferramenta), o segundo é quem
         de fato auditou. Antes só existia o primeiro, e quem respondia "não
         auditei" entrava como auditor ativo. */
      nota: `${PCT.format(p.auditores ? (p.ativos / p.auditores) * 100 : 0)}% do efetivo designado · ${FMT.format(
        p.ativosAuditando
      )} auditaram`,
      foto: "/media/foto-oficial.jpg",
      icone: <Users size={18} aria-hidden />,
    },
    {
      /* Unidade é TURNO, não lançamento — o auditor que fez 2 envios no
         mesmo turno soma contra o mínimo. Ver `chaveDoTurno`. */
      rotulo: `Conformidade (≥${p.minimo})`,
      valor: `${PCT.format(p.taxaConf)}%`,
      nota: `${FMT.format(p.turnosConformes)} de ${FMT.format(p.turnosAuditados)} turno${p.turnosAuditados === 1 ? "" : "s"}`,
      foto: "/media/foto-rua.jpg",
      icone: <CheckCircle2 size={18} aria-hidden />,
    },
    {
      /* Vem do Painel, calculado sobre o calendário do recorte. Aqui saía
         RITMO_GLOBAL_RESTANTE (73) e TURNOS_RESTANTES_GLOBAL (12), escritos à
         mão em `lib/cop2026.ts` — números que nunca fechavam com os dados e que
         desmentiam a própria linha do painel ("nenhum é fixo no código"). */
      rotulo: tendencia ? "Ritmo de recuperação" : "Ritmo necessário",
      valor: fmtRitmo(p.ritmoNecessario),
      nota: `evidências/dia · ${fmtDias(p.janela.diasRestantes)} restante${p.janela.diasRestantes === 1 ? "" : "s"}`,
      foto: "/media/reel-operacao.jpg",
      icone: <TrendingUp size={22} strokeWidth={2.4} aria-hidden />,
    },
  ];

  const kpisPrincipais = [kpis[0]];
  const kpisApoio = [kpis[1], kpis[2], kpis[3]];

  const renderKpi = (k: (typeof kpis)[number], principal: boolean, className?: string) => (
    <div
      key={k.rotulo}
      className={cn(
        /* `cartao-kpi` não é estilo: é a marca que o PDF usa para não partir o
           cartão entre duas folhas (ver MODO_BRIEFING_CSS). */
        "cartao-kpi group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(202,2,2,0.22)] hover:border-vermelho",
        principal
          ? "min-h-[220px] border-[#ca0202]/45 p-6 shadow-[0_10px_26px_rgba(202,2,2,0.12)] sm:min-h-[250px] sm:p-7"
          : "min-h-[148px] p-4 sm:min-h-[164px] sm:p-5",
        className
      )}
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src={k.foto}
          alt={k.rotulo}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover opacity-35 saturate-135 contrast-105 transition-transform duration-700 ease-out group-hover:scale-115 group-hover:opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-white/65" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-serif text-xs font-black uppercase tracking-wider text-[#1d1d1d] sm:text-sm">
            {k.rotulo}
          </span>
          <div className={cn(
            "flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 group-hover:bg-vermelho group-hover:text-white",
            principal
              ? "h-11 w-11 rounded-xl border-[#ca0202]/40 bg-[#ca0202]/10 text-[#ca0202] shadow-[0_5px_14px_rgba(202,2,2,0.16)]"
              : "h-8 w-8 rounded-lg border-red-200 bg-red-50 text-[#ca0202] shadow-xs"
          )}>
            {k.icone}
          </div>
        </div>
        <p
          className={cn(
            "metric-hero font-black text-[#1d1d1d] tracking-tight drop-shadow-2xs",
            principal ? "mt-5 text-5xl sm:text-6xl lg:text-7xl" : "mt-2.5 text-3xl sm:text-4xl"
          )}
        >
          {k.valor}
        </p>
        <div className={cn(principal ? "mt-4" : "mt-2")}>
          <span className="inline-block rounded-md border border-slate-200 bg-white/90 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
            {k.nota}
          </span>
        </div>
      </div>
    </div>
  );

  const excecoes = [
    {
      chave: "naoauditou" as const,
      rotulo: "Declararam não ter auditado",
      v: p.naoAuditou,
      icone: <AlertTriangle size={16} aria-hidden />,
    },
    {
      chave: "abaixo" as const,
      rotulo: `Auditaram abaixo do mínimo de ${p.minimo}`,
      v: p.abaixo,
      icone: <TrendingUp size={16} aria-hidden />,
    },
    {
      chave: "semids" as const,
      rotulo: "Auditaram sem informar IDs de mídia",
      v: p.semIds,
      icone: <FileWarning size={16} aria-hidden />,
    },
    {
      // Caso diferente do de cima: aqui a pessoa informou alguma coisa, e o que
      // informou não é identificador da plataforma — número solto, número da
      // ocorrência, endereço colado. Cobra-se correção, não preenchimento.
      chave: "idinvalido" as const,
      rotulo: "Informaram ID fora do formato da plataforma",
      v: p.comIdInvalido,
      icone: <FileWarning size={16} aria-hidden />,
    },
    {
      // Terceiro caso, distinto dos dois de cima: o ID está certo e já foi
      // lançado por outro auditor. A mesma mídia soma duas vezes contra a meta
      // e nenhuma exceção acusava — apareceu em 02/09/2026 com o mesmo ID
      // lançado pela 4ª Cia num dia e por outra auditora no seguinte.
      chave: "duplicado" as const,
      rotulo: "Lançaram ID já auditado por outro",
      v: p.comIdDuplicado,
      icone: <FileWarning size={16} aria-hidden />,
    },
  ];

  const tabela = useMemo(() => {
    const termo = f.busca.trim().toLowerCase();
    const filtradas = termo
      ? p.auditoresLinhas.filter(
          (r) => r.nome.toLowerCase().includes(termo) || r.posto.toLowerCase().includes(termo)
        )
      : p.auditoresLinhas;
    const dir = ordem.desc ? -1 : 1;
    return [...filtradas].sort((a, b) => {
      const x = a[ordem.col];
      const y = b[ordem.col];
      if (typeof x === "string" && typeof y === "string") return x.localeCompare(y) * dir;
      return ((x as number) - (y as number)) * dir;
    });
  }, [p.auditoresLinhas, f.busca, ordem]);

  const baixarCsv = () => {
    try {
      const blob = new Blob([auditoresParaCsv(tabela)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-cop-2026-auditores-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV de Auditores exportado!", {
        description: `${tabela.length} registros exportados com sucesso.`,
      });
    } catch {
      toast.error("Erro ao gerar o arquivo CSV.");
    }
  };

  const baixarLancamentosCsv = () => {
    try {
      const blob = new Blob([lancamentosParaCsv(p.dados)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-cop-2026-respostas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV de Lançamentos exportado!", {
        description: `${p.dados.length} registros brutos exportados com sucesso.`,
      });
    } catch {
      toast.error("Erro ao gerar o arquivo CSV.");
    }
  };

  const [gavetaFiltrosAberta, setGavetaFiltrosAberta] = useState(false);
  const totalFiltrosAtivos = chips.length;

  const ordenarPor = (col: Coluna) =>
    setOrdem((o) => ({ col, desc: o.col === col ? !o.desc : true }));

  return (
    <div
      className={cn(
        "mx-auto max-w-[1400px] px-3.5 sm:px-5 pb-12",
        modoBriefing && "modo-briefing"
      )}
    >
      {/* Modo briefing por CSS, e não por `{!modoBriefing && ...}` espalhado
          pela árvore: uma regra só some com TUDO que não é o painel, então uma
          seção nova nasce automaticamente fora do PNG em vez de aparecer nele
          porque alguém esqueceu de listá-la. O <style> é filho direto e cai na
          própria regra — irrelevante, `display:none` em <style> não desliga a
          folha. As animações não entram aqui: o gerador emula
          `prefers-reduced-motion: reduce`, que o globals.css já trata. */}
      {modoBriefing && (
        <style>{MODO_BRIEFING_CSS}</style>
      )}

      {/* ---------------- HERO INSTITUCIONAL — 16º BPM/M ---------------- */}
      <header className="relative mb-8 pt-4 pb-6">
        {/* Filete superior institucional */}
        <div className="mb-5 flex items-center gap-3">
          <span className="h-[3px] w-10 bg-[#ca0202]" aria-hidden />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.32em] text-slate-600">
            Governo do Estado de São Paulo · Polícia Militar
          </span>
          <span className="h-px flex-1 bg-slate-300/80" aria-hidden />
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 items-center gap-x-4 gap-y-5 md:grid-cols-[220px_minmax(0,1fr)_220px] md:items-stretch md:gap-x-0">
          {/* Brasão oficial do 16º BPM/M */}
          <div className="relative order-1 shrink-0 flex items-center justify-center md:order-none md:pr-2 md:border-r md:border-slate-300/70">
            <Image
              src="/brand/brasao-16bpmm-hd.png"
              alt="Brasão do 16º BPM/M"
              width={2481}
              height={3508}
              className="h-auto w-28 object-contain drop-shadow-[0_18px_34px_rgba(7,24,45,0.4)] sm:w-48 md:w-64"
              priority
            />
          </div>

          {/* Bloco tipográfico */}
          <div className="order-3 col-span-2 min-w-0 flex-1 text-center md:order-none md:col-span-1 md:text-left flex flex-col justify-center">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.28em] text-[#ca0202]">
              16º Batalhão de Polícia Militar Metropolitano
            </p>
            <h1 className="font-serif text-[26px] sm:text-4xl lg:text-[44px] font-black uppercase tracking-tight text-[#141414] mt-2 leading-[1.05]">
              Auditoria e Governança
              <span className="block text-[#1d1d1d]/85 font-bold normal-case tracking-tight italic mt-1 text-xl sm:text-2xl lg:text-[26px]">
                das Câmeras Operacionais Corporais
              </span>
            </h1>

            <div className="mt-4 h-px w-full max-w-md mx-auto md:mx-0 bg-gradient-to-r from-slate-300/90 via-slate-300/50 to-transparent" aria-hidden />

            <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-[11px] sm:text-[12px] uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-2 rounded-sm bg-[#ca0202] px-3 py-1.5 font-black text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" aria-hidden />
                COP 2026
              </span>
              <span className="font-bold text-slate-700">
                Diretriz PM3-001/02/25
              </span>
              <span className="hidden sm:inline h-3 w-px bg-slate-300" aria-hidden />
              <span className="font-semibold text-slate-600 normal-case tracking-normal text-xs italic">
                Ambiente Executivo de Gestão e Controle
              </span>
            </div>
          </div>

          {/* Logomarca da Auditoria COP 2026 */}
          <div className="order-2 flex shrink-0 items-center justify-center md:order-none md:pl-2">
            <Image
              src="/brand/logo-auditoria-cop2026-transparent.png"
              alt="16º BPM/M — Auditoria COP 2026"
              width={1536}
              height={1536}
              className="h-auto w-32 object-contain drop-shadow-[0_16px_30px_rgba(7,24,45,0.34)] sm:w-64 md:w-80"
            />
          </div>
        </div>

        {/* Filete inferior */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" aria-hidden />
      </header>

      {/* ---------------- BARRA DE FILTROS RESPONSIVA SÊNIOR ---------------- */}
      <div className="nao-imprime sticky top-[73px] sm:top-[89px] z-30 -mx-3.5 sm:-mx-5 mb-6 border-b-2 border-slate-300/80 bg-white/95 px-3.5 sm:px-5 py-2.5 backdrop-blur-md shadow-sm transition-all">
        
        {/* MOBILE — duas linhas. Em linha única o gatilho da busca (281px,
            indivisível) esmagava o carrossel de semanas a 0px e empurrava o
            botão "Filtros" para fora da tela em telas de 375px. */}
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center gap-2">
            {/* Busca Rápida */}
            <div className="min-w-0 flex-1">
              <PaletaComando
                className="w-full"
                lancamentos={lancamentos}
                semanas={p.semanasBatalhao}
                onSelecionarFracao={(fracao) => {
                  definir({ fracao });
                  toast.info(`Filtro aplicado: ${ROTULO_SUBUNIDADE[fracao] ?? fracao}`);
                }}
                onSelecionarSemana={(semana) => {
                  definir({ semana });
                  toast.info(`Filtro aplicado: Semana ${semana}`);
                }}
                onExportarCsv={baixarLancamentosCsv}
              />
            </div>

            {/* Botão Gaveta de Filtros */}
            <button
              type="button"
              onClick={() => setGavetaFiltrosAberta(true)}
              className={cn(
                "relative shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                totalFiltrosAtivos > 0
                  ? "border-vermelho bg-vermelho/10 text-vermelho shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              )}
              aria-label="Abrir filtros avançados"
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {totalFiltrosAtivos > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-vermelho text-[10px] font-black text-white">
                  {totalFiltrosAtivos}
                </span>
              )}
            </button>
          </div>

          {/* Pílulas Rápidas de Semanas (Scroll Horizontal Suave) — sangram até
              a borda da barra para o carrossel ter para onde correr. */}
          <div className="-mx-3.5 flex items-center gap-1.5 overflow-x-auto px-3.5 py-0.5 scrollbar-none">
            {[
              { id: "todas", label: "Mês" },
              { id: "1", label: "Sem 1" },
              { id: "2", label: "Sem 2" },
              { id: "3", label: "Sem 3" },
              { id: "4", label: "Sem 4" },
            ].map((item) => {
              const ativo = f.semana === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => definir({ semana: item.id })}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                    ativo
                      ? "bg-vermelho text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* DESKTOP (Linha completa e espaçosa) */}
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 text-xs">
              <Filter size={14} aria-hidden /> Recorte:
            </span>

            <div className="shrink-0">
              <PaletaComando
                lancamentos={lancamentos}
                semanas={p.semanasBatalhao}
                onSelecionarFracao={(fracao) => {
                  definir({ fracao });
                  toast.info(`Filtro aplicado: ${ROTULO_SUBUNIDADE[fracao] ?? fracao}`);
                }}
                onSelecionarSemana={(semana) => {
                  definir({ semana });
                  toast.info(`Filtro aplicado: Semana ${semana}`);
                }}
                onExportarCsv={baixarLancamentosCsv}
              />
            </div>

            <select
              value={f.fracao}
              onChange={(e) => definir({ fracao: e.target.value })}
              aria-label="Filtrar por fração"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todas">Todas as frações (Batalhão)</option>
              {metas.map((m) => (
                <option key={m.subunidade} value={m.subunidade}>
                  {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
                </option>
              ))}
            </select>

            <select
              value={f.semana}
              onChange={(e) => definir({ semana: e.target.value })}
              aria-label="Filtrar por semana"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todas">Todas as semanas (Mês)</option>
              <option value="1">Semana 1 (01 a 07)</option>
              <option value="2">Semana 2 (08 a 14)</option>
              <option value="3">Semana 3 (15 a 21)</option>
              {/* Acompanha o mês: 22 a 30 em setembro e novembro. */}
              <option value="4">
                Semana 4 ({diasDaSemana(4, p.janelaMes.ate ? Number(p.janelaMes.ate.slice(8, 10)) : 31)})
              </option>
            </select>

            <select
              value={f.turno}
              onChange={(e) => definir({ turno: e.target.value })}
              aria-label="Filtrar por turno"
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-branco shadow-xs focus:border-vermelho"
            >
              <option value="todos">Todos os turnos</option>
              <option value="diurno">Diurno</option>
              <option value="noturno">Noturno</option>
              <option value="administrativo">Administrativo</option>
            </select>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-xs">
              <label className="flex items-center gap-1">
                De
                <input
                  type="date"
                  value={f.de}
                  onChange={(e) => definir({ de: e.target.value })}
                  className="dados rounded bg-slate-50 px-1.5 py-0.5 text-branco text-xs"
                />
              </label>
              <label className="flex items-center gap-1">
                Até
                <input
                  type="date"
                  value={f.ate}
                  onChange={(e) => definir({ ate: e.target.value })}
                  className="dados rounded bg-slate-50 px-1.5 py-0.5 text-branco text-xs"
                />
              </label>
            </div>

            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={() => setF(FILTROS_VAZIOS)}
                className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho transition-colors text-xs"
              >
                Limpar ({totalFiltrosAtivos})
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={atualizar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho shadow-xs transition-colors text-xs"
            >
              <RefreshCw size={13} className={cn(atualizando && "animate-spin")} aria-hidden />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-vermelho hover:text-vermelho shadow-xs transition-colors text-xs"
            >
              <Printer size={13} aria-hidden /> Imprimir
            </button>
          </div>
        </div>

        {/* Chips de Filtros Ativos (Exibição Dinâmica) */}
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Ativos:</span>
            {chips.map((c) => (
              <button
                key={c.k}
                type="button"
                onClick={c.limpar}
                className="inline-flex items-center gap-1 rounded-full border border-vermelho/40 bg-vermelho/10 px-2.5 py-0.5 text-[11px] font-extrabold text-vermelho hover:bg-vermelho/20 transition-colors"
              >
                {c.t}
                <X size={11} aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- GAVETA TÁTICA MOBILE (BOTTOM SHEET) ---------------- */}
      {gavetaFiltrosAberta && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in"
        >
          <div
            className="fixed inset-0"
            onClick={() => setGavetaFiltrosAberta(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-4 border-vermelho bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="font-serif text-lg font-extrabold uppercase tracking-wide text-branco">
                  Filtros & Recortes
                </p>
                <p className="text-xs text-slate-500">Isole frações, semanas e turnos de auditoria</p>
              </div>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                aria-label="Fechar gaveta"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Fração */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Fração / Subunidade
                </label>
                <select
                  value={f.fracao}
                  onChange={(e) => definir({ fracao: e.target.value })}
                  className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-3 font-bold text-branco text-sm"
                >
                  <option value="todas">Todas as frações (Batalhão)</option>
                  {metas.map((m) => (
                    <option key={m.subunidade} value={m.subunidade}>
                      {ROTULO_SUBUNIDADE[m.subunidade] ?? m.subunidade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semana */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Semana Operacional
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todas", label: "Todas (Mês)" },
                    { id: "1", label: "Semana 1 (01–07)" },
                    { id: "2", label: "Semana 2 (08–14)" },
                    { id: "3", label: "Semana 3 (15–21)" },
                    { id: "4", label: "Semana 4 (22–31)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => definir({ semana: s.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                        f.semana === s.id
                          ? "border-vermelho bg-vermelho text-white shadow-xs"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Turno
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "diurno", label: "Diurno" },
                    { id: "noturno", label: "Noturno" },
                    { id: "administrativo", label: "Administrativo" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => definir({ turno: t.id })}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-bold transition-all",
                        f.turno === t.id
                          ? "border-vermelho bg-vermelho text-white shadow-xs"
                          : "border-slate-300 bg-slate-50 text-slate-700"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervalo de Datas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Período de Datas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-slate-500">De:</span>
                    <input
                      type="date"
                      value={f.de}
                      onChange={(e) => definir({ de: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 font-bold text-branco text-xs"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500">Até:</span>
                    <input
                      type="date"
                      value={f.ate}
                      onChange={(e) => definir({ ate: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 font-bold text-branco text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações da Gaveta */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setF(FILTROS_VAZIOS);
                  setGavetaFiltrosAberta(false);
                }}
                className="rounded-xl border-2 border-slate-300 bg-slate-100 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Limpar Tudo
              </button>
              <button
                type="button"
                onClick={() => setGavetaFiltrosAberta(false)}
                className="rounded-xl bg-vermelho py-3 text-center text-sm font-extrabold text-white shadow-md hover:bg-vermelho-escuro"
              >
                Aplicar Recorte
              </button>
            </div>
          </div>
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13px] text-sinal-critico"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-bold">Leitura da planilha falhou.</strong> Os números abaixo podem
            estar desatualizados ou zerados — não decida em cima deles. Última leitura confiável:{" "}
            {lidoEm}. Detalhe técnico: {erro}
          </span>
        </p>
      )}

      {/* O bloco exportado em PNG abarca a Situação (KPIs + termômetro) e a
          camada semanal (Meta Semanal + Companhias/Força Tática): é o conjunto
          que o Comando lê junto para decidir, então sai junto no arquivo.

          `data-briefing="painel"` é o CONTRATO com o gerador do servidor: é por
          este seletor que o Chromium de /api/cop2026/briefing-png recorta a
          imagem. Renomear o atributo quebra a exportação sem quebrar o build. */}
      <div ref={painelBriefingRef} data-briefing="painel" className="bg-[#edf2f7]">
      {/* ---------------- Camada 1: Situação ---------------- */}
      <section aria-label="Situação" className="relative mb-8">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-stretch">
          {/* Faixa superior: diagnóstico executivo ocupando toda a largura */}
          <div
            className="relative flex min-h-[122px] flex-wrap items-center gap-3.5 overflow-hidden rounded-2xl border-2 border-l-4 border-slate-700/80 bg-[#071225] p-5 shadow-[0_12px_30px_rgba(7,18,37,0.28)] sm:p-6 lg:col-span-12 lg:-mr-4"
            style={{ borderLeftColor: `var(--sinal-${v.nivel})` }}
          >
            {/* Em modo briefing o vídeo vira foto. O Chromium do @sparticuz não
                traz os codecs proprietários: um <video> H.264 ali renderiza um
                retângulo preto, e a faixa de diagnóstico — a primeira coisa que
                o Comando lê no PNG — sairia sem fundo. */}
            {modoBriefing ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/media/foto_operacao.jpg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-65 saturate-110 contrast-110"
              />
            ) : (
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-65 saturate-110 contrast-110"
              >
                <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
              </video>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050c1a]/92 via-[#071225]/80 to-[#071225]/88" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#ca0202]/20" />

            {/* `pr-28` no celular reserva a largura dos DOIS botões de
                exportação (56px cada + folga); com o `pr-14` de quando havia só
                um, o texto do diagnóstico passava por baixo do botão de PDF. */}
            <div className="relative z-10 flex w-full flex-col items-start gap-2.5 pr-28 sm:ml-[18%] sm:w-[82%] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5 sm:pr-4 md:ml-[24%] md:w-[76%] lg:ml-[22%] lg:w-[76%]">
              <Selo nivel={v.nivel} />
              <div className="min-w-0 flex-1 px-1 py-1 text-white">
                <p className="font-serif text-lg font-black leading-snug text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)] sm:text-xl">{v.titulo}</p>
                <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:text-sm">{v.detalhe}</p>
              </div>
            </div>
          </div>

          {/* Matriz de indicadores: sempre dois blocos por linha no desktop */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {kpisPrincipais.map((k) => renderKpi(k, true, "sm:col-span-2"))}
            {kpisApoio.map((k, indice) =>
              renderKpi(k, false, indice === kpisApoio.length - 1 ? "sm:col-span-2" : undefined)
            )}
          </div>

          {/* Termômetro ampliado, começando após a matriz de indicadores */}
          <div className="min-w-0 lg:col-span-5">
            <AgulhaoMetas
              pct={p.pct}
              total={p.total}
              meta={p.meta}
              ritmo={tendencia ? undefined : p.ritmoNecessario}
              diasRestantes={tendencia ? undefined : p.janela.diasRestantes}
              cartaoRitmo={
                tendencia ? (
                  <CartaoTrajetoria meta={p.meta} total={p.total} janela={p.janela} />
                ) : undefined
              }
              faixaRitmos={
                tendencia ? (
                  <FaixaRitmos
                    meta={p.meta}
                    total={p.total}
                    janela={p.janela}
                    rotuloPeriodo={rotuloPeriodo}
                  />
                ) : undefined
              }
              marcaPosicao={tendencia ? `leitura atual ${PCT.format(p.pct)}%` : undefined}
              titulo={f.fracao === "todas" ? '16º BPM/M — "1º Ten PM Fernão"' : `Ritmo Operacional · ${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao}`}
              subtitulo={{
                linha1: rotuloMeta,
                linha2: "DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
                linha3: "Distribuição Proporcional por Matriz Operacional",
              }}
            />
          </div>

          {/* Barra-resumo com destaque e movimento institucional sutil */}
          <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 border-[#ca0202]/45 bg-gradient-to-r from-white via-red-50/80 to-white px-5 py-4 text-[13px] font-semibold text-slate-700 shadow-[0_8px_20px_rgba(202,2,2,0.12)] lg:col-span-12">
            <span className="animar-bala pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-red-200/55 to-transparent" aria-hidden="true" />
            <span className="relative flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ca0202] animar-ao-vivo" aria-hidden="true" />
              Mediana por turno: <strong className="dados font-black text-slate-950">{FMT.format(p.mediana)}</strong> · p90{" "}
              <strong className="dados font-black text-slate-950">{FMT.format(p.p90)}</strong>
            </span>
            <span className="relative">
              {tendencia ? (
                <>
                  Dias decorridos:{" "}
                  <strong className="dados font-black text-slate-950">
                    {FMT.format(p.janela.decorridos)}
                  </strong>{" "}
                  de {FMT.format(p.janela.dias)} · turnos-fração{" "}
                  <strong className="dados font-black text-slate-950">
                    {FMT.format(p.janela.turnosFracaoDecorridos)}
                  </strong>{" "}
                  de {FMT.format(p.janela.turnosFracao)}
                </>
              ) : (
                <>
                  Turnos-fração decorridos:{" "}
                  <strong className="dados font-black text-slate-950">
                    {FMT.format(p.turnosCumpridos)}
                  </strong>{" "}
                  de {FMT.format(p.turnosPrevistos)}
                </>
              )}
            </span>
            {tendencia && (
              <span className="relative">
                Dias com lançamento:{" "}
                <strong className="dados font-black text-slate-950">
                  {FMT.format(p.diasComLancamento)}
                </strong>{" "}
                de {FMT.format(p.janela.decorridos)}
              </span>
            )}
            <span className="relative">
              Partes confeccionadas: <strong className="dados font-black text-slate-950">{FMT.format(p.partes)}</strong>
            </span>
          </div>

          {/* Detalhamento da TENDENCIA por fracao — posicao definida pelo
              Comando: abaixo da barra-resumo e acima da camada semanal. */}
          {tendencia && (
            <div className="min-w-0 lg:col-span-12">
              <CaixaTendencia
                fracoes={p.fracoes}
                auditoresPorQuinzena={p.auditoresPorQuinzena}
                semFracao={p.semFracao}
                janela={p.janela}
                rotuloPeriodo={rotuloPeriodo}
                diaDoMes={p.janelaMes.decorridos}
              />
            </div>
          )}

          {/* DOIS formatos, e a diferença entre eles não é capricho: o PNG é uma
              imagem só — cola no WhatsApp, mas passa de 6.000px de altura e vira
              uma tira para quem abre no celular, porque imagem não pagina. O PDF
              é o mesmo painel em A4 deitado, colorido, com os quadros inteiros e
              numeração de página: é o que se leva para a reunião e o que se
              imprime.

              LADO A LADO, e não empilhados: empilhado, o botão de cima cai atrás
              da barra de recorte, que é `sticky` com z-index maior — some
              justamente quando a pessoa rolou para ver o painel. Na horizontal
              os dois dividem a mesma altura livre. */}
          <div
            data-no-briefing="true"
            className="absolute right-[-14px] top-3 z-20 flex flex-row gap-2 sm:right-[-20px] lg:top-5 min-[1560px]:right-[-70px]"
          >
            <BotaoExportar
              href={urlBriefingPng}
              onClick={aoTocarExportar("png")}
              ocupado={formatoEmCurso === "png"}
              rotulo="PNG"
              titulo="Baixar o painel completo como imagem (PNG) — bom para colar no WhatsApp"
              className="border-white bg-[#ca0202] shadow-[0_10px_24px_rgba(202,2,2,0.38)] hover:bg-[#a80000] hover:shadow-[0_14px_30px_rgba(202,2,2,0.48)] focus-visible:outline-[#ca0202]"
            />
            <BotaoExportar
              href={urlBriefingPdf}
              onClick={aoTocarExportar("pdf")}
              ocupado={formatoEmCurso === "pdf"}
              rotulo="PDF"
              titulo="Baixar o painel completo em PDF paginado e colorido — para ler e imprimir"
              className="border-white bg-[#22406b] shadow-[0_10px_24px_rgba(34,64,107,0.38)] hover:bg-[#16294a] hover:shadow-[0_14px_30px_rgba(34,64,107,0.48)] focus-visible:outline-[#22406b]"
            />
          </div>
        </div>
      </section>

      {/* ---------------- Camada Semanal: Metas por Semana ---------------- */}
      <section aria-label="Evolução Semanal" className="mb-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-base font-bold text-branco">
                  {/* A cota semanal é rateada por dias e varia com o tamanho da
                      semana — 225, 224, 223 e 288 em setembro. O "240" fixo que
                      estava aqui contradizia os próprios cartões abaixo. */}
                  Metas Semanais · {FMT.format(p.semanasBatalhao.reduce((s, x) => s + x.meta, 0))} Evidências rateadas por dias{f.fracao === "todas" ? " (Btl)" : ` (${ROTULO_SUBUNIDADE[f.fracao] ?? f.fracao})`}
                </h2>
                <p className="text-[12.5px] text-texto-suave">
                  Divisão do ciclo de auditoria em 4 semanas operacionais · clique no card de uma semana para isolar o recorte
                </p>
              </div>
              {f.semana !== "todas" && (
                <button
                  type="button"
                  onClick={() => definir({ semana: "todas" })}
                  className="rounded-md border border-vermelho/30 bg-vermelho/5 px-2.5 py-1 text-[12px] font-semibold text-vermelho hover:bg-vermelho/10"
                >
                  Exibindo Semana {f.semana} · Ver Todas as Semanas
                </button>
              )}
            </div>

            {/* Faixa de apoio: registro visual do ciclo semanal, em degradê */}
            <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4 nao-imprime">
              {[
                { src: "/media/reel-patrulha.jpg", etiqueta: "Ciclo", legenda: "Patrulhamento Diário" },
                { src: "/media/controle-bg-poster.jpg", etiqueta: "Coleta", legenda: "Evidências Gravadas" },
                { src: "/media/reel-operacao.jpg", etiqueta: "Ritmo", legenda: "Empenho Operacional" },
                { src: "/media/foto_cpchq.jpg", etiqueta: "Fechamento", legenda: "Auditoria da Semana" },
              ].map((img) => (
                <div
                  key={img.src}
                  className="relative h-20 overflow-hidden rounded-xl border border-slate-300/85 bg-slate-900 shadow-sm sm:h-24"
                >
                  <Image
                    src={img.src}
                    alt=""
                    aria-hidden
                    width={400}
                    height={200}
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-vermelho">
                      {img.etiqueta}
                    </span>
                    <p className="text-[11px] font-bold leading-snug text-white">{img.legenda}</p>
                  </div>
                </div>
              ))}
            </div>

            <QuadroSemanalBatalhao
              semanas={p.semanasBatalhao}
              semanaAtiva={f.semana}
              onSelecionarSemana={(sem) => definir({ semana: sem })}
            />
          </div>

          {/* Visão lateral somente com as barras das Companhias e Força Tática */}
          <aside className="rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.09)] sm:p-5" aria-label="Barras de progresso das frações">
            <div className="mb-4 border-b border-slate-300/80 pb-3">
              <p className="font-serif text-sm font-black uppercase tracking-[0.1em] text-slate-950">
                {/* "Companhias" não cabe: o Estado-Maior está na lista e NÃO é
                    companhia. É o mesmo erro institucional que o Comando já
                    mandou tirar do título do desempenho comparativo
                    (docs/cop2026-padroes-comando.md §1). */}
                Frações do Batalhão
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Progresso visual por fração</p>
            </div>
            <ol className="space-y-3">
              {p.fracoes.map((fracao) => {
                const largura = Math.min(100, Math.max(0, fracao.pct));
                return (
                  <li key={fracao.chave}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px]">
                      <span className="truncate font-black uppercase tracking-wide text-slate-800">
                        {fracao.rotulo}
                      </span>
                      <span className="dados font-bold text-slate-500">{PCT.format(fracao.pct)}%</span>
                    </div>
                    <div
                      className="mt-1.5 h-6 overflow-hidden rounded bg-slate-200"
                      role="img"
                      aria-label={`${fracao.rotulo}: ${PCT.format(fracao.pct)}% da meta`}
                    >
                      <div
                        className="h-full rounded transition-[width] duration-700"
                        style={{
                          width: `${largura}%`,
                          background: `linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 100%), ${COR_FAIXA[fracao.nivel]}`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </section>
      </div>

      {/* ---------------- Camada 2: Onde agir ---------------- */}
      <section aria-label="Onde agir" className="mb-6">
        <Cartao
          titulo="Onde agir · frações"
          nota={
            tendencia
              ? `rateio proporcional ao quadro COP (570 PMs) · dia ${FMT.format(p.janela.decorridos)} de ${FMT.format(p.janela.dias)}${
                  p.janela.diasRestantes > 0
                    ? ` · ${FMT.format(p.janela.diasRestantes)} dia${p.janela.diasRestantes === 1 ? "" : "s"} restante${p.janela.diasRestantes === 1 ? "" : "s"}`
                    : ` · ${rotuloPeriodo} encerrado`
                } · clique para filtrar o painel`
              : "rateio proporcional ao quadro COP (570 PMs) · clique para filtrar o painel"
          }
          ajuda={
            <p>
              A meta de cada fração é proporcional ao efetivo fixo que usa COP diariamente (universo de
              570 PMs). A barra mostra o percentual já atingido, a cota em relação às 960 evidências do
              Batalhão e o ritmo necessário por turno restante.
            </p>
          }
        >
          {p.fracoes.length ? (
            <RankingFracoes
              dados={p.fracoes}
              onSelecionar={(chave) => definir({ fracao: f.fracao === chave ? "todas" : chave })}
              mostrarTendencia={tendencia}
              janela={p.janela}
              rotuloPeriodo={rotuloPeriodo}
            />
          ) : (
            <SemDados texto="Sem metas cadastradas na aba Parâmetros." />
          )}
        </Cartao>

      </section>

      {/* ---------------- Camada 2b: Plano × realizado, dia a dia ----------------
          Pedido da Coordenadoria Operacional em 02/09/2026: "dia a dia tudo
          mensurado", com a linha do previsto ao lado da linha do feito, uma
          curva por fração. Fica DEPOIS do ranking porque responde a pergunta
          seguinte — não "quem está atrás", e sim "desde quando, e quanto isso
          já custou em dívida acumulada". */}
      {tendencia && p.fracoes.length > 0 && (
        <section aria-label="Plano contra realizado" className="mb-6">
          <Cartao
            titulo="Plano × realizado · dia a dia"
            nota={`mês inteiro · dia ${FMT.format(p.janelaMes.decorridos)} de ${FMT.format(p.janelaMes.dias)} · independe da semana selecionada`}
            ajuda={
              <p>
                A linha azul tracejada é a meta acumulada dia a dia; a linha grossa é o que foi
                auditado — vermelha enquanto está abaixo do previsto, verde quando alcança — e ela
                para no dia de hoje. O vão entre as duas é a dívida, que diminui sozinha assim que a
                fração produz acima da cota. As barras são as evidências de cada dia, no eixo da
                direita, coloridas pela régua de faixas. O quadro no topo da seção traz as regras e
                os parâmetros; a linha sob cada gráfico, a leitura daquela fração hoje.
              </p>
            }
          >
            <CurvaPlanoRealizado
              fracoes={p.fracoes}
              metaGlobal={META_TOTAL_BATALHAO}
              porDiaBatalhao={p.porDiaMes}
              /* Janela do MÊS, não a do recorte: esta seção é mensal por
                 decisão do Comando e a nota abaixo do título já avisa que ela
                 independe da semana selecionada. */
              diasMes={p.janelaMes.dias}
              diasDecorridos={p.janelaMes.decorridos}
              mesEncerrado={p.janelaMes.encerrado}
              prefixo={p.janelaMes.de.slice(0, 7)}
              /* Com uma fração filtrada, `p.fracoes` tem uma linha só e
                 `porDiaMes` é a série daquela fração: um cartão rotulado
                 "Batalhão" ali mostraria a curva de uma Cia. */
              mostrarBatalhao={f.fracao === "todas"}
            />
          </Cartao>
        </section>
      )}

      {/* ---------------- Faixa horizontal: Exceções ---------------- */}
      <Cartao
        titulo="Exceções"
        nota="clique para ver os nomes na tabela analítica"
        className="mb-6"
        ajuda={
          <p>
            Exceção não é punição: é a lista do que precisa de justificativa ou de correção antes do
            fechamento do período.
          </p>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {excecoes.map((e) => {
            const ativo = f.excecao === e.chave;
            return (
              <button
                key={e.chave}
                type="button"
                onClick={() => definir({ excecao: ativo ? "" : e.chave })}
                aria-pressed={ativo}
                className={cn(
                  "flex min-h-[72px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                  ativo
                    ? "border-vermelho/50 bg-vermelho/5 shadow-sm"
                    : "border-borda bg-branco/[0.02] hover:border-vermelho/30 hover:bg-branco/[0.04]"
                )}
              >
                <span className={cn("shrink-0", e.v ? "text-sinal-critico" : "text-sinal-conforme")}>{e.icone}</span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-branco/85">{e.rotulo}</span>
                <span className={cn("dados-destaque text-2xl", e.v ? "text-sinal-critico" : "text-sinal-conforme")}>
                  {FMT.format(e.v)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 border-l-2 border-vermelho/50 pl-3 text-[12.5px] leading-relaxed text-texto-suave">
          {conclusaoFunil(p)}
        </p>
      </Cartao>

      {/* ---------------- Pontos de atenção ---------------- */}
      <Cartao
        titulo="Pontos de atenção"
        nota="o que a Diretriz PM3-001/02/25 manda olhar de perto, com a justificativa registrada"
        className="mb-6"
        ajuda={
          <p>
            Contagem não se cobra — nome se cobra. Aqui cada exceção aparece com quem, quando e a
            justificativa que a própria pessoa lançou no formulário.
          </p>
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          <ListaExcecao
            titulo="Respondeu NÃO auditei"
            itens={p.atencao.naoAuditou}
            vazio={`Ninguém deixou de auditar nos últimos ${p.atencao.janelaDias} dia${p.atencao.janelaDias === 1 ? "" : "s"}.`}
            semJustificativa="Sem justificativa registrada."
            emCurso={p.atencao.emCurso}
            diasDecorridos={p.atencao.diasDecorridos}
            janelaDias={p.atencao.janelaDias}
            totalNoRecorte={p.naoAuditou}
          />
          <ListaExcecao
            titulo={`Abaixo do mínimo de ${p.minimo}`}
            itens={p.atencao.abaixo}
            vazio={`Todos cumpriram o mínimo nos últimos ${p.atencao.janelaDias} dia${p.atencao.janelaDias === 1 ? "" : "s"}.`}
            semJustificativa={`Auditou abaixo do mínimo de ${p.minimo} por turno.`}
            emCurso={p.atencao.emCurso}
            diasDecorridos={p.atencao.diasDecorridos}
            janelaDias={p.atencao.janelaDias}
            totalNoRecorte={p.abaixo}
          />
          <ListaExcecao
            titulo="Partes confeccionadas"
            itens={p.atencao.partes}
            vazio={`Nenhuma parte confeccionada nos últimos ${p.atencao.janelaDias} dia${p.atencao.janelaDias === 1 ? "" : "s"}.`}
            semJustificativa="Sem observação registrada."
            comParte
            emCurso={p.atencao.emCurso}
            diasDecorridos={p.atencao.diasDecorridos}
            janelaDias={p.atencao.janelaDias}
            totalNoRecorte={p.partes}
          />
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-borda pt-3 text-[11.5px] leading-relaxed text-texto-suave">
          <span>
            <strong className="text-branco/85">Janela do padrão:</strong>{" "}
            {p.atencao.janelaDias} dia{p.atencao.janelaDias === 1 ? "" : "s"} · lançamento fora
            dela some da lista aqui, mas segue contando nos cartões acima.
          </span>
          <a
            href="/cop2026/admin/parametros"
            className="text-[11px] font-bold uppercase tracking-wide text-vermelho hover:underline"
          >
            Ajustar em Metas
          </a>
        </p>

        {/* Só aparece quando existe — em dia normal a planilha está limpa e um
            cartão vazio a mais só tiraria atenção do que importa. */}
        {p.quantidadeInvalidaLista.length > 0 && (
          <div className="mt-5 rounded-xl border border-sinal-critico/40 bg-sinal-critico/[0.07] p-4">
            <p className="rotulo-dado text-sinal-critico">
              Quantidade inválida na planilha · {p.quantidadeInvalidaLista.length}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
              O número informado no campo de quantidade exata não é uma quantidade possível —
              quase sempre é o ID da mídia digitado no campo errado. Estes lançamentos entram
              pela quantidade da lista, e não pelo número digitado; o painel não soma o valor
              abaixo. Corrija na planilha para o registro ficar íntegro.
            </p>
            <ul className="mt-3 space-y-2">
              {p.quantidadeInvalidaLista.map((i) => (
                <li key={i.id} className="rounded-lg border border-borda px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-branco">{i.quem}</p>
                  <p className="dados mt-0.5 text-[11.5px] text-texto-suave">
                    {i.fracao} · {formatarData(i.data)}
                    {i.turno ? ` · ${i.turno}` : ""}
                  </p>
                  <p className="dados mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
                    digitado <span className="text-sinal-critico">{i.descartado}</span> ·
                    contabilizado {FMT.format(i.videos)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mesmo critério do cartão acima: só aparece quando existe. Este é o
            caso em que a pessoa INFORMOU um identificador e o que informou não
            resolve para nada na plataforma — cobra-se correção, não
            preenchimento. Fica separado de "sem IDs" de propósito. */}
        {p.idInvalidoLista.length > 0 && (
          <div className="mt-5 rounded-xl border border-sinal-atencao/40 bg-sinal-atencao/[0.07] p-4">
            <p className="rotulo-dado text-sinal-atencao">
              Identificador fora do formato da plataforma · {p.idInvalidoLista.length}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
              O campo de ID foi preenchido, mas o que está ali não é o ID da mídia (32 caracteres)
              nem o ID da gravação (com hífens) que a plataforma exibe em Visão geral — quase
              sempre é o número da ocorrência ou a data digitada no lugar. A evidência continua
              contando para a meta, mas não pode ser conferida na plataforma. Corrija na planilha.
            </p>
            <ul className="mt-3 space-y-2">
              {p.idInvalidoLista.map((i) => (
                <li key={i.id} className="rounded-lg border border-borda px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-branco">{i.quem}</p>
                  <p className="dados mt-0.5 text-[11.5px] text-texto-suave">
                    {i.fracao} · {formatarData(i.data)}
                    {i.turno ? ` · ${i.turno}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Cartao>

      {/* ---------------- Camada 3: Análise técnica ---------------- */}
      <section aria-label="Análise técnica" className="mb-6">
        <div className="nao-imprime mb-4 flex flex-wrap gap-1.5 border-b border-borda" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-colors",
                aba === a.id
                  ? "border-vermelho text-vermelho"
                  : "border-transparent text-texto-suave hover:text-branco"
              )}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className="impressao-expande grid gap-6 lg:grid-cols-2">
          <Grupo ativo={aba === "ritmo"}>
            <Cartao
              titulo="Produção por dia"
              nota="com a meta por dia e a faixa de variação normal (±3σ)"
              className="lg:col-span-2"
              conclusao={conclusaoRitmo(p)}
              ajuda={
                <>
                  <p>
                    A faixa cinza é a variação normal do Batalhão: quase todo dia cai dentro dela.
                  </p>
                  <p className="mt-1.5">
                    Ponto fora da faixa não é automaticamente ruim — é atípico, e atípico se verifica.
                    A linha tracejada vermelha é a meta por dia.
                  </p>
                </>
              }
            >
              {p.porDia.length ? (
                <ProducaoDiaria
                  dados={p.porDia}
                  mediaDia={p.mediaDia}
                  lsc={p.lsc}
                  lic={p.lic}
                  metaDia={p.metaDia}
                />
              ) : (
                <SemDados />
              )}
            </Cartao>
          </Grupo>

          <Grupo ativo={aba === "qualidade"}>
              <Cartao
                titulo="Evidências por turno de serviço"
                nota={`quantos lançamentos trouxeram 0, 1, 2… evidências (mínimo: ${p.minimo})`}
                conclusao={conclusaoQualidade(p)}
                ajuda={
                  <p>
                    Cada barra conta lançamentos, não evidências. As barras vermelhas cumprem o mínimo
                    do Batalhão; as cinzas ficam abaixo dele.
                  </p>
                }
              >
                {p.dados.length ? <Histograma dados={p.histograma} /> : <SemDados />}
              </Cartao>
              <Cartao
                titulo="Funil de conformidade"
                nota="do lançamento recebido até o ID de mídia informado"
                conclusao={conclusaoFunil(p)}
                ajuda={
                  <p>
                    Cada degrau é um filtro sobre o anterior. A perda entre degraus mostra onde o
                    processo está vazando.
                  </p>
                }
              >
                {p.dados.length ? <Funil etapas={p.funil} /> : <SemDados />}
              </Cartao>
          </Grupo>

          <Grupo ativo={aba === "distribuicao"}>
              <Cartao
                titulo="Dispersão por fração"
                nota="mediana, quartis e p90 de cada companhia"
                conclusao={conclusaoDistribuicao(p)}
                ajuda={
                  <>
                    <p>A caixa concentra a metade central dos lançamentos da fração.</p>
                    <p className="mt-1.5">
                      A barra branca é a mediana; a dourada é o p90 — o patamar que só os 10% mais
                      produtivos alcançam.
                    </p>
                  </>
                }
              >
                {p.dados.length ? <Boxplot dados={p.dispersao} /> : <SemDados />}
              </Cartao>
              <Cartao
                titulo="Matriz dia × horário"
                nota="onde a auditoria se concentra na semana"
                conclusao={conclusaoHorario(p)}
                ajuda={
                  <p>
                    Quanto mais escura a célula, mais evidências naquele dia e faixa de horário. Ajuda a
                    ver se a auditoria acompanha o turno de serviço ou se acumula no fim.
                  </p>
                }
              >
                {p.dados.length ? <Heatmap matriz={p.matriz} max={p.maxMatriz} /> : <SemDados />}
              </Cartao>
          </Grupo>

          <Grupo ativo={aba === "pessoas"}>
              <Cartao
                titulo="Pareto de auditores"
                nota="quem concentra a produção — clique numa barra para buscar o nome"
                className="lg:col-span-2"
                conclusao={conclusaoPareto(p)}
                ajuda={
                  <p>
                    As barras vão do maior para o menor produtor; a linha dourada acumula o percentual.
                    Onde ela cruza os 80% está o grupo que sustenta a auditoria — e o risco, se ele sair
                    de escala.
                  </p>
                }
              >
                {p.pareto.length ? (
                  <Pareto dados={p.pareto} onSelecionar={(nome) => definir({ busca: nome })} />
                ) : (
                  <SemDados />
                )}
              </Cartao>
              <Cartao titulo="Turno e função" nota="em que atribuição a auditoria acontece">
                {p.dados.length ? (
                  <div className="space-y-5">
                    <BarrasSimples dados={p.porTurno} titulo="Por turno" />
                    <BarrasSimples dados={p.porFuncao} titulo="Por função" />
                  </div>
                ) : (
                  <SemDados />
                )}
              </Cartao>
              <Cartao
                titulo="Por posto e graduação"
                nota="em que nível hierárquico a auditoria acontece — é por aqui que o Comando cobra"
              >
                {p.dados.length ? <BarrasSimples dados={p.porPosto} /> : <SemDados />}
              </Cartao>
          </Grupo>
        </div>
      </section>

      {/* ---------------- Tabela analítica ---------------- */}
      <Cartao
        titulo="Tabela analítica"
        nota="produção por auditor no recorte selecionado"
        ajuda={
          <p>
            Clique num cabeçalho para ordenar. O CSV exporta exatamente o que está na tela, já com o
            filtro aplicado.
          </p>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <input
            value={f.busca}
            onChange={(e) => definir({ busca: e.target.value })}
            placeholder="Buscar por nome de guerra ou posto…"
            aria-label="Buscar auditor"
            className="w-full max-w-sm rounded-md border border-borda bg-tatico-super px-3 py-2 text-sm text-branco placeholder:text-texto-suave"
          />
          <button
            type="button"
            onClick={baixarCsv}
            disabled={!tabela.length}
            className="nao-imprime inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 text-[13px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho disabled:opacity-40"
          >
            <Download size={14} aria-hidden /> Exportar CSV
          </button>
          <span className="dados text-[12.5px] text-texto-suave">
            {FMT.format(tabela.length)} auditor(es)
          </span>
        </div>

        {tabela.length ? (
          <div className="tabela-rolante max-h-[28rem] overflow-auto rounded-lg border border-borda">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-superficie-2 rotulo-dado text-texto-suave">
                <tr>
                  <Th col="nome" ordem={ordem} ordenar={ordenarPor}>Auditor</Th>
                  <th scope="col" className="px-4 py-3">
                    Posto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fração
                  </th>
                  <Th col="lanc" num ordem={ordem} ordenar={ordenarPor}>
                    Lanç.
                  </Th>
                  {/* Turnos de serviço distintos: é a régua do mínimo, e o
                      denominador da média. Dois envios do mesmo auditor no
                      mesmo turno são UM turno. */}
                  <Th col="turnos" num ordem={ordem} ordenar={ordenarPor}>
                    Turnos
                  </Th>
                  <Th col="videos" num ordem={ordem} ordenar={ordenarPor}>
                    Evidências
                  </Th>
                  <Th col="media" num ordem={ordem} ordenar={ordenarPor}>
                    Média/turno
                  </Th>
                  <Th col="abaixo" num ordem={ordem} ordenar={ordenarPor}>
                    Desvios
                  </Th>
                  <th scope="col" className="px-4 py-3">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((r: LinhaAuditor) => (
                  <tr key={r.chave} className="border-t border-borda hover:bg-branco/[0.03]">
                    <td className="px-4 py-2.5 font-semibold text-branco">{r.nome}</td>
                    <td className="px-4 py-2.5 text-texto-suave">{r.posto}</td>
                    <td className="px-4 py-2.5 text-texto-suave">{r.fracao}</td>
                    <td className="dados px-4 py-2.5 text-right">{FMT.format(r.lanc)}</td>
                    <td className="dados px-4 py-2.5 text-right">{FMT.format(r.turnos)}</td>
                    <td className="dados px-4 py-2.5 text-right font-bold text-branco">
                      {FMT.format(r.videos)}
                    </td>
                    <td className="dados px-4 py-2.5 text-right text-texto-suave">
                      {PCT.format(r.media)}
                    </td>
                    <td className="dados px-4 py-2.5 text-right text-texto-suave">
                      {FMT.format(r.abaixo + r.naoAuditou)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Selo nivel={r.nivel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <SemDados texto="Nenhum auditor lançou no recorte." />
        )}
      </Cartao>

      {/* ---------------- Lançamentos (planilha bruta) ---------------- */}
      <Cartao
        titulo="Lançamentos"
        nota={`${FMT.format(p.dados.length)} de ${FMT.format(lancamentos.length)} respostas na planilha`}
        className="mt-6"
        ajuda={
          <p>
            A resposta como foi lançada no formulário, sem agregação. É esta a linha que instrui
            parte e vira anexo de processo — por isso o CSV daqui é diferente do da tabela analítica.
          </p>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={baixarLancamentosCsv}
            disabled={!p.dados.length}
            className="nao-imprime inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-2 text-[13px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho disabled:opacity-40"
          >
            <Download size={14} aria-hidden /> Exportar CSV das respostas
          </button>
        </div>
        {p.dados.length ? (
          <div className="tabela-rolante max-h-[28rem] overflow-auto rounded-lg border border-borda">
            <table className="w-full min-w-[1080px] text-left text-[13px]">
              <thead className="sticky top-0 bg-superficie-2 rotulo-dado text-texto-suave">
                <tr>
                  {[
                    "Data",
                    "Turno",
                    "RE",
                    "Nome de guerra",
                    "Posto",
                    "Função",
                    "Fração",
                    "Auditou",
                    "Evid.",
                    "IDs auditados",
                    "Parte",
                    "Justificativa",
                  ].map((c) => (
                    <th key={c} scope="col" className="whitespace-nowrap px-3 py-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.dados.map((l) => (
                  <tr key={l.id} className="border-t border-borda align-top hover:bg-branco/[0.03]">
                    <td className="dados whitespace-nowrap px-3 py-2">
                      {formatarData(l.data)}
                      {l.hora && <span className="block text-texto-suave">{l.hora}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.turno}</td>
                    <td className="dados whitespace-nowrap px-3 py-2">{l.re}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-branco">
                      {l.nomeGuerra}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.posto}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">{l.funcao}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-texto-suave">
                      {ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade}
                    </td>
                    <td className="px-3 py-2">
                      <Selo
                        nivel={l.auditou ? "conforme" : "critico"}
                        texto={l.auditou ? "Sim" : "Não"}
                      />
                    </td>
                    <td className="dados px-3 py-2 text-right font-bold text-branco">
                      {FMT.format(l.videos)}
                    </td>
                    <td className="dados max-w-[14rem] px-3 py-2 text-[11.5px] text-texto-suave">
                      {l.idsMidia || "—"}
                    </td>
                    <td className="dados whitespace-nowrap px-3 py-2 text-texto-suave">
                      {l.numeroParte || "—"}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2 text-[12px] leading-relaxed text-texto-suave">
                      {l.justificativa || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <SemDados texto="Nenhuma resposta no recorte." />
        )}
      </Cartao>

      {/* ---------------- Galeria Tática & Operacional 16º BPM/M ---------------- */}
      <section className="mt-8 mb-6 nao-imprime" aria-label="Galeria Tática Operacional">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-base font-bold uppercase tracking-wider text-branco">
              Registro Operacional · Fiscalização de COP no 16º BPM/M
            </h2>
            <p className="text-xs text-texto-suave">
              Atuação da tropa no patrulhamento motorizado e auditoria das evidências digitais gravadas
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vermelho/10 border border-vermelho/30 px-3 py-1 text-xs font-bold text-vermelho">
            16º BPM/M em Ação
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-viatura.jpg"
              alt="Viatura em Patrulhamento 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Fiscalização</span>
              <p className="text-xs font-bold text-white leading-snug">Patrulhamento Motorizado</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto_operacao.jpg"
              alt="Operação Policial 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Auditoria</span>
              <p className="text-xs font-bold text-white leading-snug">Abordagem & Gravação</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-rua.jpg"
              alt="Ponto de Estacionamento"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Presença</span>
              <p className="text-xs font-bold text-white leading-snug">Ponto de Estacionamento</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-slate-900 shadow-md">
            <Image
              src="/media/foto-oficial.jpg"
              alt="Comando e Gestão 16º BPM/M"
              width={400}
              height={260}
              className="h-36 sm:h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-3 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-vermelho">Gestão</span>
              <p className="text-xs font-bold text-white leading-snug">Sala de Operações</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Glossário ---------------- */}
      <details className="mt-6 rounded-xl border border-borda bg-tatico-super p-5 shadow-inst">
        <summary className="cursor-pointer font-serif text-[15px] font-bold uppercase tracking-wide text-branco">
          Glossário do painel
        </summary>
        <dl className="mt-4 grid gap-4 text-[13px] leading-relaxed sm:grid-cols-2">
          {[
            ["Evidência", "Cada mídia de COP auditada e registrada no formulário, com o ID informado."],
            [
              `Meta global do Batalhão (${FMT.format(META_TOTAL_BATALHAO)})`,
              `Universo total de ${FMT.format(META_TOTAL_BATALHAO)} evidências distribuído de forma justa e proporcional ao quadro fixo com COP: ${rateioDaMatriz}.`,
            ],
            [
              "Metas Semanais",
              `Divisão do universo mensal pelas semanas operacionais do mês, rateada por DIAS e não em quatro partes iguais — por isso a última costuma ser maior. No período em tela: ${rateioSemanal}.`,
            ],
            [
              "Matriz de Proporcionalidade",
              "Critério técnico aprovado que pondera o efetivo real de cada subunidade para que a cobrança seja justa com a capacidade operacional de cada fração.",
            ],
            ["Turno 12x36", "Cada escala de 12 horas de serviço. A meta é contada por turno, não por dia corrido."],
            [
              "Conformidade",
              `Percentual de lançamentos que trouxeram ${p.minimo} ou mais evidências — o mínimo determinado pelo Batalhão (a Diretriz PM3-001/02/25 pede 2).`,
            ],
            ["Mediana", "O valor do meio: metade dos turnos de serviço ficou acima dele, metade abaixo. Não se deixa distorcer por um recorde isolado."],
            ["p90", "O patamar alcançado pelos 10% mais produtivos."],
            ["±3σ (carta de controle)", "A faixa de variação normal do próprio Batalhão. Dia fora dela é atípico e merece verificação — não é, por si só, falta."],
            ["Pareto", "Ordenação do maior para o menor produtor, com o acumulado. Mostra se a auditoria depende de poucos."],
            ["IDs de mídia", "O identificador da imagem ou vídeo auditado. Sem ele a evidência não é rastreável na conferência."],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="font-bold text-branco">{t}</dt>
              <dd className="text-texto-suave">{d}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="mt-6 text-[12px] leading-relaxed text-texto-suave">
        Leitura direta da planilha de respostas do formulário da auditoria, revalidada a cada 60
        segundos. Meta global: 960 evidências rateadas proporcionalmente pelo quadro fixo operacional
        com COP (570 PMs). Diretriz PM3-001/02/25. Uso interno do 16º BPM/M.
      </p>
    </div>
  );
}
