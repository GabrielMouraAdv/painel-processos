"""Le a pauta semanal do TCE-PE (.docx) e gera o JSON para scripts/importar-pauta-tce.ts.

Uso: py -I ler_pauta.py <pauta.docx> <saida.json>
Cada tabela do documento e uma sessao, na ordem dos titulos (presenciais, depois virtuais).
"""
import json
import re
import sys

import docx

entrada, saida = sys.argv[1], sys.argv[2]
d = docx.Document(entrada)

# Titulos das sessoes na ordem em que as tabelas aparecem.
MESES = {}
titulos = []
virtual = False
for p in d.paragraphs:
    t = p.text.strip()
    if t.upper().startswith("SESSÕES VIRTUAIS"):
        virtual = True
    m = re.match(r"^(1ª Câmara|2ª Câmara|Pleno) — (\d{2})(?: a (\d{2}))?/(\d{2})/(\d{4})$", t)
    if m:
        camara = {"1ª Câmara": "PRIMEIRA", "2ª Câmara": "SEGUNDA", "Pleno": "PLENO"}[m.group(1)]
        ini, fim, mes, ano = m.group(2), m.group(3), m.group(4), m.group(5)
        titulos.append({
            "titulo": t, "camara": camara, "data": f"{ano}-{mes}-{ini}", "virtual": virtual,
            "periodo": f"{ini} a {fim}/{mes}/{ano}" if fim else None,
        })

if len(titulos) != len(d.tables):
    sys.exit(f"titulos ({len(titulos)}) e tabelas ({len(d.tables)}) nao batem")


def numero_painel(bruto):
    """251010867ED001 -> 25101086-7ED001; 22191150 -> 2219115-0."""
    m = re.match(r"^(\d+)([A-Z]{2}\d{3})?$", bruto)
    if not m:
        return bruto
    dig, suf = m.group(1), m.group(2) or ""
    return f"{dig[:-1]}-{dig[-1]}{suf}"


def vazio(s):
    s = (s or "").strip()
    return None if s in ("", "-", "—") else s


sessoes = []
for info, tab in zip(titulos, d.tables):
    itens = []
    for r in tab.rows[1:]:
        cells, prev = [], None
        for c in r.cells:
            if c._tc is prev:
                continue
            prev = c._tc
            cells.append(c.text.strip())
        if len(cells) < 9 or not cells[0]:
            continue
        num_bruto, _, titulo = cells[0].partition(" - ")
        objeto, relator, _camdata, municipio, ano, resp, situacao, prov = cells[1:9]
        itens.append({
            "numeroDocumento": num_bruto.strip(),
            "numeroProcesso": numero_painel(num_bruto.strip()),
            "tituloProcesso": vazio(titulo),
            "objeto": vazio(objeto),
            "relator": relator.strip(),
            "municipio": municipio.strip(),
            "exercicio": vazio(ano),
            "advogadoResp": resp.strip(),
            "situacao": vazio(situacao),
            "providencia": vazio(prov),
        })
    sessoes.append({**info, "itens": itens})

json.dump({"sessoes": sessoes}, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s in sessoes:
    print(s["titulo"], "| virtual" if s["virtual"] else "", "|", len(s["itens"]), "itens:", [i["numeroProcesso"] for i in s["itens"]])
