import Link from "next/link";
import { ShieldCheck, ArrowLeft, TriangleAlert, Camera, Crosshair } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { RankingBar } from "@/components/command/secao/charts";
import { GaleriaFotos } from "@/components/command/p4/galeria-fotos";
import { exigirPagina } from "@/lib/db/permissoes";
import {
  getKpisP4, getMaterialBelico, getFotosInventario, kpi, ranking,
} from "@/lib/db/p4";

export const metadata = { title: "P4 · Material Bélico · CCO-16" };
export const dynamic = "force-dynamic";

const CATEGORIAS: Record<string, string> = {
  ARMA_PORTE: "Armas de porte",
  ARMA_PORTATIL: "Armas portáteis",
  COLETE: "Coletes",
  ALGEMA: "Algemas",
};

/** Estados que exigem acompanhamento do Comando. */
const CRITICOS = ["EXTRAVIADA", "EXTRAVIADO", "ROUBO", "FURTO", "NÃO ENCONTRADA"];
const ATENCAO = ["APREENDIDA", "APREENDIDO", "MANUTENÇÃO", "AGUARDANDO DESCARGA", "RECOLHIDA"];

function tom(estado: string | null): "ok" | "attention" | "critical" | "neutro" {
  if (!estado) return "neutro";
  const u = estado.toUpperCase();
  if (CRITICOS.includes(u)) return "critical";
  if (ATENCAO.includes(u)) return "attention";
  if (u.startsWith("CARGA PESSOAL") || u.startsWith("RESERVA") || u === "DETENTOR USUÁRIO") return "ok";
  return "neutro";
}

export default async function MaterialBelicoPage() {
  await exigirPagina("/p4/material-belico");
  const [kpis, itens, fotos] = await Promise.all([
    getKpisP4(),
    getMaterialBelico(),
    getFotosInventario(),
  ]);

  if (itens.length === 0 && fotos.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="P4 · Material Bélico" descricao="Armas, coletes e algemas do 16º BPM/M." />
        <DataState
          icon={<ShieldCheck size={28} />}
          titulo="Sem dados de material bélico"
          texto="As planilhas de inventário bélico alimentam esta tela. Rode scripts/ingest_p4.py."
        />
      </div>
    );
  }

  const porCategoria = ranking(kpis, "belico", "por_categoria");
  const porEstado = ranking(kpis, "belico", "por_estado", 10);
  const semColete = kpi(kpis, "coletes", "total", "PMS_SEM_COLETE");
  const comColete = kpi(kpis, "coletes", "total", "PMS_COM_COLETE");
  const vencemAno = kpi(kpis, "coletes", "total", "VENCEM_ESTE_ANO");
  const vencidos = kpi(kpis, "coletes", "total", "VENCIDOS");

  const criticos = itens.filter((i) => tom(i.estado) === "critical");

  const porCat = new Map<string, typeof itens>();
  for (const i of itens) {
    const l = porCat.get(i.categoria) ?? [];
    l.push(i);
    porCat.set(i.categoria, l);
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
        titulo="P4 · Material Bélico"
        descricao="Armas, coletes e algemas do batalhão com estado e detentor, mais o inventário fotográfico de 2026."
        acao={<Badge tone="neutro"><ShieldCheck size={12} /> {itens.length} itens</Badge>}
      />

      {/* Coletes: o indicador de proteção individual do efetivo. */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className={semColete && semColete > 0 ? "border-vermelho/30 bg-vermelho/5" : undefined}>
          <p className="text-3xl font-extrabold tracking-tight text-vermelho">{semColete ?? "—"}</p>
          <p className="mt-1 text-xs text-branco/55">PMs sem colete em carga</p>
        </Card>
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-emerald-700">{comColete ?? "—"}</p>
          <p className="mt-1 text-xs text-branco/55">PMs com colete</p>
        </Card>
        <Card className={vencemAno && vencemAno > 0 ? "border-ouro/30 bg-ouro/5" : undefined}>
          <p className="text-3xl font-extrabold tracking-tight text-ouro">{vencemAno ?? "—"}</p>
          <p className="mt-1 text-xs text-branco/55">Coletes vencendo em 2026</p>
        </Card>
        <Card>
          <p className="text-3xl font-extrabold tracking-tight text-branco">{vencidos ?? "—"}</p>
          <p className="mt-1 text-xs text-branco/55">Coletes já vencidos</p>
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
                  <th className="px-3 py-2 font-semibold">Patrimônio</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Observação</th>
                </tr>
              </thead>
              <tbody>
                {criticos.map((c, i) => (
                  <tr key={`${c.patrimonio}-${i}`} className="border-b border-branco/5 last:border-0">
                    <td className="px-3 py-2 text-branco/80">{c.tipo ?? CATEGORIAS[c.categoria]}</td>
                    <td className="tempo px-3 py-2 text-xs text-branco/60">{c.num_serie ?? "—"}</td>
                    <td className="tempo px-3 py-2 text-xs text-branco/60">{c.patrimonio ?? "—"}</td>
                    <td className="px-3 py-2"><Badge tone="critical">{c.estado}</Badge></td>
                    <td className="px-3 py-2 text-xs text-branco/50">{c.observacoes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Material por categoria
          </h2>
          <RankingBar data={porCategoria} unidade="itens" />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Situação da carga
          </h2>
          <RankingBar data={porEstado} unidade="itens" cor="#3b82f6" />
        </Card>
      </div>

      {Object.entries(CATEGORIAS).map(([id, label]) => {
        const lista = porCat.get(id);
        if (!lista?.length) return null;
        return (
          <section key={id} className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Crosshair size={16} className="text-azul" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">{label}</h2>
              <span className="text-xs text-branco/35">{lista.length}</span>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-tatico-super">
                    <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      {id.startsWith("ARMA") && <th className="px-4 py-3 font-semibold">Calibre</th>}
                      <th className="px-4 py-3 font-semibold">Nº Série</th>
                      <th className="px-4 py-3 font-semibold">Patrimônio</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Detentor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((it, i) => (
                      <tr key={`${it.patrimonio}-${i}`} className="border-b border-branco/5 last:border-0">
                        <td className="px-4 py-2.5 text-branco/80">{it.tipo ?? "—"}</td>
                        {id.startsWith("ARMA") && (
                          <td className="px-4 py-2.5 text-branco/60">{it.calibre ?? "—"}</td>
                        )}
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
        );
      })}

      {fotos.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Camera size={16} className="text-azul" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ouro">
              Inventário fotográfico 2026
            </h2>
            <span className="text-xs text-branco/35">{fotos.length} fotos</span>
          </div>
          <GaleriaFotos fotos={fotos} />
        </section>
      )}

      <p className="mt-6 text-xs text-branco/35">
        Fonte: Z:\16BPMM_EM\P4\P4 2026\MATERIAL BÉLICO\ · coletes de COPIA ROMANEIO DE COLETES ·
        exibe o consolidado do batalhão (planilha GERAL); as planilhas por Cia estão ingeridas.
      </p>
    </div>
  );
}
