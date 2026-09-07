/**
 * Relatório Executivo Analítico da Auditoria de COP 2026.
 *
 * O documento técnico completo, printável em PDF colorido. Reúne o que o
 * Comando cobra numa peça só: finalidades da auditoria, cumprimento da meta,
 * ritmo e saldo, desempenho por fração, evolução semanal, qualidade das
 * evidências, concentração e cobertura, distribuição temporal, controle
 * estatístico, detalhamento por auditor e — o diferencial — os apontamentos
 * NOMINAIS de desvio.
 *
 * Componente de servidor: compõe o `Painel` já calculado. A classificação por
 * faixa vem só de lib/cop2026-metricas.ts, sem reclassificar aqui (padrões §2).
 */
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ScrollText,
  UserX,
} from "lucide-react";
import {
  FMT,
  PCT,
  DIAS,
  FAIXAS_HORA,
  SUBTITULO_NIVEL,
  veredito,
  conclusaoRitmo,
  conclusaoQualidade,
  conclusaoPareto,
  conclusaoDistribuicao,
  conclusaoFunil,
  conclusaoHorario,
  type Painel,
  type Excecao,
} from "@/lib/cop2026-metricas";
import { AcoesRelatorio } from "@/components/publico16/cop/acoes-relatorio";
import {
  DocumentoCop,
  SecaoDoc,
  FaixaBand,
  RotuloFaixa,
  fmtData,
} from "@/components/publico16/cop/documento-cop";
import { fmtRitmo } from "@/lib/cop2026-tendencia";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

/** Finalidades institucionais — Diretriz PM3-001/02/25, item 6.1.6 (padrões §3). */
const POR_QUE_AUDITAMOS = [
  { n: "01", t: "Conformidade", d: "Verificar se os registros e procedimentos atendem aos critérios técnicos estabelecidos." },
  { n: "02", t: "Fiscalização e Orientação", d: "Subsidiar a fiscalização de natureza pedagógica, disciplinar e procedimental." },
  { n: "03", t: "Boas Práticas", d: "Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos." },
  { n: "04", t: "Melhoria Contínua", d: "Transformar os achados da auditoria em aperfeiçoamento dos processos operacionais." },
  { n: "05", t: "Inteligência Gerencial", d: "Extrair indicadores institucionais capazes de subsidiar decisões de gestão." },
];

function Kpi({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">{rotulo}</p>
      <p className="mt-1 font-mono text-2xl font-black leading-none text-[#07182d]">{valor}</p>
      {nota && <p className="mt-1 text-[11.5px] font-medium text-[#15304c]/55">{nota}</p>}
    </div>
  );
}

function TabelaExcecao({
  titulo,
  icone,
  vazio,
  itens,
  mostrarVideos,
  mostrarJustificativa,
  mostrarParte,
  mostrarDescartado,
}: {
  titulo: string;
  icone: React.ReactNode;
  vazio: string;
  itens: Excecao[];
  mostrarVideos?: boolean;
  mostrarJustificativa?: boolean;
  mostrarParte?: boolean;
  mostrarDescartado?: boolean;
}) {
  return (
    <div className="evita-quebra rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-[#07182d]">
          {icone}
          {titulo}
        </h3>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 font-mono text-[12px] font-bold text-[#15304c] ring-1 ring-slate-200">
          {FMT.format(itens.length)}
        </span>
      </div>
      {itens.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-[12.5px] text-[#16a34a]">
          <CheckCircle2 className="h-4 w-4" /> {vazio}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-[#15304c]/60">
                <th className="py-1.5 pr-3 font-bold">Auditor</th>
                <th className="py-1.5 pr-3 font-bold">Fração</th>
                <th className="py-1.5 pr-3 font-bold">Data · Turno</th>
                {mostrarVideos && <th className="py-1.5 pr-3 font-bold">Evid.</th>}
                {mostrarDescartado && <th className="py-1.5 pr-3 font-bold">Descartado</th>}
                {mostrarParte && <th className="py-1.5 pr-3 font-bold">Parte</th>}
                {mostrarJustificativa && <th className="py-1.5 font-bold">Justificativa</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-3 font-semibold text-[#07182d]">{e.quem}</td>
                  <td className="py-1.5 pr-3 text-[#15304c]/80">{e.fracao}</td>
                  <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">
                    {fmtData(e.data)} · {e.turno || "—"}
                  </td>
                  {mostrarVideos && (
                    <td className="py-1.5 pr-3 font-mono font-bold text-[#ca0202]">
                      {FMT.format(e.videos)}
                    </td>
                  )}
                  {mostrarDescartado && (
                    <td className="py-1.5 pr-3 font-mono text-[#d97706]">
                      {FMT.format(e.descartado)}
                    </td>
                  )}
                  {mostrarParte && (
                    <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">{e.parte || "—"}</td>
                  )}
                  {mostrarJustificativa && (
                    <td className="py-1.5 text-[#15304c]/80">{e.justificativa || "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RelatorioExecutivo({
  mes,
  painel: p,
  lidoEm,
  erro,
  encerrado,
  csvRespostas,
  csvAuditores,
}: {
  mes: RelatorioMes;
  painel: Painel;
  lidoEm?: string;
  erro?: string;
  encerrado: boolean;
  csvRespostas: string;
  csvAuditores: string;
}) {
  const v = veredito(p);
  const semDados = p.dados.length === 0;
  const maxHist = Math.max(1, ...p.histograma.map((h) => h.q));
  const maxDia = Math.max(1, ...p.porDia.map((d) => d.v));

  return (
    <DocumentoCop
      etiqueta="Relatório Executivo Analítico"
      titulo="Relatório Executivo Analítico"
      subtitulo="Auditoria das Câmeras Operacionais Corporais"
      mes={mes}
      encerrado={encerrado}
      lidoEm={lidoEm}
      acoes={
        <AcoesRelatorio
          nomeBase={`relatorio-cop-2026-${mes.chave}-analitico`}
          csvRespostas={csvRespostas}
          csvAuditores={csvAuditores}
        />
      }
    >
      {erro && (
        <div className="cartao-doc flex items-start gap-3 rounded-xl border border-[#ca0202]/35 bg-[#ca0202]/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ca0202]" />
          <p className="text-[13px] text-[#15304c]">
            A planilha não respondeu por completo ({erro}). Os números refletem a última leitura
            válida.
          </p>
        </div>
      )}

      {/* 01 · Sumário executivo */}
      <SecaoDoc n="01" titulo="Sumário Executivo" nota={v.detalhe}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Evidências auditadas" valor={FMT.format(p.total)} nota="no período" />
          <Kpi rotulo="Meta do período" valor={FMT.format(p.meta)} nota="Matriz Proporcional" />
          <Kpi rotulo="Cumprimento" valor={`${PCT.format(p.pct)}%`} nota={SUBTITULO_NIVEL[v.nivel]} />
          <Kpi rotulo="Saldo restante" valor={FMT.format(p.falta)} nota="para fechar a meta" />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RotuloFaixa nivel={v.nivel} />
            <span className="text-[12.5px] font-semibold text-[#15304c]/70">
              {SUBTITULO_NIVEL[v.nivel]}
            </span>
          </div>
          <p className="mt-3 font-serif text-[15px] font-bold leading-snug text-[#07182d]">
            {v.titulo}
          </p>
          <div className="mt-3">
            <FaixaBand nivel={v.nivel} pct={p.pct} />
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#15304c]/60">
            Por que auditamos — Diretriz PM3-001/02/25, item 6.1.6
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {POR_QUE_AUDITAMOS.map((f) => (
              <div key={f.n} className="rounded-lg border border-slate-200 bg-[#fafbfc] p-3">
                <span className="font-mono text-[11px] font-black text-[#ca0202]">{f.n}</span>
                <p className="mt-0.5 text-[12px] font-bold uppercase tracking-wide text-[#07182d]">
                  {f.t}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-[#15304c]/70">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </SecaoDoc>

      {semDados ? (
        <SecaoDoc n="—" titulo="Sem lançamentos no período">
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-[13.5px] text-[#15304c]/70">
            {v.detalhe}
          </p>
        </SecaoDoc>
      ) : (
        <>
          {/* 02 · Ritmo e saldo */}
          <SecaoDoc
            n="02"
            titulo="Ritmo Necessário e Saldo"
            nota="Quanto ainda falta e em que ritmo diário para fechar a meta do período."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi rotulo="Dias com lançamento" valor={`${FMT.format(p.diasComLancamento)}/${FMT.format(p.janela.decorridos)}`} />
              <Kpi rotulo="Dias restantes" valor={FMT.format(p.janela.diasRestantes)} />
              <Kpi rotulo="Ritmo necessário" valor={fmtRitmo(p.ritmoNecessario)} nota="evid. / dia" />
              <Kpi rotulo="Saldo" valor={FMT.format(p.falta)} nota="evidências" />
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#15304c]/75">{conclusaoRitmo(p)}</p>
          </SecaoDoc>

          {/* 03 · Desempenho por fração */}
          <SecaoDoc
            n="03"
            titulo="Desempenho Comparativo por Fração"
            nota="Estado-Maior, 1ª a 4ª Cia e Força Tática — a Matriz Operacional Proporcional (960 evidências / 570 PMs) distribui a meta."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-[#15304c]/60">
                    <th className="py-2 pr-3 font-bold">Fração</th>
                    <th className="py-2 pr-3 font-bold">Auditaram</th>
                    <th className="py-2 pr-3 font-bold">Evidências</th>
                    <th className="py-2 pr-3 font-bold">Meta</th>
                    <th className="py-2 pr-3 font-bold">Saldo</th>
                    <th className="py-2 pr-3 font-bold">Cumprimento</th>
                    <th className="py-2 font-bold">Faixa</th>
                  </tr>
                </thead>
                <tbody>
                  {p.fracoes.map((fr) => (
                    <tr key={fr.chave} className="border-b border-slate-100 align-middle">
                      <td className="py-2 pr-3 font-bold text-[#07182d]">{fr.rotulo}</td>
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">{FMT.format(fr.lancaram)}</td>
                      <td className="py-2 pr-3 font-mono font-bold text-[#07182d]">{FMT.format(fr.feito)}</td>
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">{FMT.format(fr.meta)}</td>
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">{FMT.format(fr.falta)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 font-mono text-[12.5px] font-bold text-[#07182d]">
                            {PCT.format(fr.pct)}%
                          </span>
                          <div className="w-24">
                            <FaixaBand nivel={fr.nivel} pct={fr.pct} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <RotuloFaixa nivel={fr.nivel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 border-t border-slate-200 pt-3 text-[12.5px] leading-relaxed text-[#15304c]/70">
              {conclusaoDistribuicao(p)}
            </p>
          </SecaoDoc>

          {/* 04 · Evolução semanal */}
          <SecaoDoc n="04" titulo="Evolução Semanal do Batalhão">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {p.semanasBatalhao.map((s) => (
                <div key={s.semana} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#07182d]">{s.rotulo}</p>
                    <span className="font-mono text-[11px] text-[#15304c]/60">{s.diasRotulo}</span>
                  </div>
                  <p className="mt-2 font-mono text-xl font-black text-[#07182d]">
                    {FMT.format(s.feito)}
                    <span className="text-[12px] font-medium text-[#15304c]/50"> / {FMT.format(s.meta)}</span>
                  </p>
                  <div className="mt-2">
                    <FaixaBand nivel={s.nivel} pct={s.pct} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] font-semibold text-[#15304c]/60">
                    {PCT.format(s.pct)}% · saldo {FMT.format(s.falta)}
                  </p>
                </div>
              ))}
            </div>
          </SecaoDoc>

          {/* 05 · Qualidade */}
          <SecaoDoc
            n="05"
            titulo="Qualidade e Distribuição das Evidências"
            nota={`Mínimo determinado pelo Batalhão: ${FMT.format(p.minimo)} evidências por turno.`}
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#15304c]/60">
                  Evidências por turno de serviço
                </p>
                <div className="space-y-1.5">
                  {p.histograma.map((h) => (
                    <div key={h.faixa} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 font-mono text-[12px] font-bold text-[#07182d]">
                        {h.faixa}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-200">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${(h.q / maxHist) * 100}%`,
                            backgroundColor: h.conforme ? "#16a34a" : "#d97706",
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-[12px] text-[#15304c]/70">
                        {FMT.format(h.q)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 text-[12.5px] leading-relaxed text-[#15304c]/80">
                <p>{conclusaoQualidade(p)}</p>
                <p>{conclusaoFunil(p)}</p>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#15304c]/60">
                    Funil de conformidade
                  </p>
                  {p.funil.map((f) => (
                    <div key={f.etapa} className="flex items-center justify-between py-0.5">
                      <span className="text-[12px] text-[#15304c]/75">{f.etapa}</span>
                      <span className="font-mono text-[12.5px] font-bold text-[#07182d]">
                        {FMT.format(f.v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SecaoDoc>

          {/* 06 · Concentração e cobertura */}
          <SecaoDoc
            n="06"
            titulo="Concentração e Cobertura"
            nota="Onde a auditoria se concentra — por auditor, por turno e por posto."
          >
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#15304c]/60">
                  Principais auditores (Pareto)
                </p>
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <tbody>
                    {p.pareto.map((d, i) => (
                      <tr key={d.nome} className="border-b border-slate-100">
                        <td className="py-1 pr-2 font-mono text-[#15304c]/50">{i + 1}</td>
                        <td className="py-1 pr-2 font-semibold text-[#07182d]">{d.nome}</td>
                        <td className="py-1 pr-2 text-right font-mono font-bold text-[#07182d]">
                          {FMT.format(d.v)}
                        </td>
                        <td className="py-1 text-right font-mono text-[#15304c]/60">
                          {PCT.format(d.acumulado)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 border-t border-slate-200 pt-2 text-[12px] leading-relaxed text-[#15304c]/70">
                  {conclusaoPareto(p)}
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#15304c]/60">
                    Por turno
                  </p>
                  {p.porTurno.map((t) => (
                    <div key={t.rotulo} className="flex items-center justify-between py-0.5">
                      <span className="text-[12.5px] text-[#15304c]/75">{t.rotulo}</span>
                      <span className="font-mono text-[12.5px] font-bold text-[#07182d]">
                        {FMT.format(t.v)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#15304c]/60">
                    Por posto / graduação
                  </p>
                  {p.porPosto.slice(0, 6).map((t) => (
                    <div key={t.rotulo} className="flex items-center justify-between py-0.5">
                      <span className="truncate pr-2 text-[12.5px] text-[#15304c]/75">{t.rotulo}</span>
                      <span className="shrink-0 font-mono text-[12.5px] font-bold text-[#07182d]">
                        {FMT.format(t.v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SecaoDoc>

          {/* 07 · Distribuição temporal */}
          <SecaoDoc
            n="07"
            titulo="Distribuição Temporal"
            nota="Evidências por dia da semana × faixa de horário — onde a auditoria acontece."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-center text-[11.5px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-[#15304c]/55">
                    <th className="py-1 pr-2 text-left font-bold">Dia</th>
                    {FAIXAS_HORA.map((h) => (
                      <th key={h} className="px-1 py-1 font-bold">{h}h</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.matriz.map((linha, d) => (
                    <tr key={DIAS[d]}>
                      <td className="py-1 pr-2 text-left font-bold text-[#07182d]">{DIAS[d]}</td>
                      {linha.map((val, f) => (
                        <td key={f} className="p-0.5">
                          <div
                            className="flex h-7 items-center justify-center rounded font-mono text-[11px] font-bold"
                            style={{
                              backgroundColor:
                                val > 0 ? `rgba(202,2,2,${0.12 + (val / p.maxMatriz) * 0.78})` : "#f1f5f9",
                              color: val / p.maxMatriz > 0.5 ? "#fff" : "#07182d",
                            }}
                          >
                            {val > 0 ? FMT.format(val) : ""}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#15304c]/70">{conclusaoHorario(p)}</p>
          </SecaoDoc>

          {/* 08 · Controle estatístico */}
          <SecaoDoc
            n="08"
            titulo="Controle Estatístico do Ritmo"
            nota="Carta de controle ±3σ sobre a série diária de evidências."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi rotulo="Média diária" valor={FMT.format(Math.round(p.mediaDia))} />
              <Kpi rotulo="Desvio (σ)" valor={FMT.format(Math.round(p.sigma))} />
              <Kpi rotulo="Limite superior" valor={FMT.format(Math.round(p.lsc))} />
              <Kpi rotulo="Dias fora da faixa" valor={FMT.format(p.foraDeControle.length)} />
            </div>
            {p.porDia.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#15304c]/60">
                  Produção diária
                </p>
                <div className="flex items-end gap-1 overflow-x-auto" style={{ minHeight: 80 }}>
                  {p.porDia.map((d) => {
                    const fora = p.foraDeControle.some((x) => x.data === d.data);
                    return (
                      <div key={d.data} className="flex min-w-[22px] flex-col items-center gap-1">
                        <div
                          className="w-4 rounded-t"
                          style={{
                            height: `${8 + (d.v / maxDia) * 64}px`,
                            backgroundColor: fora ? "#ca0202" : "#2563eb",
                          }}
                          title={`${d.rotulo}: ${d.v}`}
                        />
                        <span className="font-mono text-[8.5px] text-[#15304c]/55">{d.rotulo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#15304c]/70">{conclusaoRitmo(p)}</p>
          </SecaoDoc>

          {/* 09 · Detalhamento por auditor */}
          <SecaoDoc
            n="09"
            titulo="Detalhamento por Auditor"
            nota={`${FMT.format(p.auditoresLinhas.length)} auditor(es) com lançamento no período.`}
            quebraAntes
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-[#15304c]/60">
                    <th className="py-2 pr-3 font-bold">Auditor</th>
                    <th className="py-2 pr-3 font-bold">Posto</th>
                    <th className="py-2 pr-3 font-bold">Fração</th>
                    <th className="py-2 pr-3 font-bold">Lanç.</th>
                    <th className="py-2 pr-3 font-bold">Evid.</th>
                    <th className="py-2 pr-3 font-bold">Média</th>
                    <th className="py-2 pr-3 font-bold">Abaixo</th>
                    <th className="py-2 font-bold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {p.auditoresLinhas.map((a) => (
                    <tr key={a.chave} className="border-b border-slate-100">
                      <td className="py-1.5 pr-3 font-semibold text-[#07182d]">{a.nome}</td>
                      <td className="py-1.5 pr-3 text-[#15304c]/80">{a.posto}</td>
                      <td className="py-1.5 pr-3 text-[#15304c]/80">{a.fracao}</td>
                      <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">{FMT.format(a.lanc)}</td>
                      <td className="py-1.5 pr-3 font-mono font-bold text-[#07182d]">{FMT.format(a.videos)}</td>
                      <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">{a.media.toFixed(1)}</td>
                      <td className="py-1.5 pr-3 font-mono text-[#d97706]">{FMT.format(a.abaixo)}</td>
                      <td className="py-1.5">
                        <RotuloFaixa nivel={a.nivel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SecaoDoc>

          {/* 10 · Apontamentos nominais */}
          <SecaoDoc
            n="10"
            titulo="Apontamentos"
            nota="Desvios que se cobram por nome, conforme a Diretriz PM3-001/02/25: cada linha é um lançamento que exige verificação ou correção."
            quebraAntes
          >
            <div className="space-y-4">
              <TabelaExcecao
                titulo="Não auditaram no turno"
                icone={<UserX className="h-4 w-4 text-[#ca0202]" />}
                vazio="Nenhum lançamento com auditoria não realizada."
                itens={p.naoAuditouLista}
                mostrarJustificativa
              />
              <TabelaExcecao
                titulo={`Abaixo do mínimo de ${FMT.format(p.minimo)} evidências`}
                icone={<AlertTriangle className="h-4 w-4 text-[#d97706]" />}
                vazio="Nenhum lançamento abaixo do mínimo."
                itens={p.abaixoLista}
                mostrarVideos
                mostrarJustificativa
              />
              <TabelaExcecao
                titulo="Quantidade inválida na planilha"
                icone={<AlertCircle className="h-4 w-4 text-[#ca0202]" />}
                vazio="Nenhuma quantidade implausível descartada."
                itens={p.quantidadeInvalidaLista}
                mostrarVideos
                mostrarDescartado
              />
              <TabelaExcecao
                titulo="Lançamentos com número de parte"
                icone={<ScrollText className="h-4 w-4 text-[#15304c]" />}
                vazio="Nenhuma parte registrada no período."
                itens={p.partesLista}
                mostrarParte
                mostrarJustificativa
              />
            </div>
          </SecaoDoc>
        </>
      )}
    </DocumentoCop>
  );
}
