# Relatorio Task 1 - nucleo HOME

## Implementado

- Store SQLite com schema idempotente, `schema_version`, WAL, `busy_timeout`, conexoes fechadas e transacoes atomicas.
- Registro versionado de metadados de fontes, eventos idempotentes e processamento condicionado a lease/fonte atual.
- Propostas com validacao de dominio, fonte/hash/kind, limites de strings, deduplicacao e quotas atomicas (5/dia local e 20 pendentes).
- Digest canonico SHA-256, decisao humana auditavel, idempotencia e transicao para `approved_proposal`, `rejected` ou `stale`.
- Contexto obrigatoriamente por dominio, com fontes autorizadas e propostas pendentes separadas, sem expor o corpo como fato.
- Pausa, retomada, leases exclusivas, expiracao como falha, quotas de runs e gate de experimento apos sete dias.
- CLI `python -m home_lab --db PATH` com `status`, `proposals`, `context`, `pause`, `resume`, `decide` e `gate`; sucesso e erro em JSON.
- Fallback de timezone documentado em `policy.py`: se `America/Sao_Paulo` nao estiver disponivel, usa UTC-3 atual, sem pretender reproduzir regras historicas.
- Expiracao de leases e persistida antes de validacoes que podem recusar a operacao; pausa e verificada atomicamente em propostas e consumo de eventos.
- Referencias de propostas carregam a versao da fonte no digest, protegendo contra ABA; dedup valida fonte atual antes de retornar ID.
- Schema futuro e recusado antes de qualquer DDL; fontes podem ser invalidadas explicitamente, removendo eventos/contexto e marcando propostas dependentes como `stale`.
- Janela de observacao inicia apenas em ciclo concluido via `start_observation`/`record_observation_success`; `can_experiment` reflete pausa, backlog, lease ativo, janela e gates.

O Store e uma barreira de politica da aplicacao, nao uma barreira do sistema operacional. O deployment deve executar worker e CLI humana com usuarios/permissoes distintos e impedir que o worker escreva no banco de aprovacao ou no codigo/politica. Esta entrega nao escreve no vault, nao acessa PCs remotos e nao altera Wiki/RAG.

## Evidencias TDD

RED inicial dos findings (testes focados, antes das correcoes):

```text
python -m unittest tests.test_core_findings -v
AttributeError: 'Store' object has no attribute 'record_observation_success'
FAILED (errors=...)
```

As falhas adicionais cobriam expiracao revertida por `raise`, dedup de fonte obsoleta, ABA de fonte, pausa permitindo consumo, schema 999 mutando banco e janela iniciada no construtor. Foram reproduzidas pelos oito testes em `tests/test_core_findings.py`.

RED propostas:

```text
python -m unittest tests.test_store tests.test_proposals -v
AttributeError: 'Store' object has no attribute 'create_proposal'
FAILED (failures=1, errors=4)
```

RED CLI:

```text
python -m unittest tests.test_cli -v
Ran 2 tests
FAILED (failures=2)
```

GREEN final:

```text
python -m unittest discover -s tests -v
```

Saida atual: `Ran 36 tests`, `OK (skipped=2)` (Windows pula somente os testes explicitamente Linux/bash). O teste de schema verifica tambem bytes do arquivo antes/depois.

O resultado final deve ser consultado no log do commit/execucao desta tarefa; o teste Linux de symlink da Task 3 pode aparecer como `skipped` no Windows e nao pertence a este escopo.

## API final

```text
Store(path, clock=None)
register_source(source_id, domain, path, sha256, kind='source') -> int
record_event(source_id, sha256, event_type='changed') -> int
list_events(domain=None, unprocessed_only=True) -> list[dict]
create_proposal(domain, title, body, sources, kind='hypothesis', reason='', verification='') -> int
decide(proposal_id, decision, actor, expected_digest, note='') -> dict
list_proposals(domain=None, status=None) -> list[dict]
get_proposal(proposal_id) -> dict
context(domain, limit=5) -> dict
pause(reason) -> None
resume() -> None
status() -> dict
begin_run(kind, owner) -> str
finish_run(token, status, detail) -> None
mark_events_processed(ids, run_token) -> None
set_gate(name, value, actor, evidence) -> None
```

## Arquivos

- `home_lab/__init__.py`, `policy.py`, `proposals.py`, `store.py`, `cli.py`, `__main__.py`
- `tests/test_store.py`, `tests/test_proposals.py`, `tests/test_cli.py`
- `task-1-report.md`

## Riscos e pendencias

- Os sete dias nao decorreram nesta entrega; o comportamento foi exercitado somente com clock injetavel.
- Os gates testados sao controles persistentes, nao comprovacao de backup real nem ganho real de retrieval.
- Isolamento por usuario/permissoes de sistema operacional e integracao com worker/MCP pertencem as Tasks 2/3.
- O fallback UTC-3 e adequado ao fuso atual de Sao Paulo, mas nao a datas historicas com horario de verao.
