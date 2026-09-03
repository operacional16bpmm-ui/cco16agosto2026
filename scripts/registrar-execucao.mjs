/**
 * Grava em `cop_rotina_execucao` que uma rotina rodou — e como terminou.
 *
 * Sem isto, a área técnica do admin não tem o que mostrar e o envelhecimento
 * fica invisível: rotina que morre não emite erro, só para de aparecer. Foi
 * assim que as 7 rotinas agendadas do vigia nasceram mortas em agosto sem
 * ninguém notar.
 *
 * Passa por `/api/cop2026/backup` (POST) com o `CCO16_BACKUP_TOKEN`, e não pela
 * service key: anotar "terminei" não justifica carregar uma chave que ignora
 * RLS. Mesma razão do GET da mesma rota.
 *
 *   node scripts/registrar-execucao.mjs <nome> <ok|falha> [detalhe] [duracaoMs]
 *
 * Falha silenciosa por decisão: se o registro não gravar, isso NÃO pode
 * derrubar a esteira nem o backup. Uma linha a menos numa tela custa menos que
 * um deploy ou um dump abortado.
 */
const [, , nome, resultado, detalhe, duracao] = process.argv;

if (!nome || !resultado) {
  console.error("uso: registrar-execucao.mjs <nome> <ok|falha> [detalhe] [duracaoMs]");
  process.exit(2);
}

const BASE = (process.env.CCO16_BACKUP_URL ?? "https://portal-cco16.vercel.app").replace(/\/$/, "");
const TOKEN = process.env.CCO16_BACKUP_TOKEN;

if (!TOKEN) {
  console.warn("[registrar-execucao] sem CCO16_BACKUP_TOKEN — nada gravado.");
  process.exit(0);
}

try {
  const r = await fetch(`${BASE}/api/cop2026/backup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      ok: resultado === "ok",
      detalhe: detalhe || null,
      duracao_ms: Number(duracao) || null,
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  console.log(`[registrar-execucao] ${nome}: ${resultado}`);
} catch (erro) {
  console.warn(`[registrar-execucao] não gravou (${erro.message}) — seguindo assim mesmo.`);
}
