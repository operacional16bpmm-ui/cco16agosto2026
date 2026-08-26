import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { sessaoAtual, type Sessao } from "@/lib/auth-simples";
import { PAGINAS_ADMINISTRAVEIS, ROTA_PARA_SECAO_DOCUMENTO, rotaEstaPermitida } from "@/lib/paginas";
import { UNIDADES, type Unidade } from "@/lib/unidades";

/**
 * Resolução de permissão por página (migration 023). O cookie continua
 * autocontido e verificável na borda (proxy.ts só exige sessão válida);
 * QUEM decide o que a sessão abre é este módulo, no servidor, consultando
 * usuarios_portal + usuarios_paginas uma única vez por requisição (React
 * cache): layout, página e server actions compartilham a mesma leitura.
 *
 * A consulta também confere `ativo` e `sessao_versao` contra o banco, o que
 * dá ao Comando revogação imediata: incrementar sessao_versao derruba na
 * hora toda sessão emitida, coisa que o cookie stateless de 12h sozinho
 * não permitia.
 *
 * Doutrina de falha: fail-closed para todo mundo, com UMA exceção herdada de
 * lib/auth-usuarios.ts (credencial de emergência): banco fora do ar não pode
 * trancar o Comando para fora do portal. Perfil comando segue irrestrito;
 * os demais perfis só enxergam o que estiver liberado em usuarios_paginas.
 */

export type Autorizacao = {
  /** Sessão confere com o banco (usuário ativo e versão de sessão atual). */
  valida: boolean;
  /** Senha provisória pendente de troca: interceptar antes de qualquer página. */
  deveTrocarSenha: boolean;
  /** Perfil comando: acesso a todas as páginas, sem consultar o catálogo. */
  irrestrito: boolean;
  /** Rotas liberadas em usuarios_paginas (mais a própria Cia do cmt_cia). */
  rotas: ReadonlySet<string>;
  /** id em usuarios_portal; null para a credencial de emergência. */
  usuarioId: string | null;
};

const NEGADA: Autorizacao = {
  valida: false,
  deveTrocarSenha: false,
  irrestrito: false,
  rotas: new Set(),
  usuarioId: null,
};

function irrestrita(usuarioId: string | null, deveTrocarSenha = false): Autorizacao {
  return { valida: true, deveTrocarSenha, irrestrito: true, rotas: new Set(), usuarioId };
}

type LinhaAutorizacao = {
  id: string;
  ativo: boolean;
  sessao_versao: number;
  deve_trocar_senha: boolean;
};

/**
 * Sessão + autorização da requisição atual, memoizada por requisição.
 * Único ponto de leitura: exigirPagina, exigirComando, layout e actions
 * chamam isto e dividem a mesma ida ao banco.
 */
export const contextoSessao = cache(
  async (): Promise<{ sessao: Sessao | null; aut: Autorizacao }> => {
    const sessao = await sessaoAtual();
    if (!sessao) return { sessao: null, aut: NEGADA };

    if (!supabaseConfigurado()) {
      // Modo prévia sem banco: espelha a doutrina da credencial de emergência.
      return {
        sessao,
        aut: sessao.perfil === "comando" ? irrestrita(null) : NEGADA,
      };
    }

    try {
      const c = createAdminClient();
      const { data: linha, error } = await c
        .from("usuarios_portal")
        .select("id, ativo, sessao_versao, deve_trocar_senha")
        .eq("usuario", sessao.usuario)
        .maybeSingle<LinhaAutorizacao>();
      if (error) throw new Error(error.message);

      if (!linha) {
        // Sem linha no banco só se sustenta a credencial de emergência do
        // Comando (env CCO16_USUARIO), que loga com perfil comando.
        return {
          sessao,
          aut: sessao.perfil === "comando" ? irrestrita(null) : NEGADA,
        };
      }

      if (!linha.ativo) return { sessao, aut: NEGADA };
      // Cookie emitido antes da migration 023 não tem sv: vale como versão 1.
      if ((sessao.sv ?? 1) !== linha.sessao_versao) return { sessao, aut: NEGADA };

      if (sessao.perfil === "comando") {
        return { sessao, aut: irrestrita(linha.id, linha.deve_trocar_senha) };
      }

      const { data: concedidas, error: erroRotas } = await c
        .from("usuarios_paginas")
        .select("rota")
        .eq("usuario_id", linha.id);
      if (erroRotas) throw new Error(erroRotas.message);

      const rotas = new Set((concedidas ?? []).map((r: { rota: string }) => r.rota));
      // O comandante nunca depende de concessão para abrir a própria unidade.
      if (sessao.perfil === "cmt_cia" && sessao.unidade) {
        rotas.add(`/companhia/${sessao.unidade}`);
      }

      return {
        sessao,
        aut: {
          valida: true,
          deveTrocarSenha: linha.deve_trocar_senha,
          irrestrito: false,
          rotas,
          usuarioId: linha.id,
        },
      };
    } catch (erro) {
      console.error("[permissoes] falha ao resolver autorização:", erro);
      return {
        sessao,
        aut: sessao.perfil === "comando" ? irrestrita(null) : NEGADA,
      };
    }
  }
);

/**
 * Guarda de página: toda page.tsx do grupo (command) chama isto na primeira
 * linha, passando a PRÓPRIA rota estática. Sessão inválida volta ao login
 * (com o destino preservado); senha provisória cai na troca obrigatória;
 * página não liberada devolve 404, o mesmo tratamento que /companhia/[cia]
 * já dava a quem forçava URL de outra unidade (não revela o que existe).
 */
export async function exigirPagina(rota: string): Promise<Sessao> {
  const { sessao, aut } = await contextoSessao();
  if (!sessao || !aut.valida) {
    redirect(`/login?redirect=${encodeURIComponent(rota)}`);
  }
  if (aut.deveTrocarSenha) redirect("/trocar-senha");
  if (!aut.irrestrito && !rotaEstaPermitida(aut.rotas, rota)) notFound();
  return sessao;
}

/** Guarda da área de gestão de acessos: sessão válida E perfil comando. */
export async function exigirComando(): Promise<Sessao> {
  const { sessao, aut } = await contextoSessao();
  if (!sessao || !aut.valida) redirect("/login?redirect=/administrativo/usuarios");
  if (aut.deveTrocarSenha) redirect("/trocar-senha");
  if (sessao.perfil !== "comando") notFound();
  return sessao;
}

/** Sessão válida, sem exigência de página (ex.: /sem-acesso). */
export async function exigirSessaoValida(): Promise<Sessao> {
  const { sessao, aut } = await contextoSessao();
  if (!sessao || !aut.valida) redirect("/login");
  if (aut.deveTrocarSenha) redirect("/trocar-senha");
  return sessao;
}

/** Unidades cujo painel a sessão pode abrir, derivadas da autorização. */
export function unidadesDaAutorizacao(aut: Autorizacao): Unidade[] {
  const todas = UNIDADES.map((u) => u.valor) as Unidade[];
  if (aut.irrestrito) return todas;
  return todas.filter((v) => rotaEstaPermitida(aut.rotas, `/companhia/${v}`));
}

/** O comparativo das 5 unidades exige a rota '/companhia' liberada. */
export function comparativoPermitido(aut: Autorizacao): boolean {
  return aut.irrestrito || rotaEstaPermitida(aut.rotas, "/companhia");
}

/**
 * Seções de documentosecoes_visibilidade que a sessão pode baixar. Comando e
 * Estado-Maior enxergam tudo (dado administrativo, sem exigência de LGPD
 * distinta da que já vale no restante do portal); os demais perfis só as
 * seções cuja página equivalente está liberada, mais 'publico' sempre.
 *
 * Fecha o furo em que /api/documentos-secoes/[id]/download só exigia sessão
 * válida, então um Cmt de Cia logado baixava por id qualquer documento de
 * qualquer outra Cia ou seção.
 */
export function secoesDocumentoPermitidas(
  sessao: Sessao | null,
  aut: Autorizacao
): "todas" | ReadonlySet<string> {
  if (!sessao || !aut.valida) return new Set();
  if (aut.irrestrito || sessao.perfil === "estado_maior") return "todas";
  // Quem administra a distribuição de documentos (Setor Administrativo →
  // Documentos) decide ali mesmo, por seção, quem recebe cada arquivo — a
  // própria tela já concede acesso irrestrito a todo documento existente,
  // então negar o preview/download por lá seria quebrar a ferramenta que
  // concede a visibilidade, não reforçá-la.
  if (rotaEstaPermitida(aut.rotas, "/administrativo/documentos")) return "todas";
  const secoes = new Set<string>(["publico"]);
  for (const rota of aut.rotas) {
    const secao = ROTA_PARA_SECAO_DOCUMENTO[rota];
    if (secao) secoes.add(secao);
  }
  // O comandante sempre baixa o que é da própria unidade, com ou sem
  // concessão explícita (mesma regra de unidadesDaAutorizacao acima).
  if (sessao.perfil === "cmt_cia" && sessao.unidade) {
    secoes.add(`cia_${sessao.unidade}`);
  }
  return secoes;
}

/**
 * Destino pós-login ciente das permissões: Comando cai na Visão Geral, o Cmt
 * de Cia no painel da unidade, os demais na primeira página liberada (na
 * ordem do catálogo, que espelha a navegação). Sem nenhuma página liberada,
 * cai num aviso claro em vez de num 404 mudo.
 */
export async function rotaInicialPermitida(sessao: Sessao): Promise<string> {
  if (sessao.perfil === "comando") return "/overview";
  if (sessao.perfil === "cmt_cia" && sessao.unidade) {
    return `/companhia/${sessao.unidade}`;
  }
  const { aut } = await contextoSessao();
  if (!aut.valida) return "/login";
  for (const pagina of PAGINAS_ADMINISTRAVEIS) {
    if (rotaEstaPermitida(aut.rotas, pagina.rota)) return pagina.rota;
  }
  return "/sem-acesso";
}
