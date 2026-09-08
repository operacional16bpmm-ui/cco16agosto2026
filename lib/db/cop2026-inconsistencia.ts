/**
 * Persistência do relato de problema do sistema.
 *
 * Ver `lib/cop2026-inconsistencia.ts` para o porquê do módulo e
 * `supabase/migrations/031_cop_inconsistencia.sql` para o formato da tabela.
 *
 * FALLBACK SILENCIOSO, como no resto do portal: sem Supabase configurado a
 * leitura devolve lista vazia e a tela continua de pé. A ESCRITA é o oposto —
 * ela grita. Um relato que o portal aceita e não grava é pior do que uma tela
 * que diz "não consegui": o policial sai achando que avisou.
 */
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { ROTULO_SUBUNIDADE } from "@/lib/cop2026";
import type {
  Abrangencia,
  Efeito,
  IdentificadorLido,
  ProblemaDeForma,
  SituacaoRelato,
} from "@/lib/cop2026-inconsistencia";

export type Relato = {
  id: string;
  subunidade: string;
  subunidadeRotulo: string;
  inicioEm: string;
  fimEm: string | null;
  abrangencia: Abrangencia;
  efeitos: Efeito[];
  identificadores: string | null;
  identificadoresLidos: IdentificadorLido[];
  descricao: string | null;
  re: string;
  nome: string;
  situacao: SituacaoRelato;
  tratadoPor: string | null;
  tratadoEm: string | null;
  tratativa: string | null;
  pendencias: ProblemaDeForma[];
  registradoEm: string;
  /** Horas entre o início declarado e a chegada do aviso. É a tempestividade —
   *  o número que responde "avisaram na hora ou depois que deu problema?". */
  horasAteAvisar: number;
};

function daLinha(r: Record<string, unknown>): Relato {
  const subunidade = String(r.subunidade ?? "");
  const inicioEm = String(r.inicio_em);
  const registradoEm = String(r.registrado_em);
  return {
    id: String(r.id),
    subunidade,
    subunidadeRotulo: ROTULO_SUBUNIDADE[subunidade] ?? subunidade,
    inicioEm,
    fimEm: (r.fim_em as string | null) ?? null,
    abrangencia: (r.abrangencia as Abrangencia) ?? "total",
    efeitos: (r.efeitos as Efeito[]) ?? [],
    identificadores: (r.identificadores as string | null) ?? null,
    identificadoresLidos: (r.identificadores_lidos as IdentificadorLido[]) ?? [],
    descricao: (r.descricao as string | null) ?? null,
    re: String(r.re ?? ""),
    nome: String(r.nome ?? ""),
    situacao: (r.situacao as SituacaoRelato) ?? "aberto",
    tratadoPor: (r.tratado_por as string | null) ?? null,
    tratadoEm: (r.tratado_em as string | null) ?? null,
    tratativa: (r.tratativa as string | null) ?? null,
    pendencias: (r.pendencias as ProblemaDeForma[]) ?? [],
    registradoEm,
    horasAteAvisar:
      Math.round(
        ((new Date(registradoEm).getTime() - new Date(inicioEm).getTime()) / 3_600_000) * 10
      ) / 10,
  };
}

export type NovoRelato = {
  subunidade: string;
  inicioEm: string;
  fimEm: string | null;
  abrangencia: Abrangencia;
  efeitos: Efeito[];
  identificadores: string | null;
  identificadoresLidos: IdentificadorLido[];
  descricao: string | null;
  re: string;
  nome: string;
  pendencias: ProblemaDeForma[];
  idSubmissao: string | null;
};

export type ResultadoRegistro =
  | { ok: true; relato: Relato; repetido: boolean }
  | { ok: false; erro: string };

/**
 * Grava o relato.
 *
 * `id_submissao` desduplica clique duplo — no 4G da viatura o mesmo POST chega
 * duas vezes com frequência. Quando o índice único acusa (código 23505), o
 * envio anterior é devolvido como sucesso `repetido`: para quem está na tela,
 * avisar duas vezes tem que parecer ter avisado, não erro.
 */
export async function registrarRelato(n: NovoRelato): Promise<ResultadoRegistro> {
  if (!supabaseConfigurado()) {
    return {
      ok: false,
      erro: "O registro de relatos está indisponível nesta instalação. Avise o Batalhão por outro meio e guarde o horário.",
    };
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("cop_inconsistencia")
    .insert({
      subunidade: n.subunidade,
      inicio_em: n.inicioEm,
      fim_em: n.fimEm,
      abrangencia: n.abrangencia,
      efeitos: n.efeitos,
      identificadores: n.identificadores,
      identificadores_lidos: n.identificadoresLidos,
      descricao: n.descricao,
      re: n.re,
      nome: n.nome,
      pendencias: n.pendencias,
      id_submissao: n.idSubmissao,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && n.idSubmissao) {
      const { data: antigo } = await sb
        .from("cop_inconsistencia")
        .select("*")
        .eq("id_submissao", n.idSubmissao)
        .single();
      if (antigo) return { ok: true, relato: daLinha(antigo), repetido: true };
    }
    return { ok: false, erro: "Não consegui gravar o relato. Tente de novo em instantes." };
  }

  return { ok: true, relato: daLinha(data as Record<string, unknown>), repetido: false };
}

/** Relatos do período, mais recentes primeiro. */
export const listarRelatos = cache(
  async (opcoes?: { desde?: string; ate?: string; limite?: number }): Promise<Relato[]> => {
    if (!supabaseConfigurado()) return [];
    try {
      const sb = createAdminClient();
      let q = sb
        .from("cop_inconsistencia")
        .select("*")
        .order("inicio_em", { ascending: false })
        .limit(opcoes?.limite ?? 200);
      if (opcoes?.desde) q = q.gte("inicio_em", opcoes.desde);
      if (opcoes?.ate) q = q.lte("inicio_em", opcoes.ate);
      const { data, error } = await q;
      if (error || !data) return [];
      return (data as Record<string, unknown>[]).map(daLinha);
    } catch {
      return [];
    }
  }
);

export type ResumoPorFracao = {
  subunidade: string;
  subunidadeRotulo: string;
  relatos: number;
  abertos: number;
  horasFora: number;
  ultimoInicio: string | null;
};

/**
 * O que o painel mostra: quanto tempo cada fração ficou sem sistema no
 * período, e quantos avisos ainda estão abertos.
 *
 * Horas de janela ABERTA contam até agora — um problema que ninguém fechou
 * continua custando tempo, e zerá-lo no relatório seria premiar o esquecimento.
 */
export function resumirPorFracao(relatos: Relato[], agora = new Date()): ResumoPorFracao[] {
  const mapa = new Map<string, ResumoPorFracao>();
  for (const r of relatos) {
    const atual = mapa.get(r.subunidade) ?? {
      subunidade: r.subunidade,
      subunidadeRotulo: r.subunidadeRotulo,
      relatos: 0,
      abertos: 0,
      horasFora: 0,
      ultimoInicio: null as string | null,
    };
    const fim = r.fimEm ? new Date(r.fimEm).getTime() : agora.getTime();
    atual.relatos += 1;
    if (r.situacao === "aberto" || r.situacao === "em_analise") atual.abertos += 1;
    atual.horasFora += Math.max(0, (fim - new Date(r.inicioEm).getTime()) / 3_600_000);
    if (!atual.ultimoInicio || r.inicioEm > atual.ultimoInicio) atual.ultimoInicio = r.inicioEm;
    mapa.set(r.subunidade, atual);
  }
  return [...mapa.values()]
    .map((x) => ({ ...x, horasFora: Math.round(x.horasFora * 10) / 10 }))
    .sort((a, b) => b.horasFora - a.horasFora);
}
