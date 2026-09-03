/**
 * Rede contra a classe de bug que o Comando leu na tela em 03/09/2026, entre
 * 01h00 e 01h16, com o briefing executivo projetado:
 *
 *  - a capa anunciava "54 dias restantes" e o alerta, dois cliques adiante,
 *    "Faltam 855 evidências em 27 dias". Os dois números estavam certos; o que
 *    estava errado era o substantivo. O velocímetro recebia `turnosRestantes`
 *    (54 turnos-fração) do briefing e `janela.diasRestantes` (27) do dashboard
 *    na MESMA prop, e imprimia os dois sob o rótulo "dias restantes".
 *
 *  - o ritmo de recuperação (855 ÷ 27 = 31,67) saía com `Math.ceil` no briefing
 *    e no veredito — virava 32 — enquanto a faixa de ritmos mostrava 31,67. Como
 *    o ritmo-ALVO do mês é exatamente 960 ÷ 30 = 32,00, o arredondamento fazia
 *    recuperação e alvo colidirem no mesmo "32", e a tela mandava acelerar para
 *    o passo que já estava sendo praticado.
 *
 * Desde 03/09/2026 a régua de apresentação tem fonte única em
 * `lib/cop2026-tendencia.ts`. Este teste afirma o comportamento da régua E
 * varre as superfícies procurando quem voltou a formatar por conta própria —
 * porque o defeito não foi de conta, foi de cada tela ter a sua régua.
 *
 *   npm run verificar:unidades
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  FMT_CONTAGEM,
  FMT_RITMO,
  fmtDias,
  fmtPorDia,
  fmtPorTurno,
  fmtRitmo,
  fmtTurnos,
} from "@/lib/cop2026-tendencia";

// ---------------------------------------------------------------------------
// 1 · A régua em si
// ---------------------------------------------------------------------------

test("ritmo sai com duas casas e nunca arredonda para cima", () => {
  // O caso real de 03/09: faltavam 855 evidências em 27 dias.
  assert.equal(fmtRitmo(855 / 27), "31,67");
  // E o ritmo-alvo do mês, que o Comando lê na linha de cima.
  assert.equal(fmtRitmo(960 / 30), "32,00");
  // A razão de existir da régua: os dois têm de ser distinguíveis na tela.
  assert.notEqual(fmtRitmo(855 / 27), fmtRitmo(960 / 30));
});

test("ritmo carrega a sua unidade — Batalhão por dia, fração por turno", () => {
  assert.equal(fmtPorDia(855 / 27), "31,67/dia");
  assert.equal(fmtPorTurno(195 / 60), "3,25/turno");
});

test("ritmo degrada para 0,00 em vez de NaN", () => {
  assert.equal(fmtRitmo(Number.NaN), "0,00");
  assert.equal(fmtRitmo(Number.POSITIVE_INFINITY), "0,00");
  assert.equal(fmtRitmo(0 / 0), "0,00");
});

test("dia e turno-fração nunca se confundem: cada contagem leva o seu substantivo", () => {
  assert.equal(fmtDias(27), "27 dias");
  assert.equal(fmtDias(1), "1 dia");
  assert.equal(fmtDias(0), "0 dias");
  assert.equal(fmtTurnos(54), "54 turnos-fração");
  assert.equal(fmtTurnos(1), "1 turno-fração");
  // 27 dias e 54 turnos-fração são o MESMO período. Formatados, não se parecem.
  assert.notEqual(fmtDias(27), fmtTurnos(27 * 2));
});

test("contagem não aceita negativo nem fração de dia", () => {
  assert.equal(fmtDias(-3), "0 dias");
  assert.equal(fmtDias(2.4), "2 dias");
  assert.equal(fmtTurnos(-1), "0 turnos-fração");
});

test("os dois formatadores da régua são pt-BR e não colidem", () => {
  assert.equal(FMT_RITMO.format(1234.5), "1.234,50");
  assert.equal(FMT_CONTAGEM.format(1234.5), "1.235");
});

// ---------------------------------------------------------------------------
// 2 · Varredura das superfícies — quem voltou a ter régua própria
// ---------------------------------------------------------------------------

const RAIZES = ["app", "components", "lib"];
const REGUA = join("lib", "cop2026-tendencia.ts");

function fontes() {
  const achados = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir)) {
      if (nome === "node_modules" || nome.startsWith(".")) continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.(ts|tsx)$/.test(caminho)) achados.push(caminho);
    }
  };
  for (const r of RAIZES) andar(r);
  return achados;
}

/** Só as superfícies da COP: o resto do portal tem outro vocabulário. */
const ehCop = (caminho) => /cop2026|publico16|\bcop\b/i.test(caminho);

/**
 * Apaga o conteúdo dos comentários preservando as quebras de linha — a varredura
 * é sobre CÓDIGO, e este repositório documenta cada bug no comentário acima da
 * correção. Sem isto, a própria explicação de "54 dias restantes" reprovaria o
 * build que a corrigiu.
 */
function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes) => antes + " ".repeat(m.length - antes.length));
}

/** Linhas de código (1-indexadas), já sem comentário. */
function linhasDeCodigo(caminho) {
  return semComentarios(readFileSync(caminho, "utf8")).split("\n");
}

const ARQUIVOS = fontes();

test("nenhuma superfície arredonda ritmo para cima", () => {
  const culpados = [];
  for (const caminho of ARQUIVOS) {
    const linhas = linhasDeCodigo(caminho);
    linhas.forEach((linha, i) => {
      if (/Math\.(ceil|round)\s*\(\s*[^)]*ritmo/i.test(linha)) {
        culpados.push(`${caminho}:${i + 1}  ${linha.trim()}`);
      }
    });
  }
  assert.deepEqual(
    culpados,
    [],
    "Ritmo é taxa, não contagem: use fmtRitmo/fmtPorDia/fmtPorTurno de " +
      "lib/cop2026-tendencia.ts.\n" +
      culpados.join("\n")
  );
});

test("nenhuma contagem de turno-fração é impressa sob a palavra 'dia'", () => {
  const culpados = [];
  for (const caminho of ARQUIVOS) {
    if (!ehCop(caminho)) continue;
    const linhas = linhasDeCodigo(caminho);
    linhas.forEach((linha, i) => {
      if (/turnos?(Fracao)?(Restantes|Decorridos|Cumpridos)/i.test(linha) && /\bdias?\b/i.test(linha)) {
        culpados.push(`${caminho}:${i + 1}  ${linha.trim()}`);
      }
    });
  }
  assert.deepEqual(
    culpados,
    [],
    "Turno-fração são 2 por dia. Para contagem de tempo em dias use " +
      "janela.diasRestantes + fmtDias; para turnos, fmtTurnos.\n" +
      culpados.join("\n")
  );
});

test("a régua de ritmo existe em um lugar só", () => {
  const culpados = [];
  for (const caminho of ARQUIVOS) {
    if (!ehCop(caminho) || caminho === REGUA) continue;
    const texto = semComentarios(readFileSync(caminho, "utf8"));
    if (/new Intl\.NumberFormat\([^)]*minimumFractionDigits:\s*2/s.test(texto)) {
      culpados.push(caminho);
    }
  }
  assert.deepEqual(
    culpados,
    [],
    `Importe FMT_RITMO de ${REGUA} em vez de criar outro formatador de duas casas.\n` +
      culpados.join("\n")
  );
});

test("nenhuma superfície escreve 'dia(s)' à mão", () => {
  const culpados = [];
  for (const caminho of ARQUIVOS) {
    if (!ehCop(caminho)) continue;
    const linhas = linhasDeCodigo(caminho);
    linhas.forEach((linha, i) => {
      if (/\bdia\(s\)|\bturno\(s\)/.test(linha)) culpados.push(`${caminho}:${i + 1}  ${linha.trim()}`);
    });
  }
  assert.deepEqual(
    culpados,
    [],
    "Plural resolvido na régua: fmtDias / fmtTurnos.\n" + culpados.join("\n")
  );
});
