# portal-cco16 — Auditoria & Governança das COP do 16º BPM/M

Portal do Batalhão na Vercel (Next 16 + Supabase), team **avertice**
(`prj_OmnVH0mUprxpgRiGzoMkVTzKfOvQ`). A página pública `/cop2026` é o destino do
QR Code da tropa; o resto fica atrás de login Google + lista de autorizados.

---

## O que foi feito em 31/08/2026 — Caixa TENDÊNCIA (v3)

### O problema

O painel exibia **"ritmo necessário: 73"** ao lado de **"faltam 415 evidências em
12 turnos"**. As duas informações não conversavam: 415 ÷ 12 = **34,6**.

O 73 e o 12 não eram conta errada — eram **constantes escritas à mão** em
`lib/cop2026.ts` (`RITMO_GLOBAL_RESTANTE` e `TURNOS_RESTANTES_GLOBAL`),
congeladas numa data anterior. E o próprio `docs/cop2026-padroes-comando.md` §4,
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
pelo Major (`960 ÷ 300 = 3,20`).

**Calendário**: automático. 60 turnos por fração em mês de 30 dias, 62 em mês de
31 — fevereiro bissexto sai certo sem ninguém tocar.

### Onde vive

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
