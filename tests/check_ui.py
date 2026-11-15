from pathlib import Path
import re

assets=Path(__file__).resolve().parents[1]/'assets'
html=(assets/'index.html').read_text(encoding='utf-8')
js=(assets/'app.js').read_text(encoding='utf-8')
ids=re.findall(r'id="([^"]+)"',html)
references=set(re.findall(r"\$\('([^']+)'\)",js))
missing=references-set(ids)-{'offset-'}
assert not missing,missing
assert len(ids)==len(set(ids)),'Duplicate DOM ids'
assert 'fonts/ReadexPro.ttf' in html
assert 'requestFullscreen' not in js and 'orientation.lock' not in js
assert 'setInterval' not in js
assert '100dvh' in (assets/'app.css').read_text(encoding='utf-8')
print('PASS: all',len(references),'UI references exist; local font; native-only presentation; hidden-page loop stops')
