/**
 * Verificação do recorte de período do painel COP 2026.
 *
 *   node --experimental-strip-types --test scripts/verificar-periodo-cop.mjs
 *
 * É .mjs, e não .ts, pelo mesmo motivo de verificar-tendencia-cop.mjs: o
 * tsconfig do app inclui `**\/*.ts` e um script de apoio que importa com
 * extensão explícita derruba o type-check do build.
 *
 * O que se protege aqui:
 *
 * 1. A meta de 960 evidências é MENSAL. O painel sem filtro de data somava tudo
 *    o que já entrou — inofensivo enquanto só existia agosto, e errado a partir
 *    de setembro, quando o percentual passaria de 100% empilhando dois meses
 *    contra a meta de um.
 *
 * 2. O fuso não é decoração. Às 21h de 31/08 em São Paulo já é 1º de setembro
 *    em UTC: sem `America/Sao_Paulo`, o painel viraria o mês horas antes da
 *    tropa e mostraria zero enquanto o turno da noite ainda lança em agosto.
 *    Este é o teste que impede alguém de "simplificar" para toISOString().
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  cicloAcabou,
  fimDoCicloCadastrado,
  mesCorrente,
  RELATORIOS_MENSAIS,
} from "../lib/cop2026-relatorios.ts";

const em = (iso) => mesCorrente(new Date(iso))?.chave;

test("a virada do mês segue o fuso de São Paulo, não o UTC", () => {
  // 21h30 de 31/08 em BRT já é 01/09 em UTC. Tem que continuar agosto.
  assert.equal(em("2026-08-31T21:30:00-03:00"), "agosto");
  assert.equal(em("2026-08-31T23:59:00-03:00"), "agosto");
  assert.equal(em("2026-09-01T00:01:00-03:00"), "setembro");
});

test("cada mês do ciclo se reconhece no próprio período", () => {
  for (const m of RELATORIOS_MENSAIS) {
    assert.equal(em(`${m.periodo.de}T12:00:00-03:00`), m.chave, `início de ${m.chave}`);
    assert.equal(em(`${m.periodo.ate}T12:00:00-03:00`), m.chave, `fim de ${m.chave}`);
  }
});

test("fora do ciclo não inventa mês", () => {
  // Sem mês corrente o painel volta a mostrar o ciclo inteiro, que é a
  // degradação certa: melhor o ciclo todo do que uma tela vazia.
  assert.equal(mesCorrente(new Date("2027-01-05T12:00:00-03:00")), undefined);
  assert.equal(mesCorrente(new Date("2026-07-31T12:00:00-03:00")), undefined);
});

/**
 * DESPERTADOR DO CALENDÁRIO — a única rede desta suíte que fala do FUTURO.
 *
 * `RELATORIOS_MENSAIS` é escrito à mão e hoje termina em 31/12/2026. No dia
 * seguinte ao último período, `mesCorrente()` passa a devolver `undefined` para
 * sempre e o painel inteiro degrada em silêncio para "ciclo inteiro": título
 * genérico, meta somando períodos, recorte sem âncora. Nada lança erro — e foi
 * exatamente assim que a virada de agosto para setembro pegou o Comando de
 * surpresa em 02/09/2026.
 *
 * Este teste falha ANTES de o problema existir: com menos de 45 dias de
 * calendário pela frente, a esteira para e cobra o cadastro do período
 * seguinte. Consertar é acrescentar as linhas do próximo ciclo em
 * `lib/cop2026-relatorios.ts` — nunca afrouxar o prazo aqui.
 */
test("o calendário do ciclo ainda tem folga para cadastrar o próximo", () => {
  const DIAS_DE_AVISO = 45;
  const fim = new Date(`${fimDoCicloCadastrado()}T23:59:59-03:00`);
  const faltam = Math.floor((fim - Date.now()) / 86_400_000);

  assert.ok(
    faltam >= DIAS_DE_AVISO,
    `O calendário da COP acaba em ${fimDoCicloCadastrado()} — faltam ${faltam} dia(s). ` +
      `Cadastre o próximo período em RELATORIOS_MENSAIS (lib/cop2026-relatorios.ts) ` +
      `antes da virada: depois dela mesCorrente() devolve undefined e o painel ` +
      `passa a somar o ciclo inteiro contra a meta de um mês, sem acusar nada.`
  );
});

test("cicloAcabou só é verdade depois do último período", () => {
  assert.equal(cicloAcabou(new Date("2026-12-31T23:00:00-03:00")), false);
  assert.equal(cicloAcabou(new Date("2027-01-01T00:30:00-03:00")), true);
  // Antes do ciclo começar não é "acabou" — são estados diferentes, e só o
  // segundo pede aviso na tela.
  assert.equal(cicloAcabou(new Date("2026-07-01T12:00:00-03:00")), false);
});

test("os períodos do ciclo não se sobrepõem nem deixam buraco", () => {
  const ordenados = [...RELATORIOS_MENSAIS].sort((a, b) =>
    a.periodo.de.localeCompare(b.periodo.de)
  );
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = new Date(`${ordenados[i - 1].periodo.ate}T12:00:00Z`);
    const atual = new Date(`${ordenados[i].periodo.de}T12:00:00Z`);
    const dias = (atual - anterior) / 86_400_000;
    assert.equal(dias, 1, `${ordenados[i - 1].chave} → ${ordenados[i].chave}`);
  }
});
