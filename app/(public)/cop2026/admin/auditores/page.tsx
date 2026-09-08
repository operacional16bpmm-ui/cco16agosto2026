import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { exigeVinculoConfirmado, listarVinculos } from "@/lib/db/cop2026-auditor";
import { CabecalhoAdmin } from "../cabecalho-admin";
import { FilaVinculos } from "./fila-vinculos";

export const metadata: Metadata = {
  title: "Auditores · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Fila de confirmação do vínculo conta Google ↔ RE (C-3).
 *
 * O RE não é segredo: está no crachá e na escala. Sem confirmação, um vínculo
 * auto-declarado permite tomar o RE do colega, imputar lixo a um desafeto ou
 * lançar de um e-mail descartável.
 */
export default async function AdminAuditoresPage() {
  const admin = await exigirAdminCop();
  const { itens, erro } = await listarVinculos();

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Auditores" email={admin.email} />

      <main>
        <FilaVinculos itens={itens} erro={erro} exigindo={exigeVinculoConfirmado()} />
      </main>

      <RodapeCop
        nota="O vínculo confirmado é imutável pelo usuário: trocar o RE de uma conta é ação de administrador."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
