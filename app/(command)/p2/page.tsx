import {
  ShieldAlert,
  Siren,
  PhoneCall,
  Users,
  TrendingUp,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  Flame,
  Swords,
} from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { getP2Overview } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";
import {
  DisqueDenunciaChart,
  NaturezaBarChart,
  ProcuradosPorCiaChart,
  CapturaSspChart,
} from "@/components/command/p2-charts";

export const metadata = { title: "P2 · Inteligência · CCO-16" };
export const dynamic = "force-dynamic";

export default async function P2Page() {
  await exigirPagina("/p2");
  const d = await getP2Overview();

  const totalFlagrantes = d.narrativas.filter((n: any) => n.flagrante).length;
  const totalConfrontos = d.narrativas.filter((n: any) => n.confronto).length;
  // Antes este número somava linhas de p2_capturas_operacao_impacto + o
  // agregado SSP + narrativas com captura_procurado — as três fontes cobrem
  // em boa parte a MESMA janela/operação (SSP Nov/25–Jul/26), então a soma
  // contava o mesmo evento mais de uma vez. O agregado SSP é a fonte oficial
  // consolidada; as demais aparecem como detalhamento em outros cards, não
  // somadas aqui.
  const totalCapturas = d.capturaSsp.total || null;

  const ddTotal = d.dd.pendente + d.dd.encerrada;
  const taxaEncerramento = ddTotal > 0 ? Math.round((d.dd.encerrada / ddTotal) * 1000) / 10 : null;

  const temDados = (totalCapturas ?? 0) > 0 || ddTotal > 0 || d.narrativas.length > 0;

  const ddSerie = mergeSeries(d.dd.seriePendente, d.dd.serieEncerrada);

  const cards = [
    {
      icon: ShieldAlert,
      rotulo: "Capturas / Recapturados",
      valor: totalCapturas,
      destaque: "critical" as const,
      nota: "SSP · Operação Impacto, Nov/25–Jul/26",
    },
    {
      icon: Flame,
      rotulo: "Flagrantes registrados",
      valor: totalFlagrantes || null,
      destaque: "ok" as const,
      nota: "Log Real Parque, Jan–Jul/26",
    },
    {
      icon: PhoneCall,
      rotulo: "Disque-Denúncia encerradas",
      valor: d.dd.encerrada || null,
      destaque: "informative" as const,
      nota: taxaEncerramento != null ? `${taxaEncerramento}% de encerramento` : undefined,
    },
    {
      icon: Clock,
      rotulo: "Disque-Denúncia pendentes",
      valor: d.dd.pendente || null,
      destaque: "attention" as const,
      nota: "aguardando resposta",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="P2 — Inteligência"
        descricao="Consolidação de dados operacionais da Seção P2: capturas, procurados, disque-denúncia e ocorrências de inteligência do 16º BPM/M."
        acao={
          <Badge tone={temDados ? "ok" : "attention"}>
            <TrendingUp size={12} /> {temDados ? "dados ingeridos" : "aguardando ingestão"}
          </Badge>
        }
      />

      {!temDados ? (
        <DataState
          icon={<ShieldAlert size={28} />}
          titulo="Sem dados P2 carregados"
          texto="As tabelas p2_* ainda não foram populadas para este ambiente."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, rotulo, valor, destaque, nota }) => (
              <Card key={rotulo} className={destaque === "critical" ? "border-vermelho/30 bg-vermelho/5" : destaque === "ok" ? "border-emerald-400/30 bg-emerald-400/5" : undefined}>
                <div className="flex items-center justify-between">
                  <Icon size={18} className="text-azul" strokeWidth={1.75} />
                  {valor != null && <Badge tone={destaque}>{destaque === "critical" ? "destaque" : destaque === "ok" ? "positivo" : "período"}</Badge>}
                </div>
                <p className={`mt-4 text-3xl font-extrabold tracking-tight ${valor != null ? "text-branco" : "text-branco/25"}`}>
                  {valor ?? "—"}
                </p>
                <p className="mt-1 text-sm font-semibold text-branco/80">{rotulo}</p>
                {nota && <p className="text-[11px] uppercase tracking-wide text-branco/40">{nota}</p>}
              </Card>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-branco">Disque-Denúncia — pendentes × encerradas</h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Origem: DISQUE DENUNCIA - DD · série mensal 2025–2026
              </p>
              {ddSerie.length > 0 ? (
                <DisqueDenunciaChart data={ddSerie} />
              ) : (
                <DataState titulo="Sem série mensal de disque-denúncia" />
              )}
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-branco">Naturezas mais frequentes (Disque-Denúncia)</h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Origem: pendentes + encerradas · histórico completo
              </p>
              {d.dd.natureza.length > 0 ? (
                <NaturezaBarChart data={d.dd.natureza} />
              ) : (
                <DataState titulo="Sem dados de natureza" />
              )}
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-branco">Procurados por Companhia</h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Origem: Procurados - 1ª a 4ª Cia · CPC/BNMP
              </p>
              {d.procuradosPorCia.length > 0 ? (
                <ProcuradosPorCiaChart data={d.procuradosPorCia} />
              ) : (
                <DataState titulo="Sem dados por companhia" />
              )}
            </Card>
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-branco">Capturas — SSP (Operação Impacto)</h2>
              <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
                Origem: Nova Planilha SSP · Nov/25–Jul/26 · {d.capturaSsp.total} capturas
              </p>
              {d.capturaSsp.serie.length > 0 ? (
                <CapturaSspChart data={d.capturaSsp.serie} />
              ) : (
                <DataState titulo="Sem série de capturas SSP" />
              )}
            </Card>
          </div>

          <Card className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-branco">Linha do tempo — Ocorrências Real Parque</h2>
              <Badge tone="neutro">{d.narrativas.length} eventos · Jan–Jul/2026</Badge>
            </div>
            {d.narrativas.length > 0 ? (
              <div className="flex flex-col gap-3">
                {d.narrativas.map((n: any) => (
                  <div key={n.id} className="rounded-lg border border-branco/10 bg-branco/[0.02] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-branco/50">{n.data_ocorrencia}</span>
                      {n.flagrante && <Badge tone="ok"><Flame size={11} /> Flagrante</Badge>}
                      {n.captura_procurado && <Badge tone="critical"><ShieldAlert size={11} /> Captura de procurado</Badge>}
                      {n.confronto && <Badge tone="urgent"><Swords size={11} /> Confronto</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-branco/90">{n.titulo}</p>
                    <p className="mt-1 text-xs text-branco/50">{n.endereco}</p>
                  </div>
                ))}
              </div>
            ) : (
              <DataState titulo="Sem ocorrências narrativas carregadas" />
            )}
          </Card>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-vermelho" />
                <h2 className="text-sm font-semibold text-branco">Procurados — comunidade Real Parque</h2>
              </div>
              {d.procuradosRealParque.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {d.procuradosRealParque.map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-branco/10 p-2.5 text-xs">
                      <p className="font-semibold text-branco/90">{p.nome}</p>
                      <p className="text-branco/50">
                        {p.artigo} · Mandado {p.mandado}
                      </p>
                      <p className="text-branco/40">{p.endereco}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <DataState titulo="Sem procurados vinculados ao Real Parque" />
              )}
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-azul" />
                <h2 className="text-sm font-semibold text-branco">Conclusões de inteligência</h2>
              </div>
              {d.relatorios.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {d.relatorios.map((r: any) => (
                    <div key={r.id}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-branco/50">
                        {r.titulo} {r.data_referencia && `· ${r.data_referencia}`}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-branco/70">{r.texto}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <DataState titulo="Sem relatórios qualitativos" />
              )}
            </Card>
          </div>

          <Card className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <Users size={16} className="text-branco/50" />
              <h2 className="text-sm font-semibold text-branco">Proveniência dos dados</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {d.arquivosFonte.map((a: any, i: number) => (
                <div key={i} className="rounded border border-branco/10 p-2 text-[11px]">
                  <p className="truncate font-medium text-branco/70" title={a.nome_arquivo}>
                    {a.nome_arquivo}
                  </p>
                  <p className="text-branco/40">
                    {a.tipo} · {a.linhas_reais} registro(s)
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <p className="mt-4 flex items-center gap-1.5 text-center text-[11px] text-branco/35">
            <CheckCircle2 size={12} /> Dados de grande volume/abrangência estadual (procurados CPC/ADAGA/BNMP,
            produtividade Fotocrim) são exibidos em agregados, não linha-a-linha — ver detalhe no caminho UNC original.
          </p>
        </>
      )}

      <ListaDocumentosSecao secao="p2" />
    </div>
  );
}

function mergeSeries(pendente: { mes: string; total: number }[], encerrada: { mes: string; total: number }[]) {
  const meses = Array.from(new Set([...pendente.map((p) => p.mes), ...encerrada.map((e) => e.mes)])).sort();
  // null (não 0) para mês fora da janela de cada série — serieEncerrada só
  // cobre 2025-01..2025-11 e seriePendente 2025-11..2026-07; preencher com 0
  // fazia a linha de encerradas "despencar a zero" nos meses não cobertos,
  // como se a apuração tivesse zerado, em vez de mostrar que não há dado ali.
  return meses.map((mes) => ({
    mes,
    pendente: pendente.find((p) => p.mes === mes)?.total ?? null,
    encerrada: encerrada.find((e) => e.mes === mes)?.total ?? null,
  }));
}
