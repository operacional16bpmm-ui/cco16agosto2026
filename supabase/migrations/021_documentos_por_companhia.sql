-- ============================================================================
-- CCO-16 — Migration 021: documentos com visibilidade por Companhia.
--
-- A migration 017 previu visibilidade só para as seções do Estado-Maior. Com
-- o módulo de Comando de Companhia, o painel de Administração precisa poder
-- endereçar um documento a uma unidade subordinada (ex.: ordem de serviço só
-- da 3ª Cia), reaproveitando o mesmo framework de upload e download.
--
-- Só o check constraint muda; nenhuma tabela nova, nenhum dado tocado.
-- ============================================================================

alter table public.documentos_secoes_visibilidade
  drop constraint if exists documentos_secoes_visibilidade_secao_check;

alter table public.documentos_secoes_visibilidade
  add constraint documentos_secoes_visibilidade_secao_check check (
    secao in (
      'p1', 'p2', 'p3', 'p4', 'comunicacao', 'spjmd', 'logistica',
      'reserva_armas', 'forca_tatica', 'estado_maior', 'publico',
      'cia_1', 'cia_2', 'cia_3', 'cia_4', 'cia_ft'
    )
  );
