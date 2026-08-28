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

## 4. Ritmo necessário

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
| Dashboard (produção) | `/cop2026/dashboard` | `components/publico16/cop/dashboard-cop.tsx` + `cop/graficos.tsx` |
| Dashboard V2 (prévia) | `/cop2026/dashboard/v2` | `components/publico16/cop/v2/*` |
| Briefing executivo | `/cop2026/briefing` | `components/publico16/briefing-slides.tsx` |
| Prévia de link | — | `app/(public)/cop2026/opengraph-image.tsx` |

Regra de ouro: **texto institucional muda em todas as superfícies ao mesmo tempo.** O Major
navega entre elas e cobra a divergência.
