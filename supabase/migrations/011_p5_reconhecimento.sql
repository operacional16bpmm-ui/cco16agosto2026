-- ----------------------------------------------------------------------------
-- 011_p5_reconhecimento.sql
-- P5 (Comunicação Social) — reconhecimento/mérito, além do que já existe em
-- comunicacao_* (imprensa, parcerias, snapshot).
--
-- Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\P5\{2025,2026,...}\
--   - LMP: "QUANTITATIVO MENSAL DE LMP PAGAS.xlsx", "Controle trimestral de
--     LMP - ABR MAI JUN.xlsx", "ANDAMENTO DAS LMP - JUNHOeJULHO.xlsx"
--   - Agraciados/medalhas: "AGRACIADOS 2023 à 2026.xlsx",
--     "MEDALHA CONCEDIDA EM TODOS ANOS.xlsx"
--   - Indicados: "GERAL - INDICADOS OFICIAL.xlsx", "banco_dados_INDICADOS.xlsx"
--   - Campanhas institucionais por Cia (mensal)
-- Cada tabela guarda as colunas normalizadas mais comuns + `extra` (jsonb)
-- para preservar qualquer coluna adicional específica de uma planilha sem
-- perder dado na ingestão.
-- ----------------------------------------------------------------------------

create table if not exists public.p5_lmp (
  id bigint generated always as identity primary key,
  ano integer,
  mes integer,
  trimestre integer,
  re text,
  nome_guerra text,
  cia text,
  tipo_lmp text,          -- ex.: "Bom Comportamento", "Dedicação ao Serviço"...
  status text,            -- paga / em andamento / indeferida
  quantidade integer,      -- quando a linha é um agregado mensal, não nominal
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_p5_lmp_periodo on public.p5_lmp (ano, mes);
create index if not exists idx_p5_lmp_cia on public.p5_lmp (cia);

create table if not exists public.p5_agraciados (
  id bigint generated always as identity primary key,
  ano integer,
  re text,
  nome_guerra text,
  cia text,
  medalha text,
  tipo text,               -- categoria da láurea/medalha
  data_concessao date,
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_p5_agraciados_ano on public.p5_agraciados (ano);

create table if not exists public.p5_indicados (
  id bigint generated always as identity primary key,
  ano integer,
  re text,
  nome_guerra text,
  cia text,
  objetivo text,            -- objetivo/critério da indicação
  status text,
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_p5_indicados_ano on public.p5_indicados (ano);

create table if not exists public.p5_campanhas (
  id bigint generated always as identity primary key,
  ano integer,
  mes integer,
  cia text,
  campanha text not null,
  quantidade numeric,
  unidade text,             -- peças, kg, cestas, R$...
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_p5_campanhas_periodo on public.p5_campanhas (ano, mes);

create table if not exists public.p5_arquivos_fonte (
  id bigint generated always as identity primary key,
  dataset text not null,     -- lmp / agraciados / indicados / campanhas
  nome_arquivo text not null,
  caminho_unc text not null,
  aba text,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now(),
  unique (dataset, caminho_unc, aba)
);

-- ----------------------------------------------------------------------------
-- RLS — mesmo padrão das migrações 008/009/010. Ingestão roda via service
-- role (bypassa RLS); estas políticas governam a SPA autenticada.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'p5_lmp','p5_agraciados','p5_indicados','p5_campanhas','p5_arquivos_fonte'
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
