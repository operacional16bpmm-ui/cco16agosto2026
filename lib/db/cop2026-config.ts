import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * Parâmetros de EXIBIÇÃO do painel da COP (`cop_config`, migration 030).
 *
 * Não são metas — meta é decisão de cota e vive em `cop_auditoria_parametro`,
 * com forma própria. Aqui ficam os cortes que o Comando ajusta na tela de admin
 * e que precisam valer para TODO mundo que abre o painel, e não para o
 * navegador de quem clicou (era o defeito do cookie; ver a migration).
 *
 * Toda função abaixo é à prova de banco ausente: sem Supabase configurado, ou
 * com a migration ainda não aplicada, a leitura devolve `null` e quem chama cai
 * no padrão. O painel do Comando nunca deixa de abrir por causa de um parâmetro
 * de exibição.
 */

const TABELA = "cop_config";

export const CHAVE_JANELA_ATENCAO = "cop.janela_atencao_dias";

export async function lerConfig(chave: string): Promise<string | null> {
  if (!supabaseConfigurado()) return null;
  try {
    const { data, error } = await createAdminClient()
      .from(TABELA)
      .select("valor")
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { valor: string } | null)?.valor ?? null;
  } catch (erro) {
    /* Inclui o caso "migration 030 ainda não aplicada": a rota responde 42P01 e
       o painel tem de seguir com o padrão, não com uma tela de erro. */
    console.error(`[cop2026-config] falha ao ler ${chave}:`, erro);
    return null;
  }
}

/** Devolve `true` quando gravou de fato — o chamador precisa saber, porque com
 *  o banco fora a decisão do Comando não teria ficado registrada em lugar
 *  nenhum e dizer "salvo" seria mentira. */
export async function gravarConfig(
  chave: string,
  valor: string,
  operador: string
): Promise<boolean> {
  if (!supabaseConfigurado()) return false;
  try {
    const { error } = await createAdminClient()
      .from(TABELA)
      .upsert(
        {
          chave,
          valor,
          atualizado_por: operador,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "chave" }
      );
    if (error) throw new Error(error.message);
    return true;
  } catch (erro) {
    console.error(`[cop2026-config] falha ao gravar ${chave}:`, erro);
    return false;
  }
}
