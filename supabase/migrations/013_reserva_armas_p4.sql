-- ----------------------------------------------------------------------------
-- 013_reserva_armas_p4.sql
-- Reserva de Armas — troca de fonte: de amostra/seed (003) para dado real
-- derivado de public.p4_material_belico (ingerido pela 008/scripts/ingest_p4.py).
--
-- Por quê: a pasta de rede dedicada a Reserva de Armas
-- (\\cmdo\pmesp\16BPMM\16BPMM_EM\RES_ARMAS\) só contém um arquivo em toda a
-- árvore — "RELATÓRIO COP - EM - F TAT AGO24.docx", de AGO/2024 — desatualizado
-- demais para "situação atual". p4_material_belico já tem 1.612 armas de
-- porte/portáteis reais, com ESTADO (RESERVA, CARGA PESSOAL, APREENDIDA,
-- MANUTENÇÃO, ...) por Cia, ingeridas em 19JUL2026. Ver
-- ingest/secoes/reserva_armas.py para a lógica de agregação completa.
--
-- public.reserva_armas (schema da 002) é reaproveitada como está — o par
-- total/disponíveis/retidas já modela exatamente o que sobra depois de
-- restringir ao universo "na reserva" (estado RESERVA / RESERVA DE ARMAS /
-- DISPONÍVEL), com "retidas" = MANUTENÇÃO / AGUARDANDO DESCARGA dentro desse
-- mesmo universo.
--
-- O que NÃO cabe no par disponível/retida: armas em ocorrência jurídica
-- (apreendida, roubo, furto, extraviada, não encontrada) não são nem
-- "disponível" nem "retida" no sentido do armário — são um problema à parte.
-- Nova tabela para não forçar esse dado no par binário.
-- ----------------------------------------------------------------------------
create table if not exists public.reserva_armas_criticas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (char_length(trim(categoria)) between 2 and 120),
  situacao text not null check (situacao in ('Apreendida', 'Roubo', 'Furto', 'Extraviada', 'Não encontrada')),
  quantidade integer not null check (quantidade >= 0),
  data_referencia date not null check (extract(year from data_referencia) = 2026),
  source_document text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (categoria, situacao, data_referencia)
);

alter table public.reserva_armas_criticas enable row level security;
revoke all on public.reserva_armas_criticas from anon;
grant select, insert, update, delete on public.reserva_armas_criticas to authenticated;

drop policy if exists op_read_reserva_armas_criticas on public.reserva_armas_criticas;
create policy op_read_reserva_armas_criticas on public.reserva_armas_criticas
  for select to authenticated using (public.is_operational_member());

drop policy if exists admin_write_reserva_armas_criticas on public.reserva_armas_criticas;
create policy admin_write_reserva_armas_criticas on public.reserva_armas_criticas
  for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin());
