# Relatório Task 2

## RED/GREEN

RED inicial: os módulos `observer`, `model`, `worker`, `mcp` e `experiments` não existiam; imports e testes de contrato falhavam por `ModuleNotFoundError`.

GREEN: `python -m compileall home_lab` concluiu sem erros. A suíte completa foi executada com `python -m unittest discover -s tests -q` e passou; os testes de regressão do núcleo agora cobrem lease expirado, ABA de fonte, pausa, schema futuro, janela de observação e invalidação.

## APIs e limites

`observer.load_allowlist` valida JSON de operador e `observer.scan` lê somente paths absolutos `.md`/`.txt`, até 256 KiB, recusando ocultos, protegidos e symlinks, registrando digest/evento no `Store`. `OllamaClient` usa exclusivamente `127.0.0.1:11434/api/chat`, `ProxyHandler({})`, sem redirect e com transporte injetável para testes; valida schema, fontes e limites de resposta. `worker.run` aplica lease, memória Linux, deadlines, cohort de quatro fontes e não executa texto do modelo. `mcp.serve` implementa JSON-RPC stdio somente leitura. `experiments` fornece retrieval e manifest determinísticos de fixtures. O core agora expõe `invalidate_source`, marcando propostas dependentes como stale e removendo eventos da fonte.

## Lacunas honestas

O benchmark é apenas fixture sintética e não simula sete dias nem reporta ganho real; a bateria formal de 40 casos ainda precisa ser montada com dados de validação aprovados. As unidades em `deployment/` são artefatos desativados para revisão; não foram instaladas/ativadas e não constituem sandbox real. Nenhum serviço expõe escrita de aprovação ao LLM.
