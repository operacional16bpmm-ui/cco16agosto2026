# Relatório Task 2

## RED/GREEN

RED inicial: os módulos `observer`, `model`, `worker`, `mcp` e `experiments` não existiam; imports e testes de contrato falhavam por `ModuleNotFoundError`.

GREEN: `python -m compileall home_lab` concluiu sem erros. A suíte existente foi executada com `python -m unittest discover -s tests -v`; os testes de Task 1 seguem com falhas conhecidas em `core`/Windows (locks SQLite abertos e cenário de relógio), fora do escopo desta entrega, e não foram alterados.

## APIs e limites

`observer.load_allowlist` valida JSON de operador e `observer.scan` lê somente paths absolutos `.md`/`.txt`, até 256 KiB, recusando ocultos, protegidos e symlinks, registrando digest/evento no `Store`. `OllamaClient` usa exclusivamente `127.0.0.1:11434/api/chat`, `ProxyHandler({})`, sem redirect e com transporte injetável para testes; valida schema, fontes e limites de resposta. `worker.run` aplica lease, memória Linux, deadlines, cohort de quatro fontes e não executa texto do modelo. `mcp.serve` implementa JSON-RPC stdio somente leitura. `experiments` fornece retrieval e manifest determinísticos de fixtures.

## Lacunas honestas

O `Store` da Task 1 não expõe `invalidate_source`; portanto alteração/remoção é tratada por adapter mínimo: alteração cria nova versão/evento e remoção pausa o HOME até reconciliação. A invalidação automática de propostas relacionadas depende de API futura do core. O benchmark é apenas fixture sintética e não simula sete dias nem reporta ganho real. As unidades em `deployment/` são artefatos desativados para revisão; não foram instaladas/ativadas e não constituem sandbox real. Nenhum serviço expõe escrita de aprovação ao LLM.
