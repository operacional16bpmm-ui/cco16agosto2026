#!/usr/bin/env node
/**
 * Guarda de vocabulário do painel COP 2026.
 *
 * Termos vetados pelo Comando voltaram ao site três vezes em rodadas diferentes,
 * sempre porque uma tela nova foi escrita sem saber da decisão. Este script
 * transforma a decisão em falha de CI: `npm run verificar:vocabulario`.
 *
 * O contrato está em docs/cop2026-padroes-comando.md — se um termo mudar lá,
 * muda aqui junto.
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** Só as superfícies do COP. O resto do portal fala outra língua e não é aqui
 *  que se resolve isso. */
const ESCOPO = [
  "app/(public)/cop2026",
  "app/(command)/auditoria-cop",
  "components/publico16",
  "lib/cop2026.ts",
  "lib/cop2026-metricas.ts",
  "lib/cop2026-acesso.ts",
  // Entraram com o formulário próprio (01/09/2026): a rota de lançamento fala
  // com a tropa e é a superfície mais nova a herdar o vocabulário do Comando.
  "lib/cop2026-lancamento.ts",
  "lib/db/cop2026-lancamentos.ts",
  "lib/db/cop2026-auditor.ts",
  "lib/db/cop2026-parametros.ts",
];

/** Arquivos que citam fonte externa (boletim, pesquisa acadêmica) e por isso
 *  guardam o termo histórico de propósito. Documentado no §1 do padrão. */
const ISENTOS = new Set([
  "lib/dados-16bpmm.ts",
  "lib/dados-boletins.ts",
]);

const REGRAS = [
  {
    termo: /sala\s+de\s+controle\s+operacional/i,
    correcao: "AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
    motivo: "confundia o público com a sala de operações real do Batalhão",
  },
  {
    termo: /c[âa]mera[s]?\s+(operaciona\w*\s+)?port[áa]t/i,
    correcao: "câmeras operacionais corporais",
    motivo: "nomenclatura vigente; vale inclusive em alt= de imagem",
  },
  {
    termo: /em\s+atingimento/i,
    correcao: "Faixa de Atenção da Meta / Cumprimento Insuficiente",
    motivo: "rótulo renomeado na parametrização semântica das faixas",
  },
  {
    termo: /\b\d+\s+companhias\b/i,
    correcao: "frações / subunidades",
    motivo: "o Estado-Maior não é companhia, então a contagem fica errada",
  },
];

/** "Manômetro" continua legítimo em comentário de código (é o nome do widget
 *  na cabeça de quem mantém); o veto é para texto que a tropa lê. Por isso a
 *  regra só olha linha que não começa com marcador de comentário. */
const REGRA_MANOMETRO = {
  termo: /man[óô]metro/i,
  correcao: "Conformidade e Ritmo da Gestão Operacional da Meta",
  motivo: "vetado em texto de tela — 'a tropa vai zoar e fazer piada'",
  soVisivel: true,
};

const ehComentario = (linha) => /^\s*(\/\/|\*|\/\*|\{\s*\/\*)/.test(linha);

/**
 * O que está NO DISCO, não o que o git conhece.
 *
 * `git ls-files` sozinho falhava dos dois lados: engasgava com arquivo apagado
 * mas ainda não commitado (as rotas /dashboard/v2 e /v3, em 01/09/2026, mataram
 * a verificação com ENOENT) e — pior, porque é silencioso — pulava arquivo novo
 * ainda não rastreado. A rota de lançamento inteira, a superfície mais nova a
 * falar com a tropa, passou dias fora da guarda por isso. `--others
 * --exclude-standard` traz os não rastreados respeitando o .gitignore, e o
 * filtro de existência resolve o outro lado.
 */
function arquivosDoEscopo() {
  const saida = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...ESCOPO],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
  return [...new Set(saida.split("\0"))]
    .filter((f) => /\.(tsx?|mdx?)$/.test(f))
    .filter((f) => !ISENTOS.has(f))
    .filter((f) => existsSync(f));
}

const achados = [];
for (const arquivo of arquivosDoEscopo()) {
  const linhas = readFileSync(arquivo, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    for (const regra of [...REGRAS, REGRA_MANOMETRO]) {
      if (regra.soVisivel && ehComentario(linha)) continue;
      if (regra.termo.test(linha)) {
        achados.push({ arquivo, linha: i + 1, texto: linha.trim(), regra });
      }
    }
  });
}

if (achados.length === 0) {
  console.log("✓ Vocabulário COP 2026 íntegro.");
  process.exit(0);
}

console.error(`\n✗ ${achados.length} ocorrência(s) de termo vetado pelo Comando:\n`);
for (const a of achados) {
  console.error(`  ${a.arquivo}:${a.linha}`);
  console.error(`    ${a.texto.slice(0, 120)}`);
  console.error(`    → use "${a.regra.correcao}" (${a.regra.motivo})\n`);
}
console.error("Contrato completo: docs/cop2026-padroes-comando.md\n");
process.exit(1);
