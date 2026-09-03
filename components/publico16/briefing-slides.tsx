"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock,
  FileSearch,
  Gauge,
  Home,
  LogOut,
  Layers,
  ListChecks,
  Maximize2,
  Minimize2,
  Percent,
  Printer,
  ScrollText,
  Shield,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { type LancamentoCop, type MetaSubunidade } from "@/lib/cop2026";
import { AssinaturaDesenvolvimento, SelosSeguranca } from "@/components/publico16/cop/rodape-cop";
import {
  calcularPainel,
  conclusaoDistribuicao,
  conclusaoFunil,
  conclusaoHorario,
  conclusaoPareto,
  conclusaoQualidade,
  conclusaoRitmo,
  veredito,
  DIAS,
  FAIXAS_HORA,
  FMT,
  PCT,
  ROTULO_NIVEL,
  SUBTITULO_NIVEL,
  nivelPorCumprimento,
  type Nivel,
} from "@/lib/cop2026-metricas";
import { type RelatorioMes } from "@/lib/cop2026-relatorios";
import { DiretrizEmFoco } from "@/components/publico16/diretriz-em-foco";
import { AgulhaoMetas } from "@/components/publico16/cop/graficos";
import {
  AreaDiaria,
  Barra,
  Bloco,
  BarrasRotulo,
  Cartao,
  Chip,
  ColunasQualidade,
  Contador,
  FAIXA,
  FunilRastreio,
  INST,
  Kpi,
  Leitura,
  MatrizHorario,
  ParetoCarga,
  SUPERFICIE,
  T,
  atraso,
} from "@/components/publico16/cop/briefing-ui";

/**
 * Briefing Executivo da Auditoria de COP 2026 — a apresentação que o Comando
 * projeta em telão.
 *
 * O que este arquivo NÃO faz mais: inventar número, cor e tamanho de fonte por
 * slide. Toda tipografia, cor de faixa e movimento vêm de `briefing-ui.tsx`;
 * todo número vem de `calcularPainel` — o mesmo motor do dashboard, para os
 * dois nunca discordarem na reunião. Frase de diagnóstico é `veredito()` e as
 * `conclusao*()`, não texto fixo: um briefing que afirma "faixa crítica" com o
 * valor cravado no JSX continua dizendo isso no dia em que a meta for batida.
 *
 * Ordem dos slides = ordem de uma exposição ao Comando: onde estamos (capa e
 * veredito) → por que medimos assim (diretriz) → quem está onde (frações,
 * semanas) → como vem andando (ritmo, qualidade, rastreabilidade, carga,
 * cobertura) → o que fazer (exceções e plano).
 */
export function BriefingSlides({
  lancamentos,
  metas,
  lidoEm,
  email,
  ehAdmin = false,
  mes = null,
}: {
  lancamentos: LancamentoCop[];
  metas: MetaSubunidade[];
  lidoEm: string;
  email?: string;
  ehAdmin?: boolean;
  /** Mês do ciclo que o briefing apresenta. Vem resolvido do servidor
   *  (`mesCorrente()`) para que o recorte não dependa do relógio de quem
   *  projeta o telão. `null` = fora do ciclo de 2026. */
  mes?: RelatorioMes | null;
}) {
  const [i, setI] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  /* Mesmo motor e mesmo recorte do dashboard: o MÊS CORRENTE, nunca "tudo o
     que já entrou". A meta de 960 é mensal — sem este recorte o briefing
     projetado em setembro somaria agosto contra a meta de um mês só e
     anunciaria superação que não houve. Fora do ciclo, sem recorte: melhor o
     ciclo inteiro do que telão vazio. */
  const p = useMemo(
    () =>
      calcularPainel(lancamentos, metas, {
        fracao: "todas",
        semana: "todas",
        turno: "todos",
        de: mes?.periodo.de ?? "",
        ate: mes?.periodo.ate ?? "",
        excecao: "",
        busca: "",
      }),
    [lancamentos, metas, mes]
  );

  const v = veredito(p);
  const nivel: Nivel = p.nivelGeral;
  const auditoresTotal = metas.reduce((s, m) => s + m.efetivo, 0);
  const ritmo = Math.ceil(p.ritmoNecessario);
  const foraRotulos = useMemo(
    () => new Set(p.foraDeControle.map((d) => d.data)),
    [p.foraDeControle]
  );
  const comIds = p.dados.filter((l) => l.idsMidia.trim()).length;
  const taxaIds = p.dados.length ? (comIds / p.dados.length) * 100 : 0;
  const engajamento = auditoresTotal > 0 ? (p.ativos / auditoresTotal) * 100 : 0;
  /* Vem do motor, não da soma dos cartões: `naoAuditou + abaixo` deixava
     `semIds` de fora e o rodapé anunciava "0 desvio(s)" com 8 pendentes na
     mesma tela. Somar os três também estaria errado — eles se sobrepõem.
     Ver `excecoesPorFracao` em lib/cop2026-metricas.ts. */
  const desvios = p.excecoes.totalPendencia;
  /* As frações que puxam a meta para baixo. É delas que sai o plano de ação —
     cobrar "o Batalhão" não move nada, cobrar a fração move. */
  const criticas = [...p.fracoes].sort((a, b) => a.pct - b.pct).slice(0, 3);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const slides: {
    selo: string;
    titulo: string;
    subtitulo?: string;
    icone?: React.ReactNode;
    semCabecalho?: boolean;
    corpo: React.ReactNode;
  }[] = [
    // -------------------------------------------------------------------
    // 00 · CAPA
    // -------------------------------------------------------------------
    {
      selo: "Apresentação Executiva do Comando",
      titulo: "Auditoria & Governança das Câmeras Operacionais Corporais",
      subtitulo: '16º BPM/M — "1º Ten PM Fernão" · Diretriz PM3-001/02/25',
      semCabecalho: true,
      corpo: (
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center space-y-6 py-1 text-center">
          <div className="bf-entra relative" style={atraso(0)}>
            <div className="absolute -inset-3 rounded-2xl bg-[#ca0202]/20 blur-2xl" />
            <div className="relative aspect-[3/2] w-60 overflow-hidden rounded-2xl bg-black/60 shadow-2xl ring-1 ring-white/20 sm:w-80">
              <Image
                src="/cop2026/cop-colete-pmesp.webp"
                alt="Câmera operacional corporal acoplada ao uniforme da Polícia Militar do Estado de São Paulo"
                width={1200}
                height={800}
                className="h-full w-full object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
            </div>
          </div>

          <div className="bf-entra space-y-2.5" style={atraso(1)}>
            <p className={`${T.rotulo} text-[#ff5a5a]`}>
              Polícia Militar do Estado de São Paulo · CPM
            </p>
            <h1 className={`${T.display} text-white`}>
              16º Batalhão de Polícia Militar Metropolitano
            </h1>
            <p className={`${T.corpo} text-white/60`}>
              Auditoria &amp; Governança das Câmeras Operacionais Corporais · Diretriz
              PM3-001/02/25
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="bf-ao-vivo h-2 w-2 rounded-full bg-[#ca0202]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white sm:text-xs">
                {/* O mês entra no selo, não em constante: em 1º de outubro o
                    telão tem que dizer "Outubro" sozinho. */}
                Ambiente Executivo de Gestão e Controle
                {mes ? ` · ${mes.rotulo}/${mes.ano}` : ""}
              </span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
            <Kpi i={2} rotulo="Meta global" valor={p.meta} nota="evidências no mês" icone={<Target size={13} />} />
            <Kpi
              i={3}
              rotulo="Auditadas"
              valor={p.total}
              nivel={nivel}
              nota={`${PCT.format(p.pct)}% da meta`}
              icone={<CheckCircle2 size={13} />}
            />
            <Kpi
              i={4}
              rotulo="Auditores"
              valor={auditoresTotal}
              nota={`${FMT.format(p.ativos)} com lançamento`}
              icone={<Users size={13} />}
            />
            <Kpi
              i={5}
              rotulo="Turnos-fração restantes"
              valor={p.turnosRestantes}
              nivel={p.turnosRestantes > 0 ? "atencao" : "neutro"}
              nota={`de ${FMT.format(p.turnosPrevistos)} no período`}
              icone={<Timer size={13} />}
            />
          </div>

          <p className={`bf-entra ${T.apoio} text-white/40`} style={atraso(6)}>
            Dados lidos ao vivo da planilha corporativa · {lidoEm}
          </p>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 01 · VEREDITO
    // -------------------------------------------------------------------
    {
      selo: "Desempenho geral do 16º BPM/M",
      titulo: "Conformidade e ritmo da meta operacional",
      subtitulo: `Aferição ao vivo da meta de ${FMT.format(p.meta)} evidências${
        mes ? ` em ${mes.rotulo}/${mes.ano}` : " no ciclo"
      }`,
      icone: <Gauge size={13} />,
      corpo: (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="bf-entra" style={atraso(0)}>
            <AgulhaoMetas
              pct={p.pct}
              total={p.total}
              meta={p.meta}
              ritmo={ritmo}
              turnosRestantes={p.turnosRestantes}
              titulo='16º BPM/M — "1º Ten PM Fernão"'
              subtitulo={{
                linha1: `META GLOBAL — ${FMT.format(p.meta)} EVIDÊNCIAS`,
                linha2: "DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE",
                linha3: "Distribuição Proporcional por Matriz Operacional",
              }}
            />
          </div>

          <div className="space-y-3">
            <Cartao nivel={nivel} i={1} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip nivel={nivel} />
                <span className={`${T.rotulo} text-white/50`}>{SUBTITULO_NIVEL[nivel]}</span>
              </div>
              <h3 className={`font-serif text-[15px] font-bold leading-snug sm:text-[17px] ${FAIXA[nivel].texto}`}>
                {v.titulo}
              </h3>
              <p className={`${T.corpo} text-white/80`}>{v.detalhe}</p>
            </Cartao>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <Kpi
                i={2}
                rotulo="Ritmo necessário"
                valor={ritmo}
                nivel="atencao"
                /* O Batalhão se mede POR DIA; por turno-fração é a medida da
                   fração. Esta peça dizia "68/turno · para fechar em 13
                   turno(s)" — o modelo antigo, que o Comando mandou corrigir
                   em 02/09/2026. */
                sufixo="/dia"
                nota={`para fechar em ${FMT.format(p.janela.diasRestantes)} dia(s)`}
                icone={<TrendingUp size={13} />}
              />
              <Kpi
                i={3}
                rotulo="Saldo restante"
                valor={p.falta}
                nivel={p.falta > 0 ? "critico" : "conforme"}
                nota="evidências a recuperar"
                icone={<Clock size={13} />}
              />
              <Kpi
                i={4}
                rotulo="Média por dia"
                valor={p.mediaDia}
                nota={`meta de ${FMT.format(Math.round(p.metaDia))} por dia`}
                icone={<Activity size={13} />}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { n: "critico" as Nivel, faixa: "< 50%" },
                  { n: "atencao" as Nivel, faixa: "50 – 79%" },
                  { n: "conforme" as Nivel, faixa: "80 – 100%" },
                  { n: "superacao" as Nivel, faixa: "> 100%" },
                ] satisfies { n: Nivel; faixa: string }[]
              ).map((f, k) => (
                <Cartao
                  key={f.n}
                  nivel={f.n}
                  i={5 + k}
                  className={`p-2.5 text-center ${f.n === nivel ? "ring-1 ring-white/35" : ""}`}
                >
                  <p className={`${T.rotulo} ${FAIXA[f.n].texto}`}>{ROTULO_NIVEL[f.n]}</p>
                  <p className={`dados mt-0.5 text-[12px] text-white/60`}>{f.faixa}</p>
                </Cartao>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 02 · DIRETRIZ
    // -------------------------------------------------------------------
    {
      selo: "Norma de referência",
      titulo: "Registro operacional e governança da auditoria",
      subtitulo: "Sete pontos de relevância normativa da Diretriz PM3-001/02/25",
      icone: <ScrollText size={13} />,
      corpo: (
        <div className="bf-entra w-full" style={atraso(0)}>
          <DiretrizEmFoco variante="briefing" hrefBase="/documentos/diretriz-pm3-001-02-25.pdf" />
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 03 · FRAÇÕES
    // -------------------------------------------------------------------
    {
      selo: "Matriz operacional proporcional",
      titulo: "Desempenho comparativo por fração",
      subtitulo: `Rateio da meta sobre o efetivo de ${FMT.format(auditoresTotal)} policiais designados`,
      icone: <Layers size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 md:grid-cols-2">
            {p.fracoes.map((f, k) => (
              <Cartao key={f.chave} nivel={f.nivel} i={k} className="p-3.5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-white sm:text-sm">
                    <Shield size={13} className={FAIXA[f.nivel].texto} />
                    {f.rotulo}
                  </span>
                  <span className={`metric-card text-[1.05rem] ${FAIXA[f.nivel].texto}`}>
                    {PCT.format(f.pct)}%
                  </span>
                </div>

                <Barra pct={f.pct} nivel={f.nivel} i={k} />

                <dl className="mt-2.5 grid grid-cols-4 gap-1.5 border-t border-white/10 pt-2">
                  {[
                    { r: "Feito", d: `${FMT.format(f.feito)} / ${FMT.format(f.meta)}` },
                    { r: "Faltam", d: FMT.format(f.falta) },
                    { r: "Efetivo", d: `${FMT.format(f.lancaram)} / ${FMT.format(f.efetivo)}` },
                    { r: "Ritmo", d: `${FMT.format(Math.ceil(f.ritmoNecessario))}/turno` },
                  ].map((c) => (
                    <div key={c.r}>
                      <dt className={`${T.rotulo} text-white/40`}>{c.r}</dt>
                      <dd className={`${T.dado} text-white/85`}>{c.d}</dd>
                    </div>
                  ))}
                </dl>
              </Cartao>
            ))}
          </div>

          <Leitura i={p.fracoes.length}>
            A meta de cada fração é proporcional ao seu efetivo — quem tem mais policiais
            responde por mais evidências. {criticas[0]?.rotulo} está no menor índice do
            Batalhão ({PCT.format(criticas[0]?.pct ?? 0)}%) e precisa de{" "}
            {FMT.format(Math.ceil(criticas[0]?.ritmoNecessario ?? 0))} evidências por turno para
            fechar o ciclo.
          </Leitura>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 04 · SEMANAS
    // -------------------------------------------------------------------
    {
      selo: "Evolução temporal do ciclo",
      titulo: "Cumprimento da meta por semana operacional",
      subtitulo: "Quatro janelas de auditoria contínua dentro do mês",
      icone: <CalendarRange size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {p.semanasBatalhao.map((s, k) => (
              <Cartao key={s.semana} nivel={s.nivel} i={k} className="flex flex-col gap-2 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`${T.rotulo} text-white/60`}>{s.rotulo}</span>
                  <Chip nivel={s.nivel}>{PCT.format(s.pct)}%</Chip>
                </div>
                <p className={`${T.apoio} text-white/45`}>dias {s.diasRotulo}</p>
                <p className={`${T.numero} text-white`}>
                  <Contador valor={s.feito} />
                  <span className="ml-1 text-[0.5em] font-normal text-white/50">
                    de {FMT.format(s.meta)}
                  </span>
                </p>
                <Barra pct={s.pct} nivel={s.nivel} altura="h-2" i={k} />
                <div className="flex justify-between border-t border-white/10 pt-1.5">
                  <span className={`${T.rotulo} text-white/40`}>Saldo</span>
                  <span className={`${T.dado} ${FAIXA[s.nivel].texto}`}>{FMT.format(s.falta)}</span>
                </div>
              </Cartao>
            ))}
          </div>

          <Bloco i={4} icone={<Activity size={15} />} titulo="Ritmo diário e faixa de controle">
            <AreaDiaria
              dados={p.porDia}
              mediaDia={p.mediaDia}
              lsc={p.lsc}
              lic={p.lic}
              metaDia={p.metaDia}
              foraRotulos={foraRotulos}
            />
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <span className={`${T.apoio} flex items-center gap-1.5 text-white/55`}>
                <span className="h-0.5 w-4" style={{ background: INST.vermelhoClaro }} /> evidências
                no dia
              </span>
              <span className={`${T.apoio} flex items-center gap-1.5 text-white/55`}>
                <span
                  className="h-0.5 w-4"
                  style={{ background: `repeating-linear-gradient(90deg, ${INST.ouro} 0 4px, transparent 4px 7px)` }}
                />
                meta por dia ({FMT.format(Math.round(p.metaDia))})
              </span>
              <span className={`${T.apoio} flex items-center gap-1.5 text-white/55`}>
                <span className="h-2.5 w-4 rounded-sm bg-white/15" /> variação normal (±3σ)
              </span>
              <span className={`${T.apoio} flex items-center gap-1.5 text-white/55`}>
                <span className="h-2 w-2 rounded-full" style={{ background: INST.ouro }} /> dia fora
                da faixa
              </span>
            </div>
            <Leitura>{conclusaoRitmo(p)}</Leitura>
          </Bloco>

          <p className={`bf-entra ${SUPERFICIE} flex items-center gap-2.5 p-3 ${T.apoio} text-white/70`} style={atraso(5)}>
            <Sparkles size={16} className="shrink-0" style={{ color: INST.ouro }} />
            <span>
              <strong className="text-white">Controle por ciclo:</strong> cada semana tem meta de{" "}
              <strong className="text-white">{FMT.format(p.semanasBatalhao[0]?.meta ?? 240)}</strong>{" "}
              evidências para o Batalhão. Regularidade semanal impede acúmulo de saldo no
              fechamento do mês.
            </span>
          </p>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 05 · QUALIDADE
    // -------------------------------------------------------------------
    {
      selo: `Padrão técnico · mínimo de ${p.minimo} evidências por turno`,
      titulo: "Qualidade da auditoria e engajamento do efetivo",
      subtitulo: "Aderência à cota mínima, dispersão da produção e alcance entre os auditores",
      icone: <ListChecks size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-4">
            <Kpi
              i={0}
              rotulo={`Conformidade ≥ ${p.minimo}`}
              valor={p.taxaConf}
              casas={1}
              sufixo="%"
              nivel={nivelPorCumprimento(p.taxaConf, p.dados.length > 0)}
              nota={`${FMT.format(p.conformes)} de ${FMT.format(p.dados.length)} lançamentos`}
              icone={<CheckCircle2 size={13} />}
            />
            <Kpi
              i={1}
              rotulo="Auditores ativos"
              valor={p.ativos}
              nota={`de ${FMT.format(auditoresTotal)} · ${PCT.format(engajamento)}% do efetivo`}
              icone={<Users size={13} />}
            />
            <Kpi
              i={2}
              rotulo="Mediana por turno"
              valor={p.mediana}
              nota={`p90 entrega ${FMT.format(p.p90)} ou mais`}
              icone={<Percent size={13} />}
            />
            <Kpi
              i={3}
              rotulo="Desvios registrados"
              valor={desvios}
              nivel={desvios > 0 ? "critico" : "conforme"}
              nota={`${FMT.format(p.naoAuditou)} não auditou · ${FMT.format(p.abaixo)} abaixo do mínimo`}
              icone={<AlertTriangle size={13} />}
            />
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <Bloco i={4} icone={<BarChart3 size={15} />} titulo="Evidências por turno de serviço">
              <ColunasQualidade dados={p.histograma} />
              <Leitura>{conclusaoQualidade(p)}</Leitura>
            </Bloco>

            <Bloco i={5} icone={<Layers size={15} />} titulo="Dispersão por fração">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Fração", "Mín", "Mediana", "p90", "Máx", "n"].map((c, k) => (
                        <th
                          key={c}
                          className={`${T.rotulo} pb-1.5 text-white/40 ${k === 0 ? "text-left" : "text-right"}`}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.dispersao.map((d) => (
                      <tr key={d.rotulo} className="border-b border-white/[0.06]">
                        <td className="py-1.5 text-[12.5px] text-white/85">{d.rotulo}</td>
                        {[d.min, d.med, d.p90, d.max, d.n].map((n, k) => (
                          <td
                            key={k}
                            className={`${T.dado} py-1.5 text-right ${k === 1 ? "text-white" : "text-white/60"}`}
                          >
                            {FMT.format(n)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Leitura>{conclusaoDistribuicao(p)}</Leitura>
            </Bloco>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 06 · RASTREABILIDADE
    // -------------------------------------------------------------------
    {
      selo: "Cadeia de custódia · Diretriz PM3-001/02/25",
      titulo: "Rastreabilidade da evidência auditada",
      subtitulo: "Do lançamento recebido ao ID de mídia que permite reconferir a gravação",
      icone: <FileSearch size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 lg:grid-cols-[1fr_minmax(0,320px)]">
            <Bloco i={0} icone={<FileSearch size={15} />} titulo="Funil de conformidade">
              <FunilRastreio etapas={p.funil} />
              <Leitura>{conclusaoFunil(p)}</Leitura>
            </Bloco>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <Kpi
                i={1}
                rotulo="Com IDs de mídia"
                valor={taxaIds}
                casas={1}
                sufixo="%"
                nivel={nivelPorCumprimento(taxaIds, p.dados.length > 0)}
                nota={`${FMT.format(comIds)} de ${FMT.format(p.dados.length)} lançamentos`}
                icone={<CheckCircle2 size={13} />}
              />
              <Kpi
                i={2}
                rotulo="Sem identificação"
                valor={p.semIds}
                nivel={p.semIds > 0 ? "atencao" : "conforme"}
                nota="evidência sem ID não se reconfere"
                icone={<AlertTriangle size={13} />}
              />
              <Kpi
                i={3}
                rotulo="Partes instruídas"
                valor={p.partes}
                nota="lançamentos com número de Parte"
                icone={<ScrollText size={13} />}
              />
            </div>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <Bloco i={4} icone={<Users size={15} />} titulo="Produção por posto e graduação">
              <BarrasRotulo dados={p.porPosto} />
            </Bloco>
            <Bloco i={5} icone={<Shield size={15} />} titulo="Produção por função no turno">
              <BarrasRotulo dados={p.porFuncao} />
            </Bloco>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 07 · CARGA E COBERTURA
    // -------------------------------------------------------------------
    {
      selo: "Distribuição do esforço",
      titulo: "Concentração da carga e cobertura do serviço",
      subtitulo: "Quem sustenta a auditoria e em que dia e faixa de horário ela acontece",
      icone: <Activity size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 lg:grid-cols-2">
            <Bloco i={0} icone={<TrendingUp size={15} />} titulo="Carga por auditor (Pareto)">
              <ParetoCarga dados={p.pareto} />
              <Leitura>{conclusaoPareto(p)}</Leitura>
            </Bloco>

            <Bloco i={1} icone={<Clock size={15} />} titulo="Cobertura por dia e faixa horária">
              <MatrizHorario matriz={p.matriz} max={p.maxMatriz} dias={DIAS} faixas={FAIXAS_HORA} />
              <Leitura>{conclusaoHorario(p)}</Leitura>
            </Bloco>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-4">
            {p.porTurno.map((t, k) => (
              <Kpi
                key={t.rotulo}
                i={2 + k}
                rotulo={`Turno ${t.rotulo}`}
                valor={t.v}
                nota="evidências auditadas"
                icone={<Timer size={13} />}
              />
            ))}
            <Kpi
              i={4}
              rotulo="Dias com lançamento"
              valor={p.diasComLancamento}
              nota={`de ${FMT.format(p.janela.decorridos)} dias corridos`}
              icone={<CalendarRange size={13} />}
            />
            <Kpi
              i={5}
              rotulo="Dias fora da faixa"
              valor={p.foraDeControle.length}
              nivel={p.foraDeControle.length > 0 ? "atencao" : "conforme"}
              nota="variação atípica a verificar"
              icone={<AlertTriangle size={13} />}
            />
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 08 · EXCEÇÕES
    // -------------------------------------------------------------------
    {
      selo: "Fiscalização e orientação",
      titulo: "Exceções que exigem providência do Comando",
      subtitulo: "Cada bloco abre no painel já filtrado, com o nome e a justificativa de quem lançou",
      icone: <AlertTriangle size={13} />,
      corpo: (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              {
                rot: "Não auditou no turno",
                q: p.naoAuditou,
                nivel: (p.naoAuditou > 0 ? "critico" : "conforme") as Nivel,
                nota: "declarou não ter auditado — exige Parte ou justificativa",
                href: "/cop2026/dashboard?excecao=naoauditou",
              },
              {
                rot: `Abaixo do mínimo de ${p.minimo}`,
                q: p.abaixo,
                nivel: (p.abaixo > 0 ? "atencao" : "conforme") as Nivel,
                /* Diz TURNO por extenso: este cartão conta turno, e o mapa logo
                   abaixo conta lançamento. Sem o rótulo, os dois números
                   parecem discordar quando na verdade medem coisas diferentes —
                   a régua do mínimo é por turno, decisão do Comando. */
                nota: "turnos que auditaram, mas não alcançaram a cota do Batalhão",
                href: "/cop2026/dashboard?excecao=abaixo",
              },
              {
                rot: "Sem IDs de mídia",
                q: p.semIds,
                nivel: (p.semIds > 0 ? "atencao" : "conforme") as Nivel,
                nota: "sem o ID a evidência não é rastreável na conferência",
                href: "/cop2026/dashboard?excecao=semids",
              },
            ].map((e, k) => (
              <Link key={e.rot} href={e.href} className="block">
                <Cartao nivel={e.nivel} i={k} className="p-4 transition-colors hover:bg-white/[0.1]">
                  <p className={`${T.rotulo} text-white/55`}>{e.rot}</p>
                  <p className={`mt-1 ${T.kpi} ${FAIXA[e.nivel].texto}`}>
                    <Contador valor={e.q} />
                  </p>
                  <p className={`mt-1 ${T.apoio} text-white/55`}>{e.nota}</p>
                  <p className={`mt-2 ${T.rotulo} text-white/40`}>Abrir no painel →</p>
                </Cartao>
              </Link>
            ))}
          </div>

          <Bloco i={3} icone={<Layers size={15} />} titulo="Onde as exceções se concentram">
            {/* As linhas vêm prontas do motor. A do "Sem fração declarada" só
                aparece quando existe órfão: numa base limpa ela seria uma barra
                zerada permanente, e o Comando leria como fração de verdade. */}
            <ul className="space-y-2">
              {[
                ...p.excecoes.linhas,
                ...(p.excecoes.orfaos.total > 0 ? [p.excecoes.orfaos] : []),
              ].map((f, k) => {
                const base = Math.max(1, f.total);
                return (
                  <li key={f.chave} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 truncate text-[12.5px] text-white/80 sm:w-28">
                      {f.rotulo}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="bf-barra h-full rounded-full"
                        style={{
                          ...atraso(k, 55),
                          width: `${Math.min(100, (f.comPendencia / base) * 100)}%`,
                          background: INST.vermelhoClaro,
                        }}
                      />
                    </div>
                    <span className={`${T.dado} w-24 shrink-0 text-right text-white/60`}>
                      {FMT.format(f.comPendencia)} de {FMT.format(f.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Leitura>
              {FMT.format(desvios)} lançamento(s) com pendência em{" "}
              {FMT.format(p.excecoes.totalLancamentos)} — conta cada lançamento uma vez, mesmo que
              ele acumule motivos: não auditou, ficou abaixo do mínimo de {FMT.format(p.minimo)} ou
              não informou o ID da mídia. A lista nominal, com a justificativa registrada por cada
              policial, fica no painel de controle, onde se filtra e se cobra fração a fração.
            </Leitura>
          </Bloco>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 09 · POR QUE AUDITAMOS
    // -------------------------------------------------------------------
    {
      selo: "Diretriz PM3-001/02/25 · item 6.1.6",
      titulo: "Por que auditamos",
      subtitulo: "Cinco finalidades institucionais orientam a auditoria das evidências digitais",
      icone: <Award size={13} />,
      corpo: (
        <div className="space-y-3">
          <p className={`bf-entra ${SUPERFICIE} p-4 font-serif ${T.corpo} text-white/85`} style={atraso(0)}>
            A <strong className="text-white">Auditoria das Evidências Digitais (COP)</strong> é o
            exame sistemático, independente e documentado dos registros captados, realizada por meio
            de credencial pessoal no SiGCED.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                rotulo: "Conformidade",
                desc: "Verificar se os registros e procedimentos atendem aos critérios técnicos estabelecidos.",
              },
              {
                num: "02",
                rotulo: "Fiscalização e orientação",
                desc: "Subsidiar a fiscalização de natureza pedagógica, disciplinar e procedimental.",
              },
              {
                num: "03",
                rotulo: "Boas práticas",
                desc: "Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos.",
              },
              {
                num: "04",
                rotulo: "Melhoria contínua",
                desc: "Transformar os achados da auditoria em aperfeiçoamento dos processos operacionais.",
              },
              {
                num: "05",
                rotulo: "Inteligência gerencial",
                desc: "Extrair indicadores institucionais capazes de subsidiar decisões de gestão.",
              },
            ].map((item, k) => (
              <Cartao key={item.num} i={k + 1} className="p-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="dados text-[1.5rem] font-bold" style={{ color: INST.ouro }}>
                    {item.num}
                  </span>
                  <span className={`${T.rotulo} text-white/40`}>Finalidade</span>
                </div>
                <h4 className={`${T.bloco} text-white`}>{item.rotulo}</h4>
                <p className={`mt-1 ${T.apoio} text-white/70`}>{item.desc}</p>
              </Cartao>
            ))}
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------------
    // 10 · PLANO DE AÇÃO
    // -------------------------------------------------------------------
    {
      selo: "Encerramento e recomendações",
      titulo: "Plano de ação para os dias restantes",
      subtitulo: "Diretrizes executivas para Comandantes de Companhia e Oficiais de Operações",
      icone: <Target size={13} />,
      corpo: (
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              {
                n: "1",
                cor: INST.vermelho,
                selo: "Cota por turno",
                titulo: `Garantir o mínimo de ${p.minimo}`,
                desc: `Todo auditor escalado fiscaliza no mínimo ${p.minimo} evidências no turno e lança no formulário oficial ao encerrar o serviço.`,
              },
              {
                n: "2",
                cor: "#d97706",
                selo: "Recuperação do saldo",
                titulo: `Ritmo de ${FMT.format(ritmo)} por dia`,
                desc: `Faltam ${FMT.format(p.falta)} evidências em ${FMT.format(p.janela.diasRestantes)} dia(s). Concentrar o reforço em ${criticas.map((f) => f.rotulo).join(", ")}.`,
              },
              {
                n: "3",
                cor: "#16a34a",
                selo: "Governança",
                titulo: "Justificativa formal do desvio",
                desc: `Quem declarar "não auditei" ou ficar abaixo do mínimo aponta o número da Parte ou a justificativa operacional — ${FMT.format(desvios)} caso(s) no ciclo.`,
              },
            ].map((c, k) => (
              <div
                key={c.n}
                className={`bf-entra ${SUPERFICIE} space-y-1.5 border-l-4 p-4`}
                style={{ ...atraso(k), borderLeftColor: c.cor }}
              >
                <span className={`${T.rotulo}`} style={{ color: c.cor }}>
                  {c.n}. {c.selo}
                </span>
                <h4 className="text-[14px] font-bold text-white">{c.titulo}</h4>
                <p className={`${T.apoio} text-white/70`}>{c.desc}</p>
              </div>
            ))}
          </div>

          <Bloco i={3} icone={<ListChecks size={15} />} titulo="Onde concentrar o reforço">
            <ul className="space-y-2.5">
              {criticas.map((f, k) => (
                <li key={f.chave} className="flex flex-wrap items-center gap-2.5">
                  <span className="w-24 shrink-0 text-[12.5px] font-bold text-white sm:w-28">
                    {f.rotulo}
                  </span>
                  <Barra pct={f.pct} nivel={f.nivel} altura="h-2" i={k} />
                  <span className={`${T.dado} shrink-0 text-white/70`}>
                    faltam {FMT.format(f.falta)} · {FMT.format(Math.ceil(f.ritmoNecessario))}/turno ·{" "}
                    {FMT.format(f.lancaram)} de {FMT.format(f.efetivo)} lançaram
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>

          <div
            className="bf-entra rounded-xl border border-white/20 p-4 text-center backdrop-blur-md"
            style={{
              ...atraso(4),
              background: `linear-gradient(90deg, ${INST.vermelho}33, rgba(255,255,255,0.07), ${INST.vermelho}33)`,
            }}
          >
            <p className="font-serif text-[15px] font-bold text-white sm:text-lg">
              16º BPM/M — Compromisso com a transparência, a eficiência e a Diretriz PM3-001/02/25
            </p>
            <p className={`mt-1 ${T.apoio} text-white/55`}>
              Ambiente Executivo de Gestão e Controle · Auditoria de COP 2026 · {lidoEm}
            </p>
          </div>
        </div>
      ),
    },
  ];

  const total = slides.length;
  const ir = useCallback(
    (d: number) => setI((x) => Math.min(total - 1, Math.max(0, x + d))),
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") ir(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") ir(-1);
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(total - 1);
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, total, toggleFullscreen]);

  const s = slides[i];
  const dd = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="briefing-raiz relative flex min-h-screen select-none flex-col overflow-hidden bg-[#0b0b0e] text-white">
      {/* Fundo operacional. Fica bem abaixo do limiar de leitura: o vídeo é
          ambientação, e qualquer coisa acima disso disputa com o número. */}
      <div className="nao-imprime pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-luminosity">
        <video autoPlay loop muted playsInline className="h-full w-full object-cover">
          <source src="/media/clip_patrulha_noturna.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b0b0e]/95 via-[#0b0b0e]/88 to-[#0b0b0e]/96" />

      {/* ---------------- BARRA SUPERIOR ---------------- */}
      <header className="nao-imprime relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0b0e]/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            href="/cop2026/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:border-[#ca0202] hover:bg-[#ca0202]/15"
            title="Retornar ao painel de controle"
          >
            <BarChart3 size={14} />
            <span className="hidden sm:inline">Painel de controle</span>
          </Link>
          <Link
            href="/cop2026"
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/60 transition-colors hover:border-white hover:text-white sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
          >
            <Home size={13} />
            <span className="hidden sm:inline">Início</span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <span className={`${T.rotulo} text-white/40`}>Slide</span>
          <span className="dados rounded-md bg-[#ca0202] px-2 py-0.5 text-[11px] font-bold text-white">
            {dd(i + 1)} / {dd(total)}
          </span>
          <span className="hidden max-w-[300px] truncate font-serif text-[11px] font-bold uppercase tracking-wider text-white/65 md:inline">
            · {s.selo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {email && (
            <span className="mr-1 hidden items-center gap-2 text-[11px] text-white/40 lg:inline-flex">
              {ehAdmin && (
                <a href="/cop2026/admin" className="font-bold hover:text-white">
                  Admin
                </a>
              )}
              <span className="dados">{email}</span>
            </span>
          )}
          <button
            onClick={toggleFullscreen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-white hover:text-white"
            title="Alternar tela cheia (tecla F)"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">{fullscreen ? "Sair da tela cheia" : "Tela cheia"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-[#ca0202] hover:text-white"
            title="Imprimir ou salvar em PDF"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {email && (
            <a
              href="/api/cop2026/acesso/sair"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-[#ca0202] hover:text-white"
              title="Encerrar sessão"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </a>
          )}
        </div>
      </header>

      {/* Progresso da apresentação */}
      <div className="relative z-20 h-0.5 w-full bg-white/10">
        <div
          className="h-full bg-[#ca0202] transition-all duration-500"
          style={{ width: `${((i + 1) / total) * 100}%` }}
        />
      </div>

      {/* ---------------- CORPO ---------------- */}
      <main className="relative z-10 flex flex-1 items-start justify-center overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        <div key={i} className="w-full max-w-6xl">
          {!s.semCabecalho && (
            <div className="bf-entra mb-4" style={atraso(0)}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff5a5a] backdrop-blur-sm">
                {s.icone ?? <Award size={12} />}
                {s.selo}
              </span>
              <h2 className={`mt-2 ${T.titulo} text-white`}>{s.titulo}</h2>
              {s.subtitulo && (
                <p className={`mt-1 ${T.corpo} text-white/55`}>{s.subtitulo}</p>
              )}
            </div>
          )}
          <div>{s.corpo}</div>
        </div>
      </main>

      {/* ---------------- NAVEGAÇÃO ---------------- */}
      <nav className="relative z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0b0b0e]/90 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
        <button
          onClick={() => ir(-1)}
          disabled={i === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30 sm:text-xs"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((sl, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                k === i ? "w-7 bg-[#ca0202] sm:w-9" : "w-2 bg-white/25 hover:bg-white/50"
              }`}
              title={`${dd(k + 1)} · ${sl.selo}`}
              aria-label={`Ir para o slide ${k + 1}: ${sl.titulo}`}
            />
          ))}
        </div>

        <button
          onClick={() => ir(1)}
          disabled={i === total - 1}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#ca0202] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#e40707] hover:shadow-lg hover:shadow-[#ca0202]/30 disabled:pointer-events-none disabled:opacity-30 sm:text-xs"
        >
          <span className="hidden sm:inline">Próximo</span>
          <ArrowRight size={15} />
        </button>
      </nav>

      {/* ---------------- RODAPÉ ---------------- */}
      <footer className="nao-imprime relative z-20 hidden flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 bg-[#0b0b0e] px-4 py-2 text-white sm:flex sm:px-6">
        <SelosSeguranca />
        <AssinaturaDesenvolvimento />
      </footer>
    </div>
  );
}
