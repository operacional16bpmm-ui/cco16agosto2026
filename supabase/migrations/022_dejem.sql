-- ----------------------------------------------------------------------------
-- 022_dejem.sql
-- DEJEM (Detached Escala Jornada Extra Metropolitana) — 16º BPM/M, 1º sem/2026.
-- Base do estudo analítico publicado na rota /dejem.
--
-- Por que tabelas dedicadas e não fato_secao (migration 007): o CHECK de
-- fato_secao.secao é fechado em 9 seções e o grão de lá é (indicador, ano,
-- mês, cia) — série agregada. O DEJEM tem QUATRO grãos irreconciliáveis com
-- aquele:
--   1) jornada individual confirmada (PM × data × hora × modalidade);
--   2) bloco de escala do relatório gerencial (AISP × data × período), com
--      contadores de oferta/inscrição/escalação/presença;
--   3) evento de alteração de presença (trilha de auditoria, nominal);
--   4) contagem de escalados por OPM/mês (todas as modalidades).
-- Mesma decisão das migrations 008/009/012 (p4_*, motomec_*, spjmd_*).
--
-- Proveniência: NÃO criamos dejem_arquivos_fonte. A tabela genérica
-- public.arquivos_fonte (migration 007) já tem unique (secao, caminho_unc,
-- sha256) e o helper ingest/common/carga.py:registrar_arquivo(). Usamos
-- secao='dejem'. Uma tabela a menos para manter.
--
-- Fontes: extração local a partir dos PDFs do SIRH > Escala (SIRH v.28/07/2026),
-- feita em 30JUL2026. Janela de escala e de confirmação: 01/01/2026 a
-- 30/06/2026. Mapa arquivo→tabela em ingest/secoes/dejem.py.
--   dejem_analitico_jan-jun_2026.csv         → dejem_jornadas        (2.598)
--   dejem_gerencial_jan-jun_2026.csv         → dejem_escalas         (4.712)
--   dejem_log_presenca_jan-jun_2026.csv      → dejem_log_presenca    (1.550)
--   dejem_faltas_nominais_16bpmm.csv         → NÃO carregado: é subconjunto do
--                                              log (zerou_presenca = true)
--   dejem_qtde_pm_escalados_jan-jun_2026.csv → dejem_escalados_opm  (27.924)
--   dejem_gerencial_mai_2026_ESTADUAL.csv    → dejem_benchmark_gc (agregado ~43)
--
-- LGPD: dejem_jornadas e dejem_log_presenca guardam RE + nome de policial.
-- A exposição nominal na rota /dejem é restrita, NA CAMADA DE APLICAÇÃO, aos
-- perfis 'comando' e 'estado_maior' (lib/autorizacao.ts:podeVerNominal), e o
-- mesmo corte vale na exportação CSV (app/api/dejem/export). A RLS abaixo é a
-- mesma das demais tabelas de domínio, porque o portal lê via service role.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 1. dejem_jornadas — grão: uma jornada confirmada por policial
-- ============================================================================
-- Data e hora ficam em colunas SEPARADAS de propósito: coluna gerada exige
-- função IMMUTABLE, e extract() sobre timestamptz é apenas STABLE (depende do
-- TimeZone da sessão). Com data_jornada::date o generated funciona e o mês
-- nunca escorrega para o dia anterior numa jornada que começa 18:15 BRT.
create table if not exists public.dejem_jornadas (
  id             bigint generated always as identity primary key,
  re             text not null,
  nome           text not null,
  posto          text,                      -- grafia crua: "1. TEN PM", "SD PM"
  posto_norm     text,                      -- CAP|1TEN|2TEN|1SGT|2SGT|3SGT|CB|SD
  opm_bruto      text not null,             -- "16.BPM/M 4.CIA PM" (auditoria)
  -- '1'..'4' Companhias, 'ft' Força Tática, 'em' Estado-Maior.
  -- null = 44 registros que vêm com OPM "16.BPM/M" puro, sem Companhia.
  cia            text check (cia is null or cia in ('1','2','3','4','ft','em')),
  data_jornada   date not null,
  hora_inicio    time not null,             -- 14:05 => turno das 14:00
  horas          numeric(4,2) not null,     -- "08:00" => 8.00
  tipo_cod       smallint not null,         -- 1,3,5,9,13,14,15
  tipo_rotulo    text not null,             -- "1 - DEJEM", "15 - DEJEM METRÔ"
  ano            smallint generated always as (extract(year   from data_jornada)::smallint) stored,
  mes            smallint generated always as (extract(month  from data_jornada)::smallint) stored,
  dow            smallint generated always as (extract(isodow from data_jornada)::smallint) stored, -- 1=seg .. 7=dom
  origem_arquivo text not null,
  linha_num      integer not null,
  ingerido_em    timestamptz not null default now(),
  -- Chave de negócio conferida nas 2.598 linhas: zero duplicatas. Protege
  -- contra reextração que devolva o arquivo em ordem diferente.
  unique (re, data_jornada, hora_inicio, tipo_cod)
);
create index if not exists idx_dejem_jornadas_mes on public.dejem_jornadas (ano, mes);
create index if not exists idx_dejem_jornadas_cia on public.dejem_jornadas (cia);
create index if not exists idx_dejem_jornadas_re  on public.dejem_jornadas (re);
create index if not exists idx_dejem_jornadas_dow on public.dejem_jornadas (dow, hora_inicio);

-- ============================================================================
-- 2. dejem_escalas — grão: um bloco de escala do relatório gerencial
-- ============================================================================
create table if not exists public.dejem_escalas (
  id             bigint generated always as identity primary key,
  cpa            text not null,             -- "CPA/M-5"
  conv           smallint,                  -- convênio (66)
  aisp           text not null,             -- grafia crua da origem
  -- O 16º MUDA DE NOME NA ORIGEM no meio do semestre: "16° BPM/M BATALHÃO"
  -- (jan a abr) vira "16º BPM/M - Estado Maior" (mai e jun). É a mesma
  -- unidade. aisp_norm unifica em '16bpmm'; aisp preserva a evidência.
  aisp_norm      text not null,
  dia_semana     text,
  data           date not null,
  periodo        text not null,             -- "04:45às12:45" (cru)
  hora_inicio    time,
  hora_fim       time,
  escalas_of     integer not null default 0,
  escalas_pc     integer not null default 0,
  inscritos_of   integer not null default 0,
  inscritos_pc   integer not null default 0,
  escalados_of   integer not null default 0,
  escalados_pc   integer not null default 0,
  outro_local_of integer not null default 0,
  outro_local_pc integer not null default 0,
  presentes_of   integer not null default 0,
  presentes_pc   integer not null default 0,
  vagas          integer generated always as (escalas_of   + escalas_pc)   stored,
  inscritos      integer generated always as (inscritos_of + inscritos_pc) stored,
  escalados      integer generated always as (escalados_of + escalados_pc) stored,
  presentes      integer generated always as (presentes_of + presentes_pc) stored,
  ano            smallint generated always as (extract(year   from data)::smallint) stored,
  mes            smallint generated always as (extract(month  from data)::smallint) stored,
  dow            smallint generated always as (extract(isodow from data)::smallint) stored,
  origem_arquivo text not null,
  -- Ordinal da linha no CSV. É a ÚNICA chave idempotente possível aqui: o
  -- relatório repete LEGITIMAMENTE (arquivo, cpa, conv, aisp, data, periodo)
  -- em blocos distintos — 136 ocorrências no jan-jun. Upsert por chave de
  -- negócio APAGARIA esses blocos e subestimaria a oferta.
  linha_num      integer not null,
  ingerido_em    timestamptz not null default now(),
  unique (origem_arquivo, linha_num)
);
create index if not exists idx_dejem_escalas_aisp on public.dejem_escalas (aisp_norm, ano, mes);
create index if not exists idx_dejem_escalas_dow  on public.dejem_escalas (dow, periodo);
create index if not exists idx_dejem_escalas_data on public.dejem_escalas (data);

-- ============================================================================
-- 3. dejem_log_presenca — grão: um evento de alteração de presença
-- ============================================================================
-- Este relatório só registra ALTERAÇÃO de presença já lançada. Falta em que
-- ninguém mexeu no lançamento não gera evento — por isso o log nomeia 58 das
-- 92 faltas do gerencial. A variação mensal da cobertura mede PRÁTICA DE
-- LANÇAMENTO, não realidade das faltas. A página é obrigada a dizer isso.
create table if not exists public.dejem_log_presenca (
  id                 bigint generated always as identity primary key,
  escala             text not null,          -- nº da escala no SIRH
  aisp               text not null,
  aisp_norm          text not null,
  data_inicio        date not null,
  data_termino_bruto text,                   -- campo sujo na origem, preservado
  convenio           text,                   -- "ATIVIDADE DEJEM - CAPITAL"
  posto              text,
  re                 text not null,
  nome               text not null,
  atualizado_em      timestamptz not null,
  horas_de           numeric(4,2),           -- "" => null
  horas_para         numeric(4,2),
  -- Falta = presença zerada. As 58 do 16º são exatamente horas_para = 0.
  zerou_presenca     boolean generated always as (horas_para = 0) stored,
  alterado_por       text not null,          -- grafia crua completa
  alterado_por_re    text,                   -- eixo da trilha de auditoria
  alterado_por_nome  text,
  ano                smallint generated always as (extract(year  from data_inicio)::smallint) stored,
  mes                smallint generated always as (extract(month from data_inicio)::smallint) stored,
  origem_arquivo     text not null,
  linha_num          integer not null,
  ingerido_em        timestamptz not null default now(),
  unique (origem_arquivo, linha_num)
);
create index if not exists idx_dejem_log_re    on public.dejem_log_presenca (re);
create index if not exists idx_dejem_log_falta on public.dejem_log_presenca (aisp_norm, zerou_presenca);
create index if not exists idx_dejem_log_autor on public.dejem_log_presenca (alterado_por_re);

-- ============================================================================
-- 4. dejem_escalados_opm — grão: (ano, mês, OPM)
-- ============================================================================
create table if not exists public.dejem_escalados_opm (
  id             bigint generated always as identity primary key,
  ano            smallint not null,
  mes            smallint not null check (mes between 1 and 12),
  opm_cod        text not null,
  opm_nome       text not null,
  qtde           integer not null check (qtde >= 0),
  -- ARMADILHA: 6051xxxxx é o 16.BPM/I (Interior), unidade DIFERENTE, com 5ª
  -- Cia e dezenas de GP/PM. Filtrar por nome ("%16%") contamina o dado.
  -- O 16º BPM/M (CPA/M-5) é 5051xxxxx. Nunca filtre por opm_nome.
  eh_16bpmm      boolean generated always as (left(opm_cod, 4) = '5051') stored,
  -- Companhia derivada do código: 505161*=1ª, 62*=2ª, 63*=3ª, 64*=4ª,
  -- 67*=Força Tática, 68*=Estado-Maior.
  cia            text,
  origem_arquivo text not null,
  ingerido_em    timestamptz not null default now(),
  unique (ano, mes, opm_cod)
);
create index if not exists idx_dejem_escalados_16 on public.dejem_escalados_opm (eh_16bpmm, ano, mes);

-- ============================================================================
-- 5. dejem_benchmark_gc — grão: (Grande Comando, ano, mês), já agregado
-- ============================================================================
-- O CSV estadual de maio tem 40.463 linhas e CONTÉM as linhas do CPA/M-5
-- (mesmo PDF de origem, gerencial_2026_05.pdf do arquivo jan-jun). Carregá-lo
-- cru em dejem_escalas duplicaria maio do 16º. Ele serve a UM quadro — a
-- posição do CPA/M-5 entre os Grandes Comandos — então entra já agregado:
-- ~43 linhas em vez de 40 mil.
create table if not exists public.dejem_benchmark_gc (
  id             bigint generated always as identity primary key,
  ano            smallint not null,
  mes            smallint not null check (mes between 1 and 12),
  grande_comando text not null,
  vagas          integer not null,
  inscritos      integer not null,
  escalados      integer not null,
  presentes      integer not null,
  preenchimento  numeric(5,2) generated always as (
                   case when vagas > 0
                        then round(escalados::numeric * 100 / vagas, 2) end
                 ) stored,
  origem_arquivo text not null,
  ingerido_em    timestamptz not null default now(),
  unique (ano, mes, grande_comando)
);

-- ============================================================================
-- 6. RLS — mesmo par das migrations 008 a 014
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'dejem_jornadas', 'dejem_escalas', 'dejem_log_presenca',
    'dejem_escalados_opm', 'dejem_benchmark_gc'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists op_read_%s on public.%I', t, t);
    execute format(
      'create policy op_read_%s on public.%I for select to authenticated using (public.is_operational_member())',
      t, t);
    execute format('drop policy if exists admin_write_%s on public.%I', t, t);
    execute format(
      'create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())',
      t, t);
  end loop;
end $$;

-- ============================================================================
-- 7. Frescor da fonte
-- ============================================================================
-- 43200 min = 30 dias: a extração do DEJEM é mensal (fecha o mês anterior),
-- não diária como as fontes de tempo real.
insert into public.source_freshness (codigo, nome, categoria, latencia_max_min, responsavel)
values ('DEJEM', 'DEJEM — escala, presença e jornadas', 'Interno · SIRH', 43200, 'P/3 · 16º BPM/M')
on conflict (codigo) do nothing;
