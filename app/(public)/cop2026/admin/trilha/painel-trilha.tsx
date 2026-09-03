import { ArrowRight, ShieldCheck } from "lucide-react";

import { camposAlterados, type EventoTrilha } from "@/lib/db/cop2026-trilha";

/**
 * Quem mexeu em quê, quando, e o que exatamente mudou.
 *
 * A tabela por trás existe desde a migration 026 e o trigger a alimenta a cada
 * escrita; até 03/09/2026 não havia tela nenhuma. Num sistema que fiscaliza
 * prova de câmera corporal, "quem alterou este lançamento" é pergunta que
 * precisa ter resposta aqui, não no console do banco.
 *
 * Server component de propósito: é uma tela de leitura, o filtro viaja na query
 * string e assim o link do recorte pode ser colado num ofício. Nenhum botão de
 * apagar — trilha que o operador limpa não serve de prova.
 */

const QUANDO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const COR_OPERACAO: Record<string, string> = {
  INSERT: "text-ouro",
  UPDATE: "text-branco",
  DELETE: "text-vermelho",
};

/** Valor de campo em uma linha, sem despejar JSON gigante na tela. */
function valor(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 60 ? `${v.slice(0, 60)}…` : v || "(vazio)";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}

function Seletor({
  nome,
  atual,
  opcoes,
  rotulo,
}: {
  nome: string;
  atual?: string;
  opcoes: string[];
  rotulo: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="rotulo-dado text-branco/45">{rotulo}</span>
      <select
        name={nome}
        defaultValue={atual ?? ""}
        className="min-w-[150px] rounded-md border border-branco/15 bg-tatico-fundo px-3 py-1.5 text-[13px] text-branco focus:border-ouro focus:outline-none"
      >
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PainelTrilha({
  eventos,
  facetas,
  filtro,
}: {
  eventos: EventoTrilha[];
  facetas: { tabelas: string[]; operacoes: string[]; operadores: string[]; total: number };
  filtro: { operador?: string; tabela?: string; operacao?: string };
}) {
  const N = new Intl.NumberFormat("pt-BR");
  const filtrando = Boolean(filtro.operador || filtro.tabela || filtro.operacao);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
            Trilha de auditoria
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-branco/55">
            Toda escrita no módulo COP fica registrada com autor, horário e o antes/depois. A
            trilha é somente leitura — não há como apagar por esta tela, nem por nenhuma outra.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-branco/15 px-2.5 py-1 text-[11.5px] text-branco/60">
          <ShieldCheck size={13} className="text-ouro" />
          <span className="dados font-black text-branco">{N.format(facetas.total)}</span> eventos
        </span>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-branco/10 bg-branco/[0.03] p-4">
        <Seletor nome="tabela" rotulo="Tabela" atual={filtro.tabela} opcoes={facetas.tabelas} />
        <Seletor
          nome="operacao"
          rotulo="Operação"
          atual={filtro.operacao}
          opcoes={facetas.operacoes}
        />
        <Seletor
          nome="operador"
          rotulo="Operador"
          atual={filtro.operador}
          opcoes={facetas.operadores}
        />
        <button
          type="submit"
          className="rounded-md bg-ouro px-4 py-1.5 text-[12px] font-black uppercase tracking-wide text-tatico-fundo transition-opacity hover:opacity-85"
        >
          Filtrar
        </button>
        {filtrando && (
          <a
            href="/cop2026/admin/trilha"
            className="rounded-md border border-branco/15 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-branco/60 hover:text-branco"
          >
            Limpar
          </a>
        )}
      </form>

      {eventos.length === 0 ? (
        <p className="rounded-lg border border-branco/10 bg-branco/[0.03] p-6 text-center text-[13px] text-branco/50">
          Nenhum evento neste recorte.
        </p>
      ) : (
        <ul className="space-y-2">
          {eventos.map((e) => {
            const mudancas = camposAlterados(e);
            return (
              <li
                key={e.id}
                className="rounded-lg border border-branco/10 bg-branco/[0.03] p-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={`dados text-[11px] font-black uppercase tracking-wider ${
                      COR_OPERACAO[e.operacao] ?? "text-branco/70"
                    }`}
                  >
                    {e.operacao}
                  </span>
                  <span className="text-[12.5px] text-branco/70">{e.tabela}</span>
                  <span className="dados text-[11.5px] text-branco/40">
                    {QUANDO.format(new Date(e.em))}
                  </span>
                  <span className="ml-auto text-[12px] font-semibold text-branco/70">
                    {e.operador ?? "— sem operador registrado"}
                  </span>
                </div>

                {/* Só o que mudou. Mostrar as 28 colunas esconderia a alteração
                    que importa no meio das 27 iguais. */}
                {mudancas.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-branco/10 pt-2">
                    {mudancas.slice(0, 8).map((m) => (
                      <li
                        key={m.campo}
                        className="flex flex-wrap items-center gap-2 text-[12px]"
                      >
                        <span className="dados min-w-[130px] text-branco/50">{m.campo}</span>
                        <span className="text-branco/45 line-through">{valor(m.de)}</span>
                        <ArrowRight size={12} className="shrink-0 text-branco/30" />
                        <span className="font-semibold text-branco/85">{valor(m.para)}</span>
                      </li>
                    ))}
                    {mudancas.length > 8 && (
                      <li className="text-[11.5px] text-branco/40">
                        + {mudancas.length - 8} outro(s) campo(s)
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {eventos.length === 100 && (
        <p className="text-center text-[12px] text-branco/45">
          Mostrando os 100 eventos mais recentes deste recorte. Estreite o filtro para ver mais.
        </p>
      )}
    </div>
  );
}
