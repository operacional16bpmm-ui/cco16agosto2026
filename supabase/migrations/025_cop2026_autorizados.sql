-- ============================================================================
-- CCO-16 — Migration 025: lista de autorizados do painel da COP 2026.
--
-- Até aqui, quem abre /cop2026/dashboard e /cop2026/briefing era decidido por
-- UMA variável de ambiente na Vercel (COP2026_EMAILS_AUTORIZADOS, lida em
-- lib/cop2026-acesso.ts). Incluir ou remover um oficial exigia editar a
-- variável no painel da Vercel e redeployar: não é operação de tela, e cada
-- mudança custava um build. Esta tabela move a lista para o banco, para que a
-- inclusão e a revogação valham na hora, pela tela, com trilha de quem mexeu.
--
-- A variável de ambiente NÃO morre: continua como semente da primeira carga
-- (botão "Importar para o banco" da tela) e como plano B enquanto a tabela
-- nunca foi semeada — ver lib/db/cop2026-autorizados.ts. Depois da importação,
-- tabela vazia significa "ninguém entra", e é isso mesmo: lista vazia é
-- decisão, não falha.
--
-- Quem ADMINISTRA a lista não sai daqui: vem de COP2026_ADMINS, variável de
-- ambiente separada, na mesma doutrina da credencial de emergência do portal
-- (CCO16_USUARIO/CCO16_SENHA em lib/auth-usuarios.ts). Assim o administrador
-- não se tranca do lado de fora ao se remover da lista por engano, e o banco
-- fora do ar não impede a administração.
--
-- Normalização no BANCO, não só no app: a lista chega colada do WhatsApp e é o
-- check de lower(trim()) que garante que "Fulano@Gmail.com" não vire uma
-- segunda entrada de "fulano@gmail.com" — a chave primária é o próprio email.
--
-- RLS ligada sem policy, igual a todas as outras tabelas da base: só o service
-- role (admin client no backend) lê e escreve.
-- ============================================================================

create table if not exists public.cop2026_autorizados (
  email text primary key,
  -- Posto e nome de guerra, como o Comando manda a lista. Opcional: o que
  -- autoriza é o email; o nome existe para a tela ser legível.
  nome text,
  observacao text,
  -- Revogar é desligar, não apagar: o email some do acesso na hora e a linha
  -- fica para a trilha. Excluir de vez é ação separada na tela.
  ativo boolean not null default true,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz,
  constraint cop2026_autorizados_email_normalizado
    check (email = lower(trim(email))),
  constraint cop2026_autorizados_email_valido
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create index if not exists cop2026_autorizados_ativo_idx
  on public.cop2026_autorizados (ativo);

alter table public.cop2026_autorizados enable row level security;

comment on table public.cop2026_autorizados is
  'Contas Google que abrem o Dashboard e o Briefing da Auditoria de COP 2026. Administrada em /cop2026/admin por quem está em COP2026_ADMINS.';
