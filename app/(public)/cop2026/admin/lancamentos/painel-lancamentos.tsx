"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Check, FilterX, Trash2 } from "lucide-react";

import { ROTULO_SUBUNIDADE, ORDEM_SUBUNIDADES } from "@/lib/cop2026";
import { RELATORIOS_MENSAIS } from "@/lib/cop2026-relatorios";
import {
  excluirLancamentoAction,
  reclassificarAction,
  type ManejoState,
} from "./actions";

/**
 * Manejo dos lançamentos.
 *
 * A tela existe por uma razão prática: sem ela, corrigir um lançamento errado
 * exigia editar a planilha do Google — que é justamente a fonte que estamos
 * deixando de usar. E a exclusão aqui é LÓGICA e devolve os identificadores ao
 * índice de unicidade, para que o auditor consiga relançá-los certos.
 */

export type LinhaLancamento = {
  id: string;
  data_auditoria: string;
  turno: string;
  re: string;
  nome_guerra: string;
  subunidade: string;
  auditou: boolean;
  videos_declarados: number;
  videos_contados: number;
  videos_validos: number;
  vinculo_pendente: boolean;
  retroativo: boolean;
  origem: string;
  criado_em: string;
  criado_por_email: string | null;
};

const vazio: ManejoState = { ok: false, error: null, aviso: null };

export function PainelLancamentos({
  itens,
  erro,
  compartilhados,
}: {
  itens: LinhaLancamento[];
  erro: string | null;
  compartilhados: { id: string; res: string[]; ocorrencias: number }[];
}) {
  const [excluir, acaoExcluir] = useActionState(excluirLancamentoAction, vazio);
  const [reclass, acaoReclass] = useActionState(reclassificarAction, vazio);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  /* Filtros no CLIENTE, e não na query: a lista já vem inteira do servidor e
     cabe em memória com folga. Filtrar aqui torna a conferência instantânea —
     o Comando compara agosto e setembro alternando um select, sem esperar
     round-trip nenhum. Se a lista passar de alguns milhares, isto vira
     paginação no servidor; até lá, seria complexidade sem ganho. */
  const [fMes, setFMes] = useState("todos");
  const [fFracao, setFFracao] = useState("todas");
  const [fOrigem, setFOrigem] = useState("todas");
  const [fSituacao, setFSituacao] = useState("todas");
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const mes = RELATORIOS_MENSAIS.find((m) => m.chave === fMes);
    const termo = busca.trim().toLowerCase();
    return itens.filter((l) => {
      if (mes && (l.data_auditoria < mes.periodo.de || l.data_auditoria > mes.periodo.ate))
        return false;
      if (fFracao !== "todas" && l.subunidade !== fFracao) return false;
      if (fOrigem !== "todas" && l.origem !== fOrigem) return false;
      if (fSituacao === "naoauditou" && l.auditou) return false;
      if (fSituacao === "semids" && l.videos_validos > 0) return false;
      if (fSituacao === "pendente" && !l.vinculo_pendente) return false;
      if (fSituacao === "retroativo" && !l.retroativo) return false;
      if (
        termo &&
        !`${l.re} ${l.nome_guerra} ${l.criado_por_email ?? ""}`.toLowerCase().includes(termo)
      )
        return false;
      return true;
    });
  }, [itens, fMes, fFracao, fOrigem, fSituacao, busca]);

  const limpo =
    fMes === "todos" &&
    fFracao === "todas" &&
    fOrigem === "todas" &&
    fSituacao === "todas" &&
    !busca.trim();

  const declaradas = filtrados.reduce((s, l) => s + l.videos_declarados, 0);

  const estado = excluir.error || excluir.aviso ? excluir : reclass;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
          Lançamentos registrados
        </h1>
        <p className="mt-1 text-[13px] text-texto-suave">
          Planilha importada e formulário do portal no mesmo lugar. A exclusão é registrada com
          motivo e devolve os identificadores para relançamento.
        </p>
      </div>

      {erro && <Faixa tom="erro">{erro}</Faixa>}
      {estado.error && <Faixa tom="erro">{estado.error}</Faixa>}
      {estado.aviso && <Faixa tom="ok">{estado.aviso}</Faixa>}

      {compartilhados.length > 0 && (
        <div className="rounded-xl border border-sinal-atencao/40 bg-sinal-atencao-suave p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-sinal-atencao">
            <AlertTriangle size={15} aria-hidden /> Identificadores em mais de um RE
          </p>
          {/* Relatório, NUNCA bloqueio: dois policiais na mesma ocorrência
              auditam legitimamente a mesma gravação. Acusação injusta é pior
              que fraude não detectada. */}
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-sinal-atencao">
            Isto não é acusação: dois policiais na mesma ocorrência auditam legitimamente a mesma
            gravação. Serve para conferência do Comando.
          </p>
          <ul className="mt-3 space-y-1.5">
            {compartilhados.slice(0, 10).map((c) => (
              <li key={c.id} className="text-[12px] text-sinal-atencao">
                <span className="dados">{c.id.slice(0, 12)}…</span> — {c.ocorrencias} REs:{" "}
                <span className="dados">{c.res.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-borda bg-tatico-super p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Mês" valor={fMes} ao={setFMes}>
            <option value="todos">Todos</option>
            {RELATORIOS_MENSAIS.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}/{m.ano}
              </option>
            ))}
          </Campo>

          <Campo rotulo="Fração" valor={fFracao} ao={setFFracao}>
            <option value="todas">Todas</option>
            {[...ORDEM_SUBUNIDADES, "outros"].map((f) => (
              <option key={f} value={f}>
                {ROTULO_SUBUNIDADE[f as keyof typeof ROTULO_SUBUNIDADE] ?? f}
              </option>
            ))}
          </Campo>

          <Campo rotulo="Origem" valor={fOrigem} ao={setFOrigem}>
            <option value="todas">Todas</option>
            <option value="planilha">Planilha importada</option>
            <option value="formulario">Formulário do portal</option>
            <option value="admin">Lançado pelo admin</option>
          </Campo>

          <Campo rotulo="Situação" valor={fSituacao} ao={setFSituacao}>
            <option value="todas">Todas</option>
            <option value="naoauditou">Declarou não auditar</option>
            <option value="semids">Sem identificador válido</option>
            <option value="pendente">Vínculo pendente</option>
            <option value="retroativo">Retroativo</option>
          </Campo>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
              RE, nome ou e-mail
            </span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="120146, Fernandes…"
              className="min-w-[190px] rounded-md border border-borda bg-tatico-fundo px-2.5 py-1.5 text-[13px] text-branco placeholder:text-texto-suave/60"
            />
          </label>

          {!limpo && (
            <button
              type="button"
              onClick={() => {
                setFMes("todos");
                setFFracao("todas");
                setFOrigem("todas");
                setFSituacao("todas");
                setBusca("");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-1.5 text-[12px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
            >
              <FilterX size={13} aria-hidden /> Limpar
            </button>
          )}
        </div>

        {/* O total DECLARADO do recorte, e não a contagem de linhas: é a régua
            oficial do painel. Ver o mesmo número aqui e no dashboard é o que
            permite conferir a importação sem abrir o banco. */}
        <p className="mt-3 text-[12.5px] text-texto-suave">
          <strong className="text-branco">{filtrados.length}</strong> lançamento(s) de{" "}
          {itens.length} · <strong className="text-branco">{declaradas}</strong> evidência(s)
          declarada(s) no recorte
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="border-b border-borda text-[11px] uppercase tracking-wide text-texto-suave">
            <tr>
              <th className="px-4 py-3">Data / turno</th>
              <th className="px-4 py-3">Auditor</th>
              <th className="px-4 py-3">Fração</th>
              <th className="px-4 py-3 text-right">Decl.</th>
              <th className="px-4 py-3 text-right">IDs</th>
              <th className="px-4 py-3 text-right">Válidos</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-texto-suave">
                  {itens.length === 0
                    ? "Nenhum lançamento registrado no banco ainda."
                    : "Nenhum lançamento neste recorte."}
                </td>
              </tr>
            )}
            {filtrados.map((l) => (
              <tr key={l.id} className="border-b border-borda/60 align-top last:border-0">
                <td className="px-4 py-3">
                  <span className="dados">{l.data_auditoria}</span>
                  <span className="block text-[11.5px] text-texto-suave">{l.turno}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="dados">{l.re}</span>
                  <span className="block text-[11.5px] text-texto-suave">{l.nome_guerra}</span>
                </td>
                <td className="px-4 py-3">
                  <form action={acaoReclass} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={l.id} />
                    <select
                      name="subunidade"
                      defaultValue={l.subunidade}
                      className="min-h-9 rounded border border-borda bg-transparent px-2 py-1 text-[12px] text-branco"
                    >
                      {[...ORDEM_SUBUNIDADES, "outros"].map((s) => (
                        <option key={s} value={s}>
                          {ROTULO_SUBUNIDADE[s] ?? s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-borda px-2 py-1 text-[11px] font-bold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                    >
                      Salvar
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right dados">{l.videos_declarados}</td>
                <td className="px-4 py-3 text-right dados">{l.videos_contados}</td>
                <td className="px-4 py-3 text-right dados">{l.videos_validos}</td>
                <td className="px-4 py-3 text-[11.5px]">
                  {!l.auditou && <Selo tom="neutro">Não auditou</Selo>}
                  {l.vinculo_pendente && <Selo tom="atencao">Vínculo pendente</Selo>}
                  {l.retroativo && <Selo tom="atencao">Retroativo</Selo>}
                  {l.origem !== "formulario" && <Selo tom="neutro">{l.origem}</Selo>}
                </td>
                <td className="px-4 py-3">
                  {abrindo === l.id ? (
                    <form action={acaoExcluir} className="flex flex-col gap-1.5">
                      <input type="hidden" name="id" value={l.id} />
                      <input
                        name="motivo"
                        placeholder="Motivo da exclusão"
                        required
                        minLength={5}
                        className="min-h-9 w-44 rounded border border-borda bg-transparent px-2 py-1 text-[12px] text-branco"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="submit"
                          className="rounded border border-sinal-critico/50 px-2 py-1 text-[11px] font-bold text-sinal-critico"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbrindo(null)}
                          className="rounded border border-borda px-2 py-1 text-[11px] font-bold text-texto-suave"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAbrindo(l.id)}
                      className="inline-flex items-center gap-1 rounded border border-borda px-2 py-1.5 text-[11.5px] font-bold text-texto-suave hover:border-sinal-critico/50 hover:text-sinal-critico"
                    >
                      <Trash2 size={12} aria-hidden /> Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Faixa({ tom, children }: { tom: "erro" | "ok"; children: React.ReactNode }) {
  const cor =
    tom === "erro"
      ? "border-sinal-critico/40 bg-sinal-critico-suave text-sinal-critico"
      : "border-sinal-conforme/40 bg-sinal-conforme-suave text-sinal-conforme";
  return (
    <p className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px] ${cor}`}>
      {tom === "erro" ? (
        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
      )}
      {children}
    </p>
  );
}

function Selo({ tom, children }: { tom: "neutro" | "atencao"; children: React.ReactNode }) {
  const cor =
    tom === "atencao"
      ? "border-sinal-atencao/40 text-sinal-atencao"
      : "border-borda text-texto-suave";
  return (
    <span className={`mr-1 inline-block rounded border px-1.5 py-0.5 ${cor}`}>{children}</span>
  );
}

/** Select rotulado da barra de filtros. Existe para as cinco caixas não
 *  divergirem em altura e espaçamento — a barra fica logo acima da tabela e
 *  desalinhamento ali salta aos olhos. */
function Campo({
  rotulo,
  valor,
  ao,
  children,
}: {
  rotulo: string;
  valor: string;
  ao: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
        {rotulo}
      </span>
      <select
        value={valor}
        onChange={(e) => ao(e.target.value)}
        className="rounded-md border border-borda bg-tatico-fundo px-2.5 py-1.5 text-[13px] text-branco"
      >
        {children}
      </select>
    </label>
  );
}
