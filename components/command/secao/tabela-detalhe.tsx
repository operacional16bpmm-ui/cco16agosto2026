import { DataState } from "@/components/command/ui";
import { cn } from "@/lib/utils";

export type ColunaDetalhe = { key: string; rotulo: string; alinhamento?: "direita" };

/** Tabela simples para catálogos pequenos (OS, romaneio, ocorrências
 * pontuais) — server component, dentro de overflow-x-auto para não estourar
 * a largura em telas estreitas. */
export function TabelaDetalhe({
  colunas,
  linhas,
  vazio,
}: {
  colunas: ColunaDetalhe[];
  linhas: Record<string, unknown>[];
  vazio: string;
}) {
  if (linhas.length === 0) return <DataState titulo={vazio} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-branco/10 text-branco/40">
            {colunas.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "py-2 pr-4 font-semibold uppercase tracking-wide",
                  c.alinhamento === "direita" && "text-right"
                )}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-branco/5 text-branco/75">
              {colunas.map((c) => (
                <td
                  key={c.key}
                  className={cn("py-2 pr-4", c.alinhamento === "direita" && "text-right")}
                >
                  {String(linha[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
