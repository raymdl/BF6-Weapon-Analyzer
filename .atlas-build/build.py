"""One-time standalone HTML export of the committed data-flow Markdown."""
from pathlib import Path
import html
import json
import posixpath
import re
import subprocess
from urllib.parse import urlsplit

import markdown
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.atlas-build'
OUT = WORK / 'output'
OUT.mkdir(parents=True, exist_ok=True)
DOC_REF = '297eaad838d3d60c132ee0ecca8bdc4edfd74c48'
CODE_REF = 'd037503e1159ab8eb6533e292de5ed33206f0f30'
REPO = 'https://github.com/raymdl/BF6-Weapon-Analyzer'
SECTIONS = [
    ('README.md', 'readme', 'Overview'),
    ('SOURCES.md', 'sources', 'Sources & ingestion'),
    ('LOADOUTS.md', 'loadouts', 'Loadouts & statistics'),
    ('DAMAGE_BALLISTICS.md', 'damage_ballistics', 'Damage & ballistics'),
    ('RECOIL_SPREAD.md', 'recoil_spread', 'Recoil & spread'),
    ('TARGET.md', 'target', 'Target impacts'),
    ('UI_PUBLISHING.md', 'ui_publishing', 'UI & publication'),
    ('REGISTER.md', 'register', 'Ownership & assumptions'),
]
LOCAL = {f'docs/data-flow/{name}': sid for name, sid, _ in SECTIONS}
config = {
    'theme':'base', 'fontFamily':'Arial, sans-serif',
    'themeVariables':{'fontSize':'15px', 'primaryColor':'#fff4dd', 'primaryTextColor':'#182331', 'lineColor':'#637384'},
    'flowchart':{'htmlLabels':True, 'nodeSpacing':28, 'rankSpacing':42, 'useMaxWidth':False},
    'securityLevel':'strict',
}
(WORK / 'mermaid.json').write_text(json.dumps(config))
(WORK / 'puppeteer.json').write_text(json.dumps({'args':['--no-sandbox']}))
CLI = str(WORK / 'node_modules/.bin/mmdc')
count = 0
sections = []

for filename, sid, title in SECTIONS:
    source = (ROOT / 'docs/data-flow' / filename).read_text(encoding='utf-8')
    # GFM table cells require escaped pipes even inside inline code.
    source = '\n'.join(re.sub(r'`([^`]+)`', lambda m: '`' + re.sub(r'(?<!\\)\|', r'\\|', m.group(1)) + '`', line) if line.lstrip().startswith('|') else line for line in source.splitlines())
    diagrams = []
    def placeholder(match):
        index = len(diagrams) + 1
        diagrams.append((index, match.group(1)))
        return f'\n<div data-diagram="{index}"></div>\n'
    source = re.sub(r'```mermaid\s*\n(.*?)\n```', placeholder, source, flags=re.S)
    soup = BeautifulSoup(markdown.markdown(source, extensions=['tables','fenced_code','toc']), 'html.parser')
    for heading in soup.select('h1,h2,h3,h4,h5,h6'):
        heading['id'] = sid if heading.name == 'h1' else sid + '--' + heading.get('id', '')
    for anchor in soup.select('a[href]'):
        url = anchor['href']
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc:
            anchor['target'] = '_blank'
            anchor['rel'] = ['noopener']
            continue
        if not parsed.path:
            anchor['href'] = '#' + sid + ('--' + parsed.fragment if parsed.fragment else '')
            continue
        path = posixpath.normpath(posixpath.join('docs/data-flow', parsed.path))
        if path in LOCAL:
            anchor['href'] = '#' + LOCAL[path] + ('--' + parsed.fragment if parsed.fragment else '')
        else:
            ref = DOC_REF if path.endswith('.md') else CODE_REF
            anchor['href'] = REPO + '/blob/' + ref + '/' + path + ('#' + parsed.fragment if parsed.fragment else '')
            anchor['target'] = '_blank'
            anchor['rel'] = ['noopener']
    for index, code in diagrams:
        count += 1
        key = f'{sid}-{index}'
        inp, svg_path = WORK / f'{key}.mmd', WORK / f'{key}.svg'
        inp.write_text(code, encoding='utf-8')
        subprocess.run([CLI, '-i', str(inp), '-o', str(svg_path), '-c', str(WORK/'mermaid.json'), '-p', str(WORK/'puppeteer.json'), '-b','transparent'], check=True)
        svg = svg_path.read_text(encoding='utf-8')
        # Namespace all SVG IDs so inline diagrams and their markers remain independent.
        identifiers = re.findall(r'\bid="([^"]+)"', svg)
        for old in sorted(set(identifiers), key=len, reverse=True):
            new = f'diagram-{key}-{old}'
            svg = svg.replace('id="' + old + '"', 'id="' + new + '"')
            svg = re.sub(r'#' + re.escape(old) + r'(?=[^\w-]|$)', '#' + new, svg)
        viewbox = re.search(r'viewBox="([^"]+)"', svg)
        if not viewbox:
            raise ValueError(f'No viewBox: {key}')
        _, _, width, height = map(float, viewbox.group(1).split())
        marker = soup.find('div', attrs={'data-diagram':str(index)})
        heading = marker.find_previous(['h2','h3','h1'])
        label = heading.get_text(' ', strip=True) if heading else title
        figure = f'<figure id="figure-{key}" data-width="{width}" data-height="{height}"><figcaption><span>FIGURE {count:02d} <b>{html.escape(label)}</b></span><button type="button" class="expand" data-figure="figure-{key}" aria-label="Enlarge {html.escape(label, quote=True)}">Enlarge ↗</button></figcaption><div class="diagram">{svg}</div></figure>'
        marker.replace_with(BeautifulSoup(figure, 'html.parser'))
    sections.append(f'<section class="chapter" data-chapter="{sid}" aria-label="{html.escape(title, quote=True)}">{soup}</section>')

assert count == 23, count
nav = ''.join(f'<a href="#{sid}" data-nav="{sid}"><span>{i:02d}</span>{html.escape(title)}</a>' for i, (_, sid, title) in enumerate(SECTIONS, 1))
template = (WORK / 'viewer.html').read_text(encoding='utf-8')
result = template.replace('@@NAV@@', nav).replace('@@SECTIONS@@', '\n'.join(sections))
assert '@@' not in result
page = BeautifulSoup(result, 'html.parser')
ids = [tag['id'] for tag in page.select('[id]')]
assert len(ids) == len(set(ids)), 'Duplicate HTML/SVG IDs'
broken = [a['href'] for a in page.select('a[href^="#"]') if a['href'][1:] not in ids]
assert not broken, broken
assert len(page.select('figure svg')) == 23
assert len(page.select('.chapter')) == 8
assert not page.select('script[src], link[rel="stylesheet"], img[src]'), 'Viewer must be self-contained'
assert 'Trace every site result to its inputs.' not in result
# Check the recoil fallback table row survived the literal || operator.
row = next(tr for tr in page.select('tr') if 'Recoil duration missing or resolved zero' in tr.get_text())
assert len(row.select('td')) == 3 and '0.025' in row.get_text() and '25 ms' in row.get_text()
(OUT/'index.html').write_text(result, encoding='utf-8')
print(f'Generated {count} diagrams in {len(sections)} sections; {len(result.encode())} bytes')
