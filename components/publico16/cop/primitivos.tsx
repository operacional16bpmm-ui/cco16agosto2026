"use client";

import { useId, useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Minus,
} from "lucide-react";
import { ROTULO_NIVEL, type Nivel } from "@/lib/cop2026-metricas";
import { cn } from "@/lib/utils";

/** Semáforo com rótulo, ponto e ícone SVG nativo: máxima acessibilidade
 *  e leitura imediata para daltônicos e relatórios impressos em P&B. */
const CLASSES_NIVEL: Record<Nivel, string> = {
  conforme: "bg-sinal-conforme-suave text-sinal-conforme border-sinal-conforme/40 font-semibold",
  atencao: "bg-sinal-atencao-suave text-sinal-atencao border-sinal-atencao/40 font-semibold",
  critico: "bg-sinal-critico-suave text-sinal-critico border-sinal-critico/40 font-semibold",
  neutro: "bg-sinal-neutro-suave text-sinal-neutro border-sinal-neutro/30 font-medium",
};

export const COR_NIVEL: Record<Nivel, string> = {
  conforme: "var(--sinal-conforme)",
  atencao: "var(--sinal-atencao)",
  critico: "var(--sinal-critico)",
  neutro: "var(--sinal-neutro)",
};

const ICONES_NIVEL = {
  conforme: <CheckCircle2 size={12} className="shrink-0" aria-hidden />,
  atencao: <AlertTriangle size={12} className="shrink-0" aria-hidden />,
  critico: <AlertCircle size={12} className="shrink-0" aria-hidden />,
  neutro: <Minus size={12} className="shrink-0" aria-hidden />,
} as const;

export function Selo({
  nivel,
  texto,
  semIcone,
}: {
  nivel: Nivel;
  texto?: string;
  semIcone?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] shadow-xs tracking-tight",
        CLASSES_NIVEL[nivel]
      )}
    >
      {!semIcone && ICONES_NIVEL[nivel]}
      {texto ?? ROTULO_NIVEL[nivel]}
    </span>
  );
}

/** O painel mostra estatística de processo (±3σ, p90, Pareto) para um público
 *  de Comando, não de estatística. Cada gráfico carrega o próprio manual. */
export function ComoLer({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <div className="relative nao-imprime">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={id}
        className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-[11px] font-semibold text-texto-suave transition-colors hover:border-vermelho/40 hover:text-vermelho"
      >
        <HelpCircle size={13} aria-hidden />
        Como ler
      </button>
      {aberto && (
        <div
          id={id}
          role="note"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-borda bg-tatico-super p-3 text-[12.5px] leading-relaxed text-texto-suave shadow-inst"
        >
          <p className="mb-1 font-semibold text-branco">{titulo}</p>
          {children}
        </div>
      )}
    </div>
  );
}

export function Cartao({
  titulo,
  nota,
  ajuda,
  conclusao,
  children,
  className,
}: {
  titulo: string;
  nota?: string;
  ajuda?: React.ReactNode;
  conclusao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "cartao-painel flex flex-col rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all",
        className
      )}
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-branco tracking-wide">
            {titulo}
          </h3>
          {nota && <p className="text-[12px] font-medium text-texto-suave">{nota}</p>}
        </div>
        {ajuda && (
          <div className="ml-auto">
            <ComoLer titulo={titulo}>{ajuda}</ComoLer>
          </div>
        )}
      </header>

      <div className="flex-1">{children}</div>

      {conclusao && (
        <footer className="mt-4 border-t border-borda/60 pt-3 text-[12.5px] leading-relaxed text-texto-suave">
          {conclusao}
        </footer>
      )}
    </section>
  );
}

export function SemDados({ texto = "Sem lançamentos no recorte." }: { texto?: string }) {
  return (
    <p className="flex h-40 items-center justify-center rounded-lg border border-dashed border-borda text-[13.5px] text-texto-suave">
      {texto}
    </p>
  );
}
