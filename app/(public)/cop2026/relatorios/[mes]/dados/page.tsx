import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Table2 } from "lucide-react";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { AcoesRelatorio } from "@/components/publico16/cop/acoes-relatorio";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { URL_PLANILHA } from "@/lib/cop2026";
import {
  FILTROS_VAZIOS,
  calcularPainel,
  lancamentosParaCsv,
  auditoresParaCsv,
  FMT,
} from "@/lib/cop2026-metricas";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";
import { relatorioPorChave, URL_PLANILHA_EMBED } from "@/lib/cop2026-relatorios";

export const metadata: Metadata = {
  title: "Relatório de dados · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export default async function RelatorioDadosPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes: chave } = await params;
  const mes = relatorioPorChave(chave);
  if (!mes || !mes.disponivel) notFound();

  const [{ lancamentos, metas, lidoEm }, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    exigirAcessoCop(`/cop2026/relatorios/${chave}/dados`),
  ]);

  const painel = calcularPainel(lancamentos, metas, {
    ...FILTROS_VAZIOS,
    de: mes.periodo.de,
    ate: mes.periodo.ate,
  });

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <NavegacaoCop
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
        tituloPagina={`Relatório de dados · ${mes.rotulo}`}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Link
          href={`/cop2026/relatorios/${chave}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-texto-suave transition-colors hover:text-vermelho"
        >
          <ArrowLeft className="h-4 w-4" /> Relatórios de {mes.rotulo}
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#ca0202]">
              Dados detalhados · {mes.rotulo} {mes.ano}
            </span>
            <h1 className="mt-1 font-serif text-2xl font-black uppercase tracking-wide text-branco sm:text-3xl">
              Relatório de Dados
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-texto-suave">
              A base completa das respostas para quem quer manusear os dados: a planilha oficial
              logo abaixo, abertura direta no Google Sheets e exportação em CSV do período
              ({FMT.format(painel.dados.length)} lançamento(s)).
            </p>
          </div>
        </div>

        {/* Ações: abrir no Sheets + baixar CSVs */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-tatico-super p-4">
          <a
            href={URL_PLANILHA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#ca0202] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(202,2,2,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#e40707]"
          >
            <ExternalLink className="h-4 w-4" /> Abrir e manusear no Google Sheets
          </a>
          <AcoesRelatorio
            nomeBase={`relatorio-cop-2026-${mes.chave}`}
            csvRespostas={lancamentosParaCsv(painel.dados)}
            csvAuditores={auditoresParaCsv(painel.auditoresLinhas)}
          />
        </div>

        {/* Planilha publicada (somente leitura) embutida */}
        <div className="overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#f4f7fa] px-4 py-2.5 text-[12.5px] font-bold text-[#15304c]">
            <Table2 className="h-4 w-4 text-[#ca0202]" />
            Planilha oficial de respostas — visualização somente leitura
          </div>
          <iframe
            src={URL_PLANILHA_EMBED}
            title={`Planilha de respostas da Auditoria de COP — ${mes.rotulo}`}
            className="h-[70vh] w-full bg-white"
            loading="lazy"
          />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-texto-suave">
          A visualização acima é somente leitura. Para editar, filtrar ou aplicar fórmulas, use
          &quot;Abrir e manusear no Google Sheets&quot; — o acesso à edição segue a lista de
          compartilhamento da planilha oficial.
        </p>
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
