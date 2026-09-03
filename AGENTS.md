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

# Deploy é automático — não pergunte, não deixe pendente

Este repo **não tem remote git** (`git remote -v` é vazio): nada de push dispara build.
Toda alteração termina em produção, sem perguntar e sem devolver o comando para o Fabricio
copiar. Fluxo obrigatório ao fechar qualquer mudança:

```bash
npx tsc --noEmit \
  && npm run verificar:vocabulario \
  && npm run verificar:dado-pessoal \
  && npm run verificar:periodo \
  && npm run verificar:lancamento \
  && npm run verificar:paridade \
  && npm run verificar:painel \
  && npm run verificar:tendencia \
  && npm run verificar:indices \
  && npm run verificar:excecoes \
  && npm run verificar:seguranca \
  && git commit -m "<msg>" && npx vercel --prod --yes
```

**Nada de `git add -A`.** Outras sessões editam este mesmo working tree ao mesmo
tempo; `-A` publica o trabalho pela metade de quem estiver do lado. Adicione
somente os arquivos que você tocou, pelo nome.

**`verificar:excecoes`** guarda a fonte única de "o que é uma exceção"
(`excecoesPorFracao`, em `lib/cop2026-metricas.ts`). Até 03/09/2026 essa conta
existia escrita três vezes, com respostas diferentes — o briefing anunciava
"8 sem IDs" e mostrava 0 em todas as barras. Se você precisar do número de
exceções em qualquer superfície nova, **chame a função**; não refaça o `filter`.

**`verificar:seguranca`** pergunta, com a chave pública do site, quantas linhas
cada tabela do domínio devolve — todas têm de responder zero. É a rede que teria
pego no primeiro dia as duas tabelas de backup abertas à internet. Riscos aceitos
ficam na constante `RISCO_ACEITO`, com data e autor; sem isso, o teste falha.

**`verificar:painel` é obrigatório** — é a rede que impede o bug de recorte que
o Comando apontou em 02/09/2026 (semanas somando o mês anterior, quinzena com
"4% de participação" no dia 2). Ele acrescenta agosto inteiro à base de
setembro e afirma que **nenhum contador do painel muda**. Se falhar, procure em
`calcularPainel` (ou em quem monta o Painel fora dele) um laço sobre
`lancamentos` que não usa `dados`/`dadosSemFiltroDeSemana` — a leitura tem que
entrar pelo portão `aplicarFiltros`, sempre.

`npx vercel --prod --yes` já sai com `target: production` e move os aliases
(`portal-cco16.vercel.app`). Conferir com `npx vercel inspect <url-do-deploy>` — o
"Promote to production" que a CLI imprime no fim é ruído, não é sinal de que ficou preview.

O `npm run build` local **não fecha no pc1** (memória) e não é pré-requisito: quem compila é a
Vercel. Se o build quebrar lá, o erro sai em `npx vercel inspect --logs <url>`.
