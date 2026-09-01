import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, FileBarChart2, Lock } from "lucide-react";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";
import {
  RELATORIOS_MENSAIS,
  periodoEncerrado,
  type RelatorioMes,
} from "@/lib/cop2026-relatorios";

export const metadata: Metadata = {
  title: "Relatórios mensais · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function CartaoMes({ mes }: { mes: RelatorioMes }) {
  const encerrado = periodoEncerrado(mes);

  const conteudo = (
    <div
      className={
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 transition-all duration-300 " +
        (mes.disponivel
          ? "cursor-pointer border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-[#ca0202] hover:shadow-[0_16px_36px_rgba(202,2,2,0.22)]"
          : "border-dashed border-slate-300/70 bg-slate-100/60")
      }
    >
      <div>
        <div className="flex items-center justify-between">
          <div
            className={
              "flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 " +
              (mes.disponivel
                ? "border-red-400/40 bg-[#ca0202] text-white group-hover:scale-110"
                : "border-slate-300 bg-white text-slate-400")
            }
          >
            {mes.disponivel ? (
              <FileBarChart2 className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          {mes.disponivel ? (
            encerrado ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Período encerrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ca0202]/40 bg-[#ca0202]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#ca0202]">
                <CalendarClock className="h-3 w-3" /> Encerra hoje 23h59
              </span>
            )
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Em breve
            </span>
          )}
        </div>

        <span className="mt-5 block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#ca0202]">
          {mes.abrev} · {mes.ano}
        </span>
        <h3 className="mt-1 font-serif text-2xl font-black uppercase tracking-wide text-[#07182d]">
          {mes.rotulo}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#15304c]/70">
          {mes.disponivel
            ? "Relatório executivo analítico e planilha de dados do período."
            : "Consolidação disponível ao fim do período de serviço."}
        </p>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div
          className={
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-black uppercase tracking-wider transition-all duration-300 " +
            (mes.disponivel
              ? "bg-gradient-to-r from-[#ca0202] via-[#e40707] to-[#ca0202] text-white shadow-[0_6px_20px_rgba(202,2,2,0.35)] group-hover:shadow-[0_10px_26px_rgba(202,2,2,0.5)]"
              : "bg-slate-200 text-slate-400")
          }
        >
          <span>{mes.disponivel ? "Abrir relatórios" : "Indisponível"}</span>
          {mes.disponivel && (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </div>
    </div>
  );

  if (!mes.disponivel) {
    return (
      <div aria-disabled className="h-full opacity-70">
        {conteudo}
      </div>
    );
  }

  return (
    <Link href={`/cop2026/relatorios/${mes.chave}`} className="block h-full">
      {conteudo}
    </Link>
  );
}

export default async function RelatoriosPage() {
  const [{ lidoEm }, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    exigirAcessoCop("/cop2026/relatorios"),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <NavegacaoCop
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
        tituloPagina="Relatórios mensais"
      />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1.5 rounded-full bg-vermelho" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ca0202]">
              Auditoria e Governança · 16º BPM/M
            </span>
          </div>
          <h1 className="mt-1.5 font-serif text-3xl font-black uppercase tracking-wide text-branco sm:text-4xl">
            Relatórios da Auditoria de COP
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-texto-suave">
            Relatórios consolidados por período do controle e fiscalização do uso das câmeras
            operacionais corporais (Diretriz PM3-001/02/25). Cada mês reúne o relatório executivo
            analítico e o acesso aos dados detalhados.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RELATORIOS_MENSAIS.map((mes) => (
            <CartaoMes key={mes.chave} mes={mes} />
          ))}
        </div>
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
