#!/usr/bin/env node
/**
 * Guarda de dado pessoal do painel COP 2026.
 *
 * A tela "Visão geral" da plataforma Motorola identifica o dono da câmera como
 * `13934852785 (SOLDADO PM 231936 FABRICIO -16BPMM)`: os 11 dígitos da frente
 * são CPF. Auditor que copia esse bloco cola o CPF de um TERCEIRO no campo de
 * ID — e de lá o dado seguia para a tabela do painel, para o relatório impresso
 * e para o CSV que `lancamentosParaCsv` descreve como "anexo de processo".
 *
 * Levantamento na planilha em 31/08/2026: 31 células com CPF, de 16 pessoas
 * distintas, todas nas seis colunas de ID e em nenhuma outra coluna.
 *
 * Este script trava a regressão de duas formas:
 *   1. exercita `redigirCpf` contra os casos reais que foram encontrados;
 *   2. varre o código atrás de saída que monte `idsMidia` sem passar por ela.
 *
 * Roda com: node scripts/verificar-dado-pessoal-cop.mjs
 */
import { readFileSync } from "node:fs";

const falhas = [];

// ---------------------------------------------------------------------------
// 1. A função faz o que promete
// ---------------------------------------------------------------------------

/** Cópia fiel da regra de lib/cop2026.ts. Se as duas divergirem, o teste abaixo
 *  de "a fonte continua usando esta regra" acusa. */
const REGRA = /(?<!\d)\d{11}(?!\d)/g;
const redigir = (t) => String(t ?? "").replace(REGRA, "[CPF removido]");

/** Entradas colhidas da planilha real (agosto/2026) e da tela da plataforma. */
const CASOS = [
  // --- deve remover: CPF de terceiro ---
  { entrada: "260823 - CPF:42668937876", limpo: true, nota: "CPF rotulado, colado no campo de ID" },
  { entrada: "20260809 CPF 46805950864", limpo: true, nota: "CPF sem dois-pontos" },
  { entrada: "13934852785 (SOLDADO PM 231936 FABRICIO -16BPMM)", limpo: true, nota: "bloco Operador copiado inteiro da plataforma" },
  { entrada: "20260825555", limpo: true, nota: "11 dígitos: indistinguível de CPF, e é lixo de qualquer forma" },

  // --- NÃO pode remover: são o dado que o Comando precisa enxergar ---
  { entrada: "044f5fd643c7401b06503db90c67a3dc", limpo: false, nota: "ID da mídia (32 hex)" },
  { entrada: "2df795bc-e91e-41ce-819e-95e0f88f0ab6", limpo: false, nota: "ID da gravação (UUID)" },
  { entrada: "https://cop.pmesp.br.evm.online/app/videos/4710984476/info", limpo: false, nota: "ID de página tem 10 dígitos" },
  { entrada: "20260824916201", limpo: false, nota: "número solto de 14 dígitos: lixo visível, a ser cobrado" },
  { entrada: "202608246583", limpo: false, nota: "número solto de 12 dígitos" },
  { entrada: "202608298084", limpo: false, nota: "a string do incidente de 29/08, que migrou para a coluna de ID" },
];

for (const caso of CASOS) {
  const saida = redigir(caso.entrada);
  const removeu = saida.includes("[CPF removido]");
  if (removeu !== caso.limpo) {
    falhas.push(
      caso.limpo
        ? `deixou passar CPF em "${caso.entrada}" (${caso.nota})`
        : `apagou dado legítimo em "${caso.entrada}" (${caso.nota}) → "${saida}"`
    );
  }
}

// Idempotência: o painel reprocessa a mesma leitura a cada visita.
const duasVezes = redigir(redigir("260823 - CPF:42668937876"));
if (duasVezes !== redigir("260823 - CPF:42668937876")) {
  falhas.push("redigirCpf não é idempotente — aplicar duas vezes muda o resultado");
}

// ---------------------------------------------------------------------------
// 2. A fonte continua canalizando idsMidia pela redação
// ---------------------------------------------------------------------------

const fonte = readFileSync(new URL("../lib/cop2026.ts", import.meta.url), "utf8");

if (!/export function redigirCpf/.test(fonte)) {
  falhas.push("lib/cop2026.ts não exporta mais redigirCpf");
}
if (!fonte.includes(String(REGRA).slice(1, -2))) {
  falhas.push("a regra de 11 dígitos mudou em lib/cop2026.ts sem atualizar este script");
}
// `idsMidia:` é montado num lugar só; se alguém abrir um segundo caminho sem a
// redação, é aqui que aparece. A declaração do tipo (`idsMidia: string;`) fica
// de fora — ela declara o campo, não o preenche.
for (const trecho of fonte.split(/\n(?=\s*idsMidia:)/).slice(1)) {
  const bloco = trecho.slice(0, 400);
  if (/^\s*idsMidia:\s*string\s*;/.test(bloco)) continue;
  if (!bloco.includes("redigirCpf")) {
    falhas.push("há uma montagem de idsMidia em lib/cop2026.ts que não passa por redigirCpf");
  }
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

if (falhas.length === 0) {
  console.log(`✓ Dado pessoal COP 2026 protegido (${CASOS.length} casos reais conferidos).`);
  process.exit(0);
}

console.error(`\n✗ ${falhas.length} falha(s) na guarda de dado pessoal:\n`);
for (const f of falhas) console.error(`  · ${f}`);
console.error("\nContexto: o campo Operador da plataforma Motorola começa com o CPF do dono da câmera.\n");
process.exit(1);
