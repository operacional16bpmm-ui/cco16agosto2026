import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { cpasPendentes, listarCpas, resumoDaDimensao } from "@/lib/db/cop2026-unidade";
import { fonteCop2026 } from "@/lib/cop2026-leitura";
import { AbasAdmin, CabecalhoAdmin } from "../cabecalho-admin";
import { PainelUnidades } from "./painel-unidades";

export const metadata: Metadata = {
  title: "Unidades · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUnidadesPage() {
  const admin = await exigirAdminCop();

  const [cpas, pendentes, resumo] = await Promise.all([
    listarCpas(),
    cpasPendentes(),
    resumoDaDimensao(),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Unidades" email={admin.email} />
      <AbasAdmin atual="/cop2026/admin/unidades" />
      <PainelUnidades
        cpas={cpas}
        pendentes={pendentes}
        resumo={resumo}
        fonte={fonteCop2026()}
      />
      <RodapeCop />
    </div>
  );
}
