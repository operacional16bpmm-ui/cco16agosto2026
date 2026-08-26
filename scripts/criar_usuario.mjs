// Cadastro de usuário do portal (public.usuarios_portal, migration 019).
//
// Uso:
//   node scripts/criar_usuario.mjs <usuario> <perfil> <unidade|-> "<Nome de exibição>" [senha]
//
// Exemplos:
//   node scripts/criar_usuario.mjs cmt1cia cmt_cia 1 "Cap PM Cmt 1ª Cia"
//   node scripts/criar_usuario.mjs comando comando - "Cmt do 16º BPM/M" SenhaForte123
//
// Sem o argumento de senha, o script sorteia uma senha provisória e a imprime
// UMA vez: entregue ao titular e oriente a troca. A senha nunca é gravada em
// texto puro (PBKDF2-SHA256, 210k iterações, salt por usuário — os mesmos
// parâmetros de lib/auth-usuarios.ts).
//
// Reexecutar para um usuário já existente troca a senha e os dados dele
// (upsert por `usuario`).
import { readFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) throw new Error("Faltam URL/service key no .env.local");

const ITERACOES = 210_000;
const PERFIS = ["comando", "estado_maior", "cmt_cia", "secao"];
const UNIDADES = ["1", "2", "3", "4", "ft"];

const [usuarioBruto, perfil, unidadeBruta, nome, senhaArg] = process.argv.slice(2);

if (!usuarioBruto || !perfil || !unidadeBruta || !nome) {
  console.error(
    'Uso: node scripts/criar_usuario.mjs <usuario> <perfil> <unidade|-> "<Nome>" [senha]\n' +
      `  perfil:  ${PERFIS.join(" | ")}\n` +
      `  unidade: ${UNIDADES.join(" | ")} | -  (use "-" para quem não comanda Companhia)`
  );
  process.exit(1);
}

const usuario = usuarioBruto.trim().toLowerCase();
const unidade = unidadeBruta === "-" ? null : unidadeBruta;

if (!PERFIS.includes(perfil)) throw new Error(`Perfil inválido: ${perfil}`);
if (unidade !== null && !UNIDADES.includes(unidade)) throw new Error(`Unidade inválida: ${unidade}`);
if (perfil === "cmt_cia" && unidade === null) throw new Error("Perfil cmt_cia exige unidade.");

const hex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

function senhaProvisoria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

async function derivar(senha, saltHex) {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), (b) => parseInt(b, 16));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERACOES, hash: "SHA-256" },
    chave,
    256
  );
  return hex(bits);
}

const senha = senhaArg ?? senhaProvisoria();
const saltHex = hex(crypto.getRandomValues(new Uint8Array(16)));
const senhaHash = await derivar(senha, saltHex);

const resposta = await fetch(`${URL_BASE}/rest/v1/usuarios_portal?on_conflict=usuario`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify([
    {
      usuario,
      senha_hash: senhaHash,
      senha_salt: saltHex,
      iteracoes: ITERACOES,
      nome_exibicao: nome,
      perfil,
      unidade,
      ativo: true,
      // Chave provisória sorteada por este script: intercepta o próximo
      // login em /trocar-senha (migration 023), mesma regra da tela
      // /administrativo/usuarios. Só não marca quando a senha foi passada
      // explícita no argumento (reset feito por quem já conhece a senha).
      deve_trocar_senha: !senhaArg,
    },
  ]),
});

if (!resposta.ok) {
  console.error(`Falha ao gravar (${resposta.status}):`, await resposta.text());
  process.exit(1);
}

console.log(`Usuário gravado: ${usuario} | perfil ${perfil} | unidade ${unidade ?? "-"} | ${nome}`);
if (!senhaArg) console.log(`Senha provisória (anote agora, não será exibida de novo): ${senha}`);
