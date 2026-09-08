import type { Metadata } from "next";
import { adminsDaEnv } from "@/lib/cop2026-acesso";
import { exigirAdminCop, listarAutorizados } from "@/lib/db/cop2026-autorizados";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { PainelAutorizados } from "./painel-autorizados";
import { CabecalhoAdmin } from "./cabecalho-admin";

export const metadata: Metadata = {
  title: "Autorizados · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

// A lista é o estado que está valendo agora: nada de cache entre a revogação e
// a tela que a mostra.
export const dynamic = "force-dynamic";

export default async function AdminCopPage() {
  // Primeira linha, sempre: quem não é administrador leva 404 daqui.
  const admin = await exigirAdminCop();
  const { itens, origem, erro } = await listarAutorizados();

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      {/* Créditos da equipe: faixa do topo, antes do cabeçalho. */}
      <FaixaCreditos />

      <CabecalhoAdmin secao="Autorizados" email={admin.email} />


      <main>
        <PainelAutorizados
          itens={itens}
          origem={origem}
          erro={erro}
          admins={adminsDaEnv()}
          emailAtual={admin.email}
        />
      </main>

      <RodapeCop
        nota="Toda inclusão e revogação fica registrada na trilha de auditoria."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
