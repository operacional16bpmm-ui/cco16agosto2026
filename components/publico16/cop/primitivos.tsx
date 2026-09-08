"use client";

import { useId, useState } from "react";
import { ChevronDown, CheckCircle2, AlertTriangle, AlertCircle, Minus, Trophy } from "lucide-react";
import { ROTULO_NIVEL, type Nivel } from "@/lib/cop2026-metricas";
import { explicacaoDe } from "@/lib/cop2026-explicacoes";
import { cn } from "@/lib/utils";

/** Semáforo com rótulo, ponto e ícone SVG nativo: máxima acessibilidade
 *  e leitura imediata para daltônicos e relatórios impressos em P&B. */
const CLASSES_NIVEL: Record<Nivel, string> = {
  superacao: "bg-sinal-superacao-suave text-sinal-superacao border-sinal-superacao/40 font-semibold",
  conforme: "bg-sinal-conforme-suave text-sinal-conforme border-sinal-conforme/40 font-semibold",
  atencao: "bg-sinal-atencao-suave text-sinal-atencao border-sinal-atencao/40 font-semibold",
  critico: "bg-sinal-critico-suave text-sinal-critico border-sinal-critico/40 font-semibold",
  neutro: "bg-sinal-neutro-suave text-sinal-neutro border-sinal-neutro/30 font-medium",
};

export const COR_NIVEL: Record<Nivel, string> = {
  superacao: "var(--sinal-superacao)",
  conforme: "var(--sinal-conforme)",
  atencao: "var(--sinal-atencao)",
  critico: "var(--sinal-critico)",
  neutro: "var(--sinal-neutro)",
};

const ICONES_NIVEL = {
  superacao: <Trophy size={12} className="shrink-0" aria-hidden />,
  conforme: <CheckCircle2 size={12} className="shrink-0" aria-hidden />,
  atencao: <AlertTriangle size={12} className="shrink-0" aria-hidden />,
  critico: <AlertCircle size={12} className="shrink-0" aria-hidden />,
  neutro: <Minus size={12} className="shrink-0" aria-hidden />,
} as const;

export function Selo({
  nivel,
  texto,
  semIcone,
}: {
  nivel: Nivel;
  texto?: string;
  semIcone?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] shadow-xs tracking-tight",
        CLASSES_NIVEL[nivel]
      )}
    >
      {!semIcone && ICONES_NIVEL[nivel]}
      {texto ?? ROTULO_NIVEL[nivel]}
    </span>
  );
}

/**
 * COMO LER — o manual de cada quadro, embaixo do próprio quadro.
 *
 * Nasceu como um botão "Como ler" no canto do cabeçalho, que abria um popover
 * e carregava `nao-imprime`: quem lia o painel no PNG do WhatsApp ou na folha
 * impressa — a maior parte de quem lê — nunca via explicação nenhuma. O pedido
 * do Fabrício em 08/09/2026 foi o oposto disso: texto claro embaixo de cada
 * quadro, para leigo entender de primeira, e **entrando em tudo sempre**
 * (tela, briefing PNG, PDF e impressão).
 *
 * Daí a divisão em duas camadas:
 *
 * - `resumo` — uma ou duas frases em português comum, SEMPRE visíveis, em
 *   qualquer meio. É o que responde "o que este quadro está me dizendo".
 * - `calculo` / `exemplo` — a conta por trás, recolhida na tela atrás de
 *   "entenda a conta" e ABERTA no papel e no briefing, onde não há clique.
 *
 * O detalhe fica sempre no DOM e alterna por classe (`hidden`/`block`), nunca
 * por renderização condicional: `@media print` e `.modo-briefing` não
 * conseguem revelar o que o React não montou. É por isso que aqui não se usa
 * `{aberto && ...}` — parece equivalente e não é.
 */
export function ComoLer({
  titulo,
  resumo,
  calculo,
  exemplo,
  className,
}: {
  /** Nome do quadro — repetido dentro do detalhe para quem lê a folha solta. */
  titulo: string;
  /** A frase leiga. Sempre visível, em todos os meios. */
  resumo: React.ReactNode;
  /** A conta, passo a passo. Recolhida na tela, aberta no papel. */
  calculo?: React.ReactNode;
  /** Exemplo com os números que estão na tela, quando ajudam mais que a fórmula. */
  exemplo?: React.ReactNode;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const temDetalhe = Boolean(calculo || exemplo);

  return (
    <div
      className={cn(
        "como-ler mt-4 border-t-2 border-slate-200 pt-3",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-[#ca0202]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#ca0202]" />
        Como ler
      </p>

      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-texto-suave">{resumo}</p>

      {temDetalhe && (
        <>
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-controls={id}
            className="nao-imprime mt-2 inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-[11px] font-semibold text-texto-suave transition-colors hover:border-vermelho/40 hover:text-vermelho"
          >
            <ChevronDown
              size={13}
              aria-hidden
              className={cn("transition-transform", aberto && "rotate-180")}
            />
            Entenda a conta
          </button>

          {/* Sempre no DOM — ver a nota do componente. */}
          <div
            id={id}
            role="note"
            className={cn("como-ler-detalhe mt-2", aberto ? "block" : "hidden")}
          >
            <div className="rounded-lg border border-borda bg-white/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-texto-suave/80">
                {titulo}
              </p>
              {calculo && (
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">
                  {calculo}
                </div>
              )}
              {exemplo && (
                <div className="mt-2 rounded-md border border-[#ca0202]/25 bg-[#ca0202]/[0.05] px-2.5 py-2 text-[12.5px] leading-relaxed text-texto-suave">
                  <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-[#ca0202]">
                    Na prática
                  </span>
                  {exemplo}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Cartao({
  titulo,
  nota,
  ajuda,
  comoLer,
  exemplo,
  conclusao,
  children,
  className,
}: {
  titulo: string;
  nota?: string;
  /** A conta por trás do quadro. Antes abria num popover que não imprimia;
   *  hoje é a camada recolhível do bloco COMO LER, aberta no papel. */
  ajuda?: React.ReactNode;
  /** A frase leiga, sempre visível embaixo do quadro. */
  comoLer?: React.ReactNode;
  /** Exemplo numérico opcional, dentro do detalhe. */
  exemplo?: React.ReactNode;
  conclusao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  /* O texto vem do registro central quando a chamada não passa o dele — é o
     que faz um cartão novo, em qualquer tela, já nascer explicado sem ninguém
     lembrar de repassar a prop. Ver `lib/cop2026-explicacoes.tsx`. */
  const doRegistro = explicacaoDe(titulo);
  const resumo = comoLer ?? doRegistro?.resumo;
  /* `ajuda` é o texto que a chamada já escrevia à mão e continua valendo: ele
     é mais específico que o genérico do registro, então vence. */
  const detalhe = ajuda ?? doRegistro?.calculo;

  return (
    <section
      className={cn(
        "cartao-painel flex flex-col rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#edf3f8] p-5 sm:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all",
        className
      )}
    >
      <header className="mb-4">
        <h3 className="font-serif text-base sm:text-lg font-bold text-branco tracking-wide">
          {titulo}
        </h3>
        {nota && <p className="text-[12px] font-medium text-texto-suave">{nota}</p>}
      </header>

      <div className="flex-1">{children}</div>

      {conclusao && (
        <footer className="mt-4 border-t border-borda/60 pt-3 text-[12.5px] leading-relaxed text-texto-suave">
          {conclusao}
        </footer>
      )}

      {resumo && (
        <ComoLer titulo={titulo} resumo={resumo} calculo={detalhe} exemplo={exemplo} />
      )}
    </section>
  );
}

export function SemDados({ texto = "Sem lançamentos no recorte." }: { texto?: string }) {
  return (
    <p className="flex h-40 items-center justify-center rounded-lg border border-dashed border-borda text-[13.5px] text-texto-suave">
      {texto}
    </p>
  );
}
