-- ============================================================================
-- CCO-16 — Migration 029: dimensão de UNIDADE (CPA → Batalhão → Fração).
--
-- Até aqui a auditoria de COP era de um batalhão só. `cop_auditoria_lancamento`
-- tem `subunidade` ('em', '1cia', …) e NENHUMA coluna de batalhão ou CPA: todo
-- lançamento existente é implicitamente do 16º BPM/M. Para o sistema atender
-- todos os CPAs e batalhões, o dado precisa saber de onde veio.
--
-- ONDE A HIERARQUIA FOI ENCONTRADA
--
-- O DEJEM (`dejem_escalados_opm`, 27.924 linhas cobrindo o estado) traz o
-- código OPM de 9 dígitos, e ele é posicional — verificado em 03/09/2026:
--
--     5 0 5 1 6 0 0 0 0
--     └─┬─┘ └┬┘ └──┬──┘
--       │    │     └─ fração dentro do batalhão (0000 = o próprio batalhão,
--       │    │        1000 = 1ª Cia, 1500 = 1ª Cia ADM, 7000 = Força Tática)
--       │    └─ número do batalhão (16)
--       └─ comando pai (505)
--
-- Conferência independente: `505` agrupa 16, 23 e 49 BPM/M, e é fato conhecido
-- que o 16º BPM/M pertence ao CPA/M-5. O padrão se repete em 501→CPA/M-1,
-- 503→CPA/M-3, 505→CPA/M-5, 509→CPA/M-9.
--
-- O QUE O DADO **NÃO** DIZ, E POR ISSO NÃO FOI ADIVINHADO
--
-- O nome do batalhão está no DEJEM ("16.BPM/M"). O nome do CPA **não está**
-- ligado ao código em lugar nenhum: `dejem_benchmark_gc` tem os 42 grandes
-- comandos como texto solto, com variantes do mesmo ("CPA/M-1" e
-- "CPA/M-1 66 1BPM/M" como registros distintos). São 22 grupos.
--
-- Por isso `cpa_nome` nasce NULL e é preenchido UMA vez pelo Comando, na tela
-- de Administração → Unidades. Carimbar um CPA errado num sistema oficial é
-- pior do que deixar em branco: em branco alguém pergunta, errado ninguém
-- percebe. `cop_unidade_pendente_de_revisao` é a lista do que falta.
--
-- NOME É O QUE APARECE. O código de 9 dígitos existe só como chave estável —
-- batalhão renomeado não quebra histórico. Nenhuma tela mostra o código fora da
-- área técnica do admin.
-- ============================================================================

create table if not exists public.cop_unidade (
  cod            text primary key,
  tipo           text not null check (tipo in ('cpa', 'batalhao', 'fracao')),
  -- O que a tropa e o Comando leem. Único dentro do pai.
  nome           text not null,
  -- Rótulo curto para caber em cartão e coluna de tabela ("16º BPM/M").
  nome_curto     text,
  -- Hierarquia: fração aponta para batalhão, batalhão aponta para CPA.
  cod_pai        text references public.cop_unidade (cod) on delete restrict,
  -- Preenchido pelo Comando; NULL enquanto não revisado. Só para tipo='cpa'.
  cpa_nome       text,
  -- Desligar unidade extinta sem apagar o histórico dela.
  ativa          boolean not null default true,
  criado_em      timestamptz not null default now(),
  revisado_em    timestamptz,
  revisado_por   text
);

comment on table public.cop_unidade is
  'CPA → Batalhão → Fração. Derivada do DEJEM em 03/09/2026; cpa_nome exige revisão humana.';

create index if not exists cop_unidade_pai_idx on public.cop_unidade (cod_pai);
create index if not exists cop_unidade_tipo_idx on public.cop_unidade (tipo) where ativa;

-- RLS negando por padrão, como todas as tabelas do domínio. A aplicação lê pelo
-- service_role no servidor; a chave pública não enxerga nada. `verificar:seguranca`
-- afirma isso a cada deploy.
alter table public.cop_unidade enable row level security;

-- ---------------------------------------------------------------------------
-- O vínculo do lançamento com a unidade
-- ---------------------------------------------------------------------------

-- `unidade_cod` aponta para a FRAÇÃO (folha da árvore). Batalhão e CPA saem por
-- `cod_pai` — guardar os três no lançamento criaria três formas de discordar.
alter table public.cop_auditoria_lancamento
  add column if not exists unidade_cod text references public.cop_unidade (cod);

create index if not exists cop_lanc_unidade_idx
  on public.cop_auditoria_lancamento (unidade_cod);

comment on column public.cop_auditoria_lancamento.unidade_cod is
  'Fração de onde veio o lançamento. NULL = anterior à migração 029 (16º BPM/M).';

-- ---------------------------------------------------------------------------
-- O que ainda espera o Comando
-- ---------------------------------------------------------------------------

create or replace view public.cop_unidade_pendente_de_revisao
with (security_invoker = true) as
  select
    u.cod,
    u.nome,
    count(b.cod)                                as batalhoes,
    string_agg(b.nome, ' · ' order by b.nome)   as quais
  from public.cop_unidade u
  left join public.cop_unidade b on b.cod_pai = u.cod
  where u.tipo = 'cpa' and u.cpa_nome is null
  group by u.cod, u.nome
  order by u.cod;

comment on view public.cop_unidade_pendente_de_revisao is
  'Grupos de batalhões cujo CPA ainda não foi nomeado. Zerar esta lista é pré-requisito da Fase 2.';
