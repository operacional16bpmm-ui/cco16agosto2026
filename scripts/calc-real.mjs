/**
 * Calculo total com as MESMAS funcoes do portal — extrairLancamentos,
 * calcularPainel e o motor de tendencia. Sem replicar regra nenhuma: o que
 * sair aqui e o que a tela mostra.
 */
import { extrairLancamentos, METAS_PADRAO_2026, MATRIZ_PROPORCIONAL_2026 } from "../lib/cop2026.ts";
import { calcularPainel, FILTROS_VAZIOS } from "../lib/cop2026-metricas.ts";
import {
  calcularTendencia,
  progressoDoMes,
  indiceEquilibrio,
  regularidadeProducao,
  indiceDispersao,
  prioridadeAcao,
  ROTULO_PRIORIDADE,
  conferirSomaCotas,
} from "../lib/cop2026-tendencia.ts";

const PUB =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
const URL = `https://docs.google.com/spreadsheets/d/e/${PUB}/pub?gid=305359783&single=true&output=csv`;

/** CSV com aspas e quebras dentro de campo. */
function parseCsv(txt) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c === '"' && txt[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

const resp = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
const linhas = parseCsv(await resp.text());
const lancamentos = extrairLancamentos(linhas);
const painel = calcularPainel(lancamentos, METAS_PADRAO_2026, FILTROS_VAZIOS);

const hoje = new Date();
const sp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(hoje).split("-").map(Number);
const p = progressoDoMes(new Date(Date.UTC(sp[0], sp[1] - 1, sp[2], 12)), sp[0], sp[1]);

const n2 = (x) => x.toFixed(2).replace(".", ",").padStart(8);
const n1 = (x) => x.toFixed(1).replace(".", ",").padStart(7);
const n0 = (x) => Math.round(x).toString().padStart(6);
const sg = (x) => (x >= 0 ? "+" : "") + Math.round(x);

console.log("=".repeat(92));
console.log(`CALCULO TOTAL — ${sp[2]}/${sp[1]}/${sp[0]} · mes com ${p.diasMes} dias`);
console.log(`Dias encerrados ${p.diasDecorridos} de ${p.diasMes}  |  Turnos-fracao ${p.turnosDecorridos} de ${p.turnosMes}  |  restam ${p.turnosRestantes} turnos`);
console.log(`Lancamentos lidos: ${lancamentos.length}  |  Realizado: ${painel.total}  |  Meta: ${painel.meta}`);
console.log("=".repeat(92));

console.log("\nFracao          Peso   Meta  Feito  Alvo/t  Real/t MetaAcum   Saldo  Ader%  Recup/t  Press  Proj  IDA%  Prioridade");
console.log("-".repeat(92));

const linhasCalc = painel.fracoes.map((f) => {
  const t = calcularTendencia({
    meta: f.meta, realizado: f.feito, turnosMes: p.turnosMes, turnosDecorridos: p.turnosDecorridos,
  });
  const peso = MATRIZ_PROPORCIONAL_2026[f.chave]?.pctMeta ?? 0;
  const ida = indiceDispersao(f.lancaram, f.efetivo);
  const reg = regularidadeProducao((f.semanas ?? []).map((s) => s.feito));
  const pr = prioridadeAcao(t);
  console.log(
    f.rotulo.padEnd(14) +
    (peso.toFixed(2) + "%").padStart(7) +
    n0(f.meta) + n0(f.feito) +
    n2(t.ritmoAlvo) + n2(t.ritmoReal ?? 0) +
    n1(t.metaAcumulada) + sg(t.saldoTrajetoria).padStart(8) +
    n1(t.aderencia ?? 0) + n2(t.ritmoRecuperacao) +
    n1(t.pressaoRecuperacao ?? 0) + n0(t.projecaoFechamento ?? 0) +
    n1(ida.pct ?? 0) + "  " + ROTULO_PRIORIDADE[pr]
  );
  return { f, t, reg, ida };
});

// Batalhao: ritmo POR DIA
const btl = calcularTendencia({
  meta: painel.meta, realizado: painel.total, turnosMes: p.diasMes, turnosDecorridos: p.diasDecorridos,
});
console.log("-".repeat(92));
console.log(
  "BATALHAO".padEnd(14) + "100,00%".padStart(7) + n0(painel.meta) + n0(painel.total) +
  n2(btl.ritmoAlvo) + n2(btl.ritmoReal ?? 0) + n1(btl.metaAcumulada) +
  sg(btl.saldoTrajetoria).padStart(8) + n1(btl.aderencia ?? 0) + n2(btl.ritmoRecuperacao) +
  n1(btl.pressaoRecuperacao ?? 0) + n0(btl.projecaoFechamento ?? 0) + "        " +
  ROTULO_PRIORIDADE[prioridadeAcao(btl)]
);
console.log("   (Batalhao em evidencias/DIA · fracoes em evidencias/TURNO)");

const eq = indiceEquilibrio(linhasCalc.map((l) => l.t.aderencia));
const soma = conferirSomaCotas(painel.fracoes.map((f) => f.meta), 960);
const somaSaldos = linhasCalc.reduce((s, l) => s + l.t.saldoTrajetoria, 0);

console.log("\nCONFERENCIAS");
console.log(`  Soma das cotas ............... ${soma.soma}  ${soma.fecha ? "OK (fecha 960)" : "DIVERGENTE " + soma.diferenca}`);
console.log(`  Cumprimento = SUMfeito/SUMmeta ${painel.total}/${painel.meta} = ${(painel.pct).toFixed(1).replace(".", ",")}%`);
console.log(`  Soma dos saldos das fracoes .. ${somaSaldos.toFixed(1)}  (Batalhao: ${btl.saldoTrajetoria.toFixed(1)})`);
console.log(`  Equilibrio de producao ....... ${(eq.cv * 100).toFixed(1)}%  ${eq.classe}`);
console.log(`  Falta para a meta ............ ${btl.deficit} evidencias em ${p.diasMes - p.diasDecorridos} dia(s)`);
console.log(`  Auditores ativos ............. ${painel.ativos} de ${painel.auditores}`);

console.log("\nREGULARIDADE (producao por semana)");
for (const { f, reg } of linhasCalc) {
  const sem = (f.semanas ?? []).map((s) => s.feito).join(" · ");
  console.log(`  ${f.rotulo.padEnd(14)} ${sem.padEnd(24)} ${reg.classe}${reg.gini !== null ? `  (gini ${reg.gini.toFixed(2)})` : ""}`);
}
