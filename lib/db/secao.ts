import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import type { FiltroSecao } from "@/lib/filtros";

/**
 * Camada de leitura para as páginas de seção do batalhão (P1, P3, P4,
 * Motomec, Força Tática, Reserva de Armas, SPJMD — P2 e P5/Comunicação
 * seguem com seus próprios fetchers em lib/db.ts, mais ricos que o padrão
 * genérico daqui). Módulo separado de lib/db.ts para não inflar ainda mais
 * aquele arquivo com um padrão novo.
 */

export type LinhaFato = {
  indicador: string;
  ano: number;
  mes: number | null;
  eh_anual: boolean;
  cia: number | null;
  valor: number;
};

export type LinhaDimensional = {
  fonte: string;
  dimensao: string;
  chave: string;
  valor: number;
};

export type ArquivoFonte = {
  caminho_unc: string;
  mtime: string | null;
  linhas_reais: number | null;
  observacao: string | null;
  ingerido_em: string;
};

export type SecaoDashboard = {
  fatos: LinhaFato[];
  dimensionais: LinhaDimensional[];
  arquivosFonte: ArquivoFonte[];
  temDados: boolean;
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db/secao] ${label} falha na consulta, usando fallback:`, erro);
    return fallback;
  }
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/**
 * Busca TODOS os fatos/dimensionais/proveniência de uma seção — sem filtro
 * de ano/mes/cia na query. Datasets de seção são pequenos (mensal × poucos
 * indicadores × até 8 cias/anos), então manter tudo em memória e filtrar nos
 * helpers abaixo é mais simples que SQL dinâmico e permite calcular o delta
 * vs mês anterior mesmo quando a página está filtrada por mês (o mês
 * anterior pode cair fora do próprio filtro, ex.: janeiro vs dezembro do
 * ano anterior).
 */
export function getSecaoDashboard(secao: string): Promise<SecaoDashboard> {
  return safe(
    async () => {
      const c = createAdminClient();
      const [fatosRes, dimensionaisRes, arquivosRes] = await Promise.all([
        c
          .from("fato_secao")
          .select("indicador, ano, mes, eh_anual, cia, valor")
          .eq("secao", secao)
          .order("ano")
          .order("mes"),
        c
          .from("agregado_dimensional")
          .select("fonte, dimensao, chave, valor")
          .eq("secao", secao),
        c
          .from("arquivos_fonte")
          .select("caminho_unc, mtime, linhas_reais, observacao, ingerido_em")
          .eq("secao", secao)
          .order("ingerido_em", { ascending: false }),
      ]);

      const fatos = unwrap(fatosRes) ?? [];
      const dimensionais = unwrap(dimensionaisRes) ?? [];
      const arquivosFonte = unwrap(arquivosRes) ?? [];

      return {
        fatos,
        dimensionais,
        arquivosFonte,
        temDados: fatos.length > 0 || dimensionais.length > 0,
      };
    },
    { fatos: [], dimensionais: [], arquivosFonte: [], temDados: false },
    `getSecaoDashboard(${secao})`
  );
}

function bateFiltro(f: LinhaFato, filtro?: FiltroSecao): boolean {
  if (!filtro) return true;
  if (filtro.ano != null && f.ano !== filtro.ano) return false;
  if (filtro.mes != null && f.mes !== filtro.mes) return false;
  if (filtro.cia != null && f.cia !== filtro.cia) return false;
  return true;
}

/**
 * Valor de um indicador no mês mensal mais recente que ele tem (para a Cia
 * dada, se informada). Existe porque seções diferentes andam em ritmos
 * diferentes: o efetivo (P1) costuma estar um mês à frente da produtividade
 * (P3). Fixar um único mês de referência para todos os indicadores fazia os
 * que estão "atrás" aparecerem como "—" — o comandante leria isso como
 * atividade zero, não como dado ainda não consolidado.
 */
export function ultimoValorMensal(
  fatos: LinhaFato[],
  indicador: string,
  cia?: number
): { valor: number; ano: number; mes: number } | null {
  const linhas = fatos.filter(
    (f) =>
      f.indicador === indicador &&
      f.mes != null &&
      !f.eh_anual &&
      (cia == null ? f.cia == null || f.cia === 0 : f.cia === cia)
  );
  if (linhas.length === 0) return null;
  const maisRecente = linhas.reduce((a, b) =>
    a.ano !== b.ano ? (a.ano > b.ano ? a : b) : (a.mes as number) > (b.mes as number) ? a : b
  );
  return { valor: Number(maisRecente.valor), ano: maisRecente.ano, mes: maisRecente.mes as number };
}

/** Soma de um indicador no recorte filtrado — para os cards de KPI de topo. */
export function totalIndicador(
  fatos: LinhaFato[],
  indicador: string,
  filtro?: FiltroSecao
): number | null {
  const linhas = fatos.filter((f) => f.indicador === indicador && bateFiltro(f, filtro));
  if (linhas.length === 0) return null;
  return linhas.reduce((soma, l) => soma + Number(l.valor), 0);
}

/**
 * Série mensal de um indicador, pronta para o gráfico: chave "YYYY-MM",
 * ordenada cronologicamente. Só aceita filtro de Cia — a série mensal em si
 * é o "todos os meses"; filtrar por ano/mês não faria sentido aqui (o
 * componente de gráfico é quem decide a janela de exibição).
 */
export function serieMensal(
  fatos: LinhaFato[],
  indicador: string,
  filtroCia?: number
): { chave: string; valor: number }[] {
  return fatos
    .filter(
      (f) =>
        f.indicador === indicador &&
        f.mes != null &&
        !f.eh_anual &&
        (filtroCia == null || f.cia === filtroCia)
    )
    .map((f) => ({ chave: `${f.ano}-${String(f.mes).padStart(2, "0")}`, valor: Number(f.valor) }))
    .sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));
}

/** Comparativo por Cia (1–7) de um indicador, no recorte de ano/mês filtrado. */
export function comparativoCia(
  fatos: LinhaFato[],
  indicador: string,
  filtro?: Pick<FiltroSecao, "ano" | "mes">
): { cia: number; valor: number }[] {
  const porCia = new Map<number, number>();
  for (const f of fatos) {
    if (f.indicador !== indicador || f.cia == null || f.cia === 0) continue;
    if (filtro?.ano != null && f.ano !== filtro.ano) continue;
    if (filtro?.mes != null && f.mes !== filtro.mes) continue;
    porCia.set(f.cia, (porCia.get(f.cia) ?? 0) + Number(f.valor));
  }
  return Array.from(porCia.entries())
    .map(([cia, valor]) => ({ cia, valor }))
    .sort((a, b) => a.cia - b.cia);
}

/**
 * Ranking (top-N) de uma dimensão não-temporal, já ordenado por valor
 * decrescente — corrige a armadilha do padrão antigo em p2-charts.tsx, onde
 * kpiSerie ordenava por chave alfabética e quem consumia tinha que lembrar
 * de reordenar antes do slice (foi exatamente o bug B6 da auditoria).
 */
export function rankingDimensao(
  dimensionais: LinhaDimensional[],
  fonte: string,
  dimensao: string,
  topN = 8
): { chave: string; valor: number }[] {
  return dimensionais
    .filter((d) => d.fonte === fonte && d.dimensao === dimensao)
    .map((d) => ({ chave: d.chave, valor: Number(d.valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, topN);
}

/**
 * Variação percentual de um indicador no mês filtrado vs o mês imediatamente
 * anterior (mesma Cia, se filtrada). Opera sobre TODO o array de fatos (não
 * o recorte filtrado) porque o mês anterior pode cair fora do filtro de ano
 * quando o mês filtrado é janeiro.
 */
export function deltaMesAnterior(
  fatos: LinhaFato[],
  indicador: string,
  ano: number,
  mes: number,
  cia?: number
): number | null {
  const mesAnteriorAno = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;

  const valorEm = (a: number, m: number): number | null => {
    const linha = fatos.find(
      (f) =>
        f.indicador === indicador &&
        f.ano === a &&
        f.mes === m &&
        !f.eh_anual &&
        (cia == null ? f.cia == null || f.cia === 0 : f.cia === cia)
    );
    return linha ? Number(linha.valor) : null;
  };

  const atual = valorEm(ano, mes);
  const anterior = valorEm(mesAnteriorAno, mesAnterior);
  if (atual == null || anterior == null || anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/** Anos distintos presentes no dataset — para popular as opções do FiltroBar
 * sem hardcode e sem mostrar anos sem nenhum dado. */
export function anosDisponiveis(fatos: LinhaFato[]): number[] {
  return Array.from(new Set(fatos.map((f) => f.ano))).sort((a, b) => b - a);
}
