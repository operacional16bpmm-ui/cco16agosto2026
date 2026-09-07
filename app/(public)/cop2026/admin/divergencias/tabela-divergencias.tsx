import { FMT, type Excecao } from "@/lib/cop2026-metricas";
import { fmtData } from "@/components/publico16/cop/documento-cop";

/**
 * Uma divergência de identificador, com o lançamento que a produziu.
 *
 * `ids` só existe no bloco de repetidos — é o identificador que apareceu duas
 * vezes, e é sobre ele que a cobrança recai, não sobre a pessoa: os dois lados
 * podem estar de boa-fé.
 */
export type ItemDivergencia = Excecao & { ids?: string[] };

export function TabelaDivergencias({
  titulo,
  explicacao,
  vazio,
  itens,
  mostrarIds,
}: {
  titulo: string;
  explicacao: string;
  vazio: string;
  itens: ItemDivergencia[];
  mostrarIds?: boolean;
}) {
  return (
    <section className="rounded-xl border border-borda bg-tatico-super p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[17px] font-bold uppercase tracking-wide text-branco">
          {titulo}
        </h2>
        <span className="dados shrink-0 rounded-full border border-borda px-2.5 py-0.5 text-[12px] font-bold text-branco">
          {FMT.format(itens.length)}
        </span>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-texto-suave">{explicacao}</p>

      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-borda px-3 py-2.5 text-[12.5px] text-texto-suave">
          {vazio}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-borda text-[10.5px] uppercase tracking-wide text-texto-suave">
                <th className="py-2 pr-3 font-bold">Auditor</th>
                <th className="py-2 pr-3 font-bold">Fração</th>
                <th className="py-2 pr-3 font-bold">Data · Turno</th>
                <th className="py-2 pr-3 font-bold">Declarou</th>
                {mostrarIds && <th className="py-2 font-bold">Identificador repetido</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((e) => (
                <tr key={`${e.id}-${e.data}-${e.turno}`} className="border-b border-borda/60 align-top">
                  <td className="py-2 pr-3 font-semibold text-branco">{e.quem}</td>
                  <td className="py-2 pr-3 text-texto-suave">{e.fracao}</td>
                  <td className="dados py-2 pr-3 text-texto-suave">
                    {fmtData(e.data)} · {e.turno || "—"}
                  </td>
                  {/* Sem cor de alarme: o número declarado É o que vale, e esta
                      coluna está aqui para dar contexto à correção, não para
                      apontar o dedo. */}
                  <td className="dados py-2 pr-3 font-bold text-branco">{FMT.format(e.videos)}</td>
                  {mostrarIds && (
                    <td className="dados py-2 text-texto-suave">{e.ids?.join(", ") || "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
