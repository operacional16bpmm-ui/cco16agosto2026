"use client";

import { useState } from "react";
import { num, pctTexto, simular, type BaseSimulacao } from "@/lib/dejem-calculo";

/**
 * Único ponto da página com estado no cliente.
 *
 * O cálculo mora em lib/dejem-calculo.ts (sem `server-only`) justamente para
 * ser importável daqui: se estivesse em lib/db/dejem.ts, o build quebraria.
 * A base vem do servidor por props — nenhum número é digitado aqui.
 */
export function Simulador({ base }: { base: BaseSimulacao }) {
  const atual = base.vagas ? Math.round((base.escalados / base.vagas) * 1000) / 10 : 0;
  const [meta, setMeta] = useState(Math.min(100, Math.max(Math.ceil(atual), 95)));
  const r = simular(base, meta);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
      <div>
        <label htmlFor="meta-dejem" className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">
          Taxa de preenchimento pretendida
        </label>
        <p className="tabular mt-3 font-serif text-5xl leading-none text-azul-noite">{meta}%</p>
        <input
          id="meta-dejem"
          type="range"
          min={Math.floor(atual)}
          max={100}
          step={1}
          value={meta}
          onChange={(e) => setMeta(Number(e.target.value))}
          className="mt-5 w-full accent-[#d53441]"
          aria-describedby="meta-dejem-ajuda"
        />
        <div className="tabular mt-1.5 flex justify-between text-[11px] text-texto-suave">
          <span>hoje {pctTexto(atual)}</span>
          <span>100%</span>
        </div>
        <p id="meta-dejem-ajuda" className="mt-4 max-w-[46ch] text-[13px] leading-relaxed text-texto-suave">
          Mantida a mesma oferta de vagas do semestre, cada ponto percentual a mais de
          preenchimento vira jornada efetivamente cumprida na rua.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst sm:grid-cols-2">
        {[
          { r: "Vagas recuperadas", v: num(r.vagasRecuperadas), n: "que hoje ficam ociosas" },
          { r: "Jornadas adicionais", v: num(r.jornadasAdicionais), n: "de 8 horas cada" },
          { r: "Homens-hora a mais", v: num(r.homensHoraAdicionais), n: "no semestre" },
          { r: "PMs escalados", v: num(r.escaladosProjetados), n: `hoje ${num(base.escalados)}` },
        ].map((c) => (
          <div key={c.r} className="bg-branco px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-texto-suave">{c.r}</p>
            <p className="tabular mt-2 font-serif text-3xl leading-none text-vermelho">{c.v}</p>
            <p className="mt-1.5 text-xs text-texto-suave">{c.n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
