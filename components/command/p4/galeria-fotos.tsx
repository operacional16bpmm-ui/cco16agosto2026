"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, Camera } from "lucide-react";

export type FotoGaleria = {
  unidade: string;
  categoria: string | null;
  nome_arquivo: string;
  thumb_path: string | null;
  caminho_unc: string;
  largura: number | null;
  altura: number | null;
};

/**
 * Galeria do inventário fotográfico do material bélico.
 *
 * Só o thumbnail (WEBP ~640px, gerado por scripts/thumbs_p4.py) é servido pelo
 * portal — as 753 fotos originais somam 5,3 GB e continuam na rede. O modal
 * mostra o caminho UNC do original para quem precisar da imagem em resolução
 * plena (perícia, instrução de IPM), sem carregar o repositório com o binário.
 */
/** Quantas fotos renderizar por vez — 753 <img> de uma vez trava o navegador. */
const PAGINA = 60;

export function GaleriaFotos({ fotos }: { fotos: FotoGaleria[] }) {
  const [unidade, setUnidade] = useState<string>("todas");
  const [categoria, setCategoria] = useState<string>("todas");
  const [aberta, setAberta] = useState<FotoGaleria | null>(null);
  const [limite, setLimite] = useState(PAGINA);

  const unidades = useMemo(
    () => Array.from(new Set(fotos.map((f) => f.unidade))).sort(),
    [fotos]
  );
  const categorias = useMemo(
    () =>
      Array.from(
        new Set(
          fotos
            .filter((f) => unidade === "todas" || f.unidade === unidade)
            .map((f) => f.categoria)
            .filter((c): c is string => Boolean(c))
        )
      ).sort(),
    [fotos, unidade]
  );

  const filtradas = useMemo(
    () =>
      fotos.filter(
        (f) =>
          (unidade === "todas" || f.unidade === unidade) &&
          (categoria === "todas" || f.categoria === categoria)
      ),
    [fotos, unidade, categoria]
  );

  const btn = (ativo: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${
      ativo
        ? "border-azul/50 bg-azul/20 font-semibold text-branco"
        : "border-branco/15 text-branco/55 hover:border-branco/30 hover:text-branco"
    }`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button className={btn(unidade === "todas")} onClick={() => { setUnidade("todas"); setCategoria("todas"); setLimite(PAGINA); }}>
          Todas as unidades
        </button>
        {unidades.map((u) => (
          <button
            key={u}
            className={btn(unidade === u)}
            onClick={() => { setUnidade(u); setCategoria("todas"); setLimite(PAGINA); }}
          >
            {u}
          </button>
        ))}
      </div>

      {categorias.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button className={btn(categoria === "todas")} onClick={() => { setCategoria("todas"); setLimite(PAGINA); }}>
            Todo material
          </button>
          {categorias.map((c) => (
            <button key={c} className={btn(categoria === c)} onClick={() => { setCategoria(c); setLimite(PAGINA); }}>
              {c}
            </button>
          ))}
        </div>
      )}

      <p className="mb-3 text-xs text-branco/40">
        {filtradas.length} foto{filtradas.length === 1 ? "" : "s"}
        {filtradas.length > limite && ` · exibindo ${limite}`}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtradas.slice(0, limite).map((f) => (
          <button
            key={f.caminho_unc}
            onClick={() => setAberta(f)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-branco/10 bg-tatico-super/40"
            title={f.nome_arquivo}
          >
            {f.thumb_path ? (
              <Image
                src={f.thumb_path}
                alt={`${f.categoria ?? "Material"} — ${f.unidade}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                // Os thumbs já saem prontos de scripts/thumbs_p4.py (WEBP 640px,
                // q72). Deixar o Next reprocessá-los só gastaria CPU para
                // devolver um arquivo maior do que o que já temos.
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center text-branco/20">
                <Camera size={20} />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-left text-[10px] text-branco/80">
              {f.categoria ?? f.unidade}
            </span>
          </button>
        ))}
      </div>

      {filtradas.length > limite && (
        <button
          onClick={() => setLimite((l) => l + PAGINA)}
          className="mt-4 w-full rounded-lg border border-branco/15 py-2.5 text-xs text-branco/60 transition-colors hover:border-azul/40 hover:text-branco"
        >
          Carregar mais {Math.min(PAGINA, filtradas.length - limite)} fotos
        </button>
      )}

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setAberta(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-full w-full max-w-3xl overflow-auto rounded-xl border border-branco/15 bg-tatico-super p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-branco">{aberta.nome_arquivo}</p>
                <p className="text-xs text-branco/50">
                  {aberta.unidade}
                  {aberta.categoria ? ` · ${aberta.categoria}` : ""}
                </p>
              </div>
              <button
                onClick={() => setAberta(null)}
                className="rounded-md p-1 text-branco/50 transition-colors hover:bg-branco/10 hover:text-branco"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            {aberta.thumb_path && (
              <Image
                src={aberta.thumb_path}
                alt={aberta.nome_arquivo}
                width={aberta.largura ?? 640}
                height={aberta.altura ?? 480}
                className="h-auto w-full rounded-lg"
                unoptimized
              />
            )}
            <p className="mt-3 text-[10px] text-branco/35">
              Pré-visualização otimizada. Original em resolução plena:
            </p>
            <p className="tempo mt-0.5 break-all text-[10px] text-branco/55">{aberta.caminho_unc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
