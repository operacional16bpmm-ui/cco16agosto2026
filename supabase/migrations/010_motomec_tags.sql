-- ----------------------------------------------------------------------------
-- 010_motomec_tags.sql
-- Cadastro de TAG de abastecimento (SIAG "sem parar") por viatura/Cia.
--
-- Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M\MOTOMEC 2026\
-- ABASTECIMENTO\TAGs DE ABASTECIMENTO E NOVOS CARTÕES\
-- TAG - PLANILHA DE CADASTRO DAS VIATURAS 16º BPMM.xlsx (aba "TOTAL" — a
-- consolidada; as abas "1ª CIA".."4ª CIA"/"FT"/"P2"/"SERÁ REMANEJADA" são o
-- mesmo dado desmembrado por seção, sem informação nova além do que já está
-- na TOTAL. "Plan1" é lixo — 1 linha solta).
--
-- A aba TOTAL é organizada em blocos com um rótulo de seção
-- ("EM (feito 10 cadastros da TAGs)", "1ª CIA (feito 17 cadastros da TAGs)",
-- ..., "ROCAM (...)", "VIATURAS DE REMANEJAMENTO COM AS TAGs JÁ CADASTRADAS
-- - 29") seguido das linhas BATALHÃO/PREFIXO/EMPLACAMENTO/MARCA/MODELO/
-- Nº DA TAG/OBSERVAÇÕES. As 3 últimas linhas da aba são resumo numérico
-- ("TAGs RECEBIDAS - 159" etc.) — descartadas na ingestão.
-- ----------------------------------------------------------------------------
create table if not exists public.motomec_tags (
  id bigint generated always as identity primary key,
  secao text,                 -- rótulo do bloco de origem: EM / 1ª CIA / .. / ROCAM / VIATURAS DE REMANEJAMENTO...
  prefixo text not null,
  emplacamento text,
  marca text,
  modelo text,
  num_tag text,                -- "0000017981" ou texto livre ("será descarregada")
  status_tag text,              -- QRV / BAIXADA / observação livre da coluna OBSERVAÇÕES
  instalacao text,              -- colado / entregue / ok (coluna extra, quando presente)
  origem_arquivo text,
  atualizado_em timestamptz not null default now(),
  unique (prefixo)
);
create index if not exists idx_motomec_tags_secao on public.motomec_tags (secao);

alter table public.motomec_tags enable row level security;
revoke all on public.motomec_tags from anon;
grant select, insert, update, delete on public.motomec_tags to authenticated;
drop policy if exists op_read_motomec_tags on public.motomec_tags;
create policy op_read_motomec_tags on public.motomec_tags for select to authenticated using (public.is_operational_member());
drop policy if exists admin_write_motomec_tags on public.motomec_tags;
create policy admin_write_motomec_tags on public.motomec_tags for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin());
