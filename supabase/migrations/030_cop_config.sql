-- ============================================================================
-- CCO-16 — Migration 030: configuração do painel da COP (chave/valor).
--
-- POR QUE ESTA TABELA EXISTE
--
-- A "janela do padrão de atenção" (quantos dias corridos a caixa `Pontos de
-- atenção` usa para caracterizar padrão de desvio) é uma DETERMINAÇÃO DO
-- COMANDO — está escrito assim na própria tela de admin, ao lado das metas do
-- Batalhão, com a data do despacho do Major em 02/09/2026.
--
-- Até aqui ela morava num COOKIE (`lib/cop2026-config-atencao.ts`). O efeito
-- disso só aparece com mais de uma pessoa: o Major abria o admin, ajustava para
-- 14 dias, e o valor passava a valer apenas no navegador DELE. O Comandante que
-- abrisse o mesmo painel no celular continuava vendo os 7 dias do padrão, sem
-- nenhum aviso de que estava lendo outra régua. Uma decisão do Comando que vale
-- para uma aba só não é uma decisão do Comando.
--
-- Chave/valor em vez de coluna nomeada: o que vem a seguir (janela de outras
-- caixas, cortes de exibição) é da mesma natureza — parâmetro de PAINEL, não de
-- meta —, e cada um deles não merece uma migration própria. As metas continuam
-- em `cop_auditoria_parametro`, que tem forma própria e outra semântica.
--
-- O valor é TEXTO e quem interpreta é a aplicação: aqui não cabe saber que
-- `cop.janela_atencao_dias` é um inteiro entre 7 e 31. O clamp vive em
-- `lib/cop2026-config-atencao.ts`, que já o aplicava na leitura E na escrita.
-- ============================================================================

create table if not exists public.cop_config (
  chave         text primary key,
  valor         text        not null,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);

comment on table public.cop_config is
  'Parâmetros de exibição do painel da COP 2026 (não são metas). Decisão do Comando, válida para todos os leitores — ver migration 030.';
comment on column public.cop_config.valor is
  'Sempre texto; a aplicação converte e valida a faixa.';

-- ---------------------------------------------------------------------------
-- RLS: fechada para a chave pública, igual às demais tabelas do domínio.
--
-- `verificar:seguranca` afirma que toda tabela do domínio devolve ZERO linha
-- para a chave publicável. Sem policy nenhuma e com RLS ligada, é exatamente
-- isso que acontece — o acesso do servidor usa a service role, que ignora RLS.
-- Deixar a tabela sem RLS a exporia à internet, que foi como as duas tabelas de
-- backup vazaram antes da rede existir.
-- ---------------------------------------------------------------------------
alter table public.cop_config enable row level security;
