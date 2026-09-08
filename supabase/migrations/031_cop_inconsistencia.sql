-- ============================================================================
-- CCO-16 — Migration 031: RELATO DE PROBLEMA DO SISTEMA (COP fora do ar).
--
-- POR QUE ESTA TABELA EXISTE
--
-- Em setembro de 2026 a COP ficou fora do ar de sexta a domingo e a fração não
-- comunicou. A ausência do sistema virou, na prática, justificativa para o que
-- aconteceu no serviço, e o Batalhão só soube pela imprensa — com o assunto
-- caminhando para o Ministério Público.
--
-- O que faltava não era monitoramento: era **prova de que a fração avisou**.
-- Esta tabela é o livro de avisos. Cada linha responde, com data e hora, quem
-- comunicou, de qual fração, o que estava fora e desde quando.
--
-- DUAS DATAS, DE PROPÓSITO
--
--   inicio_em      → quando o problema começou, DECLARADO pela fração
--   registrado_em  → quando o aviso chegou ao portal, carimbado pelo servidor
--
-- Elas não se substituem. A primeira é o fato; a segunda é a prova de
-- tempestividade — e a distância entre as duas é, ela própria, informação: um
-- relato de sexta que chega na terça diz algo que nenhuma das duas datas diz
-- sozinha.
--
-- NADA AQUI RECUSA UM RELATO
--
-- Não há CHECK que barre conteúdo, e `identificadores` é texto livre guardado
-- como veio. É a mesma decisão do Comando de 07/09/2026 sobre o identificador
-- de mídia: vale o declarado, e o que não confere vira fila de correção no
-- admin, nunca porta fechada. Quem tenta avisar e é barrado pela validação
-- vira exatamente o caso que este registro existe para impedir.
--
-- LGPD: `re` e `nome` são de quem relata, no exercício da função — mesmo
-- regime do lançamento de auditoria. Não entra CPF, não entra telefone, e a
-- descrição é campo de fato, não de pessoa.
-- ============================================================================

create table if not exists public.cop_inconsistencia (
  id               uuid primary key default gen_random_uuid(),

  -- Fração que relata, no vocabulário do painel ('em', '1cia', 'ft'…).
  subunidade       text        not null,
  -- Unidade da hierarquia, quando conhecida. Segue `cop_unidade.cod`; fica
  -- nulo no 16º BPM/M enquanto a migração 029 não carimbar o histórico.
  unidade_cod      text        null,

  inicio_em        timestamptz not null,
  -- Nulo enquanto o sistema não normalizou. É o que faz "ainda em curso" ser
  -- estado, e não uma flag que alguém esquece de desligar.
  fim_em           timestamptz null,

  abrangencia      text        not null,               -- 'total' | 'parcial'
  -- Mais de um efeito por fato: carregamento e download podem cair juntos.
  efeitos          text[]      not null default '{}',

  -- Exatamente como o relator colou. O que vale é o bruto; a classificação em
  -- mídia/gravação é interpretação nossa e vive em `identificadores_lidos`.
  identificadores       text     null,
  identificadores_lidos jsonb    not null default '[]'::jsonb,

  descricao        text        null,

  re               text        not null,
  nome             text        not null,

  situacao         text        not null default 'aberto',
  -- Quem tratou, e o que decidiu. Preenchido pelo admin.
  tratado_por      text        null,
  tratado_em       timestamptz null,
  tratativa        text        null,

  -- Avisos de forma que não bloquearam o envio, guardados para a fila de
  -- correção. Mesmo papel do `payload_bruto->'recusas'` do lançamento.
  pendencias       jsonb       not null default '[]'::jsonb,

  -- Rastro do envio, para desduplicar clique duplo e reenvio de aba aberta.
  id_submissao     text        null,
  origem           text        not null default 'portal',
  registrado_em    timestamptz not null default now()
);

-- Clique duplo no celular em 4G é a regra, não a exceção: o mesmo envio chega
-- duas vezes. Índice parcial porque `id_submissao` é nulo em carga manual.
create unique index if not exists cop_inconsistencia_submissao_uq
  on public.cop_inconsistencia (id_submissao)
  where id_submissao is not null;

-- O painel pergunta sempre a mesma coisa: o que está aberto, e o que aconteceu
-- neste mês, por fração.
create index if not exists cop_inconsistencia_inicio_idx
  on public.cop_inconsistencia (inicio_em desc);
create index if not exists cop_inconsistencia_aberto_idx
  on public.cop_inconsistencia (situacao, inicio_em desc)
  where situacao in ('aberto', 'em_analise');
create index if not exists cop_inconsistencia_subunidade_idx
  on public.cop_inconsistencia (subunidade, inicio_em desc);

comment on table public.cop_inconsistencia is
  'Livro de avisos de indisponibilidade da COP. Prova de comunicação da fração, não telemetria.';
comment on column public.cop_inconsistencia.inicio_em is
  'Quando o problema começou, declarado pela fração.';
comment on column public.cop_inconsistencia.registrado_em is
  'Quando o aviso chegou ao portal. Não confundir com inicio_em: a distância entre os dois é a tempestividade.';
comment on column public.cop_inconsistencia.pendencias is
  'Avisos de forma que NÃO bloquearam o envio. Fila de correção, nunca motivo de recusa.';

-- RLS ligado e sem policy de leitura anônima: o relato entra pela rota de
-- servidor com service role, e sai só para quem já passa por `exigirAcessoCop`.
-- Mesmo regime de `cop_auditoria_lancamento`.
alter table public.cop_inconsistencia enable row level security;
