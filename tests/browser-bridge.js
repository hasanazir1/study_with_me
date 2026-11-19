/* UI preview only: intentionally independent from the tested native timer/audio engine. */
(() => {
const anchor=Date.now(),start=Date.UTC(2026,10,14,7,30);
let shift=0,deadline=0,autoAt=0,soundPlaying=false,notifications=false,exactAlarms=false,rounds=0,studied=0,sleepAt=0;
const settings={configured:false,city:'',timezone:'Asia/Hebron',method:'MUSLIM_WORLD_LEAGUE',hanafi:false,keepScreen:true,pauseAtPrayer:true,stopSoundWithTimer:true,prayerAlerts:false,prePrayer:true,volume:48,sound:'rain',theme:'light',task:'',offsets:[0,0,0,0,0],fajrAngle:18,ishaAngle:17,autoImmersive:true,haptics:true,lightEffects:false,autoBreak:true,completionSound:true,layerVolumes:{}};
const timer={focusMinutes:25,breakMinutes:5,phase:'focus',status:'ready',remainingMs:1500000,durationMs:1500000,message:'',autoBreakRemainingMs:0,prayerFit:false};
const presentation={immersive:false,orientationLocked:false,awake:false,nativeSafeArea:true};
function now(){return start+Date.now()-anchor+shift;}
function reset(){autoAt=0;timer.autoBreakRemainingMs=0;timer.prayerFit=false;timer.status='ready';timer.durationMs=(timer.phase==='focus'?timer.focusMinutes:timer.breakMinutes)*60000;timer.remainingMs=timer.durationMs;timer.message='';}
function refresh(){
 if(autoAt&&now()>=autoAt){const at=autoAt;timer.phase='break';reset();timer.status='running';deadline=at+timer.remainingMs;}
 if(timer.status==='running'){
  timer.remainingMs=Math.max(0,deadline-now());
  if(!timer.remainingMs){timer.status='finished';if(timer.phase==='focus'){rounds++;studied+=timer.durationMs;if(settings.autoBreak&&!timer.prayerFit)autoAt=now()+5000;}if(settings.stopSoundWithTimer)soundPlaying=false;}
 }
 timer.autoBreakRemainingMs=autoAt?Math.max(0,autoAt-now()):0;
 if(!autoAt&&timer.status!=='running'&&timer.status!=='paused'){presentation.immersive=false;presentation.orientationLocked=false;}
 if(sleepAt&&now()>=sleepAt){soundPlaying=false;sleepAt=0;}
}
window.__preview={advance(ms){shift+=ms;refresh();},timer,settings};
window.Sakin={
getAudioCatalog(){return JSON.stringify(window.SAKIN_AUDIO_CATALOG);},
getSnapshot(){refresh();presentation.awake=(timer.status==='running'||Boolean(autoAt))&&settings.keepScreen;return JSON.stringify({timer,settings,presentation,now:now(),deviceTimezone:'Asia/Hebron',prayers:settings.configured?window.PRAYER_FIXTURE:[],todayMs:studied,todayRounds:rounds,soundPlaying,soundLoading:false,sleepRemainingMs:sleepAt?Math.max(0,sleepAt-now()):0,audioError:'',exactAlarms,notifications});},
command(action,text){refresh();const d=JSON.parse(text);
 if(action==='start'){if(timer.status==='finished'){timer.phase=timer.phase==='focus'?'break':'focus';reset();}deadline=now()+timer.remainingMs;timer.status='running';}
 else if(action==='pause'){timer.status='paused';if(settings.stopSoundWithTimer)soundPlaying=false;}
 else if(action==='end'){timer.phase='focus';reset();}
 else if(action==='reset')reset();
 else if(action==='next'){timer.phase=timer.phase==='focus'?'break':'focus';reset();}
 else if(action==='preset'){timer.focusMinutes=d.focus;timer.breakMinutes=d.rest;timer.phase='focus';reset();}
 else if(action==='cancelAutoBreak'){autoAt=0;timer.autoBreakRemainingMs=0;}
 else if(action==='sound')soundPlaying=!soundPlaying;
 else if(action==='playSound')soundPlaying=true;
 else if(action==='audioSleep')sleepAt=d.minutes?now()+d.minutes*60000:0;
 else if(action==='prayed'){const p=window.PRAYER_FIXTURE.find(p=>p.id===d.id&&p.day===d.day);if(p)p.prayed=d.value;}
 else if(action==='fit'){timer.phase='focus';reset();timer.prayerFit=true;timer.durationMs=Math.min(timer.durationMs,window.PRAYER_FIXTURE.find(p=>p.time>now()).time-now()-60000);timer.remainingMs=timer.durationMs;deadline=now()+timer.remainingMs;timer.status='running';}
 if(action==='start'||action==='fit'){if(settings.autoImmersive){presentation.immersive=true;presentation.orientationLocked=true;}}
 if(['end','reset','next','cancelAutoBreak'].includes(action)){presentation.immersive=false;presentation.orientationLocked=false;}
 return '';
},
saveSettings(text){Object.assign(settings,JSON.parse(text));if(settings.sound==='silence')soundPlaying=false;if(!settings.autoBreak){autoAt=0;timer.autoBreakRemainingMs=0;}return '';},requestNotifications(){notifications=true;},requestExactAlarms(){exactAlarms=true;},requestLocation(){},fullscreen(enabled){presentation.immersive=enabled;if(!enabled)presentation.orientationLocked=false;}
};
})();
