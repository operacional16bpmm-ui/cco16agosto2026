"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { acharScroller, ouvirRolagem, type Scroller } from "./scroller";

/**
 * Botão flutuante de retorno ao início do estudo.
 *
 * Precisa ficar FORA de qualquer envoltório animado: o `Revela` aplica
 * `transform`, o que cria bloco de contenção e faria este `position: fixed`
 * colar na seção em vez do viewport. O projeto já pagou esse pedágio uma vez,
 * em components/publico16/galeria.tsx, e resolveu com portal.
 *
 * E, como em toda esta rota, quem rola é o <main>: `window.scrollTo` não teria
 * efeito nenhum aqui.
 */
export function VoltarTopo() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<Scroller | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const scroller = acharScroller(ref.current);
    if (!scroller) return;
    scrollerRef.current = scroller;
    const aoRolar = () =>
      setVisivel(scroller.alvo.scrollTop > scroller.alvo.clientHeight * 0.9);
    aoRolar();
    return ouvirRolagem(scroller, aoRolar);
  }, []);

  const subir = () => scrollerRef.current?.alvo.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={subir}
        aria-label="Voltar ao início do estudo"
        className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-ouro-velho/40 bg-azul-noite text-ouro shadow-inst transition-all duration-300 hover:bg-azul-escuro ${
          visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
