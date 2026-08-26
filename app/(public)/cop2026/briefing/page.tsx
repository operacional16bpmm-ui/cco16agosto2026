import type { Metadata } from "next";
import { BriefingSlides } from "@/components/publico16/briefing-slides";
import { lerAuditoriaCop2026 } from "@/lib/cop2026";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";

export const metadata: Metadata = {
  title: "Briefing executivo · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

// Mesma razão da página da auditoria: a leitura da planilha é ao vivo e não
// pode acontecer no build.
export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  // Gate próprio, como no dashboard: exigirAcessoCop recheca a lista no banco
  // a cada requisição, então revogar alguém derruba o briefing dele na hora.
  const [{ lancamentos, metas, lidoEm }, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    exigirAcessoCop("/cop2026/briefing"),
  ]);
  return (
    <BriefingSlides
      lancamentos={lancamentos}
      metas={metas}
      lidoEm={lidoEm}
      email={acesso.email}
      ehAdmin={ehAdminCop(acesso.email)}
    />
  );
}
