#!/usr/bin/env node
/**
 * Casos-limite do lançamento próprio da COP 2026 (`lib/cop2026-lancamento.ts`).
 *
 * Todos os casos abaixo são REAIS: saíram da planilha de agosto/2026, dos 103
 * lançamentos e 471 campos de identificador. Não há caso inventado aqui — a
 * régua deste projeto é o que a tropa efetivamente digitou, não o que o
 * desenho esperava que ela digitasse.
 *
 * Rodar: `npm run verificar:lancamento`
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

// O módulo é TypeScript puro; o runner usa strip-types (Node 22+), igual ao
// verificar-periodo-cop.mjs.
const {
  chaveDedup,
  lerEvidencias,
  normalizarRe,
  padronizarFuncao,
  validarLancamento,
  TETO_HARD_EVIDENCIAS,
} = await import("../lib/cop2026-lancamento.ts");

/* --------------------------------------------------------------------- RE */

test("RE: os cinco formatos de agosto caem na mesma base", () => {
  // 972607-1 (80×), 120146 (12×), 121898A (6×), 970462-A (3×), 9759662 (2×)
  assert.equal(normalizarRe("972607-1").base, "972607");
  assert.equal(normalizarRe("120146").base, "120146");
  assert.equal(normalizarRe("121898A").base, "121898");
  assert.equal(normalizarRe("970462-A").base, "970462");
  assert.equal(normalizarRe("9759662").base, "975966");
});

test("RE: com e sem verificador são a MESMA pessoa na dedup", () => {
  const a = chaveDedup("120146", "2026-09-01", "1º Turno (07h às 19h)");
  const b = chaveDedup("120146-3", "2026-09-01", "1º Turno (07h às 19h)");
  assert.equal(a, b);
});

test("RE: canônico preserva o verificador para exibição", () => {
  assert.equal(normalizarRe("970462-A").canonico, "970462-A");
  assert.equal(normalizarRe("120146").canonico, "120146");
});

test("RE: invisível colado do WhatsApp não cria um segundo auditor", () => {
  assert.equal(normalizarRe("972607 -​1").base, "972607");
});

/* ------------------------------------------------------------ identificador */

test("ID: hex de 32 é mídia; UUID é gravação — e o hífen decide", () => {
  const { evidencias } = lerEvidencias([
    "044f5fd643c7401b06503db90c67a3dc",
    "2df795bc-e91e-41ce-819e-95e0f88f0ab6",
  ]);
  assert.equal(evidencias.length, 2);
  assert.equal(evidencias[0].tipo, "midia");
  assert.equal(evidencias[1].tipo, "gravacao");
  // O hífen do UUID é preservado: sem ele, os dois seriam 32 hex.
  assert.ok(evidencias[1].idGravacao?.includes("-"));
});

test("ID: UUID em CAIXA ALTA continua sendo gravação", () => {
  const { evidencias } = lerEvidencias(["2DF795BC-E91E-41CE-819E-95E0F88F0AB6"]);
  assert.equal(evidencias[0].tipo, "gravacao");
});

test("ID: colagem múltipla num campo só é separada, não recusada", () => {
  const { evidencias } = lerEvidencias([
    "044f5fd643c7401b06503db90c67a3dc 2df795bc-e91e-41ce-819e-95e0f88f0ab6\nb1c2d3e4f5061728394a5b6c7d8e9f00",
  ]);
  assert.equal(evidencias.length, 3);
});

test("ID: o mesmo identificador duas vezes no envio conta UMA", () => {
  const r = lerEvidencias([
    "044f5fd643c7401b06503db90c67a3dc",
    "044f5fd643c7401b06503db90c67a3dc",
  ]);
  assert.equal(r.evidencias.length, 1);
  assert.equal(r.duplicadasNoEnvio.length, 1);
});

test("ID: URL colada resolve para o identificador embutido", () => {
  // 11 das 12 URLs de agosto traziam o hex32 no fragmento #:~:text=
  const { evidencias } = lerEvidencias([
    "https://cop.pmesp.br.evm.online/app/videos/3946270937/info#:~:text=044f5fd643c7401b06503db90c67a3dc",
  ]);
  assert.equal(evidencias[0].tipo, "midia");
  assert.equal(evidencias[0].idMidia, "044f5fd643c7401b06503db90c67a3dc");
});

test("ID: URL sem o hex vira identificador de página", () => {
  const { evidencias } = lerEvidencias([
    "https://cop.pmesp.br.evm.online/app/videos/3946270937/info",
  ]);
  assert.equal(evidencias[0].tipo, "pagina");
  assert.equal(evidencias[0].idPagina, 3946270937);
});

/* ------------------------------------------------------------------ recusas */

test("Recusa: CPF é recusado e NOMEADO (LGPD)", () => {
  // 22 células de agosto vieram com o CPF do operador colado junto.
  const { recusas, evidencias } = lerEvidencias(["13934852785"]);
  assert.equal(evidencias.length, 0);
  assert.equal(recusas[0].motivo, "cpf");
});

test("Recusa: o número solto campeão de agosto é nomeado", () => {
  const { recusas } = lerEvidencias(["20260824916201"]);
  assert.equal(recusas[0].motivo, "numero_solto");
});

test("Recusa: ID no campo errado — o incidente de 29/08 não passa mais", () => {
  // `202608298084` sumiu do campo de quantidade e reapareceu numa coluna de
  // ID, onde o código antigo o contava como evidência legítima.
  const { evidencias, recusas } = lerEvidencias(["202608298084"]);
  assert.equal(evidencias.length, 0);
  assert.equal(recusas.length, 1);
});

test("Recusa: RE colado no campo de ID é nomeado como RE", () => {
  const { recusas } = lerEvidencias(["972607"]);
  assert.equal(recusas[0].motivo, "re");
});

test("Recusa: identificador truncado diz quantos caracteres vieram", () => {
  const { recusas } = lerEvidencias(["044f5fd643c7401b06503db90c67a3d"]); // 31
  assert.equal(recusas[0].motivo, "truncado");
  assert.match(recusas[0].explicacao, /31/);
});

/* -------------------------------------------------------------- validação */

const BASE = {
  dataAuditoria: "2026-09-01",
  // Valor de banco, não rótulo de botão: a tela mostra "1º Turno" e envia
  // "Diurno", que é o vocabulário dos lançamentos que já existem.
  turno: "Diurno",
  re: "972607-1",
  nomeGuerra: "FABRICIO",
  posto: "SD PM",
  funcao: "Patrulheiro",
  auditou: true,
  quantidadeDeclarada: 1,
  camposId: ["044f5fd643c7401b06503db90c67a3dc"],
  numeroParte: "",
  justificativa: "",
  idSubmissao: "11111111-2222-3333-4444-555555555555",
};

const AGORA = new Date("2026-09-01T12:00:00-03:00");

/* ----------------------------------------------------------------- função */

test("Função: as três grafias de agosto/setembro viram UMA", () => {
  // Reais, medidas nos 203 lançamentos ativos em 08/09/2026: o painel agrupa
  // desempenho por este campo e contava as três como funções diferentes.
  const alvo = "Comando grupo patrulha";
  assert.equal(padronizarFuncao("Comando Grupo Patrulha"), alvo);
  assert.equal(padronizarFuncao("COMANDO GRUPO PATRULHA"), alvo);
  assert.equal(padronizarFuncao("Comando grupo patrulha"), alvo);
  assert.equal(padronizarFuncao("  comando   grupo  patrulha  "), alvo);

  assert.equal(padronizarFuncao("Cmt Cia"), "Cmt cia");
  assert.equal(padronizarFuncao("CMT CIA"), "Cmt cia");
});

test("Função: sigla e letra do grupo não viram minúscula", () => {
  // A regra do Comando é "primeira maiúscula, resto minúsculo"; sem as duas
  // exceções, `CGP A` viraria `Cgp a` e `FT` viraria `Ft` — e é assim que está
  // escrito em toda escala do Batalhão.
  assert.equal(padronizarFuncao("CGP A"), "CGP A");
  assert.equal(padronizarFuncao("cgp d"), "CGP D");
  assert.equal(padronizarFuncao("CMT EQ FT"), "Cmt eq FT");
  assert.equal(padronizarFuncao("CFP Noturno"), "CFP noturno");
});

test("Função: 1o e 2o viram ordinal", () => {
  assert.equal(padronizarFuncao("CMT EQUIPE FT 1o PEL"), "Cmt equipe FT 1º pel");
  assert.equal(padronizarFuncao("cmt equipe ft 2o pel"), "Cmt equipe FT 2º pel");
});

test("Função: vazio continua vazio, e não vira espaço", () => {
  assert.equal(padronizarFuncao(""), "");
  assert.equal(padronizarFuncao("   "), "");
});

test("Função é padronizada no envio, não só na tela", () => {
  // Server action é endpoint público: o `curl` manda o texto cru e a
  // padronização tem de acontecer aqui, não no componente.
  const r = validarLancamento({ ...BASE, funcao: "COMANDO GRUPO PATRULHA" }, AGORA);
  assert.ok(r.ok, "o caminho feliz não pode quebrar por causa da função");
  assert.equal(r.valor.funcao, "Comando grupo patrulha");
});

test("Válido: o caminho feliz passa", () => {
  const r = validarLancamento(BASE, AGORA);
  assert.equal(r.ok, true);
});

test("C-2: data no futuro é recusada", () => {
  const r = validarLancamento({ ...BASE, dataAuditoria: "2026-09-02" }, AGORA);
  assert.equal(r.ok, false);
  assert.match(r.erros.join(" "), /futuro/i);
});

test("C-2: hoje em São Paulo ainda vale às 21h, quando em UTC já é amanhã", () => {
  // 21h de 31/08 em São Paulo = 00h de 01/09 em UTC. Sem o fuso, o formulário
  // recusaria a data de hoje três horas antes da virada.
  const r = validarLancamento(
    { ...BASE, dataAuditoria: "2026-08-31" },
    new Date("2026-08-31T21:30:00-03:00")
  );
  assert.equal(r.ok, true);
});

test("Retroativo é ACEITO, com aviso — nunca recusado", () => {
  const r = validarLancamento(
    { ...BASE, dataAuditoria: "2026-08-20" },
    new Date("2026-09-01T12:00:00-03:00")
  );
  assert.equal(r.ok, true);
  assert.equal(r.valor.retroativo, true);
});

test("SIM sem nenhum identificador não passa", () => {
  const r = validarLancamento({ ...BASE, camposId: [] }, AGORA);
  assert.equal(r.ok, false);
});

test("NÃO sem justificativa não passa; com justificativa passa em 3 toques", () => {
  const semJustificativa = validarLancamento(
    { ...BASE, auditou: false, camposId: [], justificativa: "" },
    AGORA
  );
  assert.equal(semJustificativa.ok, false);

  const com = validarLancamento(
    { ...BASE, auditou: false, camposId: [], justificativa: "Empenhado em ocorrência o turno todo." },
    AGORA
  );
  assert.equal(com.ok, true);
  // Número da parte NÃO é obrigatório: se a parte não foi redigida, exigir o
  // número faz a pessoa inventar um.
  assert.equal(com.valor.numeroParte, "");
});

test("Divergência declarado × evidenciado é AVISO, não erro", () => {
  const r = validarLancamento({ ...BASE, quantidadeDeclarada: 5 }, AGORA);
  assert.equal(r.ok, true);
  assert.match(r.avisos.join(" "), /declarou 5/);
});

test("Teto duro recusa acima do limite de plausibilidade", () => {
  const muitos = Array.from({ length: TETO_HARD_EVIDENCIAS + 1 }, (_, i) =>
    i.toString(16).padStart(32, "0")
  );
  const r = validarLancamento({ ...BASE, camposId: muitos }, AGORA);
  assert.equal(r.ok, false);
});

test("CPF em campo livre (não só no de ID) é recusado", () => {
  const r = validarLancamento({ ...BASE, justificativa: "falar com 13934852785" }, AGORA);
  assert.equal(r.ok, false);
  assert.match(r.erros.join(" "), /CPF/);
});

test("Envio sem identificador de submissão não passa (idempotência)", () => {
  const r = validarLancamento({ ...BASE, idSubmissao: "" }, AGORA);
  assert.equal(r.ok, false);
});

test("Turno fora da lista fechada não passa", () => {
  const r = validarLancamento({ ...BASE, turno: "de manhã" }, AGORA);
  assert.equal(r.ok, false);
});

/* ------------------------------------------- gate do motivo padronizado */

/**
 * O formulário decide "precisa de motivo?" por `lerEvidencias().evidencias`, e
 * a server action tem que decidir pela MESMA conta. Enquanto ela contava campo
 * preenchido, um campo recusado (CPF, RE, número solto) inflava o total: o
 * auditor era obrigado a escolher o motivo na tela, o servidor concluía que
 * não precisava e gravava a justificativa SEM ele — com o comprovante ainda
 * exibindo o motivo como se tivesse sido salvo.
 */
test("campo recusado não conta como evidência no gate do motivo", () => {
  const doisValidosMaisLixo = [
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "13934852785",
    "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3",
  ];
  const { evidencias, recusas } = lerEvidencias(doisValidosMaisLixo);
  assert.equal(evidencias.length, 2, "o CPF não pode entrar na contagem");
  assert.equal(recusas.length, 1);
  assert.equal(recusas[0].motivo, "cpf");
});
