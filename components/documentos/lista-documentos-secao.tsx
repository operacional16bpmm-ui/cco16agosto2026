import { FileText, Download, Link2, ExternalLink } from "lucide-react";
import { Card } from "@/components/command/ui";
import { listarDocumentosPorSecao } from "@/lib/db/documentos";
import type { SecaoDocumento } from "@/lib/secoes-documentos";

function formatarTamanho(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Lista de documentos liberados para uma seção do batalhão (upload feito em
 * Administrativo → Documentos). Some silenciosamente quando não há nenhum
 * documento liberado — não precisa poluir a página com um estado vazio.
 * Links (ex.: planilha do Google Sheets publicada) são exibidos em prévia
 * (iframe) em vez de link de download.
 */
export async function ListaDocumentosSecao({
  secao,
  excluirCategoria,
}: {
  secao: SecaoDocumento;
  /** Ex.: 'escala' no painel de Companhia, que já tem aba própria para isso. */
  excluirCategoria?: string;
}) {
  const documentos = await listarDocumentosPorSecao(secao, { excluirCategoria });
  if (documentos.length === 0) return null;

  return (
    <Card className="mt-5">
      <h2 className="mb-3 text-sm font-semibold text-branco">Documentos</h2>
      <div className="flex flex-col gap-2 divide-y divide-branco/5">
        {documentos.map((doc) =>
          doc.tipo === "link" && doc.url_externa ? (
            <div key={doc.id} className="pt-2 first:pt-0">
              <div className="flex items-center gap-3 py-1.5 text-sm text-branco/70">
                <Link2 size={16} className="shrink-0 text-branco/40" />
                <span className="flex-1 truncate">{doc.nome_exibicao}</span>
                <a
                  href={doc.url_externa}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-branco/30 transition-colors hover:text-branco"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <iframe
                src={doc.url_externa}
                className="h-72 w-full rounded-md border border-branco/10 bg-white"
                loading="lazy"
              />
            </div>
          ) : (
            <a
              key={doc.id}
              href={`/api/documentos-secoes/${doc.id}/download`}
              className="flex items-center gap-3 py-2.5 text-sm text-branco/70 transition-colors hover:text-branco"
            >
              <FileText size={16} className="shrink-0 text-branco/40" />
              <span className="flex-1 truncate">{doc.nome_exibicao}</span>
              <span className="shrink-0 text-[11px] text-branco/35">{formatarTamanho(doc.tamanho_bytes)}</span>
              <Download size={14} className="shrink-0 text-branco/30" />
            </a>
          )
        )}
      </div>
    </Card>
  );
}
