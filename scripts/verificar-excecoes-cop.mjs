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
   um lançamento que acumula DOIS motivos ao mesmo tempo.

   CADA LINHA TEM RE PRÓPRIO, e isso é requisito do fixture desde 03/09/2026:
   o mínimo passou a ser aferido por TURNO (RE + data + turno) e, com o RE
   padrão em todas, as oito viravam UM turno de 27 evidências — nenhuma ficaria
   abaixo do mínimo e o teste passaria a medir outra coisa. Um auditor por
   linha é o que mantém "um lançamento = um turno" aqui dentro. */
const BASE = [
  lanc({ id: 1, re: "100001-1", subunidade: "em" }), // limpo
  lanc({ id: 2, re: "100002-2", subunidade: "em", auditou: false }), // não auditou
  lanc({ id: 3, re: "100003-3", subunidade: "1cia", videos: 1 }), // abaixo do mínimo
  lanc({ id: 4, re: "100004-4", subunidade: "1cia", idsMidia: "  " }), // sem ID
  lanc({ id: 5, re: "100005-5", subunidade: "1cia", videos: 1, idsMidia: "" }), // DOIS motivos
  lanc({ id: 6, re: "100006-6", subunidade: "2cia" }), // limpo
  lanc({ id: 7, re: "100007-7", subunidade: "" }), // órfão, limpo
  lanc({ id: 8, re: "100008-8", subunidade: "", idsMidia: "" }), // órfão com pendência
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
  /* Era 1 até 07/09/2026, pelo órfão sem ID (id 8). Sem-ID deixou de ser
     pendência por decisão de Comando, e o outro órfão (id 7) sempre foi limpo. */
  assert.equal(r.orfaos.comPendencia, 0);
});

test("o rodapé é a soma das barras, e não um contador paralelo", () => {
  const r = excecoesPorFracao(BASE, FRACOES, MINIMO);
  const somaDasBarras =
    r.linhas.reduce((s, l) => s + l.comPendencia, 0) + r.orfaos.comPendencia;
  assert.equal(r.totalPendencia, somaDasBarras);

  /* em: 1 (não auditou) · 1cia: 2 (id 3 e id 5, ambos abaixo do mínimo) ·
     2cia: 0 · órfãos: 0.
     Era 5 até 07/09/2026: contava também o id 4 (só sem ID) e o id 8 (órfão sem
     ID). O id 5 continua contando, mas pelo mínimo, não pelo identificador. */
  assert.equal(r.totalPendencia, 3);
});

test("o mínimo é do TURNO: dois envios no mesmo turno somam", () => {
  /* O caso do Maj Vinícius, 02/09/2026: dois formulários no mesmo dia e turno,
     2 + 1 = 3, cumpriu — e mesmo assim aparecia como abaixo do mínimo, porque a
     régua era por envio. A partir de 03/09/2026 a soma é do turno em TODAS as
     superfícies, esta inclusive. */
  const mesmoTurno = [
    lanc({ id: 20, re: "200001-1", subunidade: "1cia", videos: 2 }),
    lanc({ id: 21, re: "200001-1", subunidade: "1cia", videos: 1 }),
  ];
  const r = excecoesPorFracao(mesmoTurno, FRACOES, MINIMO);
  assert.equal(r.totalPendencia, 0, "somou por envio: 2 e 1 viraram dois desvios");

  /* Turnos diferentes do MESMO auditor não somam entre si. */
  const doisTurnos = [
    lanc({ id: 22, re: "200002-2", data: "2026-09-01", subunidade: "1cia", videos: 2 }),
    lanc({ id: 23, re: "200002-2", data: "2026-09-02", subunidade: "1cia", videos: 1 }),
  ];
  assert.equal(excecoesPorFracao(doisTurnos, FRACOES, MINIMO).totalPendencia, 2);
});

test("o cartão e o filtro do cartão devolvem o mesmo tamanho", () => {
  /* A divergência que o Comando via: o cartão "Abaixo do mínimo" contava turnos
     e o clique nele filtrava por lançamento — 5 no cartão, 8 na lista. */
  const base = [
    lanc({ id: 30, re: "300001-1", subunidade: "1cia", videos: 2 }),
    lanc({ id: 31, re: "300001-1", subunidade: "1cia", videos: 1 }), // mesmo turno: cumpriu
    lanc({ id: 32, re: "300002-2", subunidade: "1cia", videos: 1 }), // turno abaixo
  ];
  const f = { ...filtrosDoMesCorrente(HOJE), fracao: "todas", turno: "todos", semana: "todas" };
  const p = calcularPainel(base, METAS_PADRAO_2026, { hoje: HOJE, ...f });
  assert.equal(p.abaixo, 1, "o contador do cartão deixou de ser por turno");
  assert.equal(p.abaixoLista.length, p.abaixo, "a lista nominal divergiu do contador");

  const filtrado = calcularPainel(base, METAS_PADRAO_2026, {
    hoje: HOJE,
    ...f,
    excecao: "abaixo",
  });
  assert.equal(
    new Set(filtrado.dados.map((l) => `${l.re}|${l.data}|${l.turno}`)).size,
    p.abaixo,
    "o filtro do cartão voltou a recortar por lançamento"
  );
});

test("sem-ID NÃO é pendência — decisão de Comando de 07/09/2026", () => {
  /* Este teste travava o contrário até 07/09/2026 ("semIds entra na conta"),
     porque em 02/09 o rodapé anunciava "0 desvio(s)" com 8 sem-ID na tela.
     A regra mudou na origem, não no código: vale o que o auditor DECLAROU,
     qualquer que seja o número digitado no campo de ID. Quem declarou e não
     informou identificador entregou o serviço e não pode contar como desvio em
     tela de desempenho — a divergência é apurada e listada em
     `/cop2026/admin/divergencias`, e só lá.

     Fica travado nos dois sentidos de propósito: se alguém reintroduzir sem-ID
     na contagem, este teste cai antes de o número chegar ao Comando. */
  const soSemIds = [
    lanc({ id: 10, subunidade: "em", idsMidia: "" }),
    lanc({ id: 11, subunidade: "em", idsMidia: "   " }),
  ];
  const r = excecoesPorFracao(soSemIds, FRACOES, MINIMO);
  assert.equal(
    r.totalPendencia,
    0,
    "sem-ID voltou a contar como desvio: contraria a decisão de 07/09/2026"
  );

  /* E quem, além de não informar ID, ficou abaixo do mínimo continua contando —
     pelo mínimo, que é o motivo legítimo. */
  const abaixoESemId = [lanc({ id: 12, subunidade: "em", videos: 1, idsMidia: "" })];
  assert.equal(excecoesPorFracao(abaixoESemId, FRACOES, MINIMO).totalPendencia, 1);
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
