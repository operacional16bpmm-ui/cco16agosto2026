"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";

import { ROTULO_SUBUNIDADE } from "@/lib/cop2026";
import {
  JANELA_ATENCAO_MAX_DIAS,
  JANELA_ATENCAO_MIN_DIAS,
} from "@/lib/cop2026-metricas";
import {
  salvarJanelaAtencaoAction,
  salvarParametroAction,
  type ManejoState,
} from "../lancamentos/actions";

/**
 * Metas por fração e período.
 *
 * O aviso de fonte no topo não é decoração: enquanto `COP2026_FONTE` for
 * `planilha`, quem manda no painel é a `MATRIZ_PROPORCIONAL_2026` do código, e
 * editar aqui não muda número nenhum na tela do Comando. Tela que promete o que
 * não entrega é pior que tela que não existe.
 */

export type LinhaParametro = {
  periodo: string;
  subunidade: string;
  efetivo: number;
  evidenciasPorTurno: number;
  turnos: number;
  dias: number;
  meta: number;
  atualizadoPor: string | null;
  atualizadoEm: string | null;
};

const vazio: ManejoState = { ok: false, error: null, aviso: null };

export function PainelParametros({
  periodo,
  itens,
  fonte,
  janelaAtencaoDias,
}: {
  periodo: string;
  itens: LinhaParametro[];
  fonte: "planilha" | "uniao" | "banco";
  janelaAtencaoDias: number;
}) {
  const [estado, acao] = useActionState(salvarParametroAction, vazio);
  const [estadoAtencao, acaoAtencao] = useActionState(salvarJanelaAtencaoAction, vazio);
  const total = itens.reduce((s, i) => s + i.meta, 0);
  const efetivo = itens.reduce((s, i) => s + i.efetivo, 0);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
            Metas do período {periodo}
          </h1>
          <p className="mt-1 text-[13px] text-texto-suave">
            Substitui a aba “Parametros” da planilha. A meta é gravada como decisão do Comando, não
            recalculada a partir do efetivo.
          </p>
        </div>
        <p className="text-[12px] text-texto-suave">
          Meta total <span className="dados-destaque">{total}</span> · efetivo{" "}
          <span className="dados">{efetivo}</span>
        </p>
      </div>

      {fonte === "planilha" && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-atencao/40 bg-sinal-atencao-suave px-4 py-3 text-[12.5px] leading-relaxed text-sinal-atencao">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>A fonte do painel ainda é a planilha</strong> (COP2026_FONTE não definida).
            Editar aqui grava no banco, mas o painel continua usando a matriz do código. A edição
            passa a valer quando a fonte virar <span className="dados">uniao</span> ou{" "}
            <span className="dados">banco</span>.
          </span>
        </p>
      )}

      {estado.error && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13px] text-sinal-critico">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {estado.error}
        </p>
      )}
      {estado.aviso && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-conforme/40 bg-sinal-conforme-suave px-4 py-3 text-[13px] text-sinal-conforme">
          <Check size={15} className="mt-0.5 shrink-0" aria-hidden /> {estado.aviso}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="border-b border-borda text-[11px] uppercase tracking-wide text-texto-suave">
            <tr>
              <th className="px-4 py-3">Fração</th>
              <th className="px-4 py-3">Efetivo</th>
              <th className="px-4 py-3">Evid./turno</th>
              <th className="px-4 py-3">Turnos</th>
              <th className="px-4 py-3">Dias</th>
              <th className="px-4 py-3">Meta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-texto-suave">
                  Nenhum parâmetro gravado para {periodo}. O painel usa a matriz padrão.
                </td>
              </tr>
            )}
            {itens.map((p) => (
              <tr key={p.subunidade} className="border-b border-borda/60 last:border-0">
                <td className="px-4 py-3 font-semibold">
                  {ROTULO_SUBUNIDADE[p.subunidade] ?? p.subunidade}
                  {p.atualizadoPor && (
                    <span className="block text-[11px] text-texto-suave">
                      por {p.atualizadoPor}
                    </span>
                  )}
                </td>
                <td colSpan={6} className="px-4 py-3">
                  <form action={acao} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="periodo" value={p.periodo} />
                    <input type="hidden" name="subunidade" value={p.subunidade} />
                    <Numero nome="efetivo" valor={p.efetivo} />
                    <Numero nome="evidenciasPorTurno" valor={p.evidenciasPorTurno} />
                    <Numero nome="turnos" valor={p.turnos} />
                    <Numero nome="dias" valor={p.dias} />
                    <Numero nome="meta" valor={p.meta} destaque />
                    <button
                      type="submit"
                      className="min-h-9 rounded border border-borda px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                    >
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* -------------------------------------------------------------------
       * JANELA DA CAIXA "PONTOS DE ATENÇÃO".
       *
       * Não é meta, é decisão de UI do painel — por isso mora fora da tabela
       * de metas e num cookie, não em migration nova (ver
       * `lib/cop2026-config-atencao.ts`). Determinação do Maj PM em 02/09:
       * um lançamento isolado no dia 2 não é padrão, então a janela mínima
       * para caracterizar padrão é uma semana, e o corte fica editável aqui.
       * ---------------------------------------------------------------- */}
      <section className="space-y-3 rounded-xl border border-borda bg-tatico-super p-5">
        <header>
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-branco">
            Janela do padrão de atenção
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-texto-suave">
            Dias corridos que a caixa <strong>Pontos de atenção</strong> do painel usa para
            listar quem NÃO auditou, quem ficou <em>abaixo do mínimo</em> e quem confeccionou
            parte. Enquanto o período em curso for menor que essa janela, os cartões mostram
            &quot;em curso&quot; em vez de nomes — um lançamento isolado no primeiro dia do mês
            não é padrão de conduta.
          </p>
          <p className="mt-1 text-[12px] text-texto-suave">
            Vale entre {JANELA_ATENCAO_MIN_DIAS} e {JANELA_ATENCAO_MAX_DIAS} dias · atual:{" "}
            <strong className="dados text-branco">{janelaAtencaoDias}</strong>
          </p>
        </header>

        {estadoAtencao.error && (
          <p className="flex items-start gap-2 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-3 py-2 text-[12.5px] text-sinal-critico">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />{" "}
            {estadoAtencao.error}
          </p>
        )}
        {estadoAtencao.aviso && (
          <p className="flex items-start gap-2 rounded-lg border border-sinal-conforme/40 bg-sinal-conforme-suave px-3 py-2 text-[12.5px] text-sinal-conforme">
            <Check size={14} className="mt-0.5 shrink-0" aria-hidden /> {estadoAtencao.aviso}
          </p>
        )}

        <form action={acaoAtencao} className="flex flex-wrap items-center gap-2">
          <label className="text-[12px] font-bold uppercase tracking-wide text-texto-suave">
            Janela (dias)
          </label>
          <input
            name="janelaAtencaoDias"
            type="number"
            min={JANELA_ATENCAO_MIN_DIAS}
            max={JANELA_ATENCAO_MAX_DIAS}
            defaultValue={janelaAtencaoDias}
            required
            className="min-h-10 w-24 rounded border border-borda bg-transparent px-2 py-1 text-right dados text-branco"
          />
          <button
            type="submit"
            className="min-h-10 rounded-md border border-vermelho bg-vermelho/10 px-4 py-2 text-[12.5px] font-bold uppercase tracking-wide text-vermelho hover:bg-vermelho/15"
          >
            Salvar janela
          </button>
        </form>
      </section>
    </div>
  );
}

function Numero({
  nome,
  valor,
  destaque,
}: {
  nome: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <input
      name={nome}
      defaultValue={valor}
      inputMode="numeric"
      aria-label={nome}
      className={`min-h-9 w-20 rounded border px-2 py-1 text-right dados ${
        destaque ? "border-vermelho/40 text-vermelho" : "border-borda text-branco"
      } bg-transparent`}
    />
  );
}
