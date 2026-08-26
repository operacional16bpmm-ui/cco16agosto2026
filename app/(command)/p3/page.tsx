import { Car, Flame, ShieldAlert, Users2, TrendingUp, MapPin, FileText, Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/command/ui";
import { SecaoShell } from "@/components/command/secao/shell";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { KpiStrip } from "@/components/command/secao/kpi-strip";
import { SerieMensalChart, ComparativoCia, RankingBar } from "@/components/command/secao/charts";
import {
  getSecaoDashboard,
  totalIndicador,
  serieMensal,
  comparativoCia,
  deltaMesAnterior,
  anosDisponiveis,
  rankingDimensao,
} from "@/lib/db/secao";
import { parseFiltroSecao, type SearchParamsCru } from "@/lib/filtros";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P3 · Operações · CCO-16" };
export const dynamic = "force-dynamic";

const INDICADORES_KPI = [
  { chave: "abordados_carros", rotulo: "Carros abordados", icon: Car },
  { chave: "veiculos_recuperados", rotulo: "Veículos recuperados", icon: Car },
  { chave: "flagrantes", rotulo: "Flagrantes", icon: Flame },
  { chave: "capturas_procurado", rotulo: "Capturas de procurado", icon: ShieldAlert },
];

function mesclarSeries(entradas: { key: string; dados: { chave: string; valor: number }[] }[]) {
  const todasChaves = Array.from(new Set(entradas.flatMap((e) => e.dados.map((d) => d.chave)))).sort();
  return todasChaves.map((chave) => {
    const linha: { chave: string } & Record<string, string | number | null> = { chave };
    for (const e of entradas) {
      const ponto = e.dados.find((d) => d.chave === chave);
      // null (não 0): mês sem linha na fonte vira gap visível no gráfico,
      // não uma queda fabricada — mesma lição do bug B7 do P2.
      linha[e.key] = ponto ? ponto.valor : null;
    }
    return linha;
  });
}

export default async function P3Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsCru>;
}) {
  await exigirPagina("/p3");
  const sp = await searchParams;
  const filtro = parseFiltroSecao(sp);
  const { fatos, dimensionais, arquivosFonte, temDados } = await getSecaoDashboard("p3");

  const anos = anosDisponiveis(fatos);

  // Mês de referência dos KPIs: filtro explícito na URL, senão o mês mais
  // recente disponível no nível batalhão (cia=0).
  const mesesBtl = fatos
    .filter((f) => f.cia === 0 && !f.eh_anual && f.mes != null && f.indicador === "abordados_carros")
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

  const serieCarros = mesclarSeries([
    { key: "abordados", dados: serieMensal(fatos, "abordados_carros", ciaRef) },
    { key: "recuperados", dados: serieMensal(fatos, "veiculos_recuperados", ciaRef) },
  ]);

  const serieCriminal = mesclarSeries([
    { key: "roubo", dados: serieMensal(fatos, "roubo_registrado") },
    { key: "furto", dados: serieMensal(fatos, "furto_registrado") },
    { key: "homicidio", dados: serieMensal(fatos, "homicidio_registrado") },
    { key: "roubo_carga", dados: serieMensal(fatos, "roubo_carga_registrado") },
  ]);
  const serieProdutividade = mesclarSeries([
    { key: "paraisopolis", dados: serieMensal(fatos, "produtividade_paraisopolis") },
    { key: "rpm", dados: serieMensal(fatos, "resultado_operacoes_rpm") },
  ]);
  const porNatureza = rankingDimensao(dimensionais, "ocorrencias_muralha", "natureza", 8);

  return (
    <SecaoShell
      titulo="P3 — Operações"
      descricao="Produtividade operacional mensal: abordagens, flagrantes, capturas, veículos recuperados e apreensões — RAC (Reunião de Análise Crítica) por Companhia."
      basePath="/p3"
      filtro={filtro}
      anosDisponiveis={anos}
      temDados={temDados}
      arquivosFonte={arquivosFonte}
    >
      <Card className="mb-5">
        <div className="flex items-start gap-3">
          <FileText size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-branco/70">
              São Paulo, 2 de julho de 2026.
              <br />
              <span className="font-semibold text-branco">ORDEM DE SERVIÇO Nº COORDOPPM-003/51/26</span>
              <br />
              Do Subcmt PM
              <br />
              Ao Sr. (conforme distribuição).
              <br />
              Assunto: Operações Policial-Militares com COP.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-branco/70">
              Referência: 1) Diretriz PM3-001/02/20, de 06MAR20 (NORSOP); 2) Nota de Instrução nº
              PM3-001/02/23, de 07JUN23 (Atuação da Polícia Militar em Áreas Deterioradas ou de Grande
              Desordem Social); 3) Diretriz PM3-003/02/23, de 26DEZ23 (Sistema de Controle de Incidentes
              da Polícia Militar); 4) Nota de Instrução nº PM3-002/02/25, de 15MAI25 (Operação &ldquo;Impacto
              Pronta Resposta&rdquo;); 5) Termo de Audiência de Conciliação celebrado no âmbito da Suspensão
              de Liminar nº 1.696/SP, do Supremo Tribunal Federal; 6) Diretriz nº PM3-001/02/25, de 05JUL25
              (Câmeras Operacionais Portáteis).
            </p>
            <p className="mt-2 text-xs font-medium text-branco/70">
              Anexo: Controle de Operações Policial-Militares com COP.
            </p>

            <div className="mt-4 overflow-hidden rounded-lg border border-branco/10">
              <object
                data="/documentos/OS-COORDOPPM-003-51-26.pdf#toolbar=0"
                type="application/pdf"
                className="h-[420px] w-full"
                aria-label="Pré-visualização da Ordem de Serviço nº COORDOPPM-003/51/26"
              >
                <p className="p-4 text-xs text-branco/60">
                  Seu navegador não exibe a pré-visualização do PDF.{" "}
                  <a
                    href="/documentos/OS-COORDOPPM-003-51-26.pdf"
                    className="font-medium text-azul underline"
                  >
                    Baixe o arquivo aqui
                  </a>
                  .
                </p>
              </object>
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href="/documentos/OS-COORDOPPM-003-51-26.pdf"
                download
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-azul hover:underline"
              >
                <Download size={12} /> Baixar PDF
              </a>
              <a
                href="/documentos/OS-COORDOPPM-003-51-26.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-branco/60 hover:underline"
              >
                <ExternalLink size={12} /> Abrir em nova aba
              </a>
            </div>
          </div>
        </div>
      </Card>

      <KpiStrip items={kpis} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Carros abordados × recuperados</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Série mensal · {ciaRef === 0 ? "16º BPM/M (Btl)" : `${ciaRef}ª Cia`}
          </p>
          {serieCarros.length > 0 ? (
            <SerieMensalChart
              data={serieCarros}
              series={[
                { key: "abordados", nome: "Abordados", cor: "#305388" },
                { key: "recuperados", nome: "Recuperados", cor: "#34d399" },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-sm text-branco/40">Sem série mensal para este recorte.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Flagrantes por Companhia</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            {mesRef != null && anoRef != null ? `${String(mesRef).padStart(2, "0")}/${anoRef}` : "Sem mês de referência"}
          </p>
          {(() => {
            const dadosComparativo = comparativoCia(fatos, "flagrantes", { ano: anoRef, mes: mesRef });
            return dadosComparativo.length > 0 ? (
              <ComparativoCia data={dadosComparativo} cor="#d53441" />
            ) : (
              <p className="py-10 text-center text-sm text-branco/40">Sem dado por Cia neste mês.</p>
            );
          })()}
        </Card>
      </div>

      {(serieCriminal.length > 0 || serieProdutividade.length > 0 || porNatureza.length > 0) && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {serieCriminal.length > 0 && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-branco">
                <TrendingUp size={15} className="text-azul" /> Indicadores criminais — série mensal
              </h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Roubo, furto, homicídio, roubo de carga — BOs registrados
              </p>
              <SerieMensalChart
                data={serieCriminal}
                series={[
                  { key: "roubo", nome: "Roubo", cor: "#d53441" },
                  { key: "furto", nome: "Furto", cor: "#ab9142" },
                  { key: "homicidio", nome: "Homicídio", cor: "#f97316" },
                  { key: "roubo_carga", nome: "Roubo de carga", cor: "#a855f7" },
                ]}
              />
            </Card>
          )}
          {porNatureza.length > 0 && (
            <Card>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-branco">
                <MapPin size={15} className="text-azul" /> Ocorrências Muralha Paulista por natureza
              </h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Janela recente (Vila Andrade + Morumbi)</p>
              <RankingBar data={porNatureza} cor="#305388" />
            </Card>
          )}
          {serieProdutividade.length > 0 && (
            <Card className="lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-branco">Produtividade Paraisópolis × RPM</h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">Pessoas abordadas por mês, 2026</p>
              <SerieMensalChart
                data={serieProdutividade}
                series={[
                  { key: "paraisopolis", nome: "Paraisópolis", cor: "#305388" },
                  { key: "rpm", nome: "Operações RPM", cor: "#34d399" },
                ]}
              />
            </Card>
          )}
        </div>
      )}

      <Card className="mt-5 border-azul/20 bg-azul/5">
        <div className="flex items-start gap-3">
          <Users2 size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed text-branco/70">
            Fonte: RAC (Reunião de Análise Crítica) mensal, 16º BPM/M + 1ª–4ª Cia. Cada arquivo do mês
            atual já traz o mesmo mês do ano anterior lado a lado — a série 2025 vem desse backfill, sem
            abrir arquivos antigos. É a mesma janela (jun/25 → jun/26) que origina os números da vitrine
            pública (abordagens em alta, recuperação de veículos e flagrantes em queda).
          </p>
        </div>
      </Card>

      <ListaDocumentosSecao secao="p3" />
    </SecaoShell>
  );
}
