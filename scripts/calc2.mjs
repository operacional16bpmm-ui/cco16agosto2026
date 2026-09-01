/**
 * Calculo total com o parser OFICIAL do portal (extrairLancamentos) e o motor
 * de tendencia. A agregacao repete o que calcularPainel faz: soma `videos` dos
 * lancamentos com auditou = true. Assim os numeros batem com a tela.
 */
import {
  extrairLancamentos,
  MATRIZ_PROPORCIONAL_2026,
  ORDEM_SUBUNIDADES,
  ROTULO_SUBUNIDADE,
} from "../lib/cop2026.ts";
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

function parseCsv(txt) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
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

const semanaDe = (iso) => {
  const d = Number((iso || "").slice(8, 10));
  return d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
};

const resp = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
const linhas = parseCsv(await resp.text());
const lanc = extrairLancamentos(linhas);

const sp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date()).split("-").map(Number);
const p = progressoDoMes(new Date(Date.UTC(sp[0], sp[1] - 1, sp[2], 12)), sp[0], sp[1]);

const agg = {};
for (const k of ORDEM_SUBUNIDADES) agg[k] = { feito: 0, res: new Set(), sem: [0, 0, 0, 0] };
let foraDeEscopo = 0;
for (const l of lanc) {
  if (!l.auditou) continue;
  if (!agg[l.subunidade]) { foraDeEscopo++; continue; }
  agg[l.subunidade].feito += l.videos;
  if (l.re) agg[l.subunidade].res.add(l.re.trim());
  agg[l.subunidade].sem[semanaDe(l.data)] += l.videos;
}

const n2 = (x) => x.toFixed(2).replace(".", ",").padStart(8);
const n1 = (x) => x.toFixed(1).replace(".", ",").padStart(8);
const n0 = (x) => Math.round(x).toString().padStart(6);
const sg = (x) => ((x >= 0 ? "+" : "") + Math.round(x)).padStart(8);

console.log("=".repeat(96));
console.log(`CALCULO TOTAL — ${sp[2]}/${sp[1]}/${sp[0]}  ·  mes de ${p.diasMes} dias`);
console.log(`Dias encerrados ${p.diasDecorridos}/${p.diasMes}  |  Turnos-fracao ${p.turnosDecorridos}/${p.turnosMes}  |  restam ${p.turnosRestantes} turnos (${p.diasMes - p.diasDecorridos} dia)`);
console.log(`Lancamentos com auditoria: ${lanc.filter((l) => l.auditou).length} de ${lanc.length}`);
console.log("=".repeat(96));
console.log("\nFracao          Peso   Meta  Feito  Alvo/t  Real/t MetaAcum   Saldo   Ader%  Recup/t   Press  Proj  IDA%  Prioridade");
console.log("-".repeat(96));

let totMeta = 0, totFeito = 0;
const calc = [];
for (const k of ORDEM_SUBUNIDADES) {
  const m = MATRIZ_PROPORCIONAL_2026[k];
  if (!m) continue;
  const feito = agg[k].feito;
  totMeta += m.meta; totFeito += feito;
  const t = calcularTendencia({
    meta: m.meta, realizado: feito, turnosMes: p.turnosMes, turnosDecorridos: p.turnosDecorridos,
  });
  const ida = indiceDispersao(agg[k].res.size, m.efetivo);
  const reg = regularidadeProducao(agg[k].sem);
  const pr = prioridadeAcao(t);
  calc.push({ k, m, feito, t, ida, reg, pr, sem: agg[k].sem, ativos: agg[k].res.size });
  console.log(
    (ROTULO_SUBUNIDADE[k] || k).padEnd(14) + (m.pctMeta.toFixed(2) + "%").padStart(7) +
    n0(m.meta) + n0(feito) + n2(t.ritmoAlvo) + n2(t.ritmoReal ?? 0) +
    n1(t.metaAcumulada) + sg(t.saldoTrajetoria) + n1(t.aderencia ?? 0) +
    n2(t.ritmoRecuperacao) + n1(t.pressaoRecuperacao ?? 0) + n0(t.projecaoFechamento ?? 0) +
    n1(ida.pct ?? 0) + "  " + ROTULO_PRIORIDADE[pr]
  );
}

const btl = calcularTendencia({
  meta: totMeta, realizado: totFeito, turnosMes: p.diasMes, turnosDecorridos: p.diasDecorridos,
});
console.log("-".repeat(96));
console.log(
  "BATALHAO".padEnd(14) + "100,00%".padStart(7) + n0(totMeta) + n0(totFeito) +
  n2(btl.ritmoAlvo) + n2(btl.ritmoReal ?? 0) + n1(btl.metaAcumulada) +
  sg(btl.saldoTrajetoria) + n1(btl.aderencia ?? 0) + n2(btl.ritmoRecuperacao) +
  n1(btl.pressaoRecuperacao ?? 0) + n0(btl.projecaoFechamento ?? 0) + "        " +
  ROTULO_PRIORIDADE[prioridadeAcao(btl)]
);
console.log("   (BATALHAO em evidencias/DIA · fracoes em evidencias/TURNO)");

const eq = indiceEquilibrio(calc.map((c) => c.t.aderencia));
const soma = conferirSomaCotas(calc.map((c) => c.m.meta), 960);
const somaSaldos = calc.reduce((s, c) => s + c.t.saldoTrajetoria, 0);

console.log("\nCONFERENCIAS");
console.log(`  Soma das cotas ................ ${soma.soma}  ${soma.fecha ? "OK — fecha 960" : "DIVERGENTE (" + soma.diferenca + ")"}`);
console.log(`  Cumprimento = SUMfeito/SUMmeta  ${totFeito}/${totMeta} = ${(totFeito / totMeta * 100).toFixed(1).replace(".", ",")}%`);
console.log(`  Soma dos saldos das fracoes ... ${somaSaldos.toFixed(1)}   Batalhao: ${btl.saldoTrajetoria.toFixed(1)}  ${Math.abs(somaSaldos - btl.saldoTrajetoria) < 0.5 ? "(conciliado)" : "(DIVERGENTE)"}`);
console.log(`  Equilibrio de producao ........ ${(eq.cv * 100).toFixed(1)}%  ${eq.classe}`);
console.log(`  Deficit ....................... ${btl.deficit} evidencias`);
console.log(`  Lancamentos fora das 6 fracoes  ${foraDeEscopo}`);

console.log("\nREGULARIDADE — producao por semana (S1 · S2 · S3 · S4)");
for (const c of calc) {
  console.log(`  ${(ROTULO_SUBUNIDADE[c.k] || c.k).padEnd(14)} ${c.sem.join(" · ").padEnd(22)} ${c.reg.classe}${c.reg.gini !== null ? ` (gini ${c.reg.gini.toFixed(2)})` : ""}   auditores ativos: ${c.ativos}/${c.m.efetivo}`);
}
