/**
 * Backup diário do banco do portal — roda no pc2, custo zero.
 *
 * ONDE A CHAVE **NÃO** ESTÁ: este script não tem a `service_role` do Supabase e
 * não pode tê-la. Ela ignora RLS por completo, e o pc2 é máquina sem firewall
 * (`ufw` desligado, `iptables` vazio) — um arquivo lido ali entregaria o banco
 * inteiro, para sempre, sem rastro.
 *
 * Em vez disso o pc2 puxa de `/api/cop2026/backup`, que roda dentro da Vercel
 * com a chave e devolve NDJSON. O pc2 carrega apenas `CCO16_BACKUP_TOKEN`, que
 * só lê, só as tabelas da lista fechada da rota, e é rotacionável em segundos
 * sem tocar no banco.
 *
 * POR QUE NÃO `pg_dump`: exigiria a senha do Postgres, que não está em cofre
 * nenhum e cuja rotação quebraria as outras integrações. A outra metade do
 * backup já está versionada: o SCHEMA mora em `supabase/migrations/*.sql`, no
 * git. Restaurar = aplicar as migrations num projeto novo e reinserir os
 * `.ndjson`. O que este desenho NÃO cobre: sequences e qualquer objeto criado à
 * mão no console, fora de migration — mais um motivo para nada nascer assim.
 *
 * BACKUP QUE NUNCA FOI RESTAURADO É ESPERANÇA: `--verificar` relê cada arquivo
 * gerado, faz o parse linha a linha e compara a contagem com a do banco.
 *
 *   node scripts/backup-cop.mjs --destino /caminho [--verificar]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const BASE = (process.env.CCO16_BACKUP_URL ?? "https://portal-cco16.vercel.app").replace(/\/$/, "");
const TOKEN = process.env.CCO16_BACKUP_TOKEN;

if (!TOKEN) {
  console.error("[backup] falta CCO16_BACKUP_TOKEN no ambiente.");
  process.exit(1);
}

const args = process.argv.slice(2);
const destinoBase = args[args.indexOf("--destino") + 1] ?? "./backup-cop";
const verificar = args.includes("--verificar");
const PAGINA = 1000;

async function buscar(caminho) {
  const r = await fetch(`${BASE}/api/cop2026/backup${caminho}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
  return r;
}

/** A lista vem da rota, não daqui: embutida do lado do pc2 ela envelheceria em
 *  silêncio toda vez que uma tabela nova nascesse. */
async function listarTabelas() {
  const r = await buscar("");
  const { tabelas } = await r.json();
  if (!Array.isArray(tabelas) || tabelas.length === 0) {
    throw new Error("a rota não devolveu tabela nenhuma");
  }
  return tabelas;
}

async function baixar(tabela, arquivo) {
  const linhas = [];
  let total = 0;
  for (let inicio = 0; ; inicio += PAGINA) {
    const r = await buscar(`?tabela=${encodeURIComponent(tabela)}&inicio=${inicio}&tamanho=${PAGINA}`);
    total = Number(r.headers.get("x-total") ?? 0);
    const texto = await r.text();
    const lote = texto.split("\n").filter(Boolean);
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  const conteudo = linhas.join("\n") + (linhas.length ? "\n" : "");
  await writeFile(arquivo, conteudo, "utf8");
  return {
    linhas: linhas.length,
    noBanco: total,
    bytes: Buffer.byteLength(conteudo),
    sha256: createHash("sha256").update(conteudo).digest("hex"),
  };
}

/** Relê o que acabou de gravar. Sem isto, "backup ok" só significa "escreveu". */
async function conferir(arquivo, esperado) {
  const linhas = (await readFile(arquivo, "utf8")).split("\n").filter(Boolean);
  if (linhas.length !== esperado) {
    throw new Error(`releitura deu ${linhas.length} linhas, esperava ${esperado}`);
  }
  for (const l of linhas) JSON.parse(l); // JSON corrompido estoura aqui
}

const inicio = Date.now();
const dia = new Date().toISOString().slice(0, 10);
const destino = path.join(destinoBase, dia);
await mkdir(destino, { recursive: true });

const manifesto = { gerado_em: new Date().toISOString(), origem: BASE, tabelas: {} };
let falhas = 0;

for (const tabela of await listarTabelas()) {
  try {
    const arquivo = path.join(destino, `${tabela}.ndjson`);
    const r = await baixar(tabela, arquivo);

    /* A contagem do banco tem de bater com a do arquivo. Divergência aqui é
       backup PARCIAL — o pior tipo, porque parece completo. */
    if (r.linhas !== r.noBanco) {
      throw new Error(`baixou ${r.linhas} de ${r.noBanco} linhas`);
    }
    if (verificar) await conferir(arquivo, r.noBanco);

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
