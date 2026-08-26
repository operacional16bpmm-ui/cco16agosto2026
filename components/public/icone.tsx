"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Ícone institucional com movimento.
 *
 * Por que existe: até aqui os ícones do lado público eram lucide-react cru,
 * estáticos, com tamanho escolhido caso a caso. Isso deixava a página parada e
 * sem hierarquia entre o ícone que só rotula uma seção e o ícone que sinaliza
 * algo acontecendo agora.
 *
 * A regra de movimento do projeto está escrita em globals.css: institucional e
 * discreto. Então nada de animação contínua por decoração. O que existe aqui:
 *
 *  - entrada: o ícone chega com leve subida e escala ao entrar na viewport.
 *    Só na primeira vez, e só se o usuário não pediu menos movimento.
 *  - reacao: responde ao passar o mouse no cartão que o contém, via group-hover.
 *  - pulso: reservado para o que está VIVO (dado em tempo real, alerta aberto).
 *    Usa o keyframe pulsar-ao-vivo que já existia.
 *
 * O glifo entra como FILHO, não como prop. A maioria das páginas do lado
 * público é Server Component, e componente não atravessa a fronteira
 * servidor/cliente como propriedade; elemento já renderizado atravessa.
 * Uso: <Icone movimento="reacao"><MapPin size={20} /></Icone>
 *
 * Não instala biblioteca de animação: tudo é CSS + IntersectionObserver, igual
 * ao <Reveal>, para não somar peso de bundle numa página institucional.
 */

export type MovimentoIcone = "entrada" | "reacao" | "pulso" | "nenhum";

export function Icone({
  children,
  movimento = "entrada",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  movimento?: MovimentoIcone;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    if (movimento !== "entrada") return;
    const no = ref.current;
    if (!no) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDentro(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            setDentro(true);
            observador.disconnect();
          }
        });
      },
      { threshold: 0.4, rootMargin: "0px 0px -6% 0px" }
    );

    observador.observe(no);
    return () => observador.disconnect();
  }, [movimento]);

  const classes = ["icone-inst", `icone-${movimento}`];
  if (movimento === "entrada" && dentro) classes.push("icone-visivel");

  return (
    <span
      ref={ref}
      className={[...classes, className].join(" ")}
      style={movimento === "entrada" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </span>
  );
}

/**
 * Selo circular com o ícone dentro, do jeito que os cartões da vitrine já
 * pediam na mão em vários lugares. Mesmo contrato: o glifo vem como filho.
 */
export function SeloIcone({
  children,
  movimento = "entrada",
  delay = 0,
  tom = "azul",
  className = "",
}: {
  children: ReactNode;
  movimento?: MovimentoIcone;
  delay?: number;
  tom?: "azul" | "vermelho" | "ouro" | "neutro";
  className?: string;
}) {
  const fundo = {
    azul: "bg-azul/10 text-azul ring-azul/20",
    vermelho: "bg-vermelho/10 text-vermelho ring-vermelho/20",
    ouro: "bg-ouro-velho/10 text-ouro-velho ring-ouro-velho/25",
    neutro: "bg-texto/5 text-texto-suave ring-borda",
  }[tom];

  return (
    <span
      className={[
        "selo-icone inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
        fundo,
        className,
      ].join(" ")}
    >
      <Icone movimento={movimento} delay={delay}>
        {children}
      </Icone>
    </span>
  );
}
