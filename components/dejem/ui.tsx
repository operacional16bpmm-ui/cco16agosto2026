import type { ReactNode } from "react";
import { num, pctTexto } from "@/lib/dejem-calculo";

/**
 * Vocabulário visual do estudo DEJEM, no tema da vitrine /16bpmm.
 *
 * Por que não reusar components/command/ui.tsx: aqueles componentes usam
 * `text-branco` e `bg-tatico-super`, tokens que dentro de .tema-vitrine voltam
 * a significar branco de verdade — texto branco sobre cartão branco. Aqui as
 * classes são as mesmas da vitrine pública.
 */

type Fundo = "branco" | "superficie" | "escuro";

const FUNDOS: Record<Fundo, string> = {
  branco: "bg-branco",
  superficie: "bg-superficie",
  escuro: "bg-azul-noite text-branco",
};

export function Secao({
  id, fundo = "branco", children, className = "",
}: { id?: string; fundo?: Fundo; children: ReactNode; className?: string }) {
  // scroll-mt-20 compensa a altura da BarraEstudo, que é sticky no topo do
  // <main>. Sem esse recuo a âncora pararia com o título escondido atrás dela.
  return (
    <section id={id} className={`scroll-mt-20 ${FUNDOS[fundo]} py-16 md:py-24 ${className}`}>
      {/* min-w-0: sem isso, filho de grid ou flex não encolhe abaixo do
          tamanho do próprio conteúdo, e um gráfico ou tabela larga empurra a
          seção inteira para além da tela no celular. */}
      <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5">{children}</div>
    </section>
  );
}

/**
 * Divisor entre os três atos do estudo: Panorama, Análise e Decisão.
 *
 * Não é ornamento. A página tem quinze quadros de peso visual parecido, e sem
 * uma quebra forte o leitor não distingue o que é visão geral do que é
 * aprofundamento técnico. A faixa dá começo, meio e fim à leitura.
 */
export function AtoDivisor({
  numeral, titulo, descricao,
}: { numeral: string; titulo: string; descricao: string }) {
  return (
    <div className="bg-azul-noite text-branco">
      <div className="faixa-institucional h-1 w-full" />
      <div className="mx-auto max-w-[1180px] px-5 py-14 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-baseline md:gap-10">
          <p className="font-serif text-4xl leading-none text-ouro-velho md:text-5xl">{numeral}</p>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-ouro md:text-3xl">
              {titulo}
            </h2>
            <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-branco/70">
              {descricao}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TituloSecao({
  quadro, children, claro = false, descricao,
}: { quadro?: string; children: string; claro?: boolean; descricao?: string }) {
  return (
    <header className="mb-10">
      {quadro ? (
        <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${claro ? "text-ouro" : "text-vermelho"}`}>
          {quadro}
        </p>
      ) : null}
      <h2 className={`font-serif text-2xl uppercase tracking-wide md:text-3xl ${claro ? "text-ouro" : "text-azul-noite"}`}>
        {children}
      </h2>
      <div className="mt-4 h-1 w-24 rounded-full bg-ouro-velho" />
      {descricao ? (
        <p className={`mt-5 max-w-[74ch] text-[15px] leading-relaxed ${claro ? "text-branco/75" : "text-texto-suave"}`}>
          {descricao}
        </p>
      ) : null}
    </header>
  );
}

export function Card({
  children, className = "", escuro = false,
}: { children: ReactNode; className?: string; escuro?: boolean }) {
  return (
    // min-w-0 obrigatório: o ResponsiveContainer do Recharts mede o pai, e um
    // pai que não encolhe fixa o gráfico numa largura maior que a tela.
    <div
      className={`min-w-0 rounded-2xl border shadow-inst ${
        escuro ? "border-branco/15 bg-branco/5" : "border-borda bg-branco"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const TONS = {
  ok: "text-[#1d6349]",
  atencao: "text-[#9a6a0e]",
  critico: "text-vermelho",
  neutro: "text-azul-noite",
} as const;

export type Tom = keyof typeof TONS;

export function NumeroDestaque({
  valor, rotulo, nota, tom = "neutro", sufixo, casas = 0, claro = false,
}: {
  valor: number | null; rotulo: string; nota?: string; tom?: Tom;
  sufixo?: string; casas?: number; claro?: boolean;
}) {
  return (
    <div>
      <p className={`rotulo-dado ${claro ? "text-branco/55" : "text-texto-suave"}`}>{rotulo}</p>
      <p className={`dados-destaque mt-2.5 text-[30px] md:text-[34px] ${claro ? "text-ouro" : TONS[tom]}`}>
        {num(valor, casas)}
        {sufixo ? (
          <span className="ml-0.5 font-sans text-lg font-normal opacity-70">{sufixo}</span>
        ) : null}
      </p>
      {nota ? (
        <p className={`mt-2.5 text-[12.5px] leading-snug ${claro ? "text-branco/60" : "text-texto-suave"}`}>
          {nota}
        </p>
      ) : null}
    </div>
  );
}

export function Pilula({ valor, tom }: { valor: number | null; tom: Tom }) {
  const fundo = {
    ok: "bg-[#1d6349]/10 text-[#1d6349]",
    atencao: "bg-[#9a6a0e]/10 text-[#9a6a0e]",
    critico: "bg-vermelho/10 text-vermelho",
    neutro: "bg-azul-noite/10 text-azul-noite",
  }[tom];
  return (
    <span className={`dados inline-block rounded px-2 py-0.5 text-[11.5px] font-semibold ${fundo}`}>
      {pctTexto(valor)}
    </span>
  );
}

export function Barra({ pctLargura, tom = "neutro" }: { pctLargura: number | null; tom?: Tom }) {
  const cor = { ok: "bg-[#1d6349]", atencao: "bg-[#9a6a0e]", critico: "bg-vermelho", neutro: "bg-azul" }[tom];
  return (
    <span className="block h-1.5 w-full min-w-[52px] overflow-hidden rounded-full bg-superficie-2">
      <span className={`block h-full rounded-full ${cor}`} style={{ width: `${Math.max(0, Math.min(100, pctLargura ?? 0))}%` }} />
    </span>
  );
}

export type Coluna = { chave: string; rotulo: string; alinhar?: "direita"; largura?: string };

/**
 * Tabela do estudo. Nunca recolhe conteúdo: por decisão do usuário, todo o
 * dado fica à vista. A legibilidade vem de listras discretas, cabeçalho que
 * permanece visível ao rolar tabelas longas, e realce de linha ao passar o
 * cursor — e não de esconder número atrás de clique.
 */
export function Tabela({
  colunas, linhas, vazio = "Sem dados no recorte selecionado.", destacar, alturaMax,
}: {
  colunas: Coluna[];
  linhas: Record<string, ReactNode>[];
  vazio?: string;
  destacar?: (linha: Record<string, ReactNode>, i: number) => boolean;
  /** Ativa rolagem interna com cabeçalho fixo. Use em tabelas longas. */
  alturaMax?: string;
}) {
  if (!linhas.length) return <EstadoVazio texto={vazio} />;
  return (
    <div
      className="overflow-auto rounded-2xl border border-borda bg-branco shadow-inst"
      style={alturaMax ? { maxHeight: alturaMax } : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {colunas.map((c) => (
              <th
                key={c.chave}
                style={c.largura ? { width: c.largura } : undefined}
                className={`rotulo-dado whitespace-nowrap border-b border-borda bg-superficie px-3 py-2.5 text-texto-suave ${
                  c.alinhar === "direita" ? "text-right" : "text-left"
                }`}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr
              key={i}
              className={`transition-colors ${
                destacar?.(l, i)
                  ? "bg-vermelho/5"
                  : i % 2
                    ? "bg-superficie/45 hover:bg-azul/[0.06]"
                    : "hover:bg-azul/[0.06]"
              }`}
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={`whitespace-nowrap border-b border-borda px-3 py-2.5 ${
                    c.alinhar === "direita" ? "dados text-right text-[13px]" : "text-left"
                  } ${i === linhas.length - 1 ? "border-b-0" : ""}`}
                >
                  {l[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Faixa de números que abre um quadro, antes do gráfico e da tabela.
 * Serve para o leitor decidir em dois segundos se precisa descer aos dígitos.
 */
export function ResumoQuadro({
  itens,
}: { itens: { valor: number | null; rotulo: string; nota?: string; tom?: Tom; sufixo?: string; casas?: number }[] }) {
  return (
    <div className="mb-8 grid gap-px overflow-hidden rounded-2xl border border-borda bg-borda shadow-inst sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((k) => (
        <div key={k.rotulo} className="bg-branco px-5 py-5">
          <NumeroDestaque
            valor={k.valor}
            rotulo={k.rotulo}
            nota={k.nota}
            tom={k.tom ?? "neutro"}
            sufixo={k.sufixo}
            casas={k.casas ?? 0}
          />
        </div>
      ))}
    </div>
  );
}

export function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borda bg-superficie px-5 py-10 text-center text-sm text-texto-suave">
      {texto}
    </div>
  );
}

/**
 * Cartão de achado do Ato I. É o que o leitor precisa levar se só olhar o topo
 * da página, então carrega um número grande e uma frase que o interpreta.
 */
export function Achado({
  numero, unidade, titulo, texto, tom = "critico",
}: { numero: string; unidade?: string; titulo: string; texto: string; tom?: Tom }) {
  return (
    <article className="flex flex-col rounded-2xl border border-borda bg-branco p-6 shadow-inst">
      <p className={`dados-destaque text-[46px] ${TONS[tom]}`}>
        {numero}
        {unidade ? (
          <span className="ml-1.5 font-sans text-base font-normal text-texto-suave">{unidade}</span>
        ) : null}
      </p>
      <h3 className="mt-4 font-serif text-[17px] leading-snug text-azul-noite">{titulo}</h3>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-texto-suave">{texto}</p>
    </article>
  );
}

export function Nota({
  titulo, children, tom = "ouro",
}: { titulo: string; children: ReactNode; tom?: "ouro" | "vermelho" | "azul" }) {
  const cor = { ouro: "border-ouro-velho", vermelho: "border-vermelho", azul: "border-azul" }[tom];
  const rotulo = { ouro: "text-ouro-velho", vermelho: "text-vermelho", azul: "text-azul" }[tom];
  return (
    <div className={`mt-6 border-l-[3px] ${cor} bg-superficie px-5 py-4`}>
      <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${rotulo}`}>{titulo}</p>
      <div className="max-w-[80ch] text-[13.5px] leading-relaxed text-texto-suave [&_b]:font-semibold [&_b]:text-texto">
        {children}
      </div>
    </div>
  );
}

/** Aviso que ocupa o lugar de um quadro nominal quando o perfil não pode vê-lo. */
export function BloqueioNominal({ totalAgregado }: { totalAgregado: string }) {
  return (
    <div className="rounded-2xl border border-vermelho/40 bg-vermelho/5 px-6 py-8 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-vermelho">Quadro nominal restrito</p>
      <p className="mx-auto mt-3 max-w-[62ch] text-sm leading-relaxed text-texto-suave">
        A identificação por nome e RE é reservada ao Comando e ao Estado-Maior, por se tratar de dado
        pessoal de agente público (Lei nº 13.709/2018 e dever de sigilo funcional). {totalAgregado}
      </p>
    </div>
  );
}
