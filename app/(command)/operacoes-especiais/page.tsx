import { CalendarClock, MapPin, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getOperacoesEspeciais } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Operação Especial · CCO-16" };
export const dynamic = "force-dynamic";

const TOM = { planejada: "informative", ativa: "critical", encerrada: "neutro", cancelada: "neutro" } as const;
const LABEL = { planejada: "Planejada", ativa: "Ativa", encerrada: "Encerrada", cancelada: "Cancelada" } as const;

export default async function OperacoesEspeciaisPage() {
  await exigirPagina("/operacoes-especiais");
  const ops = await getOperacoesEspeciais();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Operação Especial"
        descricao="Modo dedicado a picos de demanda — jogos, manifestações, eventos institucionais. Efetivo de reforço, câmeras do entorno e alertas priorizados."
        acao={<Badge tone="informative"><CalendarClock size={12} /> {ops.length} em curso/planejadas</Badge>}
      />

      {ops.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {ops.map((e) => {
            const status = e.status as keyof typeof TOM;
            return (
              <Card key={e.id}>
                <div className="flex items-center justify-between">
                  <Badge tone={TOM[status]}>{LABEL[status]}</Badge>
                  <span className="tempo text-xs text-branco/50">
                    {formatDistanceToNow(new Date(e.inicio), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-branco">{e.nome}</h2>
                <p className="text-xs uppercase tracking-wide text-branco/40">{e.tipo?.replace(/_/g, " ")}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-branco/60">
                  <MapPin size={13} /> {e.local}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-branco/60">
                  <Users size={13} /> {e.efetivo_reforco} PM de reforço
                </p>
              </Card>
            );
          })}
        </div>
      ) : (
        <DataState
          icon={<CalendarClock size={28} />}
          titulo="Nenhuma operação especial cadastrada"
          texto="Cadastre eventos de grande porte para ativar o modo de reforço e monitoramento dedicado."
        />
      )}
    </div>
  );
}
