# SDD ledger - plan: PLAN.md

2026-09-14: inicio; remoto SBV nao e Git. Desenvolvimento em copia local separada, branch feat/home-lab.

| Interfaces | Verificacao |
|---|---|
| Task1 store -> Task2 worker/MCP | Contrato documentado no brief; worker nao recebe funcoes de aprovacao via ferramentas |
| Task2 fontes -> Task3 backup | Hashes completos SHA256; metadados separados de copia/restauracao comprovada |
| Task1 | Aprovacao de proposta nao significa verdade automatica nem write no vault |
| Task2 | Janela7dias nao pode ser simulada como execucao real; fixtures nao comprovam ganho real |
| Task3 | Copia em PC2 e independente de host, nao offsite geografico |

Ruling: desenvolver modulo ao lado do SBV em copia isolada local — origem sem Git e producao ativa — custo se inadequado: etapa adicional de integracao antes da ativacao.
Ruling: manter promocao fisica e restart do MCP bloqueados ate aprovacao especifica — instrucoes do host exigem confirmacao de producao — custo: entrega inicial nao altera as interfaces em uso.

Task 1: in_progress
Task 2: pending
Task 3: inventory_in_progress
