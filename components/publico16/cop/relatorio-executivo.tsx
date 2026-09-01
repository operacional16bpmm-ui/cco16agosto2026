/**
 * Relatório Executivo Analítico da Auditoria de COP 2026.
 *
 * Peça de "relatório fechado", printável, distinta do Dashboard interativo.
 * Reúne o que o Comando cobra num único documento: cumprimento da meta,
 * desempenho por fração, evolução semanal, qualidade das evidências, controle
 * estatístico, detalhamento por auditor e — o diferencial — os apontamentos
 * NOMINAIS de desvio (quem não auditou, quem ficou abaixo do mínimo, quem não
 * informou os IDs, quantidades inválidas e as partes).
 *
 * Componente de servidor: só compõe o `Painel` já calculado. A classificação
 * por faixa vem exclusivamente de lib/cop2026-metricas.ts (nível/rótulo), sem
 * reclassificar aqui — regra do Comando (docs/cop2026-padroes-comando.md §2).
 */
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  ScrollText,
  UserX,
} from "lucide-react";
import {
  FMT,
  PCT,
  ROTULO_NIVEL,
  SUBTITULO_NIVEL,
  veredito,
  conclusaoRitmo,
  conclusaoQualidade,
  conclusaoPareto,
  conclusaoDistribuicao,
  conclusaoFunil,
  conclusaoHorario,
  type Painel,
  type Nivel,
  type Excecao,
} from "@/lib/cop2026-metricas";
import { AcoesRelatorio } from "@/components/publico16/cop/acoes-relatorio";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

/** Cores das faixas conforme §2 dos padrões do Comando — hex explícito para
 *  sobreviver à impressão em cor e ao tema institucional. */
const COR_FAIXA: Record<Nivel, string> = {
  superacao: "#2563eb",
  conforme: "#16a34a",
  atencao: "#d97706",
  critico: "#ca0202",
  neutro: "#94a3b8",
};

function fmtData(iso: string | undefined): string {
  if (!iso || iso.length < 10) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function Secao({
  n,
  titulo,
  nota,
  children,
}: {
  n: string;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-slate-300/85 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)] sm:p-7">
      <header className="mb-5 border-b border-slate-200 pb-3">
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#ca0202]">
          {n}
        </span>
        <h2 className="font-serif text-lg font-black uppercase tracking-wide text-[#07182d] sm:text-xl">
          {titulo}
        </h2>
        {nota && <p className="mt-0.5 text-[12.5px] text-[#15304c]/70">{nota}</p>}
      </header>
      {children}
    </section>
  );
}

function FaixaBand({ nivel, pct }: { nivel: Nivel; pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, pct))}%`,
          backgroundColor: COR_FAIXA[nivel],
        }}
      />
    </div>
  );
}

function RotuloFaixa({ nivel }: { nivel: Nivel }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: COR_FAIXA[nivel] }}
    >
      {ROTULO_NIVEL[nivel]}
    </span>
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
    <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
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
                {mostrarJustificativa && (
                  <th className="py-1.5 font-bold">Justificativa</th>
                )}
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
                    <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">
                      {e.parte || "—"}
                    </td>
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      {/* Cabeçalho do relatório */}
      <div className="rounded-2xl border-2 border-[#07182d]/15 bg-gradient-to-b from-white to-[#eef3f8] p-6 shadow-[0_6px_20px_rgba(7,24,45,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#ca0202]">
              Auditoria e Governança · 16º BPM/M
            </span>
            <h1 className="mt-1 font-serif text-2xl font-black uppercase leading-tight tracking-wide text-[#07182d] sm:text-3xl">
              Relatório Executivo Analítico
            </h1>
            <p className="mt-1 font-serif text-base italic text-[#15304c]/80">
              Câmeras Operacionais Corporais · {mes.rotulo} de {mes.ano}
            </p>
            <p className="mt-2 text-[12.5px] font-semibold uppercase tracking-wide text-[#15304c]/60">
              Diretriz PM3-001/02/25
            </p>
          </div>
          <span
            className={
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide " +
              (encerrado
                ? "border-slate-400/40 bg-slate-500/10 text-[#15304c]/70"
                : "border-[#ca0202]/50 bg-[#ca0202]/10 text-[#ca0202]")
            }
          >
            {encerrado
              ? "Período encerrado em 31/08/2026 · 23h59"
              : "Período encerra hoje · 23h59"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <span className="text-[12px] text-[#15304c]/60">
            Leitura da planilha oficial de respostas
            {lidoEm ? ` · ${lidoEm}` : ""}
          </span>
          <AcoesRelatorio
            nomeBase={`relatorio-cop-2026-${mes.chave}`}
            csvRespostas={csvRespostas}
            csvAuditores={csvAuditores}
          />
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ca0202]/35 bg-[#ca0202]/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ca0202]" />
          <p className="text-[13px] text-[#15304c]">
            A planilha não respondeu por completo ({erro}). Os números abaixo refletem a última
            leitura válida.
          </p>
        </div>
      )}

      {/* 01 · Sumário executivo */}
      <Secao n="01" titulo="Sumário Executivo" nota={v.detalhe}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { rotulo: "Evidências auditadas", valor: FMT.format(p.total) },
            { rotulo: "Meta do período", valor: FMT.format(p.meta) },
            { rotulo: "Cumprimento", valor: `${PCT.format(p.pct)}%` },
            { rotulo: "Saldo restante", valor: FMT.format(p.falta) },
          ].map((k) => (
            <div
              key={k.rotulo}
              className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4"
            >
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">
                {k.rotulo}
              </p>
              <p className="mt-1 font-mono text-2xl font-black leading-none text-[#07182d]">
                {k.valor}
              </p>
            </div>
          ))}
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
      </Secao>

      {semDados ? (
        <Secao n="—" titulo="Sem lançamentos no período">
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-[13.5px] text-[#15304c]/70">
            {v.detalhe}
          </p>
        </Secao>
      ) : (
        <>
          {/* 02 · Desempenho por fração */}
          <Secao
            n="02"
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
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">
                        {FMT.format(fr.lancaram)}
                      </td>
                      <td className="py-2 pr-3 font-mono font-bold text-[#07182d]">
                        {FMT.format(fr.feito)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">
                        {FMT.format(fr.meta)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[#15304c]/80">
                        {FMT.format(fr.falta)}
                      </td>
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
          </Secao>

          {/* 03 · Evolução semanal */}
          <Secao n="03" titulo="Evolução Semanal do Batalhão">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {p.semanasBatalhao.map((s) => (
                <div
                  key={s.semana}
                  className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#07182d]">{s.rotulo}</p>
                    <span className="font-mono text-[11px] text-[#15304c]/60">{s.diasRotulo}</span>
                  </div>
                  <p className="mt-2 font-mono text-xl font-black text-[#07182d]">
                    {FMT.format(s.feito)}
                    <span className="text-[12px] font-medium text-[#15304c]/50">
                      {" "}
                      / {FMT.format(s.meta)}
                    </span>
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
          </Secao>

          {/* 04 · Qualidade das evidências */}
          <Secao
            n="04"
            titulo="Qualidade e Distribuição das Evidências"
            nota={`Mínimo determinado pelo Batalhão: ${FMT.format(p.minimo)} evidências por turno.`}
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#15304c]/60">
                  Evidências por lançamento
                </p>
                <div className="space-y-1.5">
                  {p.histograma.map((h) => {
                    const maxQ = Math.max(1, ...p.histograma.map((x) => x.q));
                    return (
                      <div key={h.faixa} className="flex items-center gap-2">
                        <span className="w-8 shrink-0 font-mono text-[12px] font-bold text-[#07182d]">
                          {h.faixa}
                        </span>
                        <div className="h-4 flex-1 overflow-hidden rounded bg-slate-200">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(h.q / maxQ) * 100}%`,
                              backgroundColor: h.conforme ? "#16a34a" : "#d97706",
                            }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono text-[12px] text-[#15304c]/70">
                          {FMT.format(h.q)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 text-[12.5px] leading-relaxed text-[#15304c]/80">
                <p>{conclusaoQualidade(p)}</p>
                <p>{conclusaoFunil(p)}</p>
                <p>{conclusaoHorario(p)}</p>
                <p>{conclusaoPareto(p)}</p>
              </div>
            </div>
          </Secao>

          {/* 05 · Controle estatístico */}
          <Secao
            n="05"
            titulo="Controle Estatístico do Ritmo"
            nota="Carta de controle ±3σ sobre a série diária de evidências."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { r: "Média diária", v: FMT.format(Math.round(p.mediaDia)) },
                { r: "Desvio (σ)", v: FMT.format(Math.round(p.sigma)) },
                { r: "Limite superior", v: FMT.format(Math.round(p.lsc)) },
                { r: "Dias fora da faixa", v: FMT.format(p.foraDeControle.length) },
              ].map((k) => (
                <div key={k.r} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">
                    {k.r}
                  </p>
                  <p className="mt-1 font-mono text-xl font-black text-[#07182d]">{k.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#15304c]/70">
              {conclusaoRitmo(p)}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#15304c]/70">
              Turnos cumpridos: {FMT.format(p.turnosCumpridos)} de{" "}
              {FMT.format(p.turnosPrevistos)} previstos · faltam{" "}
              {FMT.format(p.turnosRestantes)} turno(s), exigindo{" "}
              {FMT.format(Math.ceil(p.ritmoNecessario))} evidências por turno para fechar a meta.
            </p>
          </Secao>

          {/* 06 · Detalhamento por auditor */}
          <Secao
            n="06"
            titulo="Detalhamento por Auditor"
            nota={`${FMT.format(p.auditoresLinhas.length)} auditor(es) com lançamento no período.`}
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
                    <th className="py-2 pr-3 font-bold">Sem IDs</th>
                    <th className="py-2 font-bold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {p.auditoresLinhas.map((a) => (
                    <tr key={a.chave} className="border-b border-slate-100">
                      <td className="py-1.5 pr-3 font-semibold text-[#07182d]">{a.nome}</td>
                      <td className="py-1.5 pr-3 text-[#15304c]/80">{a.posto}</td>
                      <td className="py-1.5 pr-3 text-[#15304c]/80">{a.fracao}</td>
                      <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">
                        {FMT.format(a.lanc)}
                      </td>
                      <td className="py-1.5 pr-3 font-mono font-bold text-[#07182d]">
                        {FMT.format(a.videos)}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">
                        {a.media.toFixed(1)}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[#d97706]">
                        {FMT.format(a.abaixo)}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[#d97706]">
                        {FMT.format(a.semIds)}
                      </td>
                      <td className="py-1.5">
                        <RotuloFaixa nivel={a.nivel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          {/* 07 · Apontamentos nominais */}
          <Secao
            n="07"
            titulo="Apontamentos"
            nota="Desvios que se cobram por nome, conforme a Diretriz PM3-001/02/25: cada linha é um lançamento que exige verificação ou correção."
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
                titulo="Sem os IDs das mídias"
                icone={<FileWarning className="h-4 w-4 text-[#d97706]" />}
                vazio="Todos os lançamentos informaram os IDs das mídias."
                itens={p.semIdsLista}
                mostrarVideos
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
          </Secao>
        </>
      )}

      {/* Rodapé de metodologia */}
      <div className="rounded-2xl border border-slate-200 bg-[#fafbfc] p-5 text-[12px] leading-relaxed text-[#15304c]/70">
        <p className="font-bold uppercase tracking-wide text-[#15304c]/80">Metodologia</p>
        <p className="mt-1.5">
          Leitura direta da planilha oficial de respostas do formulário de Auditoria de COP do 16º
          BPM/M. A meta do período segue a Matriz Operacional Proporcional fixada pelo Batalhão
          (960 evidências / 570 PMs). A classificação por faixa (Crítica · Atenção · Conformidade ·
          Superação) tem fonte única na regra de cumprimento do painel, sem reclassificação neste
          documento. Os números refletem a última leitura válida da planilha
          {lidoEm ? ` (${lidoEm})` : ""}.
        </p>
      </div>
    </div>
  );
}
