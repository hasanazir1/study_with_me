(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const native = window.Sakin;
  if (!native) { document.body.textContent = 'افتح سَكَن من تطبيق أندرويد.'; return; }
  const cities = [
    ['hebron','الخليل',31.5326,35.0998,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['gaza','غزة',31.5017,34.4668,'Asia/Gaza','MUSLIM_WORLD_LEAGUE'],
    ['jerusalem','القدس',31.7683,35.2137,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['ramallah','رام الله',31.9038,35.2034,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['nablus','نابلس',32.2211,35.2544,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['jenin','جنين',32.4634,35.2976,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['bethlehem','بيت لحم',31.7054,35.2024,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['tulkarm','طولكرم',32.3104,35.0286,'Asia/Hebron','MUSLIM_WORLD_LEAGUE'],
    ['khan-yunis','خان يونس',31.3462,34.3063,'Asia/Gaza','MUSLIM_WORLD_LEAGUE'],
    ['rafah','رفح',31.2969,34.2435,'Asia/Gaza','MUSLIM_WORLD_LEAGUE'],
    ['amman','عمّان',31.9539,35.9106,'Asia/Amman','MUSLIM_WORLD_LEAGUE'],
    ['cairo','القاهرة',30.0444,31.2357,'Africa/Cairo','EGYPTIAN'],
    ['alexandria','الإسكندرية',31.2001,29.9187,'Africa/Cairo','EGYPTIAN'],
    ['riyadh','الرياض',24.7136,46.6753,'Asia/Riyadh','UMM_AL_QURA'],
    ['makkah','مكة المكرمة',21.4225,39.8262,'Asia/Riyadh','UMM_AL_QURA'],
    ['madinah','المدينة المنورة',24.4672,39.6111,'Asia/Riyadh','UMM_AL_QURA'],
    ['jeddah','جدة',21.4858,39.1925,'Asia/Riyadh','UMM_AL_QURA'],
    ['dubai','دبي',25.2048,55.2708,'Asia/Dubai','DUBAI'],
    ['doha','الدوحة',25.2854,51.5310,'Asia/Qatar','QATAR'],
    ['kuwait','الكويت',29.3759,47.9774,'Asia/Kuwait','KUWAIT'],
    ['beirut','بيروت',33.8938,35.5018,'Asia/Beirut','MUSLIM_WORLD_LEAGUE'],
    ['damascus','دمشق',33.5138,36.2765,'Asia/Damascus','MUSLIM_WORLD_LEAGUE'],
    ['baghdad','بغداد',33.3152,44.3661,'Asia/Baghdad','MUSLIM_WORLD_LEAGUE'],
    ['istanbul','إسطنبول',41.0082,28.9784,'Europe/Istanbul','MUSLIM_WORLD_LEAGUE'],
    ['london','لندن',51.5074,-0.1278,'Europe/London','MUSLIM_WORLD_LEAGUE'],
    ['berlin','برلين',52.5200,13.4050,'Europe/Berlin','MUSLIM_WORLD_LEAGUE'],
    ['new-york','نيويورك',40.7128,-74.0060,'America/New_York','NORTH_AMERICA'],
    ['toronto','تورونتو',43.6532,-79.3832,'America/Toronto','NORTH_AMERICA']
  ];
  const prayerIds = ['fajr','dhuhr','asr','maghrib','isha'];
  const prayerNames = ['الفجر','الظهر','العصر','المغرب','العشاء'];
  let snapshot, far=false, toastTimer, lastState='', lastAudioError='', soundBusy=false, locating=false, locationBefore='';
  let refreshTimer, idleTimer, orbitObserver, swallowWakeClick=false;
  const systemMotion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  const reduced=()=>Boolean((systemMotion&&systemMotion.matches)||(snapshot&&snapshot.settings.lightEffects));
  function revealControls(){
    clearTimeout(idleTimer);root.dataset.idle='false';
    if(snapshot&&snapshot.timer.status==='running'&&!document.hidden&&!document.querySelector('dialog[open]'))idleTimer=setTimeout(()=>{root.dataset.idle='true';},5000);
  }
  function renderDigits(value){
    const timer=$('timer');
    if(timer.childElementCount!==value.length){
      timer.textContent='';
      for(const char of value){const span=document.createElement('span');span.textContent=char;if(char===':')span.className='colon';timer.appendChild(span);}
      return;
    }
    Array.from(timer.children).forEach((span,index)=>{
      if(span.textContent===value[index])return;
      span.textContent=value[index];
      if(!reduced()&&!document.hidden&&value[index]!==':'){
        if(typeof span.animate==='function')span.animate([{opacity:.25,transform:'translateY(10%)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
      }
    });
  }
  function sizeOrbit(){
    const stage=$('timerStage');
    const maximum=window.innerWidth>=1000?350:300;
    const size=Math.max(60,Math.min(stage.clientWidth-4,stage.clientHeight-4,maximum));
    $('timerOrbit').style.setProperty('--orbit-size',Math.round(size)+'px');
  }
  function refreshLoop(){
    clearTimeout(refreshTimer);
    if(document.hidden)return;
    refresh();refreshTimer=setTimeout(refreshLoop,1000-(Date.now()%1000));
  }
  function presentationChange(){
    const update=()=>{refresh();sizeOrbit();};
    if(typeof document.startViewTransition==='function'&&!reduced()&&!document.hidden){
      try{const transition=document.startViewTransition(update);transition.ready.catch(()=>{});transition.finished.catch(()=>{});return;}catch(e){ }
    }
    update();
  }
  const locationKey=s=>[s.configured,s.gps,s.latitude,s.longitude].join('|');
  function requestLocation(){locating=true;locationBefore=locationKey(snapshot.settings);native.requestLocation();}
  const arabic = number => Number(number).toLocaleString('ar');
  function toast(message) {
    if(!message)return;
    $('toast').textContent=message; $('toast').hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);
  }
  function command(action,data={}) {
    try { const error=native.command(action,JSON.stringify(data));if(error)toast(error);refresh();return !error; }
    catch(e){toast('تعذّر تنفيذ الطلب. جرّب مرة ثانية.');return false;}
  }
  function save(changes) {
    try {const error=native.saveSettings(JSON.stringify(changes));if(error)toast(error);refresh();return !error;}
    catch(e){toast('تعذّر حفظ الإعدادات.');return false;}
  }
  function zone() {const s=snapshot.settings;return s.configured&&!s.gps?s.timezone:snapshot.deviceTimezone;}
  function timeParts(timestamp,timezone=zone()) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(timestamp));
    const part=type=>(parts.find(p=>p.type===type)||{}).value||'';
    return {digits:part('hour')+':'+part('minute'),period:part('dayPeriod')==='AM'?'ص':'م'};
  }
  function clockText(timestamp) {const p=timeParts(timestamp);return p.digits+' '+p.period;}
  function countdown(milliseconds,withHours=false) {
    const s=Math.max(0,Math.ceil(milliseconds/1000));
    const pad=v=>String(v).padStart(2,'0');
    return withHours?pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60):pad(Math.floor(s/60))+':'+pad(s%60);
  }
  function nextPrayer() {return snapshot.prayers.find(p=>p.time>snapshot.now);}
  function studyText(ms) {const min=Math.floor(ms/60000);if(!min)return ms>0?'أقل من دقيقة':'٠ دقيقة';return min>=60?arabic(Math.floor(min/60))+' س '+arabic(min%60)+' د':arabic(min)+' دقيقة';}
  function render() {
    const t=snapshot.timer,s=snapshot.settings;
    root.dataset.theme=s.theme||'light';
    root.dataset.phase=t.phase;
    root.dataset.running=String(t.status==='running');
    root.dataset.effects=reduced()?'light':'full';
    root.dataset.visible=String(!document.hidden);
    if(snapshot.presentation){far=Boolean(snapshot.presentation.immersive);root.dataset.immersive=String(far);$('displayMode').setAttribute('aria-pressed',String(far));$('displayMode').setAttribute('aria-label',far?'الخروج من ملء الشاشة':'ملء الشاشة');}
    const clock=timeParts(snapshot.now);
    $('clock').textContent=clock.digits;$('ampm').textContent=clock.period;
    $('clockZone').textContent=s.configured?'• '+s.city:'';
    $('date').textContent=new Intl.DateTimeFormat('ar',{timeZone:zone(),weekday:'long',day:'numeric',month:'long'}).format(new Date(snapshot.now));
    renderDigits(countdown(t.remainingMs));
    $('timer').classList.toggle('long',t.remainingMs>=100*60000);
    $('phaseLabel').textContent=t.phase==='focus'?'وقت التركيز':'وقت تستريح';
    $('roundLabel').textContent=t.phase==='focus'?'جلسة '+arabic(snapshot.todayRounds+1):'استراحة تستاهلها';
    $('timerHint').textContent=t.status==='finished'?(t.phase==='focus'?'أحسنت. خذ راحتك، وبعدين كمّل.':'نَفَس جديد، وجلسة جديدة'):t.status==='paused'?'جلستك محفوظة، كمّل على راحتك':t.phase==='break'?'ارفع عيونك عن الشاشة وخذ نَفَس':'خطوة صغيرة، وتركيز أعمق';
    $('startIcon').setAttribute('href',t.status==='running'?'#pause':'#play');
    $('startLabel').textContent=t.status==='running'?'إيقاف مؤقّت':t.status==='paused'?'كمّل الجلسة':t.status==='finished'?(t.phase==='focus'?'ابدأ الراحة':'ابدأ التركيز'):t.phase==='focus'?'ابدأ التركيز':'ابدأ الراحة';
    $('nextPhase').textContent=t.phase==='focus'?'للراحة':'للدراسة';
    const progress=Math.max(0,Math.min(100,100*(1-t.remainingMs/t.durationMs)));
    $('progressArc').style.strokeDashoffset=String(100-progress);$('progress').setAttribute('aria-valuenow',String(Math.round(progress)));
    $('sessionDuration').textContent=arabic(Math.round(t.durationMs/60000))+' دقيقة '+(t.phase==='focus'?'إلك':'راحة');
    $('timerMessage').hidden=!t.message;$('timerMessage').textContent=t.message||'';
    const active=t.status==='running'||t.status==='paused';
    document.querySelectorAll('.presets button').forEach(button=>{button.disabled=active;if(button.dataset.focus)button.setAttribute('aria-pressed',String(Number(button.dataset.focus)===t.focusMinutes&&Number(button.dataset.rest)===t.breakMinutes));});
    const standard=[[25,5],[50,10],[20,15]].some(p=>p[0]===t.focusMinutes&&p[1]===t.breakMinutes);
    $('customTimer').setAttribute('aria-pressed',String(!standard));
    $('customTimerLabel').textContent=standard?'مخصّص':t.focusMinutes+'/'+t.breakMinutes;
    $('customTimerLabel').dir=standard?'auto':'ltr';
    $('presetHint').textContent=active?'لتغيير النمط، أعد ضبط المؤقّت':'دقائق دراسة / دقائق راحة';
    if(document.activeElement!==$('task'))$('task').value=s.task||'';
    $('taskPreview').textContent=s.task||'شو هدف جلستك؟';
    const next=nextPrayer();
    $('prayerEmpty').hidden=Boolean(next);$('prayerContent').hidden=!next;
    $('prayerError').hidden=!snapshot.prayerError;$('prayerError').textContent=snapshot.prayerError||'';
    if(next){
      $('prayerName').textContent=next.name;$('cityLabel').textContent=s.city;
      $('cityButton').setAttribute('aria-label','ضبط المدينة: '+s.city);
      $('prayerAt').textContent=clockText(next.time);
      $('prayerCountdown').textContent=countdown(next.time-snapshot.now,true);
      $('tomorrow').textContent=snapshot.prayers[0]&&next.day!==snapshot.prayers[0].day?' • بكرا':'';
      $('prayerIcon').setAttribute('href',['fajr','isha'].includes(next.id)?'#moon':'#sun');
      $('fitPrayer').disabled=active||next.time-snapshot.now<120000;
    }
    const playing=snapshot.soundPlaying;
    $('soundToggle').setAttribute('aria-pressed',String(playing));$('miniSound').setAttribute('aria-pressed',String(playing));
    $('soundIcon').setAttribute('href',playing?'#pause':'#play');
    $('soundToggleLabel').textContent=playing?'إيقاف':'تشغيل';$('soundToggle').setAttribute('aria-label',playing?'إيقاف الصوت':'تشغيل الصوت');
    $('miniSoundLabel').textContent=playing?'إيقاف الصوت':'تشغيل الصوت';$('miniSoundIcon').setAttribute('href',playing?'#pause':'#play');
    $('soundStatus').textContent=playing?'الصوت شغّال • محفوظ على جوالك':'الأصوات محفوظة على جوالك';
    const soundNames={rain:'مطر هادئ',ocean:'أمواج البحر',stream:'خرير مياه',brown:'ضجيج بني'};
    const soundIcons={rain:'#rain',ocean:'#waves',stream:'#water',brown:'#noise'};
    $('currentSoundLabel').textContent=soundNames[s.sound]||soundNames.rain;
    $('currentSoundUse').setAttribute('href',soundIcons[s.sound]||'#rain');
    document.querySelectorAll('[data-sound]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sound===s.sound)));
    if(document.activeElement!==$('volume'))$('volume').value=s.volume;
    $('volumeValue').textContent=s.volume+'%';
    $('todayStudy').textContent=studyText(snapshot.todayMs);$('todayRounds').textContent=arabic(snapshot.todayRounds)+' جلسات مكتملة';
    $('permissionsHint').hidden=snapshot.exactAlarms&&snapshot.notifications;
    $('notificationsStatus').textContent=snapshot.notifications?'مفعّل ✓':'اضغط للتفعيل';
    $('exactStatus').textContent=snapshot.exactAlarms?'مفعّل ✓':'اضغط للتفعيل';
    if(snapshot.audioError&&snapshot.audioError!==lastAudioError)toast(snapshot.audioError);
    lastAudioError=snapshot.audioError;
    if(lastState==='running'&&t.status==='finished')toast(t.phase==='focus'?'أحسنت، خلصت جلستك 🌿':'انتهت الاستراحة. جاهز تكمل؟');
    if(lastState!==t.status)revealControls();
    lastState=t.status;
    if(locating&&s.configured&&locationKey(s)!==locationBefore){locating=false;populateSettings();}
  }
  function refresh(){try{const value=JSON.parse(native.getSnapshot());if(!value.timer||!value.settings)return;snapshot=value;render();}catch(e){console.error('Snapshot unavailable',e);}}
  function open(dialog){revealControls();if(!dialog.open)dialog.showModal();clearTimeout(idleTimer);}
  function populateSettings(){
    const s=snapshot.settings;
    ['method','theme','fajrAngle','ishaAngle'].forEach(key=>$(key).value=s[key]);
    ['hanafi','pauseAtPrayer','prayerAlerts','prePrayer','keepScreen','stopSoundWithTimer','autoImmersive','haptics','lightEffects'].forEach(key=>$(key).checked=Boolean(s[key]));
    const found=cities.find(city=>city[2]===s.latitude&&city[3]===s.longitude);
    $('citySelect').value=!s.configured?'':s.gps?'gps':found?found[0]:'manual';
    $('manualLocation').hidden=$('citySelect').value!=='manual';
    $('manualCity').value=s.city||'مدينتي';$('manualLat').value=s.latitude==null?'':s.latitude;$('manualLon').value=s.longitude==null?'':s.longitude;$('manualZone').value=s.timezone||snapshot.deviceTimezone;
    $('customAngles').hidden=s.method!=='CUSTOM';
    prayerIds.forEach((id,i)=>$('offset-'+id).value=s.offsets[i]);
  }
  function settings(){populateSettings();open($('settingsDialog'));}
  function renderPrayers(){
    const current=snapshot.prayers.slice(0,5),next=nextPrayer();
    $('prayerRows').textContent='';
    $('prayerDateLabel').textContent=snapshot.settings.city+' • '+$('date').textContent;
    current.forEach(p=>{
      const row=document.createElement('div');row.className='prayer-row'+(next&&next.id===p.id&&next.day===p.day?' next':'');
      const name=document.createElement('span');name.textContent=p.name;
      const at=document.createElement('time');at.textContent=clockText(p.time);
      const label=document.createElement('label'),checkbox=document.createElement('input'),text=document.createElement('span');
      checkbox.type='checkbox';checkbox.checked=p.prayed;checkbox.disabled=p.time>snapshot.now;
      checkbox.setAttribute('aria-label','صليت '+p.name);text.className='prayed-label';text.textContent='صليت';
      checkbox.addEventListener('change',()=>command('prayed',{id:p.id,day:p.day,value:checkbox.checked}));
      label.append(checkbox,text);row.append(name,at,label);$('prayerRows').append(row);
    });
  }
  function sound(){if(soundBusy)return;soundBusy=true;command('sound');setTimeout(()=>{soundBusy=false;refresh();},650);}
  for(const city of cities){const option=document.createElement('option');option.value=city[0];option.textContent=city[1];$('citySelect').append(option);}
  for(const [value,text]of [['gps','موقعي الحالي'],['manual','مدينة ثانية / إحداثيات']]){const option=document.createElement('option');option.value=value;option.textContent=text;$('citySelect').append(option);}
  prayerIds.forEach((id,index)=>{
    const label=document.createElement('label');label.textContent=prayerNames[index];const input=document.createElement('input');input.type='number';input.min='-60';input.max='60';input.step='1';input.id='offset-'+id;input.inputMode='numeric';
    input.addEventListener('change',()=>{if(!input.checkValidity()){input.reportValidity();return;}const offsets=prayerIds.map(p=>Number($('offset-'+p).value));save({offsets});});label.append(input);$('offsetFields').append(label);
  });
  $('start').addEventListener('click',()=>command(snapshot.timer.status==='running'?'pause':'start'));
  $('reset').addEventListener('click',()=>command('reset'));
  $('nextPhase').addEventListener('click',()=>command('next'));
  document.querySelectorAll('[data-focus]').forEach(button=>button.addEventListener('click',()=>command('preset',{focus:Number(button.dataset.focus),rest:Number(button.dataset.rest)})));
  $('customTimer').addEventListener('click',()=>{$('focusMinutes').value=snapshot.timer.focusMinutes;$('breakMinutes').value=snapshot.timer.breakMinutes;open($('customDialog'));});
  $('customForm').addEventListener('submit',e=>{e.preventDefault();if(command('preset',{focus:Number($('focusMinutes').value),rest:Number($('breakMinutes').value)}))$('customDialog').close();});
  $('task').addEventListener('change',()=>save({task:$('task').value.trim()}));
  $('task').addEventListener('keydown',event=>{if(event.key==='Enter')$('task').blur();});
  $('openSettings').addEventListener('click',settings);$('setupLocation').addEventListener('click',settings);$('cityButton').addEventListener('click',settings);$('permissionsHint').addEventListener('click',settings);
  $('displayMode').addEventListener('click',()=>{revealControls();far=!far;root.dataset.immersive=String(far);$('displayMode').setAttribute('aria-pressed',String(far));native.fullscreen(far);});
  $('openPrayers').addEventListener('click',()=>{renderPrayers();open($('prayersDialog'));});
  $('fitPrayer').addEventListener('click',()=>command('fit'));
  $('soundToggle').addEventListener('click',sound);$('miniSound').addEventListener('click',sound);
  $('openAudio').addEventListener('click',()=>open($('audioDialog')));
  $('openTask').addEventListener('click',()=>open($('taskDialog')));
  $('saveTask').addEventListener('click',()=>{if(save({task:$('task').value.trim()}))$('taskDialog').close();});
  document.querySelectorAll('[data-sound]').forEach(button=>button.addEventListener('click',()=>{const playing=snapshot.soundPlaying;if(save({sound:button.dataset.sound})&&playing)command('playSound');}));
  $('volume').addEventListener('input',()=>{$('volumeValue').textContent=$('volume').value+'%';});
  $('volume').addEventListener('change',()=>save({volume:Number($('volume').value)}));
  $('citySelect').addEventListener('change',()=>{
    const value=$('citySelect').value;$('manualLocation').hidden=value!=='manual';
    if(value==='gps'){requestLocation();return;}
    const city=cities.find(c=>c[0]===value);if(!city)return;
    const changes={configured:true,gps:false,city:city[1],latitude:city[2],longitude:city[3],timezone:city[4]};
    if(!snapshot.settings.configured)changes.method=city[5];
    if(save(changes)){populateSettings();toast('تم ضبط المدينة. راجع المواقيت مع تقويم مسجدك.');}
  });
  $('useLocation').addEventListener('click',requestLocation);
  $('manualLocation').addEventListener('submit',e=>{
    e.preventDefault();
    if(save({configured:true,gps:false,city:$('manualCity').value.trim(),latitude:Number($('manualLat').value),longitude:Number($('manualLon').value),timezone:$('manualZone').value.trim()})){populateSettings();toast('تم حفظ الموقع');}
  });
  ['method','theme'].forEach(key=>$(key).addEventListener('change',()=>{save({[key]:$(key).value});if(key==='method')$('customAngles').hidden=$('method').value!=='CUSTOM';}));
  ['fajrAngle','ishaAngle'].forEach(key=>$(key).addEventListener('change',()=>{if($(key).checkValidity())save({[key]:Number($(key).value)});else $(key).reportValidity();}));
  ['hanafi','pauseAtPrayer','prayerAlerts','prePrayer','keepScreen','stopSoundWithTimer','autoImmersive','haptics','lightEffects'].forEach(key=>$(key).addEventListener('change',()=>{const checked=$(key).checked;if(save({[key]:checked})&&key==='prayerAlerts'&&checked&&!snapshot.notifications)native.requestNotifications();}));
  $('allowNotifications').addEventListener('click',()=>native.requestNotifications());$('allowExact').addEventListener('click',()=>native.requestExactAlarms());
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',revealControls);dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});});
  window.sakinBack=()=>{const openDialog=document.querySelector('dialog[open]');if(openDialog){openDialog.close();return true;}if(far){$('displayMode').click();return true;}return false;};
  window.sakinNativePresentation=presentationChange;
  document.addEventListener('pointerdown',event=>{const sleeping=root.dataset.idle==='true';revealControls();swallowWakeClick=Boolean(sleeping&&event.target.closest('.quiet-controls'));},true);
  document.addEventListener('click',event=>{if(swallowWakeClick){swallowWakeClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',()=>{swallowWakeClick=false;revealControls();},true);
  document.addEventListener('visibilitychange',()=>{root.dataset.visible=String(!document.hidden);clearTimeout(refreshTimer);clearTimeout(idleTimer);if(document.hidden){if(typeof document.getAnimations==='function')document.getAnimations().forEach(animation=>animation.cancel());}else{refreshLoop();revealControls();sizeOrbit();}});
  window.addEventListener('resize',sizeOrbit);
  if(typeof ResizeObserver==='function'){orbitObserver=new ResizeObserver(sizeOrbit);orbitObserver.observe($('timerStage'));}
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(sizeOrbit);
  refreshLoop();sizeOrbit();
})();
