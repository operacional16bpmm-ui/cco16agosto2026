"""Ingestão P4 · Logística — Z:\\16BPMM_EM\\P4\\P4 2026\\ -> Supabase (tabelas p4_*).

Lê os JSONs já extraídos das planilhas-mestre da rede e popula:
  p4_patrimonio, p4_lotes, p4_material_belico, p4_telematica_ativos,
  p4_telematica_rede, p4_efetivo, p4_inventario_secao, p4_coletes,
  p4_documentos, p4_kpi_agregados, p4_arquivos_fonte

Mapeia colunas POR NOME de cabeçalho (não por posição): as 7 planilhas de
material bélico têm o mesmo dado em ordens diferentes e com nomes de aba
variando ('ALGEMA', 'ALGEMA (2)', ' ALGEMA 1'), então posição fixa quebraria.

Uso:
    python scripts/ingest_p4.py --extraidos <dir>            # grava
    python scripts/ingest_p4.py --extraidos <dir> --dry-run  # só relata
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE_REDE = r"Z:\16BPMM_EM\P4\P4 2026"


def carrega_env() -> tuple[str, str]:
    env = RAIZ / ".env.local"
    vals = {}
    if env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            k, v = linha.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or vals.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or vals.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local")
    return url.rstrip("/"), key


URL, KEY = carrega_env()
DRY = False


def norm(s: str) -> str:
    """Normaliza cabeçalho: sem acento, minúsculo, sem pontuação -> comparável."""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def limpa(v) -> str | None:
    """'NULL', '', '0' vazio do Excel -> None. Preserva zeros significativos."""
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", "NULL", "None", "#N/D", "-", "*********"):
        return None
    return s


def num(v) -> float | None:
    s = limpa(v)
    if s is None:
        return None
    s = s.replace("R$", "").replace(" ", "").replace("\xa0", "")
    if s.count(",") == 1 and s.count(".") >= 1:
        s = s.replace(".", "").replace(",", ".")
    elif s.count(",") == 1:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def inteiro(v) -> int | None:
    f = num(v)
    return int(f) if f is not None else None


def data_iso(v) -> str | None:
    s = limpa(v)
    if not s:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None


def post(tabela: str, linhas: list[dict], chunk: int = 500) -> int:
    """Insere em lotes. Sem upsert: truncamos antes, então é carga limpa.

    O PostgREST exige que todos os objetos de um mesmo lote tenham exatamente
    as mesmas chaves (PGRST102). Como alguns extratores só preenchem um campo
    quando ele existe na fonte (ex.: `antiguidade`, presente só para oficiais),
    normalizamos a união das chaves aqui — quem não tinha o campo vai com null.
    """
    if DRY:
        print(f"   [dry] {tabela}: {len(linhas)} linhas")
        return len(linhas)

    chaves = sorted({k for l in linhas for k in l})
    linhas = [{k: l.get(k) for k in chaves} for l in linhas]

    total = 0
    for i in range(0, len(linhas), chunk):
        lote = linhas[i : i + chunk]
        req = urllib.request.Request(
            f"{URL}/rest/v1/{tabela}",
            data=json.dumps(lote, ensure_ascii=False).encode("utf-8"),
            headers={
                "apikey": KEY,
                "Authorization": f"Bearer {KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                r.read()
            total += len(lote)
        except urllib.error.HTTPError as e:
            corpo = e.read().decode("utf-8", "replace")[:400]
            print(f"   ERRO {tabela} lote {i}: {e.code} {corpo}")
            raise
    return total


def limpar(tabela: str) -> None:
    """Carga idempotente: apaga tudo da tabela antes de reinserir. As p4_* são
    100% derivadas da rede — não há dado digitado no portal a preservar."""
    if DRY:
        print(f"   [dry] delete {tabela}")
        return
    req = urllib.request.Request(
        f"{URL}/rest/v1/{tabela}?id=gte.0",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "return=minimal"},
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            r.read()
    except urllib.error.HTTPError as e:
        print(f"   aviso delete {tabela}: {e.code}")


def indexar(header: list[str]) -> dict[str, int]:
    return {norm(h): i for i, h in enumerate(header) if limpa(h)}


def pega(linha: list[str], idx: dict[str, int], *nomes: str):
    """Primeiro cabeçalho que existir, dentre os aliases passados."""
    for n in nomes:
        i = idx.get(norm(n))
        if i is not None and i < len(linha):
            v = limpa(linha[i])
            if v is not None:
                return v
    return None


def abre(dados_dir: Path, padrao: str) -> dict | None:
    achados = sorted(dados_dir.glob(padrao))
    if not achados:
        print(f"   (sem arquivo para {padrao})")
        return None
    return json.loads(achados[0].read_text(encoding="utf-8"))


# ---------------------------------------------------------------- domínios

def ing_patrimonio(d: dict) -> list[dict]:
    rows = d["abas"]["PATRIMONIADO"]
    idx = indexar(rows[0])
    out, vistos = [], set()
    for r in rows[1:]:
        pat = pega(r, idx, "Patrimônio")
        if not pat or pat in vistos:
            continue
        vistos.add(pat)
        out.append({
            "patrimonio": pat,
            "tipo_mat": pega(r, idx, "TIPO_MAT"),
            "nome_material": pega(r, idx, "NOME DO MATERIAL"),
            "especificacao": pega(r, idx, "ESPECIFICAÇÃO DO MAT."),
            "valor": num(pega(r, idx, "VALOR")) or 0,
            "num_serie": pega(r, idx, "Nº SÉRIE(MTD)"),
            "num_serie_arma": pega(r, idx, "Nº SÉRIE ARMA"),
            "num_serie_colete": pega(r, idx, "Nº SÉRIE COLETE"),
            "placa_vtr": pega(r, idx, "PLACA VTR"),
            "opm_cod": pega(r, idx, "OPM", "OPMCOD"),
            "detentor_re": pega(r, idx, "DETENTOR"),
            "detentor_nome": pega(r, idx, "NOME_DTE"),
        })
    return out


def ing_lotes(d: dict) -> list[dict]:
    rows = d["abas"].get("LOTE", [])
    if not rows:
        return []
    idx = indexar(rows[0])
    out = []
    for r in rows[1:]:
        nome = pega(r, idx, "NOME")
        if not nome:
            continue
        out.append({
            "opm_cod": pega(r, idx, "OPMCOD"),
            "tipo_mat": pega(r, idx, "TIPO_MAT"),
            "nome": nome,
            "quantidade": inteiro(pega(r, idx, "QUANTIDADE")) or 0,
            "valor_unitario": num(pega(r, idx, "VALOR")) or 0,
            "divisao": pega(r, idx, "DIVISÃO"),
            "secao": pega(r, idx, "SEÇÃO"),
            "detentor_re": pega(r, idx, "DETENTOR"),
            "detentor_nome": pega(r, idx, "NOME_DTE"),
        })
    return out


CAT_BELICO = {
    "armasdeporte": "ARMA_PORTE",
    "armasdeportateis": "ARMA_PORTATIL",
    "armasportateis": "ARMA_PORTATIL",
    "colete": "COLETE",
    "algema": "ALGEMA",
    "algema1": "ALGEMA",
    "algema2": "ALGEMA",
}


def ing_belico(dados_dir: Path) -> list[dict]:
    mapa = {
        "GERAL": "belico-GERAL.json",
        "1ª Cia": "belico-1a-cia.json",
        "2ª Cia": "belico-2a-cia.json",
        "3ª Cia": "belico-3a-cia.json",
        "4ª Cia": "belico-4a-cia.json",
        "EM": "belico-EM.json",
        "FT": "belico-FT.json",
    }
    out = []
    for unidade, padrao in mapa.items():
        d = abre(dados_dir, padrao)
        if not d:
            continue
        vistos = set()
        for aba, rows in d["abas"].items():
            cat = CAT_BELICO.get(norm(aba))
            if not cat or len(rows) < 2:
                continue
            # cabeçalho = primeira linha que contenha 'ORDEM' ou 'PATRIMÔNIO'
            hi = next((i for i, r in enumerate(rows[:5])
                       if any(norm(c) in ("ordem", "npatrimonio") for c in r)), 0)
            idx = indexar(rows[hi])
            for r in rows[hi + 1:]:
                pat = pega(r, idx, "Nº PATRIMÔNIO")
                serie = pega(r, idx, "Nº SÉRIE")
                if not pat and not serie:
                    continue
                chave = (cat, pat or "", serie or "")
                if chave in vistos:      # 'ALGEMA' e 'ALGEMA (2)' são a mesma lista
                    continue
                vistos.add(chave)
                # Em parte das linhas o preenchedor pulou a coluna ESTADO e
                # digitou o RE ali (achado da carga de 19JUL2026: ~150 estados
                # eram RE de 6-7 dígitos). Nesse caso o valor é RE, não estado —
                # senão vira uma categoria falsa no gráfico "por estado".
                estado = pega(r, idx, "ESTADO")
                re_pm = pega(r, idx, "RE")
                if estado and re.fullmatch(r"\d{6,7}(-?\d)?", estado):
                    re_pm = re_pm or estado
                    estado = None
                out.append({
                    "unidade": unidade,
                    "categoria": cat,
                    "ordem": inteiro(pega(r, idx, "ORDEM")),
                    "tipo": pega(r, idx, "TIPO", "MODELO"),
                    "calibre": pega(r, idx, "CALIBRE"),
                    "num_serie": serie,
                    "patrimonio": pat,
                    "estado": estado,
                    "re": re_pm,
                    "dc": pega(r, idx, "DC"),
                    "nome": pega(r, idx, "NOME"),
                    "qtd_municoes": inteiro(pega(r, idx, "QTD MUNIÇÕES")),
                    "observacoes": pega(r, idx, "OBSERVAÇÕES(Caso ESTADO = OUTROS ou apreendida)",
                                        "OBSERVAÇÕES", "OBSERVAÇÃO"),
                })
    return out


# aba do SISTEL -> (classe, cabeçalho esperado para localizar a linha de header)
ABAS_TELEM = {
    "HT's": "HT",
    "TPD's": "TPD",
    "COMPUTADOR": "COMPUTADOR",
    "NOTEBOOK OFICIAIS": "NOTEBOOK",
    "CELULAR FUNCIONAL": "CELULAR",
    "IMPRESSORAS CONTRATADAS": "IMPRESSORA",
    "ETILÔMETRO": "ETILOMETRO",
    "ESTOQUE TELEMATICA": "ESTOQUE",
    "PARA DESCARGA": "DESCARGA",
}


RE_PATRIMONIO = re.compile(r"^[129]\d{8}$")


def _duplas(rows: list[list[str]], classe: str) -> list[dict]:
    """Abas onde DUAS tabelas convivem lado a lado na mesma linha (COMPUTADOR
    tem 'CARGA|PAT.|DATA|SITUAÇÃO' repetido; PARA DESCARGA idem). Mapear por
    nome de cabeçalho só enxerga a primeira metade e perde a segunda — então
    aqui varremos a linha inteira e criamos um registro por nº de patrimônio
    encontrado, usando a vizinhança para carga/situação."""
    out = []
    for r in rows:
        for i, celula in enumerate(r):
            v = limpa(celula)
            if not v or not RE_PATRIMONIO.match(v):
                continue
            janela = [limpa(x) for x in r[max(0, i - 3): i + 4]]
            sit = next((x for x in janela if x and x.upper() in
                        ("QRV", "OPERANDO", "MANUT.", "DESCARGA", "MANUTENÇÃO", "EXTRAVIADO")), None)
            out.append({
                "classe": classe, "patrimonio": v, "situacao": sit,
                "carga": next((x for x in r[max(0, i - 2): i] if limpa(x) and not RE_PATRIMONIO.match(limpa(x) or "")), None),
                "tipo": None, "marca": None, "modelo": None, "num_serie": None,
                "imei": None, "unidade": None, "re": None, "nome": None,
                "valor": None, "quantidade": None, "observacao": None,
            })
    return out


def ing_telematica(dados_dir: Path) -> tuple[list[dict], list[dict]]:
    ativos, rede = [], []
    d = abre(dados_dir, "sistel.json")
    if d:
        for aba, rows in d["abas"].items():
            classe = ABAS_TELEM.get(aba)
            if not classe or len(rows) < 2:
                continue
            if classe in ("COMPUTADOR", "DESCARGA"):
                ativos.extend(_duplas(rows, classe))
                continue
            hi = next((i for i, r in enumerate(rows[:8])
                       if any(norm(c) in ("patrimonio", "pat", "patrim", "codigo", "cod", "re", "qtde", "equip")
                              for c in r)), 0)
            idx = indexar(rows[hi])
            for r in rows[hi + 1:]:
                pat = pega(r, idx, "PATRIMONIO", "PATRIM.", "PAT.", "PATRIMÔNIO")
                # 'CELULAR FUNCIONAL' e 'IMPRESSORAS CONTRATADAS' não têm coluna
                # de produto/equipamento — o identificador delas é o MODELO.
                nome_it = pega(r, idx, "PRODUTO", "MATERIAL", "EQUIP.", "TIPO",
                               "MODELO", "DESCRIÇÃO")
                if not pat and not nome_it:
                    continue
                ativos.append({
                    "classe": classe,
                    "tipo": pega(r, idx, "TIPO", "EQUIP.", "PRODUTO", "MATERIAL"),
                    "marca": pega(r, idx, "MARCA"),
                    "modelo": pega(r, idx, "MODELO", "MODELO/MODELO", "ESPECIFICAÇÕES", "DESCRIÇÃO"),
                    "patrimonio": pat,
                    "num_serie": pega(r, idx, "N. SÉRIE", "NUMERO DE SÉRIE", "Nº DE SÉRIE", "Nº DE SERIE"),
                    "imei": pega(r, idx, "IMEI"),
                    "unidade": pega(r, idx, "UNID", "CARGA", "QTH", "LOCAL DA IMPRESSORA", "LOCAL", "BATALHÃO"),
                    "situacao": pega(r, idx, "SITUAÇÃO", "STATUS", "QRU"),
                    "carga": pega(r, idx, "CARGA"),
                    "re": pega(r, idx, "RE"),
                    "nome": pega(r, idx, "TITULAR FUNC.", "QRA", "NOME"),
                    "valor": num(pega(r, idx, "VALOR")),
                    "quantidade": inteiro(pega(r, idx, "QTDE", "QTE")),
                    "observacao": pega(r, idx, "OBS", "OBSERVAÇÃO", "OBSERVAÇÕES"),
                })
        # faixas de IP (aba IP's)
        for aba, rows in d["abas"].items():
            if norm(aba) != "ips":
                continue
            for r in rows:
                for c in r:
                    v = limpa(c)
                    if v and re.fullmatch(r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}", v):
                        rede.append({"unidade": None, "descricao": aba, "ip": v})

    d2 = abre(dados_dir, "ip-rede.json")
    if d2:
        for aba, rows in d2["abas"].items():
            for r in rows:
                for i, c in enumerate(r):
                    v = limpa(c)
                    if v and re.fullmatch(r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}", v):
                        desc = limpa(r[i + 1]) if i + 1 < len(r) else None
                        rede.append({"unidade": None, "descricao": desc, "ip": v})
    # dedup por IP
    vistos, rede_u = set(), []
    for x in rede:
        if x["ip"] in vistos:
            continue
        vistos.add(x["ip"])
        rede_u.append(x)
    return ativos, rede_u


def ing_efetivo(dados_dir: Path) -> list[dict]:
    out = []
    d = abre(dados_dir, "efetivo-atualizado.json")
    if d:
        for aba, rows in d["abas"].items():
            hi = next((i for i, r in enumerate(rows[:10])
                       if any(norm(c) == "posto grad".replace(" ", "") or norm(c) == "postograd" for c in r)), None)
            if hi is None:
                hi = next((i for i, r in enumerate(rows[:10]) if any(norm(c) == "re" for c in r)), 0)
            idx = indexar(rows[hi])
            for r in rows[hi + 1:]:
                nome = pega(r, idx, "N O M E", "NOME")
                if not nome or norm(nome) in ("nome", "nnome"):
                    continue
                out.append({
                    "ordem": inteiro(pega(r, idx, "ORDEM")),
                    "posto_grad": pega(r, idx, "POSTO / GRAD", "POSTO/GRAD", "POSTO"),
                    "re": pega(r, idx, "R E", "RE"),
                    "nome": nome,
                    "cia": pega(r, idx, "C I A", "CIA"),
                    "situacao": pega(r, idx, "SITUAÇÃO"),
                    "funcao": pega(r, idx, "FUNÇÃO"),
                    "fone": pega(r, idx, "FONE", "TELEFONE"),
                    "email": pega(r, idx, "E-MAIL"),
                })
    d2 = abre(dados_dir, "antiguidade-oficiais.json")
    if d2:
        por_re = {x["re"]: x for x in out if x.get("re")}
        for aba, rows in d2["abas"].items():
            hi = next((i for i, r in enumerate(rows[:10]) if any(norm(c) == "re" for c in r)), 0)
            idx = indexar(rows[hi])
            for r in rows[hi + 1:]:
                re_ = pega(r, idx, "R E", "RE")
                ordem = inteiro(pega(r, idx, "Nº", "N"))
                if not re_ or ordem is None:
                    continue
                if re_ in por_re:
                    por_re[re_]["antiguidade"] = ordem
    return out


def ing_inventario_secao(docs_json: Path) -> list[dict]:
    if not docs_json.exists():
        return []
    docs = json.loads(docs_json.read_text(encoding="utf-8"))
    out = []
    for doc in docs:
        arq = doc.get("arquivo", "")
        if "inventário de cada seção" not in arq and "INVENTÁRIO ALOJ" not in arq.upper():
            continue
        if "MODELO" in arq.upper():
            continue
        secao = Path(arq).stem.upper()
        for t in doc.get("tabelas", []):
            linhas = t["linhas"]
            if not linhas:
                continue
            idx = indexar(linhas[0])
            if norm("PATRIMÔNIO") not in idx:
                continue
            for r in linhas[1:]:
                pat = pega(r, idx, "PATRIMÔNIO")
                mat = pega(r, idx, "NOME DO MATERIAL")
                if not pat and not mat:
                    continue
                out.append({
                    "secao": secao,
                    "patrimonio": pat,
                    "nome_material": mat,
                    "especificacao": pega(r, idx, "ESPECIFICAÇÃO"),
                    "valor": num(pega(r, idx, "VALOR")),
                    "origem_arquivo": arq,
                })
    return out


def ing_coletes(dados_dir: Path) -> list[dict]:
    """Aba 'Romaneio': um PM por linha, com o colete que ele tem em carga e a
    validade dele — inclusive quem está '*SEM CARGA DE COLETE'. É esse o dado
    operacionalmente crítico (PM sem colete / colete vencendo), não a lista de
    coletes inativos, que é só o descarte."""
    d = abre(dados_dir, "romaneio-coletes.json")
    if not d:
        return []
    out = []

    rom = d["abas"].get("Romaneio", [])
    if rom:
        idx = indexar(rom[0])
        for r in rom[1:]:
            nome = pega(r, idx, "NOME")
            if not nome or norm(nome) == "nome":
                continue
            carga = pega(r, idx, "PAT. COL")          # 'POSSUI CARGA' ou '*SEM CARGA...'
            sem_carga = carga is None or carga.upper().startswith("*SEM")
            venc = data_iso(pega(r, idx, "VAL. COLETES"))
            tam = pega(r, idx, "TAMANHO")
            if tam and tam.upper().startswith("*SEM"):
                tam = None
            modelo = pega(r, idx, "MODELO COLETE")
            if modelo and modelo.upper().startswith("*SEM"):
                modelo = None
            out.append({
                "patrimonio": None,
                "nome_material": modelo,
                "num_serie": None,
                "opm": pega(r, idx, "OPM Atual"),
                "vencimento": venc,
                "ano_vencimento": int(venc[:4]) if venc else None,
                "status": "SEM CARGA" if sem_carga else "COM CARGA",
                "tamanho": tam,
                "status_carga": carga,
                "posto": pega(r, idx, "POSTO"),
                "nome": nome,
                "re": pega(r, idx, "RE"),
            })

    # Coletes inativos (carga do batalhão, fora de uso) — complementa o romaneio.
    ina = d["abas"].get("Inativos", [])
    if ina:
        idx = indexar(ina[0])
        for r in ina[1:]:
            pat = pega(r, idx, "PATRIMONIO")
            if not pat:
                continue
            venc = data_iso(pega(r, idx, "Vencimento"))
            out.append({
                "patrimonio": pat,
                "nome_material": pega(r, idx, "NOME"),
                "num_serie": pega(r, idx, "Nº Serie"),
                "opm": pega(r, idx, "OPM"),
                "vencimento": venc,
                "ano_vencimento": inteiro(pega(r, idx, "Ano_Venc.")) or (int(venc[:4]) if venc else None),
                "status": "INATIVO",
                "tamanho": pega(r, idx, "TAMANHO"),
                "status_carga": pega(r, idx, "STATUS CARGA"),
                "posto": pega(r, idx, "POSTO"),
            })
    return out


def ing_documentos() -> list[dict]:
    base = Path(BASE_REDE)
    if not base.exists():
        print("   rede indisponível — índice documental pulado")
        return []
    out = []
    for p in base.rglob("*"):
        if not p.is_file() or p.name.startswith("~$"):
            continue
        rel = p.relative_to(base)
        partes = rel.parts
        try:
            st = p.stat()
        except OSError:
            continue
        out.append({
            "categoria": partes[0] if len(partes) > 1 else "(raiz)",
            "subcategoria": "/".join(partes[1:-1]) or None,
            "nome_arquivo": p.name,
            "extensao": p.suffix.lower().lstrip("."),
            "caminho_unc": str(p),
            "bytes": st.st_size,
            "modificado_em": __import__("datetime").datetime.fromtimestamp(
                st.st_mtime, __import__("datetime").timezone.utc).isoformat(),
        })
    return out


def ing_fotos() -> list[dict]:
    """Catálogo gerado por scripts/thumbs_p4.py (thumbs em public/p4/fotos/)."""
    cat = RAIZ / "scripts" / "p4_fotos_catalogo.json"
    if not cat.exists():
        print("   (sem catálogo de fotos — rode scripts/thumbs_p4.py antes)")
        return []
    fotos = json.loads(cat.read_text(encoding="utf-8"))
    vistos, out = set(), []
    for f in fotos:
        if f["caminho_unc"] in vistos:
            continue
        vistos.add(f["caminho_unc"])
        out.append(f)
    return out


def kpis(pat, lotes, belico, telem, efetivo, inv, docs, coletes, fotos) -> list[dict]:
    k = []

    def add(fonte, dim, chave, valor):
        if chave is None or str(chave).strip() == "":
            return
        k.append({"fonte": fonte, "dimensao": dim, "chave": str(chave)[:120], "valor": float(valor)})

    add("lcm", "total", "ITENS_PATRIMONIADOS", len(pat))
    add("lcm", "total", "VALOR_TOTAL", round(sum(p["valor"] or 0 for p in pat), 2))
    for tipo, n in Counter(p["tipo_mat"] for p in pat if p["tipo_mat"]).items():
        add("lcm", "por_tipo", tipo, n)
    for tipo, v in Counter().__class__(
            {t: sum(p["valor"] or 0 for p in pat if p["tipo_mat"] == t)
             for t in {p["tipo_mat"] for p in pat if p["tipo_mat"]}}).items():
        add("lcm", "valor_por_tipo", tipo, round(v, 2))
    for opm, n in Counter(p["opm_cod"] for p in pat if p["opm_cod"]).items():
        add("lcm", "por_opm", opm, n)

    add("lotes", "total", "REGISTROS", len(lotes))
    add("lotes", "total", "ITENS", sum(l["quantidade"] or 0 for l in lotes))

    add("belico", "total", "REGISTROS", len(belico))
    for cat, n in Counter(b["categoria"] for b in belico).items():
        add("belico", "por_categoria", cat, n)
    for est, n in Counter(b["estado"] for b in belico if b["estado"]).items():
        add("belico", "por_estado", est.upper()[:60], n)
    for uni, n in Counter(b["unidade"] for b in belico if b["unidade"] != "GERAL").items():
        add("belico", "por_unidade", uni, n)

    add("telematica", "total", "ATIVOS", len(telem))
    for cl, n in Counter(t["classe"] for t in telem).items():
        add("telematica", "por_classe", cl, n)
    for si, n in Counter(t["situacao"] for t in telem if t["situacao"]).items():
        add("telematica", "por_situacao", si.upper()[:60], n)

    add("efetivo", "total", "EFETIVO", len(efetivo))
    for cia, n in Counter(e["cia"] for e in efetivo if e["cia"]).items():
        add("efetivo", "por_cia", cia, n)
    for sit, n in Counter(e["situacao"] for e in efetivo if e["situacao"]).items():
        add("efetivo", "por_situacao", sit, n)

    add("inventario_secao", "total", "ITENS", len(inv))
    for s, n in Counter(i["secao"] for i in inv).items():
        add("inventario_secao", "por_secao", s, n)

    add("documentos", "total", "ARQUIVOS", len(docs))
    add("documentos", "total", "BYTES", sum(d["bytes"] or 0 for d in docs))
    for c, n in Counter(d["categoria"] for d in docs).items():
        add("documentos", "por_categoria", c, n)
    for e, n in Counter(d["extensao"] for d in docs if d["extensao"]).items():
        add("documentos", "por_extensao", e, n)

    # Coletes: o que importa operacionalmente é PM sem colete e colete vencendo.
    romaneio = [c for c in coletes if c["status"] in ("COM CARGA", "SEM CARGA")]
    sem_carga = [c for c in romaneio if c["status"] == "SEM CARGA"]
    add("fotos", "total", "FOTOS", len(fotos))
    for u, n in Counter(f["unidade"] for f in fotos).items():
        add("fotos", "por_unidade", u, n)
    for c, n in Counter(f["categoria"] for f in fotos if f.get("categoria")).items():
        add("fotos", "por_categoria", c, n)

    add("coletes", "total", "PMS_NO_ROMANEIO", len(romaneio))
    add("coletes", "total", "PMS_SEM_COLETE", len(sem_carga))
    add("coletes", "total", "PMS_COM_COLETE", len(romaneio) - len(sem_carga))
    add("coletes", "total", "INATIVOS", sum(1 for c in coletes if c["status"] == "INATIVO"))
    ANO_REF = 2026
    add("coletes", "total", "VENCIDOS",
        sum(1 for c in romaneio if c["ano_vencimento"] and c["ano_vencimento"] < ANO_REF))
    add("coletes", "total", "VENCEM_ESTE_ANO",
        sum(1 for c in romaneio if c["ano_vencimento"] == ANO_REF))
    for ano, n in Counter(c["ano_vencimento"] for c in romaneio if c["ano_vencimento"]).items():
        add("coletes", "por_ano_vencimento", ano, n)
    for tam, n in Counter(c["tamanho"] for c in romaneio if c["tamanho"]).items():
        add("coletes", "por_tamanho", tam, n)

    # dedup (fonte,dimensao,chave) — a tabela tem unique nessa tripla
    visto, saida = set(), []
    for x in k:
        ch = (x["fonte"], x["dimensao"], x["chave"])
        if ch in visto:
            continue
        visto.add(ch)
        saida.append(x)
    return saida


def main() -> None:
    global DRY
    ap = argparse.ArgumentParser()
    ap.add_argument("--extraidos", required=True, help="dir com dados/*.json e docs.json")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    DRY = args.dry_run

    ex = Path(args.extraidos)
    dados = ex / "dados"
    docs_json = ex.parent / "docs.json"
    if not docs_json.exists():
        docs_json = ex / "docs.json"

    print("== extraindo dos JSONs ==")
    d_lcm = abre(dados, "lcm-completo.json")
    pat = ing_patrimonio(d_lcm) if d_lcm else []
    lotes = ing_lotes(d_lcm) if d_lcm else []
    belico = ing_belico(dados)
    telem, rede = ing_telematica(dados)
    efetivo = ing_efetivo(dados)
    inv = ing_inventario_secao(docs_json)
    coletes = ing_coletes(dados)
    print("== indexando a pasta de rede ==")
    docs = ing_documentos()
    fotos = ing_fotos()

    ks = kpis(pat, lotes, belico, telem, efetivo, inv, docs, coletes, fotos)

    fontes = [{
        "nome_arquivo": "#LCM - 16M - COMPLETO - 12JUN26.xlsx",
        "caminho_unc": rf"{BASE_REDE}\LCM\LCM - DL mais recente\#LCM - 16M - COMPLETO - 12JUN26.xlsx",
        "tipo": "xlsx", "linhas_reais": len(pat),
        "observacao": "Livro de Carga de Material completo — aba PATRIMONIADO + LOTE.",
    }, {
        "nome_arquivo": "SISTEL 16BPMM.xlsx",
        "caminho_unc": rf"{BASE_REDE}\TELEMÁTICA\SISTEL 16BPMM.xlsx",
        "tipo": "xlsx", "linhas_reais": len(telem),
        "observacao": "Ativos de telemática (HT, TPD, computador, notebook, celular, impressora, etilômetro).",
    }, {
        "nome_arquivo": "EFETIVO ATUALIZADO 15JUN.xlsx",
        "caminho_unc": rf"{BASE_REDE}\EFETIVO 2026\EFETIVO ATUALIZADO 15JUN.xlsx",
        "tipo": "xlsx", "linhas_reais": len(efetivo),
        "observacao": "Efetivo do batalhão por Cia/função.",
    }, {
        "nome_arquivo": "Planilha_de_Material_Belico (GERAL + 6 unidades)",
        "caminho_unc": rf"{BASE_REDE}\MATERIAL BÉLICO\INVENTÁRIO FOTOGRÁICO 2026",
        "tipo": "xlsx", "linhas_reais": len(belico),
        "observacao": "Armas de porte/portáteis, coletes e algemas por unidade, com estado e detentor.",
    }, {
        "nome_arquivo": "COPIA ROMANEIO DE COLETES - ATUALIZADA2.xlsx",
        "caminho_unc": rf"{BASE_REDE}\COPIA ROMANEIO DE COLETES - ATUALIZADA2.xlsx",
        "tipo": "xlsx", "linhas_reais": len(coletes),
        "observacao": "Coletes balísticos: romaneio, tamanho e vencimento.",
    }]

    plano = [
        ("p4_patrimonio", pat), ("p4_lotes", lotes), ("p4_material_belico", belico),
        ("p4_telematica_ativos", telem), ("p4_telematica_rede", rede),
        ("p4_efetivo", efetivo), ("p4_inventario_secao", inv), ("p4_coletes", coletes),
        ("p4_documentos", docs), ("p4_fotos_inventario", fotos), ("p4_kpi_agregados", ks), ("p4_arquivos_fonte", fontes),
    ]

    print("\n== carga ==")
    for tabela, linhas in plano:
        if not linhas:
            print(f"   {tabela}: 0 (nada a carregar)")
            continue
        limpar(tabela)
        n = post(tabela, linhas)
        print(f"   {tabela}: {n}")

    print(f"\nOK. Valor total sob carga: R$ {sum(p['valor'] or 0 for p in pat):,.2f}")


if __name__ == "__main__":
    main()
