import { sessaoAtual } from "@/lib/auth-simples";
import { podeVerNominal } from "@/lib/autorizacao";
import {
  benchmarkEstadual,
  benchmarkUnidades,
  getDejemDataset,
  porCompanhia,
  porDiaSemana,
  porTurno,
  serieMensal,
} from "@/lib/db/dejem";
import { MESES_LONGO, ROTULO_CIA } from "@/lib/dejem-calculo";

/**
 * Exportação do dado bruto do estudo DEJEM.
 *
 * Duas camadas de proteção, na mesma ordem da página:
 *   1. o proxy fail-closed já exige sessão em toda rota não pública;
 *   2. os datasets NOMINAIS exigem, além da sessão, podeVerNominal(). Aqui a
 *      resposta é 403 seca, e não um CSV com colunas mascaradas: entregar
 *      arquivo parcial induz o operador a achar que exportou tudo.
 *
 * Formato: delimitador ponto e vírgula e BOM UTF-8, que é o que o Excel em
 * português abre sem passo de importação. É também o mesmo formato dos CSVs
 * de origem, então o arquivo exportado volta a entrar na ingestão sem
 * conversão.
 */

export const dynamic = "force-dynamic";

const NOMINAIS = new Set(["jornadas", "log", "faltas"]);

type Linha = Record<string, string | number | null | undefined>;

/** Escapa segundo o RFC 4180, adaptado ao separador ponto e vírgula. */
function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function paraCsv(linhas: Linha[]): string {
  if (!linhas.length) return "﻿";
  const colunas = Object.keys(linhas[0]);
  const corpo = linhas.map((l) => colunas.map((c) => celula(l[c])).join(";"));
  return "﻿" + [colunas.join(";"), ...corpo].join("\r\n") + "\r\n";
}

export async function GET(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response("Sessão inválida.", { status: 401 });

  const dataset = new URL(request.url).searchParams.get("dataset") ?? "";
  if (NOMINAIS.has(dataset) && !podeVerNominal(sessao)) {
    return new Response(
      "Exportação de dado nominal restrita ao Comando e ao Estado-Maior.",
      { status: 403 },
    );
  }

  const ds = await getDejemDataset();
  if (!ds.temDados) return new Response("Base do DEJEM ainda não ingerida.", { status: 503 });

  let linhas: Linha[];
  switch (dataset) {
    case "serie-mensal":
      linhas = serieMensal(ds.escalas, ds.jornadas).map((s) => ({
        mes: MESES_LONGO[s.mes],
        vagas_ofertadas: s.vagas,
        inscricoes: s.inscritos,
        escalados: s.escalados,
        presentes: s.presentes,
        jornadas_confirmadas: s.confirmadas,
        vagas_ociosas: s.ociosas,
        concorrencia_por_vaga: s.concorrencia,
        preenchimento_pct: s.preenchimento,
      }));
      break;

    case "companhias":
      linhas = porCompanhia(ds.jornadas, ds.escalados).map((c) => ({
        companhia: c.rotulo,
        jornadas_dejem: c.jornadas,
        pms: c.pms,
        media_por_pm: c.mediaPorPm,
        maior_carga: c.maiorCarga,
        homens_hora: c.homensHora,
        escalas_todas_modalidades: c.escalasTotais,
        delegada_estimada: c.delegadaEstimada,
        percentual_dejem: c.percentualDejem,
        fontes_reconciliam: c.reconcilia ? "sim" : "nao",
      }));
      break;

    case "dia-turno":
      linhas = [
        ...porDiaSemana(ds.escalas, ds.jornadas).map((d) => ({
          recorte: "dia da semana",
          chave: d.rotulo,
          vagas_ofertadas: d.vagas,
          inscricoes: d.inscritos,
          escalados: d.escalados,
          presentes: d.presentes,
          vagas_ociosas: d.ociosas,
          preenchimento_pct: d.preenchimento,
        })),
        ...porTurno(ds.escalas).map((t) => ({
          recorte: "turno",
          chave: t.periodo,
          vagas_ofertadas: t.vagas,
          inscricoes: t.inscritos,
          escalados: t.escalados,
          presentes: t.presentes,
          vagas_ociosas: t.ociosas,
          preenchimento_pct: t.preenchimento,
        })),
      ];
      break;

    case "escalas":
      linhas = ds.escalas.map((e) => ({
        data: e.data,
        dia_semana: e.dow,
        periodo: e.periodo,
        vagas_ofertadas: e.vagas,
        inscricoes: e.inscritos,
        escalados: e.escalados,
        presentes: e.presentes,
      }));
      break;

    case "benchmark": {
      const est = benchmarkEstadual(ds.benchmark);
      linhas = [
        ...benchmarkUnidades(ds.escalasCpam5).map((u) => ({
          ambito: "CPA/M-5",
          posicao: u.posicao,
          unidade: u.aisp,
          vagas_ofertadas: u.vagas,
          inscricoes: u.inscritos,
          escalados: u.escalados,
          presentes: u.presentes,
          concorrencia_por_vaga: u.concorrencia,
          preenchimento_pct: u.preenchimento,
          eh_16bpmm: u.ehDoBatalhao ? "sim" : "nao",
        })),
        ...est.linhas.map((b) => ({
          ambito: "Estado (maio/2026)",
          posicao: b.posicao,
          unidade: b.rotulo,
          vagas_ofertadas: b.vagas,
          inscricoes: null,
          escalados: b.escalados,
          presentes: b.presentes,
          concorrencia_por_vaga: null,
          preenchimento_pct: b.preenchimento,
          eh_16bpmm: b.ehCpam5 ? "CPA/M-5" : "nao",
        })),
      ];
      break;
    }

    // ---- daqui para baixo, só com podeVerNominal ----
    case "jornadas":
      linhas = ds.jornadas.map((j) => ({
        re: j.re,
        nome: j.nome,
        posto: j.posto,
        companhia: ROTULO_CIA[j.cia],
        data: j.dataJornada,
        hora_inicio: j.horaInicio,
        horas: j.horas,
        modalidade: j.tipoRotulo,
      }));
      break;

    case "faltas":
      linhas = ds.log
        .filter((l) => l.zerouPresenca)
        .map((l) => ({
          escala: l.escala,
          data: l.dataInicio,
          convenio: l.convenio,
          re: l.re,
          nome: l.nome,
          posto: l.posto,
          horas_de: l.horasDe,
          horas_para: l.horasPara,
          alterado_por_re: l.alteradoPorRe,
          alterado_por_nome: l.alteradoPorNome,
          alterado_em: l.atualizadoEm,
        }));
      break;

    case "log":
      linhas = ds.log.map((l) => ({
        escala: l.escala,
        data: l.dataInicio,
        convenio: l.convenio,
        re: l.re,
        nome: l.nome,
        posto: l.posto,
        horas_de: l.horasDe,
        horas_para: l.horasPara,
        zerou_presenca: l.zerouPresenca ? "sim" : "nao",
        alterado_por_re: l.alteradoPorRe,
        alterado_por_nome: l.alteradoPorNome,
        alterado_em: l.atualizadoEm,
      }));
      break;

    default:
      return new Response(
        "Dataset desconhecido. Válidos: serie-mensal, companhias, dia-turno, escalas, benchmark, jornadas, faltas, log.",
        { status: 400 },
      );
  }

  const carimbo = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response(paraCsv(linhas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dejem_${dataset}_${carimbo}.csv"`,
      "cache-control": "no-store",
    },
  });
}
