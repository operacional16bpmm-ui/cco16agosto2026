#!/bin/bash
# night.sh — o "sono" do Second Brain Vivo. Roda de madrugada (cron 3h) no no
# ocioso (pc2). Digere o dia, poda memoria, avalia e gera o brief.
#
# Filosofia: latencia nao importa de madrugada -> usa Groq (barato), nunca Opus.
# Nunca morre: cada passo do sbv.py e isolado; falha de um nao derruba o resto.
set -uo pipefail
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" --no-use && nvm use --silent default >/dev/null
export PATH="$HOME/.supabase/bin:$HOME/.local/bin:$PATH"
export SBV_BACKEND="${SBV_BACKEND:-groq}"

SBV="${SBV_ROOT:-$HOME/second-brain-vivo}"
LOG="$SBV/logs/night-$(date +%F).log"
cd "$SBV" || exit 1
overall_rc=0

{
  echo "===== SBV night $(date -Is) ====="

  # 1) re-vetoriza o WIKI vivo antes de avaliar (usa o pipeline que ja existe).
  #    Se estiver no pc3, roda o ingest; se nao, so avisa.
  #    O ingest e PRE-REQUISITO, nao o objetivo: sem timeout ele sequestra a noite
  #    inteira e o loop de memoria (decay/eval/brief) nunca roda. Foi o que houve em
  #    08/09/2026 — o ingest travou as 03:00 e as 13h44 seguintes nao produziram nada.
  #    Com teto de 3h a noite continua mesmo que a vetorizacao esteja ruim.
  if [ "${SBV_SKIP_INGEST:-0}" != "1" ] && [ -x "$HOME/rag-backups/ingest-pc3.sh" ]; then
    echo "[night] re-ingest RAG (teto 3h)..."
    RAG_SKIP_EXTRACTION=1 timeout 3h "$HOME/rag-backups/ingest-pc3.sh" 2>&1 | tail -5
    rc=${PIPESTATUS[0]}
    [ "$rc" -ne 0 ] && overall_rc="$rc"
    [ "$rc" -eq 124 ] && echo "[night] ingest estourou 3h — seguindo assim mesmo"
    [ "$rc" -ne 0 ] && [ "$rc" -ne 124 ] && echo "[night] ingest falhou (rc=$rc) — seguindo assim mesmo"
  fi

  # 2) o loop de memoria: reflete -> decai -> avalia -> brief
  python3 "$SBV/sbv.py" night
  rc=$?
  [ "$rc" -ne 0 ] && overall_rc="$rc"

  # 3) se o eval acusou regressao (rc=3) ou RAG fora (rc=2), avisa no Telegram.
  #    (o envio real depende do zap-watcher/bot no pc2 — aqui so deixamos o gancho)
  if [ "$rc" = "3" ]; then
    echo "[night] 🚨 REGRESSAO detectada — ver reports/eval-$(date +%F).md"
    # gancho: notificar. Ex (quando o bot estiver acessivel deste no):
    #   python3 "$SBV/security/notify.py" "SBV: regressao de memoria hoje"
  fi

  # 4) export de continuidade semanal (domingo) — item 5
  if [ "$(date +%u)" = "7" ]; then
    echo "[night] export de continuidade (domingo)..."
    "$SBV/security/export-continuidade.sh" 2>&1 | tail -8
    export_rc=${PIPESTATUS[0]}
    [ "$export_rc" -ne 0 ] && overall_rc="$export_rc"
  fi

  echo "===== SBV night fim (rc=$rc) $(date -Is) ====="
} >>"$LOG" 2>&1

# ecoa o brief no stdout p/ quem rodar a mao
tail -n 40 "$SBV/reports/brief-$(date +%F).md" 2>/dev/null || true
exit "$overall_rc"
