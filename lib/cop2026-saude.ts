import "server-only";

import { lerAuditoriaCop2026 } from "@/lib/cop2026-leitura";
import {
  calcularPainel,
  filtrosDoMesCorrente,
  FILTROS_VAZIOS,
} from "@/lib/cop2026-metricas";
import { ehIdentificadorValido, separarIdentificadores } from "@/lib/cop2026";
import { hojeBrt } from "@/lib/cop2026-ciclo";
import { mesCorrente } from "@/lib/cop2026-relatorios";

/**
 * AS INVARIANTES DO PAINEL, medidas contra o dado real.
 *
 * Mora aqui, e não dentro de uma rota, porque três consumidores precisam do
 * MESMO resultado: a rota do vigia externo (bearer), a tela `/cop2026/admin/saude`
 * (cookie de admin) e o refresh dessa tela. Cada cópia seria uma chance nova de
 * as leituras divergirem — e o dia em que divergirem é o dia em que ninguém
 * confia mais em nenhuma das duas.
 *
 * O QUE SAI DAQUI: contadores, booleanos e nomes de invariante. Nunca nome de
 * policial, RE, justificativa ou identificador de mídia. A régua é a mesma do
 * `/api/cop2026/efetivo`: se um campo identifica alguém, ele não entra.
 */

export type GravidadeSaude = "critico" | "alto" | "medio";

export type AchadoSaude = {
  /** Identificador estável da invariante — é por ele que o vigia faz o
   *  rate-limit do alerta, então NÃO pode mudar de nome à toa. */
  chave: string;
  gravidade: GravidadeSaude;
  descricao: string;
  /** O que fazer. Alerta sem próximo passo vira alerta ignorado. */
  acao: string;
};

export type RetratoSaude = Awaited<ReturnType<typeof medirSaude>>;

export async function medirSaude() {
  const t0 = Date.now();
  const achados: AchadoSaude[] = [];

  const leitura = await lerAuditoriaCop2026();
  const msLeitura = Date.now() - t0;
  const hoje = hojeBrt();
  const mes = mesCorrente();

  /* ---- 1. a leitura da planilha respondeu? ------------------------------ */
  if (leitura.erro) {
    achados.push({
      chave: "leitura-planilha",
      gravidade: leitura.stale ? "alto" : "critico",
      descricao: `Leitura da base falhou: ${leitura.erro}`,
      acao: "Conferir a publicação na web da planilha e a pane do Google; o painel está servindo o último retrato bom.",
    });
  }

  const filtros = mes ? filtrosDoMesCorrente() : FILTROS_VAZIOS;
  const p = calcularPainel(leitura.lancamentos, leitura.metas, filtros, { hoje });

  /* ---- 2. os dois totais da tela batem? --------------------------------- */
  const somaFracoes = p.fracoes.reduce((s, f) => s + f.feito, 0);
  const reconciliado = somaFracoes + p.semFracao.videos;
  if (reconciliado !== p.total) {
    achados.push({
      chave: "reconciliacao-total",
      gravidade: "critico",
      descricao: `Total do painel (${p.total}) ≠ soma das frações (${somaFracoes}) + sem fração (${p.semFracao.videos}) = ${reconciliado}.`,
      acao: "É o bug dos dois totais na mesma tela. Conferir `fracoes` e `semFracao` em calcularPainel.",
    });
  }

  /* ---- 3. as semanas ficaram dentro do mês? ----------------------------- */
  const somaSemanas = p.semanasBatalhao.reduce((s, x) => s + x.feito, 0);
  if (somaSemanas !== p.total) {
    achados.push({
      chave: "semanas-fora-do-mes",
      gravidade: "critico",
      descricao: `Semanas somam ${somaSemanas} contra ${p.total} do mês — é o bug de recorte que o Comando apontou em 02/09.`,
      acao: "Rodar `npm run verificar:painel`; procurar leitura de `lancamentos` fora de `aplicarFiltros`.",
    });
  }

  /* ---- 4. o mínimo é o do Batalhão? ------------------------------------- */
  if (p.minimo < 3) {
    achados.push({
      chave: "minimo-abaixo-de-3",
      gravidade: "alto",
      descricao: `Painel exibindo mínimo de ${p.minimo} — a determinação do Batalhão é 3.`,
      acao: "Conferir `minimoDoRecorte` e os `evidencias_por_turno` da tabela cop_auditoria_parametro.",
    });
  }

  /* ---- 5. identificador legítimo mutilado pela redação de CPF ----------- */
  const RE_UUID_REDIGIDO = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\[CPF removido\]/i;
  const mutilados = leitura.lancamentos.filter((l) => RE_UUID_REDIGIDO.test(l.idsMidia)).length;
  if (mutilados > 0) {
    achados.push({
      chave: "uuid-mutilado",
      gravidade: "alto",
      descricao: `${mutilados} identificador(es) de gravação com o miolo apagado pela redação de CPF.`,
      acao: "`redigirCpf` já é token-aware; registros gravados ANTES da correção precisam ser reparados no banco.",
    });
  }

  /* ---- 6. CPF que escapou da redação ------------------------------------
   * A varredura é POR TOKEN e ignora identificador válido — a mesma regra do
   * `redigirCpf`. Sem isso a sonda grita em ID de mídia legítimo: um hex de 32
   * caracteres contém 11 dígitos seguidos por acaso com frequência alta
   * (`15fece525bf8ae3fda56b15682841978` carrega `15682841978` no meio). Medido
   * em 02/09/2026: 4 falsos positivos na planilha, zero CPF real. */
  const RE_CPF_CRU = /(?<!\d)\d{11}(?!\d)/;
  const cpfCru = leitura.lancamentos.filter((l) =>
    separarIdentificadores(l.idsMidia.replace(/\[CPF removido\]/g, "")).some(
      (tk) => !ehIdentificadorValido(tk) && RE_CPF_CRU.test(tk)
    )
  ).length;
  if (cpfCru > 0) {
    achados.push({
      chave: "cpf-em-campo-publico",
      gravidade: "critico",
      descricao: `${cpfCru} lançamento(s) com 11 dígitos isolados em campo de ID — possível CPF sem redação.`,
      acao: "Verificar `redigirCpf` no caminho de leitura E de gravação. LGPD: dado de terceiro na tela do Comando.",
    });
  }

  /* ---- 7. mesma mídia contada duas vezes -------------------------------- */
  if (p.comIdDuplicado > 0) {
    achados.push({
      chave: "id-duplicado",
      gravidade: "medio",
      descricao: `${p.comIdDuplicado} lançamento(s) com identificador já auditado por outro (${p.idsDuplicadosNoRecorte} ID distintos no recorte).`,
      acao: "Cobrar a retirada de um dos lados na planilha — a mídia está contando duas vezes contra a meta.",
    });
  }

  /* ---- 8. a MESMA linha vindo de duas fontes ----------------------------
   * `lerComBanco` mescla planilha (antes do corte) + banco, e quem separa as
   * duas é só `COP2026_CORTE_BANCO`. Se agosto for importado para o banco e o
   * corte NÃO for movido junto para o início de agosto, cada linha de agosto
   * entra duas vezes e todo relatório daquele mês dobra. A assinatura é
   * registro byte-idêntico: dois auditores nunca produzem isso por acaso. */
  const impressao = new Map<string, number>();
  for (const l of leitura.lancamentos) {
    const k = `${l.re}|${l.data}|${l.turno}|${l.videos}|${l.idsMidia}`;
    impressao.set(k, (impressao.get(k) ?? 0) + 1);
  }
  const linhasEmDobro = [...impressao.values()].filter((n) => n > 1).length;
  if (linhasEmDobro > 0) {
    achados.push({
      chave: "fonte-duplicada",
      gravidade: "critico",
      descricao: `${linhasEmDobro} registro(s) idêntico(s) na base — planilha e banco servindo o mesmo período.`,
      acao: "Mover COP2026_CORTE_BANCO para o início do mês já importado. Corte e backfill andam no mesmo passo.",
    });
  }

  /* ---- 9. leitura lenta ------------------------------------------------- */
  if (msLeitura > 15_000) {
    achados.push({
      chave: "leitura-lenta",
      gravidade: "medio",
      descricao: `Leitura da base levou ${(msLeitura / 1000).toFixed(1)}s.`,
      acao: "O Google oscilou 6s a 30s em agosto. Se persistir, a página pendura para a tropa.",
    });
  }

  /* ---- 10. o ciclo reconhece o dia de hoje? ----------------------------- */
  if (!mes) {
    achados.push({
      chave: "fora-do-ciclo",
      gravidade: "medio",
      descricao: `Hoje (${hoje}) não cai em nenhum mês de RELATORIOS_MENSAIS — o painel degradou para o ciclo inteiro.`,
      acao: "Acrescentar o mês em lib/cop2026-relatorios.ts antes da virada.",
    });
  }

  const critico = achados.some((a) => a.gravidade === "critico");
  const alto = achados.some((a) => a.gravidade === "alto");

  return {
    ok: achados.length === 0,
    status: critico ? "critico" : alto ? "alto" : achados.length ? "medio" : "ok",
    hoje,
    mes: mes?.chave ?? null,
    lidoEm: leitura.lidoEm,
    stale: Boolean(leitura.stale),
    msLeitura,
    /* Retrato numérico — a série que o Comando vê como tendência, e nenhum
       campo aqui identifica pessoa. */
    painel: {
      meta: p.meta,
      total: p.total,
      pct: Number(p.pct.toFixed(2)),
      minimo: p.minimo,
      diaDoMes: p.janela.decorridos,
      diasNoMes: p.janela.dias,
      diasRestantes: p.janela.diasRestantes,
      metaDia: Number(p.metaDia.toFixed(2)),
      ritmoNecessarioDia: Number(p.ritmoNecessario.toFixed(2)),
      turnosAuditados: p.turnosAuditados,
      turnosConformes: p.turnosConformes,
      turnosAbaixo: p.turnosAbaixo,
      lancamentos: p.dados.length,
      naoAuditou: p.naoAuditou,
      semIds: p.semIds,
      comIdInvalido: p.comIdInvalido,
      comIdDuplicado: p.comIdDuplicado,
      semFracaoVideos: p.semFracao.videos,
      somaSemanas,
      somaFracoes,
      totalNaPlanilha: p.totalNaPlanilha,
      idsDuplicadosDistintos: p.idsDuplicadosNoRecorte,
      linhasEmDobro,
    },
    /* Só o essencial de cada fração — o suficiente para a tela mostrar onde
       agir sem virar um segundo dashboard. */
    fracoes: p.fracoes.map((f) => ({
      rotulo: f.rotulo,
      meta: f.meta,
      feito: f.feito,
      pct: Number(f.pct.toFixed(2)),
      lancaram: f.lancaram,
      efetivo: f.efetivo,
      nivel: f.nivel,
    })),
    achados,
  };
}
