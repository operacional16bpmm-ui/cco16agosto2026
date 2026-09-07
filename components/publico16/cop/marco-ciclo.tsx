/**
 * A faixa da virada de ciclo e o botão de relatório do mês fechado.
 *
 * O que esta peça resolve: no dia 1º o contador de todo mundo volta a zero, e
 * quem abre a página não tem como saber disso — os números do painel são os
 * mesmos widgets do mês anterior, só que vazios. A faixa diz, antes de
 * qualquer número, que o mês virou e que a meta recomeçou; e leva junto o
 * caminho para o relatório do mês que fechou, que é o que o Comando pede
 * assim que o período encerra.
 *
 * Todas as cores aqui são literais (#07182d, #ca0202, white), nunca os tokens
 * `text-branco` / `bg-tatico-*`: estas peças vivem dentro do wrapper
 * `.tema-institucional`, que redefine `--branco` para grafite. Token de tema em
 * bloco escuro nasce ilegível — é a mesma armadilha que o hero da página já
 * evita usando `text-white` na mão.
 *
 * Nada aqui lê a planilha. A faixa fala de calendário e de regra, não de
 * conformidade: nenhum percentual de cumprimento passa por este arquivo.
 */

import Link from "next/link";
import { ArrowRight, CalendarDays, FileCheck2, Sunrise } from "lucide-react";
import {
  cicloCorrente,
  hojeBrt,
  mesAnterior,
  periodoPorExtenso,
  ultimoRelatorioPublicado,
  type Ciclo,
} from "@/lib/cop2026-ciclo";
import { periodoEncerrado, type RelatorioMes } from "@/lib/cop2026-relatorios";
import { AuroraCiclo, EtiquetaCiclo, SeloMes, TrilhaDias } from "./arte-ciclo";

/* ---------------------------------------------------------------------------
 * Botão de relatório do mês fechado
 * ------------------------------------------------------------------------- */

/**
 * O botão é a própria medalha do mês: selo à esquerda, destino à direita e um
 * brilho metálico atravessando a peça. Não é um botão com ícone — é um botão
 * que É a peça gráfica, que é o que faz a tropa parar nele em vez de rolar
 * direto para o formulário.
 *
 * `pilula` é a versão de barra (cabeçalho, topo de página interna); `cartao` é
 * a versão de bloco, que ganha a linha de descrição.
 */
export function BotaoRelatorioMes({
  mes,
  variante = "cartao",
  chaveSelo,
}: {
  mes: RelatorioMes;
  variante?: "cartao" | "pilula";
  chaveSelo?: string;
}) {
  const cartao = variante === "cartao";
  // O relatório de um mês pode ser publicado no próprio dia 31, antes das
  // 23h59: nesse caso o período ainda não fechou e a peça não pode carimbar
  // "encerrado". Mesma linguagem do hub de relatórios.
  const encerrado = periodoEncerrado(mes);

  return (
    <Link
      href={`/cop2026/relatorios/${mes.chave}`}
      className={
        "group relative isolate flex items-center gap-4 overflow-hidden rounded-2xl border border-[#ca0202]/45 " +
        "bg-[linear-gradient(135deg,#1c0508_0%,#0d1018_45%,#07182d_100%)] " +
        "shadow-[0_12px_34px_rgba(0,0,0,0.45)] transition-all duration-300 " +
        "hover:-translate-y-0.5 hover:border-[#ff4b4b]/70 hover:shadow-[0_18px_46px_rgba(202,2,2,0.38)] " +
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4b4b] " +
        (cartao ? "w-full max-w-md p-4 sm:p-5" : "px-4 py-2.5")
      }
    >
      {/* Brilho metálico: passa sozinho de tempos em tempos e acompanha o
          cursor no hover. É o único elemento perpétuo da peça. */}
      <span
        aria-hidden="true"
        className="mc-foil pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <SeloMes
        abrev={mes.abrev}
        ano={mes.ano}
        estado={encerrado ? "encerrado" : "em-curso"}
        chave={chaveSelo}
        tamanho={cartao ? 76 : 40}
        className="shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
      />

      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-black uppercase tracking-[0.24em] text-white/45">
          {encerrado ? "Ciclo encerrado" : "Encerra hoje às 23h59"}
        </span>
        <span
          className={
            "block font-serif font-black uppercase leading-tight text-white " +
            (cartao ? "text-lg sm:text-xl" : "text-[13px]")
          }
        >
          Relatório de {mes.rotulo}
        </span>
        {cartao && (
          <span className="mt-1 block text-[12.5px] leading-snug text-white/55">
            Executivo analítico · Dados consolidados · Briefing de Comando
          </span>
        )}
      </span>

      <ArrowRight
        className={
          "shrink-0 text-[#ff8a8a] transition-transform duration-300 group-hover:translate-x-1 " +
          (cartao ? "h-5 w-5" : "h-4 w-4")
        }
      />
    </Link>
  );
}

/* ---------------------------------------------------------------------------
 * A faixa da virada
 * ------------------------------------------------------------------------- */

/** Manchete e subtítulo por estado do ciclo. O mês nunca entra escrito à mão. */
function manchete(ciclo: Ciclo) {
  const nome = ciclo.mes.rotulo.toUpperCase();
  if (ciclo.estado === "em-curso") {
    // Normalmente o último dia já cai em `vespera`, porque a faixa passa a
    // anunciar o mês seguinte. Quando não existe seguinte — dezembro, fim da
    // lista — sobra este caso, e aí "COMEÇOU / a meta voltou a zero" seria a
    // frase errada no dia em que o período está acabando.
    if (ciclo.restam === 0) {
      return {
        chapeu: "Último dia",
        titulo: `${nome} ENCERRA HOJE`,
        linha: "às 23h59 o período fecha e entra em consolidação",
        icone: CalendarDays,
      };
    }
    return {
      chapeu: "Ciclo em curso",
      titulo: `${nome} COMEÇOU`,
      linha: "a meta de cada companhia voltou a zero",
      icone: Sunrise,
    };
  }
  if (ciclo.estado === "vespera") {
    return {
      chapeu: "Virada de ciclo",
      titulo: `${nome} COMEÇA À MEIA-NOITE`,
      linha: "a meta de cada companhia volta a zero",
      icone: CalendarDays,
    };
  }
  // Passado o último mês da lista não há ciclo nenhum para anunciar. Dizer
  // "DEZEMBRO ABRE EM BREVE" em janeiro de 2027 é pior que não dizer nada —
  // a faixa admite que o próximo período depende do Comando abrir.
  if (ciclo.estado === "encerrado") {
    return {
      chapeu: "Ciclo encerrado",
      titulo: `${nome} ENCERRADO`,
      linha: "o próximo período de auditoria ainda não foi aberto",
      icone: CalendarDays,
    };
  }
  return {
    chapeu: "Próximo ciclo",
    titulo: `${nome} ABRE EM BREVE`,
    linha: "o período seguinte de auditoria",
    icone: CalendarDays,
  };
}

function legendaDoPeriodo(ciclo: Ciclo): string {
  if (ciclo.estado === "em-curso") {
    const dia = String(ciclo.dia).padStart(2, "0");
    return ciclo.restam === 0
      ? `Dia ${dia} de ${ciclo.totalDias} — último dia do período`
      : `Dia ${dia} de ${ciclo.totalDias} · restam ${ciclo.restam} ${ciclo.restam === 1 ? "dia" : "dias"} de período`;
  }
  return `Abre no dia 1º · ${ciclo.totalDias} dias de lançamento`;
}

/**
 * @param urlFormulario  Destino do botão principal — o mesmo formulário do
 *                       hero. Chega por prop porque a URL é do domínio do
 *                       Batalhão (`lib/cop2026.ts`), não desta peça gráfica.
 * @param hoje           Data `YYYY-MM-DD` a fingir. Só a página passa, e só
 *                       quando o visitante pede `?dia=` — serve para o Comando
 *                       conferir a peça do mês que vem antes da virada. Sem
 *                       ela, vale o relógio de Brasília.
 */
export function MarcoCiclo({ urlFormulario, hoje }: { urlFormulario: string; hoje?: string }) {
  const ciclo = cicloCorrente(hoje ?? hojeBrt());
  const fechado = ultimoRelatorioPublicado();
  const { chapeu, titulo, linha, icone: Icone } = manchete(ciclo);
  // No dia 31 o relatório de agosto já está publicado, mas o período só fecha
  // às 23h59 — a medalha e a etiqueta seguem `periodoEncerrado`, não o fato de
  // o relatório existir.
  const estadoSelo = fechado && periodoEncerrado(fechado) ? "encerrado" : "em-curso";
  // O mês que encerra hoje, quando a faixa já anuncia o próximo.
  const fechando = ciclo.estado === "vespera" ? mesAnterior(ciclo.mes) : undefined;

  const parametros = [
    { rotulo: "Evidências por turno", valor: "3", nota: "mínimo obrigatório" },
    { rotulo: "Turnos no período", valor: "15", nota: "escala 12x36" },
    /* NUNCA um percentual aqui. Ate 07/09/2026 este cartao trazia "0%" FIXO no
       codigo: a landing publica anunciava 0% de cumprimento enquanto o painel
       do Comando mostrava 37,4%. Metrica mora no dashboard (decisao de
       26/08/2026); o que esta pagina informa e a REGRA do contador. */
    { rotulo: "Contagem da meta", valor: "Mensal", nota: "zera no dia 1º" },
  ];

  return (
    <section className="relative isolate overflow-hidden border-y-4 border-[#ca0202] bg-[#070b14]">
      <AuroraCiclo />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="mc-entra flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
              <span className="h-px w-8 bg-[#ca0202]" />
              <Icone className="h-4 w-4 text-[#ff4b4b]" />
              {chapeu} · Auditoria de COP
            </p>

            <h2
              className="mc-entra mt-4 font-serif text-[2.1rem] font-black uppercase leading-[1.03] tracking-tight text-white sm:text-[3.4rem]"
              style={{ ["--mc-d" as string]: "90ms" }}
            >
              {titulo}
              <span className="mt-1 block bg-[linear-gradient(92deg,#ff8a8a,#ca0202_58%,#7d0000)] bg-clip-text text-[1.05rem] font-bold normal-case tracking-normal text-transparent sm:text-[1.6rem]">
                {linha}
              </span>
            </h2>

            <p
              className="mc-entra mt-5 max-w-xl text-[15px] leading-relaxed text-slate-300"
              style={{ ["--mc-d" as string]: "180ms" }}
            >
              {/* Na véspera a faixa fala de DOIS meses: o título anuncia o que
                  abre à meia-noite e este parágrafo explica o que encerra às
                  23h59. São meses diferentes — daí `fechando`, e não
                  `ciclo.mes`, que é o do título. */}
              {ciclo.estado === "vespera"
                ? `O período de ${(fechando ?? ciclo.mes).rotulo.toLowerCase()} encerra hoje às 23h59 e o relatório entra em consolidação. A partir da meia-noite a contagem recomeça: três evidências auditadas por turno, todo dia de serviço.`
                : `A contagem de ${ciclo.mes.rotulo.toLowerCase()} corre desde o dia 1º e nada do período anterior é aproveitado. São três evidências auditadas por turno, todo dia de serviço.`}
            </p>

            {/* Trilha dos dias + a mesma informação escrita: a arte não pode ser
                a única portadora do dado. */}
            <div className="mc-entra mt-8 max-w-xl" style={{ ["--mc-d" as string]: "260ms" }}>
              <TrilhaDias total={ciclo.totalDias} dia={ciclo.dia} />
              {/* No mobile as duas legendas empilham: lado a lado elas quebram
                  no meio da frase e uma encavala na outra. */}
              <p className="mt-2.5 flex flex-col gap-1 border-t border-white/15 pt-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span>{legendaDoPeriodo(ciclo)}</span>
                {/* /35 dava 3,36:1 sobre o fundo da faixa — abaixo do mínimo
                    AA. Página institucional lida no sol, dentro da viatura. */}
                <span className="shrink-0 text-white/60">{periodoPorExtenso(ciclo.mes)}</span>
              </p>
            </div>

            <div
              className="mc-entra mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ ["--mc-d" as string]: "340ms" }}
            >
              <a
                href={urlFormulario}
                className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-red-300/40 bg-gradient-to-br from-[#d50909] to-[#a90000] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(126,0,0,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#e40707] hover:to-[#bd0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <FileCheck2 className="h-[18px] w-[18px]" />
                {/* Na véspera quem está de serviço ainda lança o mês que está
                    fechando — o botão não pode prometer um ciclo que só abre à
                    meia-noite. */}
                {ciclo.estado === "em-curso"
                  ? `Abrir o ciclo de ${ciclo.mes.rotulo.toLowerCase()}`
                  : "Preencher a auditoria do turno"}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <dl className="grid flex-1 grid-cols-3 gap-2">
                {parametros.map((p) => (
                  <div
                    key={p.rotulo}
                    className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 backdrop-blur-sm"
                  >
                    <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
                      {p.rotulo}
                    </dt>
                    <dd className="mt-0.5 font-mono text-lg font-bold leading-none text-white">
                      {p.valor}
                    </dd>
                    <dd className="mt-0.5 text-[10.5px] text-white/45">{p.nota}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Coluna do mês que fechou: a medalha grande, a etiqueta e o botão
              que leva ao relatório. */}
          {fechado && (
            <div
              className="mc-entra flex flex-col items-center gap-4 lg:w-[320px]"
              style={{ ["--mc-d" as string]: "420ms" }}
            >
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="mc-aurora absolute -inset-8 -z-10 rounded-full blur-2xl"
                  style={{
                    background: "radial-gradient(closest-side, rgba(202,2,2,0.55), transparent 70%)",
                  }}
                />
                <SeloMes
                  abrev={fechado.abrev}
                  ano={fechado.ano}
                  estado={estadoSelo}
                  tamanho={190}
                  chave={`marco-${fechado.chave}`}
                  className="drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
                />
              </div>
              <EtiquetaCiclo estado={estadoSelo} />
              <BotaoRelatorioMes mes={fechado} chaveSelo={`botao-${fechado.chave}`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Capa do relatório do mês — a mesma arte, por dentro
 * ------------------------------------------------------------------------- */

/**
 * Cabeçalho gráfico da página de um mês (`/cop2026/relatorios/agosto`). É o
 * "por dentro" do botão: quem clicou na medalha chega numa página que abre com
 * a mesma medalha, e sabe que chegou onde clicou.
 */
export function CapaRelatorioMes({
  mes,
  encerrado,
}: {
  mes: RelatorioMes;
  encerrado: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-[#ca0202]/35 bg-[#070b14] shadow-[0_18px_50px_rgba(7,24,45,0.28)]">
      <AuroraCiclo />

      <div className="relative flex flex-col items-center gap-6 px-6 py-9 text-center sm:flex-row sm:items-center sm:gap-8 sm:px-9 sm:text-left">
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="mc-foil pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <SeloMes
            abrev={mes.abrev}
            ano={mes.ano}
            estado={encerrado ? "encerrado" : "em-curso"}
            tamanho={128}
            chave={`capa-${mes.chave}`}
            className="drop-shadow-[0_14px_32px_rgba(0,0,0,0.55)]"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
            Auditoria e Governança · 16º BPM/M
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-black uppercase leading-tight tracking-wide text-white sm:text-4xl">
            Relatórios de {mes.rotulo}
          </h1>
          <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#ff8a8a]">
            {periodoPorExtenso(mes)}
          </p>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-slate-300">
            Consolidação do controle e fiscalização do uso das câmeras operacionais corporais no
            período, conforme a Diretriz PM3-001/02/25.
          </p>
          <div className="mt-4 flex justify-center sm:justify-start">
            <EtiquetaCiclo estado={encerrado ? "encerrado" : "em-curso"} />
          </div>
        </div>
      </div>
    </section>
  );
}
