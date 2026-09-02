-- ============================================================================
-- CCO-16 — Migration 028: `re|data|turno` NÃO é chave única. Medido, não achado.
--
-- A migration 026 criou `cop_lanc_dedup_uidx` como índice ÚNICO sobre
-- `chave_dedup` (`re_base|data|turno`), partindo de uma premissa razoável e
-- ERRADA: a de que cada policial lança uma vez por turno.
--
-- O primeiro dry-run do backfill de agosto derrubou a premissa. Na planilha
-- real (104 lançamentos de agosto/2026, CSV congelado em
-- supabase/congelado/): **12 grupos com a mesma chave**, um deles com NOVE
-- lançamentos e outro com OITO. E, conferindo identificador por identificador,
-- os 12 grupos têm **sobreposição zero**:
--
--   149424 · 30/08 · Noturno ·  8 lançamentos · 40 identificadores · 40 distintos
--   990660 · 28/08 · Noturno ·  3 lançamentos · 17 identificadores · 17 distintos
--   100371 · 27/08 · Diurno  ·  2 lançamentos · 12 identificadores · 12 distintos
--   (… 9 grupos com o mesmo padrão)
--
-- Ou seja: a tropa audita, lança o que já conferiu, volta ao serviço e lança
-- mais. São lançamentos COMPLEMENTARES, não duplicatas — e o índice único
-- recusaria 20 lançamentos legítimos de agosto na importação, além de rejeitar
-- o segundo lançamento honesto de cada policial em setembro. O painel cairia e
-- a culpa pareceria da tropa.
--
-- ONDE A UNICIDADE REALMENTE MORA, e por que nada se perde aqui:
--
--   * `cop_evid_re_uidx` (C-1) — um identificador conta UMA vez por policial,
--     para sempre. É esta a invariante que pega o replay, que é a fraude real:
--     24 identificadores repetidos em agosto, um deles 6 vezes.
--   * `cop_lanc_submissao_uidx` — o mesmo envio reenviado em 4G ruim não vira
--     duas linhas.
--   * `cop_lanc_hash_linha_uidx` (027) — a mesma linha da planilha não é
--     importada duas vezes.
--
-- A `chave_dedup` continua gravada e indexada, agora sem unicidade: ela serve
-- para AGRUPAR (mostrar ao Comando os vários lançamentos de um mesmo turno) e
-- para a dedup entre origens na união planilha+banco. O que ela nunca deveria
-- ter feito é proibir.
-- ============================================================================

drop index if exists public.cop_lanc_dedup_uidx;

create index if not exists cop_lanc_dedup_idx
  on public.cop_auditoria_lancamento (chave_dedup)
  where excluido_em is null;

comment on index public.cop_lanc_dedup_idx is
  'Agrupa lançamentos do mesmo policial/data/turno. NÃO é única: 12 grupos de agosto/2026 provam que o lançamento complementar no mesmo turno é o uso normal.';
