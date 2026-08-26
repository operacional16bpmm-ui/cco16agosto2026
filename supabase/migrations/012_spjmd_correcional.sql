-- ----------------------------------------------------------------------------
-- 012_spjmd_correcional.sql
-- SPJMD (Seção de Justiça e Disciplina Militar) — processos disciplinares,
-- IPM/IP/Sindicâncias/PD e acervo documental do cartório.
--
-- Fonte: Y:\matrix\SPJMD (espelhado localmente em
--   Z:\16BPMM_EM\SPJMD\MATRIX — usado porque Y: fica intermitente ~9h/dia).
--   - "PLANILHA CONTROLE DE IPM.xlsx", "Controle Prazo de IPM.xlsx",
--     "Situação IPM 2024.xlsx", "QUANTITATIVO ATUALIZADO DE IPM - MDIP.xlsx",
--     "MDIP 22 ate 25.xlsx", "Fuzis Apreendidos 24 e 25.xlsx"
--   - Local: para_aceitar_atraso.csv (processos com prazo vencido)
--   - Acervo por subárea (contagem de arquivos, não conteúdo): CARTÓRIO,
--     SINDICÂNCIAS, PD, IP, APURAÇÃO PRELIMINAR, REGISTRO DE FATO,
--     EVIDÊNCIA DIGITAIS.
--
-- LGPD / sensibilidade: por decisão do usuário (2026-07-19), a página
-- /spjmd mostra DETALHE COMPLETO para qualquer usuário autenticado do
-- portal (não só agregados). Ainda assim: RLS restringe a
-- is_operational_member() (nunca a "anon"), e toda leitura da página deve
-- gravar em public.audit_events (já existente) para trilha de acesso —
-- responsabilidade da camada de aplicação, não desta migration.
-- ----------------------------------------------------------------------------

create table if not exists public.spjmd_processos (
  id bigint generated always as identity primary key,
  numerador text,
  origem text,
  encaminhado_para text,
  natureza text,
  prioridade text,
  data_tramitacao date,
  dias_parado integer,
  data_fato date,
  data_prazo date,
  dias_prazo_vencido integer,
  status text,
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_spjmd_processos_status on public.spjmd_processos (status);
create index if not exists idx_spjmd_processos_prazo on public.spjmd_processos (dias_prazo_vencido);

create table if not exists public.spjmd_ipm (
  id bigint generated always as identity primary key,
  numero_ipm text,
  ano integer,
  tipo text,                 -- IPM / IP / MDIP / Sindicância / PD
  encarregado text,
  situacao text,              -- em andamento / concluído / arquivado
  prazo date,
  dias_atraso integer,
  objeto text,                -- descrição sucinta (evitar dado pessoal de terceiro quando possível)
  origem_arquivo text not null,
  aba text,
  extra jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_spjmd_ipm_ano on public.spjmd_ipm (ano);
create index if not exists idx_spjmd_ipm_situacao on public.spjmd_ipm (situacao);

create table if not exists public.spjmd_acervo_contagem (
  id bigint generated always as identity primary key,
  subarea text not null,       -- CARTORIO / IPM / SINDICANCIAS / PD / IP / APURACAO_PRELIMINAR / REGISTRO_DE_FATO / EVIDENCIA_DIGITAL
  ano integer,
  quantidade_arquivos integer not null,
  fonte text,                   -- caminho da subpasta contada
  contado_em timestamptz not null default now(),
  unique (subarea, ano)
);

create table if not exists public.spjmd_arquivos_fonte (
  id bigint generated always as identity primary key,
  dataset text not null,        -- processos / ipm / acervo
  nome_arquivo text not null,
  caminho_unc text not null,
  aba text,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now(),
  unique (dataset, caminho_unc, aba)
);

-- ----------------------------------------------------------------------------
-- RLS — mesmo padrão das migrações 008/009/010/011.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'spjmd_processos','spjmd_ipm','spjmd_acervo_contagem','spjmd_arquivos_fonte'
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
