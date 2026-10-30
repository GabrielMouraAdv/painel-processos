"""Le a pauta semanal do TCE-PE (.docx) e gera o JSON para scripts/importar-pauta-tce.ts.

Uso: py -I scripts/ler-pauta-docx.py <pauta.docx> <saida.json>

Dois formatos do documento sao aceitos:
  (a) titulo com data antes de cada tabela: "1ª Câmara — 27/10/2026", "Pleno — 26 a 30/10/2026";
  (b) titulo so com a camara ("1ª Câmara", "Pleno", "2ª Câmara") sob "SESSÕES PRESENCIAIS" /
      "SESSÕES VIRTUAIS"; a data vem da coluna "Câmara/Data" ("1ª Câm. 27/10", "Pleno 28/10",
      "2ª Câm. virtual") e a semana do cabecalho "PAUTA TCE-PE — 26/10 a 30/10/2026".
Cada tabela e uma sessao; o titulo e o paragrafo de camara mais proximo antes dela (um titulo
sem tabela, como "Pleno" virtual sem processos, e ignorado).
"""
import json
import re
import sys

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

entrada, saida = sys.argv[1], sys.argv[2]
d = docx.Document(entrada)

CAMARAS = {"1ª Câmara": "PRIMEIRA", "2ª Câmara": "SEGUNDA", "Pleno": "PLENO"}
# aceita hora no fim: "1ª Câmara — 03/11/2026, 10h"
RE_TITULO_COM_DATA = re.compile(r"^(1ª Câmara|2ª Câmara|Pleno) — (\d{2})(?: a (\d{2}))?/(\d{2})/(\d{4})(?:,.*)?$")
RE_TITULO_SIMPLES = re.compile(r"^(1ª Câmara|2ª Câmara|Pleno)$")
RE_SEMANA = re.compile(r"(\d{2})/(\d{2}) a (\d{2})/(\d{2})/(\d{4})")
RE_DIA_COLUNA = re.compile(r"(\d{2})/(\d{2})")

# Semana da pauta (formato b): "PAUTA TCE-PE — 26/10 a 30/10/2026".
semana = None
for p in d.paragraphs[:5]:
    m = RE_SEMANA.search(p.text)
    if m:
        semana = {"ini": m.group(1), "mes_ini": m.group(2), "fim": m.group(3), "mes_fim": m.group(4), "ano": m.group(5)}
        break


def blocos():
    """Paragrafos e tabelas na ordem do documento."""
    for child in d.element.body.iterchildren():
        tag = child.tag.split("}")[1]
        if tag == "p":
            yield Paragraph(child, d)
        elif tag == "tbl":
            yield Table(child, d)


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


def linhas_da_tabela(tab):
    itens, coluna_data = [], []
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
        objeto, relator, camdata, municipio, ano, resp, situacao, prov = cells[1:9]
        coluna_data.append(camdata)
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
    return itens, coluna_data


sessoes = []
virtual = False
titulo_pendente = None  # (texto, camara, data, periodo) do ultimo titulo visto
for b in blocos():
    if isinstance(b, Paragraph):
        t = b.text.strip()
        if not t:
            continue
        if t.upper().startswith("SESSÕES VIRTUAIS"):
            virtual = True
            continue
        if t.upper().startswith("SESSÕES PRESENCIAIS"):
            virtual = False
            continue
        m = RE_TITULO_COM_DATA.match(t)
        if m:
            ini, fim, mes, ano = m.group(2), m.group(3), m.group(4), m.group(5)
            titulo_pendente = (t, CAMARAS[m.group(1)], f"{ano}-{mes}-{ini}", f"{ini} a {fim}/{mes}/{ano}" if fim else None)
            continue
        m = RE_TITULO_SIMPLES.match(t)
        if m:
            titulo_pendente = (t, CAMARAS[m.group(1)], None, None)
        continue

    # tabela
    if titulo_pendente is None:
        sys.exit("tabela sem titulo de camara antes dela")
    texto, camara, data, periodo = titulo_pendente
    titulo_pendente = None
    itens, coluna_data = linhas_da_tabela(b)
    if not itens:
        continue
    if data is None:
        if semana is None:
            sys.exit("nao achei a semana no cabecalho (ex.: 'PAUTA TCE-PE — 26/10 a 30/10/2026')")
        if virtual:
            data = f"{semana['ano']}-{semana['mes_ini']}-{semana['ini']}"
            periodo = f"{semana['ini']} a {semana['fim']}/{semana['mes_fim']}/{semana['ano']}"
            texto = f"{texto} — {periodo}"
        else:
            dia = next((RE_DIA_COLUNA.search(c) for c in coluna_data if RE_DIA_COLUNA.search(c)), None)
            if not dia:
                sys.exit(f"sessao presencial '{texto}' sem data na coluna Câmara/Data")
            data = f"{semana['ano']}-{dia.group(2)}-{dia.group(1)}"
            texto = f"{texto} — {dia.group(1)}/{dia.group(2)}/{semana['ano']}"
    sessoes.append({"titulo": texto, "camara": camara, "data": data, "virtual": virtual, "periodo": periodo, "itens": itens})

if not sessoes:
    sys.exit("nenhuma sessao com processos encontrada")

json.dump({"sessoes": sessoes}, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s in sessoes:
    print(s["titulo"], "| virtual" if s["virtual"] else "", "|", len(s["itens"]), "itens:", [i["numeroProcesso"] for i in s["itens"]])
