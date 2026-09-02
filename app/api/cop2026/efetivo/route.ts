import { type NextRequest, NextResponse } from "next/server";
import { fichaPorRe } from "@/lib/db/cop2026-auditor";
import { normalizarRe } from "@/lib/cop2026-lancamento";

/**
 * RE → ficha nominal, para o formulário de `/cop2026/lancar` preencher sozinho.
 *
 * ROTA PÚBLICA, POR DECISÃO DE COMANDO (Fabricio, 01/09/2026). Ela é o oráculo
 * que `lib/db/cop2026-auditor.ts` descreve no cabeçalho: varrendo `?re=` de
 * 100000 a 999999 se reconstrói o efetivo nominal do Batalhão. Foi decidido
 * aceitar isso em troca da padronização do painel.
 *
 * Se um dia o Comando quiser fechar, o conserto é UMA guarda no topo do
 * handler — o mesmo par de camadas de `briefing-png/route.ts`:
 *
 *     const sessao = await sessaoCop();
 *     if (!sessao) return NextResponse.json({ ficha: null }, { status: 401 });
 *
 * e acrescentar `/api/cop2026/efetivo` a ROTAS_RESTRITAS_COP no proxy. Nada
 * mais muda: o formulário já trata resposta vazia como digitação livre.
 *
 * O que NÃO sai daqui, em nenhuma hipótese: e-mail, fone e situação (que carrega
 * restrição médica/administrativa). Só os três campos que o painel já exibe.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const bruto = req.nextUrl.searchParams.get("re") ?? "";

  // Recusa antes de tocar o banco: sem os 6 dígitos não há consulta possível, e
  // isso corta a maior parte do ruído de quem digita o RE letra a letra.
  const { base } = normalizarRe(bruto);
  if (base.length < 6) {
    return NextResponse.json({ ficha: null }, { status: 400 });
  }

  const ficha = await fichaPorRe(bruto);

  // `no-store`: o roster muda quando a P4 reingere, e uma ficha errada em cache
  // de CDN carimbaria o nome de outra pessoa no lançamento da tropa.
  return NextResponse.json(
    { ficha },
    { headers: { "cache-control": "no-store" } }
  );
}
