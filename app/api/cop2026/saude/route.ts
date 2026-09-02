import { type NextRequest, NextResponse } from "next/server";

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
 * ENDPOINT DE SAÚDE — as invariantes do painel, medidas contra o dado real.
 *
 * Existe porque o vigia externo (pc2) não pode duplicar a lógica do painel:
 * duplicar é garantir que as duas leituras divirjam com o tempo, e o vigia
 * passaria a vigiar a própria cópia velha. Aqui as invariantes rodam DENTRO do
 * deploy corrente, com as mesmas funções puras que desenham a tela — o que o
 * vigia mede é exatamente o que o Comando vê.
 *
 * O QUE SAI DAQUI: contadores, booleanos e nomes de invariante. Nunca nome de
 * policial, RE, justificativa ou identificador de mídia. A régua é a mesma do
 * `/api/cop2026/efetivo`: se um campo identifica alguém, ele não entra na
 * resposta.
 *
 * AUTENTICAÇÃO: cabeçalho `Authorization: Bearer <CCO16_SAUDE_TOKEN>`. Sem a
 * variável definida no ambiente a rota responde 503 — endpoint de diagnóstico
 * aberto é superfície de varredura e de custo (cada chamada lê a planilha).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;

type Achado = {
  /** Identificador estável da invariante — é por ele que o vigia faz o
   *  rate-limit do alerta, então NÃO pode mudar de nome à toa. */
  chave: string;
  gravidade: "critico" | "alto" | "medio";
  descricao: string;
  /** O que fazer — o vigia repassa isso no alerta do Telegram, porque alerta
   *  sem próximo passo vira alerta ignorado. */
  acao: string;
};

export async function GET(req: NextRequest) {
  const esperado = process.env.CCO16_SAUDE_TOKEN;
  if (!esperado) {
    return NextResponse.json(
      { erro: "CCO16_SAUDE_TOKEN não configurado no ambiente." },
      { status: 503 }
    );
  }
  const enviado = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (enviado !== esperado) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const t0 = Date.now();
  const achados: Achado[] = [];

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

  /* ---- 6. CPF que escapou da redação ------------------------------------ */
  /* Onze dígitos isolados num campo de ID = possível CPF de terceiro indo para
   * a tela e para o CSV.
   *
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

  /* ---- 7-B. a MESMA linha vindo de duas fontes -------------------------- */
  /* `lerComBanco` mescla planilha (antes do corte) + banco, e quem separa as
   * duas é só `COP2026_CORTE_BANCO`. Se agosto for importado para o banco e o
   * corte NÃO for movido junto para o início de agosto, cada linha de agosto
   * entra duas vezes e todo relatório daquele mês dobra.
   *
   * O código já avisa disso ("corte e backfill andam no mesmo passo"), mas
   * avisos em comentário não disparam alarme. A assinatura é registro
   * byte-idêntico em RE+data+turno+quantidade+IDs: dois auditores nunca
   * produzem isso por acaso — a mesma pessoa lançando duas vezes no turno
   * digita identificadores diferentes. */
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

  /* ---- 8. leitura lenta ------------------------------------------------- */
  if (msLeitura > 15_000) {
    achados.push({
      chave: "leitura-lenta",
      gravidade: "medio",
      descricao: `Leitura da base levou ${(msLeitura / 1000).toFixed(1)}s.`,
      acao: "O Google oscilou de 6s a 30s em agosto. Se persistir, a página pendura para a tropa.",
    });
  }

  /* ---- 9. o ciclo reconhece o dia de hoje? ------------------------------ */
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

  return NextResponse.json(
    {
      ok: achados.length === 0,
      status: critico ? "critico" : alto ? "alto" : achados.length ? "medio" : "ok",
      hoje,
      mes: mes?.chave ?? null,
      lidoEm: leitura.lidoEm,
      stale: Boolean(leitura.stale),
      msLeitura,
      /* Retrato numérico — o vigia guarda a série para o Comando ver
         tendência, e nenhum campo aqui identifica pessoa. */
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
      achados,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
