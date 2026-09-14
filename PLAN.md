# HOME - implementacao controlada

Plano aprovado na conversa em 2026-09-14. Implementar extensao ao SBV existente, nao substituir Wiki/RAG ou instalar plataformas concorrentes.

## Restricoes globais

- Fontes originais imutaveis. Propostas nunca sao fatos; nenhum write no vault nesta entrega.
- Python stdlib, compativel 3.12/3.14. SQL parametrizado. Sem segredos no codigo/repositorio.
- Um worker; seis analises/evento/dia; noite 3600 segundos; dois experimentos/noite; cinco propostas/dia; fila pendente maxima 20.
- Janela de observacao sete dias, sem experimentos ate cumprir janela e gates. Sem API paga/fallback externo.
- PC1 canonico; PC3 processamento; PC2 backup independente. Nenhum restart/deploy de servico existente nesta fase sem aprovacao especifica.
- Dados PMESP separados por dominio e por permissoes na recuperacao. IDs/hash/versionamento e recusas explicitas. Erros nunca viram sucesso.
- Modelo nao pode alterar politica, gabarito, codigo do controlador ou aprovacao.

## Task 1: nucleo persistente e CLI

Ver brief separado task-1-brief.md. Store SQLite, eventos/fontes, propostas, decisoes de humano, estados, locks/quotas, contexto aprovado, CLI e testes. Nenhuma promocao escreve no vault. Aprovacao especifica registra decisao, nao eleva rascunho a fonte independente.

## Task 2: integracao, worker local e operacao

Adicionar scanner allowlist com sha256/limites/symlink refusal, modelo Ollama local e resultado estruturado validado, modo de observacao por sete dias, experimento de retrieval deterministico sobre fixtures, MCP stdio de leitura e controle humano separado, contratos e testes. Distribuir configuracao/service units desativados para revisao; nao alterar MCP legado em uso. Adaptacao do MCP legado apos aprovacao de restart.

## Task 3: inventario, backup/restauracao e entrega

Inventariar volumes reais e fontes sem copiar segredos. Preparar snapshot consistente de corpus essencial autorizado com manifest SHA256, copiar a PC2, verificar em pasta de restauracao isolada. Separar cobertura completa e amostral. Executar testes Linux/Windows, revisar seguranca, documentar gates pendentes e comandos precisos. Nao alegar sete dias decorridos ou ganhos reais com apenas fixtures.
