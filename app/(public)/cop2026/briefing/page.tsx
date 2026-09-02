import type { Metadata } from "next";
import { BriefingSlides } from "@/components/publico16/briefing-slides";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";
import { mesCorrente } from "@/lib/cop2026-relatorios";

/**
 * Como no dashboard, o mês sai de `mesCorrente()` e não de constante: este
 * mesmo link tem que dizer "Outubro" em 1º de outubro, sem deploy. Título
 * cravado é título que mente no mês seguinte — e quem lê o print é o Comando.
 */
export async function generateMetadata(): Promise<Metadata> {
  const mes = mesCorrente();
  return {
    title: mes
      ? `Briefing de ${mes.rotulo} · Auditoria de COP 2026`
      : "Briefing executivo · Auditoria de COP 2026",
    robots: { index: false, follow: false },
  };
}

// Mesma razão da página da auditoria: a leitura da planilha é ao vivo e não
// pode acontecer no build.
export const dynamic = "force-dynamic";
export const maxDuration = 20;

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
      mes={mesCorrente() ?? null}
    />
  );
}
