"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ItemGaleria = {
  src: string;
  titulo?: string;
  legenda?: string;
  texto?: string;
};

/**
 * Galeria em miniaturas com visor em tela cheia (Galeria de Heróis e Fotos
 * Históricas). Navegação por clique e por teclado; o visor só monta depois do
 * primeiro clique, para não carregar as 54 imagens grandes de saída.
 */
export function Galeria({
  itens,
  colunas = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  proporcao = "aspect-[4/3]",
  mostrarTitulo = false,
  limiteInicial,
  tema = "claro",
  encaixe = "cover",
}: {
  itens: ItemGaleria[];
  colunas?: string;
  proporcao?: string;
  mostrarTitulo?: boolean;
  limiteInicial?: number;
  /** "escuro" para seções sobre fundo azul-noite — inverte legendas e botão. */
  tema?: "claro" | "escuro";
  /** "contain" preserva a moldura de retratos de arquivo em proporções variadas. */
  encaixe?: "cover" | "contain";
}) {
  const escuro = tema === "escuro";
  const [aberto, setAberto] = useState<number | null>(null);
  const [expandido, setExpandido] = useState(false);

  // O visor sai para o <body> via portal: a galeria fica dentro de um <Reveal>,
  // que aplica transform — e um ancestral transformado vira bloco de contenção,
  // fazendo o "position: fixed" do visor colar na seção em vez da janela. Sem o
  // portal, a imagem ampliada aparecia recortada dentro da seção.
  // Não precisa de guarda de montagem: `aberto` só deixa de ser null por clique,
  // então o portal nunca é criado na renderização do servidor.

  const visiveis = limiteInicial && !expandido ? itens.slice(0, limiteInicial) : itens;
  const restantes = limiteInicial ? itens.length - limiteInicial : 0;

  const mover = useCallback(
    (passo: number) =>
      setAberto((i) => (i === null ? null : (i + passo + itens.length) % itens.length)),
    [itens.length]
  );

  useEffect(() => {
    if (aberto === null) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(null);
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", aoTeclar);
    // Trava a rolagem do fundo enquanto o visor está aberto.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aberto, mover]);

  const atual = aberto === null ? null : itens[aberto];

  return (
    <>
      <div className={`grid gap-3 ${colunas}`}>
        {visiveis.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setAberto(i)}
            className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro-velho"
          >
            <div
              className={[
                "relative overflow-hidden rounded-xl border shadow-inst",
                proporcao,
                escuro ? "border-branco/15 bg-branco/5" : "border-borda bg-superficie-2",
              ].join(" ")}
            >
              <Image
                src={item.src}
                alt={item.titulo ?? item.legenda ?? "Foto do acervo do 16º BPM/M"}
                fill
                className={`${
                  encaixe === "contain" ? "object-contain" : "object-cover"
                } transition-transform duration-500 group-hover:scale-105`}
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 300px"
              />
              <span className="absolute inset-0 bg-azul-noite/0 transition-colors group-hover:bg-azul-noite/15" />
            </div>
            {mostrarTitulo && item.titulo && (
              <div className="mt-2 px-0.5">
                <p
                  className={`text-sm font-bold leading-snug ${
                    escuro ? "text-branco" : "text-azul-noite"
                  }`}
                >
                  {item.titulo}
                </p>
                {item.legenda && (
                  <p
                    className={`mt-0.5 text-xs font-semibold uppercase tracking-wider ${
                      escuro ? "text-ouro" : "text-texto-suave"
                    }`}
                  >
                    {item.legenda}
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {limiteInicial && !expandido && restantes > 0 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className={
              escuro
                ? "rounded-full border border-ouro-velho px-6 py-2.5 text-sm font-semibold text-ouro transition-colors hover:bg-ouro-velho hover:text-azul-noite"
                : "rounded-full border border-azul/30 px-6 py-2.5 text-sm font-semibold text-azul transition-colors hover:bg-azul hover:text-branco"
            }
          >
            Ver as {itens.length} imagens
          </button>
        </div>
      )}

      {atual &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={atual.titulo ?? "Imagem ampliada"}
            className="fixed inset-0 z-[100] flex flex-col bg-preto/92 p-4 backdrop-blur-sm md:p-8"
            onClick={() => setAberto(null)}
          >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAberto(null)}
              aria-label="Fechar"
              className="rounded-full p-2 text-branco/80 transition-colors hover:bg-branco/10 hover:text-branco"
            >
              <X size={26} />
            </button>
          </div>

          {/* items-stretch (e não items-center): com o alinhamento centralizado
              a <figure> encolhia para a altura da legenda e o contêiner da
              imagem, que é flex-1, ficava com altura zero — a foto sumia. */}
          <div
            className="flex min-h-0 flex-1 items-stretch gap-3 md:gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Imagem anterior"
              className="shrink-0 self-center rounded-full p-2 text-branco/70 transition-colors hover:bg-branco/10 hover:text-branco"
            >
              <ChevronLeft size={32} />
            </button>

            <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
              <div className="relative min-h-0 w-full flex-1">
                <Image
                  src={atual.src}
                  alt={atual.titulo ?? "Imagem ampliada do acervo do 16º BPM/M"}
                  fill
                  className="object-contain"
                  sizes="90vw"
                />
              </div>
              {(atual.titulo || atual.texto) && (
                <figcaption className="max-h-[30vh] w-full max-w-3xl shrink-0 overflow-y-auto text-center">
                  {atual.titulo && (
                    <p className="text-lg font-bold text-branco">{atual.titulo}</p>
                  )}
                  {atual.legenda && (
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ouro">
                      {atual.legenda}
                    </p>
                  )}
                  {atual.texto && (
                    <p className="mt-3 text-sm leading-relaxed text-branco/75">{atual.texto}</p>
                  )}
                </figcaption>
              )}
            </figure>

            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Próxima imagem"
              className="shrink-0 self-center rounded-full p-2 text-branco/70 transition-colors hover:bg-branco/10 hover:text-branco"
            >
              <ChevronRight size={32} />
            </button>
          </div>

            <p className="pt-3 text-center text-xs text-branco/45">
              {(aberto ?? 0) + 1} de {itens.length} · use as setas do teclado para navegar
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
