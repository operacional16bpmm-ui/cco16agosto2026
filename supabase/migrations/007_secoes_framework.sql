-- ============================================================================
-- CCO-16 — Migration 007: framework de páginas por seção do batalhão.
--
-- PARTE 1 fecha o drift de schema das p2_* (criadas em produção via MCP,
-- fora de qualquer migration do repo — achado B13 da auditoria de
-- 19/07/2026). "create table if not exists" com o schema real, extraído de
-- information_schema.columns do projeto lypxujjyllmibxqvdogr em 19/07/2026:
-- é um no-op no banco já populado, mas devolve o repositório à condição de
-- fonte de verdade (um ambiente novo volta a conseguir reproduzir o schema).
-- p2_capturas_ssp e p2_produtividade_criminal (0 linhas nas duas, redundantes
-- com os agregados já em p2_kpi_agregados) são dropadas.
--
-- PARTE 2 cria o núcleo do framework de seções (P1, P3, P4, P5, Força
-- Tática, Motomec, Reserva de Armas, SPJMD — Estado-Maior é a /overview
-- reformulada, sem tabela própria): fato_secao (eixo temporal TIPADO —
-- ano/mes/cia como colunas, não texto composto — com `eh_anual` explícito
-- para nunca confundir "consolidado anual" com "mês não parseável"),
-- agregado_dimensional (rankings não-temporais, generaliza o padrão de
-- p2_kpi_agregados), ingest_batches (ciclo de vida do lote de ingestão —
-- nunca apaga dado bom em falha parcial) e arquivos_fonte (proveniência,
-- generaliza p2_arquivos_fonte). RLS on sem policy em todas — só
-- service-role lê/escreve, mesmo padrão já usado em toda a base.
--
-- Aplicada diretamente no projeto lypxujjyllmibxqvdogr em 19/07/2026 via MCP
-- Supabase (nome remoto: secoes_framework); este arquivo espelha o SQL
-- aplicado para o repositório voltar a ser fonte de verdade.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — codificar o drift das p2_* (schema real, extraído do banco)
-- ----------------------------------------------------------------------------

create table if not exists public.p2_kpi_agregados (
  id bigint generated always as identity primary key,
  fonte text not null,
  dimensao text not null,
  chave text,
  valor integer not null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.p2_arquivos_fonte (
  id bigint generated always as identity primary key,
  nome_arquivo text not null,
  caminho_unc text not null,
  tipo text not null,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now()
);

create table if not exists public.p2_pancadoes (
  id bigint generated always as identity primary key,
  grande_comando text,
  regiao text,
  opm text,
  cia text,
  endereco text,
  bairro text,
  comunidade text,
  municipio text,
  dias_semana text,
  horario text,
  qtd_frequentadores text
);

-- PII (nome, cpf, rg, nome_mae): dado já existente, ingerido antes desta
-- migration — decisão de manutenção sem criptografia por coluna já tomada
-- (ver memória project_p2_16bpmm); RLS on sem policy já restringe a leitura
-- à service_role, único consumidor (lib/db.ts).
create table if not exists public.p2_capturas_operacao_impacto (
  id bigint generated always as identity primary key,
  fonte text not null,
  nome_capturado text,
  cpf text,
  rg_orgao text,
  nome_mae text,
  data_nascimento date,
  faccionado text,
  bopm text,
  bopc text,
  data_captura date,
  hora_captura text,
  grande_comando text,
  comando_regiao text,
  unidade_recaptura text,
  programa_policiamento text,
  consta_lista text,
  artigo text,
  classificacao_mandado text,
  endereco_abordagem text,
  bairro text,
  municipio text
);

create table if not exists public.p2_ocorrencias_narrativas (
  id bigint generated always as identity primary key,
  seq integer,
  mes_aba text,
  titulo text,
  data_ocorrencia text,
  hora text,
  endereco text,
  opm text,
  dp text,
  providencias text,
  apreensao text,
  historico text,
  indiciados text,
  vitimas text,
  viatura text,
  flagrante boolean default false,
  captura_procurado boolean default false,
  confronto boolean default false,
  n_indiciados integer default 0,
  n_vitimas integer default 0,
  fonte_arquivo text
);

create table if not exists public.p2_dds_repassadas_catalogo (
  id bigint generated always as identity primary key,
  arquivo text not null,
  categoria text not null,
  protocolo text
);

-- PII (cpf, nome, nome da mãe/pai, endereço, geolocalização): dado estadual
-- já existente — ver nota de p2_capturas_operacao_impacto acima.
create table if not exists public.p2_procurados_min_trabalho (
  id bigint generated always as identity primary key,
  cpf text,
  nome text,
  nascimento date,
  idade integer,
  mae text,
  pai text,
  funcao text,
  cnpj_cno text,
  empresa text,
  matriz_filial text,
  cidade text,
  estado text,
  endereco text,
  lat double precision,
  lng double precision,
  classificacao text,
  inicio date,
  remuneracao date,
  mp text,
  processo text,
  vara text,
  tribunal text,
  regime text,
  tipo_prisao text,
  tipo text,
  crime text,
  pena text,
  opm text,
  btl text,
  cmdo text,
  gdo_cmdo text
);

create table if not exists public.p2_procurados_real_parque (
  id bigint generated always as identity primary key,
  nome text,
  rg text,
  nascimento text,
  pai text,
  mae text,
  artigo text,
  mandado text,
  endereco text
);

create table if not exists public.p2_produtividade_criminal (
  id bigint generated always as identity primary key,
  nome text,
  rg text,
  artigo text,
  envio text,
  data_registro date,
  agente text,
  resultado text,
  ano_aba text
);

create table if not exists public.p2_relatorios_qualitativos (
  id bigint generated always as identity primary key,
  titulo text not null,
  data_referencia text,
  texto text not null,
  fonte_arquivo text
);

-- 0 linhas nas duas, redundantes com os agregados já em p2_kpi_agregados
-- (fonte='captura_ssp' e fonte='produtividade_criminal') — reduz superfície
-- de schema/LGPD sem perder dado real.
drop table if exists public.p2_capturas_ssp;
drop table if exists public.p2_produtividade_criminal;

-- ----------------------------------------------------------------------------
-- PARTE 2 — núcleo do framework de seções
-- ----------------------------------------------------------------------------

create table if not exists public.ingest_batches (
  id uuid primary key default gen_random_uuid(),
  secao text not null,
  fonte text not null,
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  status text not null default 'executando'
    check (status in ('executando', 'ok', 'parcial', 'falha', 'fonte_indisponivel')),
  linhas_lidas integer,
  linhas_validas integer,
  linhas_descartadas integer,
  descartes jsonb,
  erro text
);
create index if not exists ingest_batches_secao_idx on public.ingest_batches(secao, iniciado_em desc);

create table if not exists public.arquivos_fonte (
  id bigint generated always as identity primary key,
  batch_id uuid references public.ingest_batches(id) on delete set null,
  secao text not null,
  caminho_unc text not null,
  sha256 text,
  mtime timestamptz,
  linhas_reais integer,
  observacao text,
  ingerido_em timestamptz not null default now(),
  unique (secao, caminho_unc, sha256)
);

create table if not exists public.fato_secao (
  id bigint generated always as identity primary key,
  secao text not null
    check (secao in ('p1', 'p2', 'p3', 'p4', 'p5', 'ft', 'motomec', 'res_armas', 'spjmd')),
  indicador text not null,
  ano integer not null check (ano between 2010 and 2100),
  -- NULL = mês não parseável na fonte (dado sujo — nunca somir a linha
  -- silenciosamente); eh_anual=true = consolidado anual DECLARADO. As duas
  -- coisas são distintas por desenho — sobrecarregar NULL para significar
  -- "anual" foi um erro identificado nas propostas de arquitetura descartadas.
  mes integer check (mes between 1 and 12),
  eh_anual boolean not null default false,
  cia integer check (cia between 0 and 7), -- 0 = nível batalhão; NULL = sem quebra por cia
  valor numeric not null,
  batch_id uuid not null references public.ingest_batches(id),
  criado_em timestamptz not null default now(),
  -- "unique nulls not distinct" (PG15+) em vez de um índice de expressão
  -- com coalesce(): trata múltiplos NULLs em mes/cia como iguais (mesma
  -- deduplicação que coalesce(-1) daria) SEM usar expressões — necessário
  -- porque o upsert via PostgREST (on_conflict=) só mira colunas literais,
  -- nunca expressões.
  constraint fato_secao_uk unique nulls not distinct (secao, indicador, ano, mes, eh_anual, cia)
);
create index if not exists fato_secao_secao_idx on public.fato_secao(secao);

create table if not exists public.agregado_dimensional (
  id bigint generated always as identity primary key,
  secao text not null,
  fonte text not null,
  dimensao text not null,
  chave text not null,
  valor numeric not null,
  batch_id uuid references public.ingest_batches(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (secao, fonte, dimensao, chave)
);
create index if not exists agregado_dimensional_secao_idx on public.agregado_dimensional(secao);

-- RLS on sem policy: só service-role lê/escreve (padrão já usado em toda a
-- base — nenhuma tabela nova aqui muda esse contrato).
alter table public.ingest_batches enable row level security;
alter table public.arquivos_fonte enable row level security;
alter table public.fato_secao enable row level security;
alter table public.agregado_dimensional enable row level security;
