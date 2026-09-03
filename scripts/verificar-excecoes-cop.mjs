/**
 * Rede contra a classe de bug que o Major apontou em 02/09/2026 às 07:50 —
 * "não aparece no gráfico a inconsistência das oito".
 *
 * O bloco "Onde as exceções se concentram" do briefing se contradizia na
 * própria tela: o cartão anunciava 8 lançamentos sem ID de mídia e todas as
 * barras abaixo mostravam 0, com o rodapé fechando em "0 desvio(s) em 21
 * lançamento(s)". A causa era uma segunda implementação da regra dentro do
 * componente, que somava só `naoAuditou + abaixo` e ignorava `semIds`.
 *
 * A partir de 03/09/2026 a regra tem fonte única em `excecoesPorFracao`. Este
 * teste afirma as quatro invariantes que a superfície precisa respeitar — se
 * alguém reescrever a conta no componente outra vez, elas quebram aqui antes de
 * chegar ao Comando.
 *
 *   npm run verificar:excecoes
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calcularPainel,
  excecoesPorFracao,
  filtrosDoMesCorrente,
  temPendencia,
} from "@/lib/cop2026-metricas";
import { METAS_PADRAO_2026 } from "@/lib/cop2026";

const HOJE = "2026-09-15";
const MINIMO = 3;

function lanc(over) {
  return {
    id: 0,
    data: "2026-09-01",
    hora: "08:00",
    idsMidia: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    turno: "Diurno",
    enviadoEm: "01/09/2026 08:00",
    re: "111111-1",
    nomeGuerra: "TESTE",
    posto: "SD PM",
    funcao: "CGP",
    subunidade: "1cia",
    auditou: true,
    videos: 5,
    numeroParte: "",
    justificativa: "",
    videosExatos: 0,
    quantidadeDescartada: 0,
    ...over,
  };
}

const FRACOES = [
  { chave: "em", rotulo: "Estado-Maior" },
  { chave: "1cia", rotulo: "1ª Cia" },
  { chave: "2cia", rotulo: "2ª Cia" },
];

/* A base cobre os quatro casos que importam, incluindo o que derrubava a conta:
   um lançamento que acumula DOIS motivos ao mesmo tempo. */
const BASE = [
  lanc({ id: 1, subunidade: "em" }), // limpo
  lanc({ id: 2, subunidade: "em", auditou: false }), // não auditou
  lanc({ id: 3, subunidade: "1cia", videos: 1 }), // abaixo do mínimo
  lanc({ id: 4, subunidade: "1cia", idsMidia: "  " }), // sem ID
  lanc({ id: 5, subunidade: "1cia", videos: 1, idsMidia: "" }), // DOIS motivos
  lanc({ id: 6, subunidade: "2cia" }), // limpo
  lanc({ id: 7, subunidade: "" }), // órfão, limpo
  lanc({ id: 8, subunidade: "", idsMidia: "" }), // órfão com pendência
];

test("um lançamento com dois motivos conta UMA vez", () => {
  const doisMotivos = lanc({ videos: 1, idsMidia: "" });
  assert.equal(temPendencia(doisMotivos, MINIMO), true);

  const r = excecoesPorFracao([doisMotivos], [{ chave: "1cia", rotulo: "1ª Cia" }], MINIMO);
  assert.equal(r.totalPendencia, 1, "somou os motivos em vez de contar o lançamento");
  assert.equal(r.totalLancamentos, 1);
});

test("comPendencia nunca passa do total da fração — a barra não estoura", () => {
  const r = excecoesPorFracao(BASE, FRACOES, MINIMO);
  for (const linha of [...r.linhas, r.orfaos]) {
    assert.ok(
      linha.comPendencia <= linha.total,
      `${linha.rotulo}: ${linha.comPendencia} pendências em ${linha.total} lançamentos`
    );
  }
});

test("as barras + órfãos fecham com a base — ninguém some no meio", () => {
  const r = excecoesPorFracao(BASE, FRACOES, MINIMO);
  assert.equal(
    r.totalLancamentos,
    BASE.length,
    "a soma das linhas não bate com o tamanho da base"
  );
  assert.equal(r.orfaos.total, 2, "lançamento sem fração declarada tem de ter linha própria");
  assert.equal(r.orfaos.comPendencia, 1);
});

test("o rodapé é a soma das barras, e não um contador paralelo", () => {
  const r = excecoesPorFracao(BASE, FRACOES, MINIMO);
  const somaDasBarras =
    r.linhas.reduce((s, l) => s + l.comPendencia, 0) + r.orfaos.comPendencia;
  assert.equal(r.totalPendencia, somaDasBarras);

  // em: 1 (não auditou) · 1cia: 3 · 2cia: 0 · órfãos: 1
  assert.equal(r.totalPendencia, 5);
});

test("semIds entra na conta — a regressão que o Major apontou", () => {
  const soSemIds = [
    lanc({ id: 10, subunidade: "em", idsMidia: "" }),
    lanc({ id: 11, subunidade: "em", idsMidia: "   " }),
  ];
  const r = excecoesPorFracao(soSemIds, FRACOES, MINIMO);
  assert.equal(
    r.totalPendencia,
    2,
    "sem-ID voltou a ficar de fora: é exatamente o bug de 02/09/2026"
  );
});

test("o Painel expõe a mesma conta que a função pura", () => {
  const f = { ...filtrosDoMesCorrente(HOJE), fracao: "todas", turno: "todos", semana: "todas" };
  const p = calcularPainel(BASE, METAS_PADRAO_2026, { hoje: HOJE, ...f });

  const direto = excecoesPorFracao(p.dados, p.fracoes, p.minimo);
  assert.deepEqual(
    p.excecoes,
    direto,
    "o Painel e a função pura discordaram — alguém recalculou no caminho"
  );

  /* E o total tem de fechar com a base recortada: é a invariante que o
     componente violava, mostrando 17 nas barras e 21 no rodapé. */
  assert.equal(p.excecoes.totalLancamentos, p.dados.length);
});
