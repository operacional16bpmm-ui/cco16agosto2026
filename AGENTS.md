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

Toda alteração termina em produção, sem perguntar e sem devolver o comando para o Fabricio
copiar. **Fluxo obrigatório ao fechar qualquer mudança — dois comandos:**

```bash
git commit -m "<msg>"     # só os arquivos que VOCÊ tocou, pelo nome
npm run publicar
```

`npm run publicar` (`scripts/publicar.mjs`) faz o resto e **para no primeiro erro**: confere
a árvore e o projeto Vercel, roda `tsc` e os 14 gates, sincroniza com o pc1, publica, e só
diz "PUBLICADO" depois de **ler o próprio commit em `/api/cop2026/versao` na produção** e
conferir que as 5 telas do Comando respondem. Nunca chame `npx vercel --prod` na mão — é
por onde entram as quatro armadilhas abaixo.

**Nada de `git add -A`.** Outras sessões editam este mesmo working tree ao mesmo
tempo; `-A` publica o trabalho pela metade de quem estiver do lado. Adicione
somente os arquivos que você tocou, pelo nome.

## As quatro armadilhas que o `publicar` fecha

1. **DOIS clones, um só histórico.** O trabalho acontece no **pc3**
   (`/home/verti/_workspace/pmesp/portal-cco16`) e no **pc1**
   (`/home/pc1/_workspace/pmesp/portal-cco16`), com sessões diferentes nos dois. Desde
   09/09/2026 existe `origin` (`ssh://pc1/...`) e o pc1 está com
   `receive.denyCurrentBranch=updateInstead` — o push atualiza a árvore de trabalho dele
   junto. Se o push for recusado por non-fast-forward, **o pc1 tem trabalho que você não
   tem**: `git pull --rebase origin master`, confira, publique. Nunca `--force` (em
   09/09/2026 o pc1 tinha o `e5e6b44`, de outra sessão, que um force teria apagado).
2. **DOIS projetos Vercel chamados `portal-cco16`.** O do time `16bpmm` (alias
   `portal-cco16-eta.vercel.app`) e o do time **`avertice`** (alias
   **`portal-cco16.vercel.app`** — o que o Batalhão abre). Publicar no primeiro imprime
   "Ready" e não muda nada para o Comando. O script aborta se o `.vercel/project.json`
   não for `team_aIGPsabZTK6rA7CuUXNKYfJh` / `prj_OmnVH0mUprxpgRiGzoMkVTzKfOvQ`.
3. **A credencial da Vercel só existe no pc1.** O `auth.json` do CLI é um token OAuth de
   vida curta com `refreshToken`: copiar para outro nó funciona até vencer e depois quebra
   calado. Por isso o deploy **sempre roda no pc1** e os outros nós chamam por SSH — o
   script já faz isso sozinho.
4. **Não havia como saber o que estava no ar.** Sem integração de git, a Vercel não registra
   commit nenhum e todo deploy aparece como "CLI". O script carimba o SHA no deploy
   (`vercel -e COP2026_COMMIT=…`) e `/api/cop2026/versao` devolve commit, horário e versão
   do portal. É a fonte para responder "o meu está velho?" sem abrir chamado.

`npm run publicar -- --seco` mostra o que faria sem publicar. `-- --sem-gates` pula `tsc` e
os 14 gates: só para urgência real, e ele avisa em amarelo que pulou.

**`verificar:unidades`** guarda a régua de APRESENTAÇÃO (`lib/cop2026-tendencia.ts`):
como ritmo e contagem de período chegam à tela. Em 03/09/2026 o briefing executivo
anunciou "54 dias restantes" (eram 54 turnos-fração, 27 dias) porque passava
`Painel.turnosRestantes` para a mesma prop em que o dashboard passa
`janela.diasRestantes`; e o ritmo de recuperação saía com `Math.ceil` — 31,67
virava 32, o mesmo número do ritmo-alvo do mês, e a tela mandava acelerar para o
passo já praticado. **Ritmo é taxa: `fmtRitmo`/`fmtPorDia`/`fmtPorTurno`, duas
casas, nunca `Math.ceil`. Contagem de tempo leva o substantivo junto: `fmtDias`
para dias, `fmtTurnos` para turnos-fração.** O teste varre `app/`, `components/`
e `lib/` atrás de quem voltou a formatar por conta própria.

**`verificar:excecoes`** guarda a fonte única de "o que é uma exceção"
(`excecoesPorFracao`, em `lib/cop2026-metricas.ts`). Até 03/09/2026 essa conta
existia escrita três vezes, com respostas diferentes — o briefing anunciava
"8 sem IDs" e mostrava 0 em todas as barras. Se você precisar do número de
exceções em qualquer superfície nova, **chame a função**; não refaça o `filter`.

**`verificar:unidade-declarada`** trava a decisão de 08/09/2026: a fração do
lançamento é a que o **policial declara** no formulário, não a que a relação do
efetivo atribui ao RE. É teste de SÍMBOLO, não de número — voltar a derivar a
fração pelo RE não muda o total de evidências, só o balde, e nenhum gate de
contagem pegaria. O contrário disso está escrito em comentário em três arquivos
(a antiga regra C-4) e parece conserto.

**`verificar:navegacao`** confere que todo atalho da barra da COP
(`components/publico16/cop/barra-cop.tsx`) aponta para uma rota que existe em
disco, e que ela continua sendo montada no `layout.tsx` do módulo. A barra
aparece nas 19 telas: um `href` renomeado ali é 404 para o Batalhão inteiro, e
`<Link href="...">` aceita qualquer string sem reclamar no build.

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

O "Promote to production" que a CLI imprime no fim do deploy é **ruído**, não é sinal de que
ficou preview: `--prod --yes` já sai com `target: production` e move os aliases. Quem responde
de verdade se ficou em produção é `/api/cop2026/versao` — que é o que o `publicar` consulta.

O `npm run build` local **não fecha no pc1** (memória) e não é pré-requisito: quem compila é a
Vercel. Se o build quebrar lá, o erro sai em `npx vercel inspect --logs <url>` — rodado **no
pc1**, que é onde o CLI está autenticado.
