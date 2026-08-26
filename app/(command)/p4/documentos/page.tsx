import Link from "next/link";
import { FileStack, ArrowLeft, HardDrive, FolderOpen } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { RankingBar } from "@/components/command/secao/charts";
import { getKpisP4, getDocumentosP4, kpi, ranking } from "@/lib/db/p4";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "P4 · Documentos · CCO-16" };
export const dynamic = "force-dynamic";

function mb(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function DocumentosPage() {
  await exigirPagina("/p4/documentos");
  const [kpis, docs] = await Promise.all([getKpisP4(), getDocumentosP4()]);

  if (docs.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader titulo="P4 · Documentos" descricao="Acervo documental da seção." />
        <DataState
          icon={<FileStack size={28} />}
          titulo="Sem documentos indexados"
          texto="Rode scripts/ingest_p4.py para indexar a pasta P4 2026 da rede."
        />
      </div>
    );
  }

  const total = kpi(kpis, "documentos", "total", "ARQUIVOS");
  const bytes = kpi(kpis, "documentos", "total", "BYTES");
  const porCategoria = ranking(kpis, "documentos", "por_categoria", 14);
  const porExtensao = ranking(kpis, "documentos", "por_extensao", 8);

  const grupos = new Map<string, typeof docs>();
  for (const d of docs) {
    const l = grupos.get(d.categoria) ?? [];
    l.push(d);
    grupos.set(d.categoria, l);
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
        titulo="P4 · Documentos"
        descricao="Todo o acervo da seção indexado e rastreável: LCM mensal, CMEX e descargas, detentor executivo, ofícios, memorandos, escalas, fardamento e UGE."
        acao={<Badge tone="neutro"><FileStack size={12} /> {total?.toLocaleString("pt-BR")} arquivos</Badge>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <FileStack size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-2xl font-extrabold text-branco">{total?.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-branco/55">Arquivos indexados</p>
        </Card>
        <Card>
          <HardDrive size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-2xl font-extrabold text-branco">
            {bytes ? `${(bytes / 1e9).toFixed(1)} GB` : "—"}
          </p>
          <p className="text-xs text-branco/55">Volume total</p>
        </Card>
        <Card>
          <FolderOpen size={16} className="text-branco/40" strokeWidth={1.75} />
          <p className="mt-2 text-2xl font-extrabold text-branco">{grupos.size}</p>
          <p className="text-xs text-branco/55">Categorias</p>
        </Card>
        <Card>
          <p className="text-2xl font-extrabold text-branco">{porExtensao[0]?.valor ?? "—"}</p>
          <p className="text-xs text-branco/55">
            Arquivos .{porExtensao[0]?.chave ?? "—"} (formato mais comum)
          </p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Documentos por categoria
          </h2>
          <RankingBar data={porCategoria} unidade="arquivos" />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ouro">
            Por formato
          </h2>
          <RankingBar data={porExtensao} unidade="arquivos" cor="#3b82f6" />
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Acervo por categoria
      </h2>
      <div className="flex flex-col gap-4">
        {ordenados.map(([categoria, lista]) => (
          <Card key={categoria} className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-branco/10 px-4 py-3">
              <p className="text-sm font-semibold text-branco">{categoria}</p>
              <span className="text-[11px] text-branco/40">{lista.length} arquivos</span>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <tbody>
                  {lista.map((d) => (
                    <tr key={d.caminho_unc} className="border-b border-branco/5 last:border-0">
                      <td className="px-4 py-2">
                        <p className="text-xs text-branco/80">{d.nome_arquivo}</p>
                        {d.subcategoria && (
                          <p className="text-[10px] text-branco/30">{d.subcategoria}</p>
                        )}
                      </td>
                      <td className="w-16 px-2 py-2">
                        <Badge tone="neutro">{d.extensao ?? "?"}</Badge>
                      </td>
                      <td className="w-20 px-2 py-2 text-right text-[11px] text-branco/45">
                        {mb(d.bytes)}
                      </td>
                      <td className="w-24 px-4 py-2 text-right text-[11px] text-branco/45">
                        {dataCurta(d.modificado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-branco/35">
        Índice da pasta Z:\16BPMM_EM\P4\P4 2026\ — o portal cataloga nome, tipo, tamanho e data de
        modificação; o arquivo em si continua na rede, acessível pelo caminho UNC.
      </p>
    </div>
  );
}
