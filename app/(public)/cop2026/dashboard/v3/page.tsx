import type { Metadata } from "next";
import { DashboardCop } from "@/components/publico16/cop/dashboard-cop";
import { NavegacaoCop } from "@/components/publico16/cop/navegacao-cop";
import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import { identificarSemana, lerFiltros } from "@/lib/cop2026-metricas";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { exigirAcessoCop } from "@/lib/db/cop2026-autorizados";

export const metadata: Metadata = {
  title: "Dashboard V3 (Caixa Tendência) · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * V3 — em avaliação pelo Comando.
 *
 * É o mesmo painel de controle, com a CAIXA TENDÊNCIA dentro do velocímetro no
 * lugar do cartão "Ritmo necessário", que exibia a constante 73. A diferença
 * vive na prop `tendencia`: sem ela — como em /cop2026/dashboard — nada muda.
 */
export default async function DashboardV3Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lancamentos, metas, erro, lidoEm }, sp, acesso] = await Promise.all([
    lerAuditoriaCop2026(),
    searchParams,
    exigirAcessoCop("/cop2026/dashboard/v3"),
  ]);

  /* Auditores DISTINTOS por quinzena e por fração — o Red Team pediu
     participação mínima do efetivo a cada quinzena, e esse recorte só existe
     nos lançamentos brutos: `LinhaFracao` guarda o total do mês. Semanas 1–2
     formam a 1ª quinzena; 3–4, a 2ª. */
  const distintos = new Map<string, [Set<string>, Set<string>]>();
  for (const l of lancamentos) {
    if (!l.auditou) continue;
    const identidade = (l.re || l.nomeGuerra || "").trim();
    if (!identidade) continue;
    const quinzena = identificarSemana(l.data) <= 2 ? 0 : 1;
    if (!distintos.has(l.subunidade)) distintos.set(l.subunidade, [new Set(), new Set()]);
    distintos.get(l.subunidade)![quinzena].add(identidade);
  }
  const auditoresPorQuinzena: Record<string, [number, number]> = {};
  for (const [chave, [q1, q2]] of distintos) auditoresPorQuinzena[chave] = [q1.size, q2.size];

  /* `?briefing=1` é o modo em que o Chromium headless de
     /api/cop2026/briefing-png abre esta página. Ele não é uma segunda versão do
     painel: é a MESMA árvore, com a moldura de navegação fora do caminho. É o
     que garante que o PNG nunca fique desatualizado em relação à tela — toda
     mudança aqui aparece no arquivo, sem manutenção paralela. */
  const modoBriefing = sp.briefing === "1";

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      {!modoBriefing && (
        <NavegacaoCop
          lidoEm={lidoEm}
          email={acesso?.email}
          ehAdmin={ehAdminCop(acesso?.email)}
          tituloPagina="Dashboard V3 — Caixa Tendência"
        />
      )}

      <main className={modoBriefing ? undefined : "pt-4 sm:pt-6"}>
        <DashboardCop
          lancamentos={lancamentos}
          metas={metas}
          lidoEm={lidoEm}
          erro={erro}
          filtrosIniciais={lerFiltros(sp)}
          tendencia
          auditoresPorQuinzena={auditoresPorQuinzena}
          modoBriefing={modoBriefing}
        />
      </main>

      {!modoBriefing && (
        <RodapeCop nota="Versão em avaliação (V3) — documento operacional, não distribuir fora do Batalhão." />
      )}
    </div>
  );
}
