import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { FiltroBar } from "./filtro-bar";
import type { FiltroSecao } from "@/lib/filtros";
import type { ArquivoFonte } from "@/lib/db/secao";

/**
 * Casca padrão de página de seção: cabeçalho + badge dados/aguardando +
 * barra de filtros + conteúdo + rodapé de proveniência (caminho UNC de
 * origem, exigido nos relatórios) — mesmo esqueleto que a página P2 já usa,
 * generalizado para as demais seções do batalhão.
 */
export function SecaoShell({
  titulo,
  descricao,
  basePath,
  filtro,
  anosDisponiveis,
  temDados,
  arquivosFonte,
  notaLgpd,
  mostrarFiltroCia = true,
  acaoCabecalho,
  children,
}: {
  titulo: string;
  descricao: string;
  basePath: string;
  filtro: FiltroSecao;
  anosDisponiveis: number[];
  temDados: boolean;
  arquivosFonte: ArquivoFonte[];
  notaLgpd?: string;
  /** Falso no painel de uma unidade, onde o recorte por Cia já é a página. */
  mostrarFiltroCia?: boolean;
  /** Substitui o badge padrão de estado de ingestão no cabeçalho. */
  acaoCabecalho?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo={titulo}
        descricao={descricao}
        acao={
          acaoCabecalho ?? (
            <Badge tone={temDados ? "ok" : "attention"}>
              <TrendingUp size={12} /> {temDados ? "dados ingeridos" : "aguardando ingestão"}
            </Badge>
          )
        }
      />

      {anosDisponiveis.length > 0 && (
        <div className="mb-5">
          <FiltroBar
            basePath={basePath}
            atual={filtro}
            anos={anosDisponiveis}
            mostrarCia={mostrarFiltroCia}
          />
        </div>
      )}

      {!temDados ? (
        <DataState
          titulo={`Sem dados de ${titulo} carregados`}
          texto="A ingestão desta seção ainda não foi executada para este ambiente."
        />
      ) : (
        <>
          {children}

          {arquivosFonte.length > 0 && (
            <Card className="mt-5">
              <h2 className="mb-3 text-sm font-semibold text-branco">Proveniência dos dados</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {arquivosFonte.map((a, i) => (
                  <div key={i} className="rounded border border-branco/10 p-2 text-[11px]">
                    <p className="truncate font-medium text-branco/70" title={a.caminho_unc}>
                      {a.caminho_unc}
                    </p>
                    <p className="text-branco/40">
                      {a.linhas_reais != null ? `${a.linhas_reais} registro(s)` : "—"}
                      {a.observacao ? ` · ${a.observacao}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {notaLgpd && <p className="mt-4 text-center text-[11px] text-branco/35">{notaLgpd}</p>}
    </div>
  );
}
