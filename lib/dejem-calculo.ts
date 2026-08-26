/**
 * Cálculo e vocabulário do DEJEM.
 *
 * Este arquivo NÃO tem `server-only` de propósito: o simulador da página é um
 * Client Component e precisa importar `simular()`. Tudo aqui é função pura,
 * sem I/O e sem segredo — se alguma coisa precisar tocar o banco, vai para
 * lib/db/dejem.ts, que é server-only.
 */

export type CiaDejem = "1" | "2" | "3" | "4" | "ft" | "em" | "sem";

export const CIAS_ORDEM: CiaDejem[] = ["1", "2", "3", "4", "ft", "em", "sem"];

export const ROTULO_CIA: Record<CiaDejem, string> = {
  "1": "1ª Cia",
  "2": "2ª Cia",
  "3": "3ª Cia",
  "4": "4ª Cia",
  ft: "Cia Força Tática",
  em: "Estado-Maior",
  sem: "Sem Cia atribuída",
};

export const MESES_CURTO = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGO = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** 1 = segunda … 7 = domingo (ISO, igual ao `extract(isodow)` das tabelas). */
export const DIAS_SEMANA = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export type Faixa = "madrugada" | "manha" | "tarde" | "noite";

export const ROTULO_FAIXA: Record<Faixa, string> = {
  madrugada: "Madrugada 04h às 07h",
  manha: "Manhã 08h às 11h",
  tarde: "Tarde 12h às 17h",
  noite: "Noite 18h às 03h",
};

export const FAIXAS_ORDEM: Faixa[] = ["madrugada", "manha", "tarde", "noite"];

/** "04:45" -> faixa. Jornada de 8h é classificada pelo seu INÍCIO. */
export function faixaDeHora(hora: string): Faixa {
  const h = Number(hora.slice(0, 2));
  if (h >= 4 && h < 8) return "madrugada";
  if (h >= 8 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

/** Divisão que devolve null (não 0, não NaN) quando não há denominador.
 *  Zero fabricado num gráfico mente; buraco não. */
export function pct(parte: number, total: number): number | null {
  if (!total) return null;
  return Math.round((parte / total) * 1000) / 10;
}

export function razao(parte: number, total: number): number | null {
  if (!total) return null;
  return Math.round((parte / total) * 100) / 100;
}

/** Marcador de ausência de dado. Nunca zero: zero é um valor, ausência não. */
export const SEM_DADO = "n/d";

/** Formata número no padrão pt-BR; ausência vira marcador explícito. */
export function num(valor: number | null | undefined, casas = 0): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_DADO;
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function pctTexto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return SEM_DADO;
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Semáforo do preenchimento. Os cortes não são arbitrários: 95% é o patamar
 * das unidades do topo do CPA/M-5 (23º BPM/M opera entre 97% e 99%) e 85% é a
 * média do próprio CPA/M-5 no semestre. Abaixo de 85% a unidade está perdendo
 * mais de uma vaga em cada sete que recebe.
 */
export function tomPreenchimento(valor: number | null): "ok" | "atencao" | "critico" | "neutro" {
  if (valor === null) return "neutro";
  if (valor >= 95) return "ok";
  if (valor >= 85) return "atencao";
  return "critico";
}

export type BaseSimulacao = {
  vagas: number;
  escalados: number;
  horasPorJornada: number;
};

export type ResultadoSimulacao = {
  metaPct: number;
  escaladosProjetados: number;
  vagasRecuperadas: number;
  jornadasAdicionais: number;
  homensHoraAdicionais: number;
  preenchimentoAtual: number | null;
};

/**
 * Quanto policiamento a mais o batalhão colocaria na rua se fechasse a escala
 * numa taxa-alvo, mantendo a mesma oferta de vagas.
 *
 * Deliberadamente simples e conservador: assume que cada vaga recuperada vira
 * uma jornada de `horasPorJornada` horas. Não projeta aumento de oferta nem
 * mudança de comportamento — só responde "com as vagas que já chegaram, o que
 * mudaria". Qualquer coisa além disso seria previsão, não cálculo.
 */
export function simular(base: BaseSimulacao, metaPct: number): ResultadoSimulacao {
  const meta = Math.min(100, Math.max(0, metaPct));
  const projetados = Math.round((base.vagas * meta) / 100);
  const recuperadas = Math.max(0, projetados - base.escalados);
  return {
    metaPct: meta,
    escaladosProjetados: projetados,
    vagasRecuperadas: recuperadas,
    jornadasAdicionais: recuperadas,
    homensHoraAdicionais: recuperadas * base.horasPorJornada,
    preenchimentoAtual: pct(base.escalados, base.vagas),
  };
}

/** Correlação de Pearson. Usada na dispersão oferta × preenchimento. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (!sxx || !syy) return null;
  return Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100;
}

/** Reta de mínimos quadrados: devolve inclinação e intercepto. */
export function regressao(xs: number[], ys: number[]): { a: number; b: number } | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num2 = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num2 += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (!den) return null;
  const a = num2 / den;
  return { a, b: my - a * mx };
}
