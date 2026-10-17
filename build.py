#!/usr/bin/env python3
"""Gera os sites HTML autocontidos, sem dependências adicionais.

A página dos jogadores (site/index.html) é sempre gerada. O escudo do Mestre
só é gerado quando src/escudo_mestre.html e src/mestre.js existem: esses
arquivos ficam apenas no computador do Mestre e nunca vão para o repositório
público (ver .gitignore).

Cada página recebe o style.css e, em ordem, os seus arquivos .js (o sala.js,
da sala ao vivo, é compartilhado pelas duas)."""
from pathlib import Path
p=Path(__file__).resolve().parent
source=p/'src'; out=p/'site'; out.mkdir(exist_ok=True)
css=(source/'style.css').read_text(encoding='utf-8')
for template,scripts,filename,opcional in [('jogadores.html',['sala.js','jogadores.js'],'index.html',False),('escudo_mestre.html',['sala.js','mestre.js'],'escudo_mestre.html',True)]:
    if opcional and not ((source/template).exists() and (source/scripts[-1]).exists()):
        print(f'Pulado: {out/filename} (arquivos do escudo não estão nesta pasta)')
        continue
    html=(source/template).read_text(encoding='utf-8')
    assert '/*CSS_INLINE*/' in html and '/*JS_INLINE*/' in html, f'Placeholders ausentes: {template}'
    js='\n'.join((source/s).read_text(encoding='utf-8') for s in scripts)
    html=html.replace('/*CSS_INLINE*/',css).replace('/*JS_INLINE*/',js)
    (out/filename).write_text(html,encoding='utf-8')
    print(f'Gerado: {out/filename}')
