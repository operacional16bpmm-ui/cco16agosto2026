"use client";

import Image from "next/image";
import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Companhia } from "@/lib/dados-16bpmm";

/**
 * As cinco Companhias em abas — a página oficial na intranet dedicava uma
 * página a cada uma; aqui elas convivem sem obrigar o visitante a sair.
 */
export function Companhias({ companhias }: { companhias: Companhia[] }) {
  const [ativa, setAtiva] = useState(0);
  const cia = companhias[ativa];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {companhias.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAtiva(i)}
            aria-pressed={i === ativa}
            className={[
              "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
              i === ativa
                ? "bg-azul text-branco shadow-inst"
                : "border border-azul/25 text-azul hover:bg-azul/10",
            ].join(" ")}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-borda bg-branco shadow-inst">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px]">
            <Image
              src={cia.foto}
              alt={`Efetivo da ${cia.nome} do 16º BPM/M`}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 600px"
            />
          </div>

          <div className="p-7 md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-vermelho">
              {cia.area}
            </p>
            <h3 className="mt-1.5 font-serif text-3xl text-azul-noite">{cia.nome}</h3>

            {cia.texto.map((p) => (
              <p key={p.slice(0, 40)} className="mt-4 text-[15px] leading-relaxed text-texto-suave">
                {p}
              </p>
            ))}

            <dl className="mt-7 space-y-3 border-t border-borda pt-6 text-sm">
              <div className="flex items-start gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-ouro-velho" />
                <dd className="text-texto-suave">
                  {cia.endereco.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                  <a
                    href={cia.mapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-semibold text-azul hover:underline"
                  >
                    Ver no Google Maps →
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={17} className="shrink-0 text-ouro-velho" />
                <dd className="text-texto-suave">{cia.telefone}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={17} className="shrink-0 text-ouro-velho" />
                <dd className="break-all text-texto-suave">{cia.email}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
