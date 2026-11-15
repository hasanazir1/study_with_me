from pathlib import Path
import os, subprocess

root=Path(__file__).resolve().parents[1]
java=Path(os.environ.get('JAVA_HOME',r'C:\Program Files\Java\jdk-20'))/'bin'
classes=root/'build/tests'
classes.mkdir(parents=True,exist_ok=True)
library=root/'libs/adhan-1.2.1.jar'
sources=[root/'src/com/sakin/study/TimerCore.java',root/'src/com/sakin/study/PrayerEngine.java',root/'tests/TimerCoreTest.java',root/'tests/PrayerEngineTest.java']
subprocess.run([str(java/'javac.exe'),'--release','8','-Xlint:-options','-encoding','UTF-8','-cp',str(library),'-d',str(classes),*[str(s)for s in sources]],check=True)
cp=os.pathsep.join([str(classes),str(library)])
for test in ['TimerCoreTest','PrayerEngineTest']:
    subprocess.run([str(java/'java.exe'),'-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-cp',cp,'com.sakin.study.'+test],check=True)
fixture=subprocess.check_output([str(java/'java.exe'),'-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-cp',cp,'com.sakin.study.PrayerEngineTest','--fixture'])
(root/'tests/prayer-fixture.js').write_bytes(fixture)
assert 'الظهر' in fixture.decode('utf-8')
print('UTF-8 prayer preview fixture generated.')
