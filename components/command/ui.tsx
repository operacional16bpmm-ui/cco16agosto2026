import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cabeçalho padrão de página da Sala de Comando. */
export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-branco">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-branco/50">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-branco/10 bg-tatico-super p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

const NIVEIS = {
  critical: "border-vermelho/40 bg-vermelho/10 text-vermelho",
  urgent: "border-orange-500/40 bg-orange-500/10 text-orange-600",
  attention: "border-ouro/40 bg-ouro/10 text-ouro",
  informative: "border-azul/40 bg-azul/10 text-azul",
  neutro: "border-branco/15 bg-branco/5 text-branco/60",
  ok: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700",
} as const;

export function Badge({
  children,
  tone = "neutro",
}: {
  children: ReactNode;
  tone?: keyof typeof NIVEIS;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        NIVEIS[tone]
      )}
    >
      {children}
    </span>
  );
}

/** Estado vazio honesto — usado enquanto o Supabase não está conectado / sem dados. */
export function DataState({
  icon,
  titulo,
  texto,
}: {
  icon?: ReactNode;
  titulo: string;
  texto?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-branco/15 bg-tatico-super/20 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-branco/30">{icon}</div>}
      <p className="text-sm font-semibold text-branco/70">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-xs text-branco/45">{texto}</p>}
    </div>
  );
}
