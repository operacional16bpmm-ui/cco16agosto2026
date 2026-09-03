/**
 * Rede contra tabela exposta à internet — a classe de falha encontrada na
 * auditoria de 02/09/2026, quando duas tabelas de apoio nasceram sem RLS e
 * ficaram legíveis por qualquer pessoa com a chave pública que o próprio site
 * embute (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 *
 * O teste faz o que um atacante faria: pega a chave anônima e pergunta ao
 * PostgREST quantas linhas cada tabela do domínio devolve. Toda tabela de dado
 * operacional ou pessoal tem de responder ZERO — é o comportamento correto de
 * RLS negando por padrão, já que este app lê e escreve pelo `service_role` no
 * servidor e nunca pela chave pública.
 *
 * NÃO baixa conteúdo: usa `Range: 0-0` com `Prefer: count=exact` e lê só o
 * cabeçalho `content-range`. O teste existe para provar que o dado está
 * fechado, não para manusear dado pessoal.
 *
 * Sem as variáveis de ambiente o teste é PULADO, não falha: `npm run` local sem
 * `.env` não pode virar um vermelho que ninguém consegue apagar.
 *
 *   npm run verificar:seguranca
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Prefixos do domínio — tudo que carrega dado operacional ou pessoal.
 *
 * O catálogo do PostgREST (`GET /rest/v1/`) responde 401 para a chave anônima,
 * e isso é o comportamento correto: o servidor não entrega o índice do que
 * existe. Como não dá para enumerar de fora, a lista sai das MIGRATIONS do
 * próprio repositório — assim a rede cresce sozinha quando alguém acrescenta
 * tabela, em vez de envelhecer numa constante que ninguém lembra de atualizar.
 */
const PREFIXOS_FECHADOS = ["cop_", "cop2026_", "dejem_", "usuarios_", "p2_", "p3_"];

/**
 * Tabelas criadas fora de migration — `create table` avulso no console do
 * Supabase, tipicamente backup de véspera de mudança. Foi assim que nasceram as
 * duas tabelas abertas encontradas em 02/09/2026. Nome entra aqui à mão, de
 * propósito: a lista serve de lembrete de que elas existem.
 */
const AVULSAS_CONHECIDAS = [
  "cop_lanc_backup_nomes_20260902",
  "p3_roubos_farmacia_bkp_20260902",
];

/**
 * REGISTRO DE RISCO ACEITO — não é lista de perdão, é lista de dívida.
 *
 * Estas tabelas ESTÃO abertas à internet e o teste sabe disso. Ficam aqui por
 * decisão expressa do Fabricio em 02/09/2026, depois de a auditoria confirmar a
 * exposição (HTTP 206 com a chave pública; conteúdo não foi baixado). O teste
 * continua medindo e continua vermelho no relatório de cada uma, mas não trava
 * a esteira por elas — travaria por qualquer OUTRA, que é o que interessa.
 *
 * Sair daqui é uma linha de SQL:
 *   alter table public.<tabela> enable row level security;
 *
 * Toda entrada precisa de data e de quem decidiu. Sem isso, apagar da lista.
 */
const RISCO_ACEITO = new Map([
  ["cop_lanc_backup_nomes_20260902", "Fabricio, 02/09/2026 — backup da migração de nomes"],
  ["p3_roubos_farmacia_bkp_20260902", "Fabricio, 02/09/2026 — backup do caso de alvo prioritário"],
]);

async function tabelasDoDominio() {
  const { readdir, readFile } = await import("node:fs/promises");
  const dir = new URL("../supabase/", import.meta.url);
  const migracoes = new URL("../supabase/migrations/", import.meta.url);

  const arquivos = [
    ...(await readdir(dir)).filter((f) => f.endsWith(".sql")).map((f) => new URL(f, dir)),
    ...(await readdir(migracoes)).map((f) => new URL(f, migracoes)),
  ];

  const achadas = new Set(AVULSAS_CONHECIDAS);
  const padrao = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
  for (const arq of arquivos) {
    const sql = await readFile(arq, "utf8");
    for (const [, nome] of sql.matchAll(padrao)) {
      if (PREFIXOS_FECHADOS.some((pre) => nome.startsWith(pre))) achadas.add(nome);
    }
  }
  return [...achadas].sort();
}

/** Quantas linhas a chave PÚBLICA enxerga. Só o contador, nunca o conteúdo. */
async function linhasVisiveisAnonimamente(tabela) {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=*`, {
    headers: {
      apikey: CHAVE_ANON,
      Authorization: `Bearer ${CHAVE_ANON}`,
      Range: "0-0",
      Prefer: "count=exact",
    },
  });
  // 401/403/404 é fechado — só o que responde 2xx com contagem é que preocupa.
  if (r.status >= 400) return 0;
  const faixa = r.headers.get("content-range") ?? "*/0";
  const total = faixa.split("/")[1];
  return total === "*" ? 0 : Number(total);
}

const temAmbiente = Boolean(URL_BASE && CHAVE_ANON);

test(
  "nenhuma tabela do domínio devolve linha para a chave pública",
  { skip: temAmbiente ? false : "sem NEXT_PUBLIC_SUPABASE_* no ambiente" },
  async () => {
    const tabelas = await tabelasDoDominio();
    assert.ok(tabelas.length > 5, "as migrations não renderam tabela — teste sem valor");

    const abertas = [];
    const dividaConhecida = [];
    for (const t of tabelas) {
      const n = await linhasVisiveisAnonimamente(t);
      if (n === 0) continue;
      if (RISCO_ACEITO.has(t)) dividaConhecida.push(`${t} (${n} linhas) — ${RISCO_ACEITO.get(t)}`);
      else abertas.push(`${t} (${n} linhas)`);
    }

    /* A dívida aceita aparece SEMPRE, mesmo quando o teste passa. O dia em que
       isto sumir do log é o dia em que alguém trancou as tabelas — e aí a
       entrada tem de sair da constante. */
    if (dividaConhecida.length) {
      console.warn(
        `\n  ⚠ risco aceito, ainda aberto:\n    - ${dividaConhecida.join("\n    - ")}\n`
      );
    }

    assert.deepEqual(
      abertas,
      [],
      `tabela legível por qualquer pessoa na internet:\n  - ${abertas.join("\n  - ")}\n` +
        "Conserto: alter table public.<tabela> enable row level security;\n" +
        "Se for decisão consciente, registre em RISCO_ACEITO com data e autor."
    );
  }
);
