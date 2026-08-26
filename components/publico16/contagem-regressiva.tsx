"use client";

import { useEffect, useState } from "react";

/**
 * Selo "faltam N dias" dos destaques do calendário. Calcula só no cliente,
 * depois da montagem: o servidor pré-renderiza a página em UTC e num dia de
 * build congelado, então qualquer conta de "hoje" feita lá chegaria errada
 * (ou desatualizada) no navegador. Antes de montar não renderiza nada, e a
 * página continua inteira sem ele.
 */
export function ContagemRegressiva({ datas }: { datas: string[] }) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    for (const iso of datas) {
      const [a, m, d] = iso.split("-").map(Number);
      const alvo = new Date(a, m - 1, d);
      const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
      if (dias === 0) {
        setTexto("É hoje");
        return;
      }
      if (dias === 1) {
        setTexto("É amanhã");
        return;
      }
      if (dias > 1) {
        setTexto(`Faltam ${dias} dias`);
        return;
      }
    }
    setTexto(null);
  }, [datas]);

  if (!texto) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-vermelho px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
      {texto}
    </span>
  );
}
