/* UI-only preview harness; not packaged into the APK. Native timer is tested separately. */
(() => {
const anchor=Date.now(),start=Date.UTC(2026,10,14,7,30);
const settings={configured:false,city:'',timezone:'Asia/Hebron',method:'MUSLIM_WORLD_LEAGUE',hanafi:false,keepScreen:true,pauseAtPrayer:true,stopSoundWithTimer:true,prayerAlerts:false,prePrayer:true,volume:55,sound:'rain',theme:'dark',task:'',offsets:[0,0,0,0,0],fajrAngle:18,ishaAngle:17};
const timer={focusMinutes:25,breakMinutes:5,phase:'focus',status:'ready',remainingMs:1500000,durationMs:1500000,message:''};
let deadline=0,soundPlaying=false,notifications=false,exactAlarms=false,rounds=0,studied=0;
function now(){return start+Date.now()-anchor;}
function refresh(){if(timer.status==='running'){timer.remainingMs=Math.max(0,deadline-now());if(!timer.remainingMs){timer.status='finished';if(timer.phase==='focus'){rounds++;studied+=timer.durationMs;}if(settings.stopSoundWithTimer)soundPlaying=false;}}}
function reset(){timer.status='ready';timer.durationMs=(timer.phase==='focus'?timer.focusMinutes:timer.breakMinutes)*60000;timer.remainingMs=timer.durationMs;timer.message='';}
window.Sakin={
getSnapshot(){refresh();return JSON.stringify({timer,settings,now:now(),deviceTimezone:'Asia/Hebron',prayers:settings.configured?window.PRAYER_FIXTURE:[],todayMs:studied,todayRounds:rounds,soundPlaying,audioError:'',exactAlarms,notifications});},
command(action,text){refresh();const d=JSON.parse(text);if(action==='start'){if(timer.status==='finished'){timer.phase=timer.phase==='focus'?'break':'focus';reset();}deadline=now()+timer.remainingMs;timer.status='running';}
else if(action==='pause'){timer.status='paused';if(settings.stopSoundWithTimer)soundPlaying=false;}
else if(action==='reset')reset();
else if(action==='next'){timer.phase=timer.phase==='focus'?'break':'focus';reset();}
else if(action==='preset'){timer.focusMinutes=d.focus;timer.breakMinutes=d.rest;timer.phase='focus';reset();}
else if(action==='sound')soundPlaying=!soundPlaying;
else if(action==='playSound')soundPlaying=true;
else if(action==='prayed'){const p=window.PRAYER_FIXTURE.find(p=>p.id===d.id&&p.day===d.day);if(p)p.prayed=d.value;}
else if(action==='fit'){timer.phase='focus';reset();timer.durationMs=Math.min(timer.durationMs,window.PRAYER_FIXTURE.find(p=>p.time>now()).time-now()-60000);timer.remainingMs=timer.durationMs;deadline=now()+timer.remainingMs;timer.status='running';}
return '';},
saveSettings(text){Object.assign(settings,JSON.parse(text));return '';},requestNotifications(){notifications=true;},requestExactAlarms(){exactAlarms=true;},requestLocation(){},fullscreen(){}
};
})();
