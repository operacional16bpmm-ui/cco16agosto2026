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
