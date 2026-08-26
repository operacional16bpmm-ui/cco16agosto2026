/**
 * Acesso restrito ao Dashboard de controle e ao Briefing executivo da
 * Auditoria de COP 2026.
 *
 * Por que Google e não o login do portal: o Comando já distribuiu as abas
 * restritas da planilha para uma lista de contas Google nominais. Pedir uma
 * segunda credencial para ver o mesmo dado seria inventar um cadastro paralelo
 * — e senha que ninguém usa é senha que vira bilhete no monitor. Aqui a pessoa
 * entra com a MESMA conta que já abre a planilha, e a lista de autorizados é a
 * mesma lista.
 *
 * A sessão emitida é própria e mínima: guarda só o email e o vencimento,
 * assinada com o segredo que o portal já usa. Nenhum token do Google é
 * guardado — depois do handshake ele não serve para mais nada aqui.
 */
import { deBase64Url, hmacHex, paraBase64Url, comparacaoConstante } from "@/lib/auth-simples";

export const COOKIE_ACESSO_COP = "cop16_acesso";
export const COOKIE_ESTADO_COP = "cop16_oauth";
/** Um turno. Mesma duração da sessão do portal. */
export const DURACAO_ACESSO_SEGUNDOS = 60 * 60 * 12;

/** Rotas que deixam de herdar o "público" de /cop2026. A página de acesso e as
 *  rotas de handshake precisam continuar abertas, senão o login não acontece. */
export const ROTAS_RESTRITAS_COP = ["/cop2026/dashboard", "/cop2026/briefing", "/cop2026/admin"];

export const ROTA_ACESSO_COP = "/cop2026/acesso";

/**
 * Parser tolerante de lista de emails em variável de ambiente. Separadores
 * aceitos: vírgula, ponto e vírgula, espaço ou quebra de linha — o Comando
 * manda a lista colada do WhatsApp e ela precisa funcionar assim mesmo.
 */
export function emailsDaEnv(bruto: string | undefined): string[] {
  return (bruto ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/**
 * A lista de autorizados MUDOU DE CASA: hoje vive na tabela
 * cop2026_autorizados (migration 025), administrada em /cop2026/admin, para
 * que incluir ou remover alguém não dependa de deploy. Esta variável continua
 * valendo como semente da primeira carga e como plano B enquanto a tabela
 * nunca foi semeada — a regra inteira está em lib/db/cop2026-autorizados.ts.
 */
export function emailsAutorizadosDaEnv(): string[] {
  return emailsDaEnv(process.env.COP2026_EMAILS_AUTORIZADOS);
}

/** Quem administra a lista. Deliberadamente FORA do banco: é o que impede o
 *  administrador de se trancar do lado de fora ao se remover da lista, e o que
 *  mantém a administração de pé se o Supabase cair. Mesma doutrina da
 *  credencial de emergência do portal em lib/auth-usuarios.ts. */
export function adminsDaEnv(): string[] {
  return emailsDaEnv(process.env.COP2026_ADMINS);
}

/** Comparação em tempo constante contra uma lista já normalizada. */
export function constaNaLista(email: string, lista: string[]): boolean {
  const alvo = email.trim().toLowerCase();
  return lista.some((e) => comparacaoConstante(e, alvo));
}

export function ehAdminCop(email: string | undefined | null): boolean {
  return Boolean(email) && constaNaLista(email as string, adminsDaEnv());
}

/* --------------------------------------------------------------- sessão */

export type PayloadAcesso = { email: string; nome?: string; exp: number };

export async function assinarAcesso(email: string, nome?: string): Promise<string> {
  const exp = Date.now() + DURACAO_ACESSO_SEGUNDOS * 1000;
  const payload = paraBase64Url(JSON.stringify({ email: email.toLowerCase(), nome, exp }));
  return `${payload}.${await hmacHex(payload)}`;
}

/**
 * Verifica APENAS assinatura e vencimento do cookie. Não consulta a lista de
 * autorizados: esta função é chamada pelo proxy.ts, que roda na borda, e
 * puxar o Supabase para cá arrastaria o cliente de service role para dentro do
 * bundle da middleware.
 *
 * Quem precisa da checagem completa — "este email AINDA está autorizado?" —
 * chama sessaoCop() de lib/db/cop2026-autorizados.ts, que é o que as páginas
 * restritas fazem. É essa recheca por requisição que faz a revogação valer na
 * hora, sem esperar o cookie de 12h vencer.
 */
export async function verificarAssinaturaAcesso(
  valor: string | undefined
): Promise<PayloadAcesso | null> {
  if (!valor) return null;
  const [payload, assinatura] = valor.split(".");
  if (!payload || !assinatura) return null;
  if (!comparacaoConstante(await hmacHex(payload), assinatura)) return null;

  const bruto = deBase64Url(payload);
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as PayloadAcesso;
    if (!dados?.email || typeof dados.exp !== "number") return null;
    if (Date.now() > dados.exp) return null;
    return dados;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- OAuth */

const GOOGLE_AUTORIZACAO = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const EMISSORES_VALIDOS = ["https://accounts.google.com", "accounts.google.com"];

export function clienteGoogle() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const segredo = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !segredo) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados — o acesso restrito da COP não pode autenticar."
    );
  }
  return { id, segredo };
}

export function urlDeRetorno(origem: string): string {
  return `${process.env.COP2026_URL_BASE ?? origem}/api/cop2026/acesso/callback`;
}

function aleatorioUrlSafe(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** PKCE: sem ele, um código interceptado no redirect vale para quem o pegar. */
export async function gerarPkce() {
  const verificador = aleatorioUrlSafe(48);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador));
  const desafio = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verificador, desafio, estado: aleatorioUrlSafe(16) };
}

export function urlAutorizacao({
  redirectUri,
  estado,
  desafio,
}: {
  redirectUri: string;
  estado: string;
  desafio: string;
}): string {
  const p = new URLSearchParams({
    client_id: clienteGoogle().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: estado,
    code_challenge: desafio,
    code_challenge_method: "S256",
    // A conta que abre a planilha pode não ser a conta padrão do navegador.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTORIZACAO}?${p.toString()}`;
}

export type IdentidadeGoogle = { email: string; nome?: string; emailVerificado: boolean };

/**
 * Troca o código pelo id_token no canal servidor↔Google, com o client secret.
 * O token chega por TLS direto do endpoint do Google, então a validação de
 * assinatura por JWKS é dispensável (OIDC Core §3.1.3.7) — mas emissor,
 * audiência e vencimento continuam obrigatórios: sem eles um token de OUTRO
 * aplicativo passaria.
 */
export async function trocarCodigoPorIdentidade(
  codigo: string,
  verificador: string,
  redirectUri: string
): Promise<IdentidadeGoogle> {
  const { id, segredo } = clienteGoogle();
  const resposta = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verificador,
    }),
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new Error(`O Google recusou a troca do código (${resposta.status}).`);
  }
  const { id_token } = (await resposta.json()) as { id_token?: string };
  if (!id_token) throw new Error("O Google não devolveu id_token.");

  const partes = id_token.split(".");
  if (partes.length !== 3) throw new Error("id_token malformado.");
  const bruto = deBase64Url(partes[1]);
  if (!bruto) throw new Error("id_token ilegível.");

  const c = JSON.parse(bruto) as {
    iss?: string;
    aud?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!c.iss || !EMISSORES_VALIDOS.includes(c.iss)) throw new Error("Emissor do token inválido.");
  if (c.aud !== id) throw new Error("Token emitido para outro aplicativo.");
  if (!c.exp || c.exp * 1000 < Date.now()) throw new Error("Token vencido.");
  if (!c.email) throw new Error("O Google não informou o email da conta.");

  return { email: c.email.toLowerCase(), nome: c.name, emailVerificado: c.email_verified === true };
}
