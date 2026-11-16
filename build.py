"""Build the offline APK using official SDK tools; no Gradle or network is needed."""
from pathlib import Path
import argparse, os, shutil, subprocess, zipfile
from tools.java_env import find_jdk_home

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--sdk',type=Path,default=Path(os.environ.get('ANDROID_SDK_ROOT',os.environ.get('ANDROID_HOME',str(ROOT.parent/'android-sdk')))))
parser.add_argument('--java',type=Path)
parser.add_argument('--out',type=Path,default=ROOT/'build/sakin-study.apk')
parser.add_argument('--keystore',type=Path,default=Path(os.environ.get('SAKIN_KEYSTORE',str(ROOT.parent/'signing/sakin-local.p12'))))
args=parser.parse_args()
SDK=args.sdk.resolve();JAVA=find_jdk_home(args.java)/'bin';BT=SDK/'build-tools/35.0.0';PLATFORM=SDK/'platforms/android-35/android.jar'
BUILD=ROOT/'build';BUILD.mkdir(exist_ok=True)
for directory in ['generated','classes','dex']:
    target=(BUILD/directory).resolve()
    if target.parent!=BUILD.resolve() or (BUILD/directory).is_symlink():
        raise RuntimeError('Refused to clean a generated directory outside build/')
    if target.exists():shutil.rmtree(target)
    target.mkdir()
def run(*cmd):
    subprocess.run([str(s) for s in cmd],check=True,cwd=ROOT)
def java_tool(name):return JAVA/(name+('.exe' if os.name=='nt' else ''))
def sdk_tool(name):return BT/(name+('.exe' if os.name=='nt' else ''))

run(sdk_tool('aapt2'),'compile','--dir',ROOT/'res','-o',BUILD/'resources.zip')
run(sdk_tool('aapt2'),'link','-o',BUILD/'base.apk','-I',PLATFORM,'--manifest',ROOT/'AndroidManifest.xml','--java',BUILD/'generated','-A',ROOT/'assets','-0','wav',BUILD/'resources.zip')
sources=list((ROOT/'src').rglob('*.java'))+list((BUILD/'generated').rglob('*.java'))
classpath=os.pathsep.join([str(PLATFORM),str(ROOT/'libs/adhan-1.2.1.jar')])
run(java_tool('javac'),'--release','8','-encoding','UTF-8','-classpath',classpath,'-d',BUILD/'classes',*sources)
with zipfile.ZipFile(BUILD/'app-classes.jar','w') as z:
    for file in (BUILD/'classes').rglob('*.class'):z.write(file,file.relative_to(BUILD/'classes').as_posix())
run(java_tool('java'),'-cp',BT/'lib/d8.jar','com.android.tools.r8.D8','--lib',PLATFORM,'--min-api','26','--output',BUILD/'dex',BUILD/'app-classes.jar',ROOT/'libs/adhan-1.2.1.jar')
# Repack clean local ZIP headers before alignment. AAPT2's stored asset headers
# otherwise retain metadata that zipalign warns about after an append operation.
with zipfile.ZipFile(BUILD/'base.apk') as base, zipfile.ZipFile(BUILD/'unsigned.apk','w') as z:
    for entry in base.infolist():
        z.writestr(entry.filename,base.read(entry),compress_type=entry.compress_type)
    for file in (BUILD/'dex').glob('*.dex'):z.write(file,file.name,compress_type=zipfile.ZIP_DEFLATED)
run(sdk_tool('zipalign'),'-f','4',BUILD/'unsigned.apk',BUILD/'aligned.apk')
key=args.keystore.resolve()
if not key.exists():
    raise FileNotFoundError('The original signing key is required for updates. Restore '+str(key)+'; a replacement key will not be generated.')
args.out=args.out.resolve();args.out.parent.mkdir(parents=True,exist_ok=True)
run(java_tool('java'),'-jar',BT/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias','sakin','--ks-pass','pass:android','--v4-signing-enabled','false','--out',args.out,BUILD/'aligned.apk')
run(java_tool('java'),'-jar',BT/'lib/apksigner.jar','verify','--verbose',args.out)
run(sdk_tool('zipalign'),'-c','4',args.out)
print('APK ready:',args.out, 'bytes:',args.out.stat().st_size)
