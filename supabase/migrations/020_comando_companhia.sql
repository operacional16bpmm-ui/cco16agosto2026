-- ============================================================================
-- CCO-16 — Migration 020: lançamentos e metas por unidade subordinada.
--
-- O que o comandante de Companhia precisa prestar conta não cabe nas planilhas
-- ingeridas (fato_secao só recebe número consolidado de P1/P3/Motomec, via
-- ingestão automática). Estas duas tabelas são o que a Companhia escreve:
--
--   cia_lancamentos — pendência, ocorrência relevante, justificativa de meta
--     e nota de escala, com prazo e status.
--   cia_metas — meta mensal por indicador, para o painel confrontar meta com
--     o realizado que já vem de fato_secao.
--
-- `unidade` é texto ('1'..'4','ft') pelo mesmo motivo da migration 019: a
-- Força Tática não tem número de Cia em fato_secao.
--
-- Autoria segue o padrão da migration 006 (operador como texto legível na
-- própria linha): o app não usa Supabase Auth, então auth.uid() seria sempre
-- nulo. Toda escrita passa por server action com o admin client.
--
-- RLS ligada sem policy, igual ao resto da base.
-- ============================================================================

create table if not exists public.cia_lancamentos (
  id uuid primary key default gen_random_uuid(),
  unidade text not null check (unidade in ('1', '2', '3', '4', 'ft')),
  tipo text not null check (
    tipo in ('pendencia', 'ocorrencia_relevante', 'justificativa_meta', 'nota_escala')
  ),
  data_ref date not null default current_date,
  titulo text not null,
  texto text,
  prazo date,
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'concluido')),
  criado_por_usuario text not null,
  criado_em timestamptz not null default now(),
  atualizado_por_usuario text,
  atualizado_em timestamptz
);

create index if not exists cia_lancamentos_unidade_idx
  on public.cia_lancamentos (unidade, status, data_ref desc);

create table if not exists public.cia_metas (
  id bigint generated always as identity primary key,
  unidade text not null check (unidade in ('1', '2', '3', '4', 'ft')),
  indicador text not null,
  ano integer not null check (ano between 2010 and 2100),
  mes integer not null check (mes between 1 and 12),
  valor_meta numeric not null,
  definido_por_usuario text not null,
  atualizado_em timestamptz not null default now(),
  unique (unidade, indicador, ano, mes)
);

create index if not exists cia_metas_unidade_idx on public.cia_metas (unidade, ano, mes);

alter table public.cia_lancamentos enable row level security;
alter table public.cia_metas enable row level security;
