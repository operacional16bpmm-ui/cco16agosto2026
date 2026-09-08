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
  /** Identificadores que colidiram com outro lançamento do MESMO RE e não
   *  entraram. Existe para o admin ver: antes disso a perda era silenciosa. */
  evidenciasPerdidas?: number;
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
  let evidenciasPerdidas = 0;
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
      const linhas = r.evidencias.map((e) => ({ ...e, lancamento_id: data.id }));
      /* Lote primeiro; linha a linha só quando colide.
       *
       * O comentário antigo aqui dizia que a evidência colidida não entra e as
       * outras entram. Isso é FALSO para um INSERT multi-linha do Postgres: sem
       * `ON CONFLICT`, a violação de `cop_evid_re_uidx` em UMA linha aborta o
       * comando inteiro — não existe inserção parcial. Um lançamento com 5 IDs
       * bons e 1 repetido perdia os 6, e o resumo da importação reportava
       * sucesso do mesmo jeito.
       *
       * `upsert`/`ON CONFLICT` não resolve: o índice é PARCIAL
       * (`WHERE id_normalizado IS NOT NULL AND descartada = false`) e o PostgREST
       * não emite o predicado, então o Postgres não consegue inferi-lo.
       * Daí o retry linha a linha, que só paga o custo no caso raro. */
      const { error: erroLote } = await db.from("cop_evidencia").insert(linhas);
      if (erroLote) {
        for (const linha of linhas) {
          const { error: erroLinha } = await db.from("cop_evidencia").insert(linha);
          if (!erroLinha) continue;
          if (erroLinha.code === "23505") evidenciasPerdidas += 1;
          else {
            evidenciasPerdidas += 1;
            console.error(
              "[cop2026-importacao] evidência recusada:",
              erroLinha.message
            );
          }
        }
      }
    }
    gravados += 1;
  }

  return { ok: true, mes, fonteSha256, resumo, gravados, jaExistiam, falhas, evidenciasPerdidas };
}
