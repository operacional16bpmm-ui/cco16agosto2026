import "server-only";

/**
 * Onde este sistema mora — a ficha técnica que faltava.
 *
 * Pedido do Fabricio em 02/09/2026: "uma área separada no painel admin, algo
 * técnico, informações de onde está o banco de dados de tudo isso, qual nome,
 * localização, endereço URL etc., último dia do backup".
 *
 * O caso de uso não é curiosidade: quando alguma coisa quebra às 23h, a
 * primeira pergunta é "qual base o painel está lendo AGORA" — e a resposta
 * depende de `COP2026_FONTE`, que é variável de ambiente e pode ter sido virada
 * por outra pessoa. Descobrir isso hoje exige abrir o painel da Vercel.
 *
 * REGRA DESTA TELA: nome, endereço e estado. **Nunca chave.** Nada aqui pode
 * ser usado para acessar coisa nenhuma — se um segredo precisar aparecer, a
 * resposta é não mostrar, não é mascarar.
 */
import { fonteCop2026, type FonteCop2026 } from "@/lib/cop2026-leitura";
import { supabaseConfigurado } from "@/lib/preview";
import { batalhaoDaInstalacao } from "@/lib/db/cop2026-unidade";

export type FichaInfra = {
  banco: {
    /** Referência do projeto, extraída da URL. Não é segredo: vai na URL pública. */
    projeto: string | null;
    host: string | null;
    regiao: string;
    configurado: boolean;
  };
  aplicacao: {
    /** De onde o painel lê AGORA. É o rollback de minutos. */
    fonte: FonteCop2026;
    corteDoBanco: string | null;
    batalhao: string;
    ambiente: string;
    /** Commit publicado, para casar a tela com o código. */
    commit: string | null;
    deployUrl: string | null;
    regiaoDaFuncao: string | null;
  };
};

/**
 * `NEXT_PUBLIC_SUPABASE_URL` é pública por definição (vai no bundle do
 * navegador), então exibi-la aqui não expõe nada novo. A service key não
 * aparece nem mascarada.
 */
function doBanco(): FichaInfra["banco"] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return {
    projeto: m?.[1] ?? null,
    host: m ? `db.${m[1]}.supabase.co` : null,
    // Fixa: o projeto foi criado em sa-east-1 e mudar de região exige migrar.
    regiao: "sa-east-1 (São Paulo)",
    configurado: supabaseConfigurado(),
  };
}

function daAplicacao(): FichaInfra["aplicacao"] {
  const corte = process.env.COP2026_CORTE_BANCO;
  return {
    fonte: fonteCop2026(),
    corteDoBanco: corte && /^\d{4}-\d{2}-\d{2}$/.test(corte) ? corte : null,
    batalhao: batalhaoDaInstalacao(),
    ambiente: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "desconhecido",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
    deployUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    regiaoDaFuncao: process.env.VERCEL_REGION ?? null,
  };
}

export function fichaInfra(): FichaInfra {
  return { banco: doBanco(), aplicacao: daAplicacao() };
}

/**
 * Última execução de cada conferência e do backup.
 *
 * `cop_rotina_execucao` é alimentada pela esteira de verificação e pelo backup
 * diário do pc2. Tabela própria de propósito: `cop_verificacao_execucao`, que
 * já existia, é de outra coisa (conferência de evidência contra a API da
 * Motorola) e reaproveitá-la misturaria dois assuntos numa linha só.
 *
 * O valor não é o histórico: é o ENVELHECIMENTO. Backup de cinco dias atrás
 * aparece igual a backup de ontem em qualquer log; aqui aparece a idade.
 */
export type Execucao = {
  nome: string;
  quando: string;
  ok: boolean;
  detalhe: string | null;
  duracaoMs: number | null;
  /** Horas desde a execução — é o que denuncia rotina que morreu calada. */
  idadeHoras: number;
};

export async function ultimasExecucoes(): Promise<Execucao[]> {
  if (!supabaseConfigurado()) return [];
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient()
      .from("cop_rotina_execucao")
      .select("nome, quando, ok, detalhe, duracao_ms")
      .order("quando", { ascending: false })
      .limit(200);
    if (error) throw error;

    /* Só a mais recente de cada nome: a tela responde "está saudável?", não
       "o que aconteceu no mês". O histórico completo é da trilha. */
    const vistos = new Map<string, Execucao>();
    for (const r of data ?? []) {
      const nome = String(r.nome);
      if (vistos.has(nome)) continue;
      const quando = String(r.quando);
      vistos.set(nome, {
        nome,
        quando,
        ok: Boolean(r.ok),
        detalhe: (r.detalhe as string | null) ?? null,
        duracaoMs: (r.duracao_ms as number | null) ?? null,
        idadeHoras: (Date.now() - new Date(quando).getTime()) / 3_600_000,
      });
    }
    return [...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (erro) {
    console.error("[cop2026-infra] execuções falharam:", erro);
    return [];
  }
}
