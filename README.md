# HOME Lab — Task 2

Implementação local de observação, adapter Ollama, worker, MCP stdio e benchmark de fixtures.

Teste: `python -m unittest discover -s tests -v`. Piloto manual: `python -m home_lab.worker --db DB --config CONFIG --kind event`.

Limites: fontes são arquivos `.md`/`.txt` explicitamente allowlisted até 256 KiB; máximo de quatro fontes e 12.000 caracteres por domínio/ciclo; seis runs event/dia, um night/dia, cinco propostas/dia e 20 pendentes. Ollama é exclusivamente `127.0.0.1:11434`, sem proxy/fallback.

Após deploy, a janela de sete dias deve iniciar a primeira observação real; não criar banco/status para simular janela. MCP é somente leitura e não expõe credentials. Execução de código continua bloqueada até isolamento real ser testado. Unidades em `deployment/` estão desativadas para revisão.
