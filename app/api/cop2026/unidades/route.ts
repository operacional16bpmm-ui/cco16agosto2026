import { type NextRequest, NextResponse } from "next/server";

import { opcoesDeBatalhao, opcoesDeFracao } from "@/lib/db/cop2026-unidade";

/**
 * Filhos de uma unidade na árvore Comando → Batalhão → Fração.
 *
 * ROTA PÚBLICA, como o formulário que a consome (`/cop2026/lancar`, aberto à
 * tropa sem login). O que sai daqui é o organograma da Corporação — nome e
 * código de OPM, nada de pessoa: nenhum RE, nome, efetivo ou contagem de
 * lançamento passa por esta porta. É o mesmo dado que qualquer boletim
 * publicado traz.
 *
 * Ela existe para o seletor NÃO carregar a árvore inteira: são 3.708 frações no
 * estado, e o formulário abre no celular da viatura, em 4G. A página entrega
 * montado o caminho desta instalação (CPA/M-5 → 16º BPM/M → frações) e só quem
 * trocar de comando ou de batalhão paga uma consulta.
 *
 * `pai` de 3 dígitos é comando (devolve batalhões); de 5, batalhão (devolve
 * frações). Qualquer outro formato é recusado antes de tocar o banco.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pai = (req.nextUrl.searchParams.get("pai") ?? "").trim();

  if (!/^\d{3}$|^\d{5}$/.test(pai)) {
    return NextResponse.json(
      { opcoes: [], erro: "Informe o código do comando (3 dígitos) ou do batalhão (5)." },
      { status: 400 }
    );
  }

  const opcoes =
    pai.length === 3 ? await opcoesDeBatalhao(pai) : await opcoesDeFracao(pai);

  return NextResponse.json(
    { opcoes },
    // A árvore muda quando o Comando reorganiza uma OPM — raro, mas quando
    // muda o seletor não pode continuar oferecendo fração extinta por um dia.
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
