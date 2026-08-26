"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { ROTULO_NIVEL, type Nivel } from "@/lib/cop2026-metricas";
import { cn } from "@/lib/utils";

/** Semáforo sempre com rótulo e ponto: cor sozinha não sobrevive ao daltonismo
 *  nem à impressão em preto e branco da reunião de Comando. */
const CLASSES_NIVEL: Record<Nivel, string> = {
  conforme: "bg-sinal-conforme-suave text-sinal-conforme border-sinal-conforme/30",
  atencao: "bg-sinal-atencao-suave text-sinal-atencao border-sinal-atencao/30",
  critico: "bg-sinal-critico-suave text-sinal-critico border-sinal-critico/30",
  neutro: "bg-sinal-neutro-suave text-sinal-neutro border-sinal-neutro/25",
};

export const COR_NIVEL: Record<Nivel, string> = {
  conforme: "var(--sinal-conforme)",
  atencao: "var(--sinal-atencao)",
  critico: "var(--sinal-critico)",
  neutro: "var(--sinal-neutro)",
};

export function Selo({ nivel, texto }: { nivel: Nivel; texto?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        CLASSES_NIVEL[nivel]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
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
        "cartao-painel flex flex-col rounded-xl border border-borda bg-tatico-super p-5 shadow-inst",
        className
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-[15px] font-bold uppercase tracking-wide text-branco">
            {titulo}
          </h3>
          {nota && <p className="mt-0.5 text-[12.5px] text-texto-suave">{nota}</p>}
        </div>
        {ajuda && <ComoLer titulo={titulo}>{ajuda}</ComoLer>}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      {conclusao && (
        <p className="mt-4 border-l-2 border-vermelho/50 pl-3 text-[12.5px] leading-relaxed text-texto-suave">
          {conclusao}
        </p>
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
