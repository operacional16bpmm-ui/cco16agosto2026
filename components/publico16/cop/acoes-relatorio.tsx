"use client";

import { Download, Printer } from "lucide-react";

/**
 * Ações do relatório: imprimir / salvar em PDF (via diálogo do navegador) e
 * baixar os CSV já montados no servidor. Marcadas com `nao-imprime` para não
 * aparecerem na versão impressa. Sem dependência de toast: a página do
 * relatório não monta o provedor de notificações.
 */
function baixar(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function AcoesRelatorio({
  nomeBase,
  csvRespostas,
  csvAuditores,
}: {
  nomeBase: string;
  csvRespostas: string;
  csvAuditores: string;
}) {
  const botao =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-semibold text-[#15304c] transition-colors hover:border-[#ca0202]/50 hover:text-[#ca0202]";
  return (
    <div className="nao-imprime flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => window.print()} className={botao}>
        <Printer className="h-4 w-4" /> Imprimir / PDF
      </button>
      <button
        type="button"
        onClick={() => baixar(`${nomeBase}-respostas.csv`, csvRespostas)}
        className={botao}
      >
        <Download className="h-4 w-4" /> CSV das respostas
      </button>
      <button
        type="button"
        onClick={() => baixar(`${nomeBase}-auditores.csv`, csvAuditores)}
        className={botao}
      >
        <Download className="h-4 w-4" /> CSV por auditor
      </button>
    </div>
  );
}
