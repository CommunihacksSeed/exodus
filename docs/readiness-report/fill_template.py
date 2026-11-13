"""Fill the organizers' submission template with the draft text. Team fields are left blank."""
import re, sys, zipfile
from xml.sax.saxutils import escape

SRC, OUT, MD = sys.argv[1:4]

FIELDS = {
    'project_name': 'Clear Council',
    'problem': (
        'Residents cannot tell from a council agenda what is proposed near them, who has decided it, '
        'or whether they can still comment. An item can span several meetings and a 30-page report. We focused on '
        'explaining real items accurately: staff advice kept apart from committee and Council decisions, '
        'conditions preserved, and participation shown only as the City states it.'
    ),
    'solution': (
        'Clear Council gives each agenda item one web page. Residents see a plain-language summary, a map with the '
        'distance from their address, a route showing which body has decided what, and how to comment. Clerks and '
        'councillors’ offices can share it. Every sentence shows the passage it rests on, checked word for word '
        'by software before publishing.'
    ),
    'what_changes': (
        'Today the record is published but not explained. Clear Council explains it without loosening accuracy: '
        'unverified text cannot be published and deadlines are never guessed. Tested on three Toronto items.'
    ),
    'piloted': (
        'Ready: item pages, source checking, decision route, address distance and print view, for three items. '
        'Not built: automatic intake of new items, a staff review screen, alerts. Next priority: other languages, '
        'and a phone or paper channel for offline residents.'
    ),
    'scaling': (
        'Adapting: only the page reader is Toronto-specific. A city on eSCRIBE or Legistar needs one adapter, its '
        'ward map and its address lookup. One adapter serves every municipality on that system, in any province.\n'
        'Before a pilot: connect the city’s own meeting feed; have a clerk sign off each summary (about 10 to 15 '
        'minutes per item, our untested estimate); run an accessibility audit; add French and local languages.\n'
        'Rough cost: hosting under $25 a month. The real cost is staff review time.\n'
        'Privacy: no accounts, cookies or analytics. Residents’ names are never stored. A typed address goes '
        'only to the city’s own lookup.\n'
        'Residents should know: the summary is a guide and the City record is the authority.'
    ),
}

TABLE = [
    ('Council item pages, staff reports, public notice',
     'City of Toronto (TMMIS, toronto.ca), retrieved 2026-11-12; assumed current then'),
    ('City Wards; Council Voting Record', 'Toronto Open Data'),
    ('Address lookup; base map', 'City of Toronto geocoder; OpenStreetMap'),
    ('React, Leaflet, cheerio, pdf.js', 'Open-source libraries'),
    ('Claude (Anthropic)',
     'Wrote code and drafted summaries; software verified every quote. No AI on the live site'),
]
_n = sum(len((d + ' ' + s_).split()) for d, s_ in TABLE)
print(f'data table: {_n}/60 words'); assert _n <= 60

LIMITS = {'problem': 60, 'solution': 60, 'what_changes': 30, 'piloted': 40}
for k, limit in LIMITS.items():
    n = len(FIELDS[k].split())
    print(f'{k}: {n}/{limit} words', '' if n <= limit else '  <-- OVER')
    assert n <= limit, k
print('scaling:', len(FIELDS['scaling'].split()), 'words (no limit stated)')

zin = zipfile.ZipFile(SRC)
doc = zin.read('word/document.xml').decode('utf8')

def run(text):
    parts = text.split('\n')
    body = '<w:br/>'.join(f'<w:t xml:space="preserve">{escape(p)}</w:t>' for p in parts)
    return body

def fill_sdt(m):
    s = m.group(0)
    tag = re.search(r'w:tag w:val="([^"]*)"', s).group(1)
    if tag not in FIELDS:
        return s
    s = s.replace('<w:showingPlcHdr/>', '')
    head, content = s.split('<w:sdtContent>', 1)
    content = content.replace('<w:color w:val="77746F"/>', '<w:color w:val="000000"/>')
    content = re.sub(r'<w:t[^>]*>[^<]*</w:t>', run(FIELDS[tag]), content, count=1)
    return head + '<w:sdtContent>' + content

doc = re.sub(r'<w:sdt>.*?</w:sdt>', fill_sdt, doc, flags=re.S)

# Data table: fill the blank rows, adding rows when there are more entries than blanks.
i = doc.find('>Dataset<'); a = doc.rfind('<w:tbl>', 0, i); b = doc.find('</w:tbl>', i) + len('</w:tbl>')
tbl = doc[a:b]
rows = re.findall(r'<w:tr[ >].*?</w:tr>', tbl, flags=re.S)
header, blank = rows[0], rows[1]
def fill_row(pair):
    cells = iter(pair)
    def cell(m):
        text = next(cells)
        return m.group(0) + f'<w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'
    return re.sub(r'</w:pPr>', cell, blank)
new_tbl = tbl[:tbl.find(rows[1])] + ''.join(fill_row(p) for p in TABLE) + tbl[tbl.find(rows[-1]) + len(rows[-1]):]
doc = doc[:a] + new_tbl + doc[b:]

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename.startswith('[trash]'):
            continue
        data = doc.encode('utf8') if item.filename == 'word/document.xml' else zin.read(item.filename)
        zout.writestr(item, data)

md = ['# Municipal Readiness Report — draft text', '',
      'Text for the organizers’ one-page template (`CIVIC-Hack_submission-template.docx`).',
      'The filled template is `readiness-report-draft.docx` in this folder. Team name, contact email and',
      'member details still need to be added before exporting it to PDF.', '',
      '**Project name:** Clear Council', '']
for key, title in [('problem', 'The problem (60 words)'), ('solution', 'Your solution (60 words)'),
                   ('what_changes', 'What changes (30 words)')]:
    md += [f'## {title}', '', FIELDS[key], '']
md += ['## Data sources and tools', '', '| Dataset / tool | Source and assumptions |', '|---|---|']
md += [f'| {d} | {s} |' for d, s in TABLE] + ['']
md += ['## What could be piloted today (40 words)', '', FIELDS['piloted'], '',
       '## Adopting or scaling it', '', FIELDS['scaling'].replace('\n', '\n\n'), '']
open(MD, 'w').write('\n'.join(md))
print('wrote', OUT)
