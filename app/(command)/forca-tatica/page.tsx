import { Swords, CalendarCheck, Users2 } from "lucide-react";
import { Card } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { KpiStrip } from "@/components/command/secao/kpi-strip";
import { SerieMensalChart, RankingBar } from "@/components/command/secao/charts";
import {
  getSecaoDashboard,
  totalIndicador,
  deltaMesAnterior,
  anosDisponiveis,
  rankingDimensao,
} from "@/lib/db/secao";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Força Tática · CCO-16" };
export const dynamic = "force-dynamic";

const INDICADORES_KPI = [
  { chave: "efetivo_total", rotulo: "Efetivo na FT", icon: Users2 },
  { chave: "dias_empregados", rotulo: "Dias de emprego/mês", icon: CalendarCheck },
  { chave: "ferias_concedidas", rotulo: "Em férias no mês", icon: CalendarCheck },
];

export default async function ForcaTaticaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsCru>;
}) {
  await exigirPagina("/forca-tatica");
  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const { fatos, dimensionais, arquivosFonte, temDados } = await getSecaoDashboard("ft");

  const anos = anosDisponiveis(fatos);

  const mesesBtl = fatos
    .filter((f) => (f.cia == null || f.cia === 0) && !f.eh_anual && f.mes != null)
    .map((f) => ({ ano: f.ano, mes: f.mes as number }));
  const maisRecente = [...mesesBtl].sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes))[0];
  const anoRef = filtro.ano ?? maisRecente?.ano;
  const mesRef = filtro.mes ?? maisRecente?.mes;

  // efetivo_total e ferias_concedidas são snapshots ANUAIS (eh_anual=true) —
  // só dias_empregados é mensal. Cada indicador busca no recorte que faz
  // sentido para ele, não um único {ano,mes} para os três.
  const INDICADORES_ANUAIS = new Set(["efetivo_total", "ferias_concedidas"]);
  const kpis = INDICADORES_KPI.map(({ chave, rotulo, icon }) => {
    const anual = INDICADORES_ANUAIS.has(chave);
    const valor =
      anoRef != null && (anual || mesRef != null)
        ? totalIndicador(fatos, chave, anual ? { ano: anoRef } : { ano: anoRef, mes: mesRef })
        : null;
    const deltaPct = !anual && anoRef != null && mesRef != null ? deltaMesAnterior(fatos, chave, anoRef, mesRef) : null;
    return {
      icon,
      rotulo,
      valor,
      deltaPct,
      nota: anual ? (anoRef ? String(anoRef) : undefined) : anoRef != null && mesRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : undefined,
    };
  });

  const serieEfetivoPorAno = fatos
    .filter((f) => f.indicador === "efetivo_total" && f.eh_anual)
    .map((f) => ({ chave: String(f.ano), efetivo: Number(f.valor) }))
    .sort((a, b) => Number(a.chave) - Number(b.chave));
  const porPeloton = rankingDimensao(dimensionais, "efetivo", "pelotao", 8);

  return (
    <SecaoShell
      titulo="Força Tática"
      descricao="Efetivo, escalas de emprego e férias da Companhia de Força Tática — série mensal e ranking por pelotão."
      basePath="/forca-tatica"
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={temDados}
      arquivosFonte={arquivosFonte}
    >
      <KpiStrip items={kpis} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Efetivo — série anual</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">16º BPM/M · Cia FT</p>
          {serieEfetivoPorAno.length > 0 ? (
            <SerieMensalChart
              data={serieEfetivoPorAno}
              series={[{ key: "efetivo", nome: "Efetivo", cor: "#305388" }]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série anual para este recorte.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Efetivo por Pelotão</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Recorte mais recente disponível</p>
          {porPeloton.length > 0 ? (
            <RankingBar data={porPeloton} cor="#d53441" />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem dado por pelotão.</p>
          )}
        </Card>
      </div>

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <div className="flex items-start gap-3">
          <Swords size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed text-branco/70">
            Fonte: Z:\16BPMM_FT\Matriz FT — efetivo atualizado, plano de férias, escalas mensais e folha de
            caráter geral por pelotão. Frota de viaturas da FT segue em <span className="font-semibold">/logistica</span>
            {" "}(tabela public.viaturas, tipo = força tática), sem duplicar aqui.
          </p>
        </div>
      </Card>

      <ListaDocumentosSecao secao="forca_tatica" />
    </SecaoShell>
  );
}
