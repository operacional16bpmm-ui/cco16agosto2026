import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

/**
 * Cabeçalho-capa da página pública do Inventário 2026: uma imagem só (a foto
 * da tropa, em cor, sem duotone pesado) como fundo, com um único gradiente
 * lateral só onde o texto precisa de contraste — o resto da foto fica
 * visível. Brasão e selo da PM entram como marcas por cima, não misturados
 * na foto. Vive fora de .tema-institucional na paleta — usa branco fixo
 * porque o texto senta sobre a foto, não sobre o fundo claro do resto da
 * página.
 */
export function CabecalhoInventario() {
  return (
    <header className="relative isolate min-h-[300px] overflow-hidden border-b border-black/20 bg-tatico-fundo sm:min-h-[340px]">
      <Image
        src="/inventario/equipe-tatica.jpg"
        alt="Equipe tática do 16º BPM/M em operação"
        fill
        priority
        className="object-cover object-[center_25%]"
      />
      {/* Um gradiente só, da esquerda (onde o texto senta) para a direita
          (onde a foto fica livre) — a imagem aparece de verdade. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10]/92 via-[#0b0c10]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10]/70 via-transparent to-transparent" />

      <div className="relative flex h-full min-h-[300px] flex-col sm:min-h-[340px]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 pt-6">
          <Link
            href="/"
            className="group inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={14}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            Página institucional
          </Link>
          <Link
            href="/16bpmm/calendario"
            className="group inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/50 hover:text-white"
          >
            <CalendarDays
              size={14}
              className="transition-transform duration-300 group-hover:rotate-[-8deg]"
            />
            Calendário de eventos
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-wrap items-end justify-between gap-6 px-4 pb-7">
          <div className="flex items-end gap-4">
            <Image
              src="/brand/16bpmm.png"
              alt="Brasão do 16º BPM/M"
              width={64}
              height={91}
              className="h-16 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:h-20"
              priority
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">
                16º BPM/M
              </p>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] sm:text-4xl">
                Inventário 2026
              </h1>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:text-sm">
                Central de planilhas do levantamento patrimonial: companhias, Força Tática e
                seções do Estado-Maior numa página só.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:p-2.5">
            <Image
              src="/inventario/selo-pm.png"
              alt="Polícia Militar do Estado de São Paulo"
              width={175}
              height={100}
              className="h-9 w-auto sm:h-11"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
