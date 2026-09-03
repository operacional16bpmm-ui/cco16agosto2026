/**
 * Rede definitiva contra o bug que o Comando apontou em 02/09/2026 — nenhum
 * contador do painel de setembro pode ser tocado por um lançamento de agosto.
 *
 * O teste roda `calcularPainel` DUAS VEZES sobre o mesmo recorte de setembro:
 * uma vez com a base "limpa" (só os lançamentos do próprio mês) e outra com a
 * MESMA base acrescida de agosto inteiro. Todo campo numérico e toda estrutura
 * agregada tem que sair IDÊNTICO. Qualquer diferença é a assinatura da classe
 * de bug — uma leitura fora do portão `aplicarFiltros`.
 *
 *   npm run verificar:painel
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calcularPainel, filtrosDoMesCorrente } from "@/lib/cop2026-metricas";
import { METAS_PADRAO_2026 } from "@/lib/cop2026";
import { mesCorrente } from "@/lib/cop2026-relatorios";

/** Um lançamento sintético — os campos são os que o painel usa. */
function lanc(over) {
  return {
    id: 0,
    data: "2026-09-01",
    hora: "08:00",
    idsMidia: "",
    turno: "Diurno",
    enviadoEm: "01/09/2026 08:00",
    re: "111111-1",
    nomeGuerra: "TESTE",
    posto: "SD PM",
    funcao: "CGP",
    subunidade: "1cia",
    auditou: true,
    videos: 3,
    numeroParte: "",
    justificativa: "",
    videosExatos: 0,
    quantidadeDescartada: 0,
    ...over,
  };
}

/* Todo agosto imaginável: uma auditora nova por dia, três evidências cada, IDs
 * únicos, seis frações diferentes. Se algo daqui aparecer no painel de
 * setembro, o teste denuncia. */
const AGOSTO_INTEIRO = [];
const FRACOES = ["em", "1cia", "2cia", "3cia", "4cia", "ft"];
for (let dia = 1; dia <= 31; dia++) {
  const iso = `2026-08-${String(dia).padStart(2, "0")}`;
  for (const fracao of FRACOES) {
    AGOSTO_INTEIRO.push(
      lanc({
        id: AGOSTO_INTEIRO.length,
        data: iso,
        turno: dia % 2 ? "Diurno" : "Noturno",
        subunidade: fracao,
        re: `${fracao}-ago-${dia}`,
        nomeGuerra: `AGO ${dia} ${fracao}`,
        videos: 3,
        idsMidia: `${fracao}${String(dia).padStart(2, "0")}` +
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaa".slice(0, 30),
      })
    );
  }
}

/** Setembro real de exemplo — 3 lançamentos legítimos. */
const SETEMBRO = [
  lanc({ id: 1000, data: "2026-09-01", subunidade: "3cia", re: "129437-7", videos: 10 }),
  lanc({ id: 1001, data: "2026-09-01", subunidade: "1cia", re: "990660-6", videos: 6 }),
  lanc({ id: 1002, data: "2026-09-02", subunidade: "em",  re: "100371-2", videos: 3 }),
];

function chavesNumericas(obj, prefixo = "", chaves = []) {
  if (!obj || typeof obj !== "object") return chaves;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const nome = prefixo ? `${prefixo}.${k}` : k;
    if (typeof v === "number") chaves.push([nome, v]);
    else if (v && typeof v === "object" && !Array.isArray(v)) chavesNumericas(v, nome, chaves);
    else if (Array.isArray(v)) {
      v.forEach((item, i) => chavesNumericas(item, `${nome}[${i}]`, chaves));
    }
  }
  return chaves;
}

test("nenhum contador do painel de setembro é influenciado por lançamentos de agosto", () => {
  const filtros = mesCorrente()
    ? filtrosDoMesCorrente()
    : { fracao: "todas", turno: "todos", semana: "todas", de: "2026-09-01", ate: "2026-09-30", busca: "", excecao: "" };

  const so = calcularPainel(SETEMBRO, METAS_PADRAO_2026, filtros, "2026-09-02");
  const com = calcularPainel(
    [...AGOSTO_INTEIRO, ...SETEMBRO],
    METAS_PADRAO_2026,
    filtros,
    "2026-09-02"
  );

  /* `totalNaPlanilha` é o CONTADOR EXPLÍCITO de tudo que veio na planilha
     (aparece como "N de X respostas na planilha"). É a única exceção legítima
     a essa invariante. */
  const ignorar = new Set(["totalNaPlanilha"]);

  const nSo = chavesNumericas(so).filter(([k]) => !ignorar.has(k));
  const nCom = chavesNumericas(com).filter(([k]) => !ignorar.has(k));

  assert.equal(nSo.length, nCom.length, "estrutura do painel mudou entre as duas bases");

  const divergencias = [];
  for (let i = 0; i < nSo.length; i++) {
    const [kSo, vSo] = nSo[i];
    const [kCom, vCom] = nCom[i];
    if (kSo !== kCom) divergencias.push(`chave ${i}: ${kSo} ≠ ${kCom}`);
    else if (vSo !== vCom) divergencias.push(`${kSo}: só-setembro=${vSo} vs com-agosto=${vCom}`);
  }

  assert.deepEqual(
    divergencias,
    [],
    `\nUm ou mais contadores mudaram quando agosto foi acrescentado à base:\n  ` +
      divergencias.slice(0, 10).join("\n  ") +
      (divergencias.length > 10 ? `\n  ... (+${divergencias.length - 10})` : "") +
      `\n\nIsso é o bug de recorte: alguma parte do painel está lendo LANÇAMENTOS sem passar por` +
      `\n\`aplicarFiltros\`. Procure em \`calcularPainel\` (ou em quem monta o Painel fora dele)\n` +
      `um laço sobre \`lancamentos\` que não usa \`dados\` ou \`dadosSemFiltroDeSemana\`.\n`
  );
});

// ---------------------------------------------------------------------------
// Escala única: meta e janela do recorte pertencem ao MESMO período
//
// Com `?semana=1` o painel trocava a meta para a cota da semana e mantinha a
// janela do mês. A tela mostrava ritmo-alvo de 8,03/dia — 241 de meta semanal
// divididos por 30 dias de calendário — e trajetória de 435,7%, "ADIANTADA",
// ao lado do selo "Crítica · ABAIXO DA META".
// ---------------------------------------------------------------------------

const RECORTE_SETEMBRO = {
  fracao: "todas",
  turno: "todos",
  semana: "todas",
  de: "2026-09-01",
  ate: "2026-09-30",
  busca: "",
  excecao: "",
};

test("com semana filtrada, a janela encolhe junto com a meta", () => {
  const mes = calcularPainel(SETEMBRO, METAS_PADRAO_2026, RECORTE_SETEMBRO, "2026-09-03");
  assert.equal(mes.janela.dias, 30);
  assert.equal(mes.meta, 960);

  const s1 = calcularPainel(
    SETEMBRO,
    METAS_PADRAO_2026,
    { ...RECORTE_SETEMBRO, semana: "1" },
    "2026-09-03"
  );
  assert.equal(s1.janela.dias, 7, "a janela da Semana 1 tem 7 dias");
  assert.equal(s1.janela.de, "2026-09-01");
  assert.equal(s1.janela.ate, "2026-09-07");
  /* 225, e não 224: a meta do recorte é a SOMA das cotas das frações, cada uma
     inteira. Ratear o agregado daria 224 e brigaria com a soma das seis linhas
     da tabela — que é a conta que o Comando confere na mão. */
  assert.equal(s1.meta, 225, "a cota da Semana 1 é rateada por dias");

  const s4 = calcularPainel(
    SETEMBRO,
    METAS_PADRAO_2026,
    { ...RECORTE_SETEMBRO, semana: "4" },
    "2026-09-03"
  );
  assert.equal(s4.janela.dias, 9, "setembro não tem dia 31");
  assert.equal(s4.janela.ate, "2026-09-30");
  assert.equal(s4.meta, 288);
});

test("o passo diário é o mesmo em qualquer recorte de semana", () => {
  const passos = ["todas", "1", "2", "3", "4"].map((semana) => {
    const p = calcularPainel(
      SETEMBRO,
      METAS_PADRAO_2026,
      { ...RECORTE_SETEMBRO, semana },
      "2026-09-03"
    );
    // A invariante: a meta do recorte cabe na janela do recorte.
    assert.ok(
      Math.abs(p.metaDia * p.janela.dias - p.meta) < 0.001,
      `meta ${p.meta} não fecha com ${p.metaDia}/dia × ${p.janela.dias} dias na semana ${semana}`
    );
    return p.metaDia;
  });
  /* O passo é praticamente o mesmo em qualquer semana. A folga de 0,25 existe
     porque a cota de cada fração é inteira: 225/7, 224/7, 223/7 e 288/9 não dão
     exatamente 32. Antes da correção a Semana 1 media 8,03/dia. */
  for (const passo of passos) {
    assert.ok(Math.abs(passo - 32) < 0.25, `passo diário fora dos 32/dia: ${passo}`);
  }
});

test("as quatro cotas semanais somam a meta do mês, no topo e nos cartões", () => {
  const p = calcularPainel(SETEMBRO, METAS_PADRAO_2026, RECORTE_SETEMBRO, "2026-09-03");
  const soma = p.semanasBatalhao.reduce((s, x) => s + x.meta, 0);
  assert.equal(soma, p.meta, "os cartões semanais não fecham a meta do mês");

  // E o cartão de cada semana usa a MESMA cota que o topo passa a mostrar
  // quando aquela semana é filtrada — era 240 de um lado e 241 do outro.
  for (const semana of ["1", "2", "3", "4"]) {
    const filtrado = calcularPainel(
      SETEMBRO,
      METAS_PADRAO_2026,
      { ...RECORTE_SETEMBRO, semana },
      "2026-09-03"
    );
    const cartao = p.semanasBatalhao.find((x) => String(x.semana) === semana);
    assert.equal(cartao.meta, filtrado.meta, `semana ${semana}: cartão e topo discordam`);
  }
});

test("a fração segue a escala do recorte, e não a do mês", () => {
  const s1 = calcularPainel(
    SETEMBRO,
    METAS_PADRAO_2026,
    { ...RECORTE_SETEMBRO, semana: "1" },
    "2026-09-03"
  );
  const soma = s1.fracoes.reduce((s, x) => s + x.meta, 0);
  assert.equal(soma, s1.meta, "a soma das frações tem que fechar a meta do recorte");

  // Cota semanal da 1ª Cia: 195 no mês, rateada por dias na Semana 1.
  const primeira = s1.fracoes.find((x) => x.chave === "1cia");
  assert.ok(primeira.meta < 195, `fração ainda na escala do mês: ${primeira.meta}`);

  // O desempenho semana a semana da fração continua fechando a meta MENSAL dela.
  const somaSemanas = primeira.semanas.reduce((s, x) => s + x.meta, 0);
  assert.equal(somaSemanas, 195);
});

/* ------------------------------------------------- régua do "não aferível" */

/**
 * Determinação do Comando (03/09/2026): "não aferível" é ausência de BASE,
 * nunca resultado zero. Um período ABERTO sem produção é FAIXA CRÍTICA — foi
 * assim que a semana em curso deixou de sair cinza ao lado da linha da mesma
 * fração, que já saía crítica. O veredito do topo era a última superfície com
 * o discriminador antigo: dizia "não aferível" enquanto o velocímetro logo
 * abaixo dizia CRÍTICA, sobre o mesmo zero.
 */
test("ciclo aberto sem nenhum lançamento é CRÍTICO, não 'não aferível'", () => {
  const vazio = calcularPainel([], METAS_PADRAO_2026, RECORTE_SETEMBRO, "2026-09-03");
  assert.equal(vazio.total, 0);
  assert.equal(
    vazio.nivelGeral,
    "critico",
    "período aberto sem produção tem base — a régua manda FAIXA CRÍTICA"
  );
});

test("mês que ainda não começou continua 'não aferível'", () => {
  const outubro = {
    ...RECORTE_SETEMBRO,
    de: "2026-10-01",
    ate: "2026-10-31",
  };
  const futuro = calcularPainel([], METAS_PADRAO_2026, outubro, "2026-09-03");
  assert.equal(
    futuro.nivelGeral,
    "neutro",
    "sem período iniciado não há base para classificar"
  );
});
