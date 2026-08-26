"""Acesso a caminhos de rede (Z:\\16BPMM estável, Y:\\matrix intermitente).

Regra de ouro do projeto (ver memória reference_circunscricao_16bpmm /
project_pmesp_pipeline): usar sempre o caminho UNC completo
(\\\\cmdo\\pmesp\\16BPMM\\...), nunca a letra de unidade — Z:/Y: não ficam
mapeados em sessões não-interativas (scheduled task, por exemplo).
"""
import os


def caminho_disponivel(caminho: str) -> bool:
    """Testa se um caminho de rede está acessível, sem lançar exceção.
    Usado antes de qualquer leitura — em especial para Y:\\matrix (SPJMD),
    que fica no ar só ~9h/dia."""
    try:
        return os.path.exists(caminho)
    except OSError:
        return False
