/**
 * Aviso imediato do relato de indisponibilidade, por Telegram.
 *
 * Bot próprio da COP (o Fabrício optou por um dedicado em 08/09/2026, e não
 * por reaproveitar o `@vigiafb_bot` do vigia doméstico): a plateia aqui é o
 * Batalhão, e misturar alarme de casa com alarme de serviço acaba com os dois
 * sendo ignorados.
 *
 * Configuração — duas variáveis de ambiente no servidor:
 *
 *   COP_TELEGRAM_BOT_TOKEN   token do @BotFather
 *   COP_TELEGRAM_CHAT_ID     id do grupo/canal que recebe (pode ser negativo)
 *
 * SEM AS DUAS, ISTO NÃO É ERRO: `avisar` devolve `configurado: false` e o
 * relato segue gravado. O aviso é reforço do registro, nunca condição dele —
 * um portal que recusa o relato porque o Telegram caiu reproduz exatamente o
 * problema que o módulo existe para resolver.
 *
 * ⚠️ E o inverso também vale, que é a lição de todo alarme que não chega: a
 * falha de envio **não pode ser silenciosa**. `avisar` devolve o que houve, e
 * quem chama é obrigado a repassar isso para a tela — o relator precisa saber
 * se o aviso automático saiu ou se ele ainda tem de comunicar por outro meio.
 */

export type ResultadoAviso =
  | { configurado: false }
  | { configurado: true; enviado: true }
  | { configurado: true; enviado: false; motivo: string };

const TEMPO_LIMITE_MS = 4_000;

export function telegramConfigurado(): boolean {
  return Boolean(process.env.COP_TELEGRAM_BOT_TOKEN && process.env.COP_TELEGRAM_CHAT_ID);
}

/** Escapa o mínimo para o modo HTML do Telegram. */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function avisar(texto: string): Promise<ResultadoAviso> {
  const token = process.env.COP_TELEGRAM_BOT_TOKEN;
  const chat = process.env.COP_TELEGRAM_CHAT_ID;
  if (!token || !chat) return { configurado: false };

  /* Teto de 4s e não o default da plataforma: esta chamada está no caminho do
     POST do formulário, e o policial está esperando na tela. Aviso que demora
     mais que isso vale menos que a resposta rápida — e o relato já está
     gravado quando chegamos aqui. */
  const corte = AbortSignal.timeout(TEMPO_LIMITE_MS);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: texto,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: corte,
      cache: "no-store",
    });
    if (!r.ok) {
      /* O corpo do erro do Telegram diz o que houve ("chat not found", "bot was
         blocked") e é isso que resolve o problema — status 400 sozinho manda
         quem for depurar adivinhar. */
      const corpo = await r.text().catch(() => "");
      return {
        configurado: true,
        enviado: false,
        motivo: `Telegram respondeu ${r.status}${corpo ? `: ${corpo.slice(0, 180)}` : ""}`,
      };
    }
    return { configurado: true, enviado: true };
  } catch (e) {
    return {
      configurado: true,
      enviado: false,
      motivo: e instanceof Error ? e.message : "falha de rede",
    };
  }
}

/** A mensagem do relato, pronta para o grupo. */
export function textoDoRelato(r: {
  subunidadeRotulo: string;
  inicioEm: string;
  fimEm: string | null;
  abrangenciaRotulo: string;
  efeitosRotulo: string;
  re: string;
  nome: string;
  descricao: string | null;
  horasAteAvisar: number;
  url: string;
}): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const linhas = [
    "🔴 <b>COP FORA DO AR — relato de fração</b>",
    "",
    `<b>Fração:</b> ${esc(r.subunidadeRotulo)}`,
    `<b>Início:</b> ${fmt(r.inicioEm)}`,
    r.fimEm ? `<b>Normalizou:</b> ${fmt(r.fimEm)}` : "<b>Situação:</b> ainda em curso",
    `<b>Alcance:</b> ${esc(r.abrangenciaRotulo)}`,
    `<b>O que parou:</b> ${esc(r.efeitosRotulo)}`,
    "",
    `<b>Relatou:</b> ${esc(r.nome)} — RE ${esc(r.re)}`,
    `<b>Avisou em:</b> ${r.horasAteAvisar <= 1 ? "menos de 1h" : `${r.horasAteAvisar}h`} após o início`,
  ];
  if (r.descricao?.trim()) linhas.push("", `<i>${esc(r.descricao.trim())}</i>`);
  linhas.push("", r.url);
  return linhas.join("\n");
}
