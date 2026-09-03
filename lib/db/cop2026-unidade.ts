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
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

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
