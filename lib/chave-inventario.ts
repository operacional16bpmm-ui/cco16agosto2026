import { cookies } from "next/headers";
import { comparacaoConstante } from "@/lib/auth-simples";

/**
 * Chave de acesso da central de Inventário (/16bpmminventario).
 *
 * Não é o login do portal e não pretende ser: a página fica fora do
 * fail-closed do proxy.ts de propósito, para que qualquer fração abra pelo
 * link, e a chave é uma tranca simples contra quem esbarra no endereço. Sem
 * usuário, sem perfil, sem banco — uma palavra só, decidida pelo usuário em
 * 04/08/2026, porque a página mostra número de patrimônio, localização física
 * do bem e descrição de armamento e colete das companhias.
 *
 * Quem precisa de controle por pessoa continua entrando pela Sala de Comando,
 * que tem login individual (ver lib/auth-usuarios.ts).
 *
 * O cookie guarda só a validade e a assinatura HMAC dela, com o mesmo segredo
 * da sessão. Não guarda a chave: um cookie forjado à mão não passa, e vazar o
 * cookie de um navegador não revela a palavra para digitar em outro.
 */
export const COOKIE_CHAVE_INVENTARIO = "cco16_chave_inventario";

const DURACAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias: o levantamento é longo.

/** Trocar a chave é mexer em CHAVE_INVENTARIO no ambiente, sem novo deploy. */
function chaveEsperada(): string {
  return process.env.CHAVE_INVENTARIO || "16bpmminventario";
}

function segredo(): string {
  const s = process.env.CCO16_SESSAO_SEGREDO;
  if (!s) throw new Error("CCO16_SESSAO_SEGREDO não configurada.");
  return s;
}

async function assinar(valor: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(valor));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compara sem diferenciar maiúscula, acento ou espaço sobrando: quem recebe a
 *  chave por WhatsApp costuma colar com espaço no fim. */
function normalizarChave(valor: string): string {
  return valor
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function chaveConfere(digitada: string): boolean {
  return comparacaoConstante(normalizarChave(digitada), normalizarChave(chaveEsperada()));
}

export async function liberarInventario() {
  const exp = String(Date.now() + DURACAO_SEGUNDOS * 1000);
  const c = await cookies();
  c.set(COOKIE_CHAVE_INVENTARIO, `${exp}.${await assinar(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function inventarioLiberado(): Promise<boolean> {
  const c = await cookies();
  const valor = c.get(COOKIE_CHAVE_INVENTARIO)?.value;
  if (!valor) return false;
  const corte = valor.lastIndexOf(".");
  if (corte <= 0) return false;
  const exp = valor.slice(0, corte);
  const assinatura = valor.slice(corte + 1);
  if (!comparacaoConstante(await assinar(exp), assinatura)) return false;
  const prazo = Number(exp);
  return Number.isFinite(prazo) && Date.now() < prazo;
}
