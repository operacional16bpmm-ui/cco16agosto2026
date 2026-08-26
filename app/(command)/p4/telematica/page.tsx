import Link from "next/link";
import {
  Radio, ArrowLeft, Laptop, Smartphone, Printer, Monitor,
  Network, Package2, Wrench,
} from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { RankingBar } from "@/components/command/secao/charts";
import { getKpisP4, getTelematica, kpi, ranking } from "@/lib/db/p4";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P4 · Telemática · CCO-16" };
export const dynamic = "force-dynamic";

/** Rótulo, ícone e ordem de exibição de cada classe de ativo. */
const CLASSES = [
  { id: "HT", label: "Rádio HT", icon: Radio },
  { id: "TPD", label: "TPD", icon: Smartphone },
  { id: "COMPUTADOR", label: "Computador", icon: Monitor },
  { id: "NOTEBOOK", label: "Notebook", icon: Laptop },
  { id: "CELULAR", label: "Celular funcional", icon: Smartphone },
  { id: "IMPRESSORA", label: "Impressora", icon: Printer },
  { id: "ESTOQUE", label: "Estoque", icon: Package2 },
  { id: "DESCARGA", label: "Para descarga", icon: Wrench },
] as const;

/** Situações que indicam equipamento fora de operação. */
const FORA = ["MANUT.", "MANUTENÇÃO", "DESCARGA", "PROC. DESCARGA", "EXTRAVIADO"];

function tomSituacao(s: string | null): "ok" | "attention" | "critical" | "neutro" {
  if (!s) return "neutro";
  const u = s.toUpperCase();
  if (u === "EXTRAVIADO") return "critical";
  if (FORA.includes(u)) return "attention";
  if (u === "QRV" || u === "OPERANDO") return "ok";
  return "neutro";
}

export default async function TelematicaPage() {
  await exigirPagina("/p4/telematica");
  const [kpis, ativos] = await Promise.all([getKpisP4(), getTelematica()]);

  if (ativos.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="P4 · Telemática" descricao="Ativos de TI e comunicações do 16º BPM/M." />
        <DataState
          icon={<Radio size={28} />}
          titulo="Sem dados de telemática"
          texto="A planilha SISTEL 16BPMM.xlsx alimenta esta tela. Rode scripts/ingest_p4.py."
        />
      </div>
    );
  }

  const total = kpi(kpis, "telematica", "total", "ATIVOS");
  const porClasse = ranking(kpis, "telematica", "por_classe");
  const porSituacao = ranking(kpis, "telematica", "por_situacao", 8);

  const operando = ativos.filter((a) => tomSituacao(a.situacao) === "ok").length;
  const foraDeUso = ativos.filter((a) => a.situacao && FORA.includes(a.situacao.toUpperCase())).length;
  const extraviados = ativos.filter((a) => a.situacao?.toUpperCase() === "EXTRAVIADO").length;

  const porClasseMap = new Map<string, typeof ativos>();
  for (const a of ativos) {
    const l = porClasseMap.get(a.classe) ?? [];
    l.push(a);
    porClasseMap.set(a.classe, l);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/p4"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-branco/45 transition-colors hover:text-branco"
      >
        <ArrowLeft size={13} /> P4 · Logística
      </Link>

      <PageHeader
        titulo="P4 · Telemática"
        descricao="Rádios HT, terminais portáteis, parque de informática, telefonia e endereçamento de rede do batalhão. Fonte: SISTEL 16BPMM.xlsx."
        acao={<Badge tone="neutro"><Radio size={12} /> {total} ativos</Badge>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-branco">{total}</p>
          <p className="mt-1 text-xs text-branco/55">Ativos cadastrados</p>
        </Card>
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-emerald-700">{operando}</p>
          <div className="mt-2"><Badge tone="ok">Em operação</Badge></div>
        </Card>
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-ouro">{foraDeUso}</p>
          <div className="mt-2"><Badge tone="attention">Manutenção / descarga</Badge></div>
        </Card>
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-vermelho">{extraviados}</p>
          <div className="mt-2"><Badge tone="critical">Extraviado</Badge></div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Ativos por classe
          </h2>
          <RankingBar data={porClasse} unidade="itens" />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Ativos por situação
          </h2>
          <RankingBar data={porSituacao} unidade="itens" cor="#3b82f6" />
        </Card>
      </div>

      {/* Uma seção por classe de ativo — cada uma com sua tabela própria. */}
      {CLASSES.map(({ id, label, icon: Icon }) => {
        const lista = porClasseMap.get(id);
        if (!lista?.length) return null;
        return (
          <section key={id} className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Icon size={16} className="text-azul" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">{label}</h2>
              <span className="text-xs text-branco/35">{lista.length}</span>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="max-h-[26rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-tatico-super">
                    <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                      <th className="px-4 py-3 font-semibold">Patrimônio</th>
                      <th className="px-4 py-3 font-semibold">Modelo</th>
                      <th className="px-4 py-3 font-semibold">Nº Série</th>
                      <th className="px-4 py-3 font-semibold">Unidade</th>
                      <th className="px-4 py-3 font-semibold">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a, i) => (
                      <tr key={`${a.patrimonio}-${i}`} className="border-b border-branco/5 last:border-0">
                        <td className="tempo px-4 py-2.5 font-semibold text-branco">
                          {a.patrimonio ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-branco/70">
                          {[a.marca, a.modelo].filter(Boolean).join(" ") || a.tipo || "—"}
                        </td>
                        <td className="tempo px-4 py-2.5 text-xs text-branco/50">
                          {a.num_serie ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-branco/60">
                          {a.unidade ?? a.nome ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {a.situacao ? (
                            <Badge tone={tomSituacao(a.situacao)}>{a.situacao}</Badge>
                          ) : (
                            <span className="text-xs text-branco/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        );
      })}

      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <Network size={18} className="mt-0.5 shrink-0 text-azul" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-branco">Endereçamento de rede</p>
            <p className="mt-1 text-xs text-branco/55">
              As faixas IP por unidade (EM, Cias, BCS Morumbi, PP Portal) estão ingeridas em{" "}
              <code className="tempo text-branco/70">p4_telematica_rede</code>. Não são exibidas aqui:
              mapa de endereçamento interno é informação de superfície de ataque e não deve ficar
              em tela de consulta geral — fica disponível para quem opera a rede.
            </p>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-xs text-branco/35">
        Fonte: Z:\16BPMM_EM\P4\P4 2026\TELEMÁTICA\SISTEL 16BPMM.xlsx
      </p>
    </div>
  );
}
