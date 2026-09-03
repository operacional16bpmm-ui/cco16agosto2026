import "server-only";

/**
 * Trilha de auditoria do módulo COP.
 *
 * A tabela `cop_auditoria_trilha` existe desde a migration 026 e o trigger
 * `cop_registrar_trilha` a alimenta a cada escrita — em 03/09/2026 tinha 386
 * registros e NENHUMA tela. Registro que ninguém consegue ler não é trilha de
 * auditoria: é armazenamento.
 *
 * Num sistema que fiscaliza prova de câmera corporal e cujos relatórios vão
 * para a Corregedoria e para o Ministério Público, "quem alterou este
 * lançamento" é pergunta que precisa ter resposta na tela, não no console do
 * banco.
 *
 * SOMENTE LEITURA. Não existe função de apagar aqui, e é de propósito: trilha
 * que o operador consegue limpar não serve de prova.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

export type EventoTrilha = {
  id: string;
  tabela: string;
  registroId: string | null;
  operacao: string;
  operador: string | null;
  em: string;
  anterior: Record<string, unknown> | null;
  posterior: Record<string, unknown> | null;
};

export type FiltroTrilha = {
  operador?: string;
  tabela?: string;
  operacao?: string;
  /** Quantos eventos trazer. A tela pagina de 100 em 100. */
  limite?: number;
  antesDe?: string;
};

/**
 * Campos que NUNCA saem para a tela, mesmo estando no JSON gravado.
 *
 * `payload_bruto` guarda a submissão inteira do formulário, incluindo texto
 * livre onde já apareceu CPF colado — a mesma razão de `redigirCpf` existir no
 * caminho de gravação. A trilha mostra O QUE mudou; abrir o payload inteiro
 * transformaria a tela de auditoria numa segunda porta para o dado pessoal.
 */
const CAMPOS_OCULTOS = new Set(["payload_bruto", "chave_dedup"]);

function limpar(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  const saida: Record<string, unknown> = {};
  for (const [k, valor] of Object.entries(v as Record<string, unknown>)) {
    if (!CAMPOS_OCULTOS.has(k)) saida[k] = valor;
  }
  return saida;
}

/**
 * O que mudou entre antes e depois — só os campos que realmente diferem.
 *
 * Sem isto a tela mostraria 28 colunas por evento, das quais 27 iguais, e a
 * alteração que importa ficaria escondida no meio. É a mesma disciplina do
 * `git diff`: mostrar a mudança, não o arquivo.
 */
export function camposAlterados(e: EventoTrilha): {
  campo: string;
  de: unknown;
  para: unknown;
}[] {
  const a = e.anterior ?? {};
  const d = e.posterior ?? {};
  const chaves = new Set([...Object.keys(a), ...Object.keys(d)]);
  const saida: { campo: string; de: unknown; para: unknown }[] = [];
  for (const k of chaves) {
    const de = a[k];
    const para = d[k];
    if (JSON.stringify(de) === JSON.stringify(para)) continue;
    saida.push({ campo: k, de, para });
  }
  return saida.sort((x, y) => x.campo.localeCompare(y.campo));
}

export async function lerTrilha(f: FiltroTrilha = {}): Promise<EventoTrilha[]> {
  if (!supabaseConfigurado()) return [];
  try {
    let q = createAdminClient()
      .from("cop_auditoria_trilha")
      .select("id, tabela, registro_id, operacao, anterior, posterior, operador, em")
      .order("em", { ascending: false })
      .limit(Math.min(f.limite ?? 100, 300));

    if (f.operador) q = q.ilike("operador", `%${f.operador}%`);
    if (f.tabela) q = q.eq("tabela", f.tabela);
    if (f.operacao) q = q.eq("operacao", f.operacao);
    if (f.antesDe) q = q.lt("em", f.antesDe);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: String(r.id),
      tabela: String(r.tabela),
      registroId: (r.registro_id as string | null) ?? null,
      operacao: String(r.operacao),
      operador: (r.operador as string | null) ?? null,
      em: String(r.em),
      anterior: limpar(r.anterior),
      posterior: limpar(r.posterior),
    }));
  } catch (erro) {
    console.error("[db/cop2026-trilha] leitura falhou:", erro);
    return [];
  }
}

/** Os valores distintos que existem, para montar os seletores sem chutar. */
export async function facetasDaTrilha(): Promise<{
  tabelas: string[];
  operacoes: string[];
  operadores: string[];
  total: number;
}> {
  const vazio = { tabelas: [], operacoes: [], operadores: [], total: 0 };
  if (!supabaseConfigurado()) return vazio;
  try {
    const c = createAdminClient();
    const [{ data, error }, { count }] = await Promise.all([
      c.from("cop_auditoria_trilha").select("tabela, operacao, operador").limit(2000),
      c.from("cop_auditoria_trilha").select("id", { count: "exact", head: true }),
    ]);
    if (error) throw error;
    const uniq = (f: (r: Record<string, unknown>) => unknown) =>
      [...new Set((data ?? []).map(f).filter(Boolean).map(String))].sort();
    return {
      tabelas: uniq((r) => r.tabela),
      operacoes: uniq((r) => r.operacao),
      operadores: uniq((r) => r.operador),
      total: count ?? 0,
    };
  } catch (erro) {
    console.error("[db/cop2026-trilha] facetas falharam:", erro);
    return vazio;
  }
}
