import { NextResponse } from "next/server";

import { VERSAO_PORTAL } from "@/components/publico16/cop/rodape-cop";

export const dynamic = "force-dynamic";

/**
 * QUAL CÓDIGO ESTÁ NO AR — a pergunta que não tinha resposta.
 *
 * Este repositório publica sem integração de git na Vercel (`git remote` só
 * aponta para o pc1), então o painel da Vercel não sabe o commit de nada: os
 * deploys aparecem como "CLI", sem SHA. Descobrir se o conserto de uma hora
 * atrás subiu virava caçar uma frase no HTML, e quando o texto não mudava —
 * uma correção de cor, um gate, um ajuste de proxy — não havia como saber.
 *
 * `scripts/publicar.mjs` passa o SHA e o horário como env do deploy
 * (`vercel -e COP2026_COMMIT=...`), e esta rota devolve os dois. Com isso o
 * próprio script confirma a publicação: ele fica lendo aqui até ver o commit
 * que acabou de mandar, em vez de dizer "pronto" porque o CLI não deu erro.
 *
 * ABERTA de propósito, e declarada como tal em `scripts/verificar-rotas-api.mjs`:
 * devolve metadado de build — commit, horário e número de versão. Nenhum dado
 * de pessoa, de lançamento ou de fração passa por aqui, e saber a versão do
 * portal é o que permite a QUALQUER um do Batalhão dizer "o meu está velho"
 * em vez de abrir chamado sobre um bug já corrigido.
 */
export async function GET() {
  return NextResponse.json(
    {
      commit: process.env.COP2026_COMMIT ?? "desconhecido",
      publicadoEm: process.env.COP2026_PUBLICADO_EM ?? "desconhecido",
      versaoPortal: VERSAO_PORTAL,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
