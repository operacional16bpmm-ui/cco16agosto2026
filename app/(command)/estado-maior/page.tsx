import { Building2, CalendarClock, FileStack } from "lucide-react";
import { Card } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { KpiStrip } from "@/components/command/secao/kpi-strip";
import { SerieMensalChart, RankingBar } from "@/components/command/secao/charts";
import {
  getSecaoDashboard,
  totalIndicador,
  serieMensal,
  deltaMesAnterior,
  anosDisponiveis,
  rankingDimensao,
} from "@/lib/db/secao";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Estado-Maior · CCO-16" };
export const dynamic = "force-dynamic";

const INDICADORES_KPI = [
  { chave: "frequencia_presente", rotulo: "Frequência EM (%)", icon: Building2 },
  { chave: "escalas_servico_dia", rotulo: "Escalados no Serviço de Dia", icon: CalendarClock },
  { chave: "numeradores_expedidos", rotulo: "Documentos numerados/mês", icon: FileStack },
];

export default async function EstadoMaiorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsCru>;
}) {
  await exigirPagina("/estado-maior");
  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const { fatos, dimensionais, arquivosFonte, temDados } = await getSecaoDashboard("estado_maior");

  const anos = anosDisponiveis(fatos);

  const mesesBtl = fatos
    .filter((f) => (f.cia == null || f.cia === 0) && !f.eh_anual && f.mes != null)
    .map((f) => ({ ano: f.ano, mes: f.mes as number }));
  const maisRecente = [...mesesBtl].sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes))[0];
  const anoRef = filtro.ano ?? maisRecente?.ano;
  const mesRef = filtro.mes ?? maisRecente?.mes;

  const kpis = INDICADORES_KPI.map(({ chave, rotulo, icon }) => {
    const valor =
      anoRef != null && mesRef != null ? totalIndicador(fatos, chave, { ano: anoRef, mes: mesRef }) : null;
    const deltaPct = anoRef != null && mesRef != null ? deltaMesAnterior(fatos, chave, anoRef, mesRef) : null;
    return {
      icon,
      rotulo,
      valor,
      deltaPct,
      nota: anoRef != null && mesRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : undefined,
    };
  });

  const serieFrequencia = serieMensal(fatos, "frequencia_presente").map((p) => ({
    chave: p.chave,
    presentes: p.valor,
  }));
  const porCelula = rankingDimensao(dimensionais, "celulas", "celula", 8);

  return (
    <SecaoShell
      titulo="Estado-Maior"
      descricao="Frequência do EM, serviço de dia, escalas por célula (CMT, SUBCMT, CFP, COORDOP, TELEMÁTICA) e volume de expediente."
      basePath="/estado-maior"
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={temDados}
      arquivosFonte={arquivosFonte}
    >
      <KpiStrip items={kpis} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Frequência — série mensal</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Estado-Maior · 16º BPM/M</p>
          {serieFrequencia.length > 0 ? (
            <SerieMensalChart
              data={serieFrequencia}
              series={[{ key: "presentes", nome: "Presentes", cor: "#305388" }]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série mensal para este recorte.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Volume por Célula</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            CMT / SUBCMT / CFP / COORDOP / RES. ARMAS / TELEMÁTICA / SERV. DE DIA
          </p>
          {porCelula.length > 0 ? (
            <RankingBar data={porCelula} cor="#d53441" />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem dado por célula.</p>
          )}
        </Card>
      </div>

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <div className="flex items-start gap-3">
          <Building2 size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed text-branco/70">
            Fonte: escalas do Estado-Maior (Z:\16BPMM_EM e escalas semanais locais), numeradores de
            documentos de P3/P4 e células administrativas (CMT, SUBCMT, CFP, COORDOP, RES_ARMAS,
            TELEMATICA, SERVICO_DE_DIA).
          </p>
        </div>
      </Card>

      <ListaDocumentosSecao secao="estado_maior" />
    </SecaoShell>
  );
}
