/**
 * Dimensão de unidade: CPA → Batalhão → Fração.
 *
 * Nasceu em 03/09/2026, quando o Comando decidiu levar a auditoria de COP para
 * todos os CPAs e batalhões. Até então `cop_auditoria_lancamento` só tinha
 * `subunidade` ('em', '1cia', …) e todo lançamento era implicitamente do 16º
 * BPM/M — ver `supabase/migrations/029_cop_unidade.sql` para a decifração do
 * código OPM de 9 dígitos.
 *
 * REGRA DE EXIBIÇÃO: o que aparece na tela e no relatório é o **nome**
 * ("16º BPM/M", "CPA/M-5"). O código existe só como chave estável, para que
 * renomear uma unidade não quebre o histórico dela. Fora da área técnica do
 * admin, nenhuma tela mostra código.
 */
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { ORDEM_SUBUNIDADES, ROTULO_SUBUNIDADE } from "@/lib/cop2026";

export type TipoUnidade = "cpa" | "batalhao" | "fracao";

export type Unidade = {
  cod: string;
  tipo: TipoUnidade;
  nome: string;
  nomeCurto: string | null;
  codPai: string | null;
  cpaNome: string | null;
  ativa: boolean;
  revisadoEm: string | null;
  revisadoPor: string | null;
  /** Vocabulário do painel ('em', '1cia', 'ft') quando a fração tem meta
   *  própria na Matriz Proporcional. `null` nas frações administrativas. */
  subunidadePainel: string | null;
};

export type CpaPendente = {
  cod: string;
  nome: string;
  batalhoes: number;
  quais: string;
};

function daLinha(r: Record<string, unknown>): Unidade {
  return {
    cod: String(r.cod),
    tipo: r.tipo as TipoUnidade,
    nome: String(r.nome),
    nomeCurto: (r.nome_curto as string | null) ?? null,
    codPai: (r.cod_pai as string | null) ?? null,
    cpaNome: (r.cpa_nome as string | null) ?? null,
    ativa: Boolean(r.ativa),
    revisadoEm: (r.revisado_em as string | null) ?? null,
    revisadoPor: (r.revisado_por as string | null) ?? null,
    subunidadePainel: (r.subunidade_painel as string | null) ?? null,
  };
}

/** Fallback silencioso: sem Supabase o painel do 16º continua de pé. */
async function seguro<T>(fn: () => Promise<T>, padrao: T): Promise<T> {
  if (!supabaseConfigurado()) return padrao;
  try {
    return await fn();
  } catch (erro) {
    console.error("[db/cop2026-unidade] consulta falhou:", erro);
    return padrao;
  }
}

/** Os CPAs, para o primeiro seletor do admin. Ordena por nome, não por código. */
export async function listarCpas(): Promise<Unidade[]> {
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("*")
      .eq("tipo", "cpa")
      .eq("ativa", true)
      .order("cpa_nome", { nullsFirst: false })
      .order("cod");
    if (error) throw error;
    return (data ?? []).map(daLinha);
  }, []);
}

/** Os batalhões de um CPA — o segundo seletor, que só abre depois do primeiro. */
export async function listarBatalhoes(codCpa: string): Promise<Unidade[]> {
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("*")
      .eq("tipo", "batalhao")
      .eq("cod_pai", codCpa)
      .eq("ativa", true)
      .order("nome");
    if (error) throw error;
    return (data ?? []).map(daLinha);
  }, []);
}

/**
 * As frações de um batalhão — é o ÚNICO seletor que o policial vê no
 * formulário. CPA e batalhão vêm do vínculo dele, não da digitação:
 * determinação do Fabricio em 02/09/2026 ("o formulário ele apenas irá escolher
 * a sua unidade, mas para onde os dados irão será de controle do admin").
 */
export async function listarFracoes(codBatalhao: string): Promise<Unidade[]> {
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("*")
      .eq("tipo", "fracao")
      .eq("cod_pai", codBatalhao)
      .eq("ativa", true)
      .order("cod");
    if (error) throw error;
    return (data ?? []).map(daLinha);
  }, []);
}

/* ------------------------------------------------- seletor do formulário */

/**
 * Uma opção do seletor de unidade, já pronta para a tela: nome institucional,
 * nada de código. O `subunidade` só vem preenchido na fração e é o que liga a
 * escolha do policial ao vocabulário do painel ('em', '1cia', 'ft').
 */
export type OpcaoUnidade = {
  cod: string;
  nome: string;
  subunidade: string | null;
};

/** A árvore que o formulário de lançamento carrega já montada. */
export type ArvoreFormulario = {
  comandos: OpcaoUnidade[];
  batalhoes: OpcaoUnidade[];
  fracoes: OpcaoUnidade[];
  padrao: { comando: string; batalhao: string };
};

function opcao(u: Unidade): OpcaoUnidade {
  return {
    cod: u.cod,
    nome: nomeInstitucional(u.cpaNome ?? u.nomeCurto ?? u.nome),
    subunidade: u.subunidadePainel,
  };
}

/** Põe o código `primeiro` no topo da lista sem reordenar o resto. */
function comPadraoNoTopo(lista: OpcaoUnidade[], primeiro: string): OpcaoUnidade[] {
  const i = lista.findIndex((o) => o.cod === primeiro);
  return i <= 0 ? lista : [lista[i], ...lista.slice(0, i), ...lista.slice(i + 1)];
}

/**
 * Os comandos (CPA/CPI e equivalentes), com o desta instalação no topo —
 * determinação do Fabricio em 08/09/2026: "CPA/M-5 já selecionado e todas as
 * outras abaixo". Os 13 comandos que a migration 029 deixou sem nome revisado
 * ficam FORA: exibir "Comando 307" para a tropa escolher convida ao erro que o
 * seletor existe para evitar.
 */
export async function opcoesDeComando(): Promise<OpcaoUnidade[]> {
  const cpas = (await listarCpas()).filter((u) => u.cpaNome);
  return cpas.map(opcao);
}

/** Os batalhões de um comando. */
export async function opcoesDeBatalhao(codComando: string): Promise<OpcaoUnidade[]> {
  return (await listarBatalhoes(codComando)).map(opcao);
}

/**
 * As frações que o policial vê.
 *
 * Quando o batalhão tem frações mapeadas para o vocabulário do painel (o 16º
 * BPM/M tem seis: EM, 1ª a 4ª Cia e Força Tática), **só elas aparecem** — são
 * as que têm meta na Matriz Proporcional, e o efetivo das frações
 * administrativas ("1.CIA PM ADM", "EM P/4") lança na Cia mãe, como o painel
 * sempre contou. Batalhão ainda não mapeado mostra a árvore como ela é, para
 * não ficar sem opção nenhuma.
 */
export async function opcoesDeFracao(codBatalhao: string): Promise<OpcaoUnidade[]> {
  const todas = await listarFracoes(codBatalhao);
  const comMeta = todas.filter((u) => u.subunidadePainel);
  const lista = comMeta.length > 0 ? comMeta : todas;
  return lista
    .map(opcao)
    .map((o) =>
      // Na fração mapeada quem manda é o rótulo do painel ("Estado-Maior",
      // "1ª Cia"): "16.BPM/M 1.CIA PM TERRITORIAL" é o nome do DEJEM, não o
      // que o Comando lê no relatório. Nas outras, ao menos o ordinal entra.
      o.subunidade && ROTULO_SUBUNIDADE[o.subunidade]
        ? { ...o, nome: ROTULO_SUBUNIDADE[o.subunidade] }
        : { ...o, nome: nomeDeFracao(o.nome) }
    )
    .sort((a, b) => {
      const ia = ORDEM_SUBUNIDADES.indexOf(a.subunidade as (typeof ORDEM_SUBUNIDADES)[number]);
      const ib = ORDEM_SUBUNIDADES.indexOf(b.subunidade as (typeof ORDEM_SUBUNIDADES)[number]);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

/**
 * Tudo o que a página de lançamento precisa, numa consulta só por nível.
 *
 * As frações dos OUTROS batalhões não vêm aqui de propósito: são 3.708 no
 * estado, e o formulário abre em 4G de viatura. Trocar de batalhão busca as
 * frações dele em `/api/cop2026/unidades`.
 */
export async function arvoreDoFormulario(): Promise<ArvoreFormulario> {
  const batalhao = batalhaoDaInstalacao();
  const comando = batalhao.slice(0, 3);
  const [comandos, batalhoes, fracoes] = await Promise.all([
    opcoesDeComando(),
    opcoesDeBatalhao(comando),
    opcoesDeFracao(batalhao),
  ]);
  return {
    comandos: comPadraoNoTopo(comandos, comando),
    batalhoes: comPadraoNoTopo(batalhoes, batalhao),
    fracoes,
    padrao: { comando, batalhao },
  };
}

/**
 * A fração que o policial DECLAROU, conferida contra a árvore.
 *
 * DECISÃO DO FABRICIO, 08/09/2026 — inverte a regra C-4, que derivava a
 * subunidade do RE e recusava qualquer fração vinda do cliente: **vale sempre o
 * que o policial declara**, mesmo quando a relação do efetivo (`p4_efetivo`,
 * congelada em 19/07) o coloca em outra Cia. Quem sabe onde serve hoje é ele; o
 * roster envelhece, o policial é transferido, e o painel que discorda da tropa
 * perde a tropa.
 *
 * O que a conferência ainda garante — e é o que sobra da C-4: a fração precisa
 * EXISTIR, estar ativa e pender do batalhão declarado, que por sua vez pende do
 * comando declarado. Assim o `curl` pode escolher a Cia errada (risco aceito,
 * era o preço da declaração), mas não pode inventar unidade nem despejar
 * lançamento num código que não é fração de ninguém.
 *
 * `null` quando não casa — e aí quem chama decide, sem travar a tropa.
 */
export async function resolverUnidadeDeclarada(
  fracaoCod: string,
  batalhaoCod: string,
  comandoCod: string
): Promise<{ cod: string; subunidade: string | null; batalhao: string; comando: string } | null> {
  if (!/^\d{6,9}$/.test(fracaoCod) || !/^\d{5}$/.test(batalhaoCod) || !/^\d{3}$/.test(comandoCod)) {
    return null;
  }
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("cod, cod_pai, subunidade_painel, ativa, tipo")
      .eq("cod", fracaoCod)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.tipo !== "fracao" || !data.ativa) return null;
    if (data.cod_pai !== batalhaoCod || !batalhaoCod.startsWith(comandoCod)) return null;
    return {
      cod: String(data.cod),
      subunidade: (data.subunidade_painel as string | null) ?? null,
      batalhao: batalhaoCod,
      comando: comandoCod,
    };
  }, null);
}

/**
 * A cadeia completa (Comando › Batalhão › Fração) de cada código de fração.
 *
 * Serve à Planilha de Lançamentos, onde o superior confere DE ONDE veio cada
 * registro. Três consultas por nível, e não uma por linha: a tela lista até
 * 2.000 lançamentos e um `select` por linha derrubaria a página.
 *
 * Só nomes saem daqui — o código de OPM não aparece em tela nenhuma fora da
 * área técnica do admin.
 */
export async function cadeiaDasFracoes(
  cods: string[]
): Promise<Record<string, { fracao: string; batalhao: string; comando: string }>> {
  const unicos = [...new Set(cods.filter((c) => /^\d{6,9}$/.test(c)))];
  if (unicos.length === 0) return {};

  return seguro(async () => {
    const cli = createAdminClient();
    const pega = async (lista: string[]) => {
      const { data, error } = await cli
        .from("cop_unidade")
        .select("cod, nome, nome_curto, cpa_nome, cod_pai, subunidade_painel")
        .in("cod", lista);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    };

    const fracoes = await pega(unicos);
    const batalhoes = await pega([
      ...new Set(fracoes.map((f) => String(f.cod_pai ?? "")).filter(Boolean)),
    ]);
    const comandos = await pega([
      ...new Set(batalhoes.map((b) => String(b.cod_pai ?? "")).filter(Boolean)),
    ]);

    const porCod = (linhas: Record<string, unknown>[]) =>
      Object.fromEntries(linhas.map((l) => [String(l.cod), l]));
    const mapaB = porCod(batalhoes);
    const mapaC = porCod(comandos);

    const saida: Record<string, { fracao: string; batalhao: string; comando: string }> = {};
    for (const f of fracoes) {
      const sub = f.subunidade_painel as string | null;
      const b = mapaB[String(f.cod_pai ?? "")];
      const c = b ? mapaC[String(b.cod_pai ?? "")] : undefined;
      saida[String(f.cod)] = {
        fracao:
          (sub && ROTULO_SUBUNIDADE[sub]) ||
          nomeDeFracao(String(f.nome_curto ?? f.nome ?? "")),
        batalhao: b ? nomeInstitucional(String(b.nome_curto ?? b.nome ?? "")) : "",
        comando: c ? nomeInstitucional(String(c.cpa_nome ?? c.nome_curto ?? c.nome ?? "")) : "",
      };
    }
    return saida;
  }, {});
}

/**
 * Nome de exibição de uma fração, batalhão ou comando — para o eco do
 * comprovante e do relatório, onde só o nome pode aparecer.
 */
export async function nomesDaUnidade(
  cods: string[]
): Promise<Record<string, string>> {
  const limpos = cods.filter((c) => /^\d{3,9}$/.test(c));
  if (limpos.length === 0) return {};
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("cod, nome, nome_curto, cpa_nome, subunidade_painel")
      .in("cod", limpos);
    if (error) throw error;
    const mapa: Record<string, string> = {};
    for (const r of data ?? []) {
      const sub = r.subunidade_painel as string | null;
      mapa[String(r.cod)] =
        (sub && ROTULO_SUBUNIDADE[sub]) ||
        nomeInstitucional(
          String(r.cpa_nome ?? r.nome_curto ?? r.nome ?? "")
        );
    }
    return mapa;
  }, {});
}

/** O que ainda espera o Comando nomear. Zerar isto libera a Fase 2. */
export async function cpasPendentes(): Promise<CpaPendente[]> {
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade_pendente_de_revisao")
      .select("*");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      cod: String(r.cod),
      nome: String(r.nome),
      batalhoes: Number(r.batalhoes ?? 0),
      quais: String(r.quais ?? ""),
    }));
  }, []);
}

/**
 * Nomeia um CPA. É a revisão humana que a migration 029 exige antes de a
 * hierarquia valer: o código agrupa os batalhões corretamente, mas o NOME do
 * comando não existe em lugar nenhum do DEJEM ligado a esse código. Carimbar um
 * CPA errado em sistema oficial é pior que deixar em branco.
 */
export async function nomearCpa(
  cod: string,
  nome: string,
  por: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const limpo = nome.trim();
  if (!limpo) return { ok: false, erro: "O nome do CPA não pode ficar vazio." };
  if (limpo.length > 60) return { ok: false, erro: "Nome longo demais (máx. 60)." };
  if (!supabaseConfigurado()) return { ok: false, erro: "Banco não configurado." };

  try {
    const { error } = await createAdminClient()
      .from("cop_unidade")
      .update({
        nome: limpo,
        nome_curto: limpo,
        cpa_nome: limpo,
        revisado_em: new Date().toISOString(),
        revisado_por: por,
      })
      .eq("cod", cod)
      .eq("tipo", "cpa");
    if (error) throw error;
    return { ok: true };
  } catch (erro) {
    console.error("[db/cop2026-unidade] nomearCpa falhou:", erro);
    return { ok: false, erro: "Não foi possível gravar agora." };
  }
}

/**
 * O batalhão que ESTA instalação atende.
 *
 * É a costura da Fase 2: hoje devolve o 16º BPM/M e todo lançamento cai na
 * árvore dele. Quando o segundo batalhão entrar, o valor passa a vir do vínculo
 * do usuário — e nada mais no caminho de gravação muda, porque ninguém abaixo
 * daqui sabe qual batalhão é.
 *
 * Variável de ambiente, e não constante: é o mesmo motivo de `COP2026_FONTE` —
 * poder virar sem esperar build, no meio de um turno de serviço.
 */
export function batalhaoDaInstalacao(): string {
  const v = process.env.COP2026_BATALHAO;
  return v && /^\d{5}$/.test(v) ? v : "50516";
}

/**
 * Vocabulário do painel ('em', '1cia', 'ft') → fração real da árvore.
 *
 * O de-para mora no banco (`cop_unidade.subunidade_painel`), não aqui: quando o
 * 23º BPM/M entrar, o admin dele mapeia as frações próprias sem ninguém editar
 * TypeScript. Devolve `null` quando não há correspondência — lançamento sem
 * fração declarada continua existindo e continua aparecendo como órfão, que é a
 * regra de `docs/cop2026-padroes-comando.md`.
 */
export async function fracaoDaSubunidade(
  subunidade: string,
  codBatalhao: string = batalhaoDaInstalacao()
): Promise<string | null> {
  if (!subunidade.trim()) return null;
  return seguro(async () => {
    const { data, error } = await createAdminClient()
      .from("cop_unidade")
      .select("cod")
      .eq("cod_pai", codBatalhao)
      .eq("subunidade_painel", subunidade)
      .maybeSingle();
    if (error) throw error;
    return (data?.cod as string | undefined) ?? null;
  }, null);
}

/**
 * A cadeia de comando desta instalação, para assinar as superfícies:
 * **PMESP → CPA/M-5 → 16º BPM/M**.
 *
 * O rodapé dizia só "16º BPM/M". Assim que o segundo batalhão entrar, um
 * relatório impresso sem a cadeia não diz de quem é — e relatório de auditoria
 * de COP circula em papel, fora do sistema que sabe o contexto.
 *
 * `cache()` do React: o rodapé aparece em 19 superfícies e sem isto cada página
 * pagaria duas consultas só para escrever um cabeçalho. Uma vez por requisição
 * basta, e o dado praticamente não muda.
 *
 * Devolve `null` sem banco — o rodapé cai para o texto curto de sempre em vez
 * de sumir. Nenhuma tela pode depender desta consulta para renderizar.
 */
/**
 * `16.BPM/M` → `16º BPM/M`.
 *
 * O DEJEM grava com ponto e sem espaço; a I-7-PM escreve com ordinal. O nome
 * cru fica no banco (é a chave de conferência contra a fonte) e a correção é só
 * de exibição — documento oficial não sai com "16.BPM/M".
 */
/**
 * `1.CIA PM ADM` → `1ª Cia PM ADM`, `CIA F TAT` → `Cia Força Tática`.
 *
 * Vale para os batalhões que ainda não têm o de-para com o vocabulário do
 * painel: sem isto o seletor oferece o nome cru do DEJEM, todo em caixa alta e
 * com o ponto no lugar do ordinal, e o cartão exibe uma sigla sem sentido
 * ("1.C"). O nome cru continua no banco — a correção é só de exibição.
 */
export function nomeDeFracao(nome: string): string {
  return nome
    .replace(/\b(\d+)\s*[.ºo°]?\s*CIA\b/gi, "$1ª Cia")
    .replace(/\bCIA\s+F\s+TAT\b/gi, "Cia Força Tática")
    .replace(/\s+/g, " ")
    .trim();
}

export function nomeInstitucional(nome: string): string {
  return nome
    .replace(/^(\d+)\s*[.ºo°]?\s*(BPM|BAEP|GB|BPRV|BPAMB|BPTRAN|BPCHQ)\b/i, "$1º $2")
    .replace(/\s+/g, " ")
    .trim();
}

export const hierarquiaDaInstalacao = cache(
  async (): Promise<{ batalhao: string; comando: string | null } | null> => {
    const cod = batalhaoDaInstalacao();
    return seguro(async () => {
      const { data, error } = await createAdminClient()
        .from("cop_unidade")
        .select("nome, cod_pai")
        .eq("cod", cod)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let comando: string | null = null;
      if (data.cod_pai) {
        const { data: pai } = await createAdminClient()
          .from("cop_unidade")
          .select("nome, cpa_nome")
          .eq("cod", data.cod_pai)
          .maybeSingle();
        comando = (pai?.cpa_nome as string | null) ?? (pai?.nome as string | null) ?? null;
      }
      return { batalhao: nomeInstitucional(String(data.nome)), comando };
    }, null);
  }
);

/** Contagem por tipo, para a área técnica do admin. */
export async function resumoDaDimensao(): Promise<{
  cpas: number;
  batalhoes: number;
  fracoes: number;
  cpasSemNome: number;
}> {
  return seguro(
    async () => {
      const cli = createAdminClient();
      const conta = async (tipo: TipoUnidade) => {
        const { count, error } = await cli
          .from("cop_unidade")
          .select("cod", { count: "exact", head: true })
          .eq("tipo", tipo);
        if (error) throw error;
        return count ?? 0;
      };
      const [cpas, batalhoes, fracoes, pend] = await Promise.all([
        conta("cpa"),
        conta("batalhao"),
        conta("fracao"),
        cpasPendentes(),
      ]);
      return { cpas, batalhoes, fracoes, cpasSemNome: pend.length };
    },
    { cpas: 0, batalhoes: 0, fracoes: 0, cpasSemNome: 0 }
  );
}
