#!/usr/bin/env node
/**
 * Guarda das superfícies: o IDENTIFICADOR não volta às telas de desempenho.
 *
 * Decisão de Comando de 07/09/2026 — vale a quantidade DECLARADA, e o
 * identificador de mídia não reprova ninguém. A apuração vive num lugar só,
 * `/cop2026/admin/divergencias`.
 *
 * POR QUE ESTE GATE EXISTE, e não é zelo excessivo: a remoção de 07/09 passou
 * ao largo de QUATRO superfícies e ninguém percebeu — `tsc` limpo, nove gates
 * verdes, `/api/cop2026/saude` com `status: ok` e o deploy no ar. O que ficou:
 * um segundo cartão nominal no mesmo arquivo do dashboard, o parser aceitando
 * `?excecao=idinvalido` (link salvo reativava o julgamento), o painel de saúde
 * pintando os indicadores de laranja, e o texto que entra no PDF/PNG.
 *
 * A razão é estrutural: `verificar:excecoes` trava o NÚMERO (`totalPendencia`),
 * e nenhum gate olhava se um cartão sumiu da TELA. Remoção parcial de UI passava
 * por toda a suíte. Este script fecha essa classe.
 */
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

/** As listas nominais de divergência de identificador. Onde elas aparecem, a
 *  tela está julgando alguém pelo ID. */
const LISTAS = ["semIdsLista", "idInvalidoLista", "duplicadoLista"];

/** Superfícies de DESEMPENHO — o que o Comando e a tropa leem. Nenhuma delas
 *  pode nomear auditor por identificador. */
const PROIBIDO = [
  "components/publico16/cop/dashboard-cop.tsx",
  "components/publico16/briefing-slides.tsx",
  "components/publico16/cop/briefing-documento.tsx",
  "components/publico16/cop/relatorio-executivo.tsx",
  "components/publico16/cop/relatorio-dados-documento.tsx",
];

/** O único lugar onde a apuração pode viver. Se sumir daqui, a decisão virou
 *  "esconder o problema" em vez de "tirar da tela de desempenho". */
const OBRIGATORIO = "app/(public)/cop2026/admin/divergencias/page.tsx";

/** Chaves de filtro por identificador. Aceitas no parser, um link salvo
 *  (`?excecao=idinvalido`) traz o julgamento de volta pela porta dos fundos. */
const CHAVES_DE_FILTRO = ['"semids"', '"idinvalido"', '"duplicado"'];

const ler = (caminho) => (existsSync(caminho) ? readFileSync(caminho, "utf8") : null);

test("nenhuma tela de desempenho lista auditor por identificador", () => {
  for (const arquivo of PROIBIDO) {
    const fonte = ler(arquivo);
    assert.ok(fonte !== null, `superfície sumiu do projeto: ${arquivo}`);
    for (const lista of LISTAS) {
      assert.ok(
        !fonte.includes(lista),
        `${arquivo} voltou a usar \`${lista}\`. A decisão de Comando de 07/09/2026 tirou o ` +
          `identificador das telas de desempenho — a lista nominal vive só em ${OBRIGATORIO}.`
      );
    }
  }
});

test("a apuração continua existindo na tela de divergências", () => {
  const fonte = ler(OBRIGATORIO);
  assert.ok(fonte !== null, `a tela de divergências sumiu: ${OBRIGATORIO}`);
  for (const lista of LISTAS) {
    assert.ok(
      fonte.includes(lista),
      `${OBRIGATORIO} deixou de mostrar \`${lista}\`. Tirar o identificador da tela de ` +
        `desempenho não é apagar a apuração: sem esta tela, ninguém cobra correção.`
    );
  }
});

test("o filtro público não aceita exceção por identificador", () => {
  const fonte = ler("lib/cop2026-metricas.ts");
  assert.ok(fonte !== null, "lib/cop2026-metricas.ts sumiu");
  /* Só o tipo e o parser de `Filtros.excecao` interessam — o resto do arquivo
     pode citar as palavras em comentário, e comentário não filtra nada. */
  const trecho = fonte.slice(0, fonte.indexOf("export function aplicarFiltros"));
  for (const chave of CHAVES_DE_FILTRO) {
    assert.ok(
      !trecho.includes(`| ${chave}`) && !trecho.includes(`${chave},`),
      `\`Filtros.excecao\` voltou a aceitar ${chave}. Um link salvo com ` +
        `\`?excecao=idinvalido\` reativa na tela o julgamento que a decisão aboliu.`
    );
  }
});

test("o texto exportado no PDF/PNG não cita o ID como motivo de pendência", () => {
  const fonte = ler("components/publico16/briefing-slides.tsx");
  assert.ok(fonte !== null, "briefing-slides.tsx sumiu");
  /* O parágrafo que o puppeteer captura descreve a metodologia do número de
     pendências. Ele já afirmou uma regra que o cálculo não seguia. */
  assert.ok(
    !/não informou o ID|não informou o identificador/i.test(fonte),
    "o texto do briefing exportado voltou a dizer que sem-ID é motivo de pendência. " +
      "`temPendencia` conta só quem não auditou ou ficou abaixo do mínimo."
  );
});
