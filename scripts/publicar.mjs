#!/usr/bin/env node
/**
 * PUBLICAR — o único comando de deploy do portal. `npm run publicar`.
 *
 * ================================================================= o problema
 *
 * Até 09/09/2026 publicar era uma sequência de quinze passos escrita no
 * AGENTS.md, e cada armadilha dela já custou pelo menos um susto:
 *
 * 1. **Dois clones divergindo sem remote.** O trabalho acontece no pc3
 *    (`/home/verti/...`) e no pc1 (`/home/pc1/...`), com sessões diferentes
 *    mexendo nos dois. Sem `git remote`, sincronizar virava `git bundle` na
 *    mão — e num desses o pc1 tinha um commit que o pc3 não tinha
 *    (`e5e6b44`, o conserto do export no iPhone): um `--force` distraído teria
 *    apagado o trabalho de outra sessão.
 * 2. **Dois projetos Vercel com o MESMO nome.** `portal-cco16` existe no time
 *    `16bpmm` (alias `portal-cco16-eta`) e no time `avertice` (alias
 *    `portal-cco16.vercel.app`, o que o Batalhão usa). O clone do pc3 estava
 *    ligado ao PRIMEIRO: um `vercel --prod` daqui publicava, dizia "Ready", e
 *    não mudava nada no endereço que o Comando abre.
 * 3. **A credencial só existe no pc1.** O `auth.json` do CLI é um token OAuth
 *    de vida curta com `refreshToken` — copiá-lo para outro nó funciona até
 *    vencer e depois quebra calado. Por isso o deploy SEMPRE roda no pc1,
 *    onde o CLI se renova sozinho; os outros nós chamam por SSH.
 * 4. **Nenhuma forma de saber o que estava no ar.** Sem integração de git, a
 *    Vercel não registra commit nenhum. Conferir virava procurar uma frase no
 *    HTML — e quando a mudança não era de texto (cor, gate, proxy), não havia
 *    o que procurar.
 *
 * ================================================================= o que faz
 *
 * Na ordem, parando no primeiro erro:
 *
 *   1. confere que a árvore está limpa e que o clone aponta para o projeto CERTO;
 *   2. `tsc --noEmit` e os 14 gates do AGENTS.md;
 *   3. `git push` para o pc1 (o `receive.denyCurrentBranch=updateInstead` de lá
 *      faz a árvore dele seguir o push, então os dois clones ficam iguais);
 *   4. `vercel --prod --yes` NO PC1, carimbando o SHA e o horário como env do
 *      deploy;
 *   5. lê `/api/cop2026/versao` na produção até ver o commit que acabou de
 *      mandar. Só então diz que publicou.
 *
 * O passo 5 é o que separa este script do `vercel --prod` cru: "o CLI não deu
 * erro" nunca foi prova de que o Batalhão está vendo o código novo.
 *
 * ================================================================= como usar
 *
 *   npm run publicar                 # confere, publica e valida
 *   npm run publicar -- --sem-gates  # pula tsc e os 14 gates (só urgência real)
 *   npm run publicar -- --seco       # mostra o que faria e não publica
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { hostname } from "node:os";

const ARGS = process.argv.slice(2);
const SEM_GATES = ARGS.includes("--sem-gates");
const SECO = ARGS.includes("--seco");

/** O projeto do Batalhão. Um clone ligado a outro `orgId` publica no vazio. */
const ORG_CERTA = "team_aIGPsabZTK6rA7CuUXNKYfJh"; // A Vértice Hub Soluções
const PROJETO_CERTO = "prj_OmnVH0mUprxpgRiGzoMkVTzKfOvQ";
const PRODUCAO = "https://portal-cco16.vercel.app";
/** Onde o CLI da Vercel está autenticado. Ver nota 3 acima. */
const NO_DE_DEPLOY = "pc1";
const CAMINHO_NO_PC1 = "/home/pc1/_workspace/pmesp/portal-cco16";

/* Os mesmos gates do AGENTS.md, na mesma ordem. Lista aqui e não no
   package.json para o script poder dizer QUAL falhou. */
const GATES = [
  "vocabulario", "dado-pessoal", "periodo", "lancamento", "paridade",
  "painel", "tendencia", "unidades", "indices", "excecoes",
  "unidade-declarada", "navegacao", "rotas", "seguranca",
];

const cor = (c, t) => `\x1b[${c}m${t}\x1b[0m`;
const ok = (t) => console.log(`  ${cor(32, "✓")} ${t}`);
const passo = (t) => console.log(`\n${cor(36, "▸")} ${t}`);
function morrer(t, dica) {
  console.error(`\n${cor(31, "✗")} ${t}`);
  if (dica) console.error(`  ${dica}`);
  process.exit(1);
}

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...opts }).trim();

/* ------------------------------------------------------------ 1. sanidade */

passo("Conferindo o terreno");

const noPc1 = hostname() === NO_DE_DEPLOY;

const sujo = sh("git", ["status", "--porcelain"]);
if (sujo) {
  morrer(
    "a árvore tem mudança não commitada:\n" + sujo.split("\n").map((l) => "    " + l).join("\n"),
    "Publicar assim manda para produção um código que não está no histórico. " +
      "Commite (só os SEUS arquivos, pelo nome — outras sessões editam esta mesma árvore) e rode de novo."
  );
}
ok("árvore limpa");

const link = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
if (link.orgId !== ORG_CERTA || link.projectId !== PROJETO_CERTO) {
  morrer(
    `este clone está ligado ao projeto Vercel ERRADO (org ${link.orgId}).`,
    "Existem dois projetos chamados `portal-cco16`. O do Batalhão é o do time " +
      `avertice (${ORG_CERTA}) — é ele que responde em ${PRODUCAO}. ` +
      "Corrija `.vercel/project.json` antes de publicar."
  );
}
ok("ligado ao projeto do Batalhão (avertice)");

const sha = sh("git", ["rev-parse", "HEAD"]);
const shaCurto = sha.slice(0, 8);
const assunto = sh("git", ["log", "-1", "--pretty=%s"]);
ok(`commit ${shaCurto} — ${assunto}`);

/* --------------------------------------------------------------- 2. gates */

if (SEM_GATES) {
  console.log(`\n${cor(33, "!")} --sem-gates: tsc e os 14 gates NÃO rodaram.`);
} else {
  passo("Verificações (tsc + 14 gates)");
  try {
    sh("npx", ["tsc", "--noEmit"], { stdio: ["ignore", "pipe", "pipe"] });
    ok("tsc");
  } catch (e) {
    morrer("tsc reprovou:\n" + String(e.stdout || e.message).split("\n").slice(-15).join("\n"));
  }
  for (const g of GATES) {
    try {
      sh("npm", ["run", "--silent", `verificar:${g}`], { stdio: ["ignore", "pipe", "pipe"] });
      ok(g);
    } catch (e) {
      morrer(
        `o gate \`verificar:${g}\` reprovou:`,
        String(e.stdout || e.stderr || e.message).split("\n").slice(-20).join("\n")
      );
    }
  }
}

/* ------------------------------------------------------- 3. sincronizar */

if (!noPc1) {
  passo(`Sincronizando com o ${NO_DE_DEPLOY}`);
  /* O pc1 tem `receive.denyCurrentBranch=updateInstead`: o push atualiza a
     árvore de trabalho dele junto, desde que esteja limpa. Se alguém estiver
     com alteração aberta lá, o push é RECUSADO — e é o comportamento certo:
     melhor falhar aqui do que publicar por cima do trabalho de outra sessão. */
  try {
    sh("git", ["push", "origin", "HEAD:master"], { stdio: ["ignore", "pipe", "pipe"] });
    ok(`${shaCurto} entregue ao ${NO_DE_DEPLOY}`);
  } catch (e) {
    const saida = String(e.stdout || e.stderr || e.message);
    morrer(
      `o push para o ${NO_DE_DEPLOY} foi recusado.`,
      saida.includes("non-fast-forward") || saida.includes("fetch first")
        ? "O pc1 tem commit que este clone não tem — provavelmente de outra sessão. " +
          "Rode `git pull --rebase origin master`, confira, e publique de novo. NÃO use --force."
        : saida.includes("uncommitted") || saida.includes("dirty")
          ? "A árvore do pc1 está suja. Veja com: ssh pc1 'cd " + CAMINHO_NO_PC1 + " && git status --short'"
          : saida.split("\n").slice(-8).join("\n")
    );
  }
}

/* -------------------------------------------------------------- 4. deploy */

const publicadoEm = new Date().toISOString();
const cmdVercel =
  `cd ${CAMINHO_NO_PC1} && npx vercel --prod --yes ` +
  `-e COP2026_COMMIT=${sha} -e COP2026_PUBLICADO_EM=${publicadoEm}`;

if (SECO) {
  console.log(`\n${cor(33, "--seco")}: pararia aqui. O comando seria, no ${NO_DE_DEPLOY}:\n  ${cmdVercel}`);
  process.exit(0);
}

passo(`Publicando (build na Vercel, disparado do ${NO_DE_DEPLOY})`);
let saidaDeploy = "";
try {
  saidaDeploy = noPc1
    ? sh("sh", ["-c", cmdVercel], { stdio: ["ignore", "pipe", "pipe"], timeout: 900_000 })
    : sh("ssh", [NO_DE_DEPLOY, cmdVercel], { stdio: ["ignore", "pipe", "pipe"], timeout: 900_000 });
} catch (e) {
  morrer(
    "a Vercel recusou o deploy.",
    String(e.stdout || e.stderr || e.message).split("\n").slice(-20).join("\n") +
      "\n  Log completo do build: npx vercel inspect --logs <url-do-deploy>"
  );
}
const url = (saidaDeploy.match(/https:\/\/portal-cco16-[a-z0-9-]+\.vercel\.app/g) || []).pop();
ok(`build pronto${url ? ` — ${url}` : ""}`);
if (/Aliased/.test(saidaDeploy)) ok("alias movido para portal-cco16.vercel.app");

/* ---------------------------------------------------------- 5. confirmar */

passo("Confirmando na produção");
/* "O CLI não deu erro" não é prova. A prova é o commit aparecer em
   /api/cop2026/versao, servido pelo alias que o Batalhão abre. */
const ate = Date.now() + 180_000;
let visto = null;
while (Date.now() < ate) {
  try {
    const r = await fetch(`${PRODUCAO}/api/cop2026/versao`, { cache: "no-store" });
    if (r.ok) {
      visto = await r.json();
      if (visto.commit === sha) break;
    }
  } catch {
    /* rede oscilando durante a troca de alias — insistir é o certo aqui. */
  }
  await new Promise((r) => setTimeout(r, 5000));
}

if (!visto || visto.commit !== sha) {
  morrer(
    `a produção ainda não responde com ${shaCurto} depois de 3 minutos.`,
    `Está servindo: ${visto?.commit?.slice(0, 8) ?? "(sem resposta)"}. ` +
      `O build subiu, mas o alias pode não ter movido — confira com ` +
      `\`ssh ${NO_DE_DEPLOY} 'cd ${CAMINHO_NO_PC1} && npx vercel inspect ${url ?? "<url>"}'\`.`
  );
}
ok(`${PRODUCAO} servindo ${shaCurto} · portal ${visto.versaoPortal}`);

/* Uma varredura final nas telas que o Comando abre: build pronto e alias no
   lugar não impedem uma página de quebrar em runtime. */
const TELAS = ["/cop2026", "/cop2026/dashboard", "/cop2026/briefing", "/cop2026/lancar", "/cop2026/relatorios"];
const quebradas = [];
for (const t of TELAS) {
  const r = await fetch(PRODUCAO + t, { cache: "no-store" }).catch(() => null);
  if (!r || !r.ok) quebradas.push(`${t} → ${r ? r.status : "sem resposta"}`);
}
if (quebradas.length) {
  morrer("telas fora do ar depois do deploy:\n    " + quebradas.join("\n    "));
}
ok(`${TELAS.length} telas respondendo`);

console.log(`\n${cor(32, "PUBLICADO")}  ${shaCurto} · ${assunto}\n`);
