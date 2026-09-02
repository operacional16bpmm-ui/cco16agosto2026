/**
 * Motor de tendência da auditoria COP 2026 — 16º BPM/M.
 *
 * Existe para substituir o par de constantes RITMO_GLOBAL_RESTANTE (73) e
 * TURNOS_RESTANTES_GLOBAL (12), que eram números escritos à mão e por isso
 * jamais fechavam com os dados: o painel exibia "faltam 415 em 12 turnos" ao
 * lado de "73 por turno", quando 415 ÷ 12 = 34,6.
 *
 * Vocabulário fixado com o Maj PM em 31/08/2026:
 * - a unidade de ritmo é o TURNO-FRAÇÃO: cada fração roda 2 turnos por dia;
 * - o ritmo do Batalhão é expresso POR DIA, nunca por turno, para não misturar
 *   o agregado do Btl com o turno efetivamente realizado por cada fração
 *   (é por isso que 960 ÷ 300 = 3,20 não pode aparecer em tela);
 * - turno DECORRIDO vem do calendário, não do histórico de lançamentos.
 */

/** Cada fração cobre diurno + noturno. */
export const TURNOS_POR_DIA = 2;

/** Limiares de aderência à trajetória (IAT, em %). */
export const IAT_ADIANTADO = 105;
export const IAT_NA_TRAJETORIA = 95;
export const IAT_ATRASADO = 75;

/**
 * Régua de TRAJETÓRIA — dimensão nova e ortogonal à régua de CUMPRIMENTO
 * (`Nivel` / `nivelPorCumprimento` em cop2026-metricas.ts), que continua sendo
 * fonte única do seu domínio e não é reclassificada aqui.
 *
 * Cumprimento responde "quanto da meta do mês já foi feito".
 * Trajetória responde "a esta altura do mês, isso está no ritmo ou não".
 * Vocabulário deliberadamente distinto para não colidir com CRÍTICA / ATENÇÃO /
 * CONFORMIDADE / SUPERAÇÃO, conforme docs/cop2026-padroes-comando.md §2.
 */
export type SituacaoTrajetoria =
  | "ADIANTADA"
  | "EM_TRAJETORIA"
  | "ATRASADA"
  | "DEFICIT_SEVERO"
  | "NAO_AFERIVEL";

/** Fonte única dos rótulos de trajetória. Nenhum componente inventa o seu. */
export const ROTULO_TRAJETORIA: Record<SituacaoTrajetoria, string> = {
  ADIANTADA: "ADIANTADA",
  EM_TRAJETORIA: "EM TRAJETÓRIA",
  ATRASADA: "ATRASADA",
  DEFICIT_SEVERO: "DÉFICIT SEVERO",
  NAO_AFERIVEL: "NÃO AFERÍVEL",
};

export const SUBTITULO_TRAJETORIA: Record<SituacaoTrajetoria, string> = {
  ADIANTADA: "Acima da trajetória prevista",
  EM_TRAJETORIA: "Dentro da trajetória prevista",
  ATRASADA: "Abaixo da trajetória prevista",
  DEFICIT_SEVERO: "Recuperação exige esforço concentrado",
  NAO_AFERIVEL: "Sem base de cálculo no período",
};

/**
 * Cor da régua de TRAJETÓRIA. Fonte única, como o rótulo e o subtítulo — sem
 * mapa de cor reinventado dentro de componente. Espelha a paleta institucional
 * da régua de cumprimento (docs/cop2026-padroes-comando.md §2) porque a leitura
 * do telão é a mesma: azul adiantado, verde no plano, âmbar atrasado, vermelho
 * vivo em déficit severo.
 */
export const COR_TRAJETORIA: Record<SituacaoTrajetoria, string> = {
  ADIANTADA: "#2563eb",
  EM_TRAJETORIA: "#16a34a",
  ATRASADA: "#d97706",
  DEFICIT_SEVERO: "#ca0202",
  NAO_AFERIVEL: "#64748b",
};

export type ClasseEquilibrio =
  | "EQUILIBRADO"
  | "ASSIMETRIA_MODERADA"
  | "ASSIMETRIA_ELEVADA"
  | "ASSIMETRIA_CRITICA";

/** Dias do mês (mes de 1 a 12). */
export function diasDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Turnos que a fração terá no mês inteiro: 60 em mês de 30 dias, 62 em 31. */
export function turnosDoMes(ano: number, mes: number, turnosPorDia = TURNOS_POR_DIA): number {
  return diasDoMes(ano, mes) * turnosPorDia;
}

export interface ProgressoMes {
  diasMes: number;
  /** Dias CORRIDOS, contando o dia em curso. */
  diasDecorridos: number;
  turnosMes: number;
  turnosDecorridos: number;
  turnosRestantes: number;
  encerrado: boolean;
}

/**
 * Posição do mês pelo calendário.
 *
 * Conta o dia EM CURSO. A versão anterior contava só dias encerrados
 * (`getUTCDate() - 1`) para não cobrar a cota do dia às 08h da manhã — mas o
 * realizado que entra no numerador inclui o que foi lançado hoje. Numerador de
 * dois dias sobre denominador de um foi o que pôs na tela, em 02/09/2026:
 * "dia 1 de 30", "REAL 87,00/dia" (eram 87 em dois dias, 43,5/dia),
 * "TRAJETÓRIA 271,9% · ADIANTADA" ao lado do selo "Crítica · ABAIXO DA META",
 * e a linha impossível "Dias com lançamento: 2 de 1".
 *
 * O déficit no começo do dia é leitura verdadeira, e a régua de trajetória
 * existe justamente para isso — é ortogonal à de cumprimento (§2 dos padrões do
 * Comando). Antes do 1º dia do mês `diasDecorridos` é 0 e a trajetória sai como
 * NÃO AFERÍVEL, que é o caso em que realmente não há base.
 */
export function progressoDoMes(
  referencia: Date,
  ano: number,
  mes: number,
  turnosPorDia = TURNOS_POR_DIA
): ProgressoMes {
  const diasMes = diasDoMes(ano, mes);
  const turnosMes = diasMes * turnosPorDia;
  const inicio = Date.UTC(ano, mes - 1, 1);
  const fim = Date.UTC(ano, mes - 1, diasMes, 23, 59, 59, 999);
  const agora = referencia.getTime();

  let diasDecorridos: number;
  if (agora < inicio) diasDecorridos = 0;
  else if (agora > fim) diasDecorridos = diasMes;
  else diasDecorridos = referencia.getUTCDate();

  const turnosDecorridos = diasDecorridos * turnosPorDia;
  return {
    diasMes,
    diasDecorridos,
    turnosMes,
    turnosDecorridos,
    turnosRestantes: Math.max(0, turnosMes - turnosDecorridos),
    encerrado: agora > fim,
  };
}

export interface EntradaTendencia {
  /** Meta inteira do mês para a fração (já rateada e balanceada). */
  meta: number;
  /** Evidências acumuladas no mês. */
  realizado: number;
  turnosMes: number;
  turnosDecorridos: number;
}

export interface Tendencia {
  /** RITMO-ALVO: o que a fração deveria produzir por turno. Fixo no mês. */
  ritmoAlvo: number;
  /** RITMO REAL: o que produz de fato, por turno decorrido. Null antes do 1º. */
  ritmoReal: number | null;
  /** RITMO DE RECUPERAÇÃO: o que precisa manter daqui pra frente. */
  ritmoRecuperacao: number;
  /** Meta que já deveria estar cumprida a esta altura (fracionária, acumulável). */
  metaAcumulada: number;
  /** + ágio · − déficit. */
  saldoTrajetoria: number;
  /** ADERÊNCIA DE TENDÊNCIA, em %: realizado ÷ meta acumulada. Null sem base. */
  aderencia: number | null;
  /** Cumprimento do total do mês, em %. */
  cumprimento: number;
  /** Preditivo: onde a fração fecha o mês se mantiver o ritmo real. */
  projecaoFechamento: number | null;
  /** A projeção como % da meta. */
  projecaoPct: number | null;
  /** Quanto a recuperação exige acima do normal (1 = normal, 2 = o dobro). */
  pressaoRecuperacao: number | null;
  turnosRestantes: number;
  deficit: number;
  agio: number;
  situacao: SituacaoTrajetoria;
  /** Mês encerrado sem cumprir: não há mais turno para recuperar. */
  irrecuperavel: boolean;
}

/**
 * Núcleo do cálculo. Puro: mesma entrada, mesma saída — auditável e testável.
 */
export function calcularTendencia(e: EntradaTendencia): Tendencia {
  const meta = Math.max(0, e.meta);
  const realizado = Math.max(0, e.realizado);
  const turnosMes = Math.max(0, e.turnosMes);
  const turnosDecorridos = Math.min(Math.max(0, e.turnosDecorridos), turnosMes);
  const turnosRestantes = Math.max(0, turnosMes - turnosDecorridos);

  const ritmoAlvo = turnosMes > 0 ? meta / turnosMes : 0;
  const ritmoReal = turnosDecorridos > 0 ? realizado / turnosDecorridos : null;
  const metaAcumulada = ritmoAlvo * turnosDecorridos;
  const saldoTrajetoria = realizado - metaAcumulada;
  const deficit = Math.max(0, meta - realizado);
  const agio = Math.max(0, realizado - meta);

  // Sem turno restante o ritmo de recuperação não existe. Dividir por 1 aqui
  // — como fazia a proposta original com Math.max(1, ...) — anunciaria
  // "faltam 415 por turno" com o mês já encerrado. O déficit fica em `deficit`.
  const ritmoRecuperacao = turnosRestantes > 0 ? deficit / turnosRestantes : 0;

  const aderencia = metaAcumulada > 0 ? (realizado / metaAcumulada) * 100 : null;
  const cumprimento = meta > 0 ? (realizado / meta) * 100 : 0;
  const pressaoRecuperacao = ritmoAlvo > 0 ? ritmoRecuperacao / ritmoAlvo : null;

  // Preditivo: mantido o ritmo real, o mês fecha em quanto? É o que permite
  // agir no dia 15 em vez de constatar no dia 30.
  const projecaoFechamento = ritmoReal !== null ? ritmoReal * turnosMes : null;
  const projecaoPct =
    projecaoFechamento !== null && meta > 0 ? (projecaoFechamento / meta) * 100 : null;

  let situacao: SituacaoTrajetoria;
  if (aderencia === null) situacao = "NAO_AFERIVEL";
  else if (aderencia >= IAT_ADIANTADO) situacao = "ADIANTADA";
  else if (aderencia >= IAT_NA_TRAJETORIA) situacao = "EM_TRAJETORIA";
  else if (aderencia >= IAT_ATRASADO) situacao = "ATRASADA";
  else situacao = "DEFICIT_SEVERO";

  return {
    ritmoAlvo,
    ritmoReal,
    ritmoRecuperacao,
    metaAcumulada,
    saldoTrajetoria,
    aderencia,
    cumprimento,
    projecaoFechamento,
    projecaoPct,
    pressaoRecuperacao,
    turnosRestantes,
    deficit,
    agio,
    situacao,
    irrecuperavel: turnosRestantes === 0 && deficit > 0,
  };
}

/**
 * Rateio da meta global por pesos, balanceado pelo MÉTODO DO MAIOR RESTO.
 * Garante que a soma das cotas inteiras seja exatamente o total — sem despejar
 * o resíduo no Estado-Maior. Os pesos são normalizados antes: os percentuais
 * oficiais somam 99,93% e essa diferença não pode virar meta perdida.
 */
export function ratearMeta(total: number, pesos: Record<string, number>): Record<string, number> {
  const chaves = Object.keys(pesos);
  const somaPesos = chaves.reduce((s, k) => s + pesos[k], 0);
  if (somaPesos <= 0) return Object.fromEntries(chaves.map((k) => [k, 0]));

  const exatos = chaves.map((k) => (total * pesos[k]) / somaPesos);
  const base = exatos.map((v) => Math.floor(v));
  let resto = total - base.reduce((s, v) => s + v, 0);

  const ordem = chaves
    .map((_, i) => ({ i, frac: exatos[i] - base[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let n = 0; n < ordem.length && resto > 0; n++, resto--) base[ordem[n].i] += 1;

  return Object.fromEntries(chaves.map((k, i) => [k, base[i]]));
}

/**
 * Índice de Equilíbrio de Produção — mede se o resultado está sendo produzido
 * pelas frações que deveriam produzi-lo. Coeficiente de variação dos IAT: a FT
 * em 186% e a 3ª Cia em 28% se anulam na média global e desaparecem do painel.
 */
export function indiceEquilibrio(iats: Array<number | null>): {
  cv: number | null;
  classe: ClasseEquilibrio;
} {
  const v = iats.filter((x): x is number => x !== null && Number.isFinite(x));
  if (v.length < 2) return { cv: null, classe: "EQUILIBRADO" };
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  if (m <= 0) return { cv: null, classe: "EQUILIBRADO" };
  const dp = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length);
  const cv = dp / m;
  const classe: ClasseEquilibrio =
    cv < 0.15
      ? "EQUILIBRADO"
      : cv < 0.3
        ? "ASSIMETRIA_MODERADA"
        : cv < 0.5
          ? "ASSIMETRIA_ELEVADA"
          : "ASSIMETRIA_CRITICA";
  return { cv, classe };
}

/**
 * Gini da distribuição temporal: 0 = produção perfeitamente regular,
 * 1 = tudo concentrado num único período. Distingue 25+25+25+25 de 0+0+0+100,
 * que fecham a mesma meta e não são a mesma coisa para governança.
 */
export function gini(valores: number[]): number {
  const v = valores.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return 0;
  const soma = v.reduce((s, x) => s + x, 0);
  if (soma === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * v[i];
  return acc / (n * soma);
}

/* ------------------------------------------------------------------ *
 * Indices de governanca — apontados no Red Team encaminhado pelo Maj  *
 * PM em 30/08/2026 e confirmados nos dados do Batalhao.               *
 * ------------------------------------------------------------------ */

export type ClasseDispersao = "DISTRIBUIDA" | "CONCENTRADA" | "POUCOS_AUDITORES" | "SEM_BASE";

/** Limiar minimo de participacao do efetivo por fracao. */
export const IDA_DISTRIBUIDA = 60;
export const IDA_CONCENTRADA = 30;

/**
 * Indice de Dispersao de Auditoria (IDA) — quantos, do efetivo com COP da
 * fracao, de fato lancaram. Existe porque a cota pode ser batida por um punhado
 * de "super-auditores": o Estado-Maior tem 98 PMs e 2 lancando. A meta fecha e
 * o objetivo de descentralizar o controle nao se cumpre — e o risco de
 * responsabilizacao fica concentrado em poucos operadores.
 */
export function indiceDispersao(
  lancaram: number,
  efetivo: number
): { pct: number | null; classe: ClasseDispersao } {
  if (!Number.isFinite(efetivo) || efetivo <= 0) return { pct: null, classe: "SEM_BASE" };
  const pct = (Math.max(0, lancaram) / efetivo) * 100;
  const classe: ClasseDispersao =
    pct >= IDA_DISTRIBUIDA
      ? "DISTRIBUIDA"
      : pct >= IDA_CONCENTRADA
        ? "CONCENTRADA"
        : "POUCOS_AUDITORES";
  return { pct, classe };
}

export const ROTULO_DISPERSAO: Record<ClasseDispersao, string> = {
  DISTRIBUIDA: "DISTRIBUÍDA",
  CONCENTRADA: "CONCENTRADA",
  POUCOS_AUDITORES: "POUCOS AUDITORES",
  SEM_BASE: "NÃO AFERÍVEL",
};

export type ClasseRegularidade = "REGULAR" | "IRREGULAR" | "CONCENTRADA" | "SEM_BASE";

/**
 * Regularidade de producao a partir do Gini das semanas. Duas fracoes podem
 * fechar 100% da meta: uma produzindo 25% por semana, outra 0+0+0+100. Para
 * governanca nao sao a mesma coisa — a segunda anula o efeito preventivo e
 * formativo da auditoria continua, que e o que a Diretriz pede.
 */
export function regularidadeProducao(semanas: number[]): {
  gini: number | null;
  classe: ClasseRegularidade;
} {
  const total = semanas.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
  if (total <= 0) return { gini: null, classe: "SEM_BASE" };
  const g = gini(semanas);
  const classe: ClasseRegularidade =
    g < 0.25 ? "REGULAR" : g < 0.5 ? "IRREGULAR" : "CONCENTRADA";
  return { gini: g, classe };
}

export const ROTULO_REGULARIDADE: Record<ClasseRegularidade, string> = {
  REGULAR: "REGULAR",
  IRREGULAR: "IRREGULAR",
  CONCENTRADA: "EM LOTE",
  SEM_BASE: "NÃO AFERÍVEL",
};

/** Acima disso, a semana entra como lancamento em lote. */
export const LIMITE_LOTE_SEMANAL = 300;

/**
 * Sinaliza semana com producao muito acima da cota — o "compliance de ultima
 * hora". Nao bloqueia: o lancamento acontece no Google Forms, o portal apenas
 * le a planilha. O que cabe aqui e marcar para o Comando cobrar.
 */
export function alertaLote(
  semanas: Array<{ semana: number; meta: number; feito: number }>
): { emLote: boolean; semanas: number[]; maiorPct: number } {
  const marcadas: number[] = [];
  let maior = 0;
  for (const s of semanas) {
    if (s.meta <= 0) continue;
    const pct = (s.feito / s.meta) * 100;
    if (pct > maior) maior = pct;
    if (pct > LIMITE_LOTE_SEMANAL) marcadas.push(s.semana);
  }
  return { emLote: marcadas.length > 0, semanas: marcadas, maiorPct: maior };
}

/* ------------------------------------------------------------------ *
 * Leitura executiva — "ONDE AGIR" e "QUEM SUSTENTA O RESULTADO",      *
 * os dois niveis que o Maj PM desenhou no material de 30/08/2026.     *
 * ------------------------------------------------------------------ */

export type Prioridade = "MAXIMA" | "MUITO_ALTA" | "ALTA" | "NORMAL" | "REDISTRIBUICAO";

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  MAXIMA: "MÁXIMA",
  MUITO_ALTA: "MUITO ALTA",
  ALTA: "ALTA",
  NORMAL: "NORMAL",
  REDISTRIBUICAO: "REDISTRIBUIÇÃO",
};

/** Quanto menor o numero, mais cedo a fracao entra na fila de acao. */
export const ORDEM_PRIORIDADE: Record<Prioridade, number> = {
  MAXIMA: 0,
  MUITO_ALTA: 1,
  ALTA: 2,
  NORMAL: 3,
  REDISTRIBUICAO: 4,
};

/**
 * Prioridade de acao a partir da TRAJETORIA, nao do total do mes — 31% no dia 5
 * nao e emergencia, 31% no dia 25 e. Quem esta acima da propria trajetoria nao
 * vira "parabens": vira REDISTRIBUICAO, porque a leitura util para o Comando e
 * "daqui posso tirar capacidade", e nao "esta acima da meta".
 */
export function prioridadeAcao(t: Tendencia): Prioridade {
  if (t.aderencia === null) return "NORMAL";
  if (t.aderencia >= IAT_ADIANTADO && t.saldoTrajetoria > 0) return "REDISTRIBUICAO";
  if (t.aderencia < 50) return "MAXIMA";
  if (t.aderencia < IAT_ATRASADO) return "MUITO_ALTA";
  if (t.aderencia < IAT_NA_TRAJETORIA) return "ALTA";
  return "NORMAL";
}

/**
 * Capacidade excedente: evidencias produzidas ALEM da propria trajetoria. E o
 * que a fracao tem de folga para absorver esforco de outra — a quarta pergunta
 * executiva ("quem esta sustentando o resultado?").
 */
export function capacidadeExcedente(t: Tendencia): number {
  return Math.max(0, t.saldoTrajetoria);
}

/**
 * Meta acumulada em qualquer turno do mes. O ritmo-alvo e fracionario e se
 * acumula: 3,50 no turno 1, 7,01 no 2, 10,51 no 3. A producao real e inteira,
 * e a diferenca entre as duas e o saldo de trajetoria.
 */
export function metaAcumuladaNoTurno(meta: number, turnosMes: number, turno: number): number {
  if (turnosMes <= 0) return 0;
  const t = Math.min(Math.max(0, turno), turnosMes);
  return (meta / turnosMes) * t;
}

/** Marcos da serie acumulada, para leitura de tela sem despejar 60 linhas. */
export function marcosMetaAcumulada(
  meta: number,
  turnosMes: number,
  quantos = 4
): Array<{ turno: number; acumulada: number }> {
  if (turnosMes <= 0 || quantos <= 0) return [];
  const passo = turnosMes / quantos;
  return Array.from({ length: quantos }, (_, i) => {
    const turno = Math.round(passo * (i + 1));
    return { turno, acumulada: metaAcumuladaNoTurno(meta, turnosMes, turno) };
  });
}

/**
 * IDA por QUINZENA. O Red Team pediu participacao minima do efetivo a cada
 * quinzena, e nao no fechamento do mes: a janela mensal deixa a fracao inteira
 * parada por 25 dias e ainda assim "passar" no ultimo lancamento coletivo.
 */
export function dispersaoQuinzenal(
  auditoresPorQuinzena: [number, number],
  efetivo: number
): {
  quinzenas: Array<{ quinzena: number; pct: number | null; classe: ClasseDispersao }>;
  pior: ClasseDispersao;
} {
  const quinzenas = auditoresPorQuinzena.map((n, i) => {
    const r = indiceDispersao(n, efetivo);
    return { quinzena: i + 1, pct: r.pct, classe: r.classe };
  });
  const ranking: ClasseDispersao[] = [
    "POUCOS_AUDITORES",
    "CONCENTRADA",
    "DISTRIBUIDA",
    "SEM_BASE",
  ];
  const pior =
    ranking.find((c) => quinzenas.some((q) => q.classe === c)) ?? "SEM_BASE";
  return { quinzenas, pior };
}

/**
 * Confere se as cotas somam exatamente a meta global. O painel exibe o aviso em
 * tela: divergencia numerica vira municao para contestacao por orgao de
 * controle, e o erro tem que aparecer antes de o Comando levar o numero adiante.
 */
export function conferirSomaCotas(
  cotas: number[],
  metaGlobal: number
): { fecha: boolean; soma: number; diferenca: number } {
  const soma = cotas.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  return { fecha: soma === metaGlobal, soma, diferenca: soma - metaGlobal };
}
