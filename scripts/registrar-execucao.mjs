/**
 * Grava em `cop_rotina_execucao` que uma rotina rodou — e como terminou.
 *
 * Sem isto, a área técnica do admin não tem o que mostrar e o envelhecimento
 * fica invisível: rotina que morre não emite erro, só para de aparecer. Foi
 * exatamente assim que as 7 rotinas agendadas do vigia nasceram mortas em
 * agosto sem ninguém perceber.
 *
 *   node scripts/registrar-execucao.mjs <nome> <ok|falha> [detalhe] [duracaoMs]
 *
 * Falha silenciosa por decisão: se o registro não puder ser gravado, isso NÃO
 * pode derrubar a esteira nem o backup. O prejuízo de não registrar é uma linha
 * a menos numa tela; o de abortar um deploy ou um dump é bem maior.
 */
const [, , nome, resultado, detalhe, duracao] = process.argv;

if (!nome || !resultado) {
  console.error("uso: registrar-execucao.mjs <nome> <ok|falha> [detalhe] [duracaoMs]");
  process.exit(2);
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !CHAVE) {
  console.warn("[registrar-execucao] sem credencial no ambiente — nada gravado.");
  process.exit(0);
}

const corpo = {
  nome,
  ok: resultado === "ok",
  detalhe: detalhe ? String(detalhe).slice(0, 500) : null,
  duracao_ms: Number.isFinite(Number(duracao)) ? Math.round(Number(duracao)) : null,
};

try {
  const r = await fetch(`${URL_BASE}/rest/v1/cop_rotina_execucao`, {
    method: "POST",
    headers: {
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  console.log(`[registrar-execucao] ${nome}: ${corpo.ok ? "ok" : "falha"}`);
} catch (erro) {
  console.warn(`[registrar-execucao] não gravou (${erro.message}) — seguindo assim mesmo.`);
}
