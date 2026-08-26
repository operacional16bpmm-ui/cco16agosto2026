"use client";

import { useActionState, useEffect, useState } from "react";
import { FileText, Trash2, Download } from "lucide-react";
import { Card, Badge } from "@/components/command/ui";
import { excluirEscalaAction, type EscalaState } from "./actions";
import type { Unidade } from "@/lib/unidades";
import type { Documento } from "@/lib/db/documentos";

const inicial: EscalaState = { ok: false, error: null };

/** Card de uma escala enviada: prévia em tamanho real (imagem ou PDF embutido),
 * data de referência e exclusão pelo próprio comandante que lançou. */
export function CartaoEscala({
  documento,
  unidade,
  podeExcluir,
}: {
  documento: Documento;
  unidade: Unidade;
  podeExcluir: boolean;
}) {
  const [state, action] = useActionState(excluirEscalaAction, inicial);
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/documentos-secoes/${documento.id}/preview-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((corpo) => {
        if (!cancelado) setUrl(corpo.url);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
  }, [documento.id]);

  const ehImagem = documento.tipo_mime?.startsWith("image/");
  const dataRef = documento.data_referencia
    ? new Date(`${documento.data_referencia}T00:00:00`).toLocaleDateString("pt-BR")
    : null;

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-branco">{documento.nome_exibicao}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-branco/45">
            {dataRef && <Badge tone="informative">{dataRef}</Badge>}
            <span>Enviado {new Date(documento.criado_em).toLocaleString("pt-BR")}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={`/api/documentos-secoes/${documento.id}/download`}
            className="rounded-md p-1.5 text-branco/40 transition-colors hover:bg-branco/5 hover:text-branco"
            title="Baixar"
          >
            <Download size={15} />
          </a>
          {podeExcluir && (
            <form action={action}>
              <input type="hidden" name="unidade" value={unidade} />
              <input type="hidden" name="id" value={documento.id} />
              <button
                type="submit"
                className="rounded-md p-1.5 text-branco/40 transition-colors hover:bg-vermelho/10 hover:text-vermelho"
                title="Excluir"
              >
                <Trash2 size={15} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-branco/10 bg-black/20">
        {erro || !url ? (
          <div className="flex h-56 items-center justify-center text-branco/25">
            <FileText size={28} />
          </div>
        ) : ehImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={documento.nome_exibicao} className="max-h-[32rem] w-full object-contain" />
        ) : (
          <iframe src={`${url}#toolbar=0`} className="h-[32rem] w-full" loading="lazy" />
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-1.5 text-xs text-vermelho">
          {state.error}
        </p>
      )}
    </Card>
  );
}
