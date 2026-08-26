"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FileSpreadsheet, FileImage, FileCode, File as FileIcon, Link2 } from "lucide-react";
import type { DocumentoComVisibilidade } from "@/lib/db/documentos";

const MIME_OFFICE = new Set([
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function iconePorTipo(tipoMime: string | null, tipoDoc: "arquivo" | "link") {
  if (tipoDoc === "link") return <Link2 size={18} className="text-branco/40" />;
  if (!tipoMime) return <FileIcon size={18} className="text-branco/40" />;
  if (tipoMime === "application/pdf") return <FileText size={18} className="text-vermelho/70" />;
  if (tipoMime.startsWith("image/")) return <FileImage size={18} className="text-branco/40" />;
  if (tipoMime === "text/html") return <FileCode size={18} className="text-branco/40" />;
  if (MIME_OFFICE.has(tipoMime)) {
    if (tipoMime.includes("spreadsheet") || tipoMime.includes("excel")) {
      return <FileSpreadsheet size={18} className="text-ouro/70" />;
    }
    return <FileText size={18} className="text-azul/70" />;
  }
  return <FileIcon size={18} className="text-branco/40" />;
}

/**
 * Miniatura da prévia: renderiza o conteúdo real em escala reduzida (não só um
 * ícone). PDF/HTML/imagem/link renderizam nativamente; Word/Excel/PowerPoint
 * passam pelo visualizador do Office Online, que não tem alternativa nativa
 * de navegador. Carrega só quando entra na viewport (IntersectionObserver) —
 * com ~46 documentos na tabela, renderizar tudo de uma vez travaria a página.
 */
export function DocumentoPreview({ documento }: { documento: DocumentoComVisibilidade }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visivel || previewUrl || erro) return;
    fetch(`/api/documentos-secoes/${documento.id}/preview-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((corpo) => setPreviewUrl(corpo.url))
      .catch(() => setErro(true));
  }, [visivel, previewUrl, erro, documento.id]);

  const mime = documento.tipo_mime;
  const ehImagem = mime?.startsWith("image/");
  const ehPdf = mime === "application/pdf";
  const ehHtmlOuLink = mime === "text/html" || documento.tipo === "link";
  const ehOffice = mime ? MIME_OFFICE.has(mime) : false;

  return (
    <div
      ref={containerRef}
      className="relative h-16 w-14 shrink-0 overflow-hidden rounded border border-branco/10 bg-branco/5"
    >
      {!previewUrl || erro ? (
        <div className="flex h-full w-full items-center justify-center">
          {iconePorTipo(mime, documento.tipo)}
        </div>
      ) : ehImagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      ) : ehPdf ? (
        <iframe
          src={`${previewUrl}#toolbar=0&view=FitH`}
          className="pointer-events-none h-[220px] w-[200px] origin-top-left scale-[0.28]"
          loading="lazy"
        />
      ) : ehHtmlOuLink ? (
        <iframe
          src={previewUrl}
          className="pointer-events-none h-[320px] w-[380px] origin-top-left scale-[0.16]"
          loading="lazy"
          sandbox="allow-same-origin allow-scripts"
        />
      ) : ehOffice ? (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
          className="pointer-events-none h-[420px] w-[320px] origin-top-left scale-[0.2]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {iconePorTipo(mime, documento.tipo)}
        </div>
      )}
    </div>
  );
}
