-- ============================================================================
-- CCO-16 — Migration 019: usuários do portal com perfil e unidade.
--
-- Até aqui o portal inteiro entrava por UMA credencial compartilhada
-- (CCO16_USUARIO/CCO16_SENHA em lib/auth-simples.ts). Isso impedia duas
-- coisas exigidas pelo módulo de Comando de Companhia: recortar o que cada
-- pessoa vê (o Cmt da 3ª Cia não deve abrir o painel da 1ª) e saber quem
-- lançou cada registro (a coluna criado_por_usuario da migration 006 só faz
-- sentido se o login for individual).
--
-- `unidade` é texto ('1','2','3','4','ft') e não um smallint de Cia porque a
-- Força Tática não é uma Cia numerada em fato_secao: ela é a própria seção
-- (secao='ft', cia=null). Um único campo cobre as 5 unidades sem inventar um
-- número de Cia que o dado não tem. A conversão para o `cia` numérico de
-- fato_secao fica em lib/unidades.ts.
--
-- Senha: PBKDF2-SHA256 com salt por usuário, verificada em lib/auth-simples.ts
-- via Web Crypto (mesma API que já assina o cookie de sessão) — sem dependência
-- nova e sem senha em texto puro em lugar nenhum.
--
-- RLS ligada sem policy, igual a todas as outras tabelas da base: só o service
-- role (admin client no backend) lê e escreve.
-- ============================================================================

create table if not exists public.usuarios_portal (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  senha_hash text not null,
  senha_salt text not null,
  iteracoes integer not null default 210000,
  nome_exibicao text not null,
  perfil text not null check (perfil in ('comando', 'estado_maior', 'cmt_cia', 'secao')),
  unidade text check (unidade in ('1', '2', '3', '4', 'ft')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_acesso_em timestamptz,
  -- Comandante de Companhia sem unidade seria um perfil sem escopo: entraria
  -- no sistema e não veria painel nenhum. Barrado no banco, não só no app.
  constraint usuarios_portal_cmt_cia_tem_unidade
    check (perfil <> 'cmt_cia' or unidade is not null)
);

create index if not exists usuarios_portal_ativo_idx on public.usuarios_portal (ativo);

alter table public.usuarios_portal enable row level security;
