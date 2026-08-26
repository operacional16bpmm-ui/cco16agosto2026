import { cookies } from "next/headers";
import type { Unidade } from "@/lib/unidades";

/**
 * Sessão do portal: cookie assinado (HMAC-SHA256, Web Crypto — funciona igual
 * em Node e no runtime de borda do proxy.ts), sem Supabase Auth.
 *
 * A partir da migration 019 o login deixou de ser uma credencial única
 * compartilhada e passou a ser individual, com perfil e unidade. Quem valida
 * usuário e senha contra o banco é lib/auth-usuarios.ts (server-only, importa
 * o admin client). ESTE arquivo continua sem tocar o banco de propósito:
 * proxy.ts o importa para rodar na borda, onde não há service role nem
 * conexão com o Supabase.
 *
 * O payload do cookie deixou de ser "usuario.expiraEm.assinatura" e passou a
 * ser "base64url(JSON).assinatura" porque três campos separados por ponto não
 * comportavam perfil e unidade (e um nome de usuário com ponto quebraria o
 * split). A assinatura e a comparação em tempo constante seguem iguais: um
 * cookie forjado (ex.: `curl -b "cco16_sessao=x"`) continua não valendo nada.
 */
export const COOKIE_SESSAO = "cco16_sessao";
const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 12; // 12h (turno)

export type Perfil = "comando" | "estado_maior" | "cmt_cia" | "secao";

export type Sessao = {
  usuario: string;
  nome: string;
  perfil: Perfil;
  /** Unidade do comandante de Companhia; null para os demais perfis. */
  unidade: Unidade | null;
  /**
   * Versão de sessão do usuário no momento do login (migration 023).
   * lib/db/permissoes.ts compara com usuarios_portal.sessao_versao a cada
   * requisição: incrementar no banco derruba o cookie na hora. Ausente em
   * cookie emitido antes da migration (vale como versão 1) e na credencial
   * de emergência (que não tem linha no banco).
   */
  sv?: number;
};

const PERFIS: Perfil[] = ["comando", "estado_maior", "cmt_cia", "secao"];

const SEGREDO = process.env.CCO16_SESSAO_SEGREDO;

/* --------------------------------------------------------------- assinatura */

function segredoOuFalha(): string {
  if (!SEGREDO) {
    throw new Error(
      "CCO16_SESSAO_SEGREDO não configurada — defina uma string aleatória forte no ambiente para assinar a sessão."
    );
  }
  return SEGREDO;
}

function bufferParaHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacHex(valor: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredoOuFalha()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(valor));
  return bufferParaHex(assinatura);
}

export function comparacaoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------- payload do cookie */

export function paraBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deBase64Url(valor: string): string | null {
  try {
    const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function sessaoDoPayload(bruto: unknown): (Sessao & { exp: number }) | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const p = bruto as Record<string, unknown>;
  const usuario = typeof p.usuario === "string" ? p.usuario : null;
  const perfil = typeof p.perfil === "string" && PERFIS.includes(p.perfil as Perfil) ? (p.perfil as Perfil) : null;
  const exp = typeof p.exp === "number" ? p.exp : null;
  if (!usuario || !perfil || exp == null) return null;
  return {
    usuario,
    nome: typeof p.nome === "string" && p.nome ? p.nome : usuario,
    perfil,
    unidade: typeof p.unidade === "string" ? (p.unidade as Unidade) : null,
    ...(typeof p.sv === "number" ? { sv: p.sv } : {}),
    exp,
  };
}

/**
 * Verifica assinatura + expiração de um valor de cookie bruto. Usado tanto por
 * sessaoAtual() (server components/actions) quanto por proxy.ts (que lê o
 * cookie direto de NextRequest, sem acesso a next/headers).
 */
export async function verificarSessao(valorCookie: string): Promise<Sessao | null> {
  const separador = valorCookie.lastIndexOf(".");
  if (separador <= 0) return null;
  const payloadB64 = valorCookie.slice(0, separador);
  const assinatura = valorCookie.slice(separador + 1);

  const esperada = await hmacHex(payloadB64);
  if (!comparacaoConstante(esperada, assinatura)) return null;

  const json = deBase64Url(payloadB64);
  if (!json) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return null;
  }

  const sessao = sessaoDoPayload(bruto);
  if (!sessao) return null;
  if (!Number.isFinite(sessao.exp) || Date.now() > sessao.exp) return null;

  const { exp: _exp, ...limpa } = sessao;
  void _exp;
  return limpa;
}

/* ------------------------------------------------------------ ciclo de vida */

export async function definirSessao(sessao: Sessao) {
  const exp = Date.now() + DURACAO_SESSAO_SEGUNDOS * 1000;
  const payloadB64 = paraBase64Url(JSON.stringify({ ...sessao, exp }));
  const valor = `${payloadB64}.${await hmacHex(payloadB64)}`;
  const c = await cookies();
  c.set(COOKIE_SESSAO, valor, {
    httpOnly: true,
    sameSite: "lax",
    // Servido pela Vercel, o portal é HTTPS e o cookie tem que ser Secure. No
    // servidor local da intranet ele é HTTP puro, e um cookie Secure
    // simplesmente NÃO é gravado pelo navegador fora de localhost: o login
    // parecia recusar a senha certa quando acessado pelo IP da rede. A variável
    // CCO16_HTTP_INTRANET desliga a marca só nesse cenário, que já é todo em
    // texto claro dentro da rede interna, então nada se perde com isso.
    secure: process.env.NODE_ENV === "production" && process.env.CCO16_HTTP_INTRANET !== "1",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
}

export async function limparSessao() {
  const c = await cookies();
  c.delete(COOKIE_SESSAO);
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const c = await cookies();
  const v = c.get(COOKIE_SESSAO)?.value;
  return v ? verificarSessao(v) : null;
}
