"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { acharScroller, raizObservador } from "./scroller";

/**
 * Entrada suave de bloco, na variante correta para a Sala de Comando.
 *
 * Por que não reusar components/public/reveal.tsx: aquele observa sem `root`,
 * ou seja, contra o viewport da janela. Na vitrine pública isso está certo,
 * porque lá quem rola é o documento. Aqui quem rola normalmente é o <main>
 * (overflow-y-auto no layout do grupo), então a margem de disparo cairia
 * deslocada pela altura do cabeçalho, da tarja de sigilo e do rodapé. Alterar
 * o componente da vitrine para servir aos dois casos arriscaria a página
 * pública sem necessidade.
 *
 * O respeito a prefers-reduced-motion fica no CSS, pelas variantes
 * `motion-reduce:`, e não numa consulta a matchMedia dentro do efeito: isso
 * evita setState síncrono no efeito e ainda cobre quem muda a preferência com
 * a página já aberta.
 *
 * CUIDADO ao usar: isto aplica `transform`, que cria bloco de contenção e
 * quebra `position: fixed` de qualquer descendente. O botão de voltar ao topo
 * fica deliberadamente fora daqui. O mesmo efeito colateral já mordeu o
 * projeto em components/publico16/galeria.tsx.
 */
export function Revela({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const no = ref.current;
    if (!no) return;

    const scroller = acharScroller(no);
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisivel(true);
            observador.disconnect();
          }
        }
      },
      {
        root: scroller ? raizObservador(scroller) : null,
        threshold: 0.08,
        rootMargin: "0px 0px -6% 0px",
      },
    );

    observador.observe(no);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      // min-w-0: o Revela costuma ser o filho direto de um grid, e sem isso o
      // conteúdo dele (gráfico, tabela) impede a coluna de encolher no celular.
      className={`min-w-0 transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        visivel ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
