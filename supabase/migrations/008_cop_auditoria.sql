-- ============================================================================
-- CCO-16 — Migration 008: Auditoria de COP (câmera operacional portátil).
--
-- cop_auditoria_respostas espelha 1:1 as colunas do Google Form/Sheet recém
-- publicado (0 respostas até 22/07/2026) — não é dado agregado, é a resposta
-- crua por policial/data, então NÃO usa o framework fato_secao/
-- agregado_dimensional da migration 007 (aquele modela indicador já somado
-- por ano/mês/cia; aqui cada linha é um evento de auditoria individual com
-- campos próprios como RE, justificativa, nº da parte).
--
-- cop_auditoria_efetivo é a base de cálculo da meta (efetivo por subunidade,
-- extraído de Y:\EFETIVO\03JUL Efetivo atualizado.xls em 22/07/2026) — tabela
-- pequena, atualizada manualmente quando o efetivo mudar. Confirmado no
-- próprio roteiro de seções do efetivo real: o 16º BPM/M NÃO tem 5ª Cia
-- (EM, 1ª–4ª Cia e Força Tática apenas).
--
-- RLS on sem policy nas duas — só service-role lê/escreve, mesmo padrão de
-- toda a base (ver migration 007).
-- ============================================================================

create table if not exists public.cop_auditoria_respostas (
  id bigint generated always as identity primary key,
  carimbo timestamptz,
  data_auditoria date not null,
  re text,
  nome_guerra text,
  posto_graduacao text,
  funcao text,
  subunidade text not null,
  auditou_video boolean not null default false,
  quantidade_videos smallint not null default 0 check (quantidade_videos >= 0),
  numero_parte text,
  justificativa text,
  criado_em timestamptz not null default now()
);
create index if not exists cop_auditoria_respostas_subunidade_idx
  on public.cop_auditoria_respostas(subunidade);
create index if not exists cop_auditoria_respostas_data_idx
  on public.cop_auditoria_respostas(data_auditoria);

create table if not exists public.cop_auditoria_efetivo (
  subunidade text primary key,
  efetivo integer not null check (efetivo >= 0),
  atualizado_em timestamptz not null default now()
);

insert into public.cop_auditoria_efetivo (subunidade, efetivo) values
  ('16º BPM/M / EM', 74),
  ('16º BPM/M / 1ª Cia', 94),
  ('16º BPM/M / 2ª Cia', 92),
  ('16º BPM/M / 3ª Cia', 117),
  ('16º BPM/M / 4ª Cia', 85),
  ('16º BPM/M / Força Tática', 58)
on conflict (subunidade) do update set efetivo = excluded.efetivo, atualizado_em = now();

alter table public.cop_auditoria_respostas enable row level security;
alter table public.cop_auditoria_efetivo enable row level security;
