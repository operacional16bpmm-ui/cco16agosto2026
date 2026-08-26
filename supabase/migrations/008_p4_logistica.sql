-- ----------------------------------------------------------------------------
-- 006_p4_logistica.sql
-- Módulo P4 · Logística do 16º BPM/M.
--
-- Segue o padrão p2_* (tabelas dedicadas por domínio + KPIs agregados), que é
-- o que está vivo e comprovado em produção — e não a camada genérica
-- fato_secao/agregado_dimensional (criada na 005 mas ainda com 0 linhas). O
-- P4 trata de patrimônio item-a-item (nº de série, patrimônio, detentor), não
-- de série temporal agregada; forçá-lo no shape genérico perderia o dado que
-- justamente dá valor à seção.
--
-- Fonte: Z:\16BPMM_EM\P4\P4 2026\ (1.738 arquivos, varredura de 19JUL2026).
-- ----------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- Livro de Carga de Material (LCM) — espinha dorsal do patrimônio da unidade.
-- Fonte: LCM\LCM - DL mais recente\#LCM - 16M - COMPLETO - 12JUN26.xlsx
-- 5.952 itens patrimoniados, R$ 36,7 mi sob carga.
-- --------------------------------------------------------------------------
create table if not exists public.p4_patrimonio (
  id bigint generated always as identity primary key,
  patrimonio text not null,
  tipo_mat text,                    -- DIVERSOS / ARMA / COLETE / VIATURA / TELECOMUNICAÇÃO / INFORMATICA
  nome_material text,
  especificacao text,
  valor numeric(14,2) default 0,
  num_serie text,
  num_serie_arma text,
  num_serie_colete text,
  placa_vtr text,
  opm_cod text,
  detentor_re text,
  detentor_nome text,
  atualizado_em timestamptz not null default now(),
  unique (patrimonio)
);
create index if not exists idx_p4_patrimonio_tipo on public.p4_patrimonio (tipo_mat);
create index if not exists idx_p4_patrimonio_opm on public.p4_patrimonio (opm_cod);
create index if not exists idx_p4_patrimonio_detentor on public.p4_patrimonio (detentor_re);

-- Material controlado por lote (munição, tonfa, escudo) — sem patrimônio individual.
create table if not exists public.p4_lotes (
  id bigint generated always as identity primary key,
  opm_cod text,
  tipo_mat text,
  nome text,
  quantidade integer default 0,
  valor_unitario numeric(14,2) default 0,
  divisao text,
  secao text,
  detentor_re text,
  detentor_nome text,
  atualizado_em timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Material bélico por Cia — armas de porte/portáteis, coletes e algemas, com
-- ESTADO (carga pessoal / reserva / apreendida / manutenção / descarga) e o
-- PM responsável. Consolidado GERAL + planilhas de cada Cia/EM/FT.
-- --------------------------------------------------------------------------
create table if not exists public.p4_material_belico (
  id bigint generated always as identity primary key,
  unidade text not null,            -- GERAL / 1ª Cia / 2ª Cia / 3ª Cia / 4ª Cia / EM / FT
  categoria text not null,          -- ARMA_PORTE / ARMA_PORTATIL / COLETE / ALGEMA
  ordem integer,
  tipo text,
  calibre text,
  num_serie text,
  patrimonio text,
  estado text,                      -- CARGA PESSOAL / RESERVA / APREENDIDA / MANUTENÇÃO / ...
  re text,
  dc text,
  nome text,
  qtd_municoes integer,
  observacoes text,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_p4_belico_unidade on public.p4_material_belico (unidade);
create index if not exists idx_p4_belico_categoria on public.p4_material_belico (categoria);
create index if not exists idx_p4_belico_estado on public.p4_material_belico (estado);

-- --------------------------------------------------------------------------
-- Telemática — ativos de TI/comunicações. Uma tabela com discriminador
-- `classe` em vez de 8 tabelas quase idênticas: as abas do SISTEL compartilham
-- quase todo o schema (patrimônio, série, situação, carga) e divergem só em
-- 1-2 campos, que ficam em `extra` (jsonb).
-- Fonte: TELEMÁTICA\SISTEL 16BPMM.xlsx (14 abas)
-- --------------------------------------------------------------------------
create table if not exists public.p4_telematica_ativos (
  id bigint generated always as identity primary key,
  classe text not null,             -- HT / TPD / COMPUTADOR / NOTEBOOK / CELULAR / IMPRESSORA / ETILOMETRO / ESTOQUE / DESCARGA
  tipo text,
  marca text,
  modelo text,
  patrimonio text,
  num_serie text,
  imei text,
  unidade text,                     -- EM / 1ª Cia / ... / FT
  situacao text,                    -- QRV / OPERANDO / MANUT. / PROC. DESCARGA
  carga text,
  re text,
  nome text,
  valor numeric(14,2),
  quantidade integer,
  observacao text,
  extra jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_p4_telem_classe on public.p4_telematica_ativos (classe);
create index if not exists idx_p4_telem_unidade on public.p4_telematica_ativos (unidade);
create index if not exists idx_p4_telem_situacao on public.p4_telematica_ativos (situacao);

-- Endereçamento IP por unidade (gateway/faixa) — TELEMÁTICA\IP REDE + aba IP's.
create table if not exists public.p4_telematica_rede (
  id bigint generated always as identity primary key,
  unidade text,
  descricao text,
  ip text,
  patrimonio text,
  observacao text,
  atualizado_em timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Efetivo — a equipe. Fonte: EFETIVO 2026\EFETIVO ATUALIZADO 15JUN.xlsx
-- (577 linhas) + ANTIGUIDADE OFICIAIS.
-- --------------------------------------------------------------------------
create table if not exists public.p4_efetivo (
  id bigint generated always as identity primary key,
  ordem integer,
  posto_grad text,
  re text,
  nome text not null,
  cia text,
  situacao text,                    -- APTO / restrição / afastado
  funcao text,
  fone text,
  email text,
  antiguidade integer,              -- posição na relação de antiguidade (oficiais)
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_p4_efetivo_cia on public.p4_efetivo (cia);
create index if not exists idx_p4_efetivo_re on public.p4_efetivo (re);

-- --------------------------------------------------------------------------
-- Inventário por seção/sala — extraído das tabelas dos .docx em
-- INVENTÁRIO 2026\inventário de cada seção\ e ALOJAMENTOS CONTROLE\.
-- --------------------------------------------------------------------------
create table if not exists public.p4_inventario_secao (
  id bigint generated always as identity primary key,
  secao text not null,              -- CMT / CoorDop / P1 / P5 / MOTOMEC / ALOJ CB E SD MASC / CASSINO ...
  patrimonio text,
  nome_material text,
  especificacao text,
  valor numeric(14,2),
  origem_arquivo text,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_p4_inv_secao on public.p4_inventario_secao (secao);

-- Coletes balísticos — romaneio + controle de vencimento (crítico: colete
-- vencido é PM desprotegido, então vencimento é KPI de primeira linha).
create table if not exists public.p4_coletes (
  id bigint generated always as identity primary key,
  patrimonio text,
  nome_material text,
  num_serie text,
  opm text,
  vencimento date,
  ano_vencimento integer,
  status text,
  tamanho text,
  status_carga text,
  posto text,
  nome text,
  re text,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_p4_coletes_venc on public.p4_coletes (ano_vencimento);

-- --------------------------------------------------------------------------
-- Inventário fotográfico — 769 fotos do material bélico por Cia/categoria.
-- O binário NÃO vai para o banco: guardamos o caminho do thumbnail servido
-- pelo site e o caminho UNC do original em rede (rastreabilidade).
-- --------------------------------------------------------------------------
create table if not exists public.p4_fotos_inventario (
  id bigint generated always as identity primary key,
  unidade text not null,            -- 1ª Cia / EM / FT / GERAL ...
  categoria text,                   -- ARMAS / ALGEMAS / COLETES / TAURUS / CAL .12
  nome_arquivo text not null,
  thumb_path text,                  -- /p4/fotos/<slug>.webp servido pelo site
  caminho_unc text not null,
  largura integer,
  altura integer,
  bytes_original bigint,
  atualizado_em timestamptz not null default now(),
  unique (caminho_unc)
);
create index if not exists idx_p4_fotos_unidade on public.p4_fotos_inventario (unidade, categoria);

-- --------------------------------------------------------------------------
-- Índice documental — os 1.738 arquivos da pasta P4, catalogados para busca e
-- rastreabilidade (LCM mensal, CMEX, detentor executivo, ofícios, escalas...).
-- --------------------------------------------------------------------------
create table if not exists public.p4_documentos (
  id bigint generated always as identity primary key,
  categoria text not null,          -- pasta de primeiro nível (LCM, OFÍCIO, UGE, ...)
  subcategoria text,
  nome_arquivo text not null,
  extensao text,
  caminho_unc text not null,
  bytes bigint,
  modificado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (caminho_unc)
);
create index if not exists idx_p4_docs_categoria on public.p4_documentos (categoria);

-- KPIs agregados (mesmo shape de p2_kpi_agregados) e proveniência.
create table if not exists public.p4_kpi_agregados (
  id bigint generated always as identity primary key,
  fonte text not null,
  dimensao text not null,
  chave text not null,
  valor numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (fonte, dimensao, chave)
);

create table if not exists public.p4_arquivos_fonte (
  id bigint generated always as identity primary key,
  nome_arquivo text not null,
  caminho_unc text not null,
  tipo text,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now(),
  unique (caminho_unc)
);

-- ----------------------------------------------------------------------------
-- RLS — mesmo padrão das migrações 002/005. A ingestão roda via service role
-- (bypassa RLS); estas políticas governam a SPA autenticada.
-- Atenção LGPD: p4_material_belico, p4_efetivo e p4_coletes vinculam RE e nome
-- de PM a arma/colete. Leitura restrita a membro operacional, como o restante.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'p4_patrimonio','p4_lotes','p4_material_belico','p4_telematica_ativos',
    'p4_telematica_rede','p4_efetivo','p4_inventario_secao','p4_coletes',
    'p4_fotos_inventario','p4_documentos','p4_kpi_agregados','p4_arquivos_fonte'
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
