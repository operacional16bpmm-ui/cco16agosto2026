"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Cartão do e-mail oficial da Agenda (operacional16bpmm@gmail.com), com botão
 * de copiar. É o dado mais repetido do tutorial — cada seção que for lançar
 * um convite de evento precisa dele exato, sem erro de digitação.
 */
export function BotaoCopiarEmail({ email }: { email: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(email);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard indisponível (permissão negada, contexto sem foco): o
      // e-mail segue visível em texto puro para copiar manualmente.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-ouro-velho/50 bg-azul-noite px-5 py-4 text-left transition-colors hover:border-ouro-velho"
    >
      <span className="font-mono text-base font-bold tracking-tight text-ouro sm:text-lg">
        {email}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-branco/70">
        {copiado ? (
          <>
            <Check size={16} className="text-ouro" /> Copiado
          </>
        ) : (
          <>
            <Copy size={16} className="transition-transform group-hover:scale-110" /> Copiar
          </>
        )}
      </span>
    </button>
  );
}
