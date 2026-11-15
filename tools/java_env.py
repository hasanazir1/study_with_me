"""Find a real JDK home, including Windows installations behind Oracle PATH shims."""
from pathlib import Path
import os,re,shutil,subprocess

def find_jdk_home(explicit=None):
    required=explicit or os.environ.get('JAVA_HOME')
    candidates=[]
    if required:
        candidates.append(Path(required))
    else:
        compiler=shutil.which('javac')
        if compiler:
            location=Path(compiler).resolve().parent
            if location.name.lower()=='bin':
                candidates.append(location.parent)
        if os.name=='nt':
            install_root=Path(os.environ.get('ProgramFiles',r'C:\Program Files'))/'Java'
            candidates.extend(sorted(install_root.glob('jdk-*'),key=lambda p:[int(v) for v in re.findall(r'\d+',p.name)],reverse=True))
    suffix='.exe' if os.name=='nt' else ''
    for home in candidates:
        compiler=home/'bin'/('javac'+suffix)
        runtime=home/'bin'/('java'+suffix)
        if not compiler.is_file() or not runtime.is_file():
            continue
        version=subprocess.run([str(compiler),'-version'],capture_output=True,text=True,check=False)
        match=re.search(r'javac\s+(\d+)(?:\.(\d+))?',version.stdout+version.stderr)
        if not match:
            continue
        major=int(match.group(2)) if match.group(1)=='1' else int(match.group(1))
        if version.returncode==0 and major>=17:
            return home.resolve()
    raise RuntimeError('JDK 17+ is required. Set JAVA_HOME to a JDK installation, not a JRE or Oracle javapath shim.')
