-- ----------------------------------------------------------------------------
-- 009_motomec_operacional.sql
-- Motomec — dados demonstrativos além da frota (que já vive em public.viaturas,
-- migration 002). Mesma decisão de modelagem da 008 (P4): tabelas dedicadas por
-- domínio (padrão p4_*), não o framework genérico fato_secao, porque cada
-- dataset abaixo é item-a-item (uma transação/ocorrência/processo), não série
-- temporal agregada.
--
-- Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M\MOTOMEC 2026\
-- (varredura completa de todas as abas de todos os .xlsx/.xlsm candidatos,
-- 19JUL2026 — ver relatório da ingestão para a lista de arquivos/abas
-- inspecionados e descartados).
--
-- Aplicada via MCP Supabase; este arquivo espelha o que foi executado (mesmo
-- padrão documentado nas migrations 007/008).
-- ----------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- Abastecimento — transações de combustível/produtos por viatura (cartão
-- SIAG/Vale Card). Fonte: ABASTECIMENTO\<mês>\Relatório_Analise de Consumo...
-- xlsx (aba "Dados"), um relatório por quinzena/mês.
-- --------------------------------------------------------------------------
create table if not exists public.motomec_abastecimento (
  id bigint generated always as identity primary key,
  placa text,
  prefixo text,
  data_abastecimento timestamptz,
  motorista text,
  produto text,
  fabricante text,
  estabelecimento text,
  cidade text,
  uf text,
  distancia numeric,
  consumo numeric,
  hodometro numeric,
  quantidade numeric,
  valor_unitario numeric(12,4),
  valor_total numeric(12,2),
  cupom_fiscal text,
  programa_policiamento text,
  origem_arquivo text,
  atualizado_em timestamptz not null default now(),
  unique (cupom_fiscal, produto, prefixo)
);
create index if not exists idx_motomec_abast_prefixo on public.motomec_abastecimento (prefixo);
create index if not exists idx_motomec_abast_data on public.motomec_abastecimento (data_abastecimento);

-- --------------------------------------------------------------------------
-- Empenhos — notas de empenho (NE) de manutenção/aquisição por viatura.
-- Fonte: Empenhos 2026.xlsx (aba Plan1) — supera em cobertura o subconjunto
-- redundante "EMPENHOS NOS ULTIMOS 3 MESES.xlsx" (mesmas colunas, só prefixo+
-- data, já contido neste arquivo maior).
-- --------------------------------------------------------------------------
create table if not exists public.motomec_empenhos (
  id bigint generated always as identity primary key,
  item_num integer,
  marca text,
  modelo text,
  placa text,
  prefixo text,
  prazo_entrega text,
  ne text,
  valor_total numeric(12,2),
  sei text,
  data_orcamento date,
  atualizado_em timestamptz not null default now(),
  unique (ne)
);
create index if not exists idx_motomec_empenhos_prefixo on public.motomec_empenhos (prefixo);

-- --------------------------------------------------------------------------
-- Acidentes de trânsito com viatura moto — por Cia, com sindicância.
-- Fonte: PLANILHAS ACIDENTE COM MOTO PREENCHIDAS PELAS CIAS\GERAL.xlsx
-- (aba Planilha1, consolidado das 4 Cias + FT — os arquivos por Cia
-- individuais são o mesmo dado desmembrado, não somam informação nova).
-- --------------------------------------------------------------------------
create table if not exists public.motomec_acidentes (
  id bigint generated always as identity primary key,
  unidade text not null,          -- 1ª CIA / 2ª CIA / 3ª CIA / 4ª CIA / FORÇA TÁTICA
  cia_id integer,                 -- null para FT
  sindicancia text not null,
  data_acidente date,
  lesao_pm text,
  morte_pm boolean,
  moto_lander boolean,
  atualizado_em timestamptz not null default now(),
  unique (sindicancia)
);
create index if not exists idx_motomec_acidentes_cia on public.motomec_acidentes (cia_id);

-- --------------------------------------------------------------------------
-- Processo de descarga (baixa) de viatura — pipeline de sucateamento/baixa.
-- Fonte: PROCESSO DE DESCAGA\DESCARGA DE VIATURA atualizado em 07JUL26.xlsx
-- (abas "DESCARGAS." = em andamento/sindicância, "DESCARGAS FINALIZADAS").
-- --------------------------------------------------------------------------
create table if not exists public.motomec_descarga (
  id bigint generated always as identity primary key,
  prefixo text,
  placa text,
  fase text not null,             -- em_andamento / finalizada
  telemetria text,
  giroflex text,
  radio text,
  num_descarga text,
  status text,
  observacao text,
  atualizado_em timestamptz not null default now(),
  unique (placa, fase, num_descarga)
);
create index if not exists idx_motomec_descarga_prefixo on public.motomec_descarga (prefixo);
create index if not exists idx_motomec_descarga_fase on public.motomec_descarga (fase);

-- --------------------------------------------------------------------------
-- Remanejamento/recolha de viatura excedente — decisão de manter, remanejar
-- ou cancelar remanejamento, por prefixo.
-- Fonte: RECOLHA DE VIATURAS CMM - PLANILHA GERAL (TRAILL E EXCEDENTES) -
-- Atualizado 16JUN25.xlsx (aba "16M").
-- --------------------------------------------------------------------------
create table if not exists public.motomec_remanejamento (
  id bigint generated always as identity primary key,
  marca_modelo text,
  prefixo text not null,
  situacao text,
  atualizado_em timestamptz not null default now(),
  unique (prefixo)
);

create table if not exists public.motomec_arquivos_fonte (
  id bigint generated always as identity primary key,
  dataset text not null,
  nome_arquivo text not null,
  caminho_unc text not null,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now(),
  unique (dataset, caminho_unc)
);

-- ----------------------------------------------------------------------------
-- RLS — mesmo padrão das migrações 002/008. Ingestão roda via service role
-- (bypassa RLS); estas políticas governam a SPA autenticada.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'motomec_abastecimento','motomec_empenhos','motomec_acidentes',
    'motomec_descarga','motomec_remanejamento','motomec_arquivos_fonte'
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
