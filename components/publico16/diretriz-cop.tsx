"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { IconeDiretriz } from "@/components/publico16/icones-cop";

/**
 * Quadro com a Diretriz nº PM3-001/02/25 (Câmeras Operacionais Corporais)
 * embutida em PDF, para o policial ler e rolar a norma sem sair da página —
 * antes era preciso procurar o arquivo no Drive do Batalhão.
 */
export function DiretrizCop() {
  const arquivo = "/documentos/diretriz-pm3-001-02-25.pdf";
  // O PDF abre sozinho, mas só quando o quadro entra na tela: assim o policial
  // não precisa clicar em nada e o carregamento inicial da página continua leve
  // para quem abre no celular em serviço.
  const [aberto, setAberto] = useState(false);
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el || aberto) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setAberto(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [aberto]);
  return (
    <section ref={alvo} className="mt-10">
      <div className="overflow-hidden rounded-xl border-2 border-[#ca0202]/25 bg-white shadow-[0_4px_18px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#ca0202] bg-[#111] px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#ca0202] text-white">
              <IconeDiretriz size={30} />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5a5a]">
                Norma de referência
              </p>
              <h2 className="font-serif text-xl font-bold leading-tight text-white sm:text-2xl">
                Diretriz nº PM3-001/02/25
              </h2>
              <p className="text-[14px] text-white/65">Câmeras Operacionais Corporais (COP)</p>
            </div>
          </div>
          <a
            href={arquivo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#ca0202] px-5 py-3 text-[15px] font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#e40707]"
          >
            <Download size={19} strokeWidth={2.5} /> Abrir em tela cheia
          </a>
        </div>
        {/* O leitor nativo do navegador dá rolagem, busca e zoom sem carregar
            biblioteca nenhuma; o link acima cobre quem estiver no celular. */}
        {aberto ? (
          <object data={`${arquivo}#view=FitH`} type="application/pdf" className="block h-[60vh] w-full sm:h-[78vh]">
            <iframe
              src={`${arquivo}#view=FitH`}
              className="block h-[60vh] w-full sm:h-[78vh]"
              title="Diretriz nº PM3-001/02/25"
            />
          </object>
        ) : (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 bg-[#f4f6f9] px-6 text-center sm:h-[78vh]">
            <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-[#ca0202]/15 text-[#ca0202]">
              <Maximize2 size={26} strokeWidth={2.2} />
            </span>
            <span className="text-[15px] text-black/45">Carregando a diretriz…</span>
          </div>
        )}
      </div>
    </section>
  );
}
