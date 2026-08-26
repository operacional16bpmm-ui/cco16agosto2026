-- ============================================================================
-- CCO-16, Migration 024: categoria e data de referência do documento.
--
-- A aba Escala do painel de Companhia (app/(command)/companhia/[cia]/escala)
-- precisa distinguir "a escala do dia/semana" dos demais documentos já
-- endereçados à mesma unidade (ofícios, planilhas) sem criar uma tabela nova
-- — é o MESMO framework de documentos_secoes (migrations 017/018/021), só com
-- um rótulo a mais. `categoria` fica livre (não é enum) porque outras seções
-- podem querer o mesmo recurso amanhã (ex.: 'boletim', 'escala') sem migration
-- nova; a aba Escala filtra especificamente por categoria = 'escala'.
--
-- `data_referencia` é a data (ou o primeiro dia) a que a escala se refere —
-- não é `criado_em` (quando o arquivo foi enviado, que pode ser em lote,
-- dias antes de valer). Nullable: documentos que não são escala não usam.
-- ============================================================================

alter table public.documentos_secoes
  add column if not exists categoria text,
  add column if not exists data_referencia date;

create index if not exists documentos_secoes_categoria_idx
  on public.documentos_secoes (categoria)
  where categoria is not null;
