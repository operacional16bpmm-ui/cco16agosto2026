"use client";

import { useActionState, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { Card } from "@/components/command/ui";
import { enviarEscalaAction, type EscalaState } from "./actions";
import type { Unidade } from "@/lib/unidades";

const inicial: EscalaState = { ok: false, error: null };

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FormularioEscala({ unidade }: { unidade: Unidade }) {
  const [state, action, pending] = useActionState(enviarEscalaAction, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card className="mb-5">
      <div className="mb-3 flex items-center gap-2">
        <UploadCloud size={16} className="text-azul" />
        <h2 className="text-sm font-bold text-branco">Enviar escala</h2>
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData);
          formRef.current?.reset();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="unidade" value={unidade} />

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-branco/45">
            Refere-se a
          </span>
          <select name="abrangencia" defaultValue="dia" className={entrada}>
            <option value="dia">Escala do dia</option>
            <option value="semana">Escala da semana</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-branco/45">
            Data de referência
          </span>
          <input type="date" name="dataReferencia" required defaultValue={hoje()} className={entrada} />
        </label>

        <label className="block sm:col-span-2 lg:col-span-2">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-branco/45">
            Arquivo (PDF ou imagem, até 15 MB)
          </span>
          <input
            type="file"
            name="arquivo"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco/80 file:mr-3 file:rounded file:border-0 file:bg-azul file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-branco"
          />
        </label>

        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={pending} className={botao}>
            {pending ? "Enviando…" : "Enviar escala"}
          </button>
        </div>
      </form>

      {state.error && (
        <p role="alert" className="mt-3 rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-2 text-xs text-vermelho">
          {state.error}
        </p>
      )}
      {state.ok && !state.error && (
        <p className="mt-3 text-xs font-medium text-emerald-500">Escala enviada e publicada para a unidade.</p>
      )}
    </Card>
  );
}

const entrada =
  "w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco outline-none focus:border-azul focus:ring-1 focus:ring-azul";

const botao =
  "inline-flex items-center gap-2 rounded-md bg-azul px-4 py-2 text-xs font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-60";
