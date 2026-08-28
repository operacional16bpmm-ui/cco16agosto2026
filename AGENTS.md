<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# COP 2026 — leia antes de mexer em texto ou em faixa de cor

O painel de `/cop2026` tem vocabulário e faixas de classificação **fixados pelo Comando**,
não escolhidos pelo time. Termos como "sala de controle operacional", "câmeras portáteis",
"manômetro" e "em atingimento" foram **vetados** e não podem voltar; a classificação por
faixa (crítica / atenção / conformidade / superação) tem fonte única em
`lib/cop2026-metricas.ts` e nenhum componente deve reclassificar por conta própria.

Requisitos e o porquê de cada um: **`docs/cop2026-padroes-comando.md`**.
