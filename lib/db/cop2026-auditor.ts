import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { chaveSubunidade } from "@/lib/cop2026";
import { normalizarRe, subunidadeValida, type SubunidadeValida } from "@/lib/cop2026-lancamento";

/**
 * Quem é o auditor: subunidade derivada do RE (C-4) e vínculo conta↔RE (C-3).
 *
 * DUAS REGRAS QUE NÃO PODEM SER RELAXADAS
 *
 * 1. **A subunidade nunca vem do cliente.** A Server Action é um endpoint
 *    público — `curl` com o identificador da ação ignora a tela inteira. Se o
 *    formulário mandasse a fração, daria para despejar evidência no balde de
 *    outra Cia e distorcer o ranking do Comando sem violar nenhuma constraint.
 *    Aqui ela é resolvida contra `p4_efetivo`, no servidor, a partir do RE.
 *
 * 2. **Nada é devolvido a partir do RE** (A-2, LGPD). Nem nome, nem posto, nem
 *    Cia, e a mensagem de "RE conhecido" e "RE desconhecido" é a MESMA. A
 *    diferença entre as duas respostas seria um oráculo de 1 bit sobre o
 *    efetivo nominal do Batalhão, consultável em lote por quem tiver a lista de
 *    REs — e a própria migration 008 marca `p4_efetivo` como dado sensível. O
 *    flag `foraDoEfetivo` existe, mas só o Comando o vê, no painel.
 *
 * O ROSTER ENRIQUECE, NUNCA BLOQUEIA. `p4_efetivo` está congelado em 19/07,
 * tem 2 bases de RE duplicadas em 570 linhas e não conhece quem chegou depois.
 * RE que não casa entra como `outros` e aparece na tela do Comando; recusar
 * produziria o registro que não existe em lugar nenhum.
 */

const TABELA_AUDITOR = "cop2026_auditor";

/* ------------------------------------------------------- subunidade por RE */

export type IdentificacaoRe = {
  subunidade: SubunidadeValida;
  /** Só para o painel do Comando. Nunca para a resposta do formulário. */
  foraDoEfetivo: boolean;
};

/**
 * Casa pela BASE de 6 dígitos: `p4_efetivo.re` está 100% em `NNNNNN-X` (medido
 * em 01/09/2026: 524 com verificador numérico, 46 com letra), enquanto o
 * formulário recebeu cinco formatos diferentes em agosto. `like base%` usa o
 * índice `idx_p4_efetivo_re` que já existe.
 *
 * Duas linhas para a mesma base (acontece em 2 dos 570) caem em `outros` de
 * propósito: chutar entre duas Cias é pior do que dizer que não se sabe.
 */
export async function identificarPorRe(reBruto: string): Promise<IdentificacaoRe> {
  const { base } = normalizarRe(reBruto);
  if (base.length < 6 || !supabaseConfigurado()) {
    return { subunidade: "outros", foraDoEfetivo: true };
  }

  try {
    const { data, error } = await createAdminClient()
      .from("p4_efetivo")
      .select("cia")
      .like("re", `${base}%`)
      .limit(2);
    if (error) throw new Error(error.message);

    const linhas = (data ?? []) as { cia: string | null }[];
    if (linhas.length !== 1) {
      return { subunidade: "outros", foraDoEfetivo: linhas.length === 0 };
    }

    // A `cia` do roster vem como "1ª", "EM", "FT" — `chaveSubunidade` já é a
    // função que normaliza as duas grafias da planilha e é a mesma usada pelo
    // painel. Regra de classificação em fonte única, como manda o AGENTS.md.
    const chave = chaveSubunidade(linhas[0].cia ?? "");
    return {
      subunidade: subunidadeValida(chave) ? chave : "outros",
      foraDoEfetivo: false,
    };
  } catch (erro) {
    // Banco instável não pode recusar o lançamento da tropa: o registro entra
    // sem fração e o Comando reclassifica na tela de manejo.
    console.error("[cop2026-auditor] falha ao identificar RE:", erro);
    return { subunidade: "outros", foraDoEfetivo: false };
  }
}

/* ----------------------------------------------------- ficha nominal por RE */

export type FichaEfetivo = {
  /** RE como está no roster (`NNNNNN-X`), não o que foi digitado. */
  re: string;
  /** Nome completo, em caixa alta, como consta na relação do Batalhão. */
  nome: string;
  /** Posto/graduação padronizado (`CB PM`, `1º SGT PM`, `CAP PM`...). */
  posto: string;
  /** Subunidade/função do roster (`EM`, `1ª CIA`, `FT`, `P4`...). */
  cia: string;
};

/**
 * Devolve a ficha nominal a partir do RE.
 *
 * DECISÃO DE COMANDO (Fabricio, 01/09/2026), que RELAXA a regra A-2 descrita no
 * cabeçalho deste arquivo: o auditor digita o RE e a tela mostra o nome. Isso
 * existe para padronizar o painel — hoje o mesmo PM aparece como "RAFAEL",
 * "Rafael S." e "CB RAFAEL" em lançamentos diferentes, e a contagem por pessoa
 * não fecha.
 *
 * O CUSTO, REGISTRADO DE PROPÓSITO: `/cop2026/lancar` é público. Quem varrer
 * `/api/cop2026/efetivo?re=NNNNNN` de 100000 a 999999 reconstrói o efetivo
 * nominal do 16º BPM/M — a tabela `p4_efetivo` é marcada como sensível na
 * migration 008. A mitigação (responder só para sessão autenticada) está a uma
 * linha de distância em `app/api/cop2026/efetivo/route.ts`; foi decidido não
 * ligá-la. Nunca devolvemos e-mail, fone nem situação: só o que o painel exibe.
 *
 * Casa pela BASE de 6 dígitos, como `identificarPorRe`. Duas linhas para a mesma
 * base (2 das 570) devolvem nada: chutar entre dois nomes é pior que não saber.
 */
export async function fichaPorRe(reBruto: string): Promise<FichaEfetivo | null> {
  const { base } = normalizarRe(reBruto);
  if (base.length < 6 || !supabaseConfigurado()) return null;

  try {
    const { data, error } = await createAdminClient()
      .from("p4_efetivo")
      .select("re, nome, posto_grad, cia")
      .like("re", `${base}%`)
      .limit(2);
    if (error) throw new Error(error.message);

    const linhas = (data ?? []) as {
      re: string | null;
      nome: string | null;
      posto_grad: string | null;
      cia: string | null;
    }[];
    if (linhas.length !== 1) return null;

    const linha = linhas[0];
    const nome = (linha.nome ?? "").trim();
    if (!nome) return null;

    return {
      re: (linha.re ?? "").trim(),
      nome: nome.toLocaleUpperCase("pt-BR"),
      posto: (linha.posto_grad ?? "").trim(),
      cia: (linha.cia ?? "").trim(),
    };
  } catch (erro) {
    // Roster fora do ar não pode travar o lançamento: a tela volta a ser
    // digitação livre, exatamente como era antes desta função existir.
    console.error("[cop2026-auditor] falha ao buscar ficha por RE:", erro);
    return null;
  }
}

/* --------------------------------------------------------------- vínculo */

export type Vinculo = {
  email: string;
  re_base: string;
  re: string | null;
  nome_guerra: string | null;
  confirmado_em: string | null;
  confirmado_por: string | null;
  bloqueado: boolean;
  re_fora_do_efetivo: boolean;
  criado_em: string;
};

export type ResultadoVinculo = {
  /** Verdadeiro quando o lançamento não deve entrar na meta ainda. */
  pendente: boolean;
  /** Só para a trilha e para a tela do Comando; nunca exibido ao auditor. */
  motivo: "sem_login" | "novo" | "confirmado" | "conflito" | "bloqueado";
};

/**
 * O gate de vínculo é uma DECISÃO DE COMANDO, não uma constante de código.
 *
 * O plano previa pré-semear os vínculos de `p4_efetivo.email` e só contar
 * lançamento de vínculo confirmado. Medido em 01/09/2026: a coluna `email` do
 * roster tem **zero linhas preenchidas** — não existe semente. Ligar a exigência
 * no dia 1 faria TODO lançamento de setembro nascer pendente e o painel do
 * Major abrir zerado, que é exatamente o desfecho que enterra o projeto.
 *
 * Então: a fila de confirmação existe, é gravada e é operável desde o primeiro
 * dia; o que fica atrás da variável é a exigência de confirmação para CONTAR.
 * Quando houver base de vínculos, o Comando liga — e aí a regra vale para
 * frente, sem reescrever o passado.
 */
export function exigeVinculoConfirmado(): boolean {
  return process.env.COP2026_EXIGIR_VINCULO === "1";
}

/**
 * Resolve (e cria, quando é a primeira vez) o vínculo entre a conta Google e o
 * RE declarado. Sem login, não há vínculo a resolver — o lançamento entra
 * anônimo, como era no Google Forms, e o controle continua sendo o formato do
 * identificador.
 */
export async function resolverVinculo(
  email: string | null | undefined,
  reBruto: string,
  nomeGuerra: string
): Promise<ResultadoVinculo> {
  const alvo = (email ?? "").trim().toLowerCase();
  const { base, canonico } = normalizarRe(reBruto);
  if (!alvo || base.length < 6 || !supabaseConfigurado()) {
    return { pendente: false, motivo: "sem_login" };
  }

  try {
    const c = createAdminClient();
    const { data, error } = await c
      .from(TABELA_AUDITOR)
      .select("email, re_base, bloqueado, confirmado_em")
      .eq("email", alvo)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const atual = data as Pick<Vinculo, "email" | "re_base" | "bloqueado" | "confirmado_em"> | null;

    if (!atual) {
      const { foraDoEfetivo } = await identificarPorRe(base);
      const { error: erroInsert } = await c.from(TABELA_AUDITOR).insert({
        email: alvo,
        re_base: base,
        re: canonico,
        nome_guerra: nomeGuerra || null,
        re_fora_do_efetivo: foraDoEfetivo,
      });
      if (erroInsert) throw new Error(erroInsert.message);
      return { pendente: exigeVinculoConfirmado(), motivo: "novo" };
    }

    if (atual.bloqueado) return { pendente: true, motivo: "bloqueado" };

    // Conta confirmada lançando com OUTRO RE: é o caso que o C-3 existe para
    // pegar. O lançamento não é recusado — recusar avisa o atacante e derruba
    // quem só errou de dígito. Ele entra marcado, e o Comando decide.
    if (atual.re_base !== base) {
      return { pendente: true, motivo: "conflito" };
    }

    if (atual.confirmado_em) return { pendente: false, motivo: "confirmado" };
    return { pendente: exigeVinculoConfirmado(), motivo: "novo" };
  } catch (erro) {
    console.error("[cop2026-auditor] falha ao resolver vínculo:", erro);
    // Falha de banco não pode virar pendência silenciosa que some da meta.
    return { pendente: false, motivo: "sem_login" };
  }
}

/* ------------------------------------------------ administração da fila */

export async function listarVinculos(): Promise<{ itens: Vinculo[]; erro: string | null }> {
  if (!supabaseConfigurado()) return { itens: [], erro: null };
  try {
    const { data, error } = await createAdminClient()
      .from(TABELA_AUDITOR)
      .select("*")
      // Pendente primeiro: a tela existe para esvaziar a fila.
      .order("confirmado_em", { ascending: true, nullsFirst: true })
      .order("criado_em", { ascending: false })
      .limit(600);
    if (error) throw new Error(error.message);
    return { itens: (data ?? []) as Vinculo[], erro: null };
  } catch (erro) {
    console.error("[cop2026-auditor] falha ao listar vínculos:", erro);
    return { itens: [], erro: "Não foi possível ler a fila de vínculos." };
  }
}

export async function confirmarVinculo(email: string, operador: string): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABELA_AUDITOR)
    .update({
      confirmado_em: new Date().toISOString(),
      confirmado_por: operador,
      bloqueado: false,
      atualizado_em: new Date().toISOString(),
    })
    .eq("email", email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}

/** Revogar é desligar, não apagar: o histórico do que já foi lançado por essa
 *  conta continua existindo e continua atribuível. */
export async function bloquearVinculo(
  email: string,
  bloqueado: boolean,
  operador: string
): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABELA_AUDITOR)
    .update({
      bloqueado,
      confirmado_por: operador,
      atualizado_em: new Date().toISOString(),
    })
    .eq("email", email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}
