# COP 2026 — Padrões de redação e classificação fixados pelo Comando

Requisitos de produto do painel de **Auditoria e Governança das Câmeras Operacionais
Corporais** (`/cop2026`). Não são preferência de estilo: são decisões do Major (A.J. Zochio),
homologadas em 28/08/2026. Antes de mudar qualquer texto de tela ou faixa de cor, leia isto.

Quem valida é o Major, e ele valida por print de WhatsApp — inclusive a **prévia do link**,
que vem de `app/(public)/cop2026/opengraph-image.tsx`. Texto errado ali é texto errado para ele.

---

## 1. Vocabulário travado

| Termo proibido | Termo correto | Por quê |
|---|---|---|
| SALA DE CONTROLE OPERACIONAL | **AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE** | Confundia o público com a *sala de operações* real do Batalhão, que é outra coisa. |
| Câmeras operacionais **portáteis** | Câmeras operacionais **corporais** | Nomenclatura vigente. Vale inclusive em `alt=` de imagem. |
| MANÔMETRO | **Conformidade e Ritmo da Gestão Operacional da Meta** | *"A tropa vai zoar e fazer piada."* |
| EM ATINGIMENTO | **Faixa de Atenção da Meta** / *Cumprimento Insuficiente* | Ver §2. |
| DESEMPENHO COMPARATIVO **DAS 6 COMPANHIAS** | **Desempenho Comparativo** | O **Estado-Maior não é companhia** — contar "6 companhias" é erro institucional. Use "frações" ou "subunidades". |

**Exceção deliberada:** `lib/dados-16bpmm.ts` descreve pesquisa acadêmica sobre "câmeras
operacionais portáteis". Ali o termo é histórico, citação de obra publicada, e **fica**.
O mesmo vale para `lib/dados-boletins.ts`, que transcreve texto de boletim.

### Cabeçalho canônico

```
AUDITORIA & GOVERNANÇA DAS CÂMERAS OPERACIONAIS CORPORAIS
16º BPM/M — "1º Ten PM Fernão" · Diretriz PM3-001/02/25
DIRETRIZ PM3-001/02/25 · AMBIENTE EXECUTIVO DE GESTÃO E CONTROLE
```

A linha da Diretriz vem **abaixo** do bloco AUDITORIA & GOVERNANÇA — essa ordem foi pedida
explicitamente. E o hero **não repete** "Polícia Militar do Estado de São Paulo · CPM" nem
"16º Batalhão de Polícia Militar Metropolitano": é redundante com o título e foi mandado tirar.

### Subtítulo da meta

```
META GLOBAL — 960 EVIDÊNCIAS
Distribuição Proporcional por Matriz Operacional
```

---

## 2. Faixas de desempenho — regra sistêmica

Fonte única da verdade: **`lib/cop2026-metricas.ts`** (`Nivel`, `ROTULO_NIVEL`,
`SUBTITULO_NIVEL`, `nivelPorCumprimento`). Nenhum componente pode reclassificar por conta
própria — sem ternário `pct >= 80 ? … : pct >= 50 ? …` espalhado pela UI.

| Intervalo | `Nivel` | Rótulo | Subtítulo semântico | Cor |
|---|---|---|---|---|
| `0 ≤ x < 50` | `critico` | FAIXA CRÍTICA | Abaixo da Meta | `#ca0202` vermelho vivo |
| `50 ≤ x < 80` | `atencao` | FAIXA DE ATENÇÃO | Cumprimento Insuficiente | `#d97706` âmbar |
| `80 ≤ x ≤ 100` | `conforme` | FAIXA DE CONFORMIDADE | Meta Cumprida | `#16a34a` verde |
| `x > 100` | `superacao` | FAIXA DE SUPERAÇÃO | Meta Superada | `#2563eb` azul |
| inválido, negativo, `NaN`, sem base de cálculo | `neutro` | NÃO AFERÍVEL | — | cinza |

Mutuamente exclusiva e coletivamente exaustiva: sem sobreposição e sem lacuna.

**"Não aferível" é ausência de BASE, nunca resultado zero** (03/09/2026). Um
período que já começou e não produziu nada tem base de cálculo: é `0%`, logo
**FAIXA CRÍTICA**. O discriminador é `semanasIniciadas(diaDoMes)` — nunca
`feito > 0`, que era o que pintava de cinza a semana em curso de uma fração
parada enquanto a linha da mesma fração, na mesma tela, já saía vermelha.

**Detalhes que já custaram retrabalho:**

- A classificação opera sobre o **valor bruto, antes de qualquer arredondamento** de
  apresentação. Exibir `79,96%` como `80,0%` não promove o resultado para conformidade.
- A faixa azul de superação existe *"para demonstrar excelência e não apenas a regra"*.
  Ela vale **em tudo**: velocímetro, barras por fração, progresso semanal, selos, réguas.
- O selo de **Abaixo da Meta é sempre vermelho vivo e sólido** (`#ca0202`, texto branco),
  nunca a versão suave. Foi cobrado duas vezes.
- **"Excelência" não é sinônimo de "Superação".** O Major reservou o termo *Excelência*
  para um indicador **composto** (quantidade + qualidade + auditabilidade), que ainda não
  existe. Na régua quantitativa a quarta faixa chama **SUPERAÇÃO**. Não troque de volta.
- Leitura de referência: `100%` = cumprimento integral · `80%` = limiar **mínimo** de
  conformidade · `>100%` = superação quantitativa. Isso responde à objeção óbvia
  ("como 80% de 960 pode ser 'meta cumprida'?"): 80% é o limiar institucional, não o
  cumprimento integral.

Sequência curta para rótulos apertados: **CRÍTICA → ATENÇÃO → CONFORMIDADE → SUPERAÇÃO**.

---

## 3. Por que auditamos — Diretriz PM3-001/02/25, item 6.1.6

Bloco obrigatório **na página de entrada (`/cop2026`) e no briefing executivo**
— e deliberadamente **fora do dashboard**. A primeira versão desta seção dizia
"no dashboard e no briefing", contra a última palavra do Major em 28/08/2026 às
08:46: *"tirando dashboard e deixa na tela principal"*. O código já obedecia; o
documento é que estava desatualizado. Redação homologada:

> **POR QUE AUDITAMOS?**
> Cinco finalidades institucionais orientam toda a auditoria das evidências digitais
> obtidas por COP.

| # | Título | Texto |
|---|---|---|
| 01 | CONFORMIDADE | Verificar se os registros e procedimentos atendem aos critérios técnicos estabelecidos. |
| 02 | FISCALIZAÇÃO E ORIENTAÇÃO | Subsidiar a fiscalização de natureza pedagógica, disciplinar e procedimental. |
| 03 | BOAS PRÁTICAS | Identificar condutas, procedimentos e soluções que possam ser reconhecidos e difundidos. |
| 04 | MELHORIA CONTÍNUA | Transformar os achados da auditoria em aperfeiçoamento dos processos operacionais. |
| 05 | INTELIGÊNCIA GERENCIAL | Extrair indicadores institucionais capazes de subsidiar decisões de gestão. |

Origem literal (6.1.6): *auditoria das evidências digitais obtidas por COP — exame
sistemático, independente e documentado dos registros captados por COP, realizada por meio
de credencial pessoal de acesso ao SiGCED*, com os objetivos 6.1.6.1 a 6.1.6.5, que são
exatamente as cinco linhas acima.

---

## 3-Z. Regra sistêmica: o painel fecha SEMPRE dentro do mês

Toda leitura do painel entra por um portão único, `calcularPainel`, que já
aplica `aplicarFiltros(lancamentos, f, minimo, duplicados)`. Depois dele, os
dois nomes autorizados são `dados` (recortado, com o filtro de semana) e
`dadosSemFiltroDeSemana` (recortado, sem esse filtro específico — porque os
cartões semanais SÃO o seletor). **Ninguém varre `lancamentos` fora daí.**

A regra existe porque cada consumidor que tocasse na base bruta era uma chance
de esquecer o `de`/`ate` e carregar o mês anterior. Foi assim que sobraram, e
foram encontrados um a um em 02/09/2026: cartões semanais, mini-cards por
fração, quinzena montada na `page.tsx`.

**Rede de proteção**: `npm run verificar:painel` roda `calcularPainel` duas
vezes sobre o mesmo recorte de setembro — uma com a base limpa, outra com
agosto inteiro em cima — e afirma que **nenhum contador muda**. Qualquer
diferença é a assinatura dessa classe de bug. O script está no fluxo
obrigatório do `AGENTS.md`.

Superfícies de agregação centralizadas dentro do Painel — não recriar em quem
consome:

- `dados`, `dadosSemFiltroDeSemana` — bases já recortadas.
- `semanasBatalhao`, `semanasFracao` — sobre `dadosSemFiltroDeSemana`.
- `auditoresPorQuinzena` — sobre `dados`, e `SEM_BASE` para a quinzena que
  ainda não abriu (`quinzenasIniciadas`).
- `regularidadeProducao(semanas, semanasIniciadas)` — Gini sobre as semanas já
  abertas; com menos de duas, devolve `SEM_BASE`.
- `janelaDoRecorte(f, hoje)` — dia/turno/restantes vindos do calendário do
  MÊS que ancora o recorte, nunca do histórico de lançamentos.

---

## 3-A. Semana operacional — zera na virada do mês (02/09/2026)

Determinação do Major, por WhatsApp, em 02/09/2026 às 07:40 e 07:48 ("ajustar no
briefing" — vale nas duas superfícies):

> "Temos o bug das semanas, ver como resetar a quarta de um mês para a primeira do outro mês."
> "E as outras 2 e 3 têm que zerar também."

Os cartões semanais somam **só o recorte do mês corrente**. A base é
`dadosSemFiltroDeSemana` em `calcularPainel` — o mesmo recorte do resto do painel,
menos o próprio filtro de semana (os cartões SÃO o seletor de semana; aplicá-lo
zeraria os outros três).

O que estava errado: a base tinha filtro próprio, só por fração e turno, e
ignorava `de`/`ate`. Como `identificarSemana` classifica pelo **dia do mês**,
24/08 e 24/09 caíam os dois na Semana 4 — em 02/09/2026 a tela anunciou
**SEMANA 4 · 1.146/240 · 477,5% · "Meta semanal superada"**, e as quatro semanas
somavam 1.341 contra 87 do mês.

O rótulo da 4ª semana também acompanha o mês (`diasDaSemana`): **22 a 30** em
setembro e novembro, 22 a 31 nos demais. Não existe 31 de setembro.

---

## 3-B. Filtro de semana recorta a meta E o calendário (03/09/2026)

Quando o Comando isola uma semana no painel, **tudo** passa a ser daquela
semana: meta, janela de cálculo, ritmo-alvo, trajetória, dias decorridos e as
linhas por fração. A regra é a mesma que `janelaDoRecorte` já enunciava —
*o período de cálculo do ritmo é sempre o do denominador da meta* — e o filtro
de semana era o único lugar em que ela não valia.

O que estava errado: a meta encolhia para a cota da semana e a janela continuava
o mês. Em 03/09/2026, com `?semana=1`, a tela mostrava **ritmo-alvo 8,03/dia**
(a cota de 7 dias dividida por 30 dias de calendário), **trajetória 435,7%** e o
selo **ADIANTADA** ao lado de "Crítica · ABAIXO DA META". A faixa do topo pedia
"6 por dia" para uma cota que exige 32, porque dividia a falta da semana pelos
27 dias que sobravam no mês.

**Zoom por data (`de`/`ate`) continua ancorado no mês, e de propósito.** A
diferença é que a semana tem meta declarada própria e o intervalo digitado não
tem: conferir um fim de semana não pode transformar 960 em cota de dois dias.

**A curva plano × realizado segue mensal**, como fixado em 02/09. Ela lê
`janelaMes` e `LinhaFracao.metaMes`, nunca a janela do recorte.

## 3-C. Cota semanal é rateada por DIAS (03/09/2026)

As quatro semanas recebiam ~240 evidências cada, mas a quarta cobre 9 ou 10
dias. A tropa era cobrada a 34,4 por dia nas três primeiras e a 26,4 na última,
para a mesma meta mensal.

A cota agora sai de `metasSemanaisDaMeta(meta, ultimoDiaDoMes)`, proporcional
aos dias, com o resto indo para as semanas de maior fração — a soma fecha a meta
do mês exatamente. Em setembro o Batalhão fica em **225 · 224 · 223 · 288**, e o
passo é 32/dia em qualquer semana.

Os números não são iguais em toda parte por acaso: a meta do recorte é a **soma
das cotas das frações**, cada uma inteira, e é por isso que a Semana 1 dá 225 e
não os 224 do rateio do agregado. A soma das seis linhas da tabela é a conta que
o Comando confere na mão, e é ela que manda.

A constante `META_SEMANAL_BATALHAO = 240` **saiu**: era a segunda fonte que fazia
o cartão da Semana 1 dizer 43,8% enquanto o topo dizia 43,6%.

**Rede de proteção**: `npm run verificar:painel` afirma, para as quatro semanas,
que `metaDia × janela.dias = meta` e que o cartão semanal e o topo filtrado
mostram a mesma cota. `medirSaude` repete as duas afirmações contra o dado real,
nas invariantes `escala-do-recorte` e `meta-semanal-divergente`.

---

## 4. Ritmo necessário

**Unidade fixada em 31/08/2026 e cobrada de novo em 02/09/2026** ("métrica dos
turnos e ritmo precisam ser ajustados" · "corrigir ritmo / turnos na métrica
atual"):

| Sujeito | Unidade | Como sai |
|---|---|---|
| **Batalhão** | por **DIA** | `960 ÷ 30 = 32/dia`; recuperação = `falta ÷ dias restantes` |
| **Fração** | por **TURNO-FRAÇÃO** | 2 turnos por dia, 60 num mês de 30 dias. `195 ÷ 60 = 3,25/turno` |

**Modelo de turnos confirmado pelo Maj PM em 02/09/2026**, palavra por palavra:
"no batalhão são 12 turnos por dia — 2 para o EM, 2 para cada Cia, 2 para a FT",
"360 turnos no mês para o batalhão", "60 turnos por mês para cada um", "no mês de
31, são 62 por mês". O painel não guarda esses números como constante: sai de
`fracoes.length × TURNOS_POR_DIA` e do calendário, então fração que entrar ou sair
da Matriz muda a conta sozinha.

Isso corrige de passagem um erro dos próprios padrões: o denominador vetado era
`960 ÷ 300`, quando o total de turnos-fração de setembro é **360** — o número
certo do cálculo errado é `2,67`, e continua vetado pelo mesmo motivo (mistura
turnos de frações distintas num denominador só).

Fonte única: `janelaDoRecorte` em `cop2026-metricas.ts` — dias e turnos vêm do
**calendário**, nunca do histórico de lançamentos.

Três números que estavam na tela e **não podem voltar**:

- **"Faltam 873 evidências em 13 turnos — 68 por turno"**: os 13 saíam de
  `15 turnos de 12x36 − 2 dias com lançamento`, somando maçã com laranja. O
  Batalhão não se mede por turno.
- **"meta de 65 por turno"** (cartão do briefing e linha do gráfico diário):
  era `Σ meta ÷ turnos` com `turnos: 15`. O certo é `meta ÷ dias do mês` = **32**,
  e o rótulo é **meta/dia**, porque o eixo é diário.
- **"RITMO 15/turno"** no cartão da 1ª Cia: vinha de `mat.ritmoProporcional`, o
  rateio inteiro da constante `RITMO_GLOBAL_RESTANTE = 73`. Quase cinco vezes a
  cota real. O alvo agora é `meta da fração ÷ turnos-fração do mês`.

`RITMO_GLOBAL_RESTANTE` e `TURNOS_RESTANTES_GLOBAL` **saíram da tela** em
02/09/2026 e **saíram do código** em 03/09/2026, quando deixaram de ser
reexportados sem consumidor. A linha "Todos os valores são calculados a cada
leitura — nenhum é fixo no código" só podia ser escrita depois disso.

**Dia decorrido conta o dia em curso.** `progressoDoMes` contava só dias
encerrados enquanto o realizado já incluía o que foi lançado hoje — numerador de
dois dias sobre denominador de um. Foi o que pôs "dia 1 de 30", "REAL 87,00/dia"
(eram 43,5), "TRAJETÓRIA 271,9% · ADIANTADA" ao lado do selo "Crítica · ABAIXO
DA META" e a linha impossível **"Dias com lançamento: 2 de 1"**.

### Recuperação é sempre do DIA SEGUINTE

Pedido da Coordenadoria Operacional em 02/09/2026, via Maj PM: *"aqui pediram
para ser 1,39 / dia seguinte — sempre a recuperação dia seguinte, para facilitar
o entendimento"*.

O ritmo de recuperação (`falta ÷ dias restantes`) responde "se eu diluir o que
falta pelo resto do mês". Ninguém trabalha diluído, e o número muda todo dia sem
que nada tenha acontecido. O alvo do dia seguinte responde a pergunta que a
fração faz de fato:

    alvo(amanhã) = previsto(d+1) − realizado = cota − saldo

Um número só, e ele já embute a dívida. Está em `metaDeAmanha`
(`lib/cop2026-tendencia.ts`) e aparece no cartão TENDÊNCIA como **AMANHÃ
· /dia seguinte**, ao lado — nunca no lugar — do ritmo de recuperação, que
continua respondendo pelo fechamento do mês.

### Dívida acumulada e a curva plano × realizado

Os outros dois pedidos do mesmo despacho:

> *"se não fizerem no dia seguinte, ter um esquema da somatória do que se vai
> deixando de fazer em forma acumulada, mas que quando começarem a sanear isso
> vai caindo à medida que comecem a fazer"*

> *"um gráfico para cada Cia, por dia, com quanto fizeram, com essa linha do que
> deveria ser feito como uma linha a ser comparada"*

São a mesma coisa vista de dois jeitos: a **dívida** é a distância entre a linha
do previsto acumulado e a do feito acumulado. `curvaPlanoRealizado` monta a série
do mês inteiro — inclusive os dias sem lançamento, que são justamente os que
abrem a dívida e sumiriam se a série da planilha fosse desenhada como veio.

A curva é do **mês**, e ignora a aba de semana de propósito: com "Sem 2" ligada,
desenhar 23 dias zerados diria que a fração não produziu nada neles.

**Duas linhas de alvo, e não é redundância.** A azul tracejada é o alvo
ACUMULADO ("estou no prazo do mês?"); a pontilhada escura, sobre as barras, é o
**ritmo-alvo do dia** ("o dia fechou a cota?"). São perguntas diferentes e réguas
diferentes — a acumulada no eixo da esquerda, a diária no da direita. A linha do
dia é neutra de propósito: a cor, ali, é da barra.

**Nada na curva pode sair da lista de frações da TELA.** Com um filtro de fração
ligado, `p.fracoes` tem uma linha só: a soma das metas deixa de ser 960, a série
"do Batalhão" passa a ser a daquela Cia e `fracoes.length` deixa de contar as
frações do Batalhão. Três textos já mentiram por isso e o conserto é o mesmo nos
três — ler a fonte, não a tela: `META_TOTAL_BATALHAO` para a meta,
`MATRIZ_PROPORCIONAL_2026` para a contagem de frações, e o cartão "Batalhão"
some quando há filtro (`mostrarBatalhao`).

**Carimbo de dia parado só vale para dia FECHADO.** O dia em curso ainda pode
receber lançamento; às 08h da manhã a coluna diria "sem lançamento nenhum" sobre
um dia que mal começou. A dívida, essa, conta o dia em curso — são coisas
diferentes: uma é medida, a outra é veredito.

**Barra de fundo precisa de eixo X próprio.** O Recharts agrupa barras por eixo
X: duas barras no mesmo eixo ficam LADO A LADO dentro da banda do dia, e a
coluna do dia parado deixava de ser fundo e ainda empurrava a barra do dia para
fora do próprio tick. A coluna vive num `xAxisId="fundo"` escondido.

**A barra do dia é classificada pela régua de faixas.** Pedido de 02/09/2026:
"a barra quando não cumprir a meta seja vermelha, quando cumprir seja verde,
quando superar seja azul". Implementado com `nivelPorCumprimento(feito ÷ cota)` e
`COR_FAIXA` — as fontes únicas do §2, sem reclassificação local. A régua tem uma
faixa a mais que as três pedidas, **âmbar de 50% a 79%**, e ela fica: é a mesma
escala do ranking, do quadro semanal e do velocímetro, e suprimi-la só aqui
criaria duas linguagens de cor no mesmo painel.

O motivo declarado pela coordenadoria — *"é sempre na terceira para a quarta
semana que o pessoal olha, vê que não vai atingir e aí começa a fazer"* — é o que
justifica a leitura acumulada: esse padrão não aparece em barra de dia nenhuma
isolada, aparece na linha do feito descolando da linha do previsto por vinte dias.
É o mesmo fenômeno que `alertaLote` e a coluna REGULARIDADE já classificam; a
curva é a prova visual dele enquanto o mês ainda corre.

### A régua do mínimo é o TURNO, e vale em TODAS as superfícies (03/09/2026)

Decisão do Comando. O mínimo de 3 é do **turno de serviço**: dois envios do
mesmo auditor no mesmo dia e turno somam. Fonte única em `cop2026-metricas.ts` —
`chaveDoTurno`, `somarPorTurno`, `turnosAbaixoDoMinimo`. **Nenhuma superfície
conta `l.videos < minimo` por conta própria.**

A correção de 02/09 tinha entrado só no contador do topo e na lista nominal.
Continuavam por lançamento — e portanto discordando do cartão que as abre:

- o **filtro** `excecao=abaixo` (o cartão dizia 5, o clique listava 8);
- a **tabela de auditores** (`abaixo`, `media`, `nivel`) — quem fez 2+2 no mesmo
  turno saía com dois desvios e selo vermelho tendo cumprido;
- o **bloco de exceções por fração** e o **Relatório de Dados**;
- o **histograma**, a **dispersão**, a **mediana** e o **p90**.

`aplicarFiltros` roda em duas fases por causa disso: recorte primeiro, exceção
depois — a soma do turno tem de ser feita sobre o recorte que está na tela.

A tabela de auditores ganhou a coluna **Turnos** e a média virou **Média/turno**;
`Lanç.` fica, porque envio e turno são coisas diferentes e as duas se cobram.

### Mínimo por turno é 3, e é do Batalhão

O mínimo exibido sai de `minimoDoRecorte`: com uma fração isolada vale a
determinação dela; no Batalhão vale a **maior** determinação vigente — 3, a do
policiamento, não a do Estado-Maior (2), que é administrativa.

Saía de `metas.find((m) => m.evidenciasPorTurno > 0)`, a **primeira linha do
array**. Como o Estado-Maior abre a lista, o Batalhão inteiro passou a ser
cobrado por 2 e o painel, o briefing e o plano de ação anunciavam
"CONFORMIDADE (≥2)", "abaixo do mínimo de 2" e "Garantir o mínimo de 2".

### Evidência sem fração aparece; não some nem soma calada

Lançamento sem fração declarada não casa com linha de meta nenhuma e sumia do
ranking, mas continuava somando no total. Resultado em 02/09/2026: "EVIDÊNCIAS
AUDITADAS 87" no topo e "Realizado 65" na Tendência por Fração, na mesma tela.
O total do Batalhão soma tudo e a caixa carimba **"N sem fração"** em vermelho —
o conserto é o auditor declarar a fração na planilha.

### Mesma mídia auditada duas vezes

`mapearDuplicados` acusa identificador **válido** lançado por mais de um
auditor — dupla contagem contra a meta. Vira a exceção
**"Lançaram ID já auditado por outro"**, distinta de "sem IDs" (cobra informar) e
de "ID fora do formato" (cobra corrigir).

O par **RITMO NECESSÁRIO** (evidências/turno) + **SALDO RESTANTE** nasceu no diagnóstico do
briefing e foi mandado **também para o dashboard**. Os números vêm do `Painel`
(`ritmoNecessario`, `falta`, `turnosRestantes`, `turnosPrevistos`) — nunca hardcoded. A
redação e o caso de borda (`turnosRestantes === 0`) já estão resolvidos em `veredito()`;
reaproveite em vez de reescrever.

---

### Último dia do mês: `diasRestantes` zero não é mês encerrado (03/09/2026)

`decorridos` inclui o dia em curso — de propósito — então `diasRestantes` conta
os dias **depois de hoje** e chega a zero no dia 30 com o mês inteiro aberto.
Quem responde por "acabou" é **`janela.encerrado`** (`hoje > ate`).

Enquanto os dois eram confundidos, no dia 30 às 08h o painel dizia "o período de
30 dias já se encerrou", marcava `irrecuperavel` e apagava o ritmo de
recuperação (`—`). `EntradaTendencia.encerrado` passa esse dado ao motor; no
último dia aberto a recuperação é o **déficit inteiro**, que é o que de fato
precisa entrar hoje.

### Pontos de atenção: janela móvel, sem período de carência (03/09/2026)

As listas nominais são recortadas pelos últimos `janelaAtencaoDias` (padrão 7)
sobre a **data** do lançamento. O segundo portão, que as esvaziava enquanto o
RECORTE não tivesse 7 dias corridos, **saiu**: como o recorte zera na virada do
mês, ele produzia uma janela cega do dia 1 ao dia 6 de todo mês — o Comando
abria o painel no dia 2 e não via nome nenhum.

Limite aceito: a base continua sendo o mês do recorte (§3-Z), então no dia 1º a
lista começa curta e não alcança o fim do mês anterior.

### Conferência da Matriz lê a MATRIZ, não a tela (03/09/2026)

`conferirSomaCotas` recebe `MATRIZ_PROPORCIONAL_2026` e `META_TOTAL_BATALHAO`.
Lendo `p.fracoes` — a lista filtrada — um `?fracao=1cia` fazia a soma dar 195 e
o painel imprimia a tarja vermelha "as cotas somam 195, e não 960". Alarme
criado pelo próprio filtro. Mesma regra do §4: **ler a fonte, nunca a tela.**

### Matriz hora × dia: "s/ hora" é coluna, não meio da tarde (03/09/2026)

Lançamento sem hora caía em `12–16` pelo `else` do cálculo e desenhava um pico
de expediente que era dado faltante. Agora tem coluna própria
(`FAIXA_HORA_SEM_HORA`), em cinza, e **fora da escala de calor** — ela mede
buraco de preenchimento, não concentração de atividade.

### Participação: dois números (03/09/2026)

"Auditores ativos" contava qualquer resposta de formulário, inclusive a de quem
declarou "não auditei" — e o IDA subia junto. O cartão passou a trazer os dois:
`ativos` (quem participou do controle) e `ativosAuditando` (destes, quem de fato
auditou).

---

## 5. Onde cada coisa mora

| Superfície | Rota | Componente |
|---|---|---|
| Hub público | `/cop2026` | `app/(public)/cop2026/page.tsx` |
| Painel do ciclo (único) | `/cop2026/dashboard` | `components/publico16/cop/dashboard-cop.tsx` + `cop/graficos.tsx` + `cop/ciclo/*` |
| Relatórios mensais | `/cop2026/relatorios[/<mes>]` | `app/(public)/cop2026/relatorios/*` |
| Briefing executivo | `/cop2026/briefing` | `components/publico16/briefing-slides.tsx` |
| Prévia de link | — | `app/(public)/cop2026/opengraph-image.tsx` |

**Painel é um só.** Em 01/09/2026 o Comando encerrou a avaliação das três versões que
conviviam (V1 na URL limpa, V2 de prévia de layout, V3 do ciclo): ficou o V3, em
`/cop2026/dashboard`. `/cop2026/dashboard/v2` e `/cop2026/dashboard/v3` são redirect
permanente em `next.config.ts` e preservam a query. **Não recriar variante de painel em
rota nova** — a divergência entre o que o menu abria e o que o botão da home abria foi
exatamente o problema que isso resolveu.

**A planilha não aparece em página aberta.** O atalho para a base bruta no Google Sheets
sai só dentro do Relatório de Dados do mês (`/cop2026/relatorios/<mes>/dados`). Ele foi
removido do hub público e do menu do módulo — não repor.

Regra de ouro: **texto institucional muda em todas as superfícies ao mesmo tempo.** O Major
navega entre elas e cobra a divergência.
