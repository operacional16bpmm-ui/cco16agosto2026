import { Signal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader, Card, Badge } from "@/components/command/ui";
import { getFontes } from "@/lib/db";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Frescor das Fontes · CCO-16" };
export const dynamic = "force-dynamic";

const TOM = { online: "ok", atrasado: "attention", offline: "neutro" } as const;
const LABEL = { online: "online", atrasado: "atrasado", offline: "sem sinal" } as const;

function fmtLatencia(min: number) {
  if (min >= 60) return `${Math.round(min / 60)} h`;
  return `${min} min`;
}

export default async function FontesPage() {
  await exigirPagina("/fontes");
  const fontes = await getFontes();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Frescor das Fontes"
        descricao="O CCO é tão bom quanto o pior cadastro que consome. Cada fonte mostra dono, latência máxima e há quanto tempo foi atualizada — dado velho fica em alerta."
        acao={<Badge tone="neutro"><Signal size={12} /> {fontes.length} fontes monitoradas</Badge>}
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-branco/10 text-left text-[11px] uppercase tracking-wide text-branco/40">
              <th className="px-4 py-3 font-semibold">Fonte</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Latência máx.</th>
              <th className="px-4 py-3 font-semibold">Atualizado</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => {
              const status = (f.status ?? "offline") as keyof typeof TOM;
              return (
                <tr key={f.codigo} className="border-b border-branco/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-branco">{f.nome}</td>
                  <td className="px-4 py-3 text-branco/55">{f.categoria}</td>
                  <td className="tempo px-4 py-3 text-branco/55">{fmtLatencia(f.latencia_max_min)}</td>
                  <td className="tempo px-4 py-3 text-branco/55">
                    {f.last_update_at
                      ? `há ${formatDistanceToNow(new Date(f.last_update_at), { locale: ptBR })}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TOM[status]}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {LABEL[status]}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {fontes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-branco/40">
                  Sem fontes cadastradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="mt-4 text-xs text-branco/40">
        O status vem do coletor/integrações. Enquanto não há sinal, a fonte fica{" "}
        <span className="text-branco/60">sem sinal</span> — nunca &ldquo;online&rdquo; sem dado real.
      </p>
    </div>
  );
}
