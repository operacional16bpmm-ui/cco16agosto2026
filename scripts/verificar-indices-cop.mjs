import test from "node:test";
import assert from "node:assert/strict";
import {
  alertaLote,
  indiceDispersao,
  regularidadeProducao,
} from "../lib/cop2026-tendencia.ts";

test("IDA flagra a cota batida por poucos auditores", () => {
  // Estado-Maior: 98 PMs, 2 lançaram — o caso que o Red Team apontou
  const em = indiceDispersao(2, 98);
  assert.equal(em.classe, "POUCOS_AUDITORES");
  assert.ok(em.pct < 3);

  assert.equal(indiceDispersao(70, 100).classe, "DISTRIBUIDA");
  assert.equal(indiceDispersao(40, 100).classe, "CONCENTRADA");
  assert.equal(indiceDispersao(5, 0).classe, "SEM_BASE"); // não divide por zero
});

test("regularidade separa produção distribuída de lançamento em lote", () => {
  assert.equal(regularidadeProducao([25, 25, 25, 25]).classe, "REGULAR");
  assert.equal(regularidadeProducao([0, 0, 0, 36]).classe, "CONCENTRADA");
  assert.equal(regularidadeProducao([0, 0, 0, 0]).classe, "SEM_BASE"); // sem produção
});

test("alerta de lote marca a semana que estourou a cota", () => {
  const r = alertaLote([
    { semana: 1, meta: 12, feito: 0 },
    { semana: 2, meta: 12, feito: 0 },
    { semana: 3, meta: 12, feito: 0 },
    { semana: 4, meta: 12, feito: 36 }, // 300% exatos: não dispara
  ]);
  assert.equal(r.emLote, false);

  const r2 = alertaLote([{ semana: 4, meta: 12, feito: 74 }]); // 616%
  assert.equal(r2.emLote, true);
  assert.deepEqual(r2.semanas, [4]);
  assert.ok(r2.maiorPct > 600);

  // meta zero não entra na conta nem gera divisão por zero
  const r3 = alertaLote([{ semana: 1, meta: 0, feito: 10 }]);
  assert.equal(r3.emLote, false);
});
