"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Info, ShieldOff } from "lucide-react";

import {
  bloquearVinculoAction,
  confirmarVinculoAction,
  type ManejoState,
} from "../lancamentos/actions";
/* Tipo declarado aqui e não importado de lib/db/cop2026-auditor: aquele módulo
   é `server-only` e este componente roda no navegador. `import type` seria
   apagado no build, mas deixar a seta apontando para lá convida o próximo a
   importar um valor junto — e aí o cliente de service role entra no bundle. */
export type Vinculo = {
  email: string;
  re_base: string;
  re: string | null;
  nome_guerra: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
  bloqueado: boolean;
  re_fora_do_efetivo: boolean;
  criado_em: string;
};

const vazio: ManejoState = { ok: false, error: null, aviso: null };

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function quando(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATA.format(d);
}

export function FilaVinculos({
  itens,
  erro,
  exigindo,
}: {
  itens: Vinculo[];
  erro: string | null;
  exigindo: boolean;
}) {
  const [confirmar, acaoConfirmar] = useActionState(confirmarVinculoAction, vazio);
  const [bloquear, acaoBloquear] = useActionState(bloquearVinculoAction, vazio);
  const estado = confirmar.error ? confirmar : bloquear;

  const pendentes = itens.filter((i) => !i.confirmado_em && !i.bloqueado).length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
            Vínculo conta ↔ RE
          </h1>
          <p className="mt-1 text-[13px] text-texto-suave">
            Quem lançou com a conta Google e qual RE declarou. Confirmar é atestar que a conta
            pertence àquele policial.
          </p>
        </div>
        <p className="text-[12px] text-texto-suave">
          <span className="dados-destaque">{pendentes}</span> pendente
          {pendentes === 1 ? "" : "s"} · <span className="dados">{itens.length}</span> na fila
        </p>
      </div>

      {/* O estado do gate precisa estar na tela: sem isto, o Comando confirma
          vínculos achando que está liberando lançamentos que já estavam
          contando — ou o contrário, que é pior. */}
      <p
        className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-[12.5px] leading-relaxed ${
          exigindo
            ? "border-sinal-atencao/40 bg-sinal-atencao-suave text-sinal-atencao"
            : "border-borda text-texto-suave"
        }`}
      >
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
        {exigindo ? (
          <span>
            <strong>Exigência ligada</strong> (COP2026_EXIGIR_VINCULO=1): lançamento de vínculo não
            confirmado <strong>não entra na meta</strong> até o clique nesta tela.
          </span>
        ) : (
          <span>
            <strong>Exigência desligada:</strong> a fila é registrada e operável, mas todo
            lançamento conta na meta. O roster do Batalhão não tem e-mail de ninguém (0 de 570
            linhas), então não há semente de vínculo — ligar a exigência hoje faria o painel abrir
            zerado. Ligue quando a fila estiver madura.
          </span>
        )}
      </p>

      {erro && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13px] text-sinal-critico">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}
      {estado.error && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13px] text-sinal-critico">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {estado.error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-borda text-[11px] uppercase tracking-wide text-texto-suave">
            <tr>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">RE declarado</th>
              <th className="px-4 py-3">Primeiro lançamento</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-texto-suave">
                  Nenhuma conta lançou com login ainda.
                </td>
              </tr>
            )}
            {itens.map((v) => (
              <tr key={v.email} className="border-b border-borda/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="dados">{v.email}</span>
                  {v.nome_guerra && (
                    <span className="block text-[11.5px] text-texto-suave">{v.nome_guerra}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="dados">{v.re ?? v.re_base}</span>
                  {/* Nada de marcar "fora do efetivo" na tela: a relação de
                      19/07 é BASE de apoio, não verdade. Vale o RE que o
                      policial declara (mesma regra da fração declarada, ver
                      verificar:unidade-declarada). O flag continua gravado em
                      `re_fora_do_efetivo` para a trilha, e nunca vira aviso. */}
                </td>
                <td className="px-4 py-3 text-texto-suave">{quando(v.criado_em)}</td>
                <td className="px-4 py-3 text-[11.5px]">
                  {v.bloqueado ? (
                    <span className="rounded border border-sinal-critico/40 px-1.5 py-0.5 text-sinal-critico">
                      Bloqueado
                    </span>
                  ) : v.confirmado_em ? (
                    <span className="rounded border border-sinal-conforme/40 px-1.5 py-0.5 text-sinal-conforme">
                      Confirmado {quando(v.confirmado_em)}
                    </span>
                  ) : (
                    <span className="rounded border border-sinal-atencao/40 px-1.5 py-0.5 text-sinal-atencao">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {!v.confirmado_em && !v.bloqueado && (
                      <form action={acaoConfirmar}>
                        <input type="hidden" name="email" value={v.email} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded border border-sinal-conforme/50 px-2 py-1.5 text-[11.5px] font-bold text-sinal-conforme"
                        >
                          <Check size={12} aria-hidden /> Confirmar
                        </button>
                      </form>
                    )}
                    <form action={acaoBloquear}>
                      <input type="hidden" name="email" value={v.email} />
                      <input type="hidden" name="bloquear" value={v.bloqueado ? "0" : "1"} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded border border-borda px-2 py-1.5 text-[11.5px] font-bold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                      >
                        <ShieldOff size={12} aria-hidden />
                        {v.bloqueado ? "Desbloquear" : "Bloquear"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
