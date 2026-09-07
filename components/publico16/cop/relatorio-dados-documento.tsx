/**
 * Relatório de Dados Consolidados da Auditoria de COP 2026.
 *
 * Um DOCUMENTO gerado a partir da planilha — não a planilha embutida. Consolida
 * as respostas em tabelas organizadas (resumo, por fração, por auditor e o
 * registro completo lançamento a lançamento), printável em PDF e exportável em
 * CSV. Abrir a planilha original no Google Sheets continua como ação secundária,
 * para quem quiser manusear a base viva.
 */
import { ExternalLink } from "lucide-react";
import { FMT, chaveDoTurno, temPendencia, turnosAbaixoDoMinimo } from "@/lib/cop2026-metricas";
import {
  ORDEM_SUBUNIDADES,
  ROTULO_SUBUNIDADE,
  type LancamentoCop,
} from "@/lib/cop2026";
import { AcoesRelatorio } from "@/components/publico16/cop/acoes-relatorio";
import { DocumentoCop, SecaoDoc, fmtData } from "@/components/publico16/cop/documento-cop";
import type { Painel } from "@/lib/cop2026-metricas";
import type { RelatorioMes } from "@/lib/cop2026-relatorios";

type LinhaFracaoDados = {
  chave: string;
  rotulo: string;
  lancamentos: number;
  auditaram: number;
  evidencias: number;
  abaixo: number;
  /** Lançamentos com ao menos um motivo, contados uma vez só. */
  comPendencia: number;
};

function consolidarPorFracao(dados: LancamentoCop[], minimo: number): LinhaFracaoDados[] {
  const mapa = new Map<string, LinhaFracaoDados>();
  /* O mínimo é regra de TURNO desde 03/09/2026 — o mesmo conjunto que o painel
     e o briefing usam, para os três documentos não divergirem. */
  const turnosAbaixo = turnosAbaixoDoMinimo(dados, minimo);
  const turnosContados = new Set<string>();
  for (const l of dados) {
    const chave = l.subunidade || "—";
    const linha =
      mapa.get(chave) ??
      {
        chave,
        rotulo: ROTULO_SUBUNIDADE[chave] ?? chave,
        lancamentos: 0,
        auditaram: 0,
        evidencias: 0,
        abaixo: 0,
        comPendencia: 0,
      };
    linha.lancamentos += 1;
    /* `temPendencia` é a MESMA função que o briefing usa. As colunas ao lado
       continuam abrindo por motivo (um lançamento pode acumular dois), mas o
       total com pendência tem de fechar entre os dois documentos — foi a
       divergência entre eles que o Comando cobrou em 02/09/2026. */
    if (temPendencia(l, minimo, turnosAbaixo)) linha.comPendencia += 1;
    if (l.auditou) {
      linha.auditaram += 1;
      linha.evidencias += l.videos;
      /* "Abaixo" conta TURNO, não envio: sem o `turnosContados` o auditor que
         mandou dois formulários no mesmo turno somaria dois desvios para um
         turno só, e a coluna desmentiria o cartão do painel. */
      const turno = chaveDoTurno(l);
      if (turnosAbaixo.has(turno) && !turnosContados.has(turno)) {
        turnosContados.add(turno);
        linha.abaixo += 1;
      }
    }
    mapa.set(chave, linha);
  }
  return [...mapa.values()].sort((a, b) => {
    const ia = ORDEM_SUBUNIDADES.indexOf(a.chave as (typeof ORDEM_SUBUNIDADES)[number]);
    const ib = ORDEM_SUBUNIDADES.indexOf(b.chave as (typeof ORDEM_SUBUNIDADES)[number]);
    if (ia !== -1 && ib !== -1) return ia - ib;
    return a.rotulo.localeCompare(b.rotulo);
  });
}

export function RelatorioDadosDocumento({
  mes,
  painel: p,
  lidoEm,
  erro,
  encerrado,
  csvRespostas,
  csvAuditores,
  urlPlanilha,
}: {
  mes: RelatorioMes;
  painel: Painel;
  lidoEm?: string;
  erro?: string;
  encerrado: boolean;
  csvRespostas: string;
  csvAuditores: string;
  urlPlanilha: string;
}) {
  const porFracao = consolidarPorFracao(p.dados, p.minimo);
  const totalAuditaram = p.dados.filter((l) => l.auditou).length;

  return (
    <DocumentoCop
      etiqueta="Relatório de Dados Consolidados"
      titulo="Relatório de Dados"
      subtitulo="Base consolidada das respostas de auditoria"
      mes={mes}
      encerrado={encerrado}
      lidoEm={lidoEm}
      acoes={
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={urlPlanilha}
            target="_blank"
            rel="noopener noreferrer"
            className="nao-imprime inline-flex items-center gap-1.5 rounded-lg bg-[#ca0202] px-3 py-2 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-[#e40707]"
          >
            <ExternalLink className="h-4 w-4" /> Abrir no Google Sheets
          </a>
          <AcoesRelatorio
            nomeBase={`relatorio-cop-2026-${mes.chave}-dados`}
            csvRespostas={csvRespostas}
            csvAuditores={csvAuditores}
          />
        </div>
      }
    >
      {erro && (
        <div className="cartao-doc flex items-start gap-3 rounded-xl border border-[#ca0202]/35 bg-[#ca0202]/[0.06] p-4">
          <span className="text-[13px] text-[#15304c]">
            A planilha não respondeu por completo ({erro}). Os dados refletem a última leitura válida.
          </span>
        </div>
      )}

      {/* 01 · Resumo dos dados */}
      <SecaoDoc n="01" titulo="Resumo dos Dados" nota="Contagem geral das respostas lidas no período.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { r: "Lançamentos", v: FMT.format(p.dados.length) },
            { r: "Auditaram", v: FMT.format(totalAuditaram) },
            { r: "Não auditaram", v: FMT.format(p.naoAuditou) },
            { r: "Evidências", v: FMT.format(p.total) },
            { r: "Com parte", v: FMT.format(p.partes) },
          ].map((k) => (
            <div key={k.r} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#15304c]/60">{k.r}</p>
              <p className="mt-1 font-mono text-xl font-black text-[#07182d]">{k.v}</p>
            </div>
          ))}
        </div>
      </SecaoDoc>

      {/* 02 · Consolidado por fração */}
      <SecaoDoc n="02" titulo="Consolidado por Fração">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-[#15304c]/60">
                <th className="py-2 pr-3 font-bold">Fração</th>
                <th className="py-2 pr-3 font-bold">Lançamentos</th>
                <th className="py-2 pr-3 font-bold">Auditaram</th>
                <th className="py-2 pr-3 font-bold">Evidências</th>
                <th className="py-2 pr-3 font-bold">Abaixo</th>
                {/* Não é a soma das duas anteriores: um lançamento pode estar
                    nas duas e conta uma vez. É este o número que fecha com o
                    briefing. */}
                <th className="py-2 font-bold">Com pendência</th>
              </tr>
            </thead>
            <tbody>
              {porFracao.map((fr) => (
                <tr key={fr.chave} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-bold text-[#07182d]">{fr.rotulo}</td>
                  <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">{FMT.format(fr.lancamentos)}</td>
                  <td className="py-1.5 pr-3 font-mono text-[#15304c]/80">{FMT.format(fr.auditaram)}</td>
                  <td className="py-1.5 pr-3 font-mono font-bold text-[#07182d]">{FMT.format(fr.evidencias)}</td>
                  <td className="py-1.5 pr-3 font-mono text-[#d97706]">{FMT.format(fr.abaixo)}</td>
                  <td className="py-1.5 font-mono font-bold text-[#ca0202]">{FMT.format(fr.comPendencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoDoc>

      {/* 03 · Consolidado por auditor */}
      <SecaoDoc
        n="03"
        titulo="Consolidado por Auditor"
        nota={`${FMT.format(p.auditoresLinhas.length)} auditor(es) no período.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-[#15304c]/60">
                <th className="py-2 pr-3 font-bold">Auditor</th>
                <th className="py-2 pr-3 font-bold">Posto</th>
                <th className="py-2 pr-3 font-bold">Fração</th>
                <th className="py-2 pr-3 font-bold">Lanç.</th>
                <th className="py-2 pr-3 font-bold">Evid.</th>
                <th className="py-2 pr-3 font-bold">Média</th>
                <th className="py-2 pr-3 font-bold">Abaixo</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoDoc>

      {/* 04 · Registro completo */}
      <SecaoDoc
        n="04"
        titulo="Registro Completo"
        nota={`${FMT.format(p.dados.length)} lançamento(s), tal como estão na planilha oficial.`}
        quebraAntes
      >
        {p.dados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-[13.5px] text-[#15304c]/70">
            Nenhum lançamento no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-slate-200 text-[9.5px] uppercase tracking-wide text-[#15304c]/60">
                  <th className="py-1.5 pr-2 font-bold">Data</th>
                  <th className="py-1.5 pr-2 font-bold">Turno</th>
                  <th className="py-1.5 pr-2 font-bold">RE</th>
                  <th className="py-1.5 pr-2 font-bold">Nome de guerra</th>
                  <th className="py-1.5 pr-2 font-bold">Posto</th>
                  <th className="py-1.5 pr-2 font-bold">Fração</th>
                  <th className="py-1.5 pr-2 font-bold">Aud.</th>
                  <th className="py-1.5 pr-2 font-bold">Evid.</th>
                  <th className="py-1.5 pr-2 font-bold">Parte</th>
                  <th className="py-1.5 font-bold">Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {p.dados.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 align-top">
                    <td className="py-1.5 pr-2 font-mono text-[#15304c]/80">{fmtData(l.data)}</td>
                    <td className="py-1.5 pr-2 text-[#15304c]/80">{l.turno || "—"}</td>
                    <td className="py-1.5 pr-2 font-mono text-[#15304c]/80">{l.re || "—"}</td>
                    <td className="py-1.5 pr-2 font-semibold text-[#07182d]">{l.nomeGuerra || "—"}</td>
                    <td className="py-1.5 pr-2 text-[#15304c]/80">{l.posto || "—"}</td>
                    <td className="py-1.5 pr-2 text-[#15304c]/80">
                      {ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade}
                    </td>
                    <td className="py-1.5 pr-2">
                      {l.auditou ? (
                        <span className="font-bold text-[#16a34a]">Sim</span>
                      ) : (
                        <span className="font-bold text-[#ca0202]">Não</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 font-mono font-bold text-[#07182d]">{FMT.format(l.videos)}</td>
                    <td className="py-1.5 pr-2 font-mono text-[#15304c]/80">{l.numeroParte || "—"}</td>
                    <td className="max-w-[260px] py-1.5 text-[#15304c]/75">{l.justificativa || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SecaoDoc>
    </DocumentoCop>
  );
}
