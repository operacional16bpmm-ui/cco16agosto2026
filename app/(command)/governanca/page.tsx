import { Target, ScrollText, Gauge } from "lucide-react";
import { Card } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { KpiStrip } from "@/components/command/secao/kpi-strip";
import { RankingBar } from "@/components/command/secao/charts";
import { getSecaoDashboard, totalIndicador, anosDisponiveis, rankingDimensao } from "@/lib/db/secao";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Governança · CCO-16" };
export const dynamic = "force-dynamic";

/** Ranking pelo valor mais recente de cada `dimensao` (não pela chave em si
 * — aqui `dimensao` é o NOME do indicador de qualidade/objetivo, e `chave` é
 * o período YYYY-MM; cada indicador entra 1x, com seu valor mais atual). */
function porIndicadorMaisRecente(
  dimensionais: { fonte: string; dimensao: string; chave: string; valor: number }[],
  fonte: string,
  topN = 8
): { chave: string; valor: number }[] {
  const porDimensao = new Map<string, { chave: string; valor: number }>();
  for (const d of dimensionais) {
    if (d.fonte !== fonte) continue;
    const atual = porDimensao.get(d.dimensao);
    if (!atual || d.chave > atual.chave) porDimensao.set(d.dimensao, { chave: d.chave, valor: Number(d.valor) });
  }
  return Array.from(porDimensao.entries())
    .map(([dimensao, v]) => ({ chave: dimensao.replace(/_/g, " ").slice(0, 40), valor: v.valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, topN);
}

export default async function GovernancaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsCru>;
}) {
  await exigirPagina("/governanca");
  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const { fatos, dimensionais, arquivosFonte, temDados } = await getSecaoDashboard("governanca");

  // Todo indicador aqui é snapshot anual (eh_anual=true) ou vive só em
  // agregado_dimensional — não há série mensal em fato_secao para escolher
  // "mês mais recente"; o recorte é só por ano.
  const anos = anosDisponiveis(fatos);
  const anoRef = filtro.ano ?? anos[0];

  const objetivosMonitorados = new Set(
    dimensionais.filter((d) => d.fonte === "objetivos_estrategicos").map((d) => d.chave)
  ).size;
  const indicadoresQualidadeMonitorados = new Set(
    dimensionais.filter((d) => d.fonte === "indicadores_qualidade_cpam5").map((d) => d.dimensao)
  ).size;
  const normativosVigentes = anoRef != null ? totalIndicador(fatos, "normativos_vigentes", { ano: anoRef }) : null;

  const kpis = [
    { icon: Target, rotulo: "Objetivos estratégicos monitorados", valor: objetivosMonitorados || null, nota: "Trimestral (P5)" },
    { icon: Gauge, rotulo: "Indicadores de qualidade monitorados", valor: indicadoresQualidadeMonitorados || null, nota: "CPA/M-5 (P4)" },
    { icon: ScrollText, rotulo: "Normativos/catálogos vigentes", valor: normativosVigentes, nota: anoRef ? String(anoRef) : undefined },
  ];

  const porQualidade = porIndicadorMaisRecente(dimensionais, "indicadores_qualidade_cpam5", 8);
  const porObjetivo = rankingDimensao(dimensionais, "objetivos_estrategicos", "objetivo_estrategico", 8);

  return (
    <SecaoShell
      titulo="Governança"
      descricao="Objetivos estratégicos trimestrais (P5), indicadores de qualidade e instrumento de medição de resultados (P4), e normativos/catálogos de integração vigentes."
      basePath="/governanca"
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={temDados}
      arquivosFonte={arquivosFonte}
    >
      <KpiStrip items={kpis} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Indicadores de Qualidade — valor mais recente</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            CPA/M-5 (P4) · top 8 por valor, período mais atual de cada
          </p>
          {porQualidade.length > 0 ? (
            <RankingBar data={porQualidade} cor="#305388" />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem dado de qualidade.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Objetivos Estratégicos</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Trimestral (P5) · valor mais recente</p>
          {porObjetivo.length > 0 ? (
            <RankingBar data={porObjetivo} cor="#d53441" />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem dado por objetivo.</p>
          )}
        </Card>
      </div>

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <div className="flex items-start gap-3">
          <Target size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed text-branco/70">
            Fonte: TRIMESTREAL - Indicadores dos Objetivos Estratégicos (P5), INDICADORES DA QUALIDADE e
            Instrumento_de_Medicao_de_Resultados (P4), Plano de Comando 2024-2031, normative_items e
            integration_catalog do próprio portal.
          </p>
        </div>
      </Card>
    </SecaoShell>
  );
}
