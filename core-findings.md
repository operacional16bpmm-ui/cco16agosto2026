# Task1 review caef153 - correcoes obrigatorias

1. _expire_runs seguido de raise no mesmo transaction sofre rollback; persistir expiracao independente da recusa finish/mark/begin.
2. stale terminal; nao aprovar ID antigo sefonteA->B->A. Registrar versionde fonte nas referencias/digest para evitar ABA/metadadomudanca comhashigual. APIentrada source_id,sha256 podecontinua Storeenriquece versioninternamente.
3. Dedup valida fontesatuais antesderetornar ID; obsoletonuncasucesso.
4. Pausa verificada atomicamente create_proposal e mark_events_processed, inclusive runprepausa. Trabalhoconcluidoapospausa nao aprovado/consumido.
5. Validar schema antes qualquerwrite; versao999 recusada comDBintacto. executescript nao dentro BEGINnaoesperado; usar DDLstatements transacionados explicitamente; schemasincompativeisnaoparcialmentecriar.
6. can_experiment refletir pausa,backlog,ativo,quota,janelagates oucampo documentado: preferirreflectireligibilidadeefetiva.
7. Janela7dias precisa contar observacao real, nao abrir DB via status. Adicionar start_observation()/record_observation_success() confiavel chamado pelo worker apos primeirociclo valido; observation_started_at nullate la; experimento recusaantes, testescomclock. Nao sete diasfalsos porDBocioso.
8. Fonte apagada deveinvalidar fonte/metadados dependentes explicitamente. Adicionar invalidate_source(source_id, reason), invalidatedflag separado(kindnaoallowed) oustatus; context/extratoeventoscorrentes naoretornafonteinvalidada; decide marca stale; observerTask2usaraAPI. Sem deletar arquivosoriginais.

Testesfocados novosquepegamcadafuro antesdo fix, directSQL verify expiratione schema unchanged, staleABA hashmesmo e pathnovo,pausaconsumidor,dayquota. Relatorio task-1-report.md acrescenta RED/GREENdetalhado comcomando/saida atual, nao remeter genericamente loginacessivel. Semfake claimed13/13novosnumeros.
