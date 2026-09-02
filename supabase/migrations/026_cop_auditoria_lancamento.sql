-- ============================================================================
-- CCO-16 — Migration 026: o lançamento da Auditoria de COP sai do Google Forms
-- e passa a morar no portal (`/cop2026/lancar`).
--
-- POR QUE MUDAR DE CASA
--
-- O painel de /cop2026 lê AO VIVO o CSV publicado de uma planilha do Google. O
-- próprio lib/cop2026-leitura.ts documenta o custo: a publicação oscilou de 6s
-- a mais de 30s no mesmo minuto e derrubou a página em 29/08/2026. Existem
-- ~150 linhas de defesa (Promise.any, dois timeouts, retrato em memória) que
-- não existiriam com um banco.
--
-- Mas o motivo REAL não é latência — é a qualidade da evidência. Medido nos
-- 103 lançamentos de agosto/2026 (471 campos de ID preenchidos):
--
--   42,0% ID da mídia (32 hex)      6,6% ID da gravação (UUID)
--    2,5% URL colada inteira       43,1% número solto que não identifica nada
--    5,7% outros
--
-- Só 48,6% do que está gravado como "evidência" resolve para um objeto da
-- plataforma. A coluna do Forms se chama "ID da midia/gravacao 1..6" — ambígua
-- por construção — e a lista fechada de 6 campos criou dois artefatos que
-- envenenam qualquer comparação: PISO de 3 (os três primeiros eram
-- obrigatórios, então 103/103 têm pelo menos 3) e TETO de 6 (15 lançamentos
-- declararam mais, um deles 32, e só puderam registrar 6).
--
-- O QUE ESTA MIGRATION NÃO FAZ
--
-- Não muda a regra de contagem. Setembro continua valendo pela QUANTIDADE
-- DECLARADA (`videos_declarados`) — decisão "declarado agora, contado depois",
-- para o painel do Major seguir comparável com agosto. As outras duas réguas
-- (`videos_contados`, `videos_validos`) são gravadas desde o primeiro dia para
-- que a virada de critério, quando o Comando decidir, seja uma troca de coluna
-- e não uma reinterpretação retroativa. A MESMA auditoria de agosto vale 604,
-- 471 ou 229 evidências conforme a régua: a diferença atravessa DUAS faixas de
-- classificação, e trocar isso em silêncio parece colapso do Batalhão.
--
-- CORREÇÕES DE SEGURANÇA QUE PRECISAM EXISTIR ANTES DO PRIMEIRO LANÇAMENTO
--
--   C-1 replay ......... o mesmo ID relançado todo dia. JÁ ACONTECE: 24 valores
--                        se repetem em agosto, um deles 6 vezes, e 4 IDs foram
--                        usados por REs diferentes. Índice único por auditor.
--   C-2 data futura .... 30 dias × 3 turnos × 40 IDs de uma conta só, contra
--                        meta de 960, sem violar índice nenhum. Agosto tem 2
--                        lançamentos com data POSTERIOR ao próprio envio.
--   C-3 sequestro de RE  RE não é segredo: está no crachá e na escala. Vínculo
--                        conta↔RE entra em fila de confirmação e não conta para
--                        a meta enquanto pendente.
--   C-4 server action .. é endpoint público; `subunidade` NÃO vem do cliente,
--                        deriva do RE — senão dá para despejar evidência no
--                        balde de outra Cia e distorcer o ranking.
--   A-5 dupla contagem . chave de dedup ATRAVESSA as origens (formulário e
--                        planilha), senão a importação de agosto duplica tudo.
--
-- Teto honesto: nenhuma dessas pega um fraudador competente que gere UUID novo
-- e espace os envios. Pegam os preguiçosos. A mitigação de verdade não é
-- código — é o CSV mensal da Motorola (gravação + quem assistiu + quando),
-- pedido administrativo. Com ele, toda fraude acima vira um join, e é para
-- receber esse dado que existe a tabela cop_verificacao_execucao.
--
-- RLS ligada sem policy em tudo, como no resto da base: só o service role lê e
-- escreve, sempre pelo backend.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lançamento — uma declaração de auditoria, de um PM, num turno.
-- ----------------------------------------------------------------------------
create table if not exists public.cop_auditoria_lancamento (
  id uuid primary key default gen_random_uuid(),

  data_auditoria date not null,
  hora text,
  turno text not null,

  -- Cinco formatos de RE chegaram pelo Forms em agosto (`972607-1` 80×,
  -- `120146` 12×, `121898A` 6×, `970462-A` 3×, `9759662` 2×) enquanto
  -- p4_efetivo está 100% em `NNNNNN-X`. `re` guarda o que a pessoa digitou;
  -- `re_base` são os 6 dígitos, e é ELE que casa, agrega e deduplica — quem
  -- digitou com e sem verificador é a mesma pessoa.
  re text not null,
  re_base text not null check (re_base ~ '^[0-9]{6}$'),

  nome_guerra text not null default '',
  posto text not null default '',
  funcao text not null default '',

  -- C-4: derivada do RE no servidor, nunca recebida do cliente.
  subunidade text not null
    check (subunidade in ('em','1cia','2cia','3cia','4cia','ft','outros')),

  auditou boolean not null,

  -- As TRÊS réguas, gravadas de uma vez (ver cabeçalho).
  videos_declarados smallint not null default 0 check (videos_declarados >= 0),
  videos_contados   smallint not null default 0 check (videos_contados >= 0),
  videos_validos    smallint not null default 0 check (videos_validos >= 0),

  numero_parte text,
  justificativa text,

  origem text not null check (origem in ('formulario','planilha','admin')),

  -- A-5: `re_base|data|turno`. Atravessa as origens de propósito.
  chave_dedup text not null,

  -- C-3: aceito, visível, auditável — mas fora da meta até o Cmt Cia/P-1
  -- confirmar o vínculo. Recusar seria pior: produz o registro que não existe.
  vinculo_pendente boolean not null default false,
  -- Fora da janela de 72h. Não bloqueia: 13 lançamentos de agosto chegaram
  -- mais de 2 dias depois da data auditada, 11 deles mais de 7 dias.
  retroativo boolean not null default false,

  -- O que chegou, verbatim. É o que tem valor probatório num processo; o resto
  -- é interpretação nossa e pode mudar de versão para versão.
  payload_bruto jsonb,

  criado_em timestamptz not null default now(),
  criado_por_email text,
  -- `sub` do Google: se a pessoa trocar o e-mail, ainda dá para correlacionar.
  criado_por_sub text,
  editado_em timestamptz,
  editado_por text,
  excluido_em timestamptz,
  excluido_por text,
  motivo_exclusao text
);

-- ATENÇÃO: este índice ÚNICO foi DERRUBADO pela migration 028. A premissa de
-- "um lançamento por PM, data e turno" é falsa — 12 grupos de agosto/2026 têm
-- lançamentos COMPLEMENTARES no mesmo turno, com sobreposição zero de
-- identificadores (um policial fez 8 lançamentos e 40 IDs distintos numa noite).
-- Mantido aqui como está por ser o histórico do que foi aplicado; quem cria a
-- base do zero fica com o índice não-único da 028.
create unique index if not exists cop_lanc_dedup_uidx
  on public.cop_auditoria_lancamento (chave_dedup)
  where excluido_em is null;

create index if not exists cop_lanc_data_idx
  on public.cop_auditoria_lancamento (data_auditoria) where excluido_em is null;
create index if not exists cop_lanc_subunidade_idx
  on public.cop_auditoria_lancamento (subunidade) where excluido_em is null;
create index if not exists cop_lanc_re_idx
  on public.cop_auditoria_lancamento (re_base) where excluido_em is null;
-- Idempotência do envio: em 4G ruim o POST estoura DEPOIS de o servidor
-- aceitar, o aplicativo reenvia e nasce a duplicata. O identificador é gerado
-- no cliente, então a segunda tentativa reencontra a primeira.
create unique index if not exists cop_lanc_submissao_uidx
  on public.cop_auditoria_lancamento ((payload_bruto->>'idSubmissao'))
  where (payload_bruto ? 'idSubmissao');

-- ----------------------------------------------------------------------------
-- 2. Evidência — UMA linha por identificador colado.
--
-- Por que não `text[]` no lançamento: array impede tipo por item, estado de
-- verificação por item, índice, dedupe e histórico — e marcar UM item como
-- conferido exigiria reescrever o array inteiro, com corrida garantida.
-- ----------------------------------------------------------------------------
create table if not exists public.cop_evidencia (
  id bigint generated always as identity primary key,
  lancamento_id uuid not null
    references public.cop_auditoria_lancamento(id) on delete cascade,
  posicao smallint not null,

  -- EXATAMENTE o que foi colado. Imutável por trigger (ver abaixo): é a peça
  -- que um processo disciplinar vai querer ler byte a byte.
  bruto text not null,

  tipo text not null check (tipo in ('midia','gravacao','pagina','url','desconhecido')),

  -- Os três identificadores em colunas separadas: não se sabe por qual a
  -- futura API da Motorola vai chavear, e as 12 URLs coladas em agosto provam
  -- que os três coexistem numa string só.
  id_midia char(32) check (id_midia ~ '^[0-9a-f]{32}$'),
  id_gravacao uuid,          -- hífen preservado: é o único discriminador
  id_pagina bigint,

  -- RE de quem LANÇOU, desnormalizado do pai. Índice único não atravessa join,
  -- e é o auditor — não o operador da câmera — que replica o próprio ID.
  re_auditor_base text not null check (re_auditor_base ~ '^[0-9]{6}$'),
  -- RE do operador da câmera, quando informado. NUNCA CPF: a plataforma mostra
  -- `13934852785 (SOLDADO PM 231936 FABRICIO -16BPMM)` e 22 células de agosto
  -- entraram na planilha com o CPF de terceiro colado junto.
  re_operador text check (re_operador is null or re_operador ~ '^[0-9]{6}(-[0-9A-Z])?$'),

  -- Chave de unicidade que atravessa o tipo, materializada para o índice.
  id_normalizado text generated always as (coalesce(id_midia, id_gravacao::text)) stored,
  -- Espelha a exclusão lógica do pai: lançamento corrigido devolve o ID ao
  -- mundo, em vez de trancá-lo para sempre por causa de um erro de digitação.
  descartada boolean not null default false,

  verificacao_status text not null default 'nao_verificado'
    check (verificacao_status in ('nao_verificado','confere','nao_encontrado','divergente')),
  verificado_em timestamptz,
  verificacao_fonte text,
  motorola_snapshot jsonb,

  criado_em timestamptz not null default now(),
  unique (lancamento_id, posicao)
);

-- C-1: um identificador conta UMA vez por PM, para sempre.
create unique index if not exists cop_evid_re_uidx
  on public.cop_evidencia (re_auditor_base, id_normalizado)
  where id_normalizado is not null and descartada = false;

-- Detecção (relatório, nunca bloqueio): o mesmo ID em REs diferentes.
create index if not exists cop_evid_id_idx
  on public.cop_evidencia (id_normalizado) where id_normalizado is not null;
create index if not exists cop_evid_lanc_idx on public.cop_evidencia (lancamento_id);

-- ----------------------------------------------------------------------------
-- 3. Execução de verificação — a conferência também precisa ser auditável.
--
-- Um processo disciplinar vai perguntar QUANDO a checagem foi feita e CONTRA O
-- QUÊ. Enquanto não houver o export da Motorola, esta tabela fica vazia — e o
-- painel exibe "Conferidos na plataforma: 0". Mostrar zero é honesto, e é o
-- argumento mais forte para conseguir o acesso à API.
-- ----------------------------------------------------------------------------
create table if not exists public.cop_verificacao_execucao (
  id bigint generated always as identity primary key,
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  fonte text,
  versao_api text,
  total integer,
  confere integer,
  nao_encontrado integer,
  erro integer,
  observacao text
);

-- ----------------------------------------------------------------------------
-- 4. Vínculo conta Google ↔ RE (C-3).
--
-- Pré-semeado de p4_efetivo.email quando existir; o resto entra pendente. Fica
-- IMUTÁVEL pelo usuário depois de confirmado — trocar o próprio RE é ação de
-- administrador, com trilha.
-- ----------------------------------------------------------------------------
create table if not exists public.cop2026_auditor (
  email text primary key check (email = lower(trim(email))),
  re_base text not null check (re_base ~ '^[0-9]{6}$'),
  re text,
  nome_guerra text,
  confirmado_em timestamptz,
  confirmado_por text,
  bloqueado boolean not null default false,
  -- RE que não casa com o roster. NUNCA é motivo de recusa: p4_efetivo está
  -- congelado em 19/07 e tem 2 bases de RE duplicadas — o roster enriquece.
  re_fora_do_efetivo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists cop2026_auditor_re_idx on public.cop2026_auditor (re_base);

-- ----------------------------------------------------------------------------
-- 5. Parâmetros — substitui a aba "Parametros" da planilha.
--
-- Semente = MATRIZ_PROPORCIONAL_2026 EXATA (lib/cop2026.ts), para que nenhum
-- número da tela mude no dia da virada. A matriz hardcoded PREVALECE hoje sobre
-- a planilha em calcularPainel(); esta tabela é o que permite editar meta sem
-- deploy — sem ela, "editar metas" na tela seria mentira.
--
-- Dois denominadores em conflito, e é decisão do Comando, não bug: a antiga
-- cop_auditoria_efetivo somava 520 PMs (EM 74 · 1ª 94 · 2ª 92 · 3ª 117 · 4ª 85
-- · FT 58, foto de julho) e a matriz soma 570 (98/102/93/111/93/73). A matriz é
-- a base da meta homologada de 960; p4_efetivo é foto de efetivo e serve para
-- o lookup por RE — jamais para a meta.
-- ----------------------------------------------------------------------------
create table if not exists public.cop_auditoria_parametro (
  periodo text not null check (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  subunidade text not null
    check (subunidade in ('em','1cia','2cia','3cia','4cia','ft')),
  efetivo integer not null check (efetivo >= 0),
  evidencias_por_turno smallint not null default 3 check (evidencias_por_turno >= 0),
  turnos smallint not null check (turnos >= 0),
  dias smallint not null default 0,
  meta integer not null check (meta >= 0),
  metas_semanais integer[] not null default '{}',
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  primary key (periodo, subunidade)
);

insert into public.cop_auditoria_parametro
  (periodo, subunidade, efetivo, evidencias_por_turno, turnos, dias, meta, metas_semanais, atualizado_por)
values
  ('2026-09','em',   98, 2, 12, 24,  48, '{12,12,12,12}', 'migration 026'),
  ('2026-09','1cia',102, 3, 15, 30, 195, '{49,49,49,48}', 'migration 026'),
  ('2026-09','2cia', 93, 3, 15, 30, 180, '{45,45,45,45}', 'migration 026'),
  ('2026-09','3cia',111, 3, 15, 30, 210, '{53,52,53,52}', 'migration 026'),
  ('2026-09','4cia', 93, 3, 15, 30, 180, '{45,45,45,45}', 'migration 026'),
  ('2026-09','ft',   73, 3, 15, 30, 147, '{37,37,37,36}', 'migration 026')
on conflict (periodo, subunidade) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Trilha em TRIGGER, não no app.
--
-- registrarAuditoria() (lib/db/usuarios.ts) engole a falha em try/catch —
-- trilha que pode faltar não é trilha. A trigger é atômica, não pode ser
-- pulada e cobre também escrita por script, por MCP e por SQL no console.
-- Guarda valor anterior E posterior: "editou" sem o antes não reconstrói nada.
-- ----------------------------------------------------------------------------
create table if not exists public.cop_auditoria_trilha (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  operacao text not null check (operacao in ('INSERT','UPDATE','DELETE')),
  anterior jsonb,
  posterior jsonb,
  operador text,
  em timestamptz not null default now()
);
create index if not exists cop_trilha_registro_idx
  on public.cop_auditoria_trilha (tabela, registro_id, em desc);

create or replace function public.cop_registrar_trilha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operador text;
  v_id text;
begin
  v_operador := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old)->>'editado_por' else to_jsonb(new)->>'editado_por' end,
    case when tg_op = 'DELETE' then to_jsonb(old)->>'criado_por_email' else to_jsonb(new)->>'criado_por_email' end,
    'desconhecido'
  );
  v_id := case when tg_op = 'DELETE' then to_jsonb(old)->>'id' else to_jsonb(new)->>'id' end;

  insert into public.cop_auditoria_trilha (tabela, registro_id, operacao, anterior, posterior, operador)
  values (
    tg_table_name,
    coalesce(v_id, '?'),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    v_operador
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists cop_lanc_trilha on public.cop_auditoria_lancamento;
create trigger cop_lanc_trilha
  after insert or update or delete on public.cop_auditoria_lancamento
  for each row execute function public.cop_registrar_trilha();

-- ----------------------------------------------------------------------------
-- 7. Regras que o banco impõe sozinho (C-2 e imutabilidade da evidência).
--
-- A data vai em TRIGGER e não em CHECK de propósito: `current_date` é o dia em
-- UTC, e às 21h de São Paulo já é amanhã lá — o check recusaria a data de hoje
-- três horas antes da virada, bem no meio do turno da noite. Aqui o "hoje" é
-- explicitamente America/Sao_Paulo. (CHECK com função não-imutável também
-- quebra dump/restore, o que é razão suficiente por si só.)
-- ----------------------------------------------------------------------------
create or replace function public.cop_validar_lancamento()
returns trigger
language plpgsql
as $$
begin
  if new.data_auditoria > ((now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'data_auditoria no futuro (%): a auditoria não pode ser lançada antes de acontecer', new.data_auditoria;
  end if;
  if new.chave_dedup is null or new.chave_dedup = '' then
    raise exception 'chave_dedup obrigatória — ver lib/cop2026-lancamento.ts';
  end if;
  return new;
end;
$$;

drop trigger if exists cop_lanc_validar on public.cop_auditoria_lancamento;
create trigger cop_lanc_validar
  before insert or update on public.cop_auditoria_lancamento
  for each row execute function public.cop_validar_lancamento();

-- O texto colado é peça de prova: pode ser descartado, nunca reescrito.
create or replace function public.cop_evidencia_bruto_imutavel()
returns trigger
language plpgsql
as $$
begin
  if new.bruto is distinct from old.bruto then
    raise exception 'cop_evidencia.bruto é imutável: exclua o lançamento e refaça, para a trilha registrar';
  end if;
  return new;
end;
$$;

drop trigger if exists cop_evid_bruto_imutavel on public.cop_evidencia;
create trigger cop_evid_bruto_imutavel
  before update on public.cop_evidencia
  for each row execute function public.cop_evidencia_bruto_imutavel();

-- ----------------------------------------------------------------------------
-- 8. RLS — ligada, sem policy. Só service role, como no resto da base.
-- ----------------------------------------------------------------------------
alter table public.cop_auditoria_lancamento enable row level security;
alter table public.cop_evidencia            enable row level security;
alter table public.cop_verificacao_execucao enable row level security;
alter table public.cop2026_auditor          enable row level security;
alter table public.cop_auditoria_parametro  enable row level security;
alter table public.cop_auditoria_trilha     enable row level security;

-- ----------------------------------------------------------------------------
-- 9. Desenhos abandonados que precisam sair do caminho.
--
-- cop_auditoria_respostas (migration 008): importação manual de CSV, NUNCA
-- recebeu uma linha (0 em 01/09/2026). Ficar de pé só oferece uma segunda
-- tabela para alguém escrever por engano.
--
-- cop_auditoria_efetivo: 6 linhas com o efetivo de julho e chaves não
-- canônicas ("16º BPM/M / 1ª Cia"), somando 520 — um denominador que conflita
-- com os 570 da matriz homologada. Os valores ficam registrados no comentário
-- do item 5 acima, que é onde a trilha deles importa.
--
-- lib/db/cop-auditoria.ts sai junto no mesmo commit: ele definia
-- EVIDENCIAS_MIN_POR_TURNO = 2 e calculava meta própria — uma SEGUNDA fonte de
-- classificação, que o AGENTS.md do repositório proíbe.
-- ----------------------------------------------------------------------------
drop table if exists public.cop_auditoria_respostas;
drop table if exists public.cop_auditoria_efetivo;

comment on table public.cop_auditoria_lancamento is
  'Declaração de auditoria de COP por PM/turno, lançada em /cop2026/lancar (migration 026). Substitui o Google Forms.';
comment on table public.cop_evidencia is
  'Um identificador de mídia/gravação por linha. `bruto` é imutável: é a peça de prova.';
comment on table public.cop_auditoria_parametro is
  'Metas e efetivo por período/subunidade. Semente = MATRIZ_PROPORCIONAL_2026.';
