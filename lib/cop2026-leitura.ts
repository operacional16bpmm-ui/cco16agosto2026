/**
 * Leitura da planilha da Auditoria de COP 2026 — lado do SERVIDOR.
 *
 * Mora num arquivo separado de lib/cop2026.ts por causa do `after` do
 * next/server: os componentes client do dashboard importam tipos e constantes
 * daquele módulo, e um import de API server-only lá derruba o build inteiro
 * ("This API is only available in Server Components"). Aqui só entram os
 * Server Components das quatro rotas de COP.
 *
 * A fonte é o Google Forms "Auditoria COP Motorola - 16 BPM/M" e a planilha de
 * respostas da conta institucional operacional16bpmm@gmail.com, que tem duas
 * abas: as respostas cruas e "Parametros", onde o Batalhão fixa o efetivo apto
 * por subunidade e a meta do período. Não há ingestão no Supabase nem script
 * manual no caminho: a planilha recebe resposta o dia inteiro e o Comando
 * precisa do número de agora.
 */

import { after } from "next/server";

import {
  METAS_PADRAO_2026,
  PLANILHA_ID,
  extrairLancamentos,
  extrairMetas,
  normalizar,
  type LancamentoCop,
  type LeituraCop2026,
} from "@/lib/cop2026";
import { lerLancamentosDoBanco } from "@/lib/db/cop2026-lancamentos";
import { lerMetas, periodoDe } from "@/lib/db/cop2026-parametros";
import { hojeBrt } from "@/lib/cop2026-ciclo";
import { parseCsv } from "@/lib/inventario-2026";

/** Documento publicado na web em 26/08/2026 (Arquivo > Compartilhar > Publicar
 *  na Web). É esta publicação que mantém as duas abas legíveis em CSV depois
 *  que o compartilhamento por link do documento foi restringido. */
const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
/** gids da publicação — não são os mesmos gids da edição. */
const GID_RESPOSTAS = "305359783";
const GID_PARAMETROS = "1587286327";

/**
 * Rotas de leitura de uma aba — todas disputadas ao mesmo tempo, vence a
 * primeira que devolver CSV de verdade (ver `lerPrimeiroQueResponder`).
 *
 * A publicação na web (`/pub`) é a que sustenta o painel hoje; o `gviz` só
 * responde enquanto o documento estiver compartilhado por link, e desde que o
 * Batalhão restringiu o acesso em 26/08/2026 ele devolve a tela de login. Fica
 * na disputa mesmo assim: falha em menos de 1s, não atrapalha ninguém, e volta
 * a ser o caminho de volta se um dia alguém despublicar a planilha.
 */
function urlsDaAba(gid: string, nomeAba: string, alternativas: string[] = []) {
  return [
    `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${gid}&single=true&output=csv`,
    ...alternativas,
    `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nomeAba)}`,
  ];
}

/**
 * Rota extra da aba de respostas: a publicação SEM `gid` devolve a primeira aba
 * do documento, que hoje é justamente a de respostas do Forms.
 *
 * Vale só para ela — pedir isto para a aba Parametros traria as respostas
 * caladamente, e o painel calcularia meta em cima da planilha errada. Existe
 * porque as duas rotas degradam de forma independente: em 29/08/2026, em seis
 * medições seguidas, uma passou de 29s enquanto a outra respondeu em 7,9s, e no
 * ciclo seguinte a situação se inverteu. Nenhuma é confiável sozinha.
 *
 * "Hoje é a primeira aba" é suposição, e suposição calada vira número errado:
 * por isso o resultado desta rota passa pelo `CABECALHO_RESPOSTAS` antes de ser
 * aceito. Se alguém reordenar as abas da planilha, ela é descartada em vez de
 * alimentar o painel com a aba errada.
 */
const URL_RESPOSTAS_PRIMEIRA_ABA = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?output=csv`;

/** A aba de respostas sempre abre com o carimbo do Forms; a de Parametros, com
 *  a subunidade. É o que separa uma da outra quando a URL não diz qual é. */
const CABECALHO_RESPOSTAS = (cabecalho: string[]) =>
  cabecalho.some((titulo) => /^carimbo/.test(normalizar(titulo)));

/**
 * Teto de espera da leitura, medido sobre a ABA INTEIRA (todas as rotas dela),
 * não sobre cada rota.
 *
 * O `/pub` do Google responde por um redirect para `doc-*.googleusercontent.com`
 * e, sob carga, esse host aceita a conexão e nunca devolve nada. Sem corte, o
 * `fetch` fica pendurado, o Server Component nunca resolve e a página inteira
 * deixa de fechar — foi exatamente isso que derrubou /cop2026 em 29/08/2026:
 * requisições com cabeçalho entregue, 32 KB de corpo e o stream parado.
 *
 * São dois prazos porque as duas leituras têm plateias diferentes:
 *
 * - `PRIMEIRA`: alguém está com a página em branco esperando. Precisa caber
 *   com folga no `maxDuration = 20` das rotas de COP.
 * - `SEGUNDO_PLANO`: ninguém espera (roda em `after()`, depois da resposta),
 *   então pode ser generoso. E precisa ser: 6s recusava quase toda leitura —
 *   medido em 29/08/2026, a publicação do Google oscilou entre 6s e mais de
 *   30s no mesmo minuto, pelas duas rotas.
 */
const TIMEOUT_PRIMEIRA_LEITURA_MS = 12_000;
const TIMEOUT_SEGUNDO_PLANO_MS = 15_000;

async function lerCsv(
  url: string,
  signal: AbortSignal,
  prazoMs: number
): Promise<string[][]> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      // Sem cache de fetch de propósito: as rotas de COP são `force-dynamic`,
      // que a própria Next define como equivalente a `cache: "no-store"` em
      // TODO fetch da página — um `next.revalidate` aqui seria letra morta e
      // esconderia que quem segura o dado é o retrato do módulo, abaixo.
      cache: "no-store",
      signal,
    });
  } catch (causa) {
    const nome = causa instanceof Error ? causa.name : "";
    if (nome === "TimeoutError" || nome === "AbortError") {
      throw new Error(`A planilha não respondeu em ${prazoMs / 1000}s.`);
    }
    const detalhe = causa instanceof Error ? causa.message : String(causa);
    throw new Error(`A planilha não pôde ser alcançada (${detalhe}).`);
  }
  if (!resposta.ok) throw new Error(`A planilha respondeu ${resposta.status}.`);
  const texto = await resposta.text();
  // Sem permissão de leitura o Google devolve 200 com a tela de login em HTML.
  if (texto.trimStart().startsWith("<")) {
    throw new Error("A planilha exigiu autenticação em vez de devolver os dados.");
  }
  return parseCsv(texto);
}

/**
 * Dispara TODAS as rotas da aba de uma vez e fica com a primeira que devolver
 * CSV de verdade.
 *
 * Era em série, e em série o prazo inteiro podia ser gasto por uma rota
 * pendurada sem a outra chegar a ser tentada — que é exatamente o caso: as duas
 * publicações do Google falham de forma independente e alternada. Em paralelo, o
 * pior caso deixa de ser a soma das rotas e passa a ser a MELHOR delas, e uma
 * rota a mais não custa espera nenhuma. São três requisições a cada minuto, no
 * máximo, não a cada visita.
 *
 * Guarda TODAS as falhas, não só a última. Enquanto só a última era reportada,
 * o painel acusava o 401 do gviz — que está morto desde que o documento foi
 * restrito, em 26/08/2026 — enquanto o problema real era a publicação `/pub`
 * pendurada. Quem lia o aviso ia conferir o compartilhamento e não achava nada.
 */
async function lerPrimeiroQueResponder(
  urls: string[],
  prazoMs: number,
  /** Rejeita um CSV que responde mas não é a aba pedida. Sem isto, uma rota
   *  ambígua entraria calada no lugar da certa. */
  aceita?: (cabecalho: string[]) => boolean
): Promise<string[][]> {
  // Um relógio só para todas as rotas, mais o corte assim que alguém vencer:
  // as perdedoras são abandonadas em vez de ficarem penduradas até o prazo.
  const corte = new AbortController();
  const prazo = AbortSignal.any([corte.signal, AbortSignal.timeout(prazoMs)]);
  try {
    return await Promise.any(
      urls.map(async (url) => {
        const linhas = await lerCsv(url, prazo, prazoMs);
        if (aceita && !aceita(linhas[0] ?? [])) {
          throw new Error("A planilha devolveu outra aba nesta rota.");
        }
        return linhas;
      })
    );
  } catch (erro) {
    const causas = erro instanceof AggregateError ? erro.errors : [erro];
    const falhas: string[] = [];
    for (const causa of causas) {
      const mensagem = causa instanceof Error ? causa.message : String(causa);
      // Rotas distintas falhando pelo mesmo motivo viravam a mesma frase
      // repetida no banner do Comando.
      if (!falhas.includes(mensagem)) falhas.push(mensagem);
    }
    throw new Error(falhas.length > 0 ? falhas.join(" ") : "A planilha não respondeu.");
  } finally {
    corte.abort();
  }
}

/** Carimbo quando nenhuma leitura ainda deu certo nesta instância. */
export const SEM_LEITURA = "—";

function agoraEmSaoPaulo(): string {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Último retrato bom da planilha.
 *
 * Vive no módulo, então dura o que durar a instância da função na Vercel. Não é
 * banco nem substitui a planilha: serve para atravessar uma pane do Google sem
 * zerar o painel do Comando. Zerar é pior que atrasar — número zerado parece
 * tropa que não auditou, e já houve decisão tomada em cima de painel vazio.
 */
type Retrato = Pick<LeituraCop2026, "lancamentos" | "metas" | "lidoEm">;
let retrato: Retrato | null = null;
/** `performance.now()` da última leitura boa. Relógio monotônico de propósito:
 *  `Date.now()` pode andar para trás com ajuste de hora e deixar o retrato
 *  eternamente "fresco". */
let retratoEm = 0;
/** Falha da última tentativa. Só vira banner quando existe de fato — retrato
 *  com 61s de idade não é erro, é dado de um minuto atrás. */
let ultimaFalha: string | undefined;
/** Leitura em curso, para que dez visitas simultâneas façam UMA ida ao Google
 *  em vez de dez. */
let emVoo: Promise<void> | null = null;

/**
 * Validade do retrato.
 *
 * A tropa preenche o formulário e confere na página logo em seguida, então um
 * minuto é o limite do que se pode servir sem parecer que o lançamento sumiu.
 */
const VALIDADE_RETRATO_MS = 60_000;

async function relerPlanilha(prazoMs: number): Promise<void> {
  try {
    const [respostas, parametros] = await Promise.all([
      lerPrimeiroQueResponder(
        urlsDaAba(GID_RESPOSTAS, "Respostas ao formulário 1", [URL_RESPOSTAS_PRIMEIRA_ABA]),
        prazoMs,
        CABECALHO_RESPOSTAS
      ),
      lerPrimeiroQueResponder(urlsDaAba(GID_PARAMETROS, "Parametros"), prazoMs),
    ]);
    const metasLidas = extrairMetas(parametros);
    retrato = {
      lancamentos: extrairLancamentos(respostas),
      metas: metasLidas.length > 0 ? metasLidas : METAS_PADRAO_2026,
      lidoEm: agoraEmSaoPaulo(),
    };
    retratoEm = performance.now();
    ultimaFalha = undefined;
  } catch (erro) {
    ultimaFalha =
      erro instanceof Error ? erro.message : "Não foi possível alcançar a planilha.";
  }
}

/** Dispara a releitura sem deixar duas correrem juntas. */
function relerUmaVezSo(prazoMs: number): Promise<void> {
  if (!emVoo) {
    emVoo = relerPlanilha(prazoMs).finally(() => {
      emVoo = null;
    });
  }
  return emVoo;
}

/**
 * Leitura da auditoria, servida do retrato e revalidada FORA do caminho da
 * resposta.
 *
 * Por que não o cache de fetch da Next: as quatro rotas de COP são
 * `force-dynamic` porque o recorte do Comando chega por query string, e a
 * própria documentação define `force-dynamic` como equivalente a pôr
 * `cache: "no-store"` em todo fetch da página — `fetchCache: "force-no-store"`,
 * que "força toda requisição a ser refeita a cada request mesmo que forneça
 * force-cache". O `next: { revalidate: 60 }` que estava aqui nunca valeu nada:
 * TODA visita pagava a viagem inteira ao Google, e a publicação levou de 6s a
 * mais de 30s nas medições de 29/08/2026. Era esse o "site lento".
 *
 * O desenho agora:
 *
 * - retrato dentro da validade → devolve na hora, ninguém espera o Google;
 * - retrato vencido → devolve o retrato IGUAL e manda reler em `after()`, que
 *   roda depois da resposta ir embora. O visitante seguinte pega o dado novo;
 * - sem retrato nenhum (instância fria) → aí sim espera, com o prazo curto.
 *
 * Só a primeira visita de cada instância paga a espera. As outras leem memória.
 */
export async function lerAuditoriaCop2026(): Promise<LeituraCop2026> {
  const fonte = fonteCop2026();
  if (fonte !== "planilha") return lerComBanco(fonte);
  return lerDaPlanilha();
}

/* --------------------------------------------------------------- fonte */

export type FonteCop2026 = "planilha" | "uniao" | "banco";

/**
 * De onde os números vêm. Variável de ambiente e não constante de código
 * porque, neste projeto, é o ÚNICO rollback que funciona em minutos: um deploy
 * da Vercel já ficou `Ready` sem promover o alias e serviu build velho por
 * horas (ver LEIA-ME.md). Se o banco se comportar mal no meio de um turno, o
 * painel volta para a planilha sem esperar build.
 *
 * - `planilha` (padrão) — como sempre foi. O formulário grava no banco, mas
 *   quem manda no painel ainda é a planilha; é o modo da rodagem paralela.
 * - `uniao` — planilha até o corte, banco a partir dele. É o modo da virada.
 * - `banco` — só o banco. Depois que o Forms fechar.
 */
export function fonteCop2026(): FonteCop2026 {
  const v = process.env.COP2026_FONTE;
  return v === "banco" || v === "uniao" ? v : "planilha";
}

/** Data em que o banco passa a mandar, no modo `uniao`. Corte explícito, e não
 *  "o que for mais novo": sem uma linha divisória declarada, o mesmo lançamento
 *  entra pelas duas fontes e 960 vira 1920 (A-5). */
function corteDoBanco(): string {
  const v = process.env.COP2026_CORTE_BANCO;
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "2026-09-01";
}

/**
 * Leitura com banco.
 *
 * Quem separa as fontes é o CORTE DE DATA, e só ele. A tentação é deduplicar
 * por `re|data|turno` "por segurança", e isso está errado: essa chave não é
 * única no mundo real — 12 grupos de agosto/2026 têm lançamentos
 * complementares no mesmo turno, com identificadores diferentes (migration
 * 028). Deduplicar por ela apagaria lançamentos legítimos e faria o painel
 * cair sem que ninguém soubesse por quê.
 *
 * Consequência operacional, que precisa estar clara para quem opera a virada:
 * ao importar agosto para o banco, o corte tem que ir junto para o início de
 * agosto. Corte e backfill andam no mesmo passo.
 */
async function lerComBanco(fonte: Exclude<FonteCop2026, "planilha">): Promise<LeituraCop2026> {
  const corte = corteDoBanco();
  const [doBanco, metas] = await Promise.all([
    lerLancamentosDoBanco(),
    lerMetas(periodoDe(hojeBrt())),
  ]);

  if (fonte === "banco") {
    return {
      lancamentos: doBanco.lancamentos,
      metas,
      lidoEm: agoraEmSaoPaulo(),
      ...(doBanco.erro ? { erro: doBanco.erro, stale: true } : {}),
    };
  }

  const daPlanilha = await lerDaPlanilha();
  const anteriores = daPlanilha.lancamentos.filter((l: LancamentoCop) => l.data < corte);

  return {
    // `id` é só chave de lista na tabela do painel; reindexar evita duas linhas
    // com a mesma key vindas de fontes diferentes.
    lancamentos: [...anteriores, ...doBanco.lancamentos].map((l, i) => ({ ...l, id: i })),
    metas,
    lidoEm: daPlanilha.lidoEm,
    ...(daPlanilha.erro ? { erro: daPlanilha.erro, stale: true } : {}),
    ...(doBanco.erro ? { erro: doBanco.erro, stale: true } : {}),
  };
}

async function lerDaPlanilha(): Promise<LeituraCop2026> {
  const vencido = performance.now() - retratoEm > VALIDADE_RETRATO_MS;

  if (!retrato) {
    // Instância fria: não há o que servir, então esta requisição espera mesmo.
    await relerUmaVezSo(TIMEOUT_PRIMEIRA_LEITURA_MS);
  } else if (vencido) {
    // `after` roda depois da resposta fechar, dentro do `maxDuration` da rota.
    // Se a plataforma congelar a função antes de terminar, o retrato só fica
    // mais um minuto velho e a próxima visita tenta de novo — degradação
    // mansa, nunca página pendurada.
    after(() => relerUmaVezSo(TIMEOUT_SEGUNDO_PLANO_MS));
  }

  if (retrato) {
    // `ultimaFalha` só aparece se a ÚLTIMA tentativa falhou de verdade.
    return { ...retrato, ...(ultimaFalha ? { erro: ultimaFalha, stale: true } : {}) };
  }
  return {
    lancamentos: [],
    metas: METAS_PADRAO_2026,
    erro: ultimaFalha ?? "Não foi possível alcançar a planilha.",
    stale: true,
    // Sem nenhuma leitura boa, carimbar a hora da TENTATIVA faria o painel
    // anunciar "última leitura confiável: agora" em cima de tela zerada.
    lidoEm: SEM_LEITURA,
  };
}
