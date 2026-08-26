-- ----------------------------------------------------------------------------
-- 014_motomec_historico.sql
-- Motomec — séries históricas mensais complementares às tabelas
-- demonstrativas da migration 009 (que carregou só o "estado atual" MOTOMEC
-- 2026). Aqui: composição mensal da frota (Mapa Descritivo) 2021-2026, com
-- tabela irmã para o histórico de remanejamentos mensais — mesma decisão de
-- modelagem (tabela dedicada por domínio, não fato_secao, porque cada linha
-- é um registro de viatura, não um indicador agregado).
--
-- Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M\
--   MOTOMEC <ano>\MAPA DESCRITIVO[ DE VIATURAS]\<mês>[ <ano>].xlsx
--   (abas "Descritivo" e "Remanejada"/"Reamanejada", conforme o ano).
-- MOTOMEC 2020 não tem pasta MAPA DESCRITIVO própria (só um mirror parcial
-- de MOTOMEC 2021 dentro de MOTOMEC 2020\MOTOMEC 2021\, mesmo conteúdo —
-- não conta como ano adicional). Cobertura real: 2021-2026, meses esparsos
-- (a pasta só é atualizada em alguns meses do ano, não todo mês).
-- ----------------------------------------------------------------------------

create table if not exists public.motomec_frota_mensal (
  id bigint generated always as identity primary key,
  ano integer not null,
  mes integer not null,
  patrimonio text,
  gpo text,
  conv text,
  prefixo text not null,
  prefixo_anterior text,
  ano_fabricacao text,
  placa text,
  marca text,
  modelo text,
  combustivel text,
  unidade text,
  cia text,
  situacao text,
  observacao text,
  tipo_policiamento text,
  origem_arquivo text,
  atualizado_em timestamptz not null default now(),
  unique (ano, mes, prefixo)
);
create index if not exists idx_motomec_frota_mensal_periodo on public.motomec_frota_mensal (ano, mes);
create index if not exists idx_motomec_frota_mensal_prefixo on public.motomec_frota_mensal (prefixo);

create table if not exists public.motomec_remanejamento_mensal (
  id bigint generated always as identity primary key,
  ano integer not null,
  mes integer not null,
  patrimonio text,
  gpo text,
  conv text,
  prefixo text not null,
  prefixo_anterior text,
  ano_fabricacao text,
  placa text,
  marca text,
  modelo text,
  combustivel text,
  unidade text,
  cia text,
  situacao text,
  tipo_policiamento text,
  destino text,
  origem_arquivo text,
  atualizado_em timestamptz not null default now(),
  unique (ano, mes, prefixo)
);
create index if not exists idx_motomec_remanej_mensal_periodo on public.motomec_remanejamento_mensal (ano, mes);

-- ----------------------------------------------------------------------------
-- RLS — mesmo padrão da migration 009.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'motomec_frota_mensal','motomec_remanejamento_mensal'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists op_read_%s on public.%I', t, t);
    execute format('create policy op_read_%s on public.%I for select to authenticated using (public.is_operational_member())', t, t);
    execute format('drop policy if exists admin_write_%s on public.%I', t, t);
    execute format('create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())', t, t);
  end loop;
end $$;
