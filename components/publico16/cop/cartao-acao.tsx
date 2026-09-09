import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * CARTÃO DE AÇÃO DA HOME — o "visor" das quatro entradas do sistema.
 *
 * POR QUE ELE EXISTE (Major Zochio, 09/09/2026, com print do celular):
 * as quatro ações da home eram dois botões VERMELHOS CHEIOS ("Preencher a
 * auditoria" e "Relatar problemas") ao lado de dois quase invisíveis — o
 * Dashboard em `#071120` e o Briefing em `#151924` sobre um fundo `#070b14`.
 * Medido no print: os dois vermelhos cobriam ~46% e ~58% da faixa deles; os
 * outros dois, nada. Palavras dele: *"com o vermelho elas passam batido"* e
 * *"deixa a cor do Dashboard e do briefing em um cinza bandeirante ou em um tom
 * de azul, para contrastar com o fundo da página e com o vermelho das outras
 * duas — mais neuroergonômicas e instintivas de acesso, mas sem ficar baiano"*.
 *
 * A DECISÃO DE COR, escrita para não ser desfeita por engano:
 * - **vermelho** continua sendo SEMÂNTICO e exclusivo das duas ações que a
 *   tropa executa: lançar a auditoria e avisar que o sistema caiu
 *   (docs/cop2026-padroes-comando.md §2 — cor é classificação, não decoração);
 * - **azul bandeirante** (`--azul-bandeira`/`--azul-noite`) é consulta ao vivo:
 *   o Dashboard;
 * - **aço** (grafite azulado) é a leitura fechada do período: o Briefing.
 *   Os dois têm luminância bem acima do fundo `#070b14`, que era o problema.
 *
 * A LINGUAGEM VISUAL é a da própria matéria do sistema — câmera operacional
 * corporal: cantoneiras de visor, o ícone dentro de um anel de lente, a
 * etiqueta técnica em monoespaçada e a varredura de scanline no hover. É
 * decoração com referente, não enfeite: quem abre a página sabe em dois
 * segundos que o assunto é imagem gravada em serviço.
 *
 * ACESSIBILIDADE: o cartão inteiro é o alvo (não só o texto), o foco tem
 * contorno visível e nada depende de cor sozinha — cada cartão traz rótulo,
 * etiqueta e ícone distintos.
 */

export type TomAcao = "vermelho" | "azul" | "aco";

/**
 * ⚠️ A COR DA BORDA VAI EM `style`, NÃO EM CLASSE — e isto não é preferência.
 *
 * `app/globals.css` tem, FORA de qualquer `@layer`, a regra
 * `* { border-color: var(--borda) }`. No Tailwind v4 os utilitários vivem em
 * `@layer utilities`, e CSS sem camada vence CSS em camada independentemente
 * de especificidade: `border-[#7dd3fc]/45` é gerado, aparece no HTML e **não
 * pinta nada**. Medido aqui em 09/09/2026 — a borda dos cartões saía
 * `rgba(29,29,29,0.16)` (o `--borda` do tema claro) sobre fundo azul-marinho,
 * isto é, invisível. É a mesma armadilha do `--branco` que vira grafite dentro
 * de `.tema-institucional`: o token do tema atropela a peça escura.
 *
 * Inline vence os dois. Quem for trocar estas cores por classe: meça o
 * `getComputedStyle(...).borderColor` depois, não confie no HTML.
 */
const TONS: Record<
  TomAcao,
  { fundo: string; borda: string; brilho: string; acento: string; anel: string; foco: string }
> = {
  vermelho: {
    fundo: "from-[#c9101a] via-[#a60a12] to-[#7d0007]",
    borda: "rgba(255,154,154,0.55)",
    brilho: "shadow-[0_10px_26px_rgba(126,0,0,0.38)] hover:shadow-[0_16px_34px_rgba(126,0,0,0.5)]",
    acento: "text-[#ffd7d7]",
    anel: "ring-[#ffd7d7]/45 bg-[#ffffff]/10",
    foco: "focus-visible:outline-[#ffd7d7]",
  },
  azul: {
    /* Azul bandeirante: `--azul-bandeira` (#305388) puxado para o `--azul-noite`
       (#16294a). Contra o fundo #070b14 do hero, é o maior salto de luminância
       do conjunto — foi a peça que o Major não achava na tela. */
    fundo: "from-[#3d86c9] via-[#2565a8] to-[#173a63]",
    borda: "rgba(125,211,252,0.55)",
    brilho: "shadow-[0_10px_26px_rgba(19,47,82,0.5)] hover:shadow-[0_16px_34px_rgba(45,107,168,0.45)]",
    acento: "text-[#bae6fd]",
    anel: "ring-[#bae6fd]/45 bg-[#ffffff]/10",
    foco: "focus-visible:outline-[#bae6fd]",
  },
  aco: {
    /* Aço: o "cinza bandeirante" que ele pediu como alternativa ao azul. Fica
       um passo abaixo do azul na hierarquia — o Briefing é leitura de período
       fechado, o Dashboard é o número de agora. */
    fundo: "from-[#74849b] via-[#4d5b70] to-[#2b3442]",
    borda: "rgba(226,232,240,0.45)",
    brilho: "shadow-[0_10px_26px_rgba(20,26,36,0.5)] hover:shadow-[0_16px_34px_rgba(90,106,128,0.4)]",
    acento: "text-[#e2e8f0]",
    anel: "ring-[#e2e8f0]/40 bg-[#ffffff]/10",
    foco: "focus-visible:outline-[#e2e8f0]",
  },
};

/** Cantoneira de visor. Quatro por cartão, decorativas. */
function Cantoneira({ posicao }: { posicao: "ne" | "no" | "se" | "so" }) {
  const lados = {
    no: "left-2 top-2 border-l-2 border-t-2 rounded-tl",
    ne: "right-2 top-2 border-r-2 border-t-2 rounded-tr",
    so: "bottom-2 left-2 border-b-2 border-l-2 rounded-bl",
    se: "bottom-2 right-2 border-b-2 border-r-2 rounded-br",
  } as const;
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-3.5 w-3.5 border-current opacity-45 transition-opacity duration-200 group-hover:opacity-90",
        lados[posicao]
      )}
    />
  );
}

export function CartaoAcao({
  href,
  externo = false,
  tom,
  etiqueta,
  titulo,
  nota,
  Icone,
  /** Ponto pulsante na etiqueta — só na ação que está "gravando" agora. */
  aoVivo = false,
  className,
}: {
  href: string;
  externo?: boolean;
  tom: TomAcao;
  /** Etiqueta técnica em monoespaçada, no topo do cartão. */
  etiqueta: string;
  titulo: string;
  nota: string;
  Icone: (p: { size?: number; className?: string }) => React.ReactElement;
  aoVivo?: boolean;
  className?: string;
}) {
  const t = TONS[tom];

  const conteudo = (
    <>
      <Cantoneira posicao="no" />
      <Cantoneira posicao="ne" />
      <Cantoneira posicao="so" />
      <Cantoneira posicao="se" />

      {/* Varredura de scanline no hover — o gesto de leitura de imagem. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
      />
      {/* Linhas horizontais finíssimas: textura de sensor, quase imperceptível. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_4px)]"
      />

      <span className="relative flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-current",
            aoVivo && "animar-ao-vivo"
          )}
        />
        <span
          className={cn(
            "dados text-[9.5px] font-bold uppercase tracking-[0.22em]",
            t.acento
          )}
        >
          {etiqueta}
        </span>
      </span>

      <span className="relative mt-3 flex items-start gap-3">
        {/* Anel de lente: o ícone do módulo no centro de um diafragma. */}
        <span
          className={cn(
            "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2 transition-transform duration-200 group-hover:scale-105",
            t.anel
          )}
        >
          <Icone size={22} className="text-white" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15.5px] font-black leading-tight text-white">
            {titulo}
          </span>
          <span className={cn("mt-1 block text-[12.5px] leading-snug", t.acento)}>
            {nota}
          </span>
        </span>
      </span>
    </>
  );

  const classe = cn(
    "group relative isolate flex min-h-[132px] flex-col overflow-hidden rounded-2xl border-2 p-4",
    "bg-gradient-to-br transition-all duration-200 hover:-translate-y-1",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    t.fundo,
    t.brilho,
    t.foco,
    className
  );
  const estilo = { borderColor: t.borda };

  return externo ? (
    <a href={href} className={classe} style={estilo}>
      {conteudo}
    </a>
  ) : (
    <Link href={href} className={classe} style={estilo}>
      {conteudo}
    </Link>
  );
}
