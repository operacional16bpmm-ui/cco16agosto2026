import type { Metadata } from "next";
import { DashboardCop } from "@/components/publico16/cop/dashboard-cop";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026";
import { lerFiltros } from "@/lib/cop2026-metricas";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";

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
  const [{ lancamentos, metas, erro, lidoEm }, sp, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    searchParams,
    exigirAcessoCop("/cop2026/dashboard"),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <NavegacaoCop
        lidoEm={lidoEm}
        email={acesso?.email}
        ehAdmin={ehAdminCop(acesso?.email)}
        tituloPagina="Dashboard de controle"
      />

      <main className="pt-4 sm:pt-6">
        <DashboardCop
          lancamentos={lancamentos}
          metas={metas}
          lidoEm={lidoEm}
          erro={erro}
          filtrosIniciais={lerFiltros(sp)}
        />
      </main>

      <RodapeCop nota="Documento operacional — não distribuir fora do Batalhão." />
    </div>
  );
}
