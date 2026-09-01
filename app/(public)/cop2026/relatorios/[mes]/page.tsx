import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileBarChart2, Table2 } from "lucide-react";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";
import { relatorioPorChave, periodoEncerrado } from "@/lib/cop2026-relatorios";

export const metadata: Metadata = {
  title: "Relatórios do período · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export default async function RelatoriosMesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes: chave } = await params;
  const mes = relatorioPorChave(chave);
  // Mês inexistente ou ainda não liberado (Set–Dez): 404, não uma casca vazia.
  if (!mes || !mes.disponivel) notFound();

  const [{ lidoEm }, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    exigirAcessoCop(`/cop2026/relatorios/${chave}`),
  ]);

  const encerrado = periodoEncerrado(mes);

  const cards = [
    {
      href: `/cop2026/relatorios/${chave}/analitico`,
      icone: <FileBarChart2 className="h-7 w-7 text-white" />,
      titulo: "Relatório Executivo Analítico",
      descricao:
        "Consolidação completa do período: cumprimento da meta por fração, evolução semanal, qualidade das evidências, controle estatístico e apontamentos nominais de desvio.",
      botao: "Abrir relatório executivo",
    },
    {
      href: `/cop2026/relatorios/${chave}/dados`,
      icone: <Table2 className="h-7 w-7 text-white" />,
      titulo: "Relatório de Dados",
      descricao:
        "Base detalhada para quem quer aprofundar: planilha manuseável, abertura direta no Google Sheets e exportação em CSV das respostas e do consolidado por auditor.",
      botao: "Abrir dados detalhados",
    },
  ];

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <NavegacaoCop
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
        tituloPagina={`Relatórios · ${mes.rotulo}`}
      />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <Link
          href="/cop2026/relatorios"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-texto-suave transition-colors hover:text-vermelho"
        >
          <ArrowLeft className="h-4 w-4" /> Todos os meses
        </Link>

        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-black uppercase tracking-wide text-branco sm:text-4xl">
              {mes.rotulo} · {mes.ano}
            </h1>
            <span
              className={
                "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide " +
                (encerrado
                  ? "border-slate-400/40 bg-slate-500/10 text-texto-suave"
                  : "border-[#ca0202]/50 bg-[#ca0202]/10 text-vermelho")
              }
            >
              {encerrado ? "Período encerrado" : "Encerra hoje 23h59"}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-texto-suave">
            Dois relatórios do período — a leitura executiva consolidada e o acesso aos dados
            detalhados para conferência.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] p-6 shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ca0202] hover:shadow-[0_16px_36px_rgba(202,2,2,0.22)]"
            >
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-red-400/40 bg-[#ca0202] shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {c.icone}
                </div>
                <h2 className="mt-5 font-serif text-xl font-black uppercase leading-snug tracking-wide text-[#07182d]">
                  {c.titulo}
                </h2>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#15304c]/75">
                  {c.descricao}
                </p>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ca0202] via-[#e40707] to-[#ca0202] py-3 px-4 text-sm font-black uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(202,2,2,0.35)] transition-all duration-300 group-hover:shadow-[0_10px_26px_rgba(202,2,2,0.5)]">
                  <span>{c.botao}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
