"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Boxes, CalendarClock } from "lucide-react";
import type { Unidade } from "@/lib/unidades";

const ABAS = [
  { sufixo: "", label: "Visão Geral", icon: LayoutDashboard },
  { sufixo: "/inventario", label: "Inventário", icon: Boxes },
  { sufixo: "/escala", label: "Escala", icon: CalendarClock },
] as const;

/**
 * Abas internas do painel de uma Companhia — Visão Geral (P1+P3+MOTOMEC já
 * consolidados na página existente), Inventário (P4 recortado pela unidade)
 * e Escala (upload da escala do dia/semana). Client component só pela
 * detecção de aba ativa via usePathname; os dados de cada aba continuam
 * vindo de Server Components próprios.
 */
export function AbasCompanhia({ unidade }: { unidade: Unidade }) {
  const pathname = usePathname();
  const base = `/companhia/${unidade}`;

  return (
    <div className="mb-5 flex gap-1 border-b border-branco/10">
      {ABAS.map(({ sufixo, label, icon: Icon }) => {
        const href = `${base}${sufixo}`;
        const ativa = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              ativa
                ? "border-azul text-branco"
                : "border-transparent text-branco/45 hover:text-branco/80"
            }`}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
