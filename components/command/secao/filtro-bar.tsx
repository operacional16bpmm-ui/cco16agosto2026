import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mesclarFiltro, type FiltroSecao } from "@/lib/filtros";

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Pill({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
        ativo
          ? "border-azul/50 bg-azul/15 text-azul"
          : "border-branco/12 bg-branco/[0.03] text-branco/50 hover:bg-branco/8"
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Barra de filtros de seção — 100% server-side, sem JS: cada opção é um
 * <Link> que mescla o parâmetro trocado com os demais já ativos na URL.
 * Clicar navega normalmente (force-dynamic refaz a consulta no servidor).
 */
export function FiltroBar({
  basePath,
  atual,
  anos,
  cias = [1, 2, 3, 4],
  mostrarCia = true,
}: {
  basePath: string;
  atual: FiltroSecao;
  anos: number[];
  cias?: number[];
  /** Painel de uma unidade específica (/companhia/[unidade]) já É o recorte
   * por Cia; oferecer o filtro ali seria uma forma de sair da própria
   * unidade pela URL. */
  mostrarCia?: boolean;
}) {
  if (anos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-branco/10 bg-tatico-super/20 px-4 py-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-branco/35">Ano</span>
        <Pill href={basePath + mesclarFiltro(atual, { ano: undefined })} ativo={atual.ano == null}>
          Todos
        </Pill>
        {anos.map((ano) => (
          <Pill
            key={ano}
            href={basePath + mesclarFiltro(atual, { ano })}
            ativo={atual.ano === ano}
          >
            {ano}
          </Pill>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-branco/35">Mês</span>
        <Pill href={basePath + mesclarFiltro(atual, { mes: undefined })} ativo={atual.mes == null}>
          Todos
        </Pill>
        {MESES_ABREV.map((rotulo, i) => (
          <Pill
            key={rotulo}
            href={basePath + mesclarFiltro(atual, { mes: i + 1 })}
            ativo={atual.mes === i + 1}
          >
            {rotulo}
          </Pill>
        ))}
      </div>

      {mostrarCia && (
        <div className="flex items-center gap-1.5">
          <span className="text-branco/35">Cia</span>
          <Pill href={basePath + mesclarFiltro(atual, { cia: undefined })} ativo={atual.cia == null}>
            Todas
          </Pill>
          {cias.map((cia) => (
            <Pill
              key={cia}
              href={basePath + mesclarFiltro(atual, { cia })}
              ativo={atual.cia === cia}
            >
              {cia}ª
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}
