import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { facetasDaTrilha, lerTrilha } from "@/lib/db/cop2026-trilha";
import { AbasAdmin, CabecalhoAdmin } from "../cabecalho-admin";
import { PainelTrilha } from "./painel-trilha";

export const metadata: Metadata = {
  title: "Trilha · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Só um valor de query string, e só se for do formato esperado. */
function texto(v: string | string[] | undefined, max = 80): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const limpo = (s ?? "").trim();
  return limpo && limpo.length <= max ? limpo : undefined;
}

export default async function AdminTrilhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await exigirAdminCop();
  const sp = await searchParams;

  const filtro = {
    operador: texto(sp.operador),
    tabela: texto(sp.tabela),
    operacao: texto(sp.operacao),
  };

  const [eventos, facetas] = await Promise.all([
    lerTrilha({ ...filtro, limite: 100 }),
    facetasDaTrilha(),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Trilha" email={admin.email} />
      <AbasAdmin atual="/cop2026/admin/trilha" />
      <PainelTrilha eventos={eventos} facetas={facetas} filtro={filtro} />
      <RodapeCop />
    </div>
  );
}
