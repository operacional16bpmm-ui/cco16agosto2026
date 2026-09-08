import { type NextRequest, NextResponse } from "next/server";

import { medirSaude } from "@/lib/cop2026-saude";
import { timingSafeEqual } from "node:crypto";

/**
 * SAÚDE DO PAINEL para o vigia externo (pc2).
 *
 * As invariantes moram em `lib/cop2026-saude.ts` e rodam DENTRO do deploy
 * corrente, com as mesmas funções puras que desenham a tela — o que o vigia
 * mede é exatamente o que o Comando vê. Duplicar a lógica no vigia garantiria
 * que as duas leituras divergissem com o tempo.
 *
 * AUTENTICAÇÃO: `Authorization: Bearer <CCO16_SAUDE_TOKEN>`. Sem a variável no
 * ambiente a rota responde 503 — endpoint de diagnóstico aberto é superfície de
 * varredura e de custo (cada chamada lê a planilha).
 */

export const runtime = "nodejs";

/** Igualdade que não vaza o tamanho do prefixo correto pelo tempo. */
function tokenConfere(enviado: string, esperado: string): boolean {
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(req: NextRequest) {
  const esperado = process.env.CCO16_SAUDE_TOKEN;
  if (!esperado) {
    return NextResponse.json(
      { erro: "CCO16_SAUDE_TOKEN não configurado no ambiente." },
      { status: 503 }
    );
  }
  const enviado = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  /* Comparação em tempo constante. O `!==` do V8 sai no primeiro byte
   * diferente, e este endpoint é a única barreira do retrato de saúde — não
   * há cookie por trás dele. Diferença de tempo mensurável é vetor conhecido
   * para descobrir o token byte a byte. `timingSafeEqual` exige buffers do
   * mesmo tamanho, então o comprimento entra na conta explicitamente. */
  if (!tokenConfere(enviado, esperado)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const retrato = await medirSaude();
  return NextResponse.json(retrato, { headers: { "cache-control": "no-store" } });
}
