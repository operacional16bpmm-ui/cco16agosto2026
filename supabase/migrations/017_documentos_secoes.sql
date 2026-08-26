-- Documentos por seção: arquivos enviados via upload no Admin (Setor
-- Administrativo) e distribuídos seletivamente para as seções do site.
-- Sem RLS por usuário autenticado (o app não usa Supabase Auth hoje) —
-- toda escrita passa pelo admin client (service role) nas API routes;
-- leitura de visibilidade também passa pelo backend, nunca direto do
-- cliente com a anon key.

create table if not exists public.documentos_secoes (
  id uuid primary key default gen_random_uuid(),
  nome_exibicao text not null,
  nome_arquivo_original text not null,
  storage_path text not null unique,
  tipo_mime text,
  tamanho_bytes bigint,
  enviado_por text,
  criado_em timestamptz not null default now()
);

create table if not exists public.documentos_secoes_visibilidade (
  documento_id uuid not null references public.documentos_secoes(id) on delete cascade,
  secao text not null check (
    secao in (
      'p1', 'p2', 'p3', 'p4', 'comunicacao', 'spjmd', 'logistica',
      'reserva_armas', 'forca_tatica', 'estado_maior', 'publico'
    )
  ),
  criado_em timestamptz not null default now(),
  primary key (documento_id, secao)
);

create index if not exists documentos_secoes_visibilidade_secao_idx
  on public.documentos_secoes_visibilidade (secao);

alter table public.documentos_secoes enable row level security;
alter table public.documentos_secoes_visibilidade enable row level security;

-- Sem policies para authenticated/anon: por padrão RLS bloqueia tudo,
-- e o service role (admin client) contorna RLS — que é o único caminho
-- de acesso a estas tabelas nesta fase do projeto.
