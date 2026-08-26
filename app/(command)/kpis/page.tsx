import { BarChart3, Timer, Car, Target } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/command/ui";
import { getKpisMensais } from "@/lib/db";
import { TempoRespostaChart, ResultadosChart } from "@/components/command/kpi-charts";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "KPIs Operacionais · CCO-16" };
export const dynamic = "force-dynamic";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// mes_referencia vem do Postgres como string "YYYY-MM-DD". Extrair o mês
// direto da string evita o bug de usar `new Date(...).getMonth()`: esse
// parse é UTC, mas getMonth() lê o fuso local do runtime — fora de UTC (ex.:
// dev local em BRT) o rótulo saía com 1 mês de atraso.
function rotuloMes(mesReferencia: string): string {
  const mes = Number(mesReferencia.slice(5, 7));
  return MESES[mes - 1] ?? "—";
}

export default async function KpisPage() {
  await exigirPagina("/kpis");
  const kpis = await getKpisMensais(6);
  const temHistorico = kpis.length > 0;

  const tempoData = temHistorico
    ? kpis.map((k) => ({
        mes: rotuloMes(k.mes_referencia),
        deteccao_despacho: k.tempo_medio_deteccao_despacho_seg ?? 0,
      }))
    : [{ mes: "—", deteccao_despacho: 0 }];

  const resultData = temHistorico
    ? kpis.map((k) => ({
        mes: rotuloMes(k.mes_referencia),
        recuperados: k.veiculos_recuperados ?? 0,
        flagrantes: k.flagrantes ?? 0,
      }))
    : [{ mes: "—", recuperados: 0, flagrantes: 0 }];

  const ultimo = temHistorico ? kpis[kpis.length - 1] : null;
  const cards = [
    { icon: Timer, rotulo: "Detecção → despacho", meta: "meta < 60s", v: ultimo?.tempo_medio_deteccao_despacho_seg != null ? `${ultimo.tempo_medio_deteccao_despacho_seg}s` : null },
    { icon: Timer, rotulo: "Despacho → chegada", meta: "a medir", v: ultimo?.tempo_medio_despacho_chegada_seg != null ? `${ultimo.tempo_medio_despacho_chegada_seg}s` : null },
    { icon: Car, rotulo: "Veículos recuperados", meta: "reverter −37%", v: ultimo?.veiculos_recuperados ?? null },
    { icon: Target, rotulo: "Flagrantes qualificados", meta: "reverter −27%", v: ultimo?.flagrantes ?? null },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="KPIs Operacionais"
        descricao="Medir antes de crescer. O CCO-16 será avaliado como qualquer sistema — melhor ter o número na mão antes do crítico ter."
        acao={<Badge tone={temHistorico ? "ok" : "attention"}><Target size={12} /> {temHistorico ? `${kpis.length} mês(es) homologado(s)` : "Baseline pendente"}</Badge>}
      />

      <Card className="mb-5 border-ouro/20 bg-ouro/5">
        <p className="text-xs leading-relaxed text-branco/70">
          <strong className="text-ouro">Regra de ouro:</strong> medir o baseline (o &ldquo;antes&rdquo;)
          na Fase 0, antes do piloto. Sem &ldquo;antes&rdquo;, não há &ldquo;depois&rdquo; para
          mostrar ao Comando. Cada KPI abaixo exibe origem, período e estado de atualização.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, rotulo, meta, v }) => (
          <Card key={rotulo}>
            <div className="flex items-center justify-between">
              <Icon size={18} className="text-azul" strokeWidth={1.75} />
              <span className="rounded bg-branco/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-branco/40">
                {v != null ? "homologado" : "baseline"}
              </span>
            </div>
            <p className={`mt-4 text-3xl font-extrabold tracking-tight ${v != null ? "text-branco" : "text-branco/25"}`}>
              {v ?? "—"}
            </p>
            <p className="mt-1 text-sm font-semibold text-branco/80">{rotulo}</p>
            <p className="text-[11px] uppercase tracking-wide text-branco/40">{meta}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Tempo detecção → despacho</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Origem: Sala de Operações · {temHistorico ? "kpi_mensal (homologado)" : "aguardando dados"}
          </p>
          <TempoRespostaChart data={tempoData} />
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-branco">Veículos recuperados × flagrantes</h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-branco/40">
            Origem: Briefing Executivo · {temHistorico ? "kpi_mensal (homologado)" : "aguardando homologação"}
          </p>
          <ResultadosChart data={resultData} />
        </Card>
      </div>

      {!temHistorico && (
        <p className="mt-4 text-center text-xs text-branco/35">
          Gráficos zerados propositalmente — sem números fictícios. A tabela <code>kpi_mensal</code>{" "}
          já existe no banco; preencha o primeiro mês para os gráficos ganharem vida.
        </p>
      )}
    </div>
  );
}
