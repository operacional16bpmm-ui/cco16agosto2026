"use client";

import { useActionState } from "react";
import { createCameraAction, type CameraState } from "./actions";

const inicial: CameraState = { ok: false, error: null };
const campo =
  "w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul focus:ring-1 focus:ring-azul";
const rotulo = "mb-1 block text-xs font-semibold uppercase tracking-wide text-branco/55";

export function CameraForm({ desabilitado }: { desabilitado?: boolean }) {
  const [state, action, pending] = useActionState(createCameraAction, inicial);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={rotulo} htmlFor="identificacao">Identificação / ponto</label>
        <input id="identificacao" name="identificacao" className={campo} placeholder="Ex.: Padaria — Av. X, 100" required disabled={desabilitado} />
      </div>
      <div>
        <label className={rotulo} htmlFor="origem">Origem</label>
        <select id="origem" name="origem" className={campo} defaultValue="comercio" disabled={desabilitado}>
          <option value="comercio">Comércio</option>
          <option value="condominio">Condomínio</option>
          <option value="conseg">CONSEG</option>
          <option value="vizinhanca_solidaria">Vizinhança Solidária</option>
          <option value="outros">Outros</option>
        </select>
      </div>
      <div>
        <label className={rotulo} htmlFor="endereco">Endereço</label>
        <input id="endereco" name="endereco" className={campo} placeholder="Logradouro, número, bairro" required disabled={desabilitado} />
      </div>
      <div>
        <label className={rotulo} htmlFor="contato">Contato do responsável</label>
        <input id="contato" name="contato" className={campo} placeholder="Nome / telefone (opcional)" disabled={desabilitado} />
      </div>
      <label className="flex items-center gap-2 text-sm text-branco/70">
        <input type="checkbox" name="tem_ocr" className="accent-azul" disabled={desabilitado} />
        Possui leitura de placa (OCR)
      </label>

      {state.error && (
        <p className="rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-2 text-sm text-vermelho">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-700">Câmera proposta com sucesso — aguardando homologação.</p>
      )}

      <button
        type="submit"
        disabled={pending || desabilitado}
        className="w-full rounded-md bg-azul px-4 py-2 text-sm font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-50"
      >
        {desabilitado ? "Conecte o Supabase para cadastrar" : pending ? "Enviando…" : "Propor câmera"}
      </button>
    </form>
  );
}
