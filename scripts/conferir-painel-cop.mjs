/**
 * Confere os números do painel contra a PLANILHA REAL, sem subir servidor.
 *
 * Existe porque o painel só é auditável de fora: o Comando valida por print, e
 * um número errado só aparece depois de publicado. Aqui as mesmas funções puras
 * que a tela usa rodam contra o CSV publicado e imprimem o que a tela diria.
 *
 * ATENÇÃO ao comparar com a tela: em produção `lerAuditoriaCop2026` serve
 * planilha ANTES do corte + banco (`lerComBanco`), e o banco não é alcançável
 * daqui sem as credenciais do Supabase. Os TOTAIS podem divergir da tela; o que
 * este script prova é a ARITMÉTICA — semanas, mínimo, ritmo, meta/dia, cotas.
 *
 *   npm run conferir:painel            # mês corrente
 *   npm run conferir:painel 2026-08-01 2026-08-31
 */
import { extrairLancamentos, extrairMetas } from "@/lib/cop2026";
import {
  FILTROS_VAZIOS,
  calcularPainel,
  filtrosDoMesCorrente,
  veredito,
} from "@/lib/cop2026-metricas";
import { parseCsv } from "@/lib/inventario-2026";

const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
const url = (gid) =>
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${gid}&single=true&output=csv`;

const baixar = async (gid) => parseCsv(await (await fetch(url(gid))).text());

const [de, ate] = process.argv.slice(2);
const filtros = de && ate ? { ...FILTROS_VAZIOS, de, ate } : filtrosDoMesCorrente();

const [linhasRespostas, linhasParametros] = await Promise.all([
  baixar("305359783"),
  baixar("1587286327"),
]);

const lancamentos = extrairLancamentos(linhasRespostas);
const metas = extrairMetas(linhasParametros);
const p = calcularPainel(lancamentos, metas, filtros);
const v = veredito(p);

const n = (x) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(x);

console.log(`\nRECORTE ${p.janela.de} → ${p.janela.ate}`);
console.log(`  dia ${p.janela.decorridos} de ${p.janela.dias} · ${p.janela.diasRestantes} restantes`);
console.log(`  turnos-fração ${p.janela.turnosFracaoDecorridos} de ${p.janela.turnosFracao}`);
console.log(`  dias com lançamento ${p.diasComLancamento}`);

console.log(`\nMETA ${n(p.meta)} · TOTAL ${n(p.total)} · ${n(p.pct)}% · faltam ${n(p.falta)}`);
console.log(`  ${v.titulo}`);
console.log(`  ${v.detalhe}`);
console.log(`  meta/dia ${n(p.metaDia)} · ritmo necessário ${n(p.ritmoNecessario)}/dia`);
console.log(`  mínimo exigido: ${p.minimo} · conformidade ${n(p.taxaConf)}%`);

const somaFracoes = p.fracoes.reduce((s, f) => s + f.feito, 0);
console.log(`\nFRAÇÕES (soma ${n(somaFracoes)} + órfãs ${n(p.semFracao.videos)} = ${n(somaFracoes + p.semFracao.videos)})`);
for (const f of p.fracoes) {
  console.log(
    `  ${f.rotulo.padEnd(14)} ${String(f.feito).padStart(4)}/${String(f.meta).padEnd(4)} ` +
      `${n(f.pct).padStart(6)}% · alvo ${n(f.ritmoProporcional ?? 0)}/turno · ` +
      `recuperar ${n(f.ritmoNecessario)}/turno em ${f.turnosRestantes}`
  );
}
if (p.semFracao.lancamentos)
  console.log(`  SEM FRAÇÃO     ${String(p.semFracao.videos).padStart(4)} em ${p.semFracao.lancamentos} lançamento(s), ${p.semFracao.auditores} auditor(es)`);

console.log(`\nSEMANAS (soma ${n(p.semanasBatalhao.reduce((s, x) => s + x.feito, 0))})`);
for (const s of p.semanasBatalhao)
  console.log(`  ${s.rotulo} (${s.diasRotulo}) ${String(s.feito).padStart(5)}/${s.meta} · ${n(s.pct)}%`);

console.log(`\nEXCEÇÕES`);
console.log(`  não auditaram ${p.naoAuditou} · abaixo do mínimo ${p.abaixo} · sem IDs ${p.semIds}`);
console.log(`  ID fora do formato ${p.comIdInvalido} · ID já auditado por outro ${p.comIdDuplicado} (${p.idsDuplicadosNoRecorte} ID distintos)`);
for (const d of p.duplicadoLista) console.log(`    ${d.quem} (${d.fracao}, ${d.data}): ${d.ids.join(" ")}`);

const cpfRedigido = p.dados.filter((l) => /\[CPF removido\]/.test(l.idsMidia));
console.log(`\nREDAÇÃO DE CPF em campo de ID: ${cpfRedigido.length} lançamento(s)`);
for (const l of cpfRedigido) console.log(`    ${l.nomeGuerra}: ${l.idsMidia.replace(/\s+/g, " ").slice(0, 120)}`);
console.log("");
