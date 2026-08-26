-- ============================================================================
-- CCO-16 — Migration 002: expansão operacional da Sala de Comando (Porta 2)
-- Idempotente. Segue o padrão do schema.sql do SOIC: enums, constraints, RLS
-- por papel (is_operational_member / is_data_admin), triggers de auditoria e
-- funções SECURITY DEFINER. Rodar DEPOIS do schema.sql base.
-- Nenhum dado pessoal bruto é armazenado; placas e imagens seguem política de
-- retenção e trilha de auditoria (LGPD · Decreto Est. 58.052/2012).
-- ============================================================================

-- Auditoria genérica reutilizável (espelha audit_logistics_change do base).
create or replace function public.audit_generic_change()
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

-- Enums operacionais
do $$ begin
  create type public.ocorrencia_origem as enum ('muralha_ocr', 'reconhecimento_facial', 'copom', 'denuncia', 'cipm', 'camera_privada', 'guarnicao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.despacho_status as enum ('sugerido', 'validado', 'em_deslocamento', 'no_local', 'encerrado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.viatura_situacao as enum ('disponivel', 'empenhada', 'indisponivel', 'baixada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feed_status as enum ('online', 'atrasado', 'offline');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 1. Setores territoriais (CPP) — divisão das 4 Cias em setores
-- ----------------------------------------------------------------------------
create table if not exists public.cpp_setores (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null check (char_length(trim(codigo)) between 1 and 40),
  nome text not null,
  cia_id integer not null check (cia_id between 1 and 4),
  descricao text,
  geojson jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Viaturas (cadastro) + posição ao vivo (AVL)
-- ----------------------------------------------------------------------------
create table if not exists public.viaturas (
  id uuid primary key default gen_random_uuid(),
  prefixo text unique not null check (char_length(trim(prefixo)) between 2 and 40),
  tipo text not null check (tipo in ('radiopatrulha', 'forca_tatica', 'motocicleta', 'apoio', 'outros')),
  cia_id integer check (cia_id between 1 and 4),
  setor_id uuid references public.cpp_setores(id) on delete set null,
  situacao public.viatura_situacao not null default 'indisponivel',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viatura_posicoes (
  id uuid primary key default gen_random_uuid(),
  viatura_id uuid not null references public.viaturas(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  velocidade numeric(6,2) check (velocidade is null or velocidade >= 0),
  registrado_em timestamptz not null default now()
);
create index if not exists viatura_posicoes_viatura_idx on public.viatura_posicoes(viatura_id, registrado_em desc);

-- ----------------------------------------------------------------------------
-- 3. Reserva de armas (situação agregada — Relatório COP)
-- ----------------------------------------------------------------------------
create table if not exists public.reserva_armas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (char_length(trim(categoria)) between 2 and 120),
  total integer not null check (total >= 0),
  disponiveis integer not null check (disponiveis >= 0),
  retidas integer not null default 0 check (retidas >= 0),
  data_referencia date not null check (extract(year from data_referencia) = 2026),
  prazo_reiteracao date,
  source_document text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (disponiveis + retidas <= total),
  unique (categoria, data_referencia)
);

-- ----------------------------------------------------------------------------
-- 4. Câmeras (onboarding público/privado — modelo DF 360)
-- ----------------------------------------------------------------------------
create table if not exists public.cameras (
  id uuid primary key default gen_random_uuid(),
  identificacao text not null check (char_length(trim(identificacao)) between 2 and 120),
  origem text not null check (origem in ('muralha', 'smart_sampa', 'comercio', 'condominio', 'conseg', 'vizinhanca_solidaria', 'outros')),
  natureza text not null default 'privada' check (natureza in ('publica', 'privada')),
  endereco text not null,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  tem_ocr boolean not null default false,
  tem_facial boolean not null default false,
  cia_id integer check (cia_id between 1 and 4),
  contato_responsavel text,
  status text not null default 'proposta' check (status in ('proposta', 'em_analise', 'homologada', 'recusada', 'inativa')),
  base_legal text,
  aprovado_por uuid references auth.users(id),
  aprovado_em timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cameras_status_idx on public.cameras(status, cia_id);

-- ----------------------------------------------------------------------------
-- 5. Ocorrências (evento operacional que entra na fusão)
-- ----------------------------------------------------------------------------
create table if not exists public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 3 and 200),
  origem public.ocorrencia_origem not null,
  natureza text not null,
  endereco text not null,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  cia_id integer check (cia_id between 1 and 4),
  setor_id uuid references public.cpp_setores(id) on delete set null,
  placa text check (placa is null or char_length(placa) between 5 and 8),
  status text not null default 'aberta' check (status in ('aberta', 'em_despacho', 'em_atendimento', 'encerrada', 'descartada')),
  classification public.classification_level not null default 'restricted',
  detectado_em timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ocorrencias_status_idx on public.ocorrencias(status, detectado_em desc);

-- ----------------------------------------------------------------------------
-- 6. Despachos (ocorrência → viatura, cadeia CFP→CGP, tempos)
-- ----------------------------------------------------------------------------
create table if not exists public.despachos (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  viatura_id uuid references public.viaturas(id) on delete set null,
  status public.despacho_status not null default 'sugerido',
  tempo_deslocamento_seg integer check (tempo_deslocamento_seg is null or tempo_deslocamento_seg >= 0),
  distancia_m integer check (distancia_m is null or distancia_m >= 0),
  validado_por uuid references auth.users(id),
  cadeia_cfp text,
  cadeia_cgp text,
  sugerido_em timestamptz not null default now(),
  validado_em timestamptz,
  chegada_em timestamptz,
  encerrado_em timestamptz,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists despachos_ocorrencia_idx on public.despachos(ocorrencia_id);

-- ----------------------------------------------------------------------------
-- 7. Alertas de placa (OCR) com confirmação humana obrigatória
-- ----------------------------------------------------------------------------
create table if not exists public.alertas_placa (
  id uuid primary key default gen_random_uuid(),
  placa text not null check (char_length(placa) between 5 and 8),
  camera_id uuid references public.cameras(id) on delete set null,
  ocorrencia_id uuid references public.ocorrencias(id) on delete set null,
  motivo text not null check (motivo in ('roubo_furto', 'mandado', 'suspeita', 'outros')),
  confianca_ocr integer check (confianca_ocr is null or confianca_ocr between 0 and 100),
  confirmacao_humana boolean not null default false,
  confirmado_por uuid references auth.users(id),
  confirmado_em timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'falso_positivo', 'expirado')),
  detectado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists alertas_placa_status_idx on public.alertas_placa(status, detectado_em desc);

-- ----------------------------------------------------------------------------
-- 8. Operações especiais (grandes eventos)
-- ----------------------------------------------------------------------------
create table if not exists public.operacoes_especiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 3 and 160),
  tipo text not null check (tipo in ('evento_esportivo', 'manifestacao', 'evento_institucional', 'operacao_planejada', 'outros')),
  local text not null,
  cia_id integer check (cia_id between 1 and 4),
  efetivo_reforco integer not null default 0 check (efetivo_reforco >= 0),
  inicio timestamptz not null,
  fim timestamptz,
  status text not null default 'planejada' check (status in ('planejada', 'ativa', 'encerrada', 'cancelada')),
  observacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim is null or fim > inicio)
);

-- ----------------------------------------------------------------------------
-- 9. Frescor/qualidade de dados (status de cada fonte)
-- ----------------------------------------------------------------------------
create table if not exists public.source_freshness (
  codigo text primary key,
  nome text not null,
  categoria text not null,
  last_update_at timestamptz,
  status public.feed_status not null default 'offline',
  latencia_max_min integer not null default 60 check (latencia_max_min > 0),
  responsavel text,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. Regras do motor de alertas (anti-fadiga: métrica de falso-positivo)
-- ----------------------------------------------------------------------------
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  descricao text not null,
  nivel public.alert_level not null,
  ativo boolean not null default true,
  limiar_confianca integer check (limiar_confianca is null or limiar_confianca between 0 and 100),
  disparos integer not null default 0 check (disparos >= 0),
  falsos_positivos integer not null default 0 check (falsos_positivos >= 0),
  teto_falso_positivo_pct integer not null default 30 check (teto_falso_positivo_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (falsos_positivos <= disparos)
);

-- ----------------------------------------------------------------------------
-- Triggers de updated_at e auditoria
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cpp_setores','viaturas','reserva_armas','cameras','ocorrencias','despachos','operacoes_especiais','alert_rules'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['ocorrencias','despachos','cameras','operacoes_especiais'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update on public.%I for each row execute procedure public.audit_generic_change()', t, t);
  end loop;
end $$;

-- Confirmação humana de alerta de placa (registra quem confirmou — anti falso positivo)
create or replace function public.confirmar_alerta_placa(alerta_id uuid, resultado text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_operational_member() then raise exception 'not authorized'; end if;
  if resultado not in ('confirmado', 'falso_positivo') then raise exception 'resultado inválido'; end if;
  update public.alertas_placa
    set status = resultado,
        confirmacao_humana = (resultado = 'confirmado'),
        confirmado_por = auth.uid(),
        confirmado_em = now()
    where id = alerta_id and status = 'pendente';
  if not found then raise exception 'alerta não encontrado ou já tratado'; end if;
  insert into public.audit_events(user_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'confirmar', 'alerta_placa', alerta_id, jsonb_build_object('resultado', resultado));
end; $$;

revoke all on function public.confirmar_alerta_placa(uuid, text) from public, anon;
grant execute on function public.confirmar_alerta_placa(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- RLS: leitura para membros operacionais; escrita conforme papel
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cpp_setores','viaturas','viatura_posicoes','reserva_armas','cameras','ocorrencias','despachos','alertas_placa','operacoes_especiais','source_freshness','alert_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists op_read_%s on public.%I', t, t);
    execute format('create policy op_read_%s on public.%I for select to authenticated using (public.is_operational_member())', t, t);
  end loop;

  -- Escrita operacional (operador e acima): fluxo em tempo real
  foreach t in array array['viatura_posicoes','ocorrencias','despachos','alertas_placa'] loop
    execute format('drop policy if exists op_write_%s on public.%I', t, t);
    execute format('create policy op_write_%s on public.%I for all to authenticated using (public.is_operational_member()) with check (public.is_operational_member())', t, t);
  end loop;

  -- Escrita restrita ao administrador de dados: configuração e cadastros
  foreach t in array array['cpp_setores','viaturas','reserva_armas','cameras','operacoes_especiais','source_freshness','alert_rules'] loop
    execute format('drop policy if exists admin_write_%s on public.%I', t, t);
    execute format('create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Seeds: 4 Cias/setores base, catálogo de fontes e regras de alerta
-- ----------------------------------------------------------------------------
insert into public.cpp_setores (codigo, nome, cia_id, descricao) values
  ('1CIA', '1ª Cia', 1, 'Setor territorial da 1ª Companhia'),
  ('2CIA', '2ª Cia', 2, 'Setor territorial da 2ª Companhia'),
  ('3CIA', '3ª Cia', 3, 'Setor territorial da 3ª Companhia'),
  ('4CIA', '4ª Cia', 4, 'Setor territorial da 4ª Companhia')
on conflict (codigo) do nothing;

insert into public.source_freshness (codigo, nome, categoria, latencia_max_min, responsavel) values
  ('MURALHA', 'Muralha Paulista (OCR/facial)', 'Câmeras estaduais', 5, 'SSP-SP'),
  ('SMART_SAMPA', 'Smart Sampa', 'Câmeras municipais', 10, 'Prefeitura SP'),
  ('COPOM', 'COPOM / 190', 'Despacho estadual', 5, 'PMESP'),
  ('CIPM', 'CIPM / RAC', 'Inteligência', 60, 'CIPM'),
  ('MAPA_FORCA', 'Mapa Força (efetivo do dia)', 'Interno · P1', 720, 'P1 · 16º BPM/M'),
  ('CPP', 'CPP (setor das viaturas)', 'Interno · P3', 720, 'P3 · 16º BPM/M'),
  ('MOTOMEC', 'MOTOMEC (frota)', 'Interno · P4', 360, 'P4 · 16º BPM/M'),
  ('DENUNCIA', 'Disque-Denúncia', 'Denúncias', 120, 'Coordop')
on conflict (codigo) do nothing;

insert into public.alert_rules (codigo, descricao, nivel, limiar_confianca, teto_falso_positivo_pct) values
  ('PLACA_ROUBO', 'Placa de veículo com registro de roubo/furto lida por OCR', 'critical', 85, 20),
  ('MANDADO_FACIAL', 'Reconhecimento facial contra base de mandados', 'critical', 90, 15),
  ('OCORRENCIA_VIDA', 'Ocorrência envolvendo risco à vida de policial', 'critical', null, 30),
  ('REPERCUSSAO_MIDIA', 'Ocorrência de repercussão midiática (OS CIPM-002/100/25)', 'urgent', null, 30),
  ('DENUNCIA_HOTSPOT', 'Denúncia recorrente em ponto quente', 'attention', null, 40)
on conflict (codigo) do nothing;
