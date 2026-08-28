"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Lock, Maximize2, RotateCcw, Unlock } from "lucide-react";
import { IconeDiretriz } from "@/components/publico16/icones-cop";
import { ConfigurableSurface } from "@/components/publico16/configurable-surface";

const DIRETRIZ_LAYOUT = [{ i: "leitor-diretriz", x: 0, y: 0, w: 12, h: 24, minW: 4, minH: 10 }];
const DIRETRIZ_LABELS = { "leitor-diretriz": "Leitor da Diretriz" };

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
  const [editing, setEditing] = useState(false);
  const [resetToken, setResetToken] = useState(0);
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
      <div className="nao-imprime mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ca0202]/25 bg-white p-2.5 shadow-sm">
        <p className="px-2 text-xs font-black uppercase tracking-wider text-[#222]">Diretriz configurável</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#ca0202] px-3 py-2 text-xs font-black text-white"
          >
            {editing ? <Lock size={14} /> : <Unlock size={14} />}
            {editing ? "Concluir organização" : "Organizar quadro"}
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem("cop2026-diretriz-layout-v1");
              setResetToken((value) => value + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
          >
            <RotateCcw size={14} /> Restaurar
          </button>
        </div>
        {editing && <p className="w-full px-2 text-[11px] font-semibold text-slate-600">Arraste pela faixa vermelha e ajuste largura ou altura pelos cantos.</p>}
      </div>
      <ConfigurableSurface
        storageKey="cop2026-diretriz-layout-v1"
        editing={editing}
        resetToken={resetToken}
        defaults={DIRETRIZ_LAYOUT}
        labels={DIRETRIZ_LABELS}
      >
      <div key="leitor-diretriz" className="h-full overflow-hidden rounded-xl border-2 border-[#ca0202]/25 bg-white shadow-[0_4px_18px_rgba(0,0,0,0.08)]">
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
          <object
            data={`${arquivo}#view=FitH`}
            type="application/pdf"
            className="block min-h-80 w-full"
            style={{ height: "calc(100% - 96px)" }}
          >
            <iframe
              src={`${arquivo}#view=FitH`}
              className="block h-full min-h-80 w-full"
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
      </ConfigurableSurface>
    </section>
  );
}
