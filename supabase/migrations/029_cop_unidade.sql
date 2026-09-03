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
-- O NOME DO COMANDO ESTAVA DENTRO DO PRÓPRIO DADO
--
-- Primeira leitura concluiu que o nome do CPA não existia ligado ao código, e
-- que 48 grupos precisariam ser digitados à mão. Estava errado: a OPM de sufixo
-- **`00`** é a SEDE do comando, e ela traz o nome.
--
--     50500 → "CPA/M-5"   e 50516 é o 16.BPM/M, que pende dela
--     50100 → "CPA/M-1"   60100 → "CPI-1"   62000 → "CPRV"
--
-- CONFERÊNCIA INDEPENDENTE, porque uma dedução sozinha não basta para carimbar
-- comando em sistema oficial: o relatório `ExportRelGerEscOP` exportado da
-- intranet (40.473 linhas, colunas CPA;Convênio;AISP) dá o par CPA↔batalhão
-- direto da fonte da Corporação. Foram 96 batalhões, **zero conflito**, e o
-- agrupamento bate 100% com o do código de 9 dígitos:
--
--     CPA/M-5  → 16, 23, 49 BPM/M   = grupo 505
--     CPA/M-1  →  7, 11, 13 BPM/M   = grupo 501
--     CPA/M-10 →  1, 22, 27, 37     = grupo 510
--
-- Nomeados assim: 12 CPA/M, 10 CPI, CPTRAN, CPRV, CPAMB, CPC, CPM, CBI-2,
-- CBI-3, CAVPM e as diretorias — todo comando territorial, que é o universo da
-- auditoria de COP.
--
-- OS 13 QUE CONTINUAM SEM NOME não têm OPM de sede e não são CPA: são comandos
-- diretos do Comando Geral (ensino, saúde, Bombeiros, Choque, COPOM, Casa
-- Militar). Ficam para a tela de Administração → Unidades, com a lista dos
-- subordinados à vista. Carimbar um comando errado num sistema que a
-- Corregedoria e o Ministério Público vão ler é pior do que deixar em branco:
-- em branco alguém pergunta, errado ninguém percebe.
--
-- A sede sai de `ativa` depois de nomear o pai — senão ela apareceria como
-- batalhão irmão dos próprios subordinados no seletor.
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
