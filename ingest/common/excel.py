"""Helpers comuns de leitura de planilha da rede do batalhão."""
import os
from datetime import datetime, timezone


PADROES_LIXO = ("~$", "modelo", "em branco", "cópia de", "copia de")


def eh_arquivo_lixo(nome_arquivo: str) -> bool:
    """~$ (lock do Excel), MODELO/EM BRANCO/Cópia de (templates, não dado real)."""
    nome_lower = nome_arquivo.lower()
    return any(p in nome_lower for p in PADROES_LIXO)


def mtime_iso(caminho: str) -> str | None:
    try:
        ts = os.path.getmtime(caminho)
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except OSError:
        return None


def numero_ou_none(valor) -> float | None:
    """Converte célula para número; strings sujas (ex.: '100%' onde deveria
    haver um numeral, #DIV/0!) viram None em vez de quebrar a ingestão."""
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    if isinstance(valor, str):
        s = valor.strip().replace("%", "").replace(",", ".")
        try:
            return float(s)
        except ValueError:
            return None
    return None
