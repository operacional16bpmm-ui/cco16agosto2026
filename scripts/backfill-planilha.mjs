/**
 * Importa UM MÊS do ciclo 2026 da planilha do Google para
 * `cop_auditoria_lancamento`. Nasceu como `backfill-agosto.mjs`, com o período
 * cravado no topo; virou por-mês em 02/09/2026, quando o Comando fechou o
 * Google Forms e setembro também precisou entrar.
 *
 *   npm run backfill -- --mes=agosto                 (padrão: NÃO grava)
 *   npm run backfill -- --mes=setembro --gravar      grava via service key
 *   npm run backfill -- --mes=agosto --sql=/tmp/a.sql  emite SQL, não conecta
 *
 * O período NUNCA é digitado aqui: vem de `RELATORIOS_MENSAIS`
 * (lib/cop2026-relatorios.ts), a mesma fonte que recorta o painel, o briefing e
 * os relatórios. Mês novo = uma linha lá, não uma cópia deste arquivo.
 *
 * DOIS CAMINHOS DE ESCRITA, e o segundo existe por um motivo concreto: a
 * `SUPABASE_SERVICE_ROLE_KEY` está marcada como sensível na Vercel e não é
 * legível nem por quem opera o deploy. `--sql` gera o arquivo para ser aplicado
 * pelo console do Supabase (ou pelo MCP) sem que a chave passe por lugar
 * nenhum. Os dois produzem exatamente os mesmos registros.
 *
 * TRÊS REGRAS QUE NÃO SE NEGOCIAM
 *
 * 1. **Importar cru, classificar, nunca reparar.** Toda célula vai para
 *    `bruto` como está, com `tipo='desconhecido'` quando não casa. Não
 *    descartar, não "normalizar" `20260824916201` em coisa nenhuma: os 43,1%
 *    de lixo SÃO o achado da auditoria, e consertá-los na importação apagaria
 *    a única prova de que o problema existe.
 *
 * 2. **O mês importado vale pela quantidade DECLARADA.** `videos_declarados` recebe o
 *    que o painel já conta hoje. Recalcular agosto pelos identificadores
 *    derrubaria o número em ~60% de uma vez — de 604 para 229 —, o painel do
 *    Major atravessaria duas faixas de classificação e pareceria colapso do
 *    Batalhão, quando o que mudou foi só a régua. As outras duas colunas são
 *    gravadas junto, para o dia em que o Comando decidir virar a chave.
 *
 * 3. **Congelar a fonte.** O CSV lido é salvo em disco com o seu sha256 antes
 *    de qualquer escrita. A planilha publicada já foi restringida uma vez
 *    (26/08/2026) e pode ser despublicada; sem o arquivo e o hash, "agosto está
 *    congelado" é afirmação que não se prova.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { extrairLancamentos, chaveSubunidade } from "../lib/cop2026.ts";
import { parseCsv } from "../lib/inventario-2026.ts";
import {
  chaveDedup,
  lerEvidencias,
  normalizarRe,
} from "../lib/cop2026-lancamento.ts";
import { RELATORIOS_MENSAIS, relatorioPorChave } from "../lib/cop2026-relatorios.ts";

/* ------------------------------------------------------------------ opções */

const GRAVAR = process.argv.includes("--gravar");
const ARQUIVO_SQL = (process.argv.find((a) => a.startsWith("--sql=")) ?? "").slice(6);
const CHAVE_MES = (process.argv.find((a) => a.startsWith("--mes=")) ?? "").slice(6);

const MES = relatorioPorChave(CHAVE_MES);
if (!MES) {
  console.error(
    `--mes= obrigatório. Meses do ciclo: ${RELATORIOS_MENSAIS.map((m) => m.chave).join(", ")}`
  );
  process.exit(1);
}
const PERIODO_DE = MES.periodo.de;
const PERIODO_ATE = MES.periodo.ate;
const PASTA_CONGELAMENTO = resolve(process.cwd(), "supabase/congelado");

/** Literal SQL — aspas simples dobradas, `null` sem aspas. Só o `--sql` usa;
 *  o caminho do service role manda objeto e o driver parametriza. */
const sql = (v) =>
  v === null || v === undefined
    ? "null"
    : typeof v === "boolean" || typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

/* Mesmas rotas de lib/cop2026-leitura.ts. Duplicadas aqui de propósito: este
   script roda em `node`, fora do Next, e importar aquele módulo traria o
   `after` do next/server junto. */
const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
const URLS = [
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=305359783&single=true&output=csv`,
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?output=csv`,
];

async function baixarCsv() {
  const falhas = [];
  for (const url of URLS) {
    try {
      const resposta = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const texto = await resposta.text();
      if (texto.trimStart().startsWith("<")) throw new Error("veio HTML de login");
      // A aba de respostas sempre abre pelo carimbo do Forms. Sem esta guarda,
      // a rota sem gid poderia trazer a aba Parametros calada.
      if (!/^carimbo/i.test(texto.trimStart())) throw new Error("não é a aba de respostas");
      return { texto, url };
    } catch (erro) {
      falhas.push(`${url.slice(0, 60)}…: ${erro.message}`);
    }
  }
  throw new Error(`Nenhuma rota da planilha respondeu.\n  ${falhas.join("\n  ")}`);
}

/* ------------------------------------------------------------------ main */

const { texto, url } = await baixarCsv();
const sha = createHash("sha256").update(texto).digest("hex");

mkdirSync(PASTA_CONGELAMENTO, { recursive: true });
const arquivo = resolve(PASTA_CONGELAMENTO, `respostas-${MES.chave}-${MES.ano}-${sha.slice(0, 12)}.csv`);
writeFileSync(arquivo, texto, "utf-8");

console.log(`Fonte congelada: ${arquivo}`);
console.log(`  origem: ${url}`);
console.log(`  sha256: ${sha}`);

const linhas = parseCsv(texto);
const todos = extrairLancamentos(linhas);

/* O `id` de LancamentoCop é o índice dentro do array já filtrado por
   extrairLancamentos (linhas totalmente vazias saem). Para o número da linha na
   planilha valer como referência humana, soma-se o cabeçalho e as duas linhas
   vazias que o Forms deixa: as respostas começam na linha 4. */
const doPeriodo = todos.filter((l) => l.data >= PERIODO_DE && l.data <= PERIODO_ATE);

console.log(
  `\nPlanilha: ${todos.length} lançamentos; ${doPeriodo.length} dentro de ${MES.rotulo}/${MES.ano}.`
);

const semData = todos.length - doPeriodo.length;
if (semData > 0) {
  console.log(`  ${semData} fora do período ou sem data legível — NÃO importados.`);
}

/* --------------------------------------------------------------- preparo */

const registros = [];
const contagem = { midia: 0, gravacao: 0, pagina: 0, desconhecido: 0 };
let declarados = 0;
let contadosTotal = 0;
let validosTotal = 0;

for (const l of doPeriodo) {
  const re = normalizarRe(l.re);
  if (re.base.length < 6) {
    console.log(`  ! linha sem RE legível (${l.data} ${l.nomeGuerra}) — importada como 000000`);
  }

  const campos = String(l.idsMidia ?? "")
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);
  const { evidencias, recusas, duplicadasNoEnvio } = lerEvidencias(campos);

  for (const e of evidencias) contagem[e.tipo] += 1;
  contagem.desconhecido += recusas.length;

  const validos = evidencias.filter((e) => e.tipo === "midia" || e.tipo === "gravacao").length;
  declarados += l.auditou ? l.videos : 0;
  contadosTotal += evidencias.length;
  validosTotal += validos;

  // O hash é da linha CRUA reconstituída — o que veio da planilha, não o que
  // interpretamos dela. Interpretação muda de versão para versão; a linha, não.
  const hashLinha = createHash("sha256")
    .update([l.data, l.turno, l.re, l.enviadoEm, l.idsMidia, String(l.videos)].join(""))
    .digest("hex");

  registros.push({
    lancamento: {
      data_auditoria: l.data,
      hora: l.hora || null,
      turno: l.turno || "Não informado",
      re: re.canonico || l.re || "000000",
      re_base: re.base.length === 6 ? re.base : "000000",
      nome_guerra: l.nomeGuerra,
      posto: l.posto,
      funcao: l.funcao,
      // A subunidade importada vem da planilha (o auditor a declarava). Não é
      // derivada do RE como nos lançamentos novos: reclassificar o mês agora
      // mudaria o ranking já apresentado ao Comando.
      subunidade: chaveSubunidade(l.subunidade) || "outros",
      auditou: l.auditou,
      videos_declarados: l.auditou ? l.videos : 0,
      videos_contados: evidencias.length,
      videos_validos: validos,
      numero_parte: l.numeroParte || null,
      justificativa: l.justificativa || null,
      origem: "planilha",
      chave_dedup: chaveDedup(re.base, l.data, l.turno),
      vinculo_pendente: false,
      retroativo: false,
      payload_bruto: {
        hashLinha,
        linhaOrigem: l.id + 4,
        importadoEm: new Date().toISOString(),
        fonteSha256: sha,
        criterio: "declarado",
        recusas: recusas.map((r) => ({ bruto: r.bruto, motivo: r.motivo })),
        duplicadasNoEnvio,
      },
      criado_por_email: `backfill-${MES.chave}`,
    },
    evidencias: evidencias.map((e, i) => ({
      posicao: i + 1,
      bruto: e.bruto,
      tipo: e.tipo,
      id_midia: e.idMidia,
      id_gravacao: e.idGravacao,
      id_pagina: e.idPagina,
      re_auditor_base: re.base.length === 6 ? re.base : "000000",
    })),
  });
}

console.log(`\nClassificação dos identificadores de ${MES.rotulo}:`);
const totalIds = Object.values(contagem).reduce((a, b) => a + b, 0);
for (const [tipo, n] of Object.entries(contagem)) {
  const pct = totalIds ? ((n / totalIds) * 100).toFixed(1) : "0.0";
  console.log(`  ${tipo.padEnd(13)} ${String(n).padStart(4)}  ${pct}%`);
}

console.log(`\nAs três réguas do mesmo ${MES.rotulo}:`);
console.log(`  A · declarado ....... ${declarados}`);
console.log(`  B · identificadores . ${contadosTotal}`);
console.log(`  C · formato válido .. ${validosTotal}`);
console.log(
  `  (o número OFICIAL de ${MES.rotulo} é o A — ver regra 2 no cabeçalho deste script)`
);

/* Duplicatas DENTRO da própria planilha: o índice único vai recusá-las, e é
   melhor saber disso antes de gravar do que no meio da execução. */
const chaves = new Map();
for (const r of registros) {
  const c = r.lancamento.chave_dedup;
  chaves.set(c, (chaves.get(c) ?? 0) + 1);
}
const repetidas = [...chaves.entries()].filter(([, n]) => n > 1);
if (repetidas.length > 0) {
  console.log(`\n! ${repetidas.length} chave(s) re|data|turno repetidas na própria planilha:`);
  for (const [c, n] of repetidas.slice(0, 10)) console.log(`    ${c} ×${n}`);
  // Desde a migration 028 a `chave_dedup` NÃO é mais única (dois turnos do
  // mesmo RE no mesmo dia são legítimos). Quem barra reimportação é o índice
  // único do `hashLinha`, e ele distingue estas linhas: todas entram.
  console.log("  Repetição legítima (mesmo RE, mesmo dia) — todas entram; o hash da linha é que dedupe.");
}

/* --------------------------------------------------------- saída em SQL */

if (ARQUIVO_SQL) {
  /* Um bloco por lançamento: o CTE insere o lançamento e as evidências saem
     penduradas no id recém-criado. `on conflict do nothing` nas duas pontas
     torna o arquivo reexecutável — mesma idempotência do caminho do driver. */
  const partes = [
    `-- Backfill ${MES.rotulo}/${MES.ano} — ${registros.length} lançamentos`,
    `-- Fonte: ${arquivo}`,
    `-- sha256: ${sha}`,
    "begin;",
  ];

  const COLS = [
    "data_auditoria", "hora", "turno", "re", "re_base", "nome_guerra", "posto",
    "funcao", "subunidade", "auditou", "videos_declarados", "videos_contados",
    "videos_validos", "numero_parte", "justificativa", "origem", "chave_dedup",
    "vinculo_pendente", "retroativo", "payload_bruto", "criado_por_email",
  ];

  for (const r of registros) {
    const l = r.lancamento;
    const valores = COLS.map((c) =>
      c === "payload_bruto" ? `${sql(JSON.stringify(l[c]))}::jsonb` : sql(l[c])
    ).join(", ");

    if (r.evidencias.length === 0) {
      partes.push(
        `insert into public.cop_auditoria_lancamento (${COLS.join(", ")})\n` +
          `values (${valores}) on conflict do nothing;`
      );
      continue;
    }

    const linhasEvid = r.evidencias
      .map(
        (e) =>
          `    (${sql(e.posicao)}, ${sql(e.bruto)}, ${sql(e.tipo)}, ${sql(e.id_midia)}, ` +
          `${sql(e.id_gravacao)}::uuid, ${sql(e.id_pagina)}::bigint, ${sql(e.re_auditor_base)})`
      )
      .join(",\n");

    partes.push(
      `with novo as (\n` +
        `  insert into public.cop_auditoria_lancamento (${COLS.join(", ")})\n` +
        `  values (${valores}) on conflict do nothing returning id\n` +
        `)\n` +
        `insert into public.cop_evidencia\n` +
        `  (lancamento_id, posicao, bruto, tipo, id_midia, id_gravacao, id_pagina, re_auditor_base)\n` +
        `select novo.id, v.* from novo, (values\n${linhasEvid}\n` +
        `) as v(posicao, bruto, tipo, id_midia, id_gravacao, id_pagina, re_auditor_base)\n` +
        `on conflict do nothing;`
    );
  }

  partes.push("commit;");
  writeFileSync(ARQUIVO_SQL, partes.join("\n\n"), "utf-8");
  console.log(`\nSQL escrito em ${ARQUIVO_SQL} (${registros.length} lançamentos). Nada foi gravado daqui.`);
  process.exit(0);
}

if (!GRAVAR) {
  console.log("\n--dry-run (padrão): nada foi gravado. Use --gravar para importar.");
  process.exit(0);
}

/* ---------------------------------------------------------------- gravação */

const url_supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url_supabase || !chave) {
  console.error("\nFaltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(url_supabase, chave, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let gravados = 0;
let jaExistiam = 0;
let falhas = 0;

for (const r of registros) {
  const { data, error } = await db
    .from("cop_auditoria_lancamento")
    .insert(r.lancamento)
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation: já importado (hash de linha ou chave de dedup).
    if (error.code === "23505") jaExistiam += 1;
    else {
      falhas += 1;
      console.error(`  x ${r.lancamento.data_auditoria} ${r.lancamento.re}: ${error.message}`);
    }
    continue;
  }

  if (r.evidencias.length > 0) {
    const { error: erroEvid } = await db
      .from("cop_evidencia")
      .insert(r.evidencias.map((e) => ({ ...e, lancamento_id: data.id })));
    if (erroEvid) {
      // Replay real medido em agosto: 24 identificadores se repetem, um deles 6 vezes.
      // O lançamento fica; a evidência colidida não entra e o motivo aparece.
      console.error(
        `  ~ ${r.lancamento.data_auditoria} ${r.lancamento.re}: evidências recusadas (${erroEvid.code}) — ${erroEvid.message}`
      );
    }
  }
  gravados += 1;
}

console.log(`\nGravados: ${gravados} · já existiam: ${jaExistiam} · falhas: ${falhas}`);
console.log("Rode de novo: o total tem que ficar idêntico (idempotência pelo hash da linha).");
