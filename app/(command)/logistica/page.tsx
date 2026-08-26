import { Truck, ClipboardList, Trash2, PackageSearch, Fuel, FileWarning, Repeat2, ReceiptText } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { getFrota, getLogisticsSummary, getMotomecOperacional } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Logística · MOTOMEC · CCO-16" };
export const dynamic = "force-dynamic";

const SIT = {
  disponivel: { label: "Disponível", tone: "ok" as const },
  empenhada: { label: "Empenhada", tone: "attention" as const },
  indisponivel: { label: "Indisponível", tone: "neutro" as const },
  baixada: { label: "Baixada", tone: "neutro" as const },
};
const TIPO: Record<string, string> = {
  radiopatrulha: "Rádio Patrulha",
  forca_tatica: "Força Tática",
  motocicleta: "Motocicleta",
  apoio: "Apoio",
  outros: "Outros",
};

export default async function LogisticaPage() {
  await exigirPagina("/logistica");
  const [frota, logSummary, motomecOp] = await Promise.all([
    getFrota(),
    getLogisticsSummary(),
    getMotomecOperacional(),
  ]);
  const cont = (s: string) => frota.filter((v) => v.situacao === s).length;
  const resumo = [
    { s: "disponivel", ...SIT.disponivel },
    { s: "empenhada", ...SIT.empenhada },
    { s: "indisponivel", ...SIT.indisponivel },
    { s: "baixada", ...SIT.baixada },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Logística · MOTOMEC"
        descricao="Frota do batalhão em tempo real: disponíveis, empenhadas e baixadas. Base para o despacho e para a visibilidade logística do Comando."
        acao={<Badge tone="neutro"><Truck size={12} /> {frota.length} viatura(s)</Badge>}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {resumo.map((r) => (
          <Card key={r.s}>
            <p className="text-3xl font-extrabold tracking-tight text-branco">{cont(r.s)}</p>
            <div className="mt-2"><Badge tone={r.tone}>{r.label}</Badge></div>
          </Card>
        ))}
      </div>

      {frota.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                <th className="px-4 py-3 font-semibold">Prefixo</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Cia</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {frota.map((v) => {
                const s = SIT[v.situacao as keyof typeof SIT] ?? SIT.indisponivel;
                return (
                  <tr key={v.id} className="border-b border-branco/5 last:border-0">
                    <td className="tempo px-4 py-3 font-semibold text-branco">{v.prefixo}</td>
                    <td className="px-4 py-3 text-branco/60">{TIPO[v.tipo] ?? v.tipo}</td>
                    <td className="px-4 py-3 text-branco/60">{v.cia_id ? `${v.cia_id}ª Cia` : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <DataState
          icon={<Truck size={28} />}
          titulo="Sem dados de frota"
          texto="A matriz MOTOMEC alimenta esta tela com a disponibilidade de viaturas por Cia e turno."
        />
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Módulos logísticos (P4)
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <ClipboardList size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{logSummary.lsmAbertas}</p>
          <p className="text-xs text-branco/55">LSM em aberto · {logSummary.lsmTotal} total</p>
        </Card>
        <Card>
          <Trash2 size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{logSummary.descargaEmAndamento}</p>
          <p className="text-xs text-branco/55">Descargas em andamento · {logSummary.descargaTotal} total</p>
        </Card>
        <Card>
          <PackageSearch size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{logSummary.inventarioAbertos}</p>
          <p className="text-xs text-branco/55">Inventários abertos · {logSummary.inventarioTotal} total</p>
        </Card>
      </div>
      <p className="mt-4 text-xs text-branco/40">
        Requisição de material (LSM), descarga de bens (rito de 8 etapas) e inventário anual — dado
        real do banco (schema SOIC). Zerado até o P4 abrir o primeiro processo.
      </p>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-ouro">
        Motomec — operacional (Abastecimento, Empenhos, Acidentes, Descarga)
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Fuel size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">
            {motomecOp.abastecimento.totalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-xs text-branco/55">
            Combustível/produtos · {motomecOp.abastecimento.transacoes} transações em {motomecOp.abastecimento.viaturas} viatura(s)
          </p>
          {motomecOp.abastecimento.periodoInicio && motomecOp.abastecimento.periodoFim ? (
            <p className="text-[11px] text-branco/35">
              {new Date(motomecOp.abastecimento.periodoInicio).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              {" – "}
              {new Date(motomecOp.abastecimento.periodoFim).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </p>
          ) : null}
        </Card>
        <Card>
          <ReceiptText size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{motomecOp.empenhosTotal}</p>
          <p className="text-xs text-branco/55">Notas de empenho de manutenção/aquisição (2026)</p>
        </Card>
        <Card>
          <FileWarning size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{motomecOp.acidentesTotal}</p>
          <p className="text-xs text-branco/55">Acidentes de trânsito com viatura moto (2023–2026)</p>
        </Card>
        <Card>
          <Trash2 size={18} className="text-azul" strokeWidth={1.75} />
          <p className="mt-3 text-2xl font-extrabold text-branco">{motomecOp.descarga.emAndamento}</p>
          <p className="text-xs text-branco/55">
            Viaturas em processo de descarga · {motomecOp.descarga.finalizada} finalizadas
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-branco/40">
            Empenhos recentes (manutenção/aquisição)
          </p>
          {motomecOp.empenhos.length > 0 ? (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {motomecOp.empenhos.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-branco/5 last:border-0">
                    <td className="px-4 py-2 font-semibold text-branco">{e.prefixo ?? "—"}</td>
                    <td className="px-4 py-2 text-branco/60">{e.marca} {e.modelo}</td>
                    <td className="px-4 py-2 text-right text-branco/60">
                      {Number(e.valor_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-xs text-branco/40">Sem empenhos carregados.</p>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-branco/40">
            Acidentes de trânsito com moto (mais recentes)
          </p>
          {motomecOp.acidentes.length > 0 ? (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {motomecOp.acidentes.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-branco/5 last:border-0">
                    <td className="px-4 py-2 font-semibold text-branco">{a.unidade}</td>
                    <td className="px-4 py-2 text-branco/60">
                      {a.data_acidente ? new Date(a.data_acidente).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-branco/60 capitalize">{a.lesao_pm ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-xs text-branco/40">Sem acidentes carregados.</p>
          )}
        </Card>
      </div>

      <p className="mt-3 flex items-center gap-1 text-xs text-branco/40">
        <Repeat2 size={12} /> {motomecOp.remanejamento.total} viatura(s) excedente(s) em avaliação de remanejamento
        ({motomecOp.remanejamento.pendente} com remanejamento suspenso/mantido na Cia).
      </p>

      <ListaDocumentosSecao secao="logistica" />
    </div>
  );
}
