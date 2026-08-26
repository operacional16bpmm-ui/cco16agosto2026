"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, List } from "lucide-react";
import { acharScroller, ouvirRolagem, progresso as calcProgresso, raizObservador } from "./scroller";

export type ItemIndice = { id: string; quadro: string; rotulo: string };

/**
 * Barra que acompanha a leitura do estudo: progresso, quadro atual, índice e
 * filtros.
 *
 * Três detalhes que só funcionam por causa do layout deste grupo de rotas:
 *
 * 1. Quem rola é o <main> (overflow-y-auto em app/(command)/layout.tsx), não a
 *    janela. Por isso o progresso lê `main.scrollTop`, e não `window.scrollY`,
 *    que seria zero para sempre aqui.
 * 2. Pelo mesmo motivo, o observador de seção ativa recebe `root: main`. Sem
 *    isso a fronteira de disparo erraria pela altura do cabeçalho, da tarja de
 *    sigilo e do rodapé, que estão fora do scrollport.
 * 3. `sticky top-0` cola no topo do <main>, ou seja, logo abaixo da tarja de
 *    uso restrito. Depende de nenhum ancestral entre esta barra e o <main> ter
 *    overflow recortado — por isso ela é filha direta do wrapper da página.
 *
 * Os filtros entram por `children` de propósito: assim continuam sendo
 * renderizados no servidor, sem virar estado de cliente.
 */
export function BarraEstudo({
  itens,
  children,
}: {
  itens: ItemIndice[];
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [ativo, setAtivo] = useState<string>(itens[0]?.id ?? "");
  const [indiceAberto, setIndiceAberto] = useState(false);

  useEffect(() => {
    const scroller = acharScroller(ref.current);
    if (!scroller) return;

    const aoRolar = () => setProgresso(calcProgresso(scroller));
    aoRolar();
    const parar = ouvirRolagem(scroller, aoRolar);

    // Faixa estreita perto do topo do scrollport: a seção "ativa" é a que
    // cruza essa linha, e não a que ocupa mais área — critério que oscilaria
    // em seções de alturas muito diferentes, como as deste estudo.
    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis[0]?.target.id) setAtivo(visiveis[0].target.id);
      },
      { root: raizObservador(scroller), rootMargin: "-12% 0px -78% 0px", threshold: 0 },
    );

    const secoes = itens
      .map((i) => document.getElementById(i.id))
      .filter((n): n is HTMLElement => Boolean(n));
    secoes.forEach((s) => observador.observe(s));

    return () => {
      parar();
      observador.disconnect();
    };
  }, [itens]);

  // Fecha o índice ao clicar fora ou apertar Escape.
  useEffect(() => {
    if (!indiceAberto) return;
    const fora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIndiceAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndiceAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [indiceAberto]);

  const atual = itens.find((i) => i.id === ativo) ?? itens[0];

  return (
    <div ref={ref} className="sticky top-0 z-40 border-b border-borda bg-branco/95 backdrop-blur">
      <div
        className="h-0.5 bg-vermelho transition-[width] duration-150 ease-out"
        style={{ width: `${progresso}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progresso)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da leitura do estudo"
      />

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIndiceAberto((v) => !v)}
            aria-expanded={indiceAberto}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full border border-azul/25 px-3 py-1.5 text-xs font-semibold text-azul transition-colors hover:bg-azul/10"
          >
            <List className="h-3.5 w-3.5" aria-hidden />
            Índice
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${indiceAberto ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {indiceAberto ? (
            <nav
              aria-label="Índice do estudo"
              className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-[19rem] overflow-y-auto rounded-xl border border-borda bg-branco p-1.5 shadow-inst"
            >
              {itens.map((i) => (
                <a
                  key={i.id}
                  href={`#${i.id}`}
                  onClick={() => setIndiceAberto(false)}
                  className={`flex items-baseline gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                    i.id === ativo
                      ? "bg-azul/10 font-semibold text-azul-noite"
                      : "text-texto-suave hover:bg-superficie"
                  }`}
                >
                  <span className="w-14 shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ouro-velho">
                    {i.quadro}
                  </span>
                  <span>{i.rotulo}</span>
                </a>
              ))}
            </nav>
          ) : null}
        </div>

        <p className="min-w-0 flex-1 truncate text-[13px] text-texto-suave">
          <span className="font-semibold uppercase tracking-[0.1em] text-ouro-velho">
            {atual?.quadro}
          </span>
          <span className="mx-2 text-borda">·</span>
          <span className="font-medium text-texto">{atual?.rotulo}</span>
        </p>

        {children}
      </div>
    </div>
  );
}
