# Task 1 - nucleo HOME

Leia PLAN.md somente para restricoes globais; esta e a especificacao do seu escopo.

Workspace isolado: C:/Users/pc4/Documents/Codex/2026-09-13/pa/work/home-lab. Nao acessar/modificar PCs remotos. Nao criar subagentes. Use apply_patch. Implementar Python stdlib; unittest com arquivos SQLite reais/temporarios (TDD red/green, registrar evidencias). Commit portugues imperativo em feat/home-lab (ler skill commit). Nunca git push.

## Arquivos e interface

Pacote home_lab: __init__.py, policy.py, store.py, proposals.py, cli.py e __main__.py. Pode dividir responsabilidades em arquivos pequenos se necessario. Tests tests/test_store.py, test_proposals.py, test_cli.py. Estado SQLite em path explicitamente fornecido ao construtor, nunca importar config legado (tem side effects/credenciais). Usar sqlite WAL local, busy_timeout e transacoes atomicas; fechar conexoes; timezone America/Sao_Paulo para quotas com fallback explicitamente documentado para falta de tzdata no Windows (usar UTC-3 atual, nao dependencias).

API Python publica base:
- Store(path, clock=...) default clock datetime aware UTC. create schema idempotente, schema_version, nao destruir dados desconhecidos.
- register_source(source_id, domain, path, sha256, kind='source') -> version. Somente kinds source/approved; metadados, nunca conteudo segredo. sha full 64hex validado.
- record_event(source_id, sha256, event_type='changed') -> id, idempotente source+sha+type. source deve existir/corresponder. Store.list_events(domain?, unprocessed_only=True).
- create_proposal(domain, title, body, sources=[{source_id,sha256}], kind='hypothesis', reason, verification) -> id. Todos sources obrigatorios do mesmo domain, sha atual, kind source/approved; recusar ids de propostas. Strings limitadas (title200/body12000/reason2000/verification2000), vazio recusa. Apenas hypothesis/checklist/skill/retrieval/prompt. Dedup conteudo+sources+domain sem casefold do hash, nao consumir quota duplicado. Max5/dia,20pending atomicos. Persistir basehashes e timestamps/status pending.
- decide(proposal_id, decision approve/reject, actor, expected_digest, note='') idempotente. Digest SHA256 do conteudo+fontes imutaveis entregue por get_proposal. Recusar digest divergente, fonte atualizada/removida, actor vazio, rejeicao/aprovacao contraditoria. Registrar decisao auditavel independente do body. approve -> approved_proposal (nao approved_fact, nao promove vault), reject -> rejected. Fonte desatualizada -> stale e exigir nova proposta/revalidacao.
- list_proposals(domain?, status?), get_proposal(id), context(domain, limit=5): contexto retorna metadados de fontes autorizadas do dominio e separado pending_proposals rotuladas, NUNCA corpo de propostas como fatos; dominios obrigatorios numa consulta contextual, nenhum global fallback.
- pause(reason), resume(), status(): fila, contagens, pausado, inicio da observacao, datas e capacidade de experimentar apos7dias; resume nao burla janela/gates.
- begin_run(kind event/night/experiment, owner) -> lease token: somente1 ativo; max6event/dia,1night/dia,2experiment/dia; noite timeout3600, evento timeout600, experimento600. Expirado -> failed (nao success), quotas consumidas por tentativa. pause e backlog20 bloqueiam novo trabalho; experiment so apos7dias e gate backup_verified e evaluation_ready registrados por controle humano. finish_run(token, status completed/failed/suspended, detail) valida lease; nao ressuscitar token expirado. Fonte/evento processado so aposanalise valida via mark_events_processed(ids,run_token) com source atual e run correto. Clock injetavel para testes de restart/timeout/quota/dia.
- Gates set_gate(name, bool, actor, evidence) backup_verified/evaluation_ready, actor/evidence obrigatorios. Worker nao recebe essa API via MCP leitura; processo humano CLI separado. Store nao e a barreira OS: documentar que deployment precisa isolar usuario da politica/db aprovacao.

CLI python -m home_lab --db PATH status|proposals|context --domain DOM|pause --reason...|resume|decide ID --decision... --actor... --digest...|gate NAME --value... --actor... --evidence... . Output JSON, erros nonzero JSON sem trace/segredos. Nunca aprovacao automatica nem arquivo vault editado. Interface de biblioteca pode ser adaptada levemente, documente assinaturas finais.

Testes: restartpreservaestado/idempotencia, fontesobsoletas/dominiocruzado/propostascomofontes/invalido, SQLinjection emvalores, quotaslimites/duplicacaonaconsome, concorrenciaSQLitecriarproposta/lease, expiredleasefailed, pausabloqueia,7dias/gates, digestalteradorecusa, dupladecisaoidempotente/contraditoriarecusa, CLIexitcodes. Nao usar teste grepdotextocomo seguranca.

Relatorio task-1-report.md: o implementado, RED/GREEN comandos+saidas, API final, arquivos, riscos/pendencias; resposta final curta status+commits+testes+path. Nao tocar arquivos Task2/3 ou PLAN/ledger.
