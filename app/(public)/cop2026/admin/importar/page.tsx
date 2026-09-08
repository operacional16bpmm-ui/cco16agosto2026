import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { fonteCop2026 } from "@/lib/cop2026-leitura";
import { totaisPorMes } from "@/lib/db/cop2026-lancamentos";
import { CabecalhoAdmin } from "../cabecalho-admin";
import { PainelImportacao } from "./painel-importacao";

export const metadata: Metadata = {
  title: "Importar planilha · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
/** A importação de um mês inteiro faz ~100 inserções em série. Sem teto
 *  explícito a rota herdaria o default da plataforma e cortaria no meio. */
export const maxDuration = 60;

export default async function AdminImportarPage() {
  const admin = await exigirAdminCop();
  const porMes = await totaisPorMes();

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Importar" email={admin.email} />

      <main>
        <PainelImportacao fonte={fonteCop2026()} porMes={porMes} />
      </main>

      <RodapeCop
        nota="Reimportar não duplica: o hash da linha crua é único. O contador “já existiam” é a prova de que o banco está em dia com a planilha."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
