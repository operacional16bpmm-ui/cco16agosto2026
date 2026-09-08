import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, Lock } from "lucide-react";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { SeloMes } from "@/components/publico16/cop/arte-ciclo";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { estadoDoCiclo, hojeBrt } from "@/lib/cop2026-ciclo";
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

/**
 * O cartão tem três estados, não dois: publicado, EM CURSO e ainda futuro.
 *
 * O mês em curso costumava aparecer como "Em breve / Indisponível", igual a
 * dezembro — o que faz o cartão do mês que a tropa está lançando agora parecer
 * o mais morto da grade. Agora ele se identifica: medalha acesa, pastilha
 * pulsando e a data em que a consolidação sai.
 */
function CartaoMes({ mes, hoje }: { mes: RelatorioMes; hoje: string }) {
  const encerrado = periodoEncerrado(mes);
  const emCurso = !mes.disponivel && estadoDoCiclo(mes, hoje) === "em-curso";

  const conteudo = (
    <div
      className={
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 transition-all duration-300 " +
        (mes.disponivel
          ? "cursor-pointer border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-[#ca0202] hover:shadow-[0_16px_36px_rgba(202,2,2,0.22)]"
          : emCurso
            ? "border-[#ca0202]/45 bg-gradient-to-b from-white via-[#fff6f6] to-[#ffecec] shadow-[0_6px_20px_rgba(202,2,2,0.12)]"
            : "border-dashed border-slate-300/70 bg-slate-100/60")
      }
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          {/* Medalha do mês no lugar do ícone genérico: é a mesma peça que a
              faixa de virada usa em /cop2026, para que o mês tenha uma cara só
              no portal inteiro. Os meses ainda fechados continuam no cadeado —
              medalha é coisa de período que já aconteceu. */}
          {mes.disponivel || emCurso ? (
            <SeloMes
              abrev={mes.abrev}
              ano={mes.ano}
              estado={emCurso ? "em-curso" : encerrado ? "encerrado" : "aguardando"}
              tamanho={56}
              chave={`hub-${mes.chave}`}
              className="shrink-0 drop-shadow-[0_6px_14px_rgba(7,24,45,0.35)] transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400 shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
          )}

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
          ) : emCurso ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ca0202]/45 bg-[#ca0202]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#ca0202]">
              <span className="mc-dia-hoje h-1.5 w-1.5 rounded-full bg-[#ca0202]" />
              Meta em curso
            </span>
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
            : emCurso
              ? "Período aberto: a tropa está lançando agora. A consolidação é publicada quando o mês fechar."
              : "Consolidação disponível ao fim do período de serviço."}
        </p>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div
          className={
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-black uppercase tracking-wider transition-all duration-300 " +
            (mes.disponivel
              ? "bg-gradient-to-r from-[#ca0202] via-[#e40707] to-[#ca0202] text-white shadow-[0_6px_20px_rgba(202,2,2,0.35)] group-hover:shadow-[0_10px_26px_rgba(202,2,2,0.5)]"
              : emCurso
                ? "border border-[#ca0202]/35 bg-white text-[#ca0202]"
                : "bg-slate-200 text-slate-400")
          }
        >
          <span>
            {mes.disponivel ? "Abrir relatórios" : emCurso ? "Lançamento em andamento" : "Indisponível"}
          </span>
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
    identidadeCop(),
  ]);

  // Uma leitura só do relógio para a grade inteira: cinco cartões consultando
  // `new Date()` cada um podem cair em lados diferentes da meia-noite.
  const hoje = hojeBrt();

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
            <CartaoMes key={mes.chave} mes={mes} hoje={hoje} />
          ))}
        </div>
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
