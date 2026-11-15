"""Original, periodic procedural soundscapes; no third-party recordings."""
from pathlib import Path
import wave
import numpy as np

out = Path(__file__).resolve().parents[1] / 'assets/audio'
out.mkdir(parents=True, exist_ok=True)
rate, seconds = 22050, 24
n = rate * seconds
rng = np.random.default_rng(14062026)
freq = np.fft.rfftfreq(n, 1 / rate)
time = np.arange(n) / rate

def colored(power, low=30, high=8000):
    spectrum = rng.normal(size=len(freq)) + 1j * rng.normal(size=len(freq))
    shape = np.maximum(freq, low) ** (-power / 2)
    shape *= 1 / np.sqrt(1 + (freq / high) ** 6)
    shape[0] = 0
    samples = np.fft.irfft(spectrum * shape, n=n)
    return samples / np.std(samples)

rain = .72 * colored(.3, 100, 6800) + .18 * colored(1.3, 50, 1500)
rain *= .84 + .08*np.sin(2*np.pi*time/24) + .04*np.sin(2*np.pi*time/8)
ocean = colored(.65, 60, 4000) * (.22 + .78 * (.5 + .5*np.sin(2*np.pi*time/8))**1.7)
ocean += .08 * colored(1.7, 30, 900)
stream = .65*colored(.55, 180, 6500) * (1 + .12*np.sin(2*np.pi*time/3) + .06*np.sin(2*np.pi*time/.75))
for f in [311, 443, 557, 719]:
    # Whole cycles keep the loop periodic.
    f = round(f*seconds)/seconds
    stream += .018*np.sin(2*np.pi*f*time + .2*np.sin(2*np.pi*time/2))
brown = colored(2, 22, 2200)

for name, signal in [('rain',rain),('ocean',ocean),('stream',stream),('brown',brown)]:
    signal = np.tanh(signal * .45)
    signal *= .6 / max(np.max(np.abs(signal)), .01)
    pcm=(signal*32767).astype('<i2')
    with wave.open(str(out / (name+'.wav')), 'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
    assert len(pcm) == n and np.max(np.abs(pcm.astype(np.int32))) < 32767
    print(name, len(pcm)/rate, 'seconds')
