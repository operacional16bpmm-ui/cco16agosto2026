import { ShieldAlert, AlertTriangle } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { PlanilhasArmamento } from "@/components/command/planilhas-armamento";
import { getReservaArmas, getReservaArmasCriticas } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Reserva de Armas · CCO-16" };
export const dynamic = "force-dynamic";

export default async function ReservaArmasPage() {
  await exigirPagina("/reserva-armas");
  const [armas, criticas] = await Promise.all([getReservaArmas(), getReservaArmasCriticas()]);
  const totalRetidas = armas.reduce((s, a) => s + (a.retidas ?? 0), 0);
  const totalCriticas = criticas.reduce((s, c) => s + (c.quantidade ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Reserva de Armas"
        descricao="Situação agregada do armamento na reserva — disponibilidade e itens retidos. Origem: P4 · Material Bélico (p4_material_belico, por Cia)."
        acao={
          <Badge tone={totalRetidas > 0 ? "attention" : "ok"}>
            <ShieldAlert size={12} /> {totalRetidas} retida(s)
          </Badge>
        }
      />

      <PlanilhasArmamento />

      {armas.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Disponíveis</th>
                <th className="px-4 py-3 font-semibold">Retidas</th>
                <th className="px-4 py-3 font-semibold">Referência</th>
              </tr>
            </thead>
            <tbody>
              {armas.map((a) => (
                <tr key={a.id} className="border-b border-branco/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-branco">{a.categoria}</td>
                  <td className="tempo px-4 py-3 text-branco/70">{a.total}</td>
                  <td className="tempo px-4 py-3">
                    <span className="font-semibold text-emerald-700">{a.disponiveis}</span>
                  </td>
                  <td className="tempo px-4 py-3">
                    <span className={a.retidas > 0 ? "font-semibold text-ouro" : "text-branco/50"}>
                      {a.retidas}
                    </span>
                  </td>
                  <td className="tempo px-4 py-3 text-branco/50">{a.data_referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <DataState
          icon={<ShieldAlert size={28} />}
          titulo="Sem dados de reserva de armas"
          texto="A situação agregada do armamento é derivada do Mapa de Material Bélico (P4)."
        />
      )}

      <p className="mt-4 text-xs text-branco/40">
        Detalhamento sensível de armamento não é exposto — apenas a situação agregada, conforme a
        classificação da fonte. &ldquo;Retidas&rdquo; = manutenção / aguardando descarga, dentro do
        universo em reserva. Armas em carga pessoal, BTL ou Cia (uso operacional corrente) não
        entram nesse total.
      </p>

      {criticas.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-branco/40">
            <AlertTriangle size={13} className="text-ouro" /> Situações críticas
            <Badge tone="attention">{totalCriticas} arma(s)</Badge>
          </h2>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="px-4 py-3 font-semibold">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {criticas.map((c) => (
                  <tr key={c.id} className="border-b border-branco/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-branco">{c.categoria}</td>
                    <td className="px-4 py-3 text-branco/70">{c.situacao}</td>
                    <td className="tempo px-4 py-3 font-semibold text-ouro">{c.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-4 text-xs text-branco/40">
            Armas do batalhão classificadas como apreendida, roubo, furto, extraviada ou não
            encontrada na planilha-fonte — situação jurídica/administrativa à parte, não fazem
            parte do par disponível/retida acima.
          </p>
        </>
      )}

      <ListaDocumentosSecao secao="reserva_armas" />
    </div>
  );
}
