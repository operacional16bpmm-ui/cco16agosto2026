import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/command/ui";
import { cn } from "@/lib/utils";

export type KpiItem = {
  icon: LucideIcon;
  rotulo: string;
  valor: number | null;
  /** Variação % vs mês anterior (lib/db/secao.ts, deltaMesAnterior). */
  deltaPct?: number | null;
  tone?: "critical" | "ok" | "informative" | "attention" | "neutro";
  nota?: string;
};

const DESTAQUE_CLASSES: Record<NonNullable<KpiItem["tone"]>, string | undefined> = {
  critical: "border-vermelho/30 bg-vermelho/5",
  ok: "border-emerald-400/30 bg-emerald-400/5",
  informative: undefined,
  attention: undefined,
  neutro: undefined,
};

/** Faixa de 4 (ou mais) cards de KPI — mesmo padrão visual da página P2,
 * generalizado para qualquer seção, com variação vs mês anterior opcional. */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ icon: Icon, rotulo, valor, deltaPct, tone = "neutro", nota }) => (
        <Card key={rotulo} className={DESTAQUE_CLASSES[tone]}>
          <div className="flex items-center justify-between">
            <Icon size={18} className="text-azul" strokeWidth={1.75} />
            {deltaPct != null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] font-semibold",
                  deltaPct >= 0 ? "text-emerald-700" : "text-vermelho"
                )}
              >
                {deltaPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(deltaPct)}%
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-4 text-3xl font-extrabold tracking-tight",
              valor != null ? "text-branco" : "text-branco/25"
            )}
          >
            {valor ?? "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-branco/80">{rotulo}</p>
          {nota && <p className="text-[11px] uppercase tracking-wide text-branco/40">{nota}</p>}
        </Card>
      ))}
    </div>
  );
}
