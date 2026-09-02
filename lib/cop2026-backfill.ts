/**
 * Transformação planilha → `cop_auditoria_lancamento`, PURA e sem I/O.
 *
 * Nasceu dentro de `scripts/backfill-planilha.mjs`. Saiu de lá em 02/09/2026
 * por um motivo prático: a `SUPABASE_SERVICE_ROLE_KEY` está marcada como
 * sensível na Vercel e não é legível nem por quem opera o deploy — então a
 * importação não pode acontecer da máquina de ninguém, tem que acontecer no
 * servidor, que já tem a chave. O script continua existindo para conferência e
 * para gerar SQL; a tela de admin usa este mesmo código. Um transformador só,
 * dois gatilhos — é o que garante que o que o dry-run mostra é o que entra.
 *
 * Sem `next/server` e sem cliente de banco aqui dentro, de propósito: assim o
 * `node` do script importa este arquivo sem arrastar o Next junto.
 *
 * As três regras que não se negociam continuam valendo e estão no cabeçalho do
 * script — importar cru e nunca reparar, contar pelo DECLARADO, congelar a
 * fonte com o sha256.
 */

import { extrairLancamentos, chaveSubunidade } from "@/lib/cop2026";
import { parseCsv } from "@/lib/inventario-2026";
import { chaveDedup, lerEvidencias, normalizarRe } from "@/lib/cop2026-lancamento";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

export type EvidenciaImportada = {
  posicao: number;
  bruto: string;
  tipo: string;
  id_midia: string | null;
  id_gravacao: string | null;
  id_pagina: number | null;
  re_auditor_base: string;
};

export type RegistroImportado = {
  lancamento: Record<string, unknown>;
  evidencias: EvidenciaImportada[];
};

export type ResumoImportacao = {
  registros: RegistroImportado[];
  /** Linhas da planilha inteira, antes do recorte do mês. */
  totalPlanilha: number;
  /** Linhas dentro do mês pedido — é o que vira registro. */
  doPeriodo: number;
  /** Classificação dos identificadores: o achado da auditoria, não estatística. */
  contagem: Record<"midia" | "gravacao" | "pagina" | "desconhecido", number>;
  /** As três réguas do mesmo mês. A OFICIAL é `declarados`. */
  declarados: number;
  contados: number;
  validos: number;
  semReLegivel: number;
};

/** SHA-256 em hex, na Web Crypto — a mesma API no `node` do script e no
 *  runtime do servidor. */
export async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Monta os registros de UM mês a partir do CSV cru da aba de respostas.
 *
 * `fonteSha256` entra no `payload_bruto` de cada linha: é o que amarra o
 * registro ao arquivo congelado e permite provar, meses depois, de qual versão
 * da planilha aquele número saiu.
 */
export async function montarRegistros(
  csv: string,
  mes: RelatorioMes,
  fonteSha256: string
): Promise<ResumoImportacao> {
  const todos = extrairLancamentos(parseCsv(csv));
  const doPeriodo = todos.filter((l) => l.data >= mes.periodo.de && l.data <= mes.periodo.ate);

  const registros: RegistroImportado[] = [];
  const contagem = { midia: 0, gravacao: 0, pagina: 0, desconhecido: 0 };
  let declarados = 0;
  let contados = 0;
  let validosTotal = 0;
  let semReLegivel = 0;

  const importadoEm = new Date().toISOString();

  for (const l of doPeriodo) {
    const re = normalizarRe(l.re);
    const base = re.base.length === 6 ? re.base : "000000";
    if (re.base.length < 6) semReLegivel += 1;

    const campos = String(l.idsMidia ?? "")
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    const { evidencias, recusas, duplicadasNoEnvio } = lerEvidencias(campos);

    for (const e of evidencias) contagem[e.tipo as keyof typeof contagem] += 1;
    contagem.desconhecido += recusas.length;

    const validos = evidencias.filter((e) => e.tipo === "midia" || e.tipo === "gravacao").length;
    declarados += l.auditou ? l.videos : 0;
    contados += evidencias.length;
    validosTotal += validos;

    // O hash é da linha CRUA reconstituída — o que veio da planilha, não o que
    // interpretamos dela. Interpretação muda de versão para versão; a linha,
    // não. É ele, e só ele, que torna a reimportação idempotente
    // (`cop_lanc_hash_linha_uidx`, migration 027).
    const hashLinha = await sha256(
      [l.data, l.turno, l.re, l.enviadoEm, l.idsMidia, String(l.videos)].join("")
    );

    registros.push({
      lancamento: {
        data_auditoria: l.data,
        hora: l.hora || null,
        turno: l.turno || "Não informado",
        re: re.canonico || l.re || "000000",
        re_base: base,
        nome_guerra: l.nomeGuerra,
        posto: l.posto,
        funcao: l.funcao,
        // A subunidade importada vem da planilha (o auditor a declarava). Não é
        // derivada do RE como nos lançamentos novos: reclassificar agora
        // mudaria o ranking já apresentado ao Comando.
        subunidade: chaveSubunidade(l.subunidade) || "outros",
        auditou: l.auditou,
        videos_declarados: l.auditou ? l.videos : 0,
        videos_contados: evidencias.length,
        videos_validos: validos,
        numero_parte: l.numeroParte || null,
        justificativa: l.justificativa || null,
        origem: "planilha",
        chave_dedup: chaveDedup(base, l.data, l.turno),
        vinculo_pendente: false,
        retroativo: false,
        payload_bruto: {
          hashLinha,
          // Respostas começam na linha 4: cabeçalho + as duas linhas vazias que
          // o Forms deixa. Serve como referência humana na conferência.
          linhaOrigem: l.id + 4,
          importadoEm,
          fonteSha256,
          criterio: "declarado",
          mes: mes.chave,
          recusas: recusas.map((r) => ({ bruto: r.bruto, motivo: r.motivo })),
          duplicadasNoEnvio,
        },
        criado_por_email: `backfill-${mes.chave}`,
      },
      evidencias: evidencias.map((e, i) => ({
        posicao: i + 1,
        bruto: e.bruto,
        tipo: e.tipo,
        id_midia: e.idMidia ?? null,
        id_gravacao: e.idGravacao ?? null,
        id_pagina: e.idPagina ?? null,
        re_auditor_base: base,
      })),
    });
  }

  return {
    registros,
    totalPlanilha: todos.length,
    doPeriodo: doPeriodo.length,
    contagem,
    declarados,
    contados,
    validos: validosTotal,
    semReLegivel,
  };
}
