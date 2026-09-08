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
]);

/**
 * Como uma rota pode provar que confere acesso. `prepararExportacao` entra
 * porque é o guarda compartilhado do PDF/PNG: ele chama `sessaoCop()` por dentro
 * — a checagem é indireta, mas é checagem.
 */
const GUARDAS = [
  "exigirAdminCop",
  "exigirAcessoCop",
  "sessaoCop",
  "prepararExportacao",
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
