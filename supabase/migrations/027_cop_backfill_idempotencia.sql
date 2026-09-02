-- ============================================================================
-- CCO-16 — Migration 027: idempotência da importação de agosto.
--
-- "Importado 1× da planilha" não tem guarda contra rodar duas vezes — e é
-- assim que a meta de 960 vira 1920 num painel que ninguém desconfia. O
-- backfill (scripts/backfill-agosto.mjs) grava, em `payload_bruto`:
--
--   hashLinha    sha256 da LINHA CRUA do CSV, antes de qualquer interpretação
--   linhaOrigem  número da linha na planilha (as respostas começam na 4)
--   importadoEm  carimbo da importação
--   fonteSha256  sha256 do CSV inteiro no momento da importação
--
-- O índice abaixo é o que transforma "rodar de novo" em conflito silencioso em
-- vez de duplicata. Índice funcional sobre o jsonb, e não coluna nova, porque a
-- informação é da IMPORTAÇÃO e não do lançamento: um lançamento feito pelo
-- formulário nunca terá hash de linha, e uma coluna nula em 100% das linhas
-- novas seria ruído no schema.
--
-- `fonteSha256` existe porque a planilha publicada JÁ foi restringida uma vez
-- (26/08/2026) e pode ser despublicada ou editada a qualquer momento. Sem
-- guardar o hash do CSV que foi lido, "agosto está congelado" é afirmação que
-- não se consegue provar depois.
-- ============================================================================

create unique index if not exists cop_lanc_hash_linha_uidx
  on public.cop_auditoria_lancamento ((payload_bruto->>'hashLinha'))
  where (payload_bruto ? 'hashLinha');

comment on index public.cop_lanc_hash_linha_uidx is
  'Idempotência do backfill: a mesma linha da planilha não entra duas vezes, mesmo em execuções separadas.';
