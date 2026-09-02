import "server-only";
import { cookies } from "next/headers";

import {
  JANELA_ATENCAO_MAX_DIAS,
  JANELA_ATENCAO_MIN_DIAS,
  JANELA_ATENCAO_PADRAO_DIAS,
} from "@/lib/cop2026-metricas";

/**
 * Janela em DIAS para o cartão "Pontos de atenção" caracterizar padrão de
 * desvio (não auditou / abaixo do mínimo / partes).
 *
 * Mora em cookie e não em tabela do banco de propósito: é um parâmetro do
 * PAINEL, não da meta, e a decisão de mexer aqui não pede migração — o Comando
 * abre o admin, ajusta e o próximo carregamento do dashboard já usa o valor.
 * Um lançamento único no dia 2 do mês NÃO caracteriza padrão; a régua é ele.
 *
 * O cookie é gravado com escopo `/` para valer em qualquer subrota da COP e
 * `SameSite=Lax` para ir junto na navegação normal (SSR do próximo painel).
 */

export const COOKIE_JANELA_ATENCAO = "cop2026_janela_atencao_dias";

function normalizar(bruto: string | undefined | null): number {
  const n = Number.parseInt(String(bruto ?? "").trim(), 10);
  if (!Number.isFinite(n)) return JANELA_ATENCAO_PADRAO_DIAS;
  if (n < JANELA_ATENCAO_MIN_DIAS) return JANELA_ATENCAO_MIN_DIAS;
  if (n > JANELA_ATENCAO_MAX_DIAS) return JANELA_ATENCAO_MAX_DIAS;
  return n;
}

export async function janelaAtencaoDias(): Promise<number> {
  const jar = await cookies();
  return normalizar(jar.get(COOKIE_JANELA_ATENCAO)?.value);
}

/** Escrita — usada pela server action do admin. */
export async function gravarJanelaAtencaoDias(dias: number): Promise<number> {
  const normalizado = normalizar(String(dias));
  const jar = await cookies();
  jar.set(COOKIE_JANELA_ATENCAO, String(normalizado), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // um ano — decisão vigora até o Comando mudar
  });
  return normalizado;
}
