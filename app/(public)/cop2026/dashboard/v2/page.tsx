import type { Metadata } from "next";
import { DashboardCopV2 } from "@/components/publico16/cop/v2/dashboard-cop-v2";
import { NavegacaoV2 } from "@/components/publico16/cop/v2/navegacao-v2";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026";
import { lerFiltros } from "@/lib/cop2026-metricas";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";

export const metadata: Metadata = {
  title: "Dashboard V2 (Prévia Executiva) · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardV2Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lancamentos, metas, erro, lidoEm }, sp, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    searchParams,
    exigirAcessoCop("/cop2026/dashboard"),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0b1222] to-[#060911] text-slate-100 selection:bg-ouro/30">
      <NavegacaoV2
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
      />

      <main className="pt-4 sm:pt-6">
        <DashboardCopV2
          lancamentos={lancamentos}
          metas={metas}
          lidoEm={lidoEm}
          erro={erro}
          filtrosIniciais={lerFiltros(sp)}
        />
      </main>

      <RodapeCop nota="Painel Executivo Provisório V2 — Desenvolvido para homologação de layout e tipografia." />
    </div>
  );
}
