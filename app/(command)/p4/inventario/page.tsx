import Link from "next/link";
import { Boxes, ArrowLeft, CircleDollarSign, DoorOpen, Layers } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { RankingBar } from "@/components/command/secao/charts";
import {
  getKpisP4, getPatrimonioTop, getInventarioSecao, kpi, ranking, brl,
} from "@/lib/db/p4";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P4 · Inventário & LCM · CCO-16" };
export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  await exigirPagina("/p4/inventario");
  const [kpis, top, secoes] = await Promise.all([
    getKpisP4(),
    getPatrimonioTop(80),
    getInventarioSecao(),
  ]);

  if (top.length === 0 && secoes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="P4 · Inventário & LCM" descricao="Livro de Carga de Material do 16º BPM/M." />
        <DataState
          icon={<Boxes size={28} />}
          titulo="Sem dados de inventário"
          texto="O LCM completo alimenta esta tela. Rode scripts/ingest_p4.py."
        />
      </div>
    );
  }

  const itens = kpi(kpis, "lcm", "total", "ITENS_PATRIMONIADOS");
  const valor = kpi(kpis, "lcm", "total", "VALOR_TOTAL");
  const lotes = kpi(kpis, "lotes", "total", "ITENS");
  const itensSecao = kpi(kpis, "inventario_secao", "total", "ITENS");

  const porTipo = ranking(kpis, "lcm", "por_tipo");
  const valorPorTipo = ranking(kpis, "lcm", "valor_por_tipo");
  const porSecao = ranking(kpis, "inventario_secao", "por_secao", 12);

  // Agrupa o inventário por seção/sala para a listagem detalhada.
  const grupos = new Map<string, typeof secoes>();
  for (const s of secoes) {
    const l = grupos.get(s.secao) ?? [];
    l.push(s);
    grupos.set(s.secao, l);
  }
  const ordenados = Array.from(grupos.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/p4"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-branco/45 transition-colors hover:text-branco"
      >
        <ArrowLeft size={13} /> P4 · Logística
      </Link>

      <PageHeader
        titulo="P4 · Inventário & LCM"
        descricao="Livro de Carga de Material completo, material controlado por lote e o inventário patrimonial de cada seção e alojamento."
        acao={<Badge tone="neutro"><Boxes size={12} /> {itens?.toLocaleString("pt-BR")} itens</Badge>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="col-span-2">
          <CircleDollarSign size={18} className="text-ouro" strokeWidth={1.75} />
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-branco">{brl(valor)}</p>
          <p className="text-xs text-branco/55">Valor total do patrimônio sob carga</p>
        </Card>
        <Card>
          <Layers size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-2xl font-extrabold text-branco">{lotes?.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-branco/55">Itens em lote (munição, tonfa, escudo)</p>
        </Card>
        <Card>
          <DoorOpen size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-2xl font-extrabold text-branco">{itensSecao?.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-branco/55">Itens inventariados por seção</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Itens por tipo de material
          </h2>
          <RankingBar data={porTipo} unidade="itens" />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Valor por tipo de material
          </h2>
          <RankingBar data={valorPorTipo} unidade="R$" cor="#eab308" />
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Itens de maior valor
      </h2>
      <Card className="mb-6 overflow-hidden p-0">
        <div className="max-h-[30rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-tatico-super">
              <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                <th className="px-4 py-3 font-semibold">Patrimônio</th>
                <th className="px-4 py-3 font-semibold">Material</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Placa/Série</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.patrimonio} className="border-b border-branco/5 last:border-0">
                  <td className="tempo px-4 py-2.5 text-xs font-semibold text-branco">{p.patrimonio}</td>
                  <td className="px-4 py-2.5 text-branco/75">
                    {p.nome_material ?? "—"}
                    {p.especificacao && (
                      <span className="block text-[10px] text-branco/35">{p.especificacao}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone="neutro">{p.tipo_mat ?? "—"}</Badge>
                  </td>
                  <td className="tempo px-4 py-2.5 text-xs text-branco/55">
                    {p.placa_vtr ?? p.num_serie_arma ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ouro">{brl(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {porSecao.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
            Inventário por seção e alojamento
          </h2>
          <Card className="mb-4">
            <RankingBar data={porSecao} unidade="itens" cor="#3b82f6" />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {ordenados.map(([secao, lista]) => {
              const totalSecao = lista.reduce((s, i) => s + Number(i.valor ?? 0), 0);
              return (
                <Card key={secao} className="overflow-hidden p-0">
                  <div className="flex items-center justify-between border-b border-branco/10 px-4 py-3">
                    <p className="text-sm font-semibold text-branco">{secao}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-branco/40">{lista.length} itens</span>
                      {totalSecao > 0 && (
                        <span className="text-[11px] font-semibold text-ouro">{brl(totalSecao)}</span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {lista.map((i, idx) => (
                          <tr key={`${i.patrimonio}-${idx}`} className="border-b border-branco/5 last:border-0">
                            <td className="tempo px-4 py-2 text-[11px] text-branco/45">
                              {i.patrimonio ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-branco/75">
                              {i.nome_material ?? "—"}
                              {i.especificacao && (
                                <span className="block text-[10px] text-branco/30">{i.especificacao}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-[11px] text-branco/50">
                              {i.valor ? brl(i.valor) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-branco/35">
        Fonte: LCM - 16M - COMPLETO - 12JUN26.xlsx · inventário por seção extraído dos termos em
        INVENTÁRIO 2026\inventário de cada seção\
      </p>
    </div>
  );
}
