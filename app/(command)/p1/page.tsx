import { Users, ClipboardCheck, HeartPulse, ShieldCheck, CalendarClock, Stethoscope } from "lucide-react";
import { Card } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { KpiStrip } from "@/components/command/secao/kpi-strip";
import { SerieMensalChart, ComparativoCia } from "@/components/command/secao/charts";
import {
  getSecaoDashboard,
  totalIndicador,
  serieMensal,
  comparativoCia,
  deltaMesAnterior,
  anosDisponiveis,
} from "@/lib/db/secao";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P1 · Pessoal · CCO-16" };
export const dynamic = "force-dynamic";

const INDICADORES_KPI = [
  { chave: "efetivo_existente", rotulo: "Efetivo existente", icon: Users },
  { chave: "efetivo_fixado", rotulo: "Efetivo fixado (claro)", icon: ClipboardCheck },
  { chave: "efetivo_apto", rotulo: "Aptos", icon: ShieldCheck },
  { chave: "efetivo_restricao_medica", rotulo: "Restrição médica", icon: HeartPulse },
];

function mesclarSeries(entradas: { key: string; dados: { chave: string; valor: number }[] }[]) {
  const todasChaves = Array.from(new Set(entradas.flatMap((e) => e.dados.map((d) => d.chave)))).sort();
  return todasChaves.map((chave) => {
    const linha: { chave: string } & Record<string, string | number | null> = { chave };
    for (const e of entradas) {
      const ponto = e.dados.find((d) => d.chave === chave);
      linha[e.key] = ponto ? ponto.valor : null;
    }
    return linha;
  });
}

export default async function P1Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsCru>;
}) {
  await exigirPagina("/p1");
  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const { fatos, arquivosFonte, temDados } = await getSecaoDashboard("p1");

  const anos = anosDisponiveis(fatos);

  const mesesBtl = fatos
    .filter((f) => f.cia === 0 && !f.eh_anual && f.mes != null && f.indicador === "efetivo_existente")
    .map((f) => ({ ano: f.ano, mes: f.mes as number }));
  const maisRecente = [...mesesBtl].sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes))[0];
  const anoRef = filtro.ano ?? maisRecente?.ano;
  const mesRef = filtro.mes ?? maisRecente?.mes;
  const ciaRef = filtro.cia ?? 0;

  const kpis = INDICADORES_KPI.map(({ chave, rotulo, icon }) => {
    const valor =
      anoRef != null && mesRef != null
        ? totalIndicador(fatos, chave, { ano: anoRef, mes: mesRef, cia: ciaRef })
        : null;
    const deltaPct =
      anoRef != null && mesRef != null ? deltaMesAnterior(fatos, chave, anoRef, mesRef, ciaRef) : null;
    return {
      icon,
      rotulo,
      valor,
      deltaPct,
      nota: anoRef != null && mesRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : undefined,
    };
  });

  const existenteRef = totalIndicador(fatos, "efetivo_existente", { ano: anoRef, mes: mesRef, cia: ciaRef });
  const fixadoRef = totalIndicador(fatos, "efetivo_fixado", { ano: anoRef, mes: mesRef, cia: ciaRef });
  const preenchimentoPct =
    existenteRef != null && fixadoRef != null && fixadoRef > 0
      ? Math.round((existenteRef / fixadoRef) * 1000) / 10
      : null;

  const serieEfetivo = mesclarSeries([
    { key: "existente", dados: serieMensal(fatos, "efetivo_existente", ciaRef) },
    { key: "fixado", dados: serieMensal(fatos, "efetivo_fixado", ciaRef) },
  ]);

  const feriasPorMes = serieMensal(fatos, "ferias_concedidas").map((p) => ({ chave: p.chave, ferias: p.valor }));
  const ltsPorAno = fatos
    .filter((f) => f.indicador === "lts_afastamentos" && f.eh_anual)
    .map((f) => ({ chave: String(f.ano), lts: Number(f.valor) }))
    .sort((a, b) => Number(a.chave) - Number(b.chave));

  return (
    <SecaoShell
      titulo="P1 — Pessoal"
      descricao="Efetivo existente vs fixado (claro) e aptidão para o serviço, por Companhia — QSE (Quadro de Suprimento de Efetivo) mensal."
      basePath="/p1"
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={temDados}
      arquivosFonte={arquivosFonte}
      notaLgpd="Só agregados sobem ao portal (contagem por Cia/mês) — os snapshots nominais do efetivo (nome, RE, situação individual) ficam apenas no caminho UNC de origem."
    >
      <KpiStrip items={kpis} />

      {preenchimentoPct != null && (
        <p className="mt-3 text-center text-xs text-branco/50">
          Taxa de preenchimento do claro em {String(mesRef).padStart(2, "0")}/{anoRef}
          {ciaRef !== 0 ? ` (${ciaRef}ª Cia)` : " (16º BPM/M)"}:{" "}
          <strong className="text-branco">{preenchimentoPct}%</strong>
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Existente × Fixado</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Série mensal · {ciaRef === 0 ? "16º BPM/M (Btl)" : `${ciaRef}ª Cia`}
          </p>
          {serieEfetivo.length > 0 ? (
            <SerieMensalChart
              data={serieEfetivo}
              series={[
                { key: "existente", nome: "Existente", cor: "#305388" },
                { key: "fixado", nome: "Fixado (claro)", cor: "#ab9142" },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série mensal para este recorte.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Efetivo existente por Companhia</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            {mesRef != null && anoRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : "Sem mês de referência"}
          </p>
          {(() => {
            const dadosComparativo = comparativoCia(fatos, "efetivo_existente", { ano: anoRef, mes: mesRef });
            return dadosComparativo.length > 0 ? (
              <ComparativoCia data={dadosComparativo} cor="#305388" />
            ) : (
              <p className="py-10 text-center text-sm text-branco/40">Sem dado por Cia neste mês.</p>
            );
          })()}
        </Card>
      </div>

      {(feriasPorMes.length > 0 || ltsPorAno.length > 0) && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {feriasPorMes.length > 0 && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-branco">
                <CalendarClock size={15} className="text-azul" /> Férias concedidas — série mensal
              </h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">PAF · 16º BPM/M</p>
              <SerieMensalChart
                data={feriasPorMes}
                series={[{ key: "ferias", nome: "Concessões", cor: "#ab9142" }]}
              />
            </Card>
          )}
          {ltsPorAno.length > 0 && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-branco">
                <Stethoscope size={15} className="text-azul" /> LTS — afastamentos por ano
              </h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Licença para Tratamento de Saúde
              </p>
              <SerieMensalChart data={ltsPorAno} series={[{ key: "lts", nome: "Afastamentos", cor: "#d53441" }]} />
            </Card>
          )}
        </div>
      )}

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <p className="text-xs leading-relaxed text-branco/70">
          Fonte: QSE (Quadro de Suprimento de Efetivo) mensal, aba OPM — grupo &ldquo;Oficiais e
          Praças / Efetivo Total&rdquo;, linha de total do 16º BPM/M e subtotal de cada Cia. Série
          2024-2026 já ingerida. Quando um mês tem mais de uma versão na rede (ex.: &ldquo;atualizada&rdquo;
          ou &ldquo;NOVA&rdquo;), a revisão mais recente é a fonte usada, nunca a original superada.
        </p>
      </Card>

      <ListaDocumentosSecao secao="p1" />
    </SecaoShell>
  );
}
