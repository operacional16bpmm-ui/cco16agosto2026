#!/usr/bin/env node
/**
 * Guarda das rotas de API da COP: nenhuma nasce aberta em silêncio.
 *
 * A allowlist do `proxy.ts` casa por PREFIXO
 * (`pathname.startsWith(rota + "/")`). Isso é bom para não repetir rota a rota,
 * e é justamente o que faz uma subrota NOVA sob um prefixo público nascer sem
 * gate — `/api/cop2026/saude/painel` e `/saude/perguntar` já existem assim, e só
 * estão protegidas porque cada uma chama `exigirAdminCop()` por conta própria.
 * O comentário no proxy avisa; comentário não falha o build.
 *
 * Decisão de 08/09/2026: mantém-se o prefixo (mexer na allowlist arrisca quebrar
 * rota em produção) e trava-se por teste. Toda rota sob `app/api/cop2026` tem de
 * provar que confere acesso — ou estar declarada abaixo como pública, com o
 * motivo escrito.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const RAIZ = "app/api/cop2026";

/**
 * Rotas ABERTAS de propósito. Cada uma com o porquê — entrada nova aqui é
 * decisão consciente, não descuido.
 */
const PUBLICAS = new Map([
  ["acesso/iniciar", "começa o handshake com o Google; se exigisse sessão, ninguém entraria"],
  ["acesso/callback", "volta do Google; valida o `state` do próprio fluxo"],
  ["acesso/sair", "encerra a sessão — exigir sessão para sair não faz sentido"],
  ["efetivo", "consultada pelo formulário público /cop2026/lancar, que a tropa usa sem login"],
  [
    "briefing-png",
    "exporta o que o Dashboard já mostra, e o Dashboard ficou aberto por determinação do Comando em 08/09/2026; quem tem sessão exporta com a própria identidade",
  ],
  [
    "briefing-pdf",
    "mesma razão do briefing-png: recusar o arquivo do que se lê na tela só produziria um botão que não funciona",
  ],
  [
    "unidades",
    "organograma da Corporação (nome e código de OPM) para o seletor do formulário público; não devolve pessoa, contagem nem lançamento",
  ],
  [
    "versao",
    "metadado de build — commit, horário da publicação e número de versão. É o que `scripts/publicar.mjs` lê para confirmar que o deploy subiu, e o que permite a qualquer um do Batalhão dizer 'o meu está velho'. Nenhum dado de pessoa, lançamento ou fração passa por aqui",
  ],
]);

/**
 * Como uma rota pode provar que confere acesso.
 *
 * `prepararExportacao` SAIU desta lista em 08/09/2026: ele continua chamando
 * `sessaoCop()`, mas deixou de recusar quem não tem sessão — o Dashboard que ele
 * fotografa ficou aberto. Guarda que não recusa não é guarda, e mantê-lo aqui
 * faria as duas rotas de exportação parecerem protegidas para sempre. Elas estão
 * declaradas em PUBLICAS, com o motivo escrito.
 */
const GUARDAS = [
  "exigirAdminCop",
  "exigirAcessoCop",
  "sessaoCop",
  "CCO16_SAUDE_TOKEN",
  "CCO16_BACKUP_TOKEN",
];

function rotas(dir, prefixo = "") {
  const achadas = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achadas.push(...rotas(caminho, prefixo ? `${prefixo}/${nome}` : nome));
    } else if (nome === "route.ts") {
      achadas.push({ id: prefixo || ".", caminho });
    }
  }
  return achadas;
}

test("toda rota de API da COP confere acesso ou está declarada pública", () => {
  const encontradas = rotas(RAIZ);
  assert.ok(encontradas.length > 0, `nenhuma rota encontrada em ${RAIZ} — o caminho mudou?`);

  const desprotegidas = [];
  for (const { id, caminho } of encontradas) {
    if (PUBLICAS.has(id)) continue;
    const fonte = readFileSync(caminho, "utf8");
    if (!GUARDAS.some((g) => fonte.includes(g))) desprotegidas.push(id);
  }

  assert.deepEqual(
    desprotegidas,
    [],
    `rota(s) sem checagem de acesso: ${desprotegidas.join(", ")}.\n` +
      `A allowlist do proxy casa por PREFIXO, então uma subrota nova sob um prefixo ` +
      `público NASCE ABERTA. Chame exigirAdminCop()/exigirAcessoCop() dentro da rota, ` +
      `ou declare-a em PUBLICAS neste arquivo com o motivo.`
  );
});

test("a lista de públicas não cresceu sem motivo escrito", () => {
  for (const [id, motivo] of PUBLICAS) {
    assert.ok(
      motivo && motivo.length > 20,
      `a rota pública "${id}" está sem justificativa. Rota aberta sem motivo escrito é ` +
        `descuido esperando para virar incidente.`
    );
  }
});

test("o que este arquivo chama de público está aberto TAMBÉM no proxy", () => {
  /* A lacuna que este teste fecha, aberta em produção em 09/09/2026:
     `/api/cop2026/versao` foi declarada pública AQUI, os catorze gates passaram,
     e em produção ela respondia **307 para /login** — porque quem decide o
     acesso em tempo de execução é `ROTAS_PUBLICAS` do `proxy.ts`, não esta
     lista. As duas precisam concordar; esta é a declaração de intenção, aquela
     é o que roda.

     Exceções deliberadas: as rotas cobertas por um PREFIXO já aberto no proxy
     (`acesso/*` entra por `/api/cop2026/acesso`) não precisam de linha própria
     lá — a allowlist do proxy casa por prefixo. */
  const proxy = readFileSync("proxy.ts", "utf8");
  const abertasNoProxy = [...proxy.matchAll(/"(\/api\/cop2026\/[^"]+)"/g)].map((m) => m[1]);

  const faltando = [...PUBLICAS.keys()].filter((id) => {
    const rota = `/api/cop2026/${id}`;
    return !abertasNoProxy.some((p) => rota === p || rota.startsWith(p + "/"));
  });

  assert.deepEqual(
    faltando,
    [],
    `rota(s) declarada(s) pública(s) neste arquivo mas FECHADA(S) no proxy: ${faltando.join(", ")}.\n` +
      `Em produção elas respondem 307 para /login e o gate não acusa nada — foi assim que ` +
      `/api/cop2026/versao subiu quebrada. Acrescente a rota em ROTAS_PUBLICAS de proxy.ts, ` +
      `com o motivo escrito ao lado.`
  );
});
