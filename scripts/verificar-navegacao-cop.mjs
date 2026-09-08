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
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

test("a barra conhece todas as telas de administração", () => {
  // A lista da barra é a ÚNICA navegação da administração desde 08/09/2026 (as
  // abas internas saíram). Tela nova que não entre aqui fica sem caminho: só
  // chega quem digitar a URL.
  const hrefs = new Set(hrefsDaBarra());
  const telas = [];
  const raizAdmin = join(RAIZ_ROTAS, "cop2026/admin");
  const varrer = (dir, prefixo) => {
    for (const nome of readdirSync(dir, { withFileTypes: true })) {
      if (!nome.isDirectory()) continue;
      const rota = `${prefixo}/${nome.name}`;
      if (existsSync(join(dir, nome.name, "page.tsx"))) telas.push(rota);
      varrer(join(dir, nome.name), rota);
    }
  };
  varrer(raizAdmin, "/cop2026/admin");
  telas.push("/cop2026/admin");

  const foraDaBarra = telas.filter((t) => !hrefs.has(t));
  assert.deepEqual(
    foraDaBarra,
    [],
    `tela(s) de administração sem atalho na barra: ${foraDaBarra.join(", ")}.`
  );
});

test("as telas de administração não repetem a navegação", () => {
  // Duas fileiras idênticas na mesma tela, e duas listas para manter.
  const sobrou = readdirSync(join(RAIZ_ROTAS, "cop2026/admin"), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .filter((e) =>
      readFileSync(join(RAIZ_ROTAS, "cop2026/admin", e.name), "utf8").includes("AbasAdmin")
    );
  assert.deepEqual(
    sobrou.map((e) => e.name),
    [],
    "as abas internas da administração voltaram: a navegação dela vive na BarraCop."
  );
});

test("a Planilha de Lançamentos é aberta, e só as ações são de admin", () => {
  /* Determinação do Comando, 08/09/2026: Dashboard, Briefing, Relatórios e a
     Planilha ficam abertos — "RE não é dado sigiloso". O que NÃO se afrouxou:
     excluir e reclassificar continuam exigindo admin dentro da própria Server
     Action, porque esconder botão nunca foi controle de acesso. */
  const pagina = readFileSync(
    join(RAIZ_ROTAS, "cop2026/admin/lancamentos/page.tsx"),
    "utf8"
  );
  assert.ok(
    !pagina.includes("await exigirAdminCop(") && !pagina.includes("await exigirAcessoCop("),
    "a Planilha de Lançamentos voltou a exigir sessão — o Comando mandou abri-la."
  );

  // Ela mora sob o prefixo restrito `/cop2026/admin`: sem a exceção explícita
  // o proxy a manda para o login antes de a página rodar.
  assert.match(
    readFileSync("lib/cop2026-acesso.ts", "utf8"),
    /ABERTAS_SOB_ADMIN_COP\s*=\s*\["\/cop2026\/admin\/lancamentos"\]/,
    "a exceção de proxy da Planilha sumiu: ela cai no login apesar de estar aberta."
  );

  const acoes = readFileSync(
    join(RAIZ_ROTAS, "cop2026/admin/lancamentos/actions.ts"),
    "utf8"
  );
  const quantasAcoes = [...acoes.matchAll(/export async function \w+Action/g)].length;
  const quantosGates = [...acoes.matchAll(/exigirAdminCop\(/g)].length;
  assert.ok(
    quantosGates >= quantasAcoes,
    `actions.ts tem ${quantasAcoes} ação(ões) e só ${quantosGates} chamada(s) a exigirAdminCop(). ` +
      `Com a tela aberta, um gate a menos aqui deixa QUALQUER PESSOA excluir lançamento.`
  );
});

test("a exceção de proxy não abriu nenhuma outra tela de administração", () => {
  const fonte = readFileSync("lib/cop2026-acesso.ts", "utf8");
  const lista = fonte.slice(fonte.indexOf("ABERTAS_SOB_ADMIN_COP"));
  const rotas = [...lista.slice(0, lista.indexOf("]")).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    rotas,
    ["/cop2026/admin/lancamentos"],
    "entrou rota nova na exceção do proxy. Ali dentro moram a lista de acesso, as metas e a trilha."
  );
});

test("as demais telas de administração continuam exigindo administrador", () => {
  const raiz = join(RAIZ_ROTAS, "cop2026/admin");
  const abertas = [];
  const varrer = (dir, prefixo) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const rota = `${prefixo}/${item.name}`;
      const pagina = join(dir, item.name, "page.tsx");
      // A Planilha de Lançamentos é a exceção deliberada, testada acima.
      if (existsSync(pagina) && rota !== "/cop2026/admin/lancamentos") {
        if (!readFileSync(pagina, "utf8").includes("exigirAdminCop")) abertas.push(rota);
      }
      varrer(join(dir, item.name), rota);
    }
  };
  varrer(raiz, "/cop2026/admin");
  if (!readFileSync(join(raiz, "page.tsx"), "utf8").includes("exigirAdminCop")) {
    abertas.push("/cop2026/admin");
  }

  assert.deepEqual(
    abertas,
    [],
    `tela(s) de administração sem exigirAdminCop: ${abertas.join(", ")}.`
  );
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
