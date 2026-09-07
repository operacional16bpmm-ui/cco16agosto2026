/**
 * Briefing Executivo da Auditoria de COP 2026 — em formato de relatório pronto.
 *
 * A leitura de Comando: enxuta, direta, uma peça que se lê em minutos e já sai
 * pronta como documento (não é a apresentação em slides de /cop2026/briefing).
 * Situação, diagnóstico por fração, ritmo, qualidade, pontos de atenção e as
 * finalidades da auditoria. Reaproveita o mesmo `Painel` e as frases-veredito
 * de lib/cop2026-metricas.ts.
 */
import { AlertTriangle, CheckCircle2, Target, TrendingUp } from "lucide-react";
import {
  FMT,
  PCT,
  SUBTITULO_NIVEL,
  veredito,
  conclusaoRitmo,
  conclusaoQualidade,
  conclusaoFunil,
  type Painel,
} from "@/lib/cop2026-metricas";
import { AcoesRelatorio } from "@/components/publico16/cop/acoes-relatorio";
import {
  DocumentoCop,
  SecaoDoc,
  FaixaBand,
  RotuloFaixa,
} from "@/components/publico16/cop/documento-cop";
import { fmtPorDia, fmtRitmo } from "@/lib/cop2026-tendencia";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

const POR_QUE_AUDITAMOS = [
  { t: "Conformidade", d: "Registros e procedimentos dentro dos critérios técnicos." },
  { t: "Fiscalização e Orientação", d: "Fiscalização pedagógica, disciplinar e procedimental." },
  { t: "Boas Práticas", d: "Reconhecer e difundir o que funciona." },
  { t: "Melhoria Contínua", d: "Achados viram aperfeiçoamento dos processos." },
  { t: "Inteligência Gerencial", d: "Indicadores que subsidiam a decisão de gestão." },
];

export function BriefingDocumento({
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
  const atencao = p.fracoes.filter((f) => f.nivel === "critico" || f.nivel === "atencao");

  return (
    <DocumentoCop
      etiqueta="Briefing Executivo"
      titulo="Briefing Executivo"
      subtitulo="Síntese de Comando da auditoria do período"
      mes={mes}
      encerrado={encerrado}
      lidoEm={lidoEm}
      acoes={
        <AcoesRelatorio
          nomeBase={`relatorio-cop-2026-${mes.chave}-briefing`}
          csvRespostas={csvRespostas}
          csvAuditores={csvAuditores}
        />
      }
    >
      {erro && (
        <div className="cartao-doc rounded-xl border border-[#ca0202]/35 bg-[#ca0202]/[0.06] p-4 text-[13px] text-[#15304c]">
          A planilha não respondeu por completo ({erro}). Os números refletem a última leitura válida.
        </div>
      )}

      {/* 01 · Situação */}
      <SecaoDoc n="01" titulo="Situação">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <RotuloFaixa nivel={v.nivel} />
            <span className="text-[12.5px] font-semibold text-[#15304c]/70">
              {SUBTITULO_NIVEL[v.nivel]}
            </span>
          </div>
          <p className="mt-3 font-serif text-[16px] font-bold leading-snug text-[#07182d]">
            {v.titulo}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#15304c]/80">{v.detalhe}</p>
          <div className="mt-3">
            <FaixaBand nivel={v.nivel} pct={p.pct} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { r: "Evidências auditadas", v: FMT.format(p.total), i: <CheckCircle2 className="h-4 w-4 text-[#16a34a]" /> },
            { r: "Meta do período", v: FMT.format(p.meta), i: <Target className="h-4 w-4 text-[#07182d]" /> },
            { r: "Cumprimento", v: `${PCT.format(p.pct)}%`, i: <TrendingUp className="h-4 w-4 text-[#2563eb]" /> },
            { r: "Saldo restante", v: FMT.format(p.falta), i: <AlertTriangle className="h-4 w-4 text-[#d97706]" /> },
          ].map((k) => (
            <div key={k.r} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">
                {k.i}
                {k.r}
              </p>
              <p className="mt-1 font-mono text-2xl font-black leading-none text-[#07182d]">{k.v}</p>
            </div>
          ))}
        </div>
      </SecaoDoc>

      {!semDados && (
        <>
          {/* 02 · Diagnóstico por fração */}
          <SecaoDoc n="02" titulo="Diagnóstico por Fração">
            <div className="space-y-2">
              {p.fracoes.map((fr) => (
                <div
                  key={fr.chave}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-[#fafbfc] px-4 py-2.5"
                >
                  <span className="w-28 shrink-0 font-bold text-[#07182d]">{fr.rotulo}</span>
                  <span className="w-16 shrink-0 font-mono text-[13px] font-bold text-[#07182d]">
                    {PCT.format(fr.pct)}%
                  </span>
                  <div className="min-w-[120px] flex-1">
                    <FaixaBand nivel={fr.nivel} pct={fr.pct} />
                  </div>
                  <span className="shrink-0 font-mono text-[12px] text-[#15304c]/70">
                    {FMT.format(fr.feito)}/{FMT.format(fr.meta)} · saldo {FMT.format(fr.falta)}
                  </span>
                  <RotuloFaixa nivel={fr.nivel} />
                </div>
              ))}
            </div>
          </SecaoDoc>

          {/* 03 · Ritmo e projeção */}
          <SecaoDoc n="03" titulo="Ritmo e Projeção">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { r: "Dias com lançamento", v: `${FMT.format(p.diasComLancamento)}/${FMT.format(p.janela.decorridos)}` },
                { r: "Dias restantes", v: FMT.format(p.janela.diasRestantes) },
                { r: "Ritmo necessário", v: fmtPorDia(p.ritmoNecessario) },
                { r: "Saldo", v: FMT.format(p.falta) },
              ].map((k) => (
                <div key={k.r} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">{k.r}</p>
                  <p className="mt-1 font-mono text-lg font-black text-[#07182d]">{k.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#15304c]/75">{conclusaoRitmo(p)}</p>
          </SecaoDoc>

          {/* 04 · Qualidade */}
          <SecaoDoc n="04" titulo="Qualidade das Evidências">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { r: "Taxa de conformidade", v: `${PCT.format(p.taxaConf)}%` },
                { r: "Abaixo do mínimo", v: FMT.format(p.abaixo) },
                { r: "Não auditaram", v: FMT.format(p.naoAuditou) },
              ].map((k) => (
                <div key={k.r} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">{k.r}</p>
                  <p className="mt-1 font-mono text-lg font-black text-[#07182d]">{k.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-[12.5px] leading-relaxed text-[#15304c]/75">
              <p>{conclusaoQualidade(p)}</p>
              <p>{conclusaoFunil(p)}</p>
            </div>
          </SecaoDoc>

          {/* 05 · Pontos de atenção */}
          <SecaoDoc n="05" titulo="Pontos de Atenção">
            {atencao.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-[13px] text-[#16a34a]">
                <CheckCircle2 className="h-4 w-4" /> Nenhuma fração em faixa crítica ou de atenção no período.
              </p>
            ) : (
              <ul className="space-y-2">
                {atencao.map((fr) => (
                  <li
                    key={fr.chave}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-[#fafbfc] px-4 py-2.5 text-[13px] text-[#15304c]"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
                    <span>
                      <strong className="text-[#07182d]">{fr.rotulo}</strong> em{" "}
                      {PCT.format(fr.pct)}% da meta ({SUBTITULO_NIVEL[fr.nivel]}) — faltam{" "}
                      {FMT.format(fr.falta)} evidências, exigindo{" "}
                      {fmtRitmo(fr.ritmoNecessario)} por turno-fração restante.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SecaoDoc>
        </>
      )}

      {/* Finalidades */}
      <SecaoDoc n="06" titulo="Por que Auditamos" nota="Diretriz PM3-001/02/25, item 6.1.6.">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {POR_QUE_AUDITAMOS.map((f, i) => (
            <div key={f.t} className="rounded-lg border border-slate-200 bg-[#fafbfc] p-3">
              <span className="font-mono text-[11px] font-black text-[#ca0202]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-0.5 text-[12px] font-bold uppercase tracking-wide text-[#07182d]">
                {f.t}
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-[#15304c]/70">{f.d}</p>
            </div>
          ))}
        </div>
      </SecaoDoc>
    </DocumentoCop>
  );
}
