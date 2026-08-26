-- ============================================================================
-- CCO-16 — Migration 004: Efetivo (Mapa Força), KPIs históricos e
-- Comunicação/Reconhecimento como dado real (não mais hardcoded no código).
-- Idempotente. Segue o padrão das migrations anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Efetivo diário por setor/Cia (Mapa Força — P1)
-- ----------------------------------------------------------------------------
create table if not exists public.efetivo_diario (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.cpp_setores(id) on delete cascade,
  data_referencia date not null,
  previsto integer not null check (previsto >= 0),
  presente integer not null check (presente >= 0),
  qse integer not null default 0 check (qse >= 0),
  ferias integer not null default 0 check (ferias >= 0),
  lts integer not null default 0 check (lts >= 0),
  restricoes integer not null default 0 check (restricoes >= 0),
  claro_pct numeric(5,2) generated always as (
    case when previsto > 0 then round((presente::numeric / previsto) * 100, 2) else 0 end
  ) stored,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (setor_id, data_referencia)
);

drop trigger if exists efetivo_diario_updated_at on public.efetivo_diario;
create trigger efetivo_diario_updated_at before update on public.efetivo_diario
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. KPIs mensais (histórico real — sem número fictício; populado à medida
--    que a operação gera dado)
-- ----------------------------------------------------------------------------
create table if not exists public.kpi_mensal (
  id uuid primary key default gen_random_uuid(),
  mes_referencia date not null, -- primeiro dia do mês
  tempo_medio_deteccao_despacho_seg integer check (tempo_medio_deteccao_despacho_seg is null or tempo_medio_deteccao_despacho_seg >= 0),
  tempo_medio_despacho_chegada_seg integer check (tempo_medio_despacho_chegada_seg is null or tempo_medio_despacho_chegada_seg >= 0),
  veiculos_recuperados integer check (veiculos_recuperados is null or veiculos_recuperados >= 0),
  flagrantes integer check (flagrantes is null or flagrantes >= 0),
  fonte text,
  homologado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mes_referencia)
);

drop trigger if exists kpi_mensal_updated_at on public.kpi_mensal;
create trigger kpi_mensal_updated_at before update on public.kpi_mensal
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Comunicação / Reconhecimento — métricas do @16bpmm_oficial como dado
--    real (movido de lib/comunicacao.ts hardcoded para o banco).
-- ----------------------------------------------------------------------------
create table if not exists public.comunicacao_snapshot (
  id uuid primary key default gen_random_uuid(),
  periodo text not null,
  conta text not null default '@16bpmm_oficial',
  seguidores integer not null check (seguidores >= 0),
  visualizacoes_90d text not null,
  contas_alcancadas text not null,
  interacoes text not null,
  visitas_perfil text not null,
  alcance_fora_base_pct integer not null check (alcance_fora_base_pct between 0 and 100),
  reels_pct_views numeric(5,2),
  reels_pct_inter numeric(5,2),
  stories_pct_views numeric(5,2),
  stories_pct_inter numeric(5,2),
  posts_pct_views numeric(5,2),
  posts_pct_inter numeric(5,2),
  top_reel_views text,
  top_reel_inter text,
  top_reel_data text,
  top_reel_tema text,
  capturado_em date not null,
  fonte text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comunicacao_imprensa (
  id uuid primary key default gen_random_uuid(),
  veiculo text not null,
  snapshot_id uuid references public.comunicacao_snapshot(id) on delete cascade
);

create table if not exists public.comunicacao_parcerias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  snapshot_id uuid references public.comunicacao_snapshot(id) on delete cascade
);

create table if not exists public.comunicacao_atencao (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  snapshot_id uuid references public.comunicacao_snapshot(id) on delete cascade
);

-- ----------------------------------------------------------------------------
-- RLS — leitura operacional; escrita restrita ao administrador de dados
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['efetivo_diario','kpi_mensal','comunicacao_snapshot','comunicacao_imprensa','comunicacao_parcerias','comunicacao_atencao'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists op_read_%s on public.%I', t, t);
    execute format('create policy op_read_%s on public.%I for select to authenticated using (public.is_operational_member())', t, t);
    execute format('drop policy if exists admin_write_%s on public.%I', t, t);
    execute format('create policy admin_write_%s on public.%I for all to authenticated using (public.is_data_admin()) with check (public.is_data_admin())', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Auditoria em despachos criados via ação real (server action de despacho)
-- (trigger genérico já existe — só garante que despachos tem auditoria)
-- ----------------------------------------------------------------------------
drop trigger if exists despachos_audit on public.despachos;
create trigger despachos_audit after insert or update on public.despachos
  for each row execute procedure public.audit_generic_change();

-- ----------------------------------------------------------------------------
-- Seed: Comunicação — os números REAIS do relatório de 17/07/2026
-- (mesmo conteúdo que estava hardcoded em lib/comunicacao.ts, agora no banco)
-- ----------------------------------------------------------------------------
insert into public.comunicacao_snapshot (
  periodo, seguidores, visualizacoes_90d, contas_alcancadas, interacoes, visitas_perfil,
  alcance_fora_base_pct, reels_pct_views, reels_pct_inter, stories_pct_views, stories_pct_inter,
  posts_pct_views, posts_pct_inter, top_reel_views, top_reel_inter, top_reel_data, top_reel_tema,
  capturado_em, fonte
) values (
  'Últimos 90 dias (~18/04 a 17/07/2026)', 30353, '3,04 mi', '796 mil', '184 mil', '35 mil',
  70, 75.0, 91.1, 20.4, 6.2, 4.6, 2.7, '419 mil', '36,6 mil', '10/jun', 'Operação em Paraisópolis',
  '2026-07-17', 'Instagram Insights (leitura de tela) + varredura de imprensa aberta'
)
on conflict do nothing;

insert into public.comunicacao_imprensa (veiculo, snapshot_id)
select v, s.id from public.comunicacao_snapshot s,
  unnest(array['CNN Brasil','Agência Brasil','Band','Rádio Itatiaia','Diário do Grande ABC','Jornal de Brasília','Guarulhos em Destaque','Opina News']) as v
where s.capturado_em = '2026-07-17'
on conflict do nothing;

insert into public.comunicacao_parcerias (titulo, descricao, snapshot_id)
select p.titulo, p.descricao, s.id from public.comunicacao_snapshot s,
  (values
    ('Comunicação Social PMESP', '9+ matérias sobre o 16º no Portal de Notícias da PMESP no período.'),
    ('SSP-SP · Polícia Civil · Interpol', 'Amplificação do cartaz de procurado — recompensa R$ 50 mil e lista vermelha da Interpol.'),
    ('Prefeitura de São Paulo', 'Apoio com máquinas e equipes na remoção de lombadas irregulares em Paraisópolis.')
  ) as p(titulo, descricao)
where s.capturado_em = '2026-07-17'
on conflict do nothing;

insert into public.comunicacao_atencao (texto, snapshot_id)
select a.texto, s.id from public.comunicacao_snapshot s,
  (values
    ('Episódio de 10/jul (confronto com morte e protestos) teve ampla cobertura de imprensa, mas SEM postagem correspondente no perfil oficial — gap entre o que a imprensa noticiou e o que a página divulgou.'),
    ('Reels concentram 75% das visualizações e 91% das interações — a estratégia de vídeo é o motor do alcance; posts estáticos rendem pouco.')
  ) as a(texto)
where s.capturado_em = '2026-07-17'
on conflict do nothing;

-- Seed: efetivo_diario de hoje, TODOS ZERADOS DE PROPÓSITO — não fabricar
-- número de efetivo real sem homologação do P1. Fica "0 presente" até o P1
-- alimentar de verdade (via tela ou import).
insert into public.efetivo_diario (setor_id, data_referencia, previsto, presente)
select id, current_date, 0, 0 from public.cpp_setores
on conflict (setor_id, data_referencia) do nothing;
