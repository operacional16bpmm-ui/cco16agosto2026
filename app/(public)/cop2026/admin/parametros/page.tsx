import type { Metadata } from "next";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { lerParametros, periodoDe } from "@/lib/db/cop2026-parametros";
import { fonteCop2026 } from "@/lib/cop2026-leitura";
import { janelaAtencaoDias } from "@/lib/cop2026-config-atencao";
import { hojeBrt } from "@/lib/cop2026-ciclo";
import { AbasAdmin, CabecalhoAdmin } from "../cabecalho-admin";
import { PainelParametros } from "./painel-parametros";

export const metadata: Metadata = {
  title: "Metas · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminParametrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await exigirAdminCop();
  const sp = await searchParams;
  const bruto = Array.isArray(sp.periodo) ? sp.periodo[0] : sp.periodo;
  const periodo = bruto && /^\d{4}-\d{2}$/.test(bruto) ? bruto : periodoDe(hojeBrt());

  const [parametros, janela] = await Promise.all([
    lerParametros(periodo),
    janelaAtencaoDias(),
  ]);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Metas" email={admin.email} />
      <AbasAdmin atual="/cop2026/admin/parametros" />

      <main>
        <PainelParametros
          periodo={periodo}
          itens={parametros}
          fonte={fonteCop2026()}
          janelaAtencaoDias={janela}
        />
      </main>

      <RodapeCop
        nota="A meta é decisão do Comando, gravada como veio da tela — não é recalculada a partir do efetivo."
        largura="max-w-[1100px]"
      />
    </div>
  );
}
