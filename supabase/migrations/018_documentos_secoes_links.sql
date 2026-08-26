-- Documentos por seção: além do upload de arquivo, permite cadastrar um
-- link externo (ex.: planilha do Google Sheets publicada) que é exibido em
-- prévia (iframe) do mesmo jeito que os arquivos, sem precisar de storage.
-- Ver 017_documentos_secoes.sql para o desenho original da tabela.

alter table public.documentos_secoes
  add column if not exists tipo text not null default 'arquivo'
    check (tipo in ('arquivo', 'link')),
  add column if not exists url_externa text;

-- storage_path só existe para tipo='arquivo'; link não sobe pro storage.
-- A unicidade original vinha de "unique" inline (constraint, não índice solto)
-- por isso precisa dropar a constraint antes de trocar por um índice parcial.
alter table public.documentos_secoes
  alter column storage_path drop not null;

alter table public.documentos_secoes
  drop constraint if exists documentos_secoes_storage_path_key;

create unique index if not exists documentos_secoes_storage_path_key
  on public.documentos_secoes (storage_path)
  where storage_path is not null;

alter table public.documentos_secoes
  add constraint documentos_secoes_tipo_consistente check (
    (tipo = 'arquivo' and storage_path is not null)
    or
    (tipo = 'link' and url_externa is not null)
  );
