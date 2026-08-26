import Link from "next/link";
import {
  CIAS_ORDEM,
  DIAS_SEMANA,
  FAIXAS_ORDEM,
  MESES_CURTO,
  ROTULO_CIA,
  ROTULO_FAIXA,
  SEM_DADO,
  num,
  pctTexto,
  type CiaDejem,
} from "@/lib/dejem-calculo";

/** Blocos visuais renderizados no servidor — sem JS no cliente. */

/* ------------------------------------------------------------------ filtros */

/** Declarada FORA do FiltroBar: componente criado durante o render remonta a
 *  cada passagem e perde estado. Aqui não há estado, mas a regra vale igual. */
function Pill({ ativo, para, children }: { ativo: boolean; para: string; children: string }) {
  return (
    <Link
      href={para}
      scroll={false}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        ativo ? "bg-azul text-branco" : "border border-azul/25 text-azul hover:bg-azul/10"
      }`}
    >
      {children}
    </Link>
  );
}

export function FiltroBar({
  base, mes, cia, mesesDisponiveis,
}: {
  base: string;
  mes?: number;
  cia?: CiaDejem;
  mesesDisponiveis: number[];
}) {
  const href = (p: { mes?: number | null; cia?: CiaDejem | null }) => {
    const sp = new URLSearchParams();
    const m = p.mes === undefined ? mes : p.mes;
    const c = p.cia === undefined ? cia : p.cia;
    if (m) sp.set("mes", String(m));
    if (c) sp.set("cia", c);
    const q = sp.toString();
    return q ? `${base}?${q}` : base;
  };

  // Compacto: vai dentro da BarraEstudo, que é sticky. Continua sem estado de
  // cliente — cada opção é um <Link> e o servidor relê o recorte da URL.
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-texto-suave">Mês</span>
        <Pill ativo={!mes} para={href({ mes: null })}>Tudo</Pill>
        {mesesDisponiveis.map((m) => (
          <Pill key={m} ativo={mes === m} para={href({ mes: m })}>{MESES_CURTO[m]}</Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-texto-suave">Cia</span>
        <Pill ativo={!cia} para={href({ cia: null })}>Todas</Pill>
        {CIAS_ORDEM.filter((c) => c !== "sem").map((c) => (
          <Pill key={c} ativo={cia === c} para={href({ cia: c })}>
            {c === "ft" ? "FT" : c === "em" ? "EM" : `${c}ª`}
          </Pill>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- funil */

/**
 * Dois blocos, não um funil descendente único.
 *
 * Há 8.828 inscrições para 3.916 vagas: um funil que começasse nas inscrições
 * sugeriria seis mil "perdas", o que seria falso. Inscrição é pressão de
 * demanda, não etapa de conversão.
 */
export function BlocoFunil({
  vagas, inscritos, escalados, presentes, inscricoesPorVaga, taxaEscalacao, taxaPresenca,
}: {
  vagas: number; inscritos: number; escalados: number; presentes: number;
  inscricoesPorVaga: number | null; taxaEscalacao: number | null; taxaPresenca: number | null;
}) {
  const etapas = [
    { rotulo: "Vagas ofertadas", valor: vagas, pct: 100, cor: "bg-azul-noite" },
    { rotulo: "PMs escalados", valor: escalados, pct: vagas ? (escalados / vagas) * 100 : 0, cor: "bg-azul" },
    { rotulo: "Presença confirmada", valor: presentes, pct: vagas ? (presentes / vagas) * 100 : 0, cor: "bg-ouro-velho" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-2xl border border-borda bg-superficie p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-vermelho">Pressão de demanda</p>
        <p className="tabular mt-3 font-serif text-5xl leading-none text-azul-noite">
          {num(inscricoesPorVaga, 2)}
          <span className="ml-1 font-sans text-2xl text-texto-suave">×</span>
        </p>
        <p className="mt-3 max-w-[38ch] text-[13.5px] leading-relaxed text-texto-suave">
          <b className="font-semibold text-texto">{num(inscritos)} inscrições</b> disputaram{" "}
          <b className="font-semibold text-texto">{num(vagas)} vagas</b>. Não é etapa de funil: é
          quanta gente se ofereceu para cada vaga aberta.
        </p>
      </div>

      <div className="rounded-2xl border border-borda bg-branco p-6 shadow-inst">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-vermelho">Conversão da vaga</p>
        <div className="mt-5 space-y-4">
          {etapas.map((e) => (
            <div key={e.rotulo}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-texto">{e.rotulo}</span>
                <span className="tabular text-[15px] font-semibold text-azul-noite">{num(e.valor)}</span>
              </div>
              <span className="block h-2.5 w-full overflow-hidden rounded-full bg-superficie-2">
                <span className={`block h-full rounded-full ${e.cor}`} style={{ width: `${e.pct}%` }} />
              </span>
            </div>
          ))}
        </div>
        <div className="tabular mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-borda pt-4 text-[13px]">
          <span className="text-texto-suave">
            Vaga vira escala: <b className="font-semibold text-vermelho">{pctTexto(taxaEscalacao)}</b>
          </span>
          <span className="text-texto-suave">
            Escala vira presença: <b className="font-semibold text-[#1d6349]">{pctTexto(taxaPresenca)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- heatmap */

export function Heatmap({
  linhas, maximo,
}: {
  linhas: { dow: number; rotulo: string; celulas: { faixa: string; jornadas: number }[] }[];
  maximo: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px] rounded-2xl border border-borda bg-branco p-4 shadow-inst">
        <div className="grid grid-cols-[92px_repeat(4,1fr)] gap-1.5">
          <div />
          {FAIXAS_ORDEM.map((f) => (
            <div key={f} className="pb-2 text-center text-[9.5px] font-semibold uppercase tracking-[0.08em] text-texto-suave">
              {ROTULO_FAIXA[f].split(" ")[0]}
              <br />
              <span className="font-normal normal-case tracking-normal">{ROTULO_FAIXA[f].split(" ").slice(1).join(" ")}</span>
            </div>
          ))}
          {linhas.map((l) => (
            <div key={l.dow} className="contents">
              <div className="flex items-center pr-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-texto-suave">
                {l.rotulo}
              </div>
              {l.celulas.map((c) => {
                const intensidade = maximo ? c.jornadas / maximo : 0;
                const claro = intensidade > 0.55;
                return (
                  <div
                    key={c.faixa}
                    className={`tabular rounded py-3 text-center text-[13px] font-semibold ${claro ? "text-branco" : "text-azul-noite"}`}
                    style={{ background: `rgba(22, 41, 74, ${Math.max(0.04, intensidade * 0.95)})` }}
                    title={`${l.rotulo}, ${ROTULO_FAIXA[c.faixa as keyof typeof ROTULO_FAIXA]}: ${c.jornadas} jornadas`}
                  >
                    {c.jornadas}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sumário */

export function Sumario({ itens }: { itens: { id: string; rotulo: string; quadro: string }[] }) {
  return (
    <nav aria-label="Sumário do estudo" className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="group flex items-baseline gap-3 border-b border-branco/10 py-2 text-sm text-branco/75 transition-colors hover:text-ouro"
        >
          <span className="tabular w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-ouro-velho">
            {i.quadro}
          </span>
          <span className="group-hover:underline">{i.rotulo}</span>
        </a>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------- ficha da Companhia */

export function MiniSerie({ valores }: { valores: number[] }) {
  const max = Math.max(1, ...valores);
  return (
    <span className="flex h-8 items-end gap-[3px]" aria-hidden>
      {valores.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-t-sm bg-azul/70"
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          title={`${MESES_CURTO[i + 1]}: ${v}`}
        />
      ))}
    </span>
  );
}

export function ComposicaoBarra({ dejem, delegada }: { dejem: number; delegada: number | null }) {
  if (delegada === null) return <span className="text-xs text-texto-suave">{SEM_DADO}</span>;
  const total = dejem + delegada;
  if (!total) return <span className="text-xs text-texto-suave">{SEM_DADO}</span>;
  return (
    <span className="flex h-2.5 w-full min-w-[80px] overflow-hidden rounded-full bg-superficie-2" title={`DEJEM ${dejem} · Delegada (est.) ${delegada}`}>
      <span className="block bg-vermelho" style={{ width: `${(dejem / total) * 100}%` }} />
      <span className="block bg-ouro-velho" style={{ width: `${(delegada / total) * 100}%` }} />
    </span>
  );
}

export const rotuloCia = (c: CiaDejem) => ROTULO_CIA[c];
export const rotuloDia = (d: number) => DIAS_SEMANA[d];
