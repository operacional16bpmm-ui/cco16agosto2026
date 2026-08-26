-- SOIC 16º BPM/M + Sala de Operações
-- Execute this migration in the Supabase SQL Editor using the institutional project.
-- Bootstrap: after creating Pires' Supabase user, set profiles.role = 'data_admin'.
-- No credential, raw Fotocrim/Inteligência Web content, or source document content is stored here.

create extension if not exists pgcrypto;

do $$ begin
  create type public.system_role as enum ('viewer', 'operator', 'command', 'intelligence', 'data_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.classification_level as enum ('internal', 'restricted', 'confidential');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum ('discovered', 'pending_approval', 'approved', 'rejected', 'quarantined', 'missing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_level as enum ('critical', 'urgent', 'attention', 'informative');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.system_role not null default 'viewer',
  unit_code text not null default '16BPMM',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

create or replace function public.current_system_role()
returns public.system_role
language sql stable security definer set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid() and active), 'viewer'::public.system_role) $$;

create or replace function public.is_data_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_system_role() = 'data_admin'::public.system_role $$;

create or replace function public.is_operational_member()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_system_role() in ('operator'::public.system_role, 'command'::public.system_role, 'intelligence'::public.system_role, 'data_admin'::public.system_role) $$;

create table if not exists public.source_roots (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  sector text not null,
  network_path text not null,
  classification public.classification_level not null default 'internal',
  enabled boolean not null default true,
  collection_interval_hours integer not null default 6 check (collection_interval_hours between 1 and 24),
  last_scan_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_rules (
  id uuid primary key default gen_random_uuid(),
  source_root_id uuid not null unique references public.source_roots(id) on delete cascade,
  suggested_scope text not null,
  exclusions text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'adjusted')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_root_id uuid not null references public.source_roots(id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  discovered_count integer not null default 0,
  quarantined_count integer not null default 0,
  missing_count integer not null default 0,
  error_summary text,
  collector_host text,
  created_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_root_id uuid not null references public.source_roots(id) on delete cascade,
  relative_path text not null,
  file_name text not null,
  extension text,
  file_size bigint,
  modified_at timestamptz,
  sha256 text,
  classification public.classification_level not null default 'internal',
  suggested_category text,
  status public.document_status not null default 'pending_approval',
  allowed_for_metrics boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_root_id, relative_path)
);

create table if not exists public.operational_alert_policies (
  level public.alert_level primary key,
  acknowledgement_minutes integer not null check (acknowledgement_minutes > 0),
  treatment_guidance text not null,
  messaging_enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level public.alert_level not null,
  sector text not null,
  source_reference text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_objects (
  id uuid primary key default gen_random_uuid(),
  theme text not null,
  risk text not null,
  area text not null,
  period_start date,
  period_end date,
  indicators text not null,
  sources text not null,
  responsible text not null,
  recommendation text not null,
  status text not null default 'under_review' check (status in ('under_review', 'active', 'monitoring', 'closed')),
  review_at date not null,
  classification public.classification_level not null default 'restricted',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aggregated_metrics (
  id uuid primary key default gen_random_uuid(),
  integration_code text not null,
  unit_code text not null default '16BPMM',
  metric_code text not null,
  metric_label text not null,
  metric_value numeric not null,
  ranking integer,
  period_start date not null,
  period_end date not null,
  source_document text not null,
  classification public.classification_level not null default 'internal',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (integration_code, unit_code, metric_code, period_start, period_end)
);

create table if not exists public.normative_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null,
  published_at date,
  source_url text,
  impact_summary text,
  status text not null default 'to_review' check (status in ('to_review', 'applicable', 'archived')),
  classification public.classification_level not null default 'internal',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_catalog (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  purpose text not null,
  source_url text,
  classification public.classification_level not null default 'internal',
  ingest_mode text not null check (ingest_mode in ('manual_approved', 'metadata_only', 'aggregated_only')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_collection_runs (
  id uuid primary key default gen_random_uuid(),
  integration_code text not null references public.integration_catalog(code) on update cascade on delete restrict,
  status text not null check (status in ('success', 'failed')),
  collected_at timestamptz not null,
  requested_url text not null,
  final_url text,
  response_status integer check (response_status is null or response_status between 100 and 599),
  content_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  tls_verified boolean not null default true,
  discovered_count integer not null default 0 check (discovered_count >= 0),
  error_summary text,
  collector_host text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists portal_collection_runs_source_time_unique
  on public.portal_collection_runs(integration_code, collected_at);

create table if not exists public.portal_documents (
  id uuid primary key default gen_random_uuid(),
  integration_code text not null references public.integration_catalog(code) on update cascade on delete restrict,
  title text not null,
  source_url text not null,
  document_kind text not null default 'link' check (document_kind in ('link', 'pdf', 'report', 'norm', 'oai')),
  classification public.classification_level not null default 'internal',
  status text not null default 'discovered' check (status in ('discovered', 'pending_approval', 'approved', 'rejected', 'unavailable')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_code, source_url)
);

create table if not exists public.source_evidence (
  id uuid primary key default gen_random_uuid(),
  integration_code text not null references public.integration_catalog(code) on update cascade on delete restrict,
  evidence_kind text not null check (evidence_kind in ('screenshot', 'pasted_text', 'portal_response', 'document')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint not null check (byte_size >= 0),
  source_reference text not null,
  captured_at timestamptz,
  classification public.classification_level not null default 'internal',
  contains_personal_data boolean not null default false,
  extraction_status text not null default 'pending_review' check (extraction_status in ('pending_review', 'reviewed', 'cataloged', 'rejected')),
  extracted_summary text not null,
  raw_content_stored boolean not null default false check (raw_content_stored = false),
  created_at timestamptz not null default now(),
  unique (integration_code, sha256)
);

create or replace function public.preserve_portal_document_first_seen()
returns trigger language plpgsql as $$
begin
  new.first_seen_at = old.first_seen_at;
  return new;
end; $$;

create table if not exists public.restricted_source_authorizations (
  id uuid primary key default gen_random_uuid(),
  source_name text not null check (source_name in ('Fotocrim', 'Inteligencia Web')),
  responsible_name text not null,
  purpose text not null,
  classification public.classification_level not null default 'restricted',
  authorized_at timestamptz not null default now(),
  valid_until timestamptz not null,
  authorized_by text not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until > authorized_at)
);

create table if not exists public.restricted_access_log (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid references public.restricted_source_authorizations(id),
  user_id uuid references auth.users(id),
  source_name text not null,
  action text not null check (action in ('consult', 'copy_request', 'export_request', 'authorization_review')),
  purpose text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists source_roots_updated_at on public.source_roots;
create trigger source_roots_updated_at before update on public.source_roots for each row execute procedure public.set_updated_at();
drop trigger if exists source_rules_updated_at on public.source_rules;
create trigger source_rules_updated_at before update on public.source_rules for each row execute procedure public.set_updated_at();
drop trigger if exists source_documents_updated_at on public.source_documents;
create trigger source_documents_updated_at before update on public.source_documents for each row execute procedure public.set_updated_at();
drop trigger if exists operational_alerts_updated_at on public.operational_alerts;
create trigger operational_alerts_updated_at before update on public.operational_alerts for each row execute procedure public.set_updated_at();
drop trigger if exists analysis_objects_updated_at on public.analysis_objects;
create trigger analysis_objects_updated_at before update on public.analysis_objects for each row execute procedure public.set_updated_at();
drop trigger if exists normative_items_updated_at on public.normative_items;
create trigger normative_items_updated_at before update on public.normative_items for each row execute procedure public.set_updated_at();
drop trigger if exists integration_catalog_updated_at on public.integration_catalog;
create trigger integration_catalog_updated_at before update on public.integration_catalog for each row execute procedure public.set_updated_at();
drop trigger if exists portal_documents_updated_at on public.portal_documents;
create trigger portal_documents_updated_at before update on public.portal_documents for each row execute procedure public.set_updated_at();
drop trigger if exists portal_documents_preserve_first_seen on public.portal_documents;
create trigger portal_documents_preserve_first_seen before update on public.portal_documents for each row execute procedure public.preserve_portal_document_first_seen();

-- Acknowledgement is restricted to its intended columns and is audit-friendly.
create or replace function public.acknowledge_operational_alert(alert_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_operational_member() then
    raise exception 'not authorized';
  end if;
  update public.operational_alerts
    set status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = now()
    where id = alert_id and status = 'open';
  if not found then raise exception 'alert not found or unavailable'; end if;
  insert into public.audit_events(user_id, action, entity_type, entity_id)
    values (auth.uid(), 'acknowledge', 'operational_alert', alert_id);
end; $$;

-- Hardening of legacy tables, while remaining safe on a clean Supabase project.
do $$
declare legacy_table text;
begin
  foreach legacy_table in array array['occurrences', 'merit_processes'] loop
    if to_regclass(format('public.%s', legacy_table)) is not null then
      execute format('alter table public.%I enable row level security', legacy_table);
      execute format('drop policy if exists %I on public.%I', 'Enable read access for all users', legacy_table);
      execute format('drop policy if exists %I on public.%I', 'Enable insert access for all users', legacy_table);
    end if;
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.source_roots enable row level security;
alter table public.source_rules enable row level security;
alter table public.collection_runs enable row level security;
alter table public.source_documents enable row level security;
alter table public.operational_alert_policies enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.analysis_objects enable row level security;
alter table public.aggregated_metrics enable row level security;
alter table public.normative_items enable row level security;
alter table public.integration_catalog enable row level security;
alter table public.portal_collection_runs enable row level security;
alter table public.portal_documents enable row level security;
alter table public.source_evidence enable row level security;
alter table public.restricted_source_authorizations enable row level security;
alter table public.restricted_access_log enable row level security;
alter table public.audit_events enable row level security;

-- Re-running this migration remains safe.
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_data_admin());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin());

do $$
declare table_name text;
begin
  foreach table_name in array array['source_roots','source_rules','collection_runs','source_documents','operational_alert_policies','operational_alerts','analysis_objects','aggregated_metrics','normative_items','integration_catalog','portal_collection_runs','portal_documents','source_evidence'] loop
    execute format('drop policy if exists internal_read_%s on public.%I', table_name, table_name);
    execute format('create policy internal_read_%s on public.%I for select to authenticated using (true)', table_name, table_name);
    execute format('drop policy if exists admin_write_%s on public.%I', table_name, table_name);
    execute format('create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())', table_name, table_name);
  end loop;
end $$;

drop policy if exists restricted_authorization_admin_only on public.restricted_source_authorizations;
create policy restricted_authorization_admin_only on public.restricted_source_authorizations for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin());
drop policy if exists restricted_log_intelligence_or_admin on public.restricted_access_log;
create policy restricted_log_intelligence_or_admin on public.restricted_access_log for select to authenticated using (public.current_system_role() in ('intelligence'::public.system_role, 'data_admin'::public.system_role));
drop policy if exists restricted_log_insert_own on public.restricted_access_log;
create policy restricted_log_insert_own on public.restricted_access_log for insert to authenticated with check (user_id = auth.uid() and public.is_operational_member());
drop policy if exists audit_read_admin on public.audit_events;
create policy audit_read_admin on public.audit_events for select to authenticated using (public.is_data_admin());
drop policy if exists audit_insert_own on public.audit_events;
create policy audit_insert_own on public.audit_events for insert to authenticated with check (user_id = auth.uid());

insert into public.source_roots (code, name, sector, network_path, classification, enabled) values
  ('P1', 'P1', 'P1', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\P1', 'restricted', true),
  ('P2', 'P2', 'P2', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\P2', 'restricted', true),
  ('P3', 'P3', 'P3', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\P3', 'restricted', true),
  ('P4', 'P4', 'P4', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\P4', 'internal', true),
  ('P5', 'P5', 'P5', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\P5', 'internal', true),
  ('CMT', 'Comando', 'CMT', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\CMT', 'restricted', false),
  ('SUBCMT', 'Subcomando', 'SUBCMT', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\SUBCMT', 'restricted', false),
  ('COORDOP', 'Coordenação Operacional', 'COORDOP', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\COORDOP', 'restricted', false),
  ('CFP', 'CFP', 'CFP', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\CFP', 'internal', false),
  ('MOTOMEC', 'Motomec', 'MOTOMEC', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\MOTOMEC', 'internal', true),
  ('RES_ARMAS', 'Reserva de Armas', 'RES_ARMAS', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\RES_ARMAS', 'restricted', true),
  ('SERVICO_DIA', 'Serviço de Dia', 'SERVIÇO DE DIA', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\SERVICO_DE_DIA', 'restricted', true),
  ('SPJMD', 'SPJMD', 'SPJMD', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\SPJMD', 'restricted', false),
  ('TELEMATICA', 'Telemática', 'TELEMÁTICA', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\TELEMATICA', 'internal', true),
  ('FORCA_TATICA', 'Força Tática', 'FORÇA TÁTICA', E'\\\\cmdo\\pmesp\\16BPMM\\16BPMM_FT', 'restricted', true)
on conflict (code) do update set name = excluded.name, sector = excluded.sector, network_path = excluded.network_path, classification = excluded.classification;

insert into public.source_rules (source_root_id, suggested_scope, exclusions)
select id,
  'Somente arquivos com última modificação em 2026. ' || case code
    when 'P1' then 'Matrizes e planilhas atuais de efetivo, afastamento, disponibilidade e capacitação.'
    when 'P2' then 'Produtividade, mapeamento, ocorrências agregadas, procurados e relatórios homologados.'
    when 'P3' then 'Ordens, planos, escalas operacionais e execução de operações vigentes.'
    when 'P4' then 'Somente acervo de 2026: logística, pedidos, romaneio, formulários e controles aprovados.'
    when 'P5' then 'Demandas e resultados de comunicação de 2026, sem mídia bruta não homologada.'
    when 'MOTOMEC' then 'Matriz de viaturas, manutenção, indisponibilidade e prazo de reparo.'
    when 'RES_ARMAS' then 'Relatório COP e disponibilidade agregada.'
    when 'SERVICO_DIA' then 'Escalas, postos, responsáveis e situação de cobertura.'
    when 'TELEMATICA' then 'Rádio de viaturas, aparelhos, manutenção e disponibilidade de comunicação.'
    when 'FORCA_TATICA' then 'Matriz FT, disponibilidade, emprego, demandas e resultados agregados.'
    else 'Configurar após homologação dos primeiros documentos e planilhas.' end,
  case code
    when 'P1' then 'Documentos pessoais e dados individualizados.'
    when 'P2' then 'Pastas pessoais de agentes até classificação formal.'
    when 'P5' then 'Mídia bruta sem homologação.'
    when 'RES_ARMAS' then 'Detalhamento sensível de armamento.'
    else 'Arquivos sem aprovação, dados pessoais e material classificado sem autorização.' end
from public.source_roots
on conflict (source_root_id) do nothing;

insert into public.operational_alert_policies (level, acknowledgement_minutes, treatment_guidance, messaging_enabled) values
  ('critical', 15, 'Notificação imediata no painel e mensageria; confirmar ciência.', true),
  ('urgent', 60, 'Alerta destacado; ciência em até uma hora.', true),
  ('attention', 720, 'Fila priorizada; tratar no próximo ciclo operacional.', false),
  ('informative', 1440, 'Registrar no painel e no relatório diário.', false)
on conflict (level) do nothing;

insert into public.integration_catalog (code, name, purpose, source_url, classification, ingest_mode, active) values
  ('DISQUE_DENUNCIA', 'Disque-Denúncia', 'Rankings e séries agregadas de 2025–2026; sem denúncias individuais.', 'https://www9.intranet.policiamilitar.sp.gov.br/unidades/coordop/site/disque-denuncia', 'internal', 'aggregated_only', true),
  ('CIPM', 'Centro de Inteligência da PM', 'RAC, Resolução SSP 160, OAI, metadados da Sala de Situação e radar normativo.', 'https://cipm.intranet.policiamilitar.sp.gov.br/', 'restricted', 'manual_approved', true),
  ('CIPM_NORMAS', 'CIPM — Normas e Legislações', 'Catálogo de normas, legislação e política de inteligência; publicação somente após revisão de vigência e aplicabilidade.', 'https://cipm.intranet.policiamilitar.sp.gov.br/normas_legislacoes.html', 'internal', 'manual_approved', true),
  ('CIPM_OAI', 'CIPM — Objetos de Análise', 'Catálogo de OAI e relatórios temáticos; conteúdo analítico depende de homologação humana.', 'https://cipm.intranet.policiamilitar.sp.gov.br/objetos_de_analise.html', 'restricted', 'manual_approved', true),
  ('CIPM_ESTRUTURA', 'Mapa da estrutura da PMESP', 'Referência de hierarquia, unidades e roteamento institucional; registrar vigência do ato normativo.', 'https://cipm.intranet.policiamilitar.sp.gov.br/Setor_Estatistica/Mapa/Mapa%20da%20estrutura%20da%20PM.pdf', 'internal', 'metadata_only', true),
  ('COORDOP', 'Coordenação Operacional', 'Ordens de operações, notas de serviço, planejamento, normas e estatísticas homologadas.', 'https://www9.intranet.policiamilitar.sp.gov.br/unidades/coordop/site/', 'restricted', 'manual_approved', true),
  ('COPOM', 'COPOM', 'Indicadores públicos agregados: atendimentos, 190, DEJEM, escalas e séries históricas.', 'http://www.copom.intranet.policiamilitar.sp.gov.br/', 'internal', 'aggregated_only', true),
  ('CCOMSOC', 'CComSoc', 'SISCOM PM, fluxo de comunicação institucional, modelos e indicadores públicos agregados.', 'https://ccomsoc.intranet.policiamilitar.sp.gov.br/', 'internal', 'manual_approved', true),
  ('INTRANET_PMESP', 'Portal da Intranet PMESP', 'Diretório de sistemas e serviços institucionais; somente catálogo de links, sem replicar conteúdo autenticado.', 'http://www.intranet.policiamilitar.sp.gov.br/', 'internal', 'metadata_only', true),
  ('CORRECIONAL', 'Sistema Correcional', 'Metadados e indicadores agregados de Registro de Fato, Investigação Preliminar, IPM, tramitações e prazos; sem autos ou dados pessoais brutos.', 'https://correcional.policiamilitar.sp.gov.br/login', 'restricted', 'metadata_only', false),
  ('SEI', 'Sistema Eletrônico de Informações', 'Metadados homologados de acompanhamentos, grupos, datas, prazos e situação; sem documentos ou observações pessoais brutas.', 'https://sei.sp.gov.br/sei/controlador.php?acao=base_conhecimento_pesquisar', 'restricted', 'metadata_only', false),
  ('FOTOCRIM', 'Fotocrim', 'Fonte informativa controlada por autorização interna; não replica conteúdo bruto.', null, 'restricted', 'metadata_only', false),
  ('INTEL_WEB', 'Inteligência Web', 'Fonte informativa controlada por autorização interna; não replica conteúdo bruto.', null, 'restricted', 'metadata_only', false)
on conflict (code) do update set name = excluded.name, purpose = excluded.purpose, source_url = excluded.source_url, classification = excluded.classification, ingest_mode = excluded.ingest_mode;

insert into public.source_evidence (integration_code, evidence_kind, sha256, byte_size, source_reference, captured_at, classification, contains_personal_data, extraction_status, extracted_summary) values
  ('CORRECIONAL', 'screenshot', '3a66c0d13cf1d0fbf7ce7b09e721413cde5c92fafadfbc97e7e6b0e5e75f0e07', 244893, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-06', null, 'restricted', true, 'reviewed', 'Tela de tramitações enviadas; campos úteis: origem, destino, natureza, data, prioridade e status.'),
  ('CORRECIONAL', 'screenshot', '3cae3ceddd37317de3ac293fb843cfc891c60507b0d5b9150fd9fda56bd55891', 143535, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-06', null, 'restricted', true, 'reviewed', 'Tela de registros aguardando andamento; preservar somente contagem, natureza, prazo e status agregados.'),
  ('CORRECIONAL', 'screenshot', 'c0d390c71e78de85bf9b5eb9d54bc0d7b0cc48d4084e6d7d09a7cb7cfa776b81', 244309, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-06', null, 'restricted', true, 'reviewed', 'Tela de tramitações recebidas e prazos; identificadores pessoais não devem ser replicados.'),
  ('CORRECIONAL', 'screenshot', 'd329c3d8796a8281f5395ce745b7dbc12c06eddb4245e725dd175397b9d39444', 220068, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-06', null, 'restricted', true, 'reviewed', 'Painel agregado de Investigação Preliminar e Registro de Fato; contagens da captura não representam estado atual.'),
  ('SEI', 'screenshot', 'ff78e6ecfb2e76ba4e01a4007ae2602ed69d2a9d7a761a86c38cb48702d2ca48', 233630, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-06', null, 'restricted', true, 'reviewed', 'Acompanhamento Especial do SEI; campos permitidos dependem de homologação e minimização.'),
  ('INTRANET_PMESP', 'screenshot', '2b1510eef0f103001e836d8543d3162ab95bbe8c8bb4fec0eaf52dd4cda7ef85', 181017, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#messages-12-14', null, 'internal', false, 'reviewed', 'Diretório institucional de aplicações e serviços operacionais.'),
  ('INTRANET_PMESP', 'screenshot', '207d4d59259c568c2541cdd5721f017a474c156e21cb86172eada52bbb87fbdc', 202548, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-13', null, 'internal', false, 'reviewed', 'Diretório institucional de procedimentos, clipping e sistemas de informação.'),
  ('CIPM_ESTRUTURA', 'screenshot', '347ec23ac864432a9b41268a9d7ea16230c53d8b2b45216dbd97d3aabf9077c4', 169730, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-13', null, 'internal', false, 'reviewed', 'Organograma PMESP com referência ao Decreto nº 65.096/2020; vigência requer revisão normativa.'),
  ('COPOM', 'screenshot', '314617baef2800c795db20b1d5bc79fdb197b4d7038783cb80d0924255572f66', 1917755, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-17', null, 'internal', true, 'reviewed', 'Página inicial do COPOM; usar menus e séries agregadas, não imagens ou nomes individuais.'),
  ('CIPM_NORMAS', 'screenshot', 'a4ade7e5b48b848864e637f996b155a029b5903e6be0305de01a4f3ed08d6bc9', 251464, 'archived_session:019f6239-794d-7161-b2cc-881f38b58eef#message-17', null, 'internal', false, 'reviewed', 'Página de Normas e Legislações do CIPM.'),
  ('SEI', 'pasted_text', 'd91453bcb69feb3f5b5233088daa8fc2299cd3a18033687aa595d8d2639baab8', 7987, 'codex_attachment:8f45a571-5eb2-43ae-848d-fabfe4b77293', null, 'restricted', true, 'reviewed', 'Extrato textual do SEI; conteúdo bruto não é armazenado pelo SOIC.'),
  ('CORRECIONAL', 'pasted_text', 'd790a38c41e3881e8af546641993b559e321b197d8c6654bd80d5a64a9404e02', 8541, 'codex_attachment:08b6fe33-5697-476f-8ba6-b962bdda2d9d', null, 'restricted', true, 'reviewed', 'Extrato textual do Sistema Correcional; conteúdo bruto não é armazenado pelo SOIC.')
on conflict (integration_code, sha256) do update set extracted_summary = excluded.extracted_summary, extraction_status = excluded.extraction_status;

insert into public.aggregated_metrics (integration_code, unit_code, metric_code, metric_label, metric_value, ranking, period_start, period_end, source_document, classification) values
  ('DISQUE_DENUNCIA', '16BPMM', 'solutions', 'Soluções registradas', 12, 13, '2026-06-01', '2026-06-30', 'https://www9.intranet.policiamilitar.sp.gov.br/unidades/coordop/site/assets/document/disque-denuncia/06%20-%20Ranking%20Mensal%20Jun26.pdf#sha256=5e0412579f6a77a9c55f71f175f634f02820ef1dd7c62b1bb52fc9ca373f2f92', 'internal'),
  ('DISQUE_DENUNCIA', '16BPMM', 'forwarded', 'Denúncias encaminhadas', 107, null, '2026-06-01', '2026-06-30', 'https://www9.intranet.policiamilitar.sp.gov.br/unidades/coordop/site/assets/document/disque-denuncia/06%20-%20Ranking%20Mensal%20Jun26.pdf#sha256=5e0412579f6a77a9c55f71f175f634f02820ef1dd7c62b1bb52fc9ca373f2f92', 'internal'),
  ('DISQUE_DENUNCIA', '16BPMM', 'resolution_rate', 'Resolutividade (%)', 11, 44, '2026-06-01', '2026-06-30', 'https://www9.intranet.policiamilitar.sp.gov.br/unidades/coordop/site/assets/document/disque-denuncia/06%20-%20Ranking%20Mensal%20Jun26.pdf#sha256=5e0412579f6a77a9c55f71f175f634f02820ef1dd7c62b1bb52fc9ca373f2f92', 'internal')
on conflict (integration_code, unit_code, metric_code, period_start, period_end) do update
set metric_label = excluded.metric_label, metric_value = excluded.metric_value, ranking = excluded.ranking, source_document = excluded.source_document;

create unique index if not exists normative_items_source_url_unique on public.normative_items(source_url) where source_url is not null;

insert into public.normative_items (title, issuer, source_url, impact_summary, status, classification) values
  ('Decreto Federal 4.872/03', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Dec%20Fed%204872-03.pdf', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Decreto Federal 4.376/02', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Dec%20Fed.%20n%C2%BA%204376-02.pdf', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Decreto Federal 6.540/08', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Decreto%20n%C2%BA%206540.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Decreto Estadual 58.052/12', 'Governo do Estado de São Paulo', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Decreto58.052.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Lei Federal 8.159/91', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Lei%20Fed.%20n%C2%BA%208.159-91%20.pdf', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Lei Federal 9.883/99', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Lei%20Fed.%20n%C2%BA%209883-99.pdf', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Lei Federal 12.527/11', 'Governo Federal', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/L12527.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Lei Estadual 9.155/95', 'Governo do Estado de São Paulo', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/lei9155.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Resolução SSP 160', 'Secretaria da Segurança Pública', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/res_ssp_160.htm', 'Referência para estatística oficial; aplicabilidade ao SOIC aguarda revisão.', 'to_review', 'internal'),
  ('Resolução SSP 516', 'Secretaria da Segurança Pública', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/res_ssp_516.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'internal'),
  ('Política de Inteligência da Polícia Militar do Estado de São Paulo', 'PMESP', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/Pol%C3%ADtica%20de%20Intelig%C3%AAncia%20da%20Pol%C3%ADcia%20Militar%20do%20Estado%20de%20S%C3%A3o%20Paulo.pdf', 'Classificação, acesso e tratamento devem ser validados antes da aplicação.', 'to_review', 'restricted'),
  ('I-8-PM', 'PMESP', 'https://cipm.intranet.policiamilitar.sp.gov.br/Legislacao_normas/I-8-PM.htm', 'Item descoberto no catálogo CIPM; vigência e impacto aguardam revisão.', 'to_review', 'restricted')
on conflict do nothing;

-- Logistics / P4: LSM, controlled material discharge and annual inventory.
-- The operational scope is intentionally restricted to the 2026 exercise.
create table if not exists public.logistics_lsm_entries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null check (char_length(trim(reference_code)) between 2 and 80),
  competency date not null check (extract(year from competency) = 2026),
  requesting_sector text not null check (char_length(trim(requesting_sector)) between 2 and 120),
  material_code text check (material_code is null or char_length(trim(material_code)) between 1 and 80),
  material_description text not null check (char_length(trim(material_description)) between 3 and 240),
  unit_of_measure text not null check (char_length(trim(unit_of_measure)) between 1 and 40),
  requested_quantity numeric(14,3) not null check (requested_quantity > 0),
  approved_quantity numeric(14,3) check (approved_quantity is null or approved_quantity between 0 and requested_quantity),
  delivered_quantity numeric(14,3) not null default 0 check (delivered_quantity >= 0),
  priority text not null default 'routine' check (priority in ('routine', 'priority', 'urgent')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'partially_fulfilled', 'fulfilled', 'cancelled')),
  source_reference text check (source_reference is null or char_length(source_reference) <= 300),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (approved_quantity is null or delivered_quantity <= approved_quantity)
);

create index if not exists logistics_lsm_reference_idx on public.logistics_lsm_entries(reference_code);
create index if not exists logistics_lsm_status_idx on public.logistics_lsm_entries(status, competency);

create table if not exists public.logistics_discharge_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique check (char_length(trim(case_number)) between 3 and 80),
  reference_year smallint not null default 2026 check (reference_year = 2026),
  material_class text not null check (material_class in ('permanent', 'consumable')),
  asset_description text not null check (char_length(trim(asset_description)) between 3 and 240),
  patrimonial_identifier text check (patrimonial_identifier is null or char_length(trim(patrimonial_identifier)) between 1 and 100),
  reason text not null check (reason in ('unserviceable', 'obsolete', 'uneconomical', 'damaged', 'loss_theft', 'inventory_missing', 'other')),
  conservation_state text not null check (conservation_state in ('good', 'regular', 'poor', 'unserviceable', 'not_located')),
  physical_location text not null check (char_length(trim(physical_location)) between 2 and 180),
  responsible_sector text not null check (char_length(trim(responsible_sector)) between 2 and 120),
  estimated_value numeric(16,2) not null default 0 check (estimated_value >= 0),
  net_book_value numeric(16,2) not null default 0 check (net_book_value >= 0),
  process_reference text not null check (char_length(trim(process_reference)) between 3 and 180),
  evidence_sha256 text check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'technical_assessment' check (status in ('technical_assessment', 'commission_review', 'expense_authorizer_review', 'authorized', 'destination_pending', 'accounting_writeoff', 'completed', 'rejected')),
  technical_assessment_reference text,
  commission_report_reference text,
  authorization_reference text,
  destination_reference text,
  destination_execution_reference text,
  accounting_reference text,
  rejection_reason text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (material_class <> 'permanent' or patrimonial_identifier is not null),
  check (rejection_reason is null or char_length(trim(rejection_reason)) between 10 and 1000)
);

create index if not exists logistics_discharge_status_idx on public.logistics_discharge_cases(status, updated_at desc);
create index if not exists logistics_discharge_patrimony_idx on public.logistics_discharge_cases(patrimonial_identifier) where patrimonial_identifier is not null;

create table if not exists public.logistics_inventory_campaigns (
  id uuid primary key default gen_random_uuid(),
  fiscal_year smallint not null default 2026 check (fiscal_year = 2026),
  scope text not null check (char_length(trim(scope)) between 3 and 180),
  commission_act_reference text not null check (char_length(trim(commission_act_reference)) between 3 and 180),
  commission_member_count smallint not null check (commission_member_count between 3 and 30),
  due_at date not null check (extract(year from due_at) = 2026),
  status text not null default 'in_progress' check (status in ('in_progress', 'reconciliation', 'concluded')),
  reconciliation_reference text,
  final_report_reference text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  concluded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fiscal_year, scope)
);

create table if not exists public.logistics_inventory_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.logistics_inventory_campaigns(id) on delete restrict,
  asset_identifier text not null check (char_length(trim(asset_identifier)) between 2 and 100),
  has_patrimonial_tag boolean not null default true,
  asset_description text not null check (char_length(trim(asset_description)) between 3 and 240),
  expected_location text not null check (char_length(trim(expected_location)) between 2 and 180),
  observed_location text not null check (char_length(trim(observed_location)) between 2 and 180),
  custodian text not null check (char_length(trim(custodian)) between 2 and 180),
  conservation_state text not null check (conservation_state in ('good', 'regular', 'poor', 'unserviceable', 'not_located')),
  tag_status text not null check (tag_status in ('present', 'damaged', 'missing', 'not_applicable')),
  functioning_status text not null check (functioning_status in ('operational', 'partially_operational', 'inoperative', 'not_tested')),
  accounting_document_reference text,
  book_value numeric(16,2) not null default 0 check (book_value >= 0),
  divergence_type text not null default 'none' check (divergence_type in ('none', 'location', 'custodian', 'tag', 'not_registered', 'not_located', 'value', 'condition')),
  required_action text check (required_action is null or char_length(required_action) <= 1000),
  status text not null default 'verified' check (status in ('verified', 'divergence', 'resolved')),
  resolution_reference text,
  recorded_by uuid not null references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  observed_at timestamptz not null default now(),
  unique (campaign_id, asset_identifier),
  check (divergence_type = 'none' or required_action is not null),
  check ((status = 'verified' and divergence_type = 'none') or status in ('divergence', 'resolved'))
);

create index if not exists logistics_inventory_items_status_idx on public.logistics_inventory_items(campaign_id, status);

drop trigger if exists logistics_lsm_updated_at on public.logistics_lsm_entries;
create trigger logistics_lsm_updated_at before update on public.logistics_lsm_entries for each row execute procedure public.set_updated_at();
drop trigger if exists logistics_discharge_updated_at on public.logistics_discharge_cases;
create trigger logistics_discharge_updated_at before update on public.logistics_discharge_cases for each row execute procedure public.set_updated_at();
drop trigger if exists logistics_inventory_campaign_updated_at on public.logistics_inventory_campaigns;
create trigger logistics_inventory_campaign_updated_at before update on public.logistics_inventory_campaigns for each row execute procedure public.set_updated_at();

create or replace function public.guard_logistics_inventory_campaign_state()
returns trigger language plpgsql security definer set search_path = public as $$
declare campaign_status text;
begin
  select status into campaign_status from public.logistics_inventory_campaigns where id = new.campaign_id;
  if campaign_status is null then raise exception 'inventory campaign not found'; end if;
  if tg_op = 'INSERT' and campaign_status <> 'in_progress' then raise exception 'inventory campaign is not open for new items'; end if;
  if tg_op = 'UPDATE' and campaign_status = 'concluded' then raise exception 'concluded inventory cannot be changed'; end if;
  return new;
end; $$;

drop trigger if exists logistics_inventory_item_campaign_guard on public.logistics_inventory_items;
create trigger logistics_inventory_item_campaign_guard before insert or update on public.logistics_inventory_items for each row execute procedure public.guard_logistics_inventory_campaign_state();

create or replace function public.audit_logistics_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare audit_details jsonb;
begin
  if tg_op = 'UPDATE' then
    audit_details := jsonb_build_object('previous_status', to_jsonb(old) ->> 'status', 'new_status', to_jsonb(new) ->> 'status');
  else
    audit_details := jsonb_build_object('new_status', to_jsonb(new) ->> 'status');
  end if;
  insert into public.audit_events(user_id, action, entity_type, entity_id, details)
    values (auth.uid(), lower(tg_op), tg_table_name, new.id, audit_details);
  return new;
end; $$;

drop trigger if exists logistics_lsm_audit on public.logistics_lsm_entries;
create trigger logistics_lsm_audit after insert or update on public.logistics_lsm_entries for each row execute procedure public.audit_logistics_change();
drop trigger if exists logistics_discharge_audit on public.logistics_discharge_cases;
create trigger logistics_discharge_audit after insert or update on public.logistics_discharge_cases for each row execute procedure public.audit_logistics_change();
drop trigger if exists logistics_inventory_campaign_audit on public.logistics_inventory_campaigns;
create trigger logistics_inventory_campaign_audit after insert or update on public.logistics_inventory_campaigns for each row execute procedure public.audit_logistics_change();
drop trigger if exists logistics_inventory_item_audit on public.logistics_inventory_items;
create trigger logistics_inventory_item_audit after insert or update on public.logistics_inventory_items for each row execute procedure public.audit_logistics_change();

create or replace function public.advance_logistics_discharge(discharge_id uuid, stage_reference text)
returns text language plpgsql security definer set search_path = public as $$
declare
  current_status text;
  next_status text;
  clean_reference text := trim(stage_reference);
begin
  if auth.uid() is null or not public.is_data_admin() then raise exception 'not authorized'; end if;
  if char_length(clean_reference) < 3 or char_length(clean_reference) > 300 then raise exception 'invalid stage reference'; end if;
  select status into current_status from public.logistics_discharge_cases where id = discharge_id for update;
  if not found then raise exception 'discharge case not found'; end if;

  case current_status
    when 'technical_assessment' then
      next_status := 'commission_review';
      update public.logistics_discharge_cases set status = next_status, technical_assessment_reference = clean_reference, updated_by = auth.uid() where id = discharge_id;
    when 'commission_review' then
      next_status := 'expense_authorizer_review';
      update public.logistics_discharge_cases set status = next_status, commission_report_reference = clean_reference, updated_by = auth.uid() where id = discharge_id;
    when 'expense_authorizer_review' then
      next_status := 'authorized';
      update public.logistics_discharge_cases set status = next_status, authorization_reference = clean_reference, updated_by = auth.uid() where id = discharge_id;
    when 'authorized' then
      next_status := 'destination_pending';
      update public.logistics_discharge_cases set status = next_status, destination_reference = clean_reference, updated_by = auth.uid() where id = discharge_id;
    when 'destination_pending' then
      next_status := 'accounting_writeoff';
      update public.logistics_discharge_cases set status = next_status, destination_execution_reference = clean_reference, updated_by = auth.uid() where id = discharge_id;
    when 'accounting_writeoff' then
      next_status := 'completed';
      update public.logistics_discharge_cases set status = next_status, accounting_reference = clean_reference, completed_at = now(), updated_by = auth.uid() where id = discharge_id;
    else raise exception 'discharge case cannot advance from current status';
  end case;
  return next_status;
end; $$;

create or replace function public.reject_logistics_discharge(discharge_id uuid, rejection_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare clean_reason text := trim(rejection_reason);
begin
  if auth.uid() is null or not public.is_data_admin() then raise exception 'not authorized'; end if;
  if char_length(clean_reason) < 10 or char_length(clean_reason) > 1000 then raise exception 'invalid rejection reason'; end if;
  update public.logistics_discharge_cases
    set status = 'rejected', rejection_reason = clean_reason, updated_by = auth.uid()
    where id = discharge_id and status not in ('completed', 'rejected');
  if not found then raise exception 'discharge case not found or unavailable'; end if;
end; $$;

create or replace function public.advance_logistics_inventory_campaign(campaign_id uuid, stage_reference text)
returns text language plpgsql security definer set search_path = public as $$
declare
  current_status text;
  next_status text;
  clean_reference text := trim(stage_reference);
  item_count integer;
  divergence_count integer;
begin
  if auth.uid() is null or not public.is_data_admin() then raise exception 'not authorized'; end if;
  if char_length(clean_reference) < 3 or char_length(clean_reference) > 300 then raise exception 'invalid stage reference'; end if;
  select status into current_status from public.logistics_inventory_campaigns where id = campaign_id for update;
  if not found then raise exception 'inventory campaign not found'; end if;
  select count(*) into item_count from public.logistics_inventory_items where logistics_inventory_items.campaign_id = $1;

  if current_status = 'in_progress' then
    if item_count = 0 then raise exception 'inventory has no verified items'; end if;
    next_status := 'reconciliation';
    update public.logistics_inventory_campaigns set status = next_status, reconciliation_reference = clean_reference, updated_by = auth.uid() where id = campaign_id;
  elsif current_status = 'reconciliation' then
    select count(*) into divergence_count from public.logistics_inventory_items where logistics_inventory_items.campaign_id = $1 and status = 'divergence';
    if divergence_count > 0 then raise exception 'inventory has unresolved divergences'; end if;
    next_status := 'concluded';
    update public.logistics_inventory_campaigns set status = next_status, final_report_reference = clean_reference, concluded_at = now(), updated_by = auth.uid() where id = campaign_id;
  else
    raise exception 'inventory campaign is already concluded';
  end if;
  return next_status;
end; $$;

create or replace function public.resolve_logistics_inventory_divergence(item_id uuid, resolution_reference text)
returns void language plpgsql security definer set search_path = public as $$
declare clean_reference text := trim(resolution_reference);
begin
  if auth.uid() is null or not public.is_data_admin() then raise exception 'not authorized'; end if;
  if char_length(clean_reference) < 5 or char_length(clean_reference) > 500 then raise exception 'invalid resolution reference'; end if;
  update public.logistics_inventory_items
    set status = 'resolved', resolution_reference = clean_reference, resolved_by = auth.uid(), resolved_at = now()
    where id = item_id and status = 'divergence';
  if not found then raise exception 'inventory divergence not found or unavailable'; end if;
end; $$;

revoke all on function public.advance_logistics_discharge(uuid, text) from public, anon;
revoke all on function public.reject_logistics_discharge(uuid, text) from public, anon;
revoke all on function public.advance_logistics_inventory_campaign(uuid, text) from public, anon;
revoke all on function public.resolve_logistics_inventory_divergence(uuid, text) from public, anon;
grant execute on function public.advance_logistics_discharge(uuid, text) to authenticated;
grant execute on function public.reject_logistics_discharge(uuid, text) to authenticated;
grant execute on function public.advance_logistics_inventory_campaign(uuid, text) to authenticated;
grant execute on function public.resolve_logistics_inventory_divergence(uuid, text) to authenticated;

alter table public.logistics_lsm_entries enable row level security;
alter table public.logistics_discharge_cases enable row level security;
alter table public.logistics_inventory_campaigns enable row level security;
alter table public.logistics_inventory_items enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['logistics_lsm_entries', 'logistics_discharge_cases', 'logistics_inventory_campaigns', 'logistics_inventory_items'] loop
    execute format('drop policy if exists operational_read_%s on public.%I', table_name, table_name);
    execute format('create policy operational_read_%s on public.%I for select to authenticated using (public.is_operational_member())', table_name, table_name);
    execute format('drop policy if exists admin_write_%s on public.%I', table_name, table_name);
    execute format('create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())', table_name, table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

insert into public.normative_items (title, issuer, published_at, source_url, impact_summary, status, classification) values
  ('Decreto Estadual nº 63.616/2018', 'Governo do Estado de São Paulo', '2018-07-31', 'https://www.al.sp.gov.br/repositorio/legislacao/decreto/2018/decreto-63616-31.07.2018.html', 'Inventário de bens móveis, localização, responsável, conservação, comissão com ao menos três servidores, relatório conclusivo e providências para bens inservíveis ou não localizados.', 'applicable', 'internal'),
  ('Política Contábil de Bens Móveis do Estado de São Paulo', 'Secretaria da Fazenda e Planejamento do Estado de São Paulo', null, 'https://portal.fazenda.sp.gov.br/servicos/normas-contabilidade/Downloads/Pol%C3%ADtica%20Bens%20M%C3%B3veis%20-%20Final.pdf', 'Referência estadual para reconhecimento, mensuração, transferência e baixa contábil de bens móveis.', 'applicable', 'internal'),
  ('Lei Federal nº 14.133/2021, art. 76', 'Presidência da República', '2021-04-01', 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm', 'Aplicável quando a destinação envolver alienação, com interesse público justificado, avaliação prévia e requisitos legais próprios.', 'applicable', 'internal')
on conflict do nothing;

-- Deployment controls: daily managed backup/PITR and weekly encrypted configuration export are operated outside this SQL migration.
