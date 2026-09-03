import "server-only";
import { cookies } from "next/headers";

import {
  JANELA_ATENCAO_MAX_DIAS,
  JANELA_ATENCAO_MIN_DIAS,
  JANELA_ATENCAO_PADRAO_DIAS,
} from "@/lib/cop2026-metricas";
import { CHAVE_JANELA_ATENCAO, gravarConfig, lerConfig } from "@/lib/db/cop2026-config";

/**
 * Janela em DIAS para o cartão "Pontos de atenção" caracterizar padrão de
 * desvio (não auditou / abaixo do mínimo / partes).
 *
 * MORA NO BANCO, e não mais em cookie. A tela de admin apresenta este corte
 * como determinação do Comando (despacho do Major em 02/09/2026), ao lado das
 * metas do Batalhão — mas o cookie fazia a decisão valer só no navegador de
 * quem clicou em "Salvar janela". Quem abrisse o painel de outro aparelho lia
 * outra régua, sem nenhum aviso. Uma decisão que vale para uma aba só não é uma
 * decisão do Comando. Ver `supabase/migrations/030_cop_config.sql`.
 *
 * O COOKIE CONTINUA SENDO LIDO, como ponte: enquanto a migration 030 não roda
 * (ou se o banco estiver fora), o valor que o Comando já ajustou no próprio
 * navegador segue valendo para ele em vez de sumir de repente. A ordem é
 * banco → cookie → padrão, e some quando a tabela estiver povoada em produção.
 *
 * O clamp é aplicado na leitura E na escrita de propósito: valor fora de faixa
 * pode chegar de um cookie antigo, de uma linha editada à mão no banco ou de um
 * POST cru na server action.
 */

export const COOKIE_JANELA_ATENCAO = "cop2026_janela_atencao_dias";

function normalizar(bruto: string | undefined | null): number {
  const n = Number.parseInt(String(bruto ?? "").trim(), 10);
  if (!Number.isFinite(n)) return JANELA_ATENCAO_PADRAO_DIAS;
  if (n < JANELA_ATENCAO_MIN_DIAS) return JANELA_ATENCAO_MIN_DIAS;
  if (n > JANELA_ATENCAO_MAX_DIAS) return JANELA_ATENCAO_MAX_DIAS;
  return n;
}

/** `null` quando não há valor gravado — diferente de "gravado fora da faixa",
 *  que o `normalizar` conserta. Sem isto, banco vazio devolveria o padrão e
 *  atropelaria o cookie da ponte. */
function normalizarOuNulo(bruto: string | undefined | null): number | null {
  const texto = String(bruto ?? "").trim();
  if (!texto) return null;
  return Number.isFinite(Number.parseInt(texto, 10)) ? normalizar(texto) : null;
}

export async function janelaAtencaoDias(): Promise<number> {
  const doBanco = normalizarOuNulo(await lerConfig(CHAVE_JANELA_ATENCAO));
  if (doBanco !== null) return doBanco;

  const jar = await cookies();
  const doCookie = normalizarOuNulo(jar.get(COOKIE_JANELA_ATENCAO)?.value);
  return doCookie ?? JANELA_ATENCAO_PADRAO_DIAS;
}

export type ResultadoJanela = { dias: number; persistido: boolean };

/**
 * Escrita — usada pela server action do admin.
 *
 * `persistido: false` significa que o banco não aceitou (sem credencial, ou
 * migration 030 ainda não aplicada) e o valor ficou só neste navegador. A tela
 * precisa dizer isso: anunciar "vale para todos" quando valeu para um é o
 * defeito que esta mudança veio corrigir.
 */
export async function gravarJanelaAtencaoDias(dias: number): Promise<ResultadoJanela> {
  const normalizado = normalizar(String(dias));
  const persistido = await gravarConfig(
    CHAVE_JANELA_ATENCAO,
    String(normalizado),
    "admin-cop"
  );

  /* O cookie continua sendo escrito mesmo com o banco OK: é o que mantém a
     ponte funcionando se o banco cair depois, e ele é inofensivo — a leitura só
     olha para ele quando o banco não respondeu. */
  const jar = await cookies();
  jar.set(COOKIE_JANELA_ATENCAO, String(normalizado), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // um ano — decisão vigora até o Comando mudar
  });

  return { dias: normalizado, persistido };
}
