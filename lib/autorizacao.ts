import type { Unidade } from "@/lib/unidades";
import type { Sessao } from "@/lib/auth-simples";

/**
 * Regras de autorização que dependem SÓ do perfil da sessão (síncronas, sem
 * banco). A visibilidade de página e de unidade deixou de morar aqui na
 * migration 023: quem decide o que cada sessão ABRE é lib/db/permissoes.ts,
 * consultando usuarios_paginas (unidadesDaAutorizacao, comparativoPermitido,
 * exigirPagina). Este módulo guarda o que continua sendo doutrina de perfil:
 * quem pode ESCREVER lançamento e quem pode ver dado nominal.
 */

/**
 * Quem pode lançar pendência, justificativa ou meta na unidade: o comandante
 * dela e o Comando. Estado-Maior e seções acompanham em leitura.
 */
export function podeLancar(sessao: Sessao | null, unidade: Unidade): boolean {
  if (!sessao) return false;
  if (sessao.perfil === "comando") return true;
  return sessao.perfil === "cmt_cia" && sessao.unidade === unidade;
}

/**
 * Dado nominal do DEJEM (RE e nome de policial em falta ou em carga extrema)
 * só para Comando e Estado-Maior.
 *
 * Função própria, e não reuso de podeVerComparativo, porque o critério aqui é
 * outro: lá é escopo de unidade, aqui é proteção de dado pessoal de agente
 * público (LGPD, art. 7º, II c/c dever de sigilo funcional). Separadas, as
 * duas regras podem divergir sem que uma mudança na outra vaze nome.
 *
 * Contrato de uso: a lista nominal só pode ser CONSTRUÍDA quando isto for
 * verdadeiro. Filtrar no JSX não basta — em RSC o payload serializado das
 * props viaja para o navegador, então o nome vazaria no HTML mesmo sem ser
 * pintado na tela.
 */
export function podeVerNominal(sessao: Sessao | null): boolean {
  return sessao?.perfil === "comando" || sessao?.perfil === "estado_maior";
}
