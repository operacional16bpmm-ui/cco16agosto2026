# Backup documental - escopo

Implementar snapshot md/txt da Wiki e memorias, separado de bancos/midia/ambientes, com SHA256 por arquivo e manifest verificavel. Nunca apagar/sobrescrever fonte/destino existente, recusar destination dentro source, symlinks/traversal e arquivos alterados durante leitura; extensoes/pastas excluidas explicitas. Verificacao independente com hash externo de manifest. Nao alegar backup integral de38GB, snapshot global atomico ou offsite geografico. O programa sera executado num diretorio novo antes de ser integrado. Arquivos: home_backup.py/tests/test_backup.py.
