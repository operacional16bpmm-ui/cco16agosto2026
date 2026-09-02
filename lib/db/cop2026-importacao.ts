import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { montarRegistros, sha256, type ResumoImportacao } from "@/lib/cop2026-backfill";
import { relatorioPorChave, type RelatorioMes } from "@/lib/cop2026-relatorios";

/**
 * Importação da planilha do Google para o banco — o lado que ESCREVE.
 *
 * Por que isto virou tela de admin e não ficou só no script: o Comando fechou o
 * Google Forms em 01/09/2026, e o que estava na planilha (agosto inteiro e os
 * primeiros dias de setembro) precisava atravessar para o banco sem que a
 * `SUPABASE_SERVICE_ROLE_KEY` saísse do servidor. Aqui ela já está.
 *
 * IDEMPOTENTE POR CONSTRUÇÃO. Rodar duas vezes não duplica nada: o índice
 * único `cop_lanc_hash_linha_uidx` (migration 027) recusa a linha já
 * importada, e o `23505` que ele devolve é contado como "já existia", não como
 * falha. Isso é o que permite reimportar depois de uma correção na planilha
 * sem medo — e o que permite conferir, a qualquer momento, se o banco está em
 * dia com a fonte.
 */

const PUB_ID =
  "2PACX-1vTIsyLDSi4hSINQP3akwk3hZ575HuTSDo3F3Q9Ec0P8tYl5wgsKLpYexT76GB_2pnJA_HpZ37k4gAx-";
const URLS = [
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=305359783&single=true&output=csv`,
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?output=csv`,
];

export type ResultadoImportacao = {
  ok: boolean;
  mes?: RelatorioMes;
  /** sha256 do CSV lido — amarra o que entrou à versão da fonte. */
  fonteSha256?: string;
  resumo?: ResumoImportacao;
  gravados?: number;
  jaExistiam?: number;
  falhas?: number;
  erro?: string;
};

async function baixarCsv(): Promise<string> {
  const falhas: string[] = [];
  for (const url of URLS) {
    try {
      const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      if (texto.trimStart().startsWith("<")) throw new Error("veio HTML de login");
      // A aba de respostas sempre abre pelo carimbo do Forms. Sem esta guarda,
      // a rota sem gid poderia trazer a aba Parametros calada.
      if (!/^carimbo/i.test(texto.trimStart())) throw new Error("não é a aba de respostas");
      return texto;
    } catch (erro) {
      falhas.push((erro as Error).message);
    }
  }
  throw new Error(`Nenhuma rota da planilha respondeu (${falhas.join("; ")}).`);
}

/**
 * Importa um mês. `simular: true` faz todo o caminho — baixa, classifica,
 * conta — e para antes de gravar: é o dry-run do script, na tela.
 */
export async function importarMes(
  chave: string,
  { simular = false }: { simular?: boolean } = {}
): Promise<ResultadoImportacao> {
  const mes = relatorioPorChave(chave);
  if (!mes) return { ok: false, erro: "Mês fora do ciclo de 2026." };
  if (!supabaseConfigurado()) return { ok: false, erro: "Banco indisponível." };

  let csv: string;
  try {
    csv = await baixarCsv();
  } catch (erro) {
    return { ok: false, mes, erro: (erro as Error).message };
  }

  const fonteSha256 = await sha256(csv);
  const resumo = await montarRegistros(csv, mes, fonteSha256);

  if (simular) return { ok: true, mes, fonteSha256, resumo };

  const db = createAdminClient();
  let gravados = 0;
  let jaExistiam = 0;
  let falhas = 0;

  for (const r of resumo.registros) {
    const { data, error } = await db
      .from("cop_auditoria_lancamento")
      .insert(r.lancamento)
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation: esta linha da planilha já foi importada.
      if (error.code === "23505") jaExistiam += 1;
      else {
        falhas += 1;
        console.error("[cop2026-importacao] falha ao inserir:", error.message);
      }
      continue;
    }

    if (r.evidencias.length > 0) {
      const { error: erroEvid } = await db
        .from("cop_evidencia")
        .insert(r.evidencias.map((e) => ({ ...e, lancamento_id: data.id })));
      // Replay real medido em agosto: 24 identificadores se repetem, um deles 6
      // vezes. O lançamento fica; a evidência colidida não entra. Perder a
      // evidência repetida é o comportamento certo — ela é o achado, não o dado.
      if (erroEvid) console.error("[cop2026-importacao] evidências recusadas:", erroEvid.message);
    }
    gravados += 1;
  }

  return { ok: true, mes, fonteSha256, resumo, gravados, jaExistiam, falhas };
}
