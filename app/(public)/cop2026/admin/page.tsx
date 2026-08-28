import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, LogOut, Presentation } from "lucide-react";
import { adminsDaEnv } from "@/lib/cop2026-acesso";
import { exigirAdminCop, listarAutorizados } from "@/lib/db/cop2026-autorizados";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { PainelAutorizados } from "./painel-autorizados";

export const metadata: Metadata = {
  title: "Autorizados · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

// A lista é o estado que está valendo agora: nada de cache entre a revogação e
// a tela que a mostra.
export const dynamic = "force-dynamic";

export default async function AdminCopPage() {
  // Primeira linha, sempre: quem não é administrador leva 404 daqui.
  const admin = await exigirAdminCop();
  const { itens, origem, erro } = await listarAutorizados();

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      {/* Créditos da equipe: faixa do topo, antes do cabeçalho. */}
      <FaixaCreditos />

      <header className="border-b border-borda bg-tatico-super">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-5 py-4">
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
              <nav
                aria-label="Trilha de navegação"
                className="mt-0.5 flex items-center gap-1 text-[12px] text-texto-suave"
              >
                <Link href="/cop2026" className="hover:text-vermelho">
                  COP 2026
                </Link>
                <ChevronRight size={12} aria-hidden />
                <span className="font-semibold text-branco">Autorizados</span>
              </nav>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-texto-suave">
            <Link
              href="/cop2026/dashboard"
              className="inline-flex items-center gap-1.5 font-semibold hover:text-vermelho"
            >
              <LayoutDashboard size={13} aria-hidden /> Dashboard
            </Link>
            <Link
              href="/cop2026/briefing"
              className="inline-flex items-center gap-1.5 font-semibold hover:text-vermelho"
            >
              <Presentation size={13} aria-hidden /> Briefing
            </Link>
            <span className="inline-flex items-center gap-2">
              <span className="dados">{admin.email}</span>
              <a
                href="/api/cop2026/acesso/sair"
                className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 font-semibold hover:border-vermelho/40 hover:text-vermelho"
              >
                <LogOut size={12} aria-hidden /> Sair
              </a>
            </span>
          </div>
        </div>
        <div className="faixa-institucional h-1.5" />
      </header>

      <main>
        <PainelAutorizados
          itens={itens}
          origem={origem}
          erro={erro}
          admins={adminsDaEnv()}
          emailAtual={admin.email}
        />
      </main>

      <RodapeCop
        nota="Toda inclusão e revogação fica registrada na trilha de auditoria."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
