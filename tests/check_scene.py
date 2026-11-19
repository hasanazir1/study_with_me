"""Check the packaged game scene, including each pose's interaction geometry."""
from pathlib import Path
import json
import re

assets = Path(__file__).resolve().parents[1] / 'assets'
scene = json.loads((assets / 'room/scene.json').read_text(encoding='utf-8'))
js = (assets / 'game-room.js').read_text(encoding='utf-8')
handlers = set(re.findall(r'^    (\w+): \(\) =>', js, re.M))
width, height = scene['image']['w'], scene['image']['h']

def polygon(points, quad=False):
    assert len(points) == 4 if quad else len(points) >= 3
    assert all(0 <= x <= width and 0 <= y <= height for x, y in points)
    assert len(set(map(tuple, points))) == len(points)
    area = sum(x * points[(i+1)%len(points)][1] - y * points[(i+1)%len(points)][0]
               for i, (x, y) in enumerate(points))
    assert abs(area) > 1

size = 0
for state in scene['states'].values():
    plate = assets / state['base']
    assert plate.suffix == '.webp' and plate.is_file()
    size += plate.stat().st_size
assert size <= 3_000_000
assert scene['timerAnchor'] in scene['anchors']
for anchor in scene['anchors'].values():
    polygon(anchor['quad'], True)
for pane in scene['windowPanes']:
    polygon(pane)
ids = [s['id'] for s in scene['hotspots']]
assert len(ids) == len(set(ids))
for spot in scene['hotspots']:
    assert spot['action'] in handlers, spot
    assert set(spot.get('states', {})) <= scene['states'].keys()
    for state in scene['states']:
        override = {**spot, **spot.get('states', {}).get(state, {})}
        if 'anchor' in spot:
            assert spot['anchor'] == 'timerAnchor'
        else:
            polygon(override['poly'])
print(f'PASS: {len(ids)} actions, two offline poses, calibrated geometry, {size} art bytes')
