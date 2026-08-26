import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BriefingSlides } from "@/components/publico16/briefing-slides";
import { lerAuditoriaCop2026 } from "@/lib/cop2026";
import { COOKIE_ACESSO_COP, verificarAcesso } from "@/lib/cop2026-acesso";

export const metadata: Metadata = {
  title: "Briefing executivo · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

// Mesma razão da página da auditoria: a leitura da planilha é ao vivo e não
// pode acontecer no build.
export const dynamic = "force-dynamic";

export default async function BriefingPage() {
  const [{ lancamentos, metas, lidoEm }, biscoitos] = await Promise.all([
    lerAuditoriaCop2026(),
    cookies(),
  ]);
  const acesso = await verificarAcesso(biscoitos.get(COOKIE_ACESSO_COP)?.value);
  return (
    <BriefingSlides
      lancamentos={lancamentos}
      metas={metas}
      lidoEm={lidoEm}
      email={acesso?.email}
    />
  );
}
