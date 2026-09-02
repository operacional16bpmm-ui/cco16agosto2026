"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Database, Info } from "lucide-react";

import { RELATORIOS_MENSAIS } from "@/lib/cop2026-relatorios";
import type { ResultadoImportacao } from "@/lib/db/cop2026-importacao";
import { importarMesAction } from "./actions";

/**
 * Trazer a planilha para o banco, mês a mês.
 *
 * Dois botões por mês, e a ordem importa: CONFERIR faz todo o caminho e para
 * antes de gravar. Importação em lote sem prévia é como se assina um número
 * errado sem ver — e aqui o número vai para o painel do Comando.
 *
 * Rodar de novo não duplica: o hash da linha crua é único no banco. O contador
 * "já existiam" é a prova disso, e é ele que diz se o banco está em dia com a
 * fonte.
 */
export function PainelImportacao({
  fonte,
  porMes,
}: {
  fonte: "planilha" | "uniao" | "banco";
  /** Quanto já existe no banco, por mês — para saber o que falta trazer. */
  porMes: { chave: string; lancamentos: number; declarados: number }[];
}) {
  const [estado, acao, pendente] = useActionState<ResultadoImportacao | null, FormData>(
    importarMesAction,
    null
  );

  const noBanco = new Map(porMes.map((m) => [m.chave, m]));

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-5 py-6">
      {fonte === "planilha" ? (
        <p className="flex items-start gap-2 rounded-lg border border-amarelo/40 bg-amarelo/10 px-4 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amarelo" />
          <span>
            <strong>O painel ainda lê a planilha</strong> (COP2026_FONTE não definida). Importar
            aqui enche o banco, mas o número do Comando só passa a sair daqui quando a variável
            virar <code>banco</code>. Trazer primeiro, virar a chave depois — nessa ordem.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-lg border border-verde/40 bg-verde/10 px-4 py-3 text-[13px]">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-verde" />
          <span>
            O painel lê <strong>{fonte === "banco" ? "o banco" : "planilha + banco"}</strong>. Uma
            importação daqui muda o número do Comando na hora.
          </span>
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-texto-suave">
            <tr>
              <th className="px-4 py-2.5">Mês</th>
              <th className="px-4 py-2.5">Período</th>
              <th className="px-4 py-2.5 text-right">No banco</th>
              <th className="px-4 py-2.5 text-right">Declaradas</th>
              <th className="px-4 py-2.5 text-right">Importar</th>
            </tr>
          </thead>
          <tbody>
            {RELATORIOS_MENSAIS.map((m) => {
              const b = noBanco.get(m.chave);
              return (
                <tr key={m.chave} className="border-t border-white/10">
                  <td className="px-4 py-2.5 font-semibold">
                    {m.rotulo}/{m.ano}
                  </td>
                  <td className="px-4 py-2.5 text-texto-suave">
                    {m.periodo.de} → {m.periodo.ate}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b?.lancamentos ?? 0}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b?.declarados ?? 0}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <form action={acao}>
                        <input type="hidden" name="mes" value={m.chave} />
                        <input type="hidden" name="acao" value="conferir" />
                        <button
                          type="submit"
                          disabled={pendente}
                          className="rounded-md border border-white/20 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:border-white/50 disabled:opacity-40"
                        >
                          Conferir
                        </button>
                      </form>
                      <form action={acao}>
                        <input type="hidden" name="mes" value={m.chave} />
                        <input type="hidden" name="acao" value="gravar" />
                        <button
                          type="submit"
                          disabled={pendente}
                          className="rounded-md bg-vermelho px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          Importar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendente && <p className="text-[13px] text-texto-suave">Lendo a planilha…</p>}

      {estado && !estado.ok && (
        <p className="flex items-start gap-2 rounded-lg border border-vermelho/40 bg-vermelho/10 px-4 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-vermelho" />
          {estado.erro}
        </p>
      )}

      {estado?.ok && estado.resumo && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-[13px]">
          <p className="flex items-center gap-2 font-semibold">
            {estado.gravados === undefined ? (
              <Info className="h-4 w-4 text-azul" />
            ) : (
              <Check className="h-4 w-4 text-verde" />
            )}
            {estado.mes?.rotulo}/{estado.mes?.ano} —{" "}
            {estado.gravados === undefined ? "conferência (nada gravado)" : "importação concluída"}
          </p>

          <ul className="space-y-1 text-texto-suave">
            <li>
              Planilha: {estado.resumo.totalPlanilha} lançamentos · {estado.resumo.doPeriodo} dentro
              do mês
            </li>
            <li>
              As três réguas do mesmo mês — declarado{" "}
              <strong className="text-branco">{estado.resumo.declarados}</strong> · identificadores{" "}
              {estado.resumo.contados} · formato válido {estado.resumo.validos}{" "}
              <em>(a oficial é a declarada)</em>
            </li>
            <li>
              Identificadores: {estado.resumo.contagem.midia} mídia ·{" "}
              {estado.resumo.contagem.gravacao} gravação · {estado.resumo.contagem.pagina} página ·{" "}
              <strong className="text-amarelo">
                {estado.resumo.contagem.desconhecido} não identificam nada
              </strong>
            </li>
            {estado.resumo.semReLegivel > 0 && (
              <li className="text-amarelo">
                {estado.resumo.semReLegivel} linha(s) sem RE legível — entram como 000000
              </li>
            )}
            {estado.gravados !== undefined && (
              <li className="text-branco">
                Gravados {estado.gravados} · já existiam {estado.jaExistiam} · falhas{" "}
                {estado.falhas}
              </li>
            )}
            <li className="break-all text-[11px]">fonte sha256: {estado.fonteSha256}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
