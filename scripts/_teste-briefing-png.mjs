/* Teste local, temporário, da exportação do painel em PNG.
   Assina um cookie de acesso da COP com o mesmo algoritmo de lib/auth-simples.ts
   e bate na rota /api/cop2026/briefing-png do servidor local.
   Uso: node scripts/_teste-briefing-png.mjs <email> [porta] */
import env from "@next/env";
import { writeFileSync } from "node:fs";

env.loadEnvConfig(process.cwd());

const email = (process.argv[2] || "").toLowerCase();
const porta = process.argv[3] || "3401";
if (!email) throw new Error("informe o email autorizado");

function paraBase64Url(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacHex(valor) {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.CCO16_SESSAO_SEGREDO),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(valor));
  return Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const payload = paraBase64Url(
  JSON.stringify({ email, exp: Date.now() + 12 * 60 * 60 * 1000 })
);
const cookie = `${payload}.${await hmacHex(payload)}`;

const inicio = Date.now();
const r = await fetch(`http://localhost:${porta}/api/cop2026/briefing-png`, {
  headers: { cookie: `cop16_acesso=${cookie}` },
});
const ms = Date.now() - inicio;

if (!r.ok) {
  console.log(`FALHOU ${r.status} em ${ms}ms:`, (await r.text()).slice(0, 600));
  process.exit(1);
}

const buf = Buffer.from(await r.arrayBuffer());
writeFileSync("/tmp/briefing-teste.png", buf);
console.log(
  `OK ${r.status} · ${(buf.length / 1024).toFixed(0)} KB · ${ms}ms · ${r.headers.get("content-disposition")}`
);
