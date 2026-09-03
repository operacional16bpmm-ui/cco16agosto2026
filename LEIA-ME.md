# portal-cco16 — Auditoria & Governança das COP do 16º BPM/M

Portal do Batalhão na Vercel (Next 16 + Supabase), team **avertice**
(`prj_OmnVH0mUprxpgRiGzoMkVTzKfOvQ`). A página pública `/cop2026` é o destino do
QR Code da tropa; o resto fica atrás de login Google + lista de autorizados.

---

## O que foi feito em 31/08/2026 — Quadro 08 da Diretriz em Foco

### O pedido

O bloco **Registro Operacional · Governança da Auditoria de COP** terminava no
ponto 07. O Comando pediu a posição das frações **dentro do próprio bloco**, como
oitavo quadro — quem lê os pontos normativos vê, no mesmo fôlego, onde a sua
companhia está.

### O que entrou

`components/publico16/cop/quadro-ranking-cias.tsx` — o quadro 08, com a casca dos
sete anteriores: mesma moldura `#1d2c46`, número em `#e5d332`, Cinzel no título,
IBM Plex Mono nos números, foto sob gradiente. O que muda é só o miolo: no lugar
da frase normativa, as seis frações ordenadas por cumprimento, a barra de cada
uma, o `feito/meta`, o que falta e o percentual do Batalhão no canto.

As cores das barras **não** são as `--sinal-*` de `globals.css`: aquelas foram
calibradas para o branco do dashboard (`#1c7a4a`, `#b3261e`) e somem sobre o azul
do bloco. A régua é a mesma (azul >100%, verde 80–100%, âmbar 50–80%, vermelho
<50%), com a luminosidade corrigida para fundo escuro.

### Duas decisões que valem a leitura

**Entra por slot, não por prop de dados.** `DiretrizEmFoco` recebe `quadro8?:
ReactNode`. O motivo é o briefing: ele é `"use client"` e também renderiza o
bloco, então um import de `lib/cop2026-leitura` (que usa `after` do next/server)
lá dentro derrubaria o build inteiro. Quem tem servidor passa o quadro pronto;
quem não tem, mostra os sete quadros normativos e nada mais.

**A frase de fecho aponta a última colocada, não a de maior déficit** — é a regra
do espelho público do hero (`ranking-fracoes-publico`). Dois blocos da mesma
página cobrando frações diferentes na mesma frase seria contradição na cara do
Comando.

Os números saem de `calcularPainel` com **`filtrosDoMesCorrente()`**, o mesmo
recorte padrão do Dashboard — e não com `FILTROS_VAZIOS`, que era o que estava
aqui até 01/09/2026 e somava agosto com setembro contra uma meta mensal: no
primeiro dia de setembro o quadro exibia os 627/960 de agosto como "posição na
meta do mês", com a Força Tática em 202%. Mês recém-aberto agora mostra as seis
frações em 0% e uma linha dizendo que o mês começou — sem numerar colocação
entre seis zeros. Tudo dentro de `<Suspense>` próprio: os sete quadros
normativos chegam na hora e só
este espera o Google. A leitura não custa uma segunda ida à planilha —
`lerAuditoriaCop2026` serve do retrato em memória, compartilhado com o espelho do
hero e o bloco da planilha.

### Conferido em produção

Deployment `portal-cco16-dnk7mfku7`, alias `portal-cco16.vercel.app`. Quadros 01
a 08 na página, o espelho branco do hero intacto, e o quadro 08 batendo com o
painel: 64,2% do Batalhão, FT 289/147 (meta batida), EM 36/48, 1ª 84/195, 4ª
74/180, 3ª 72/210, 2ª 61/180.

> **Nota de fonte.** A cópia viva do portal é **esta**, em
> `pc1:/home/pc1/_workspace/pmesp/portal-cco16`. A pasta `pc3:~/deploy-cco16`
> ficou para trás: não tem o `ranking-fracoes-publico` que está no ar desde hoje,
> e publicar de lá apaga o espelho do hero.

---

## O que foi feito em 31/08/2026 — Caixa TENDÊNCIA (v3)

### O problema

O painel exibia **"ritmo necessário: 73"** ao lado de **"faltam 415 evidências em
12 turnos"**. As duas informações não conversavam: 415 ÷ 12 = **34,6**.

O 73 e o 12 não eram conta errada — eram **constantes escritas à mão** em
`lib/cop2026.ts` (`RITMO_GLOBAL_RESTANTE` e `TURNOS_RESTANTES_GLOBAL`),
congeladas numa data anterior. Foram removidas do código em 03/09/2026. E o próprio `docs/cop2026-padroes-comando.md` §4,
homologado pelo Major em 28/08, já mandava esses números virem do cálculo,
*"nunca hardcoded"*. O código descumpria uma regra que já existia.

### Três defeitos que só aparecem no código

1. **O relógio só andava quando a tropa trabalhava.** `turnosCumpridos` era o
   número de *dias com lançamento*. Fração parada três semanas → o sistema
   entendia que o mês mal começou → o ritmo exigido **caía**. O painel premiava
   a inércia. Era também a origem do absurdo "Turnos cumpridos: 18 de 15".
2. **`turnosPrevistos` misturava unidades** — o piso de 15 é a escala 12x36 do
   *auditor*, não o turno de serviço da *fração*.
3. **O dia 5 era julgado como se fosse o dia 30**, então 31% no início do mês já
   pintava a Companhia de FAIXA CRÍTICA.

### O que foi construído

`lib/cop2026-tendencia.ts` — motor puro, sem dependência de React ou de I/O,
com **16 verificações automatizadas** (`scripts/verificar-*.mjs`, rodam com
`node --test`).

| Indicador | Fórmula | Origem |
|---|---|---|
| 🟦 Ritmo-alvo | `meta ÷ turnos do mês` | Maj PM, 30/08 |
| 🟧 Ritmo real | `produzido ÷ turnos decorridos` | Maj PM, 30/08 |
| 🔴 Ritmo de recuperação | `falta ÷ turnos restantes` | Maj PM, 30/08 |
| Saldo de trajetória | `realizado − meta acumulada` | Maj PM, 30/08 |
| Aderência à trajetória | `realizado ÷ meta acumulada` | Maj PM, 30/08 |
| Projeção de fechamento | `ritmo real × turnos do mês` | "vira preditivo", 30/08 |
| Pressão de recuperação | `recuperação ÷ alvo` | §8 do material |
| Equilíbrio de produção | CV das aderências | §5 — FT × Companhias |
| Regularidade | Gini das semanas | Red Team — lote |
| Dispersão (IDA) | `lançaram ÷ efetivo`, mês e quinzena | Red Team — efeito carona |
| Prioridade de ação | pela aderência | §4, "onde agir" |
| Capacidade excedente | `max(0, saldo)` | §6, "quem sustenta" |

**Unidades** (decisão de 31/08): fração mede por **turno** — 2 por dia,
inclusive o Estado-Maior, que cobre dia e tarde por **DEJEM**; o Batalhão mede
por **dia**. Somar turnos de frações distintas num denominador só foi vetado
pelo Major (`960 ÷ 360 = 2,67`).

**Calendário**: automático. 60 turnos por fração em mês de 30 dias, 62 em mês de
31 — fevereiro bissexto sai certo sem ninguém tocar.

### Onde vive

> **Desatualizado desde 01/09/2026** — a V3 virou o painel único e mudou de
> endereço para `/cop2026/dashboard`. Ver a última seção deste arquivo.

- `/cop2026/dashboard/v3` — caixa TENDÊNCIA dentro do velocímetro (no lugar do
  cartão do 73) e o detalhamento por fração entre a barra-resumo e a camada
  semanal;
- `/cop2026` — espelho público do ranking por fração no hero, ordenado por
  desempenho (pedido do Comando: senso de urgência e competição).

### O painel de produção NÃO mudou

Toda a diferença vive em **props opcionais** — `tendencia`, `cartaoRitmo`,
`auditoresPorQuinzena`. Sem elas, `/cop2026/dashboard` percorre exatamente o
mesmo caminho de código de antes. A faixa de cor continua vindo de
`nivelPorCumprimento`, fonte única do §2. Backups dos arquivos compartilhados em
`/tmp/graficos.bak`, `/tmp/dashboard.bak` e `/tmp/landing.bak`.

### O que foi recusado, e por quê

O material trazia três pedidos que partem de premissa falsa — a de que o app
**recebe** os lançamentos. Ele não recebe: a tropa lança no **Google Forms** e o
portal apenas **lê** a planilha publicada.

- **Tabela `audit_logs` com hash SHA-256** — não há onde assinar;
- **Middleware bloqueando lançamento em lote** — não há submissão para barrar;
- **Redis / CQRS** — não há volume que justifique.

O que cabe é **sinalizar** (o ⚠ de lote está implementado). Implementar aquilo
significa trocar o Forms por formulário próprio com banco, refazendo o fluxo já
validado ponta a ponta com a tropa.

As **metas publicadas** (48/195/180/210/180/147) ficaram como estão: já somam
**960 exatos**. O Red Team apontou "deriva de arredondamento" que não existe — o
que soma 99,93% é o percentual do rótulo, não a meta. `ratearMeta` (método do
maior resto) existe para o dia em que os pesos mudarem.

---

## Layout responsivo — 31/08/2026

O painel da v3 abria com **1400px de largura numa tela de 375px**. A causa não
estava no CSS de nenhum cartão:

`app/(public)/cop2026/dashboard/v3/page.tsx` embrulhava o painel num
`<main className="flex flex-col gap-6">`. Num container **flex-column**, as
margens automáticas do filho no eixo cruzado — o `mx-auto` do
`div.mx-auto.max-w-[1400px]` — **cancelam o `align-self: stretch`** (CSS Flexbox
§9.4.11). O bloco deixa de valer a largura do pai e passa a `fit-content`, que
cresce até o **min-content**; o `max-w-[1400px]` virou, na prática, `width`.
A produção sempre usou `<main className="pt-4 sm:pt-6">`; a v3 voltou a ser
igual.

Com isso resolvido, apareceu o segundo estouro: `<CaixaTendencia>` entra como
**item de grid** com `overflow: visible`, então seu `min-width: auto` vale o
min-content dela — as tabelas de `min-w-[1080px]`. A trilha do grid ia a 1261px.
O irmão do lado já carregava `min-w-0` pelo mesmo motivo; o envoltório da caixa
passou a carregar também.

### O que mais estava quebrado (valia para a produção junto)

| Onde | Sintoma medido | Correção |
|---|---|---|
| Barra de filtros, celular | gatilho da busca (281px, `shrink-0`) esmagava o carrossel de semanas a **0px** e empurrava "Filtros" **19px para fora da tela** | duas linhas: busca + gaveta em cima, semanas embaixo com sangria até a borda |
| Barra de filtros, desktop | em 1440px o único item flexível era a busca, e o rótulo quebrava em **quatro linhas** | `flex-wrap` na linha; quem não cabe desce inteiro em vez de ser comprimido |
| Faixa de situação, celular | `ml-[18%] w-[82%]` deixava ~150px de coluna e o título saía em **nove linhas** | empilha e usa a largura toda até `sm`; o recuo percentual volta a partir daí |
| Botão de exportar PNG | `lg:right-[-70px]` só cabe acima de ~1535px de viewport; abaixo disso criava **rolagem horizontal (38px em 1440)** | deslocamento igual ao padding do container (14/20px) e os −70px só a partir de 1560px |
| Botão de exportar PNG | `z-30` empatava com a barra grudada e, por vir depois no DOM, **cobria o botão "Filtros"** ao rolar | `z-20` |

Medição final, com `document.documentElement.scrollWidth`: **375 de 375** no
celular e **1425 de 1425** no desktop — zero rolagem horizontal nos dois.

`PaletaComando` ganhou uma prop `className` opcional. O `w-full` do gatilho é
decisão de quem chama: na v2 ela é filha direta de uma linha flex, e ali
`w-full` valeria 100% do **container**, comendo a linha inteira.

---

## Armadilhas de operação

**IPv6 quebrado no provedor.** Falha em 0,015 s; o `curl` funcionava porque caía
no IPv4, mas o Node tenta IPv6 primeiro e devolve `fetch failed` em todo deploy.
Sempre:

    export NODE_OPTIONS="--dns-result-order=ipv4first"

**Nunca `--archive=tgz`.** Ele anula a deduplicação da Vercel e sobe **63,8 MB**
num tarball; sem ele sobem só os arquivos alterados — **382 KB**.

**Laço de deploy precisa de teto por tentativa.** A rede *pendura* a conexão sem
devolver erro, e o laço fica preso para sempre. Use `timeout 200` em cada
tentativa. E `pkill` comum não mata os laços: precisa de `-9`.

**Build local falha por rede**, não por código: `next/font` tenta baixar o
Poppins do Google. O build que vale é o da Vercel.

**Escopo do CLI:** `--scope avertice`. Sem ele, "Not authorized" mesmo com token
válido. O MCP da Vercel só enxerga o team `16bpmm/OCC`, que é o projeto errado.

---

## Como verificar

    node --test scripts/verificar-tendencia-cop.mjs scripts/verificar-indices-cop.mjs
    npx tsc --noEmit -p tsconfig.json

---

## 31/08/2026, à tarde — a V3 ficou legível (e o `robots.txt` voltou a existir)

Pedido do Fabricio: *"preciso desses dados mais organizados visualmente, algo mais
didático e comparativo, obedecendo rigorosamente os princípios já existentes"* —
apontando o bloco `63,5% / Alvo / Real / Recuperação / Trajetória / faixas`.

### O diagnóstico

O cartão TENDÊNCIA empilhava **cinco grandezas heterogêneas em 130 px**: três
ritmos, um saldo e um percentual, sem hierarquia e sem escala comum.

- `Alvo 30,97/dia` e `Real 20,33/dia` eram dois números soltos — a razão entre
  eles, que é a leitura que importa, ficava por conta da cabeça do leitor.
- `Recuperação 350,00/dia` na mesma escala visual dos outros dois **parecia erro
  de conta**. Não é: é o déficit inteiro espremido no único dia que resta.
- `Trajetória −319 65,7%` no rodapé, sem dizer o que cada número era.

### O que mudou (só na V3 — `/cop2026/dashboard` segue intocado)

| Peça | Antes | Agora |
|---|---|---|
| `v3/cartao-trajetoria.tsx` | *(não existia)* | A aderência (**65,7%**) vira o par do cumprimento (**63,5%**) — as duas réguas ortogonais do §2 lado a lado, com selo, base de cálculo e saldo visíveis |
| `v3/faixa-ritmos.tsx` | *(não existia)* | Alvo e Real na **mesma régua**: o alvo ocupa a barra inteira, o real ocupa a fração correspondente e o vazio ao fim é o que falta por dia. A recuperação sai da comparação e ganha a **pressão** (11,3× o normal) |
| `v3/caixa-ritmos.tsx` | 3 ritmos + saldo + % num cartão | **Removido** — o conteúdo foi para as duas peças acima |
| Régua de faixas | 4 cartões, o ativo pintado | O ativo passa a marcar `▲ leitura atual 63,5%` |
| Faixa preta do topo | *"os 15 turnos previstos já foram cumpridos"* — com um dia de mês por correr | Conta o **calendário**: *"faltam 350 evidências em 1 dia"* |
| Torre de controle (16 colunas) | parede de números | Agrupada por pergunta: **Produção** (quanto foi feito) · **Ritmo por turno** (em que passo) · **Trajetória** (está no prazo?) · **Governança** (quem auditou) · **Ação**. `SITUAÇÃO` mudou para o lado dos números que ela classifica |
| `COR_TRAJETORIA` | mapa de cor dentro do componente | Passou para `lib/cop2026-tendencia.ts`, junto do rótulo e do subtítulo |

Cabeçalho de grupo é **cinza de propósito**: no painel, cor é classificação
(§2) — pintar um grupo de verde sugeriria conformidade onde há só um rótulo de
seção.

Motor de cálculo **intocado**, nenhuma faixa reclassificada, e toda a diferença
continua vivendo em props opcionais (`tendencia`, `faixaRitmos`, `marcaPosicao`).

### O achado do dia: o `/robots.txt` nunca existiu de fato

O fix do preview de link do WhatsApp (feito de manhã) tirou a meta `noindex` da
`/cop2026`, porque **o crawler do WhatsApp respeita `noindex` e recusa gerar o
cartão**. A proteção contra buscador passou a depender do `robots.txt`.

Só que o `matcher` do `proxy.ts` não excluía `robots.txt`: o arquivo caía no
fail-closed do middleware e respondia **307 para o `/login`**. Medido nos três
deployments no ar. Ou seja: `app/robots.ts` era **código morto** e a landing
ficou indexável sem nada segurando o Google. Corrigido em `65a6efc`.

### Armadilhas confirmadas nesta rodada

- **`Error: fetch failed` do CLI nem sempre é o build morrendo.** Duas vezes o
  CLI perdeu o *streaming* de log e imprimiu o erro enquanto o build seguia e
  terminava **Ready** no servidor. O estado real vem da API (`vercel ls` /
  `vercel inspect`), nunca do exit code do CLI.
- **`--prod` não garante o alias.** Deployments ficaram `Ready` em *Production*
  enquanto `portal-cco16.vercel.app` continuava servindo um deploy velho — sem o
  ranking público e sem a V3 nova. Depois de todo deploy, **conferir o alias** e
  promover (`vercel promote <url> --scope avertice`).
- **`pkill -f 'PORT=3999'` mata a própria sessão SSH**, porque o padrão casa com
  a linha de comando do shell remoto. Usar `fuser -k 3999/tcp`.
- **A fonte da V3 é o `pc1`**, não o pc3: `~/deploy-cco16` do pc3 tem a V3 antiga
  (323 linhas) e o `app/robots.ts`; o pc1 tem a V3 nova, o ranking público e
  agora também o `robots.ts`. As duas linhas foram reunidas aqui.

## Responsividade da V3 e as armadilhas de publicação — 31/08/2026 (tarde)

### O painel abria com 1400px numa tela de 390px

Medido antes: `documentElement.clientWidth` **390** contra `scrollWidth` **1402** —
**1012px de rolagem horizontal**. Depois: **390 de 390**, zero elementos culpados. No
desktop, de 4px para **1425 de 1425**.

A causa não estava no CSS de nenhum cartão. A página da V3 embrulhava o painel num
`<main className="flex flex-col gap-6">`; num container **flex-column** as margens
automáticas do filho no eixo cruzado — o `mx-auto` do `div.max-w-[1400px]` — **cancelam o
`align-self: stretch`** (CSS Flexbox §9.4.11). O bloco vira `fit-content`, que cresce até o
min-content das tabelas, e o `max-w` passa a valer como `width`. O contrato completo das
três regras está no cabeçalho de `components/publico16/cop/dashboard-cop.tsx`.

Esse conserto já existia no commit `b0abbc6`, mas numa **linha de git divergente** que
nunca foi publicada — veio para cá por `git cherry-pick -x`.

### O cabeçalho ocupava a tela inteira do celular

Segundo defeito, de organização e não de estouro: o `<header>` media **822px numa tela de
844px**. Brasão (226px), bloco tipográfico (241px) e selo COP (192px) empilhavam em coluna
com tamanho quase de desktop — a primeira tela do Comando era papel timbrado, sem um único
indicador.

Agora o container é `grid grid-cols-2` no breakpoint base: os dois emblemas dividem a
primeira linha (`order-1` e `order-2`, reduzidos a `w-28`/`w-32`) e o título desce inteiro
(`order-3 col-span-2`). **Cabeçalho: 822px → 534px.** Todo o `md:` foi preservado
(`md:grid-cols-[220px_minmax(0,1fr)_220px]`, `md:order-none`, `md:col-span-1`), então o
desktop é byte a byte o mesmo — conferido no ar: grade `220px 584px 220px` intacta.

> O `<header>` é **compartilhado** com `/cop2026/dashboard`. A melhora vale para as duas
> rotas, no mesmo critério do `b0abbc6`, que também corrigiu layout de produção de propósito.

### Publicar: o que trava e como destravar

1. **`git remote` para caminho de disco quebra o deploy.** O CLI lê os remotes para montar
   o metadado de Git e `/mnt/hd1/...` não é URL de provedor. Remover antes de publicar.
2. **`missing_files` prende UM arquivo para sempre.** Upload cortado deixa o SHA-1 daquele
   arquivo envenenado no blob store: o CLI anuncia, a API nega, reenvia, nega de novo.
   Retry nunca resolve. Ache o culpado com
   `find . -type f -not -path './node_modules/*' -print0 | xargs -0 sha1sum | grep '^<sha>'`
   e **mude os bytes** do arquivo — SHA novo, entrada podre fora do caminho.
3. **O CLI mente:** `exit 0` com falha, `Internal Server Error` e `fetch failed` genéricos.
   Só `--debug` mostra a resposta crua da API. E `fetch failed` **não** é o IPv6 até prova
   em contrário: testar com `node -e "fetch('https://api.vercel.com/v2/user')"`.
4. **Destacar o deploy do SSH com `setsid`.** O Tailscale perde a rota direta com o pc1 e
   cai para relay DERP; cada `Connection reset by peer` matava o build junto.
5. **Conferir se outra sessão está publicando:** `ps -eo pid,etime,cmd | grep vercel` e
   `readlink /proc/<pid>/cwd`. Em 31/08 havia dois órfãos, um deles publicando código velho.

---

## 31/08/2026, à noite — não era a rede, era a máquina sem fôlego

### O que a medição mostrou

O diagnóstico anterior culpou o relay DERP. A medição desta noite desmente: a rota
com o pc1 estava **direta e a 13 ms** (`191.231.255.208:1055`), e o pc3 a 30 ms pelo
mesmo IP público. O Wi-Fi da casa entregou **30 de 30 pacotes ao gateway, 1 ms, 0% de
perda**. O que parecia link morrendo era o pc1 **sem fôlego**:

    load average: 4,10   em 4 cores
    Mem: 15Gi total | 8,9Gi usados | 587Mi livres
    Swap: 3,0Gi JÁ EM USO

    fclones       96,8% CPU  há 1h53
    llama-server   149% CPU
    mount.ntfs-3g  7,2% CPU  há 6h35

Um build do Next pede de 2 a 4 GB. Com 587 MB livres e 3 GB já em swap, ele entra em
thrash — e como o build roda dentro do SSH, a tela mostra "link caiu". O link não caiu.
A máquina engasgou. Depois de matar o `fclones` e o `llama-server` sair de cena
(era filho temporário do `ollama serve`, não um processo fixo), sobraram **9,9 GB
disponíveis** e a carga caiu para **1,62**. O deploy seguinte fechou na **primeira
tentativa**.

### O que ficou consertado

**`_scripts/deploy-cco16.sh`** — publica com `setsid`, teto de 200 s por tentativa,
`ipv4first`, `flock` contra órfãos, `pkill -9` nos laços de sessões mortas, e no fim
confere o estado **pela API** (`vercel ls` + `inspect`), nunca pelo exit code. Usa a
CLI local em `node_modules/.bin/vercel`, **não** `npx vercel@latest`: o npx baixa a CLI
pela rede a cada tentativa e acrescenta mais um ponto de falha. Chamada:

    ssh pc1 'setsid nohup bash /home/pc1/_workspace/_scripts/deploy-cco16.sh \
      </dev/null >/dev/null 2>&1 &'
    # acompanhar: tail -f /tmp/deploy-cco16-atual.log

**A esteira parou de competir com o build.** `memoria-archiver` e `memoria-worker`
ganharam drop-ins com `Nice=19` e `IOSchedulingClass=idle` — eram os donos do `ffmpeg`
que aparecia a 89% de CPU. O `memoria-receiver` ficou em prioridade normal de propósito:
é HTTPS e precisa responder rápido.

### Armadilha nova: `pkill -f` mata o próprio comando

`ssh pc1 "pkill -f fclones"` derruba a própria sessão — a linha de comando do shell
remoto contém a palavra `fclones` e casa com o padrão. A conexão morre e parece falha
de rede. Use `pkill -x fclones` (nome exato do executável) ou `pkill -f 'fclo[n]es'`.

### Conferido em produção

Deployment `portal-cco16-ieh3m93js`, criado 19:39:56, `● Ready`, **aliased** para
`portal-cco16.vercel.app`, que responde **HTTP 200 em 0,55 s**. Publica o commit
`8d79c8c` — que estava commitado às 19:17 e **nunca tinha ido ao ar**: o deploy no
alias era o `co4jtbn5s`, das 19:12, cinco minutos anterior ao commit.

---

## 01/09/2026 — painel único, e a planilha saiu da página aberta

### Três painéis no ar para o mesmo dado

A varredura de `/cop2026` encontrou **três dashboards vivos**: o V1 na URL limpa
(`/cop2026/dashboard`), o V2 de prévia de layout e o V3 do ciclo. O menu interno, o
briefing (`?excecao=`) e o cabeçalho do admin apontavam para o **V1**; o botão do hero e
o card do Acesso Rápido apontavam para o **V3**. O Comando clicava em "Dashboard" e caía
numa versão diferente da que o botão da home entregava — com Caixa Tendência num lado e
o cartão do 73 no outro.

**O V3 assumiu `/cop2026/dashboard`.** O corpo de `dashboard/v3/page.tsx` virou o
`dashboard/page.tsx`; as rotas `/v2` e `/v3` e os componentes `cop/v2/*` foram apagados.
Os dois endereços versionados viraram **redirect permanente** em `next.config.ts` — o
Next repassa a query sozinho, então `?excecao=`, `?semana=` e `?briefing=1` de link
salvo continuam abrindo. `components/publico16/cop/v3/` virou `cop/ciclo/`: pasta com
nome de versão, sem versão nenhuma para distinguir, só confunde.

`/api/cop2026/briefing-png` passou a abrir `/cop2026/dashboard?briefing=1` direto, sem
salto de redirect no Chromium headless.

### A planilha saiu de toda página aberta

O Google Sheets aparecia **duas vezes no hub público** (botão "Abrir a planilha" e card
"Planilha de Controle") e mais uma no menu do módulo, em toda tela. Agora vive só dentro
do **Relatório de Dados do mês** (`/cop2026/relatorios/<mes>/dados`, botão "Abrir no
Google Sheets"), que é onde ela tem contexto. Ficou no hub apenas o carimbo *"leitura de
HH:MM"* — dizer de quando é o número é informação, não link. O card vago do Acesso
Rápido virou **Relatórios Mensais**, que é para onde quem procurava a planilha deve ir.
Com isso o menu do módulo perdeu o último link externo, e as duas ramificações
`externo ? <a> : <Link>` (desktop e gaveta) foram colapsadas.

### Inconsistências corrigidas na mesma passada

| O que estava errado | Onde |
|---|---|
| `tituloPagina` era **prop morta**: oito páginas passavam um título e o cabeçalho nunca desenhava | `cop/navegacao-cop.tsx` |
| Card do **Briefing sem selo "Restrito"**, embora exija a mesma conta Google dos outros | `acesso-rapido.tsx` |
| Pastilha fixa **"Faixa de Atenção da Meta"** — classificação cravada, contra a fonte única do §2; dizia "atenção" com a meta em superação | `acesso-rapido.tsx` |
| Rodapé do hub citava só "Dashboard e Briefing" como restritos — **Relatórios** também é, e é o botão vermelho do cabeçalho | `cop2026/page.tsx` |
| Nota final mandava corrigir lançamento "na aba Parametros" da planilha — hoje isso é `/cop2026/admin/*` no próprio portal | `cop2026/page.tsx` |
| Imports mortos (`ShieldCheck`, `BookOpen`, `ChevronRight`, `Home`, `FileSpreadsheet`, `ExternalLink`) | `acesso-rapido.tsx`, `navegacao-cop.tsx` |

**Um item foi recusado.** Os dois botões-vitrine do cabeçalho ("Calendário de eventos" e
"Página do 16º BPM/M") chegaram a virar link para `/16bpmm` e `/16bpmm/calendario`, que
respondem 200. O Fabrício mandou tirar no mesmo dia: quem chega pelo QR Code da tropa vem
lançar auditoria e não pode ser desviado da página. Voltaram a `<span aria-disabled>` — é
decisão, não esquecimento. **Não repor o href.**

### Como conferir

    for r in /cop2026 /cop2026/dashboard /cop2026/dashboard/v2 /cop2026/dashboard/v3 \
             /cop2026/briefing /cop2026/relatorios /cop2026/lancar; do
      printf "%-34s " "$r"
      curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://portal-cco16.vercel.app$r"
    done

`/v2` e `/v3` em **308** para `/cop2026/dashboard`; `/cop2026/dashboard`, `/briefing` e
`/relatorios` em **307** para o login; `/cop2026` e `/cop2026/lancar` em **200**. E o hub
não pode mais servir o endereço do Sheets:

    curl -s https://portal-cco16.vercel.app/cop2026 | grep -c docs.google.com   # 0
