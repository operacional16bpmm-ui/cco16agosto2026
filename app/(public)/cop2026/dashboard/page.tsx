import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight, Clock, FileText, LogOut } from "lucide-react";
import { DashboardCop } from "@/components/publico16/cop/dashboard-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026";
import { lerFiltros } from "@/lib/cop2026-metricas";
import { COOKIE_ACESSO_COP, verificarAcesso } from "@/lib/cop2026-acesso";

export const metadata: Metadata = {
  title: "Dashboard de controle · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

// A leitura da planilha estoura os 60s do prerender e derrubava o deploy; e o
// recorte chega por query string. As duas razões pedem render por requisição.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lancamentos, metas, erro, lidoEm }, sp, biscoitos] = await Promise.all([
    lerAuditoriaCop2026(),
    searchParams,
    cookies(),
  ]);
  /* O proxy já barrou quem não tem acesso; aqui a sessão serve só para a
     página dizer QUEM está vendo — em tela de Comando, saber sob qual conta o
     dado foi aberto é parte da trilha. */
  const acesso = await verificarAcesso(biscoitos.get(COOKIE_ACESSO_COP)?.value);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <header className="border-b border-borda bg-tatico-super">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/16bpmm.png"
              alt="Brasão do 16º BPM/M"
              width={56}
              height={56}
              className="h-12 w-auto"
              priority
            />
            <div>
              <p className="font-serif text-lg font-bold uppercase leading-tight tracking-wide text-branco sm:text-xl">
                16º BPM/M · Auditoria de COP 2026
              </p>
              <nav aria-label="Trilha de navegação" className="mt-0.5 flex items-center gap-1 text-[12px] text-texto-suave">
                <Link href="/cop2026" className="hover:text-vermelho">
                  COP 2026
                </Link>
                <ChevronRight size={12} aria-hidden />
                <span className="font-semibold text-branco">Dashboard de controle</span>
              </nav>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-texto-suave">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sinal-conforme animar-ao-vivo" aria-hidden />
              <Clock size={13} aria-hidden /> Leitura de {lidoEm}
            </span>
            <a
              href="/documentos/diretriz-pm3-001-02-25.pdf"
              className="inline-flex items-center gap-1.5 hover:text-vermelho"
            >
              <FileText size={13} aria-hidden /> Diretriz PM3-001/02/25
            </a>
            {acesso && (
              <span className="nao-imprime inline-flex items-center gap-2">
                <span className="dados">{acesso.email}</span>
                <a
                  href="/api/cop2026/acesso/sair"
                  className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 font-semibold hover:border-vermelho/40 hover:text-vermelho"
                >
                  <LogOut size={12} aria-hidden /> Sair
                </a>
              </span>
            )}
          </div>
        </div>
        <div className="faixa-institucional h-1.5" />
      </header>

      <main className="pt-6">
        <DashboardCop
          lancamentos={lancamentos}
          metas={metas}
          lidoEm={lidoEm}
          erro={erro}
          filtrosIniciais={lerFiltros(sp)}
        />
      </main>

      <footer className="border-t border-borda bg-tatico-super">
        <div className="faixa-institucional h-1" />
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-5 py-4 text-[11.5px] text-texto-suave">
          <span>Portal CCO-16 · 16º BPM/M · uso restrito</span>
          <span>Documento operacional — não distribuir fora do Batalhão.</span>
        </div>
      </footer>
    </div>
  );
}
