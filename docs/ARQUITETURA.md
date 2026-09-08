# Portal CCO-16 — Arquitetura do sistema de Auditoria de COP 2026

Documento técnico de referência. Escrito para quem vai **auditar** este sistema sem ter
participado da construção: o que existe, por que existe assim, o que está protegido, o que é
risco assumido e o que ainda está aberto.

Complementa, e não substitui:

| Documento | O que responde |
|---|---|
| `docs/cop2026-padroes-comando.md` | **regras de negócio** fixadas pelo Comando — vocabulário, faixas, ritmo, régua do mínimo |
| `docs/MANUAL_OPERACAO.md` | operação do dia a dia |
| `LEIA-ME.md` | armadilhas de deploy e infraestrutura |
| `AGENTS.md` | fluxo obrigatório antes de publicar |

Última revisão: **07/09/2026**.

---

## 1. O que o sistema faz

A Diretriz PM3-001/02/25 obriga a auditoria das Câmeras Operacionais Portáteis (COP). O 16º
BPM/M fixou, acima da Diretriz, o mínimo de **3 evidências por turno**. O sistema:

1. recebe a declaração de auditoria do policial (`/cop2026/lancar`);
2. mede o cumprimento contra a **Matriz Operacional Proporcional** (meta 960/mês em setembro);
3. apresenta ao Comando em painel, briefing e relatórios;
4. registra trilha de auditoria de tudo que muda.

**Escala de uso:** ~570 policiais no quadro COP, 6 frações (EM, 1ª a 4ª Cia, Força Tática),
12 turnos-fração por dia, 360 turnos-fração no mês.

---

## 2. Stack

| Camada | Escolha | Versão |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 16.2.10 |
| Runtime UI | React | 19.2.4 |
| Banco | Supabase (Postgres) — projeto `lypxujjyllmibxqvdogr`, região `sa-east-1` | — |
| Hospedagem | Vercel, team `avertice` | — |
| Estilo | Tailwind CSS v4 (`@theme inline`) | — |
| Gráficos | Recharts | 3.9.2 |
| PDF | `puppeteer-core` + `@sparticuz/chromium` | 25.9 / 149 |
| PNG | `modern-screenshot` / `html-to-image` | — |
| Assistente da tela de saúde | `@anthropic-ai/sdk` | 0.123 |

**Deploy é por CLI, não por git** (`vercel deploy --prod`), porque o deploy por git está
bloqueado no projeto. Consequência auditável: a Vercel **não guarda o commit** de cada
deployment. O `deploy-cco16.sh` grava `.ultimo-deploy` (SHA + URL) no repo, e a sonda do pc1
compara com o `HEAD` para acusar código commitado e não publicado.

---

## 3. Modelo de dados

Todas as tabelas do domínio ficam em `public`, com **RLS habilitada e nenhuma policy** — o
acesso é exclusivamente pela `service_role`, a partir do servidor. Nenhuma tabela do domínio
devolve linha para a chave publicável; isso é **testado** (`npm run verificar:seguranca`).

| Tabela | Colunas | Papel |
|---|---|---|
| `cop_auditoria_lancamento` | 30 | a declaração do policial; soft delete (`excluido_em`) |
| `cop_evidencia` | 17 | identificadores por lançamento, com o bruto e o normalizado |
| `cop_auditoria_trilha` | 8 | trilha de auditoria das alterações |
| `cop_auditoria_parametro` | 10 | metas e mínimo por período |
| `cop_unidade` | 11 | efetivo e vínculo RE → fração (3.944 linhas) |
| `cop2026_auditor` | 10 | quadro de auditores designados |
| `cop2026_autorizados` | 8 | quem abre as telas restritas (migration 025) |
| `cop_config` | 4 | configuração do Comando fora do cookie (migration 030) |
| `cop_rotina_execucao` | 6 | registro das rotinas (backup etc.) |
| `cop_verificacao_execucao` | 10 | registro dos gates executados |

**30 migrations** em `supabase/migrations/`. Não há script de migration no `package.json`: são
aplicadas pelo MCP do Supabase (`apply_migration`, que grava a história) ou pelo SQL Editor.

### 3.1 Colunas de quantidade — qual vale

`videos_declarados`, `videos_contados` e `videos_validos` coexistem. **A régua oficial é
`videos_declarados`** (`lib/db/cop2026-lancamentos.ts`): vale o que o auditor declarou. Um
auditor que declara 7 e não informa identificador nenhum entrega 7 evidências.

Auditor: não confunda `videos_contados = 0` com "não produziu". `contados` é a contagem de
identificadores aceitos, e é 0 sempre que os identificadores foram recusados.

### 3.2 Teto de plausibilidade

`TETO_VIDEOS_POR_LANCAMENTO = 60` (`lib/cop2026.ts`). Existe por incidente real de 29/08/2026:
um auditor colou o ID `202608298084` no campo de quantidade e o painel somou 202 bilhões. Acima
do teto o valor sai da soma e o descarte aparece **nominalmente** na tela, nunca em silêncio.
Isso é sobre *quantidade absurda*, não sobre identificador.

---

## 4. De onde vêm os números

`lib/cop2026-leitura.ts` decide a fonte por variável de ambiente — e é o único *rollback* que
funciona em minutos, sem build:

| `COP2026_FONTE` | Comportamento |
|---|---|
| `planilha` (padrão do código) | só a planilha do Google — modo da rodagem paralela |
| `uniao` | planilha até `COP2026_CORTE_BANCO`, banco a partir dele — **modo atual** |
| `banco` | só o banco |

`COP2026_CORTE_BANCO` = **`2026-08-01`** desde 07/09/2026.

> **Armadilha que já ocorreu, e é a razão do corte existir:** agosto foi importado para o banco
> (104 linhas) enquanto o corte seguia em `2026-09-01`. A planilha continuava servindo agosto e o
> banco também: **37 registros contados em dobro**. Corte e backfill andam no mesmo passo. A
> invariante `fonte-duplicada` existe para acusar exatamente isso.

**Resiliência da leitura da planilha** (`lib/cop2026-leitura.ts`, desde 29/08/2026): retrato em
memória com validade de 60 s, releitura em `after()` fora do caminho da resposta, rotas em
paralelo com `Promise.any`, timeouts de 12 s/15 s, `maxDuration = 20`. Pane do Google devolve o
último retrato bom **com banner de `stale`** — nunca página pendurada nem painel zerado.

---

## 5. Autenticação e autorização

Três camadas, deliberadamente redundantes:

1. **Borda (`proxy.ts`)** — confere só a **assinatura** do cookie (`COOKIE_ACESSO_COP`,
   HMAC-SHA256, 12 h). A borda não fala com o banco.
2. **Página/rota** — `exigirAcessoCop()` / `exigirAdminCop()` rechecam a **lista de autorizados
   no banco a cada requisição**. É o que faz a revogação valer na hora, sem esperar o cookie
   expirar.
3. **Banco** — RLS ligada, acesso apenas por `service_role` no servidor.

**Identidade:** OAuth 2.0 com Google (projeto `portal-cco16` no GCP, cliente "Portal CCO-16
web"). E-mail de Gmail é comparado **canonizado** (pontos e sufixo `+` descartados), porque o
Gmail os ignora — sem isso, `Marcusvinimoreira@` e `marcusvini.moreira@` seriam pessoas
diferentes.

**Administração:** vem da env `COP2026_ADMINS`, **deliberadamente fora do banco**. É o que
impede o administrador de se trancar do lado de fora ao se remover da lista, e mantém a
administração de pé com o Supabase fora do ar.

### 5.1 Risco estrutural conhecido no proxy

`ROTAS_PUBLICAS` e `ROTAS_RESTRITAS_COP` casam **por prefixo**. Uma subrota nova sob
`/api/cop2026/saude` **nasce aberta**. Hoje `/saude/painel` e `/saude/perguntar` se defendem
sozinhas com `exigirAdminCop()`, e o comentário no `proxy.ts` avisa. **Quem criar a próxima
subrota precisa repetir a checagem.** É a dívida arquitetural mais relevante do sistema.

---

## 6. Superfícies

| Rota | Acesso | Papel |
|---|---|---|
| `/cop2026` | **pública** (QR Code da tropa) | landing e porta de entrada. **Não exibe métrica** — decisão de 26/08/2026 |
| `/cop2026/lancar` | **pública** | formulário de declaração |
| `/cop2026/dashboard` | conta Google autorizada | painel de controle do Comando |
| `/cop2026/briefing` | conta Google autorizada | 11 slides para apresentação |
| `/cop2026/relatorios/[mes]/…` | conta Google autorizada | executivo analítico, dados, briefing do mês |
| `/cop2026/admin/*` | admin (`COP2026_ADMINS`) | 9 telas: autorizados, lançamentos, auditores, metas, unidades, trilha, importar, **divergências**, saúde |
| `/api/cop2026/saude` | bearer (`CCO16_SAUDE_TOKEN`) | invariantes para o vigia externo |
| `/api/cop2026/backup` | bearer (`CCO16_BACKUP_TOKEN`) | NDJSON das tabelas, lista fechada |
| `/api/cop2026/briefing-pdf` · `-png` | sessão da COP | exportação do painel |

**Por que a landing é pública:** a tropa entra por QR Code. O dashboard carrega nome, RE e
justificativa de policial — por isso é restrito desde 26/08/2026.

### 6.1 Exportação PDF/PNG

As duas rotas compartilham `lib/cop2026-briefing-rota.ts` **de propósito**: duplicado, o par
envelheceria torto e um filtro novo entraria em um formato e faltaria no outro.

- O recorte é repassado por **lista fechada** de filtros (`fracao`, `semana`, `turno`, `de`,
  `ate`, `busca`, `excecao`) — a querystring vai para um navegador headless, então nada fora da
  lista atravessa.
- O headless recebe um **cookie curto emitido na hora**, nunca o de quem chamou.
- 401 seco para `fetch`; redirecionamento para a tela de acesso quando é navegação — porque o
  botão é um `<a href>` para o celular baixar sem passar pelo JavaScript.

**Medido em produção, 07/09/2026:** PDF `%PDF-1.4`, 5,87 MB, 11,4 s · PNG válido, 3,86 MB,
7,7 s. Ambos com HTTP 200.

---

## 7. Observabilidade

### 7.1 As invariantes (`lib/cop2026-saude.ts`)

Medem o painel contra o dado real e alimentam **três consumidores com o mesmo resultado**: a
rota do vigia (bearer), a tela `/cop2026/admin/saude` e o refresh dela. Cada cópia seria uma
chance nova de divergirem.

Regra de saída: só contadores, booleanos e nomes de invariante. **Nunca** nome, RE,
justificativa ou identificador.

Invariantes ativas: leitura da planilha · reconciliação do total · semanas dentro do mês ·
escala do recorte · meta semanal divergente · mínimo abaixo de 3 · **CPF em campo público** ·
fonte duplicada · leitura lenta · fora do ciclo.

### 7.2 O vigia (`pc2:~/vigia-cco16`)

| Anel | Frequência | O que vê |
|---|---|---|
| 1 — disponibilidade | 5 min | as 5 rotas, **cada uma com o código esperado próprio** (restrita devolvendo 200 alarma tanto quanto pública devolvendo 404) |
| 2 — integridade | 1 h | consome `/api/cop2026/saude` e repassa os achados; a régua mora no portal, a sonda é carteiro |
| 3 — boletim | 07:30 | retrato diário no Telegram, **mesmo sem achado** — vigia que só fala quando quebra deixa a dúvida de estar morto |

**Entrega garantida (07/09/2026):** três tentativas, fila em disco quando falham, e a marca de
silêncio só é gravada **depois** da entrega confirmada. Invariante que fecha sozinha dispara
`resolvido` e limpa a marca.

### 7.3 Gatus (`pc2:8095`) — 15 endpoints

Do domínio COP: `pmesp/portao-cop`, `crons/backup-cop`, `sondas/pool-bracos-pc1`,
`sondas/repo-portal-cco16`.

---

## 8. Backup e recuperação

| O quê | Onde | Frequência | Verificação |
|---|---|---|---|
| Banco (11 tabelas, NDJSON) | `pc2:~/backups/portal-cco16`, retenção 30 d, dia 01 permanente | 03:08 diária | `--verificar` relê cada arquivo e compara a contagem com o banco |
| Código (história completa) | `git bundle --all` em `/mnt/pool/Backup-Diario/repos/` | 23:00 diária | `git bundle verify` antes de promover |
| Schema | `supabase/migrations/*.sql`, versionado | — | — |

**Restaurar = aplicar as migrations num projeto novo e reinserir os `.ndjson`.**

O backup do banco **não tem** a `service_role`: ele puxa de `/api/cop2026/backup`, que roda
dentro da Vercel com a chave e devolve NDJSON. O pc2 carrega apenas `CCO16_BACKUP_TOKEN`, que só
lê, só as tabelas da lista fechada, e é rotacionável em segundos.

**O que este desenho não cobre:** sequences e objetos criados à mão no console, fora de
migration.

---

## 9. Gates de qualidade

Fluxo obrigatório antes de publicar (`AGENTS.md`): `tsc --noEmit` → `verificar:*` → commit →
`vercel --prod`.

| Gate | O que trava |
|---|---|
| `verificar:vocabulario` | vocabulário travado pelo Comando |
| `verificar:dado-pessoal` | dado pessoal em superfície que não pode ter |
| `verificar:periodo` | fechamento do painel dentro do mês |
| `verificar:lancamento` | regras do formulário |
| `verificar:painel` | `metaDia × janela.dias = meta` nas quatro semanas |
| `verificar:tendencia` | curva plano × realizado |
| `verificar:unidades` | vínculo RE → fração |
| `verificar:indices` | índices do banco |
| `verificar:excecoes` | as barras fecham com a base; **sem-ID não conta como desvio** |
| `verificar:paridade` | planilha × banco antes de virar fonte |
| `verificar:seguranca` | nenhuma tabela do domínio devolve linha para a chave pública |
| `verificar:superficies` | o identificador não volta às telas de desempenho (ver §15.1) |
| `verificar:rotas` | rota de API nova não nasce aberta pelo prefixo do proxy (ver §16.4) |

Os scripts usam alias `@/lib` e **só rodam pelos comandos npm** (`scripts/alias-loader.mjs`).
`node --test` direto falha com `MODULE_NOT_FOUND`, e isso não é bug.

---

## 10. Decisão de Comando de 07/09/2026 — o identificador

**Vale o que o auditor declarou, qualquer que seja o número digitado no campo de ID.**

O identificador saiu de **todas** as telas de desempenho: dashboard, briefing (slides e
documento), relatório executivo, relatório de dados, funil de conformidade, contagem de
pendências e invariantes de saúde. Passou a viver em uma tela só:
**`/cop2026/admin/divergencias`**, com três listas nominais (sem ID, fora do formato, repetido
entre auditores) para o Comando cobrar correção na origem.

**Por que:** 338 identificadores foram recusados em agosto (56 dos 104 lançamentos) e 38 em
setembro. O motivo dominante é `numero_solto` — o auditor digita data+sequência
(`202608011985301`) no lugar do ID da gravação. Descontar isso da produção puniria quem fez o
serviço; o que se perde é rastreabilidade, e é ela que se cobra.

O gate `verificar:excecoes` trava a regra **nos dois sentidos**: se alguém reintroduzir sem-ID
na contagem de desvios, o teste cai antes de o número chegar ao Comando.

**O que NÃO saiu:** `cpf-em-campo-publico`. Não é validação de identificador, é LGPD — dado de
terceiro na tela do Comando.

---

## 11. Segurança — postura e riscos aceitos

**Implementado:** OAuth 2.0 + PKCE · sessão HMAC-SHA256 (12 h) · TLS 1.3 (conferido com
`openssl s_client`) · RLS sem policy em todo o domínio · trilha de auditoria · redação de CPF
token-aware · segundo fator de autorização no banco a cada requisição.

Regra dos selos exibidos no rodapé: **só entra mecanismo que o código realmente faz e que dá
para conferir**. Nada de ISO/SOC/"site seguro" — o portal não passou por auditoria externa.

**Riscos aceitos conscientemente pelo Fabrício (26/08 e 02/09/2026), ainda abertos:**

1. A planilha do Google segue **publicada na web** (`/pub?output=csv`, HTTP 200 anônimo).
   Restringir o compartilhamento não fecha essa porta, e é a única rota de leitura que o modo
   `planilha`/`uniao` tem.
2. Duas tabelas de backup sem RLS — `cop_lanc_backup_nomes_20260902` (122 linhas) e
   `p3_roubos_farmacia_bkp_20260902` (102). O gate as lista nominalmente a cada execução e
   confirma que não devolvem linha para a chave pública.
3. Headers de segurança, `robots.txt` e allowlist exata de `/cop2026/*` (hoje é prefixo)
   permanecem **não aplicados**.

---

## 12. Pendências conhecidas

Registradas para não serem "descobertas" como surpresa:

| # | Pendência | Impacto |
|---|---|---|
| 1 | `eslint` acusa **68 erros e 17 warnings** no projeto, 45 deles em `lib/db.ts` (`no-explicit-any`). Nenhum no domínio COP revisado | dívida de tipagem |
| 2 | Allowlist do proxy casa por **prefixo**: subrota nova sob `/api/cop2026/saude` nasce aberta | segurança |
| 3 | `npm run build` local morre em `/16bpmm` por falta de `SUPABASE_SERVICE_ROLE_KEY`; validar com `tsc` + `eslint` + `dev` | ambiente |
| 4 | `verificar:paridade` fica "não verificado" onde falta a `service_role` — decisão de não espalhar a chave | cobertura |
| 5 | PDF de 5,87 MB e PNG de 3,86 MB são pesados para WhatsApp; geração leva 8–12 s sem barra de progresso | UX |
| 6 | Semanas futuras aparecem como **"0%"** com "Faltam N p/ meta", em vez de "não iniciada" | UX/leitura |
| 7 | Faixa "&lt;50% ABAIXO DA META" é do mês fechado; nos primeiros 15 dias ela é vermelha por construção, ao lado de "ADIANTADA" | leitura do Comando |
| 8 | 60 evidências de setembro **sem fração identificada** (17% do total) não entram em curva de fração nenhuma | dado |
| 9 | O repositório **não tem remote**; a proteção hoje é o bundle diário verificado | continuidade |

---

## 13. Ambiente de produção

Variáveis (todas `Sensitive` na Vercel — a API lista o nome e **nunca** devolve o valor):

`COP2026_FONTE` · `COP2026_CORTE_BANCO` · `COP2026_ADMINS` · `COP2026_EMAILS_AUTORIZADOS`
(semente/plano B) · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `CCO16_SESSAO_SEGREDO` ·
`CCO16_SAUDE_TOKEN` · `CCO16_BACKUP_TOKEN` · `CCO16_USUARIO` · `CCO16_SENHA` ·
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`.

`CCO16_SESSAO_SEGREDO` assina **as duas** sessões (login do portal e acesso da COP): trocá-lo
derruba ambas.

**Se o portal cair, conferir nesta ordem:** `framework` do projeto (tem que ser `nextjs`; já
esteve `null` e servia 404) → `ssoProtection` desligado (senão o QR Code cai no SSO da Vercel) →
alguma página pública voltou a ser prerender estático (`/cop2026` precisa de
`export const dynamic = "force-dynamic"`).

---

## 14. Como um auditor confirma o que está escrito aqui

```bash
# invariantes e números, ao vivo
curl -s -H "Authorization: Bearer $CCO16_SAUDE_TOKEN" \
  https://portal-cco16.vercel.app/api/cop2026/saude | jq .

# a suíte inteira
npx tsc --noEmit && for g in vocabulario dado-pessoal periodo lancamento painel \
  tendencia unidades indices excecoes paridade seguranca; do npm run verificar:$g; done

# o que está publicado x o que está no disco
head -1 .ultimo-deploy && git rev-parse HEAD

# integridade do backup de código
git bundle verify /mnt/pool/Backup-Diario/repos/portal-cco16.bundle
```

---

## 15. Auditoria adversarial de 08/09/2026

Varredura por seis lentes independentes (coerência dos números, segurança,
integridade do dado, sobras da decisão do identificador, operação/recuperação,
acessibilidade), com **dois verificadores por achado instruídos a refutar por
padrão**. 17 achados brutos, **3 refutados**, 14 confirmados. Todos os
confirmados foram corrigidos no mesmo dia, exceto onde indicado.

### 15.1 A decisão do identificador não estava aplicada por inteiro

A remoção de 07/09 pegou a fileira de KPIs do dashboard e passou ao largo de
quatro superfícies. Corrigido:

- **Cartão nominal `idInvalidoLista`** continuava no dashboard, listando auditores
  em laranja por formato de ID — e mandando "corrija na planilha", que não é mais
  a fonte. Removido.
- **`?excecao=idinvalido|semids|duplicado`** ainda era aceito pelo parser: um link
  salvo reativava o julgamento na tela. As três chaves saíram do tipo, do parser e
  dos ramos do filtro; sobraram `naoauditou` e `abaixo`.
- **Painel de saúde** pintava os três indicadores de ID com `alerta`. O número
  ficou (é diagnóstico), a cor de alarme saiu, e a nota aponta para Divergências.
- **Texto do briefing exportado** (o que vai no PDF/PNG) ainda dizia que "não
  informou o ID" é um dos motivos de pendência. Já não era verdade no cálculo.

> **Lição registrada:** o gate `verificar:excecoes` trava o *número*
> (`totalPendencia`), não a *presença* de um cartão na tela. Uma remoção parcial de
> UI passa por todos os gates. Um teste que trave a ausência de
> `idInvalidoLista`/`semIdsLista`/`duplicadoLista` em `dashboard-cop.tsx` fecharia
> essa classe inteira — está em aberto.

### 15.2 Perda silenciosa de evidências na importação

`importarMes()` inseria as evidências de cada lançamento em **um único INSERT
multi-linha**. Sem `ON CONFLICT`, a violação de `cop_evid_re_uidx` em uma linha
**aborta o comando inteiro** — um lançamento com 5 IDs bons e 1 repetido perdia os
6. O comentário no código afirmava o contrário ("a evidência colidida não entra"),
e o resumo da importação reportava sucesso do mesmo jeito.

`upsert` não resolve: o índice é **parcial**
(`WHERE id_normalizado IS NOT NULL AND descartada = false`) e o PostgREST não emite
o predicado, então o Postgres não consegue inferi-lo. A correção é lote primeiro e
**linha a linha só quando colide**, com o novo contador `evidenciasPerdidas` no
resultado — antes a perda não aparecia em lugar nenhum.

### 15.3 "Já registrado" para um lançamento que foi excluído

`cop_lanc_submissao_uidx` é unique sobre `payload_bruto->>'idSubmissao'` e **não
filtra `excluido_em`**. A guarda de idempotência também não. Resultado: o policial
que reenviava de uma aba antiga um lançamento que o Comando havia excluído recebia
`ok: true, duplicado: true` — e ia embora com o lançamento fora de toda contagem.
É o pior caso possível de um formulário: achar que enviou. Agora responde
`conflito: "excluido"` com instrução de refazer.

### 15.4 Identidade do auditor: sempre a base do RE

`chaveDoTurno` e a contagem de PMs distintos usavam `l.re` **como veio digitado**.
Medido no banco: **11 policiais com duas grafias** (`130550` e `130550-6`) em 49
lançamentos, e **3 casos** em que o mesmo policial no mesmo turno já era contado
como dois turnos (30/08, 04/09 e 07/09). Nesses três ninguém caiu abaixo do mínimo
por sorte — as duas metades passavam de 3 sozinhas. Quem fizesse 2+2 com grafias
diferentes apareceria com dois desvios tendo cumprido a cota.

Introduzida `identidadeAuditor()`, que é a base normalizada do RE, usada na chave
do turno, na contagem de PMs e na linha do auditor.

### 15.5 Recuperação e segurança

- **`cop_config` estava fora do backup.** É a tabela que guarda a decisão do Major
  (janela de atenção, migration 030) — ela saiu do cookie justamente porque cookie
  vale para uma aba e decisão vale para todos. Restaurar sem ela devolvia o padrão
  de fábrica, calado. Entrou na lista fechada.
- **`CCO16_SAUDE_TOKEN` era comparado com `!==`.** Este endpoint não tem cookie
  atrás dele: o token é a única barreira. Passou a usar `timingSafeEqual`, com o
  comprimento conferido antes.
- **Os scripts que consertaram o apagão de backup não tinham backup.** Espelhados
  em `pc1:~/_workspace/_scripts/pc2-vigia/` (coberto pelo backup diário), com
  `LEIA-ME.md` apontando o original de cada um no pc2.

### 15.6 Acessibilidade do formulário (o que a tropa usa no celular)

- O campo de identificador — o mais usado — tinha `<label>` **sem `htmlFor`/`id`**:
  tocar em "Vídeo N" não focava o campo, único assim no formulário.
- `aria-invalid` sem `aria-describedby`: o leitor de tela anunciava "inválido" e
  nunca lia o porquê. E o campo não mudava de aparência quando recusado.
- **Erro do servidor não movia a tela.** O policial confirma no fim da página, o
  alerta aparece no topo e a tela fica onde estava — no celular, no fim do turno,
  ele vê o formulário do jeito que estava e vai embora. Agora rola até o alerta e
  põe foco nele.
- Botão de fechar o aviso de colagem tinha alvo de ~14 px; passou para 44 px.

### 15.7 Refutados na verificação (não são defeito)

Três achados caíram no crivo dos verificadores. Registrados para não voltarem como
"descoberta": a normalização `chaveSubunidade` **cobre** a grafia `2º` do roster
(vira `2cia` corretamente), e as demais alegações não se sustentaram na leitura do
código.

### 15.8 Divergência aberta, para decisão do Comando

A **Matriz Proporcional é constante no código** e o efetivo real já não bate com
ela, embora o total feche em 570:

| Fração | Matriz | `p4_efetivo` | Δ |
|---|---|---|---|
| 3ª Cia | 111 | 123 | +12 |
| 2ª Cia | 93 | 87 | −6 |
| Força Tática | 73 | 68 | −5 |
| 4ª Cia | 93 | 97 | +4 |
| 1ª Cia | 102 | 99 | −3 |
| Estado-Maior | 98 | 96 | −2 |

O painel anuncia "quadro: N PMs" pela Matriz, e a cota de cada fração foi rateada
por esses números. Não é bug — a Matriz é documento do Comando. Precisa de decisão:
a Matriz se atualiza com o roster, ou fica congelada por definição?

**Também aberto:** 6 REs que lançam auditoria **não existem em `p4_efetivo`** (65
evidências em setembro, entre eles um Maj PM/COORDOP). Por isso caem em `outros` e
não entram na barra de fração nenhuma — o sistema não chuta, por decisão de
projeto. Resolve-se incluindo os 6 no roster, ou reclassificando lançamento a
lançamento em `/cop2026/admin/lancamentos`.

---

## 16. Decisões do Comando — 08/09/2026

Quatro pontos que estavam em aberto na §12 e na §15.8 foram decididos. Registradas
aqui como decisão, não como pendência: o auditor externo vai encontrar cada uma
delas no código e precisa saber que é escolha, não descuido.

### 16.1 Os 6 REs fora do roster — resolvido

**Decisão:** os Majores COORDOP são do Estado-Maior **em definitivo**; os cinco
3º Sgt entram no EM **só desta vez**.

Aplicado:

- `p4_efetivo` recebeu **Maj PM Vinícius (100371-2)** e **Maj PM Álvaro Zocchio
  Júnior (990036-5)**, ambos `cia = EM`, `funcao = COORDOP`. São coordenadores de
  operações e não constavam do quadro do Batalhão — por isso `identificarPorRe`
  não os resolvia. Agora todo lançamento futuro deles nasce classificado. Roster:
  570 → 572.
- Os **15 lançamentos** de setembro que estavam em `outros` foram reclassificados
  para `em`, com `editado_por` registrado. Isso inclui os cinco sargentos
  (Cléber, Jessica Lopes, Camarini, Paulucci, R. Nascimento), que **não** foram
  inseridos no roster: a decisão vale para este ciclo.

**Consequência, medida:** `semFracaoVideos` **65 → 0**. As frações passaram a somar
exatamente o total do Batalhão (104+39+42+76+80+54 = 395). O **Estado-Maior foi de
36 para 104 evidências contra meta 48 — 216,7%**, porque ganhou seis auditores que
não entraram no rateio da Matriz.

> **O que observar no próximo ciclo:** os cinco sargentos voltarão a cair em
> `outros` no primeiro lançamento de outubro, porque não estão no roster. Ou eles
> entram em `p4_efetivo` na fração real, ou a reclassificação se repete todo mês.

### 16.2 Matriz Proporcional — fica como está

**Decisão:** manter a Matriz constante no código, **sem nota na tela**, mesmo com o
efetivo real divergindo por fração (3ª Cia 111 × 123; 2ª 93 × 87; FT 73 × 68).

A Matriz é documento do Comando e o rateio da meta já foi publicado; o total fecha
em 570 nos dois lados. O painel continua anunciando o efetivo da Matriz.

### 16.3 Faixa "<50% ABAIXO DA META" — fica como está

**Decisão:** manter a régua e o rótulo. A faixa é do **mês fechado**, então nos
primeiros quinze dias ela é vermelha por construção, e pode aparecer ao lado de
"ADIANTADA" — as duas leituras estão corretas e medem coisas diferentes
(cumprimento acumulado × ritmo). É a régua oficial do ciclo.

### 16.4 Proxy — o prefixo fica, o teste entra

**Decisão:** não mexer na allowlist do `proxy.ts` (mexer arrisca quebrar rota em
produção) e travar o risco por teste.

Criado `npm run verificar:rotas`: varre `app/api/cop2026/**/route.ts` e falha se
alguma rota não provar que confere acesso — `exigirAdminCop`, `exigirAcessoCop`,
`sessaoCop`, `prepararExportacao` (o guarda compartilhado do PDF/PNG, que chama
`sessaoCop` por dentro) ou a conferência de um bearer. As quatro rotas
legitimamente abertas estão declaradas **com o motivo escrito**, e um segundo
teste exige que o motivo exista.

Validado contra regressão: criar `app/api/cop2026/saude/teste-regressao/route.ts`
sem gate derruba a suíte.

### 16.5 Os dois gates novos

| Gate | Fecha |
|---|---|
| `verificar:superficies` | o identificador não volta às telas de desempenho (§15.1) |
| `verificar:rotas` | rota de API nova não nasce aberta pelo casamento por prefixo |

Ambos validados contra a regressão que deveriam pegar — um teste que nunca falha
não protege nada.

---

## 16. Decisões do Comando — 08/09/2026

Quatro pontos que estavam em aberto na §12 e na §15.8 foram decididos. Registradas
aqui como decisão, não como pendência: o auditor externo vai encontrar cada uma
delas no código e precisa saber que é escolha, não descuido.

### 16.1 Os 6 REs fora do roster — resolvido

**Decisão:** os Majores COORDOP são do Estado-Maior **em definitivo**; os cinco
3º Sgt entram no EM **só desta vez**.

Aplicado:

- `p4_efetivo` recebeu **Maj PM Vinícius (100371-2)** e **Maj PM Álvaro Zocchio
  Júnior (990036-5)**, ambos `cia = EM`, `funcao = COORDOP`. São coordenadores de
  operações e não constavam do quadro do Batalhão — por isso `identificarPorRe`
  não os resolvia. Agora todo lançamento futuro deles nasce classificado. Roster:
  570 → 572.
- Os **15 lançamentos** de setembro que estavam em `outros` foram reclassificados
  para `em`, com `editado_por` registrado. Isso inclui os cinco sargentos
  (Cléber, Jessica Lopes, Camarini, Paulucci, R. Nascimento), que **não** foram
  inseridos no roster: a decisão vale para este ciclo.

**Consequência, medida:** `semFracaoVideos` **65 → 0**. As frações passaram a somar
exatamente o total do Batalhão (104+39+42+76+80+54 = 395). O **Estado-Maior foi de
36 para 104 evidências contra meta 48 — 216,7%**, porque ganhou seis auditores que
não entraram no rateio da Matriz.

> **O que observar no próximo ciclo:** os cinco sargentos voltarão a cair em
> `outros` no primeiro lançamento de outubro, porque não estão no roster. Ou eles
> entram em `p4_efetivo` na fração real, ou a reclassificação se repete todo mês.

### 16.2 Matriz Proporcional — fica como está

**Decisão:** manter a Matriz constante no código, **sem nota na tela**, mesmo com o
efetivo real divergindo por fração (3ª Cia 111 × 123; 2ª 93 × 87; FT 73 × 68).

A Matriz é documento do Comando e o rateio da meta já foi publicado; o total fecha
em 570 nos dois lados. O painel continua anunciando o efetivo da Matriz.

### 16.3 Faixa "<50% ABAIXO DA META" — fica como está

**Decisão:** manter a régua e o rótulo. A faixa é do **mês fechado**, então nos
primeiros quinze dias ela é vermelha por construção, e pode aparecer ao lado de
"ADIANTADA" — as duas leituras estão corretas e medem coisas diferentes
(cumprimento acumulado × ritmo). É a régua oficial do ciclo.

### 16.4 Proxy — o prefixo fica, o teste entra

**Decisão:** não mexer na allowlist do `proxy.ts` (mexer arrisca quebrar rota em
produção) e travar o risco por teste.

Criado `npm run verificar:rotas`: varre `app/api/cop2026/**/route.ts` e falha se
alguma rota não provar que confere acesso — `exigirAdminCop`, `exigirAcessoCop`,
`sessaoCop`, `prepararExportacao` (o guarda compartilhado do PDF/PNG, que chama
`sessaoCop` por dentro) ou a conferência de um bearer. As quatro rotas
legitimamente abertas estão declaradas **com o motivo escrito**, e um segundo
teste exige que o motivo exista.

Validado contra regressão: criar `app/api/cop2026/saude/teste-regressao/route.ts`
sem gate derruba a suíte.

### 16.5 Os dois gates novos

| Gate | Fecha |
|---|---|
| `verificar:superficies` | o identificador não volta às telas de desempenho (§15.1) |
| `verificar:rotas` | rota de API nova não nasce aberta pelo casamento por prefixo |

Ambos validados contra a regressão que deveriam pegar — um teste que nunca falha
não protege nada.
