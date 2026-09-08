#!/usr/bin/env node
/**
 * Guarda da barra de atalhos da COP (`components/publico16/cop/barra-cop.tsx`).
 *
 * Duas coisas que nenhum outro teste pega:
 *
 * 1. **Botão que leva a 404.** A barra aparece em toda tela do módulo e é a
 *    primeira coisa que a tropa toca. Renomear uma rota é rotina; renomear e
 *    esquecer o atalho transforma a navegação inteira em armadilha, e o build
 *    passa liso porque `<Link href="...">` aceita qualquer string.
 * 2. **A barra sumir da casca.** Ela é montada uma vez, no `layout.tsx` do
 *    módulo. Se alguém apagar aquele arquivo para "simplificar", as 19 telas
 *    perdem a navegação de uma vez e ninguém percebe até o Comando abrir.
 *
 * Rodar: `npm run verificar:navegacao`
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const BARRA = "components/publico16/cop/barra-cop.tsx";
const LAYOUT = "app/(public)/cop2026/layout.tsx";
const RAIZ_ROTAS = "app/(public)";
const PUBLICO = "public";

const fonteBarra = readFileSync(BARRA, "utf8");

/** Todos os `href:` declarados nos atalhos da barra. */
function hrefsDaBarra() {
  return [...fonteBarra.matchAll(/href:\s*(?:`([^`]+)`|"([^"]+)")/g)].map(
    (m) => m[1] ?? m[2]
  );
}

test("a barra é montada no layout do módulo, não em cada página", () => {
  assert.ok(existsSync(LAYOUT), `${LAYOUT} sumiu: as telas do módulo ficaram sem navegação.`);
  const layout = readFileSync(LAYOUT, "utf8");
  assert.match(layout, /<BarraCop/, `${LAYOUT} não monta mais a BarraCop.`);
});

test("todo atalho interno da barra aponta para uma rota que existe", () => {
  const quebrados = [];
  for (const href of hrefsDaBarra()) {
    // Externos (`https://…`) e o que não é caminho de rota não se conferem aqui.
    if (!href.startsWith("/")) continue;
    const caminho = href.split("?")[0];

    if (caminho.endsWith(".pdf")) {
      if (!existsSync(join(PUBLICO, caminho))) quebrados.push(`${href} (arquivo)`);
      continue;
    }

    if (!existsSync(join(RAIZ_ROTAS, caminho, "page.tsx"))) quebrados.push(href);
  }

  assert.deepEqual(
    quebrados,
    [],
    `atalho(s) da barra sem destino: ${quebrados.join(", ")}. ` +
      `A barra está em toda tela do módulo — um destino errado aqui é 404 para o Batalhão inteiro.`
  );
});

test("os destinos que o Comando pediu continuam na barra", () => {
  // Lista fechada, decidida pelo Fabricio em 08/09/2026. Tirar um item daqui é
  // decisão de Comando, e some da barra junto — não some sozinho.
  const obrigatorios = [
    "/cop2026",
    "/cop2026/dashboard",
    "/cop2026/briefing",
    "/cop2026/relatorios",
    "/cop2026/admin",
    "/cop2026/admin/lancamentos",
    "/cop2026/admin/divergencias",
    "/documentos/diretriz-pm3-001-02-25.pdf",
  ];
  const hrefs = hrefsDaBarra();
  for (const alvo of obrigatorios) {
    assert.ok(hrefs.includes(alvo), `a barra perdeu o atalho para ${alvo}.`);
  }
  // O lançamento entra pela constante `URL_FORMULARIO`, fonte única da rota.
  assert.match(fonteBarra, /URL_FORMULARIO/, "a barra perdeu o atalho de lançamento.");
  assert.match(fonteBarra, /wa\.me/, "a barra perdeu o contato de ajuda no WhatsApp.");
  assert.match(fonteBarra, /instagram\.com/, "a barra perdeu o Instagram do Batalhão.");
});

test("os atalhos de administração não aparecem para quem não administra", () => {
  // Não é estética: `exigirAdminCop()` responde 404, e um botão que leva a 404
  // faz a tropa achar que o portal quebrou.
  assert.match(
    fonteBarra,
    /ehAdmin\s*\?/,
    `${BARRA}: a lista de administração deixou de depender de \`ehAdmin\`.`
  );
});
