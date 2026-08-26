"use client";

import { useActionState, useState } from "react";
import { ClipboardList, Plus, Clock, CheckCircle2, CircleDot, AlertTriangle } from "lucide-react";
import { Card } from "@/components/command/ui";
import {
  criarLancamentoAction,
  atualizarStatusLancamentoAction,
  type LancamentoState,
} from "./actions";
import type { Lancamento } from "@/lib/db/companhia";

const inicial: LancamentoState = { ok: false, error: null };
const campo =
  "w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul focus:ring-1 focus:ring-azul";
const rotulo = "mb-1 block text-xs font-semibold uppercase tracking-wide text-branco/55";

const TIPO_ROTULO: Record<Lancamento["tipo"], string> = {
  pendencia: "Pendência",
  ocorrencia_relevante: "Ocorrência relevante",
  justificativa_meta: "Justificativa de meta",
  nota_escala: "Nota de escala",
};

const STATUS_INFO: Record<
  Lancamento["status"],
  { rotulo: string; classe: string; Icon: typeof CircleDot }
> = {
  aberto: { rotulo: "Aberto", classe: "text-ouro", Icon: CircleDot },
  em_andamento: { rotulo: "Em andamento", classe: "text-azul", Icon: Clock },
  concluido: { rotulo: "Concluído", classe: "text-emerald-500", Icon: CheckCircle2 },
};

function prazoVencido(prazo: string | null, status: Lancamento["status"]): boolean {
  if (!prazo || status === "concluido") return false;
  return prazo < new Date().toISOString().slice(0, 10);
}

/**
 * Quadro de lançamentos da unidade: o que a Companhia presta conta e que não
 * cabe nas planilhas ingeridas. Só aparece editável para quem pode lançar
 * (`podeEditar`, decidido no server pela página); os demais perfis veem a
 * lista em leitura.
 */
export function QuadroLancamentos({
  unidade,
  lancamentos,
  podeEditar,
}: {
  unidade: string;
  lancamentos: Lancamento[];
  podeEditar: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(criarLancamentoAction, inicial);

  const emAberto = lancamentos.filter((l) => l.status !== "concluido");
  const concluidos = lancamentos.filter((l) => l.status === "concluido");

  return (
    <Card className="mt-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-branco">
          <ClipboardList size={16} className="text-azul" /> Pendências e lançamentos da unidade
        </h2>
        {podeEditar && (
          <button
            onClick={() => setAberto((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-branco/15 px-2.5 py-1.5 text-xs font-semibold text-branco/80 transition-colors hover:bg-branco/8"
          >
            <Plus size={13} /> {aberto ? "Fechar" : "Novo lançamento"}
          </button>
        )}
      </div>

      {podeEditar && aberto && (
        <form action={action} className="mb-5 grid gap-3 rounded-lg border border-branco/10 bg-tatico-fundo/40 p-4 sm:grid-cols-2">
          <input type="hidden" name="unidade" value={unidade} />
          <div>
            <label className={rotulo} htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" className={campo} defaultValue="pendencia">
              {Object.entries(TIPO_ROTULO).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="prazo">Prazo (opcional)</label>
            <input id="prazo" name="prazo" type="date" className={campo} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="titulo">Título</label>
            <input id="titulo" name="titulo" className={campo} placeholder="Resumo objetivo" required />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="texto">Detalhamento (opcional)</label>
            <textarea id="texto" name="texto" rows={3} className={campo} placeholder="Contexto, providências, responsável…" />
          </div>

          {state.error && (
            <p className="sm:col-span-2 rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-2 text-sm text-vermelho">{state.error}</p>
          )}
          {state.ok && (
            <p className="sm:col-span-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-600">Lançamento registrado.</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="sm:col-span-2 rounded-md bg-azul px-4 py-2 text-sm font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-50"
          >
            {pending ? "Registrando…" : "Registrar lançamento"}
          </button>
        </form>
      )}

      {lancamentos.length === 0 ? (
        <p className="py-8 text-center text-sm text-branco/40">Nenhum lançamento nesta unidade.</p>
      ) : (
        <div className="space-y-2">
          {[...emAberto, ...concluidos].map((l) => (
            <LinhaLancamento key={l.id} lancamento={l} unidade={unidade} podeEditar={podeEditar} />
          ))}
        </div>
      )}
    </Card>
  );
}

function LinhaLancamento({
  lancamento: l,
  unidade,
  podeEditar,
}: {
  lancamento: Lancamento;
  unidade: string;
  podeEditar: boolean;
}) {
  const [, action, pending] = useActionState(atualizarStatusLancamentoAction, inicial);
  const info = STATUS_INFO[l.status];
  const vencido = prazoVencido(l.prazo, l.status);

  return (
    <div className="rounded-lg border border-branco/10 bg-tatico-fundo/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1 text-[11px] font-semibold ${info.classe}`}>
              <info.Icon size={12} /> {info.rotulo}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-branco/35">{TIPO_ROTULO[l.tipo]}</span>
            {vencido && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-vermelho">
                <AlertTriangle size={11} /> prazo vencido
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-branco">{l.titulo}</p>
          {l.texto && <p className="mt-0.5 text-xs text-branco/60">{l.texto}</p>}
          <p className="mt-1 text-[10px] text-branco/35">
            {l.criado_por_usuario} · {new Date(l.criado_em).toLocaleDateString("pt-BR")}
            {l.prazo && ` · prazo ${new Date(l.prazo + "T00:00:00").toLocaleDateString("pt-BR")}`}
          </p>
        </div>

        {podeEditar && l.status !== "concluido" && (
          <form action={action} className="flex shrink-0 items-center gap-1.5">
            <input type="hidden" name="unidade" value={unidade} />
            <input type="hidden" name="id" value={l.id} />
            {l.status === "aberto" && (
              <button name="status" value="em_andamento" disabled={pending} className="rounded border border-branco/15 px-2 py-1 text-[10px] text-branco/70 hover:bg-branco/8">
                Andamento
              </button>
            )}
            <button name="status" value="concluido" disabled={pending} className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-500 hover:bg-emerald-500/10">
              Concluir
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
