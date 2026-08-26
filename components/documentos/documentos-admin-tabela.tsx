"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UploadCloud, Loader2, Link2, ExternalLink } from "lucide-react";
import { Card } from "@/components/command/ui";
import { cn } from "@/lib/utils";
import { SECOES_DOCUMENTOS, type SecaoDocumento } from "@/lib/secoes-documentos";
import type { DocumentoComVisibilidade } from "@/lib/db/documentos";
import { DocumentoPreview } from "@/components/documentos/documento-preview";

function formatarTamanho(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosAdminTabela({
  documentosIniciais,
}: {
  documentosIniciais: DocumentoComVisibilidade[];
}) {
  const router = useRouter();
  const [documentos, setDocumentos] = useState(documentosIniciais);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<Record<string, boolean>>({});
  const [, iniciarTransicao] = useTransition();
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [aba, setAba] = useState<"upload" | "link">("upload");
  const [nomeLink, setNomeLink] = useState("");
  const [urlLink, setUrlLink] = useState("");
  const [enviandoLink, setEnviandoLink] = useState(false);
  const [visualizando, setVisualizando] = useState<DocumentoComVisibilidade | null>(null);

  async function enviarLink() {
    if (!nomeLink.trim() || !urlLink.trim()) {
      setErro("Preencha nome e URL do link.");
      return;
    }
    setEnviandoLink(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/documentos-secoes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeExibicao: nomeLink.trim(), urlExterna: urlLink.trim() }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro ?? "Falha ao registrar link.");
      setDocumentos((atual) => [{ ...corpo.documento, secoes: [] }, ...atual]);
      setNomeLink("");
      setUrlLink("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar link.");
    } finally {
      setEnviandoLink(false);
    }
  }

  async function enviarArquivos(arquivos: FileList) {
    setEnviando(true);
    setErro(null);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const formData = new FormData();
        formData.append("arquivo", arquivo);
        const resposta = await fetch("/api/documentos-secoes/upload", {
          method: "POST",
          body: formData,
        });
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo.erro ?? "Falha ao enviar arquivo.");
        setDocumentos((atual) => [{ ...corpo.documento, secoes: [] }, ...atual]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar arquivo(s).");
    } finally {
      setEnviando(false);
      if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    }
  }

  async function alternarVisibilidade(documentoId: string, secao: SecaoDocumento, ativo: boolean) {
    const chave = `${documentoId}:${secao}`;
    setPendentes((p) => ({ ...p, [chave]: true }));
    setDocumentos((atual) =>
      atual.map((d) =>
        d.id === documentoId
          ? { ...d, secoes: ativo ? [...d.secoes, secao] : d.secoes.filter((s) => s !== secao) }
          : d
      )
    );
    try {
      const resposta = await fetch(`/api/documentos-secoes/${documentoId}/visibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secao, ativo }),
      });
      if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Falha ao salvar.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar visibilidade.");
      // reverte em caso de erro
      setDocumentos((atual) =>
        atual.map((d) =>
          d.id === documentoId
            ? { ...d, secoes: ativo ? d.secoes.filter((s) => s !== secao) : [...d.secoes, secao] }
            : d
        )
      );
    } finally {
      setPendentes((p) => {
        const { [chave]: _omitido, ...resto } = p;
        return resto;
      });
    }
  }

  async function excluir(documentoId: string) {
    if (!confirm("Excluir este documento? A ação não pode ser desfeita.")) return;
    setDocumentos((atual) => atual.filter((d) => d.id !== documentoId));
    try {
      const resposta = await fetch(`/api/documentos-secoes/${documentoId}`, { method: "DELETE" });
      if (!resposta.ok) throw new Error((await resposta.json()).erro ?? "Falha ao excluir.");
      iniciarTransicao(() => router.refresh());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir documento.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-0">
        <div className="flex border-b border-branco/10">
          <button
            onClick={() => setAba("upload")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors",
              aba === "upload" ? "border-b-2 border-azul text-branco" : "text-branco/40 hover:text-branco/70"
            )}
          >
            <UploadCloud size={13} /> Enviar arquivo
          </button>
          <button
            onClick={() => setAba("link")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors",
              aba === "link" ? "border-b-2 border-azul text-branco" : "text-branco/40 hover:text-branco/70"
            )}
          >
            <Link2 size={13} /> Link (Google Sheets)
          </button>
        </div>

        <div className="p-5">
          {aba === "upload" ? (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-branco/20 px-6 py-10 text-center transition-colors hover:bg-branco/5",
                enviando && "pointer-events-none opacity-60"
              )}
            >
              {enviando ? (
                <Loader2 size={22} className="animate-spin text-branco/50" />
              ) : (
                <UploadCloud size={22} className="text-branco/40" />
              )}
              <p className="text-sm font-medium text-branco/70">
                {enviando ? "Enviando..." : "Clique ou arraste arquivos aqui"}
              </p>
              <p className="text-[11px] text-branco/40">
                Envie os arquivos da pasta do Drive — depois escolha abaixo quem vê cada um
              </p>
              <input
                ref={inputArquivoRef}
                type="file"
                multiple
                className="hidden"
                disabled={enviando}
                onChange={(e) => e.target.files && enviarArquivos(e.target.files)}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-branco/40">
                Publique a planilha no Google Sheets (Arquivo → Compartilhar → Publicar na web) e cole
                aqui o link publicado — ele é exibido em prévia do mesmo jeito que um documento.
              </p>
              <input
                type="text"
                value={nomeLink}
                onChange={(e) => setNomeLink(e.target.value)}
                placeholder="Nome de exibição (ex.: Escala de serviço)"
                disabled={enviandoLink}
                className="rounded-md border border-branco/15 bg-transparent px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul"
              />
              <input
                type="url"
                value={urlLink}
                onChange={(e) => setUrlLink(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/e/.../pubhtml"
                disabled={enviandoLink}
                className="rounded-md border border-branco/15 bg-transparent px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul"
              />
              <button
                onClick={enviarLink}
                disabled={enviandoLink}
                className="flex items-center justify-center gap-1.5 self-start rounded-md bg-azul px-4 py-2 text-xs font-medium text-branco transition-colors hover:bg-azul/80 disabled:opacity-60"
              >
                {enviandoLink ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                {enviandoLink ? "Registrando..." : "Adicionar link"}
              </button>
            </div>
          )}
          {erro && <p className="mt-3 text-xs text-vermelho">{erro}</p>}
        </div>
      </Card>

      {documentos.length === 0 ? (
        <Card>
          <p className="text-sm text-branco/50">Nenhum documento enviado ainda.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-branco/10 text-left text-[10px] uppercase tracking-wide text-branco/40">
                <th className="p-3 font-semibold">Prévia</th>
                <th className="p-3 font-semibold">Documento</th>
                <th className="p-3 font-semibold">Tamanho</th>
                {SECOES_DOCUMENTOS.map((s) => (
                  <th key={s.valor} className="p-3 text-center font-semibold">
                    {s.rotulo}
                  </th>
                ))}
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id} className="border-b border-branco/5 last:border-0">
                  <td className="p-3">
                    <DocumentoPreview documento={doc} />
                  </td>
                  <td className="max-w-[220px] truncate p-3 font-medium text-branco/80" title={doc.nome_exibicao}>
                    {doc.tipo === "link" ? (
                      <button
                        onClick={() => setVisualizando(doc)}
                        className="flex items-center gap-1.5 text-left text-azul hover:underline"
                      >
                        <Link2 size={12} className="shrink-0" />
                        <span className="truncate">{doc.nome_exibicao}</span>
                      </button>
                    ) : (
                      doc.nome_exibicao
                    )}
                  </td>
                  <td className="p-3 text-branco/50">
                    {doc.tipo === "link" ? "Link externo" : formatarTamanho(doc.tamanho_bytes)}
                  </td>
                  {SECOES_DOCUMENTOS.map((s) => {
                    const ativo = doc.secoes.includes(s.valor);
                    const chave = `${doc.id}:${s.valor}`;
                    return (
                      <td key={s.valor} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={ativo}
                          disabled={pendentes[chave]}
                          onChange={(e) => alternarVisibilidade(doc.id, s.valor, e.target.checked)}
                          className="h-4 w-4 accent-azul"
                        />
                      </td>
                    );
                  })}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => excluir(doc.id)}
                      className="rounded p-1.5 text-branco/40 transition-colors hover:bg-vermelho/10 hover:text-vermelho"
                      title="Excluir documento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {visualizando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setVisualizando(null)}
        >
          <div
            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-branco/10 bg-preto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-branco/10 p-3">
              <span className="truncate text-sm font-medium text-branco/80">{visualizando.nome_exibicao}</span>
              <div className="flex items-center gap-2">
                <a
                  href={visualizando.url_externa ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded p-1.5 text-branco/40 transition-colors hover:bg-branco/10 hover:text-branco"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setVisualizando(null)}
                  className="rounded p-1.5 text-branco/40 transition-colors hover:bg-branco/10 hover:text-branco"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe src={visualizando.url_externa ?? undefined} className="flex-1 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
