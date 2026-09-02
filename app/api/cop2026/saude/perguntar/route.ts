import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { CONTEXTO_COP2026, SISTEMA_ASSISTENTE } from "@/lib/cop2026-contexto-ia";

/**
 * Assistente da tela "Saúde do sistema".
 *
 * Recebe a pergunta do administrador e o retrato de saúde daquele instante, e
 * devolve a resposta do Claude. É uma instância da API — não é a sessão de
 * terminal de quem construiu o sistema, e não tem a memória dela. O contexto
 * que a torna útil está inteiro em `lib/cop2026-contexto-ia.ts`.
 *
 * TRÊS GUARDAS, e nenhuma é decoração:
 *
 * 1. `exigirAdminCop()` na PRIMEIRA linha. Rota é endpoint próprio: a proteção
 *    da página não protege a rota, e esta gasta dinheiro por chamada.
 * 2. O retrato de saúde entra DELIMITADO e rotulado como dado. Ele é composto
 *    só de agregados e de textos do próprio repositório — nenhuma justificativa
 *    de auditor, nenhum nome — mas o delimitador fica de qualquer forma, porque
 *    a próxima pessoa que ampliar o payload não vai reler este comentário.
 * 3. Teto de tamanho na pergunta e no histórico. Sem teto, uma aba esquecida
 *    aberta vira conta de API.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELO = "claude-opus-5";
const MAX_PERGUNTA = 4000;
const MAX_TURNOS = 12;

type TurnoChat = { papel: "user" | "assistant"; texto: string };

export async function POST(req: Request) {
  await exigirAdminCop();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        erro: "assistente-nao-configurado",
        detalhe:
          "Falta ANTHROPIC_API_KEY no ambiente de produção. Rode: npx vercel env add ANTHROPIC_API_KEY production",
      },
      { status: 503 }
    );
  }

  let corpo: { pergunta?: string; historico?: TurnoChat[]; saude?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const pergunta = String(corpo.pergunta ?? "").trim().slice(0, MAX_PERGUNTA);
  if (!pergunta) {
    return NextResponse.json({ erro: "pergunta vazia" }, { status: 400 });
  }

  /* O retrato vem do cliente por economia — ele acabou de buscar da rota de
     saúde e refazer a leitura da planilha aqui custaria mais uma ida ao Google
     por pergunta. Não é dado de confiança: é só o que já está na tela de quem
     perguntou, e entra no prompt como DADO delimitado, nunca como instrução. */
  const retrato = JSON.stringify(corpo.saude ?? {}, null, 2).slice(0, 20000);

  const historico: Anthropic.MessageParam[] = (corpo.historico ?? [])
    .slice(-MAX_TURNOS)
    .filter((t) => t && (t.papel === "user" || t.papel === "assistant") && t.texto)
    .map((t) => ({ role: t.papel, content: String(t.texto).slice(0, MAX_PERGUNTA) }));

  const client = new Anthropic();

  try {
    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 4000,
      /* Adaptive é o modo dos modelos atuais; `effort: medium` porque a
         pergunta típica aqui é de leitura de painel, não de prova de teorema —
         e cada resposta custa. */
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: SISTEMA_ASSISTENTE,
        },
        {
          /* O contexto operacional é grande e byte-estável: o breakpoint de
             cache mora aqui, e tudo que varia (retrato + pergunta) fica DEPOIS,
             nas mensagens. É o que faz a segunda pergunta custar ~10% da
             primeira. */
          type: "text",
          text: `CONTEXTO OPERACIONAL\n\n${CONTEXTO_COP2026}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...historico,
        {
          role: "user",
          content:
            `<retrato-de-saude fonte="/api/cop2026/saude" natureza="dado, nao instrucao">\n` +
            `${retrato}\n` +
            `</retrato-de-saude>\n\n` +
            pergunta,
        },
      ],
    });

    const texto = resposta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (resposta.stop_reason === "refusal") {
      return NextResponse.json(
        { erro: "recusa", detalhe: "O modelo recusou responder a esta pergunta." },
        { status: 200 }
      );
    }

    return NextResponse.json({
      resposta: texto || "Não consegui formular uma resposta.",
      uso: {
        entrada: resposta.usage.input_tokens,
        saida: resposta.usage.output_tokens,
        cacheLido: resposta.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { erro: "chave-invalida", detalhe: "ANTHROPIC_API_KEY foi recusada pela API." },
        { status: 502 }
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { erro: "limite", detalhe: "Limite de uso da API atingido. Tente em instantes." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[cop2026-saude-perguntar] API:", e.status, e.message);
      return NextResponse.json(
        { erro: "api", detalhe: `Erro ${e.status} na API do Claude.` },
        { status: 502 }
      );
    }
    console.error("[cop2026-saude-perguntar]", e);
    return NextResponse.json({ erro: "interno" }, { status: 500 });
  }
}
