/**
 * Backup diário do banco do portal — roda no pc2, custo zero.
 *
 * POR QUE NÃO `pg_dump`: o dump nativo exige a senha do Postgres, que não está
 * em cofre nenhum e cuja rotação quebraria as outras integrações. O PAT de
 * gerência do Supabase não a expõe. Então o backup é LÓGICO, pela API REST com
 * a service key: cada tabela vira um `.ndjson` paginado.
 *
 * ISSO É UM BACKUP DE VERDADE? É, porque a outra metade já está versionada: o
 * SCHEMA mora em `supabase/migrations/*.sql`, no git. Restaurar = aplicar as
 * migrations num projeto novo e reinserir os `.ndjson`. O que este desenho NÃO
 * cobre e precisa estar claro: sequences, triggers criados fora de migration e
 * qualquer objeto que alguém tenha feito à mão no console — mais um motivo para
 * nada nascer fora de migration.
 *
 * BACKUP QUE NUNCA FOI RESTAURADO É ESPERANÇA, NÃO BACKUP: `--verificar` relê
 * cada arquivo gerado, confere o JSON linha a linha e compara a contagem com a
 * do banco. É o mínimo que separa arquivo gravado de cópia confiável.
 *
 *   node scripts/backup-cop.mjs --destino /caminho [--verificar]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !CHAVE) {
  console.error("[backup] faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const destinoBase = args[args.indexOf("--destino") + 1] ?? "./backup-cop";
const verificar = args.includes("--verificar");

/** Tudo que é dado do domínio. Nova tabela entra aqui — e o teste de segurança
 *  já obriga a declarar tabela nova em algum lugar, então não passa batido. */
const TABELAS = [
  "cop_auditoria_lancamento",
  "cop_evidencia",
  "cop_auditoria_parametro",
  "cop_auditoria_trilha",
  "cop_verificacao_execucao",
  "cop_rotina_execucao",
  "cop_unidade",
  "cop2026_autorizados",
  "cop2026_auditor",
  "usuarios_portal",
  "dejem_escalas",
  "dejem_escalados_opm",
  "dejem_jornadas",
  "dejem_log_presenca",
  "dejem_benchmark_gc",
];

const PAGINA = 1000;

async function contar(tabela) {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=*`, {
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      Range: "0-0",
      Prefer: "count=exact",
    },
  });
  if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status}`);
  const faixa = r.headers.get("content-range") ?? "*/0";
  const total = faixa.split("/")[1];
  return total === "*" ? 0 : Number(total);
}

/** Paginado: uma tabela de 28 mil linhas não vem numa resposta só. */
async function baixar(tabela, arquivo) {
  const linhas = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=*`, {
      headers: {
        apikey: CHAVE,
        Authorization: `Bearer ${CHAVE}`,
        Range: `${inicio}-${inicio + PAGINA - 1}`,
      },
    });
    if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status}`);
    const lote = await r.json();
    if (!Array.isArray(lote) || lote.length === 0) break;
    for (const l of lote) linhas.push(JSON.stringify(l));
    if (lote.length < PAGINA) break;
  }
  const conteudo = linhas.join("\n") + (linhas.length ? "\n" : "");
  await writeFile(arquivo, conteudo, "utf8");
  return {
    linhas: linhas.length,
    bytes: Buffer.byteLength(conteudo),
    sha256: createHash("sha256").update(conteudo).digest("hex"),
  };
}

/** Relê o que acabou de gravar. Sem isto, "backup ok" só significa "escreveu". */
async function conferir(arquivo, esperado) {
  const bruto = await readFile(arquivo, "utf8");
  const linhas = bruto.split("\n").filter(Boolean);
  if (linhas.length !== esperado) {
    throw new Error(`releitura deu ${linhas.length} linhas, esperava ${esperado}`);
  }
  for (const l of linhas) JSON.parse(l); // JSON corrompido estoura aqui
  return true;
}

const inicio = Date.now();
const dia = new Date().toISOString().slice(0, 10);
const destino = path.join(destinoBase, dia);
await mkdir(destino, { recursive: true });

const manifesto = { gerado_em: new Date().toISOString(), projeto: URL_BASE, tabelas: {} };
let falhas = 0;

for (const tabela of TABELAS) {
  try {
    const noBanco = await contar(tabela);
    const arquivo = path.join(destino, `${tabela}.ndjson`);
    const r = await baixar(tabela, arquivo);

    /* A contagem do banco tem de bater com a do arquivo. Divergência aqui é
       backup parcial — o pior tipo, porque parece completo. */
    if (r.linhas !== noBanco) {
      throw new Error(`baixou ${r.linhas} de ${noBanco} linhas`);
    }
    if (verificar) await conferir(arquivo, noBanco);

    manifesto.tabelas[tabela] = { ...r, verificado: verificar };
    console.log(`  ✓ ${tabela.padEnd(28)} ${String(r.linhas).padStart(7)} linhas`);
  } catch (erro) {
    falhas += 1;
    manifesto.tabelas[tabela] = { erro: erro.message };
    console.error(`  ✗ ${tabela.padEnd(28)} ${erro.message}`);
  }
}

manifesto.duracao_ms = Date.now() - inicio;
manifesto.falhas = falhas;
await writeFile(path.join(destino, "manifesto.json"), JSON.stringify(manifesto, null, 2));

const total = Object.values(manifesto.tabelas).reduce((s, t) => s + (t.linhas ?? 0), 0);
console.log(
  `\n[backup] ${destino} · ${total} linhas · ${(manifesto.duracao_ms / 1000).toFixed(1)}s · ${falhas} falha(s)`
);
process.exit(falhas > 0 ? 1 : 0);
