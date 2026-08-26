import { notFound } from "next/navigation";
import { Boxes, ShieldCheck, Users2, Camera, TriangleAlert } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { GaleriaFotos } from "@/components/command/p4/galeria-fotos";
import { AbasCompanhia } from "@/components/command/companhia/abas";
import { exigirPagina } from "@/lib/db/permissoes";
import { getMaterialBelico, getEfetivoP4, getFotosInventario } from "@/lib/db/p4";
import { ehUnidadeValida, dadosUnidade, rotuloP4, rotuloEfetivoP4, type Unidade } from "@/lib/unidades";

export async function generateMetadata({ params }: { params: Promise<{ cia: string }> }) {
  const { cia } = await params;
  if (!ehUnidadeValida(cia)) return { title: "Inventário · CCO-16" };
  return { title: `Inventário · ${dadosUnidade(cia).rotulo} · CCO-16` };
}
export const dynamic = "force-dynamic";

/** Estados que exigem acompanhamento do Comando (mesmo critério de /p4/material-belico). */
const CRITICOS = ["EXTRAVIADA", "EXTRAVIADO", "ROUBO", "FURTO", "NÃO ENCONTRADA"];

function tom(estado: string | null): "ok" | "attention" | "critical" | "neutro" {
  if (!estado) return "neutro";
  const u = estado.toUpperCase();
  if (CRITICOS.includes(u)) return "critical";
  if (u.startsWith("CARGA PESSOAL") || u.startsWith("RESERVA") || u === "DETENTOR USUÁRIO") return "ok";
  return "neutro";
}

/**
 * Inventário da Companhia: o recorte por unidade do módulo P4 · Logística
 * (material bélico, coletes, efetivo nominal e fotos), que na área do
 * Estado-Maior só existe consolidado por batalhão. Reaproveita as mesmas
 * tabelas p4_* e o mesmo componente de galeria da página /p4/material-belico
 * — só filtrado pela unidade, sem duplicar a leitura de dado.
 */
export default async function InventarioCompanhiaPage({
  params,
}: {
  params: Promise<{ cia: string }>;
}) {
  const { cia: unidadeBruta } = await params;
  if (!ehUnidadeValida(unidadeBruta)) notFound();
  const unidade = unidadeBruta as Unidade;
  await exigirPagina(`/companhia/${unidade}/inventario`);

  const dados = dadosUnidade(unidade);
  const rotuloUnidadeP4 = rotuloP4(unidade);

  const [belico, efetivo, fotos] = await Promise.all([
    getMaterialBelico(rotuloUnidadeP4),
    getEfetivoP4(rotuloEfetivoP4(unidade)),
    getFotosInventario(rotuloUnidadeP4),
  ]);

  const criticos = belico.filter((i) => tom(i.estado) === "critical");
  const coletes = belico.filter((i) => i.categoria === "COLETE");
  const semColeteObs = coletes.filter((c) => tom(c.estado) === "critical").length;

  const porCategoria = new Map<string, typeof belico>();
  for (const item of belico) {
    const lista = porCategoria.get(item.categoria) ?? [];
    lista.push(item);
    porCategoria.set(item.categoria, lista);
  }

  const semDados = belico.length === 0 && efetivo.length === 0 && fotos.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <AbasCompanhia unidade={unidade} />

      <PageHeader
        titulo={`Inventário · ${dados.rotulo}`}
        descricao="Material bélico, coletes e efetivo em carga desta unidade — recorte do P4 · Logística do batalhão."
        acao={<Badge tone="neutro"><Boxes size={12} /> {belico.length} itens</Badge>}
      />

      {semDados ? (
        <DataState
          icon={<Boxes size={28} />}
          titulo="Sem inventário recortado para esta unidade"
          texto="A ingestão do P4 ainda não tem item associado a esta Companhia nas planilhas de origem."
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-3xl font-extrabold tracking-tight text-branco">{belico.length}</p>
              <p className="mt-1 text-xs text-branco/55">Itens de material bélico</p>
            </Card>
            <Card className={semColeteObs > 0 ? "border-vermelho/30 bg-vermelho/5" : undefined}>
              <p className="text-3xl font-extrabold tracking-tight text-branco">{coletes.length}</p>
              <p className="mt-1 text-xs text-branco/55">Coletes em carga</p>
            </Card>
            <Card>
              <p className="text-3xl font-extrabold tracking-tight text-branco">{efetivo.length}</p>
              <p className="mt-1 text-xs text-branco/55">Efetivo nominal (P4)</p>
            </Card>
            <Card>
              <p className="text-3xl font-extrabold tracking-tight text-branco">{fotos.length}</p>
              <p className="mt-1 text-xs text-branco/55">Fotos do inventário</p>
            </Card>
          </div>

          {criticos.length > 0 && (
            <Card className="mb-5 border-vermelho/30 bg-vermelho/5">
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert size={18} className="text-vermelho" strokeWidth={1.75} />
                <p className="text-sm font-semibold text-branco">
                  {criticos.length} itens em situação crítica (extravio, roubo, furto ou não localizado)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                      <th className="px-3 py-2 font-semibold">Tipo</th>
                      <th className="px-3 py-2 font-semibold">Nº Série</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                      <th className="px-3 py-2 font-semibold">Detentor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticos.map((c, i) => (
                      <tr key={`${c.patrimonio}-${i}`} className="border-b border-branco/5 last:border-0">
                        <td className="px-3 py-2 text-branco/80">{c.tipo ?? c.categoria}</td>
                        <td className="tempo px-3 py-2 text-xs text-branco/60">{c.num_serie ?? "—"}</td>
                        <td className="px-3 py-2"><Badge tone="critical">{c.estado}</Badge></td>
                        <td className="px-3 py-2 text-xs text-branco/50">{c.nome ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {[...porCategoria.entries()].map(([categoria, itens]) => (
            <section key={categoria} className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-azul" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">{categoria}</h2>
                <span className="text-xs text-branco/35">{itens.length}</span>
              </div>
              <Card className="overflow-hidden p-0">
                <div className="max-h-[24rem] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-tatico-super">
                      <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                        <th className="px-4 py-3 font-semibold">Tipo</th>
                        <th className="px-4 py-3 font-semibold">Nº Série</th>
                        <th className="px-4 py-3 font-semibold">Patrimônio</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3 font-semibold">Detentor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it, i) => (
                        <tr key={`${it.patrimonio}-${i}`} className="border-b border-branco/5 last:border-0">
                          <td className="px-4 py-2.5 text-branco/80">{it.tipo ?? "—"}</td>
                          <td className="tempo px-4 py-2.5 text-xs text-branco/60">{it.num_serie ?? "—"}</td>
                          <td className="tempo px-4 py-2.5 text-xs text-branco/60">{it.patrimonio ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            {it.estado ? <Badge tone={tom(it.estado)}>{it.estado}</Badge> : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-branco/60">{it.nome ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          ))}

          {efetivo.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Users2 size={16} className="text-azul" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">
                  Efetivo em carga (P4)
                </h2>
                <span className="text-xs text-branco/35">{efetivo.length}</span>
              </div>
              <Card className="overflow-hidden p-0">
                <div className="max-h-[24rem] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-tatico-super">
                      <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                        <th className="px-4 py-3 font-semibold">Posto/Grad</th>
                        <th className="px-4 py-3 font-semibold">RE</th>
                        <th className="px-4 py-3 font-semibold">Nome</th>
                        <th className="px-4 py-3 font-semibold">Função</th>
                        <th className="px-4 py-3 font-semibold">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {efetivo.map((m, i) => (
                        <tr key={`${m.re}-${i}`} className="border-b border-branco/5 last:border-0">
                          <td className="px-4 py-2.5 text-branco/80">{m.posto_grad ?? "—"}</td>
                          <td className="tempo px-4 py-2.5 text-xs text-branco/60">{m.re ?? "—"}</td>
                          <td className="px-4 py-2.5 text-branco/70">{m.nome}</td>
                          <td className="px-4 py-2.5 text-xs text-branco/60">{m.funcao ?? "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-branco/60">{m.situacao ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {fotos.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Camera size={16} className="text-azul" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">
                  Inventário fotográfico
                </h2>
                <span className="text-xs text-branco/35">{fotos.length} fotos</span>
              </div>
              <GaleriaFotos fotos={fotos} />
            </section>
          )}
        </>
      )}

      <p className="mt-6 text-xs text-branco/35">
        Fonte: mesma ingestão do P4 · Logística (Z:\16BPMM_EM\P4\P4 2026\), recortada para{" "}
        {rotuloUnidadeP4}. Ativos de telemática (rádio, TPD, informática) não têm recorte confiável por
        Companhia nas planilhas de origem e por isso não entram aqui — consulte{" "}
        <span className="tempo">/p4/telematica</span> no consolidado do batalhão.
      </p>
    </div>
  );
}
