import { ArrowUpRight } from "lucide-react";

/** Glifo do Instagram desenhado à mão: o lucide desta versão não traz marcas. */
function IconeInstagram({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Vitrine do @16bpmm_oficial no fim da página da auditoria. A tropa entra aqui
 * todo dia para lançar a COP — é o melhor lugar do portal para puxar audiência
 * para o perfil. Os reels tocam sozinhos, mudos e em loop, como no bloco
 * "O 16º em ação" da Sala de Operações.
 */
const REELS = [
  {
    src: "/media/reel-operacao.mp4",
    poster: "/media/reel-operacao.jpg",
    titulo: "Operações no território",
  },
  {
    src: "/media/reel-casas-bomba.mp4",
    poster: "/media/reel-casas-bomba.jpg",
    titulo: "Combate ao tráfico",
  },
  {
    src: "/media/reel-patrulha.mp4",
    poster: "/media/reel-patrulha.jpg",
    titulo: "Presença e patrulhamento",
  },
];

const NUMEROS = [
  { valor: "30 mil", rotulo: "seguidores" },
  { valor: "3,04 mi", rotulo: "visualizações · 90 dias" },
  { valor: "796 mil", rotulo: "contas alcançadas" },
];

export function Instagram16() {
  return (
    <section className="bg-[#0d1730] text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-4 py-1.5 text-[13px] font-bold tracking-wide text-white">
              <IconeInstagram tamanho={16} /> @16bpmm_oficial
            </span>
            <h2 className="mt-4 font-serif text-2xl font-bold uppercase leading-tight tracking-wide sm:text-3xl">
              O 16º em ação
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
              O trabalho da tropa na rua, todo dia, no perfil oficial do Batalhão. Acompanhe,
              compartilhe e mostre à população o que o 16º BPM/M faz.
            </p>
          </div>
          <a
            href="https://www.instagram.com/16bpmm_oficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-md bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Seguir no Instagram <ArrowUpRight size={20} />
          </a>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          {REELS.map((r) => (
            <a
              key={r.src}
              href="https://www.instagram.com/16bpmm_oficial/reels/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-white/12 bg-black shadow-xl"
            >
              <video
                className="aspect-[9/16] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                src={r.src}
                poster={r.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4">
                <span className="block text-[15px] font-bold leading-snug text-white">
                  {r.titulo}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-white/65">
                  <IconeInstagram tamanho={13} /> ver no perfil
                </span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {NUMEROS.map((n) => (
            <div
              key={n.rotulo}
              className="rounded-xl border border-white/12 bg-white/[0.06] px-5 py-4 text-center"
            >
              <p className="dados-destaque text-2xl text-[#ffcf3f]">
                {n.valor}
              </p>
              <p className="mt-1 text-[13px] uppercase tracking-wide text-white/60">{n.rotulo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
