import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { ehIdentificadorValido, redigirCpf, type LancamentoCop } from "@/lib/cop2026";
import {
  chaveDedup,
  type LancamentoValidado,
  type SubunidadeValida,
} from "@/lib/cop2026-lancamento";
import { RELATORIOS_MENSAIS } from "@/lib/cop2026-relatorios";
import { fracaoDaSubunidade } from "@/lib/db/cop2026-unidade";

/**
 * Gravação e leitura dos lançamentos próprios da Auditoria de COP
 * (`cop_auditoria_lancamento` + `cop_evidencia`, migration 026).
 *
 * A leitura devolve o MESMO `LancamentoCop` que `extrairLancamentos()` produz a
 * partir da planilha, de propósito: `calcularPainel()` não sabe — e não pode
 * saber — de onde o dado veio. Fonte de classificação continua única; o que
 * muda é só a porta de entrada.
 */

const TABELA = "cop_auditoria_lancamento";
const TABELA_EVIDENCIA = "cop_evidencia";

export type ResultadoGravacao =
  | { ok: true; id: string; protocolo: string; duplicado: boolean }
  | { ok: false; erro: string; conflito?: "dedup" | "replay" };

/** Protocolo curto para o print que o PM manda ao Sargento. Os 8 primeiros
 *  caracteres do uuid do lançamento, em caixa alta — não é identificador de
 *  segurança, é o que a pessoa lê em voz alta no rádio. */
export function protocoloDe(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Grava um lançamento e suas evidências.
 *
 * Ordem deliberada: o lançamento primeiro, as evidências depois, e se as
 * evidências falharem o lançamento é apagado. Sem transação porque o cliente
 * do Supabase não expõe uma — e um lançamento sem as evidências que o
 * justificam é pior que lançamento nenhum: ele CONTA na régua declarada e não
 * tem nada por trás.
 */
export async function gravarLancamento(
  v: LancamentoValidado,
  contexto: {
    subunidade: SubunidadeValida;
    vinculoPendente: boolean;
    email: string | null;
    sub: string | null;
    origem?: "formulario" | "planilha" | "admin";
  }
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado()) {
    return { ok: false, erro: "O registro está indisponível no momento." };
  }
  const c = createAdminClient();

  // Idempotência: a MESMA submissão reenviada (4G que estoura depois de o
  // servidor aceitar) reencontra o registro em vez de duplicá-lo.
  const { data: jaExiste } = await c
    .from(TABELA)
    .select("id")
    .eq("payload_bruto->>idSubmissao", v.idSubmissao)
    .maybeSingle();
  if (jaExiste?.id) {
    const id = jaExiste.id as string;
    return { ok: true, id, protocolo: protocoloDe(id), duplicado: true };
  }

  const contados = v.evidencias.length;
  const validos = v.evidencias.filter((e) => ehIdentificadorValido(e.bruto)).length;

  const { data, error } = await c
    .from(TABELA)
    .insert({
      data_auditoria: v.dataAuditoria,
      turno: v.turno,
      re: v.re.canonico,
      re_base: v.re.base,
      // O nome de guerra passa por redação de CPF junto com o resto: o campo é
      // livre e já chegou colado com o bloco "Operador" da plataforma.
      nome_guerra: redigirCpf(v.nomeGuerra),
      posto: v.posto,
      funcao: v.funcao,
      subunidade: contexto.subunidade,
      /* Fase 2: a fração REAL na árvore CPA → Batalhão → Fração. `subunidade`
         continua sendo o vocabulário do painel e não muda de significado — as
         duas convivem de propósito durante a virada. `null` quando a fração não
         casa, e aí o lançamento aparece como órfão, como sempre apareceu. */
      unidade_cod: await fracaoDaSubunidade(contexto.subunidade),
      auditou: v.auditou,
      // Régua A (oficial em setembro): o que a pessoa declarou. Quando ela não
      // declara número, a própria contagem de identificadores serve — é o que
      // ela afirmou ter auditado, não uma inferência nossa.
      videos_declarados: v.auditou ? v.quantidadeDeclarada || contados : 0,
      videos_contados: v.auditou ? contados : 0,
      videos_validos: v.auditou ? validos : 0,
      numero_parte: redigirCpf(v.numeroParte) || null,
      justificativa: redigirCpf(v.justificativa) || null,
      origem: contexto.origem ?? "formulario",
      chave_dedup: chaveDedup(v.re.base, v.dataAuditoria, v.turno),
      vinculo_pendente: contexto.vinculoPendente,
      retroativo: v.retroativo,
      payload_bruto: {
        idSubmissao: v.idSubmissao,
        // O que foi recusado na tela fica registrado: é a matéria-prima do
        // indicador de qualidade e a prova de que a recusa aconteceu.
        recusas: v.recusas.map((r) => ({ bruto: redigirCpf(r.bruto), motivo: r.motivo })),
        duplicadasNoEnvio: v.duplicadasNoEnvio.map(redigirCpf),
        quantidadeDeclarada: v.quantidadeDeclarada,
      },
      criado_por_email: contexto.email,
      criado_por_sub: contexto.sub,
    })
    .select("id")
    .single();

  if (error) {
    /* 23505 = unique_violation. NÃO existe mais unicidade por `re|data|turno`
       (migration 028): lançar duas vezes no mesmo turno, com vídeos
       diferentes, é o uso normal — 12 grupos de agosto/2026, um deles com 8
       lançamentos e 40 identificadores distintos numa noite. O que ainda pode
       colidir aqui é a guarda de idempotência do envio, e nesse caso o certo é
       tratar como sucesso: é o MESMO envio chegando duas vezes. */
    if (error.code === "23505") {
      const { data: existente } = await c
        .from(TABELA)
        .select("id")
        .eq("payload_bruto->>idSubmissao", v.idSubmissao)
        .maybeSingle();
      if (existente?.id) {
        const id = existente.id as string;
        return { ok: true, id, protocolo: protocoloDe(id), duplicado: true };
      }
      return {
        ok: false,
        conflito: "dedup",
        erro: "Este lançamento já foi registrado. Confira na conferência do Comando antes de reenviar.",
      };
    }
    console.error("[cop2026-lancamentos] falha ao gravar:", error);
    return { ok: false, erro: "Não foi possível registrar o lançamento." };
  }

  const id = (data as { id: string }).id;

  if (v.evidencias.length > 0) {
    const { error: erroEvid } = await c.from(TABELA_EVIDENCIA).insert(
      v.evidencias.map((e, i) => ({
        lancamento_id: id,
        posicao: i + 1,
        bruto: redigirCpf(e.bruto),
        tipo: e.tipo,
        id_midia: e.idMidia,
        id_gravacao: e.idGravacao,
        id_pagina: e.idPagina,
        re_auditor_base: v.re.base,
      }))
    );

    if (erroEvid) {
      // C-1 em ação: o mesmo identificador já foi lançado por este PM.
      const replay = erroEvid.code === "23505";
      await c.from(TABELA).delete().eq("id", id);
      if (replay) {
        return {
          ok: false,
          conflito: "replay",
          erro: "Um dos identificadores informados já foi lançado por você em outra data. Cada gravação vale uma vez.",
        };
      }
      console.error("[cop2026-lancamentos] falha ao gravar evidências:", erroEvid);
      return { ok: false, erro: "Não foi possível registrar os identificadores." };
    }
  }

  return { ok: true, id, protocolo: protocoloDe(id), duplicado: false };
}

/* ------------------------------------------------------------- leitura */

type LinhaBanco = {
  id: string;
  data_auditoria: string;
  hora: string | null;
  turno: string;
  re: string;
  nome_guerra: string;
  posto: string;
  funcao: string;
  subunidade: string;
  auditou: boolean;
  videos_declarados: number;
  videos_contados: number;
  videos_validos: number;
  numero_parte: string | null;
  justificativa: string | null;
  vinculo_pendente: boolean;
  criado_em: string;
  cop_evidencia: { bruto: string; posicao: number; descartada: boolean }[] | null;
};

const CARIMBO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** dd/mm/aaaa hh:mm em São Paulo — o mesmo formato que o carimbo do Forms
 *  entregava, para a tabela do painel não mudar de cara na virada. */
function carimbo(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : CARIMBO.format(d).replace(",", "");
}

/**
 * Converte a linha do banco no formato que o painel já sabe ler.
 *
 * `videos` recebe a régua DECLARADA por decisão de Comando ("declarado agora,
 * contado depois"): setembro precisa ser comparável com agosto. As outras duas
 * réguas continuam gravadas e disponíveis para o indicador de qualidade.
 */
function paraLancamentoCop(l: LinhaBanco, indice: number): LancamentoCop {
  const ids = (l.cop_evidencia ?? [])
    .filter((e) => !e.descartada)
    .sort((a, b) => a.posicao - b.posicao)
    .map((e) => e.bruto);

  return {
    id: indice,
    data: l.data_auditoria,
    hora: l.hora ?? "",
    idsMidia: redigirCpf(ids.join("\n")),
    turno: l.turno,
    enviadoEm: carimbo(l.criado_em),
    re: l.re,
    nomeGuerra: l.nome_guerra,
    posto: l.posto,
    funcao: l.funcao,
    subunidade: l.subunidade,
    auditou: l.auditou,
    videos: l.auditou ? l.videos_declarados : 0,
    numeroParte: l.numero_parte ?? "",
    justificativa: l.justificativa ?? "",
    // Não existe "quantidade exata" separada aqui: o campo livre que produzia
    // 202 bilhões em 29/08 deixou de existir. Fica em zero para a tabela do
    // painel não inventar divergência que não há.
    videosExatos: 0,
    quantidadeDescartada: 0,
  };
}

/**
 * Lançamentos do banco, prontos para `calcularPainel`.
 *
 * Exclui o que foi apagado logicamente e, quando o Comando liga a exigência de
 * vínculo, também o que está pendente de confirmação — ver
 * `exigeVinculoConfirmado()` em lib/db/cop2026-auditor.ts.
 */
export async function lerLancamentosDoBanco(opcoes?: {
  incluirPendentes?: boolean;
}): Promise<{ lancamentos: LancamentoCop[]; erro: string | null }> {
  if (!supabaseConfigurado()) return { lancamentos: [], erro: null };
  try {
    let consulta = createAdminClient()
      .from(TABELA)
      .select(
        "id, data_auditoria, hora, turno, re, nome_guerra, posto, funcao, subunidade, auditou, videos_declarados, videos_contados, videos_validos, numero_parte, justificativa, vinculo_pendente, criado_em, cop_evidencia(bruto, posicao, descartada)"
      )
      .is("excluido_em", null)
      .order("data_auditoria", { ascending: true })
      .limit(20_000);

    if (!opcoes?.incluirPendentes) consulta = consulta.eq("vinculo_pendente", false);

    const { data, error } = await consulta;
    if (error) throw new Error(error.message);

    const linhas = (data ?? []) as unknown as LinhaBanco[];
    return { lancamentos: linhas.map(paraLancamentoCop), erro: null };
  } catch (erro) {
    console.error("[cop2026-lancamentos] falha ao ler:", erro);
    return { lancamentos: [], erro: "Não foi possível ler os lançamentos registrados." };
  }
}

/* --------------------------------------------------------------- manejo */

export type LancamentoAdmin = LinhaBanco & {
  origem: string;
  retroativo: boolean;
  criado_por_email: string | null;
};

export async function listarParaManejo(filtro?: {
  re?: string;
  data?: string;
}): Promise<{ itens: LancamentoAdmin[]; erro: string | null }> {
  if (!supabaseConfigurado()) return { itens: [], erro: null };
  try {
    let consulta = createAdminClient()
      .from(TABELA)
      .select(
        "id, data_auditoria, hora, turno, re, re_base, nome_guerra, posto, funcao, subunidade, auditou, videos_declarados, videos_contados, videos_validos, numero_parte, justificativa, vinculo_pendente, retroativo, origem, criado_em, criado_por_email, cop_evidencia(bruto, posicao, descartada)"
      )
      .is("excluido_em", null)
      .order("criado_em", { ascending: false })
      /* Era 300 quando só existia o formulário novo, com um punhado de linhas.
         Com agosto e setembro importados da planilha o ciclo inteiro passa de
         120 e cresce todo turno — e a tela filtra no cliente, então o que não
         vier aqui simplesmente não existe para o filtro. */
      .limit(2000);

    if (filtro?.re) consulta = consulta.eq("re_base", filtro.re);
    if (filtro?.data) consulta = consulta.eq("data_auditoria", filtro.data);

    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return { itens: (data ?? []) as unknown as LancamentoAdmin[], erro: null };
  } catch (erro) {
    console.error("[cop2026-lancamentos] falha ao listar para manejo:", erro);
    return { itens: [], erro: "Não foi possível ler os lançamentos." };
  }
}

/**
 * Exclusão LÓGICA, com motivo obrigatório.
 *
 * As evidências são marcadas como descartadas no mesmo ato — é o que devolve
 * aqueles identificadores ao índice único (C-1). Sem isso, corrigir um
 * lançamento errado trancaria as gravações para sempre e o auditor não
 * conseguiria relançá-las certas.
 */
export async function excluirLancamento(
  id: string,
  motivo: string,
  operador: string
): Promise<void> {
  const c = createAdminClient();
  const agora = new Date().toISOString();

  const { error } = await c
    .from(TABELA)
    .update({
      excluido_em: agora,
      excluido_por: operador,
      motivo_exclusao: motivo,
      // A trigger de trilha lê `editado_por` para saber quem operou.
      editado_por: operador,
      editado_em: agora,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: erroEvid } = await c
    .from(TABELA_EVIDENCIA)
    .update({ descartada: true })
    .eq("lancamento_id", id);
  if (erroEvid) throw new Error(erroEvid.message);
}

/** Reclassificação da fração pelo Comando — o caso do RE que não casou com o
 *  roster e caiu em `outros`. */
export async function reclassificarSubunidade(
  id: string,
  subunidade: SubunidadeValida,
  operador: string
): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABELA)
    .update({ subunidade, editado_por: operador, editado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------- qualidade da evidência */

export type QualidadeEvidencia = {
  total: number;
  comIdValido: number;
  comIdInvalido: number;
  conferidosNaPlataforma: number;
};

/**
 * Índice de rastreabilidade a partir do banco. Base medida em agosto/2026 pela
 * planilha: 48,6%. É este número que vira alvo escalonado no painel — e é o que
 * transforma "queda de desempenho" em "indicador novo melhorando".
 */
export async function medirQualidade(): Promise<QualidadeEvidencia> {
  const vazio = { total: 0, comIdValido: 0, comIdInvalido: 0, conferidosNaPlataforma: 0 };
  if (!supabaseConfigurado()) return vazio;
  try {
    const c = createAdminClient();
    const [total, validos, conferidos] = await Promise.all([
      c.from(TABELA_EVIDENCIA).select("id", { count: "exact", head: true }).eq("descartada", false),
      c
        .from(TABELA_EVIDENCIA)
        .select("id", { count: "exact", head: true })
        .eq("descartada", false)
        .in("tipo", ["midia", "gravacao"]),
      c
        .from(TABELA_EVIDENCIA)
        .select("id", { count: "exact", head: true })
        .eq("verificacao_status", "confere"),
    ]);
    const t = total.count ?? 0;
    const v = validos.count ?? 0;
    return {
      total: t,
      comIdValido: v,
      comIdInvalido: t - v,
      conferidosNaPlataforma: conferidos.count ?? 0,
    };
  } catch (erro) {
    console.error("[cop2026-lancamentos] falha ao medir qualidade:", erro);
    return vazio;
  }
}

/**
 * Detecções que valem RELATÓRIO, nunca bloqueio automático: acusação injusta é
 * pior que fraude não detectada. Dois PMs na mesma ocorrência auditam
 * legitimamente a mesma gravação.
 */
export async function identificadoresCompartilhados(): Promise<
  { id: string; res: string[]; ocorrencias: number }[]
> {
  if (!supabaseConfigurado()) return [];
  try {
    const { data, error } = await createAdminClient()
      .from(TABELA_EVIDENCIA)
      .select("id_normalizado, re_auditor_base")
      .not("id_normalizado", "is", null)
      .eq("descartada", false)
      .limit(20_000);
    if (error) throw new Error(error.message);

    const porId = new Map<string, Set<string>>();
    for (const linha of (data ?? []) as { id_normalizado: string; re_auditor_base: string }[]) {
      const res = porId.get(linha.id_normalizado) ?? new Set<string>();
      res.add(linha.re_auditor_base);
      porId.set(linha.id_normalizado, res);
    }

    return [...porId.entries()]
      .filter(([, res]) => res.size > 1)
      .map(([id, res]) => ({ id, res: [...res], ocorrencias: res.size }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias)
      .slice(0, 50);
  } catch (erro) {
    console.error("[cop2026-lancamentos] falha ao cruzar identificadores:", erro);
    return [];
  }
}

/**
 * Quanto já existe no banco, por mês do ciclo — o "de-para" da tela de
 * importação. Sem isto a tela mostraria dois botões e nenhuma noção do que já
 * foi trazido, e reimportar viraria tentativa e erro.
 *
 * Conta pela régua OFICIAL (`videos_declarados`), a mesma do painel: se esta
 * tela somasse identificadores e o painel somasse declarados, as duas
 * discordariam na frente do Comando sem nenhuma das duas estar errada.
 */
export async function totaisPorMes(): Promise<
  { chave: string; lancamentos: number; declarados: number }[]
> {
  if (!supabaseConfigurado()) return [];
  try {
    const { data, error } = await createAdminClient()
      .from(TABELA)
      .select("data_auditoria, videos_declarados")
      .is("excluido_em", null)
      .limit(20_000);
    if (error) throw new Error(error.message);

    const acumulado = new Map<string, { lancamentos: number; declarados: number }>();
    for (const l of (data ?? []) as { data_auditoria: string; videos_declarados: number }[]) {
      const mes = RELATORIOS_MENSAIS.find(
        (m) => l.data_auditoria >= m.periodo.de && l.data_auditoria <= m.periodo.ate
      );
      if (!mes) continue;
      const atual = acumulado.get(mes.chave) ?? { lancamentos: 0, declarados: 0 };
      atual.lancamentos += 1;
      atual.declarados += l.videos_declarados ?? 0;
      acumulado.set(mes.chave, atual);
    }

    return [...acumulado.entries()].map(([chave, v]) => ({ chave, ...v }));
  } catch (erro) {
    console.error("[cop2026-lancamentos] falha ao totalizar por mês:", erro);
    return [];
  }
}
