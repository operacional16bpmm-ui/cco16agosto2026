/**
 * Paridade entre a PLANILHA e o BANCO — o gate da virada de fonte.
 *
 *   npm run verificar:paridade
 *
 * Pergunta única, e é a que o Comando vai fazer: **o número muda quando a
 * fonte muda?** Se mudar, alguma coisa foi importada errado, e é melhor
 * descobrir aqui do que pelo print do Major.
 *
 * A comparação é feita pelo MESMO `calcularPainel()` que a tela usa, nos dois
 * lados. Comparar somas escritas à mão aqui provaria só que sei somar.
 *
 * Sem NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente, o
 * script informa e sai com 0: em máquina sem credencial isto é "não verificado",
 * não "falhou".
 */
import { createClient } from "@supabase/supabase-js";

import { extrairLancamentos, METAS_PADRAO_2026 } from "../lib/cop2026.ts";
import { normalizarRe } from "../lib/cop2026-lancamento.ts";
import { calcularPainel, FILTROS_VAZIOS } from "../lib/cop2026-metricas.ts";
import { parseCsv } from "../lib/inventario-2026.ts";

const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
const URL_RESPOSTAS = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=305359783&single=true&output=csv`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.log(
    "· Sem credenciais do Supabase no ambiente — paridade NÃO verificada (não é falha)."
  );
  process.exit(0);
}

/* ------------------------------------------------------------- planilha */

const resposta = await fetch(URL_RESPOSTAS, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
if (!resposta.ok) {
  console.error(`x A planilha respondeu ${resposta.status}.`);
  process.exit(1);
}
/* O banco guarda o RE CANÔNICO — `normalizarRe()`, o mesmo que o backfill
   aplica na importação. A planilha guarda o que o auditor digitou. Sem passar
   a planilha pelo mesmo normalizador, `auditores distintos` acusa divergência
   que é só grafia: em 03/09/2026 o mesmo policial aparecia como `NNNNNN` e
   como `NNNNNN-D`, e a planilha contava DOIS auditores onde o banco, certo,
   contava um. Comparar identidade com regra diferente dos dois lados não mede
   a virada de fonte, mede a diferença entre as duas réguas. */
const comReCanonico = (l) => ({ ...l, re: normalizarRe(l.re).canonico || l.re });

const daPlanilha = extrairLancamentos(parseCsv(await resposta.text())).map(comReCanonico);

/* ---------------------------------------------------------------- banco */

const db = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await db
  .from("cop_auditoria_lancamento")
  .select(
    "id, data_auditoria, hora, turno, re, nome_guerra, posto, funcao, subunidade, auditou, videos_declarados, numero_parte, justificativa, criado_em, cop_evidencia(bruto, posicao, descartada)"
  )
  .is("excluido_em", null)
  /* Só o que VEIO da planilha. Desde 01/09/2026 o portal recebe lançamento
     próprio (`origem = 'formulario'`, a tela /cop2026/lancar) e esse nunca
     existiu na planilha — compará-lo deixaria o gate vermelho para sempre por
     uma diferença que é o projeto funcionando. Em 03/09/2026 eram 16
     lançamentos e 68 evidências só do formulário. */
  .eq("origem", "planilha")
  .limit(20_000);
if (error) {
  console.error(`x Falha ao ler o banco: ${error.message}`);
  process.exit(1);
}

const doBanco = (data ?? []).map((l, i) => ({
  id: i,
  data: l.data_auditoria,
  hora: l.hora ?? "",
  idsMidia: (l.cop_evidencia ?? [])
    .filter((e) => !e.descartada)
    .sort((a, b) => a.posicao - b.posicao)
    .map((e) => e.bruto)
    .join("\n"),
  turno: l.turno,
  enviadoEm: l.criado_em,
  re: l.re,
  nomeGuerra: l.nome_guerra,
  posto: l.posto,
  funcao: l.funcao,
  subunidade: l.subunidade,
  auditou: l.auditou,
  videos: l.auditou ? l.videos_declarados : 0,
  numeroParte: l.numero_parte ?? "",
  justificativa: l.justificativa ?? "",
  videosExatos: 0,
  quantidadeDescartada: 0,
}));

/* ------------------------------------------------------------ comparação */

/* Só o período que existe nos DOIS lados. Comparar o mês inteiro contra um
   backfill parcial acusaria divergência que é só recorte diferente. */
const datasBanco = doBanco.map((l) => l.data).filter(Boolean).sort();
if (datasBanco.length === 0) {
  console.log("· Banco vazio — nada a comparar ainda. Rode o backfill antes.");
  process.exit(0);
}
const de = datasBanco[0];
const ate = datasBanco[datasBanco.length - 1];
const noPeriodo = (l) => l.data >= de && l.data <= ate;

const filtros = { ...FILTROS_VAZIOS };
const painelPlanilha = calcularPainel(daPlanilha.filter(noPeriodo), METAS_PADRAO_2026, filtros);
const painelBanco = calcularPainel(doBanco.filter(noPeriodo), METAS_PADRAO_2026, filtros);

console.log(`Período comparado: ${de} a ${ate}`);
console.log(`  planilha: ${daPlanilha.filter(noPeriodo).length} lançamentos`);
console.log(`  banco:    ${doBanco.filter(noPeriodo).length} lançamentos\n`);

const divergencias = [];
const conferir = (rotulo, a, b) => {
  const marca = a === b ? "✓" : "x";
  console.log(`  ${marca} ${rotulo.padEnd(28)} planilha=${a}  banco=${b}`);
  if (a !== b) divergencias.push(`${rotulo}: planilha=${a} banco=${b}`);
};

/* `total` é a soma de evidências pela régua declarada — o número que o Major
   lê. `ativos` são auditores distintos; `naoAuditou`, as respostas NÃO. */
conferir("evidências (declarado)", painelPlanilha.total, painelBanco.total);
conferir("auditores distintos", painelPlanilha.ativos, painelBanco.ativos);
conferir("respostas NÃO auditou", painelPlanilha.naoAuditou, painelBanco.naoAuditou);
conferir("lançamentos no recorte", painelPlanilha.dados.length, painelBanco.dados.length);

for (const fracao of painelPlanilha.fracoes) {
  const par = painelBanco.fracoes.find((f) => f.chave === fracao.chave);
  conferir(`fração ${fracao.chave}`, fracao.feito, par?.feito ?? 0);
}

if (divergencias.length > 0) {
  console.error(`\nx ${divergencias.length} divergência(s). A virada de fonte MUDARIA o painel:`);
  for (const d of divergencias) console.error(`    ${d}`);
  console.error(
    "\n  Antes de mexer em COP2026_FONTE, resolva. O Major valida por print, e print que muda sozinho enterra o projeto."
  );
  process.exit(1);
}

console.log("\n✓ Paridade total: trocar a fonte não muda nenhum número do painel.");
