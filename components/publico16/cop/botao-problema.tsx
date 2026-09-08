import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * BOTÃO "RELATAR PROBLEMAS DO SISTEMA" — o botão vermelho.
 *
 * Um componente só, usado nos TRÊS lugares que o Fabrício definiu em
 * 08/09/2026: a home da COP, o Dashboard e a Planilha de Lançamentos. Escrever
 * o botão três vezes é como o portal acabaria com três textos, três destinos e
 * dois deles desatualizados — e este é o botão que não pode falhar quando
 * alguém precisar dele às 22h de um domingo.
 *
 * VERMELHO é semântico aqui, não decoração: no padrão do painel
 * (docs/cop2026-padroes-comando.md §2) cor é classificação. Este é o único
 * botão de ação de ocorrência do conjunto, e ele tem de ser achável na varredura
 * de quem já sabe que tem um problema em mãos.
 */
export function BotaoProblema({
  variante = "cheio",
  className,
}: {
  /** "cheio" para a home (peça de destaque); "compacto" para as barras de
   *  navegação do Dashboard e da Planilha, onde ele divide espaço. */
  variante?: "cheio" | "compacto";
  className?: string;
}) {
  return (
    <Link
      href="/cop2026/inconsistencias"
      className={cn(
        "group inline-flex items-center justify-center gap-2 font-bold text-white transition-all",
        "bg-gradient-to-br from-[#d50909] to-[#a90000] shadow-[0_8px_20px_rgba(126,0,0,0.30)]",
        "hover:-translate-y-0.5 hover:from-[#e40707] hover:to-[#bd0000]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        variante === "cheio"
          ? "min-h-12 rounded-xl border border-red-300/40 px-6 py-3.5 text-[15px]"
          : "rounded-lg px-3.5 py-2 text-[12.5px] uppercase tracking-wide",
        className
      )}
    >
      <AlertTriangle className={variante === "cheio" ? "h-[18px] w-[18px]" : "h-4 w-4"} aria-hidden />
      Relatar problemas do sistema
      {variante === "cheio" && (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}
