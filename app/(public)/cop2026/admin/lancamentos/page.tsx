import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { identificadoresCompartilhados, listarParaManejo } from "@/lib/db/cop2026-lancamentos";
import { AbasAdmin, CabecalhoAdmin } from "../cabecalho-admin";
import { PainelLancamentos, type LinhaLancamento } from "./painel-lancamentos";

export const metadata: Metadata = {
  title: "Lançamentos · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLancamentosPage() {
  const admin = await exigirAdminCop();
  const [{ itens, erro }, compartilhados] = await Promise.all([
    listarParaManejo(),
    identificadoresCompartilhados(),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Lançamentos" email={admin.email} />
      <AbasAdmin atual="/cop2026/admin/lancamentos" />

      <main>
        <PainelLancamentos
          itens={itens as unknown as LinhaLancamento[]}
          erro={erro}
          compartilhados={compartilhados}
        />
      </main>

      <RodapeCop
        nota="Toda exclusão e reclassificação fica registrada na trilha, com valor anterior e posterior."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
