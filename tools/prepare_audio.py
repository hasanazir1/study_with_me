"""Prepare bundled 60-second stereo loops. Python + numpy/scipy; ffmpeg for recordings.

Normal APK builds use the committed assets; this is an optional, deterministic asset tool.
Pass --sources DIR containing rain/window/ocean/stream.mp3 (see docs/AUDIO.md).
With no sources it produces explicitly procedural alternatives, never downloads anything.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, wave
import numpy as np
from scipy import signal, ndimage

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--sources',type=Path);args=p.parse_args()
RATE=32000;SECONDS=60;N=RATE*SECONDS
rng=np.random.default_rng(16112026)
t=np.arange(N)/RATE
freq=np.fft.rfftfreq(N,1/RATE)

def noise(power,low=45,high=7000):
    shape=np.maximum(freq,low)**(-power/2)/(1+(freq/high)**6)**.5
    shape[0]=0
    def channel():
        z=np.fft.irfft((rng.normal(size=len(freq))+1j*rng.normal(size=len(freq)))*shape,n=N)
        return z/np.std(z)
    common=channel();return np.column_stack([.75*common+.5*channel(),.75*common+.5*channel()])

def periodic_recording(path):
    # Decode without quality claims: WAV conversion does not restore lossy MP3 detail.
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-t','180','-f','f32le','-ac','2','-ar',str(RATE),'-'])
    x=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(np.float64)
    fade=RATE
    if len(x)<N+fade:
        # Rain source is 61.096 s. Fail instead of silently repeating a short recording.
        raise ValueError(f'{path}: need at least 61 seconds, got {len(x)/RATE}')
    # Choose the quietest 61-second section, avoiding isolated high-energy events.
    candidates=list(range(0,len(x)-N-fade+1,RATE*5)) or [0]
    start=min(candidates,key=lambda i:np.percentile(np.mean(x[i:i+N+fade].reshape(-1,2)**2,axis=1)[::320],99))
    x=x[start:start+N+fade]
    sos=signal.butter(3,[55,8000],btype='bandpass',fs=RATE,output='sos')
    x=signal.sosfiltfilt(sos,x,axis=0)
    # Gentle linked-stereo gain riding; no hard limiter or sudden changes.
    rms=np.sqrt(ndimage.uniform_filter1d(np.mean(x*x,axis=1),RATE//2,mode='nearest')+1e-10)
    gain=np.minimum(1,(np.median(rms)*1.5/(rms+1e-8))**.6)
    gain=ndimage.uniform_filter1d(gain,RATE//6,mode='nearest')
    x*=gain[:,None]
    theta=np.linspace(0,np.pi/2,fade,endpoint=True)
    head=x[N:N+fade]*np.cos(theta)[:,None]+x[:fade]*np.sin(theta)[:,None]
    return np.concatenate([head,x[fade:N]])

def write(name,x,recorded=False):
    x=x-np.mean(x,axis=0)
    x*=.22/max(np.sqrt(np.mean(x*x)),1e-9)
    # Offline soft peak control, with conservative headroom.
    if np.max(np.abs(x))>.68:
        x=.68*np.tanh(x/.68)
        x*=.22/np.sqrt(np.mean(x*x))
    assert np.max(np.abs(x))<.90
    pcm=np.rint(x*32767).astype('<i2')
    target=ROOT/'assets/audio'/f'{name}.wav'
    with wave.open(str(target),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
    report[name]={'source':'CC0 recording' if recorded else 'procedural','seconds':SECONDS,'sampleRate':RATE,'channels':2,'rmsDbFS':round(20*np.log10(np.sqrt(np.mean((pcm.astype(float)/32768)**2))),2),'peakDbFS':round(20*np.log10(np.max(np.abs(pcm.astype(float)))/32768),2),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(name,report[name]['source'],report[name]['rmsDbFS'],'dBFS',flush=True)

report={}
(ROOT/'assets/audio').mkdir(exist_ok=True)
for name in ['rain','window','ocean','stream','wind']:
    source=args.sources/f'{name}.mp3' if args.sources else None
    if source and source.is_file() and name!='wind':write(name,periodic_recording(source),True);continue
    x=noise({'rain':.45,'window':.9,'ocean':1.1,'stream':.7,'wind':1.6}[name])
    if name=='ocean':x*= (.35+.65*(.5+.5*np.sin(2*np.pi*t/10))**1.8)[:,None]
    if name=='stream':x*= (1+.12*np.sin(2*np.pi*t/3)+.08*np.sin(2*np.pi*t/.6))[:,None]
    write(name,x)
write('brown',noise(2,45,2200))
# Quiet resonant bubble texture: hundreds of soft, different, stereo droplets.
bubbles=np.zeros((N,2))
for _ in range(600):
    start=int(rng.integers(N));duration=int(RATE*rng.uniform(.04,.17));u=np.arange(duration)/RATE
    tone=np.sin(2*np.pi*(rng.uniform(300,800)*u-300*u*u))*np.sin(np.pi*np.arange(duration)/duration)**2*np.exp(-u*18)
    pan=rng.uniform(.2,.8);indexes=(start+np.arange(duration))%N
    bubbles[indexes,0]+=tone*np.sqrt(pan);bubbles[indexes,1]+=tone*np.sqrt(1-pan)
write('bubbles',.6*bubbles+.22*noise(1.2,180,2000))
(ROOT/'assets/audio/analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Gentle two-note completion cue, stored as a native notification resource.
u=np.arange(int(RATE*2.6))/RATE;chime=np.zeros(len(u))
for start,hz in [(0,523.251),(.65,659.255)]:
    v=np.maximum(0,u-start);envelope=(1-np.exp(-v*50))*np.exp(-v*2.1)*(u>=start)
    chime+=envelope*(np.sin(2*np.pi*hz*v)+.18*np.sin(2*np.pi*hz*2*v))
chime*=.30/max(abs(chime));chime[-RATE//8:]*=np.linspace(1,0,RATE//8)
(ROOT/'res/raw').mkdir(exist_ok=True)
with wave.open(str(ROOT/'res/raw/session_end.wav'),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(np.rint(chime*32767).astype('<i2').tobytes())
