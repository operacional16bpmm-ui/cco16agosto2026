/**
 * Verificação do motor de tendência da COP 2026.
 *
 *   node --test scripts/verificar-tendencia-cop.mjs
 *
 * É .mjs, e não .ts, pelo mesmo motivo de verificar-vocabulario-cop.mjs: o
 * tsconfig do app inclui `**\/*.ts` e um script de apoio que importa com
 * extensão explícita derruba o type-check do build.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularTendencia,
  diasDoMes,
  gini,
  indiceEquilibrio,
  progressoDoMes,
  ratearMeta,
  turnosDoMes,
  metaDeAmanha,
  curvaPlanoRealizado,
} from "../lib/cop2026-tendencia.ts";

const perto = (a, b, tol = 0.01) =>
  assert.ok(Math.abs(a - b) <= tol, `esperado ~${b}, veio ${a}`);

/** Pesos oficiais da Matriz Proporcional 2026 (somam 99,93%). */
const PESOS = { em: 5.0, "1cia": 20.32, "2cia": 18.74, "3cia": 21.9, "4cia": 18.74, ft: 15.23 };
/** Metas publicadas à tropa — não mudam no meio do mês. */
const METAS_PUBLICADAS = { em: 48, "1cia": 195, "2cia": 180, "3cia": 210, "4cia": 180, ft: 147 };

test("calendário: setembro tem 30 dias e 60 turnos-fração", () => {
  assert.equal(diasDoMes(2026, 9), 30);
  assert.equal(turnosDoMes(2026, 9), 60);
  assert.equal(turnosDoMes(2026, 10), 62); // outubro, 31 dias
  assert.equal(diasDoMes(2028, 2), 29); // bissexto
});

/* O contrato mudou em 02/09/2026 e este teste tinha ficado para trás: contar só
   dia ENCERRADO punha numerador de dois dias sobre denominador de um — "dia 1 de
   30" com "REAL 87,00/dia" e "Dias com lançamento: 2 de 1" na tela. O dia em
   curso conta; o déficit no começo da manhã é leitura verdadeira, e é para isso
   que existe a régua de trajetória. */
test("progresso conta o dia EM CURSO", () => {
  const p = progressoDoMes(new Date("2026-09-15T09:00:00Z"), 2026, 9);
  assert.equal(p.diasDecorridos, 15);
  assert.equal(p.turnosDecorridos, 30);
  assert.equal(p.turnosRestantes, 30);
  assert.equal(p.encerrado, false);
});

test("progresso antes e depois do mês não estoura", () => {
  const antes = progressoDoMes(new Date("2026-08-31T23:00:00Z"), 2026, 9);
  assert.equal(antes.turnosDecorridos, 0);
  assert.equal(antes.turnosRestantes, 60);

  const depois = progressoDoMes(new Date("2026-10-05T00:00:00Z"), 2026, 9);
  assert.equal(depois.turnosDecorridos, 60);
  assert.equal(depois.turnosRestantes, 0);
  assert.equal(depois.encerrado, true);
});

test("os três ritmos da 3ª Cia na metade do mês", () => {
  // meta 210 em 60 turnos; 28 turnos decorridos; produziu 60 evidências
  const t = calcularTendencia({ meta: 210, realizado: 60, turnosMes: 60, turnosDecorridos: 28 });
  perto(t.ritmoAlvo, 3.5); // 210/60
  perto(t.ritmoReal, 2.142); // 60/28
  perto(t.metaAcumulada, 98); // 3.5*28
  perto(t.saldoTrajetoria, -38); // déficit de trajetória
  perto(t.aderencia, 61.22);
  perto(t.ritmoRecuperacao, 4.6875); // 150/32
  perto(t.pressaoRecuperacao, 1.339); // exige 34% acima do normal
  assert.equal(t.situacao, "DEFICIT_SEVERO");
  assert.equal(t.irrecuperavel, false);
});

test("ágio: quem está adiantado aparece com saldo positivo", () => {
  const t = calcularTendencia({ meta: 147, realizado: 120, turnosMes: 60, turnosDecorridos: 28 });
  perto(t.metaAcumulada, 68.6);
  perto(t.saldoTrajetoria, 51.4);
  assert.equal(t.situacao, "ADIANTADA");
  assert.ok(t.aderencia > 170);
});

test("projeção de fechamento no ritmo atual", () => {
  const t = calcularTendencia({ meta: 210, realizado: 60, turnosMes: 60, turnosDecorridos: 28 });
  perto(t.projecaoFechamento, 128.57); // 2,142 × 60
  perto(t.projecaoPct, 61.22);
});

test("BORDA: mês encerrado não inventa ritmo de recuperação", () => {
  // a proposta original usava Math.max(1, restantes) e anunciaria "415/turno"
  const t = calcularTendencia({ meta: 960, realizado: 545, turnosMes: 60, turnosDecorridos: 60 });
  assert.equal(t.turnosRestantes, 0);
  assert.equal(t.ritmoRecuperacao, 0);
  assert.equal(t.deficit, 415);
  assert.equal(t.irrecuperavel, true);
});

test("BORDA: primeiro dia do mês não gera déficit fantasma nem NaN", () => {
  const t = calcularTendencia({ meta: 960, realizado: 0, turnosMes: 60, turnosDecorridos: 0 });
  assert.equal(t.ritmoReal, null);
  assert.equal(t.aderencia, null);
  assert.equal(t.projecaoFechamento, null);
  assert.equal(t.situacao, "NAO_AFERIVEL");
  assert.equal(t.saldoTrajetoria, 0);
  assert.ok(Number.isFinite(t.ritmoRecuperacao));
});

test("BORDA: status julga a TRAJETÓRIA, não o total do mês", () => {
  // 31% da meta no 5º dia é adiantado; a régua antiga pintaria de CRÍTICA
  const t = calcularTendencia({ meta: 195, realizado: 61, turnosMes: 60, turnosDecorridos: 8 });
  perto(t.cumprimento, 31.28);
  assert.equal(t.situacao, "ADIANTADA");
});

test("rateio pelo maior resto fecha o total exatamente", () => {
  const cotas = ratearMeta(960, PESOS);
  assert.equal(
    Object.values(cotas).reduce((s, v) => s + v, 0),
    960
  );
  // normaliza os 99,93%: nenhuma evidência se perde no arredondamento
  const cotas1000 = ratearMeta(1000, PESOS);
  assert.equal(
    Object.values(cotas1000).reduce((s, v) => s + v, 0),
    1000
  );
});

test("a matriz publicada já fecha 960 — não há deriva a corrigir", () => {
  assert.equal(
    Object.values(METAS_PUBLICADAS).reduce((s, v) => s + v, 0),
    960
  );
});

test("índice de equilíbrio flagra a assimetria FT × Cias", () => {
  const real = indiceEquilibrio([75, 31.3, 32.2, 28.6, 31.4, 186.4]);
  assert.equal(real.classe, "ASSIMETRIA_CRITICA");

  const parelho = indiceEquilibrio([98, 100, 102, 99, 101, 100]);
  assert.equal(parelho.classe, "EQUILIBRADO");
});

test("gini separa produção regular de compliance de última hora", () => {
  assert.equal(gini([25, 25, 25, 25]), 0);
  perto(gini([0, 0, 0, 100]), 0.75);
  assert.equal(gini([0, 0, 0, 0]), 0); // sem produção não é irregularidade
});

// ---------------------------------------------------------------------------
// Pedidos da Coordenadoria Operacional — 02/09/2026
// ---------------------------------------------------------------------------

test("alvo do dia seguinte embute a dívida, e não a média do que falta", () => {
  // 2ª Cia zerada no dia 2: cota 6/dia, dois dias de dívida = 12.
  const a = metaDeAmanha({ meta: 180, realizado: 0, turnosMes: 30, turnosDecorridos: 2 });
  perto(a.cota, 6);
  perto(a.divida, 12);
  perto(a.alvo, 18); // 6 do dia + 12 atrasados — não é 180 ÷ 28 = 6,43
  assert.equal(a.ultimo, false);
});

test("ágio vira crédito, e não dispensa de trabalhar amanhã", () => {
  // Batalhão em 02/09/2026: 97 evidências contra 64 previstas.
  const a = metaDeAmanha({ meta: 960, realizado: 97, turnosMes: 30, turnosDecorridos: 2 });
  perto(a.cota, 32);
  perto(a.agio, 33);
  perto(a.divida, 0);
  /* `previsto(d+1) − realizado` daria 0 e o painel mandaria a fração adiantada
     não fazer nada amanhã. O alvo nunca cai abaixo da cota. */
  perto(a.alvo, 32);
});

test("alvo do dia seguinte nunca fica abaixo da cota", () => {
  for (const realizado of [0, 30, 64, 97, 400]) {
    const a = metaDeAmanha({ meta: 960, realizado, turnosMes: 30, turnosDecorridos: 2 });
    assert.ok(a.alvo >= a.cota, `realizado ${realizado} devolveu alvo ${a.alvo}`);
    perto(a.alvo, a.cota + a.divida);
  }
});

test("mês encerrado não tem dia seguinte", () => {
  const a = metaDeAmanha({ meta: 960, realizado: 700, turnosMes: 30, turnosDecorridos: 30 });
  assert.equal(a.ultimo, true);
  assert.equal(a.alvo, 0);
});

test("curva plano × realizado cobre o mês inteiro, inclusive dia parado", () => {
  const c = curvaPlanoRealizado({
    meta: 960,
    diasMes: 30,
    diasDecorridos: 2,
    porDia: [
      { data: "2026-09-01", v: 40 },
      { data: "2026-09-02", v: 57 },
    ],
    prefixo: "2026-09",
  });

  assert.equal(c.length, 30);
  perto(c[0].previsto, 32);
  assert.equal(c[0].acumulado, 40);
  perto(c[1].previsto, 64);
  assert.equal(c[1].acumulado, 97); // fecha com o realizado do painel
  perto(c[29].previsto, 960); // a linha do plano vai até o fim do mês

  // Dia que ainda não chegou não vale zero: vale nada, e a linha para.
  assert.equal(c[2].acumulado, null);
  assert.equal(c[2].divida, null);
  assert.equal(c[2].decorrido, false);
});

test("dívida cresce em dia parado e cai quando a fração saneia", () => {
  const c = curvaPlanoRealizado({
    meta: 300,
    diasMes: 30,
    diasDecorridos: 10,
    porDia: [{ data: "2026-09-10", v: 100 }],
  });

  perto(c[4].divida, 50); // dia 5: dez por dia, nada lançado
  perto(c[8].divida, 90); // véspera: a dívida só cresce
  perto(c[9].divida, 0); // dia 10: 100 de uma vez zera o atraso
  assert.equal(c[9].feito, 100);
});

test("curva descarta data de outro mês que tenha vazado na série", () => {
  const c = curvaPlanoRealizado({
    meta: 960,
    diasMes: 30,
    diasDecorridos: 2,
    porDia: [
      { data: "2026-08-31", v: 500 },
      { data: "2026-09-01", v: 40 },
    ],
    prefixo: "2026-09",
  });
  assert.equal(c[0].acumulado, 40);
});
