"""Offline asset integrity and mix headroom checks, using only Python's standard library."""
from pathlib import Path
import array,hashlib,json,math,sys,wave
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'assets/scenes.json').read_text(encoding='utf-8'))
report=json.loads((root/'assets/audio/analysis.json').read_text(encoding='utf-8'))
peaks={};hashes=set()
for name,expected in report.items():
    path=root/'assets/audio'/f'{name}.wav'
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest==expected['sha256'],f'{name}: asset changed without regenerating analysis'
    assert digest not in hashes,'Duplicated audio';hashes.add(digest)
    with wave.open(str(path))as f:
        assert (f.getnchannels(),f.getsampwidth(),f.getframerate(),f.getnframes())==(2,2,32000,1920000),name
        pcm=array.array('h',f.readframes(f.getnframes()))
    if sys.byteorder!='little':pcm.byteswap()
    peak=max(abs(x)for x in pcm)/32768;peaks[name+'.wav']=peak
    assert peak<.90,f'{name}: insufficient headroom'
    sampled=pcm[::32]
    assert any(pcm[i]!=pcm[i+1] for i in range(0,len(pcm),320)),f'{name}: duplicated mono'
    # A periodic recording boundary should look like an ordinary adjacent sample.
    ordinary=sorted(abs(pcm[i]-pcm[i-2])for i in range(2,len(pcm),320))
    limit=ordinary[int(len(ordinary)*.999)]+16
    assert max(abs(pcm[0]-pcm[-2]),abs(pcm[1]-pcm[-1]))<=limit,f'{name}: discontinuity at wrap'
    assert min(sum(x*x for x in pcm[i:i+64000:16])/4000 for i in range(0,len(pcm),64000))>1000,f'{name}: silence in loop'
for preset in catalog:
    if not preset['layers']:continue
    assert sum(peaks[layer['file']]*layer['gain'] for layer in preset['layers'])*.86<.99, f"{preset['id']}: mix can clip with sliders at 100%"
assert len(hashes)==7
print('PASS: seven distinct 60s stereo loops, source hashes, headroom, non-mono channels, continuous boundaries and maximum-level mix safety')
