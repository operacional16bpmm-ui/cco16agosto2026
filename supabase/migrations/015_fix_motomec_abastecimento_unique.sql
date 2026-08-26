-- ----------------------------------------------------------------------------
-- 015_fix_motomec_abastecimento_unique.sql
-- BUGFIX real, encontrado durante a ingestão do histórico 2025 (ver
-- ingest/secoes/motomec_historico.py): a constraint unique(cupom_fiscal,
-- produto,prefixo) da migration 009 assumia cupom fiscal globalmente único,
-- mas o número de cupom do SIAG É REUTILIZADO — transações sem cupom real
-- recebem placeholder "0" ou "1" no campo, e dezenas de abastecimentos
-- genuinamente distintos da mesma viatura/produto compartilham esse
-- placeholder. O upsert do abastecimento 2025 colidiu nessa tripla com 104
-- linhas de 2026 e SOBRESCREVEU o conteúdo dessas 104 linhas com o valor de
-- 2025 (mesmo id de linha, dado de 2026 perdido). Corrigido incluindo
-- data_abastecimento na chave de unicidade — duas transações com cupom
-- coincidente (ou "0"/"1" placeholder) em datas diferentes agora coexistem
-- como registros distintos, que é o comportamento correto. As 104 linhas de
-- 2026 perdidas foram restauradas reexecutando motomec_operacional.py (que
-- teve seu on_conflict atualizado para a chave de 4 colunas) — efeito
-- colateral positivo: a nova chave também destravou transações de 2026 que
-- a chave antiga já vinha colapsando silenciosamente desde a migration 009
-- (bug pré-existente, não introduzido nesta rodada).
-- ----------------------------------------------------------------------------
alter table public.motomec_abastecimento
  drop constraint motomec_abastecimento_cupom_fiscal_produto_prefixo_key;
alter table public.motomec_abastecimento
  add constraint motomec_abastecimento_cupom_produto_prefixo_data_key
  unique (cupom_fiscal, produto, prefixo, data_abastecimento);
