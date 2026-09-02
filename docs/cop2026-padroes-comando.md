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

Bloco obrigatório **no dashboard e no briefing executivo**. Redação homologada:

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

## 4. Ritmo necessário

**Unidade fixada em 31/08/2026 e cobrada de novo em 02/09/2026** ("métrica dos
turnos e ritmo precisam ser ajustados" · "corrigir ritmo / turnos na métrica
atual"):

| Sujeito | Unidade | Como sai |
|---|---|---|
| **Batalhão** | por **DIA** | `960 ÷ 30 = 32/dia`; recuperação = `falta ÷ dias restantes` |
| **Fração** | por **TURNO-FRAÇÃO** | 2 turnos por dia, 60 num mês de 30 dias. `195 ÷ 60 = 3,25/turno` |

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

`RITMO_GLOBAL_RESTANTE` e `TURNOS_RESTANTES_GLOBAL` **saíram da tela**. A linha
"Todos os valores são calculados a cada leitura — nenhum é fixo no código" só
podia ser escrita depois disso.

**Dia decorrido conta o dia em curso.** `progressoDoMes` contava só dias
encerrados enquanto o realizado já incluía o que foi lançado hoje — numerador de
dois dias sobre denominador de um. Foi o que pôs "dia 1 de 30", "REAL 87,00/dia"
(eram 43,5), "TRAJETÓRIA 271,9% · ADIANTADA" ao lado do selo "Crítica · ABAIXO
DA META" e a linha impossível **"Dias com lançamento: 2 de 1"**.

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
