import { FileText, Download, Link2, ExternalLink } from "lucide-react";
import { listarDocumentosPorSecao } from "@/lib/db/documentos";

function formatarTamanho(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Documentos marcados como "Público" no painel de Administração →
 * Documentos por Seção. Server component assíncrono embutido numa página
 * síncrona (app/(public)/16bpmm/page.tsx) — o RSC resolve cada componente
 * async da árvore independente do pai. Não renderiza nada se não há
 * documento público, para não abrir uma seção vazia no site institucional.
 * Links (ex.: planilha do Google Sheets publicada) são exibidos em prévia
 * (iframe) em vez de link de download.
 */
export async function DocumentosPublicos16BPMM() {
  let documentos;
  try {
    documentos = await listarDocumentosPorSecao("publico");
  } catch {
    return null;
  }
  if (documentos.length === 0) return null;

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-borda bg-branco p-6 shadow-inst">
      <h3 className="mb-4 text-center font-serif text-lg text-azul-noite">Documentos públicos</h3>
      <div className="flex flex-col gap-2 divide-y divide-borda">
        {documentos.map((doc) =>
          doc.tipo === "link" && doc.url_externa ? (
            <div key={doc.id} className="pt-3 first:pt-0">
              <div className="flex items-center gap-3 pb-2 text-sm text-texto">
                <Link2 size={16} className="shrink-0 text-texto-suave" />
                <span className="flex-1 truncate">{doc.nome_exibicao}</span>
                <a
                  href={doc.url_externa}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-texto-suave transition-colors hover:text-azul"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <iframe
                src={doc.url_externa}
                className="h-72 w-full rounded-md border border-borda"
                loading="lazy"
              />
            </div>
          ) : (
            <a
              key={doc.id}
              href={`/api/documentos-secoes/publico/${doc.id}`}
              className="flex items-center gap-3 py-3 text-sm text-texto transition-colors hover:text-azul"
            >
              <FileText size={16} className="shrink-0 text-texto-suave" />
              <span className="flex-1 truncate">{doc.nome_exibicao}</span>
              <span className="shrink-0 text-xs text-texto-suave">{formatarTamanho(doc.tamanho_bytes)}</span>
              <Download size={14} className="shrink-0 text-texto-suave" />
            </a>
          )
        )}
      </div>
    </div>
  );
}
