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
 * NA MESMA TARDE ele fechou a paleta: *"os botões que você mexeu agora,
 * vermelhos: use a cor de cinza bandeirante e algo da cor da PMESP"*. O corpo
 * dos quatro passou a ser cinza ou azul bandeirante, e a cor institucional
 * virou ACENTO — o trilho da borda esquerda, o anel da lente e a etiqueta.
 * A regra de classificação de docs/cop2026-padroes-comando.md §2 sobrevive: o
 * vermelho continua marcando só o que a tropa EXECUTA, agora como traço e não
 * como berro. Os quatro corpos têm luminância bem acima do fundo `#070b14`,
 * que era o problema original.
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

/**
 * OS QUATRO TONS — determinação do Major Zochio em 09/09/2026, segunda volta:
 * *"os botões do COP que você mexeu agora, vermelhos: use a cor de cinza
 * bandeirante e algo da cor da PMESP"*.
 *
 * O vermelho CHEIO saiu dos dois cartões de ação. O corpo dos quatro passou a
 * ser cinza bandeirante ou azul bandeirante, e a cor institucional entra como
 * **acento** — o trilho de 6px na borda esquerda, o anel da lente e a etiqueta:
 *
 * | cartão | corpo | trilho institucional |
 * |---|---|---|
 * | Preencher a auditoria | cinza bandeirante claro | vermelho PMESP `#ca0202` |
 * | Dashboard de metas | azul bandeirante | azul-bandeira `#305388` |
 * | Relatar problemas | cinza bandeirante escuro | vermelho PMESP `#ca0202` |
 * | Briefing executivo | aço | cromo/prata — a cor da logomarca da PMESP |
 *
 * O QUE O TRILHO PRESERVA: o vermelho continua marcando, e só, as duas coisas
 * que a tropa EXECUTA (lançar a auditoria e avisar que o sistema caiu). Ele
 * deixou de ser o corpo do botão e virou o traço — a informação de
 * classificação sobrevive, o berro não. Quem for pintar um cartão novo de
 * vermelho cheio está desfazendo esta decisão, não corrigindo um esquecimento.
 */
export type TomAcao = "acao" | "alerta" | "azul" | "aco";

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
/**
 * O TRILHO É GRADIENTE, E ISSO NÃO É ENFEITE.
 *
 * Medido em 09/09/2026: o vermelho institucional chapado (`#ca0202`) sobre o
 * cinza bandeirante do cartão dá contraste de **1,00:1** — mesma luminância.
 * Quem enxerga cor vê o traço vermelho; quem tem visão de cor reduzida não vê
 * traço nenhum. O mesmo valia para o azul-bandeira sobre o corpo azul (1,29:1).
 *
 * A saída é a aresta clara: o trilho vai do tom claro ao institucional, o que
 * separa por LUMINÂNCIA sem trocar a cor da instituição — a base do gradiente
 * continua sendo o hex oficial.
 */
/** Vermelho institucional da PMESP, o mesmo do cabeçalho e do brasão. */
const VERMELHO_PM = `linear-gradient(180deg, #ff4d4d 0%, #ca0202 55%, #8f0101 100%)`;
/** Azul-bandeira do portal (`--azul-bandeira`). */
const AZUL_BANDEIRA = `linear-gradient(180deg, #7db4e8 0%, #305388 55%, #1d3a63 100%)`;
/** Cromo/prata — a cor em que a logomarca da PMESP é registrada. */
const CROMO = `linear-gradient(180deg, #ffffff 0%, #c9d3de 55%, #8a97a6 100%)`;

const TONS: Record<
  TomAcao,
  {
    fundo: string;
    borda: string;
    /** Trilho institucional de 6px na borda esquerda, em gradiente. */
    trilho: string;
    brilho: string;
    acento: string;
    anel: string;
    foco: string;
  }
> = {
  acao: {
    /* Cinza bandeirante CLARO — o cartão da ação que o Batalhão precisa que
       aconteça. É o corpo mais luminoso do conjunto: a hierarquia que antes
       vinha do vermelho cheio agora vem do brilho e do trilho vermelho. */
    fundo: "from-[#8b95a5] via-[#5a6474] to-[#333a46]",
    borda: "rgba(255,107,107,0.8)",
    trilho: VERMELHO_PM,
    brilho: "shadow-[0_10px_26px_rgba(24,28,36,0.5)] hover:shadow-[0_16px_34px_rgba(202,2,2,0.35)]",
    acento: "text-[#ffd2d2]",
    anel: "ring-[#ff6b6b]/70 bg-[#ca0202]/30",
    foco: "focus-visible:outline-[#ffd2d2]",
  },
  alerta: {
    /* Cinza bandeirante ESCURO — mesmo trilho vermelho, corpo mais fechado.
       Fica um degrau abaixo do cartão de lançamento de propósito: relatar
       falha é ação de exceção, o lançamento é o de todo turno. */
    fundo: "from-[#6d7787] via-[#434b59] to-[#252a33]",
    borda: "rgba(255,107,107,0.6)",
    trilho: VERMELHO_PM,
    brilho: "shadow-[0_10px_26px_rgba(17,20,26,0.55)] hover:shadow-[0_16px_34px_rgba(202,2,2,0.3)]",
    acento: "text-[#ffc4c4]",
    anel: "ring-[#ff6b6b]/55 bg-[#ca0202]/22",
    foco: "focus-visible:outline-[#ffc4c4]",
  },
  azul: {
    /* Azul bandeirante: `--azul-bandeira` (#305388) puxado para o `--azul-noite`
       (#16294a). Contra o fundo #070b14 do hero, é o maior salto de luminância
       do conjunto — foi a peça que o Major não achava na tela. */
    fundo: "from-[#3d86c9] via-[#2565a8] to-[#173a63]",
    borda: "rgba(125,211,252,0.55)",
    trilho: AZUL_BANDEIRA,
    brilho: "shadow-[0_10px_26px_rgba(19,47,82,0.5)] hover:shadow-[0_16px_34px_rgba(45,107,168,0.45)]",
    acento: "text-[#bae6fd]",
    anel: "ring-[#bae6fd]/45 bg-[#ffffff]/10",
    foco: "focus-visible:outline-[#bae6fd]",
  },
  aco: {
    /* Aço: leitura de período fechado. Trilho em cromo — a cor da logomarca. */
    fundo: "from-[#74849b] via-[#4d5b70] to-[#2b3442]",
    borda: "rgba(226,232,240,0.45)",
    trilho: CROMO,
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
      {/* TRILHO INSTITUCIONAL — a cor da PMESP entra por aqui, e não pelo corpo
          do cartão. Vermelho nas duas ações da tropa, azul-bandeira na consulta
          ao vivo, cromo na síntese do Comando. Vai em `style` pelo mesmo motivo
          da borda (a regra sem camada de globals.css). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        /* A linha escura de 1px à direita é o que garante o traço em QUALQUER
           corpo: o vermelho institucional tem quase a mesma luminância do cinza
           bandeirante claro (1,83:1 no cartão de lançamento), e sem a aresta o
           trilho depende de enxergar cor. */
        style={{ backgroundImage: t.trilho, boxShadow: "1px 0 0 rgba(0,0,0,0.5)" }}
      />

      {/* O `t.acento` fica NO PAI: o ponto usa `bg-current`, e sem uma cor
          declarada aqui o `currentColor` que ele herda é o `text-branco` da
          página — que dentro de `.tema-institucional` vale GRAFITE (#1d1d1d),
          não branco. Medido em 09/09/2026: o ponto das quatro etiquetas saía
          quase invisível sobre o corpo do cartão. */}
      <span className={cn("relative flex items-center gap-2", t.acento)}>
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-current",
            aoVivo && "animar-ao-vivo"
          )}
        />
        <span className="dados text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[9.5px] sm:font-bold sm:tracking-[0.22em]">
          {etiqueta}
        </span>
      </span>

      <span className="relative mt-3 flex items-start gap-3">
        {/* Anel de lente: o ícone do módulo no centro de um diafragma. */}
        <span
          className={cn(
            "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11 sm:ring-2",
            t.anel
          )}
        >
          <Icone size={20} className="text-white" />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold leading-tight text-white sm:text-[15.5px] sm:font-black">
            {titulo}
          </span>
          <span className={cn("mt-1 block text-[11.5px] leading-snug sm:text-[12.5px]", t.acento)}>
            {nota}
          </span>
        </span>
      </span>
    </>
  );

  const classe = cn(
    "group relative isolate flex min-h-[120px] flex-col overflow-hidden rounded-2xl border p-3.5 sm:min-h-[132px] sm:border-2 sm:p-4",
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
