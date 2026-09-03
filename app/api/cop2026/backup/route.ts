import { type NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * EXPORTAÇÃO PARA BACKUP — o pc2 puxa daqui, todo dia às 03h05.
 *
 * POR QUE ESTA ROTA EXISTE, em vez de o pc2 falar direto com o Supabase: o
 * backup precisa ler tudo, e ler tudo exige a `service_role`, que **ignora RLS
 * por completo**. Guardar essa chave no pc2 — máquina sem firewall, com `ufw`
 * desligado e `iptables` vazio — significaria que qualquer leitura daquele
 * arquivo entrega o banco inteiro, para sempre, sem deixar rastro.
 *
 * Com esta rota a chave nunca sai da Vercel. O pc2 carrega apenas
 * `CCO16_BACKUP_TOKEN`, que:
 *
 * - só serve para LER, e só as tabelas da lista abaixo;
 * - é rotacionável em segundos (`vercel env rm/add`), sem tocar no banco;
 * - se vazar, não dá escrita, não dá DDL e não dá acesso às outras tabelas.
 *
 * É menos poder na mão de quem menos precisa dele — o backup só quer copiar.
 *
 * AUTENTICAÇÃO: `Authorization: Bearer <CCO16_BACKUP_TOKEN>`, mesmo padrão de
 * `/api/cop2026/saude`. Sem a variável, 503: rota de despejo aberta seria a
 * pior superfície do sistema inteiro.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lista fechada. Não aceita nome de tabela vindo do cliente — com parâmetro
 * livre, quem tivesse o token leria qualquer tabela do projeto, inclusive as
 * que nada têm a ver com backup.
 */
const TABELAS = new Set([
  "cop_auditoria_lancamento",
  "cop_evidencia",
  "cop_auditoria_parametro",
  "cop_auditoria_trilha",
  "cop_verificacao_execucao",
  "cop_rotina_execucao",
  "cop_unidade",
  "cop2026_autorizados",
  "cop2026_auditor",
  "usuarios_portal",
  "dejem_escalas",
  "dejem_escalados_opm",
  "dejem_jornadas",
  "dejem_log_presenca",
  "dejem_benchmark_gc",
  /* O ROSTER. Sem ele, restaurar o banco devolve os lançamentos e não devolve
     a quem eles pertencem: `identificarPorRe` deixa de resolver RE → fração e
     todo lançamento novo vira órfão. Ficou de fora da primeira lista. */
  "p4_efetivo",
]);

const PAGINA_MAX = 1000;

/** Comparação de tempo constante: `!==` em token vaza tamanho e prefixo. */
function tokenConfere(enviado: string, esperado: string): boolean {
  if (enviado.length !== esperado.length) return false;
  let d = 0;
  for (let i = 0; i < enviado.length; i++) d |= enviado.charCodeAt(i) ^ esperado.charCodeAt(i);
  return d === 0;
}

export async function GET(req: NextRequest) {
  const esperado = process.env.CCO16_BACKUP_TOKEN;
  if (!esperado) {
    return NextResponse.json(
      { erro: "CCO16_BACKUP_TOKEN não configurado no ambiente." },
      { status: 503 }
    );
  }
  const enviado = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tokenConfere(enviado, esperado)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ erro: "banco indisponível" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;

  // Sem `?tabela=`, devolve o índice — o pc2 descobre o que copiar sem ter a
  // lista embutida do lado dele, que envelheceria em silêncio.
  const tabela = sp.get("tabela");
  if (!tabela) {
    return NextResponse.json(
      { tabelas: [...TABELAS] },
      { headers: { "cache-control": "no-store" } }
    );
  }
  if (!TABELAS.has(tabela)) {
    return NextResponse.json({ erro: "tabela não exportável" }, { status: 404 });
  }

  const inicio = Math.max(0, Number(sp.get("inicio") ?? 0) || 0);
  const tamanho = Math.min(PAGINA_MAX, Number(sp.get("tamanho") ?? PAGINA_MAX) || PAGINA_MAX);

  const { data, count, error } = await createAdminClient()
    .from(tabela)
    .select("*", { count: "exact" })
    .range(inicio, inicio + tamanho - 1);

  if (error) {
    console.error("[backup] leitura falhou:", error.message);
    return NextResponse.json({ erro: "falha na leitura" }, { status: 500 });
  }

  /* NDJSON: uma linha por registro. O arquivo cresce por append e um registro
     corrompido não leva o arquivo inteiro junto, como levaria num JSON só. */
  const corpo = (data ?? []).map((l) => JSON.stringify(l)).join("\n");

  return new Response(corpo + (corpo ? "\n" : ""), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-total": String(count ?? 0),
      "x-devolvidos": String(data?.length ?? 0),
    },
  });
}

/**
 * Registra que uma rotina rodou — mesma porta, mesmo token.
 *
 * Fica aqui, e não numa rota própria com a service key do outro lado, pelo
 * mesmo motivo do GET: quem só precisa anotar "o backup terminou" não precisa
 * de uma chave que ignora RLS. A única escrita autorizada é uma linha em
 * `cop_rotina_execucao`, e nada mais.
 */
export async function POST(req: NextRequest) {
  const esperado = process.env.CCO16_BACKUP_TOKEN;
  if (!esperado) return NextResponse.json({ erro: "não configurado" }, { status: 503 });

  const enviado = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tokenConfere(enviado, esperado)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "json inválido" }, { status: 400 });
  }

  const nome = String(corpo.nome ?? "").trim();
  if (!/^[a-z0-9:_-]{1,60}$/i.test(nome)) {
    return NextResponse.json({ erro: "nome inválido" }, { status: 400 });
  }

  const { error } = await createAdminClient().from("cop_rotina_execucao").insert({
    nome,
    ok: Boolean(corpo.ok),
    detalhe: corpo.detalhe ? String(corpo.detalhe).slice(0, 500) : null,
    duracao_ms: Number.isFinite(Number(corpo.duracao_ms))
      ? Math.round(Number(corpo.duracao_ms))
      : null,
  });

  if (error) {
    console.error("[backup] registro falhou:", error.message);
    return NextResponse.json({ erro: "falha ao registrar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
