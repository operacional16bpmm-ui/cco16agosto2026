import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { medirSaude } from "@/lib/cop2026-saude";
import { AbasAdmin, CabecalhoAdmin } from "../cabecalho-admin";
import { PainelSaude } from "./painel-saude";

export const metadata: Metadata = {
  title: "Saúde do sistema · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * SAÚDE DO SISTEMA — as invariantes do painel, com nome e próximo passo.
 *
 * A mesma medição que o vigia do pc2 consome de hora em hora
 * (`lib/cop2026-saude.ts`), aqui na tela de quem administra. O primeiro retrato
 * é renderizado no servidor — a página abre com número, não com esqueleto de
 * carregamento — e o cliente atualiza sozinho depois.
 */
export default async function AdminSaudePage() {
  const admin = await exigirAdminCop();
  const inicial = await medirSaude();

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Saúde" email={admin.email} />
      <AbasAdmin atual="/cop2026/admin/saude" />

      <main>
        <PainelSaude inicial={inicial} assistenteAtivo={Boolean(process.env.ANTHROPIC_API_KEY)} />
      </main>

      <RodapeCop
        nota="Diagnóstico interno. As invariantes desta tela são as mesmas que o vigia do Batalhão verifica de hora em hora."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
