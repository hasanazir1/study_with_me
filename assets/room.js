/* Original SVG artwork. Room visuals never own timekeeping or audio playback. */
(() => {
  'use strict';
  const rooms = [
    {id:'rain', name:'مطر الشباك', icon:'rain', detail:'قطرات وضوء ناعم', effect:'rain', sound:'rain', character:'study', colors:{wall:'#E7E3D9',side:'#D8DDD3',sky:'#C4D6D5',floor:'#C9B79D',accent:'#A8C3A0'}},
    {id:'nature', name:'صباح أخضر', icon:'leaf', detail:'أوراق وشمس خفيفة', effect:'nature', sound:'stream', character:'study', colors:{wall:'#EBE9D9',side:'#DAE0C9',sky:'#D6E5CD',floor:'#CABA9E',accent:'#ABC29C'}},
    {id:'fire', name:'دفء المدفأة', icon:'sun', detail:'وهج دافئ ونار هادئة', effect:'fire', sound:'brown', character:'rest', colors:{wall:'#EEDFCF',side:'#DCC9B8',sky:'#BDC9C8',floor:'#C5A38A',accent:'#D4B18F'}},
    {id:'cafe', name:'ركن المقهى', icon:'book', detail:'قهوة وبخار وضوء دافئ', effect:'cafe', sound:null, character:'study', colors:{wall:'#E9DED2',side:'#D8CABC',sky:'#D8D6CA',floor:'#BB9E82',accent:'#C7B092'}},
    {id:'night', name:'ليلة هادية', icon:'moon', detail:'قمر ونجوم ولمبة المكتب', effect:'night', sound:null, character:'study', colors:{wall:'#D7DDD8',side:'#BACBC7',sky:'#244552',floor:'#ACAB96',accent:'#A8BFBA'}},
    {id:'quiet', name:'هدوء', icon:'leaf', detail:'غرفة ساكنة بدون مؤثرات', effect:'quiet', sound:'silence', character:'idle', colors:{wall:'#EEE8DE',side:'#DFE1D7',sky:'#D9E3DF',floor:'#CABAA3',accent:'#B4C4A8'}}
  ];
  const $ = id => document.getElementById(id);
  let hooks, current='';
  function render(snapshot) {
    const scene=rooms.find(room=>room.id===snapshot.settings.visualScene)||rooms[0];
    if(current!==scene.id){
      current=scene.id;
      const panel=$('roomPanel');
      panel.dataset.scene=scene.id;
      for(const [key,value] of Object.entries(scene.colors))panel.style.setProperty('--'+key,value);
      $('roomName').textContent=scene.name;$('roomUse').setAttribute('href','#'+scene.icon);

      document.querySelectorAll('[data-room-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roomChoice===scene.id)));
      const sound=scene.sound;const preset=sound&&JSON.parse(window.Sakin.getAudioCatalog()).find(p=>p.id===sound);
      $('roomSound').hidden=!preset;$('roomSound').dataset.suggestedSound=sound||'';
      if(preset)$('roomSound').textContent='اختيار صوت: '+preset.name;
    }
    $('roomPanel').dataset.session=snapshot.timer.status==='running'?snapshot.timer.phase:'idle';
  }
  function addChoice(room) {
      const button=document.createElement('button');button.type='button';button.dataset.roomChoice=room.id;button.setAttribute('aria-pressed','false');
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      const use=document.createElementNS(icon.namespaceURI,'use');use.setAttribute('href','#'+room.icon);icon.append(use);icon.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=room.name;
      const detail=document.createElement('small');detail.textContent=room.detail;
      button.append(icon,name,detail);button.addEventListener('click',()=>hooks.save({visualScene:room.id}));$('roomChoices').append(button);
  }
  function enableWindowScenes() {
    const views = [
      {id:'autumn', name:'شباك الخريف', detail:'أوراق القيقب وضوء ذهبي', icon:'leaf', sound:'stream'},
      {id:'sea', name:'شباك البحر', detail:'خليج هادئ عند الغروب', icon:'waves', sound:'ocean'}
    ];
    for (const view of views) {
      const room = {...view, colors:rooms[0].colors};
      rooms.push(room);
      addChoice(room);
    }
    current='';
  }
  function connect(callbacks) {
    hooks=callbacks;
    const camera=window.matchMedia('(orientation: portrait)');
    const compose=()=>document.querySelector('.room-art').setAttribute('viewBox',camera.matches?'0 0 380 700':'0 0 640 400');
    compose();
    camera.addListener(compose);
    document.querySelector('.window-set').addEventListener('click',()=>$('openRoom').click());
    rooms.forEach(addChoice);
    $('openRoom').addEventListener('click',()=>hooks.open($('roomDialog')));
    $('roomSound').addEventListener('click',()=>hooks.save({sound:$('roomSound').dataset.suggestedSound}));
  }
  window.SakinRoom={connect,render,catalog:rooms,enableWindowScenes};
})();
