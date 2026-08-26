-- ============================================================================
-- CCO-16, Migration 023: permissão por página e controle de sessão por usuário.
--
-- Até aqui a autorização era derivada só do par perfil+unidade, em código
-- (lib/autorizacao.ts): qualquer sessão válida abria qualquer rota protegida.
-- Esta migration cria a base para o Comando decidir, usuário a usuário, quais
-- páginas da Sala de Comando cada um enxerga:
--
--   usuarios_paginas: uma linha por (usuário, rota liberada). A rota é o
--   caminho da página como aparece no catálogo de lib/paginas.ts. Liberar uma
--   rota libera também as subrotas dela (ex.: '/p4' cobre '/p4/telematica'),
--   regra aplicada em lib/db/permissoes.ts. Perfil 'comando' não usa esta
--   tabela: é sempre irrestrito, para o Comando nunca se trancar para fora.
--
-- Colunas novas em usuarios_portal:
--   deve_trocar_senha: ligada quando a senha foi gerada pelo Comando (chave de
--     acesso provisória). O portal intercepta o próximo login e obriga a troca.
--   sessao_versao: gravada no payload do cookie no login. Incrementar o valor
--     no banco derruba imediatamente toda sessão já emitida do usuário, o que
--     o cookie stateless de 12h sozinho não permitia.
--   criado_por / atualizado_por / atualizado_em: trilha de quem administrou a
--     conta, no mesmo padrão texto-legível da migration 006 (o app não usa
--     Supabase Auth, então não há auth.uid()).
--
-- RLS ligada sem policy, igual às demais tabelas: só o service role acessa.
-- ============================================================================

alter table public.usuarios_portal
  add column if not exists deve_trocar_senha boolean not null default false,
  add column if not exists sessao_versao integer not null default 1,
  add column if not exists criado_por text,
  add column if not exists atualizado_por text,
  add column if not exists atualizado_em timestamptz;

create table if not exists public.usuarios_paginas (
  usuario_id uuid not null references public.usuarios_portal (id) on delete cascade,
  rota text not null,
  concedido_por text,
  concedido_em timestamptz not null default now(),
  primary key (usuario_id, rota),
  -- Só caminho interno absoluto: barra no início e nada de URL completa.
  constraint usuarios_paginas_rota_interna check (rota ~ '^/[a-z0-9/_-]*$')
);

create index if not exists usuarios_paginas_usuario_idx
  on public.usuarios_paginas (usuario_id);

alter table public.usuarios_paginas enable row level security;

-- Revogação imediata: incremento atômico no banco, e não leitura-soma-escrita
-- no app (duas revogações simultâneas poderiam ler a mesma versão e uma
-- sobrescrever a outra, deixando de fora um cookie que devia cair).
create or replace function public.incrementar_sessao_versao(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.usuarios_portal
     set sessao_versao = sessao_versao + 1
   where id = p_id
  returning sessao_versao;
$$;
