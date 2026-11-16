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
  let hooks, current='', active=0;
  const layers=Array.from(document.querySelectorAll('.room-scene'));
  const stars=Array.from({length:12},(_,i)=>`<circle class="room-star" cx="${330+(i*47)%188}" cy="${55+(i*31)%122}" r="${i%3===0?2:1.3}"/>`).join('');
  const drops=Array.from({length:23},(_,i)=>`<path d="M${319+(i*31)%221} ${36+(i*43)%181}l-5 17"/>`).join('');
  const artwork=`<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">
    <defs><clipPath id="ROOM-window"><rect x="303" y="35" width="244" height="204" rx="42"/></clipPath></defs>
    <path fill="var(--wall)" d="M0 0h640v310L183 354 0 288Z"/>
    <path fill="var(--side)" d="M0 0h184v354L0 288Z"/>
    <path fill="var(--floor)" d="m0 288 184 39 456-32v105H0Z"/>
    <path d="m0 299 184 40 456-32" fill="none" stroke="#FFF" stroke-opacity=".35" stroke-width="3"/>
    <path d="m48 339 146 35 410-29m-495-35 144 33m43-18 8 71m115-80 9 69m118-79 9 67" fill="none" stroke="#756F60" stroke-opacity=".12" stroke-width="2"/>
    <ellipse cx="346" cy="362" rx="172" ry="20" fill="#515B50" opacity=".08"/>
    <rect x="290" y="22" width="270" height="230" rx="49" fill="#958D79" opacity=".16"/>
    <rect x="295" y="23" width="260" height="224" rx="47" fill="#FBF4E7"/>
    <g clip-path="url(#ROOM-window)">
      <rect x="303" y="35" width="244" height="204" fill="var(--sky)"/>
      <path d="M296 206q73-85 143-15t119-37v91H296Z" fill="#A9BCAD" opacity=".65"/>
      <path d="M296 223q55-50 125-10t132-23v55H296Z" fill="#7D9F91" opacity=".5"/>
      <g class="room-stars" fill="#F9ECCD">${stars}<circle cx="482" cy="91" r="24"/><circle cx="492" cy="82" r="23" fill="var(--sky)"/></g>
      <g class="room-treetops" fill="#8FAD85"><path d="M310 151q-31-83 33-94 62 15 30 89Z"/><path d="M496 149q-28-94 36-109 65 37 15 113Z"/></g>
      <g class="room-rain" fill="none" stroke="#F2FAF4" stroke-width="2.4" stroke-linecap="round" opacity=".7">${drops}</g>
      <rect class="room-mist" x="303" y="185" width="244" height="54" fill="#E8F0E6" opacity=".2"/>
      <rect class="room-flash" x="303" y="35" width="244" height="204" fill="#FFF4DD"/>
    </g>
    <path d="M425 36v201M305 143h240" stroke="#F7F1E5" stroke-width="8"/>
    <rect x="283" y="238" width="287" height="12" rx="6" fill="#D0BEA4"/>
    <path class="room-rays" d="m307 145-61 167 193 20 92-186Z" fill="#FFF4CF" opacity=".18"/>
    <g class="room-picture"><rect x="55" y="60" width="77" height="99" rx="7" fill="#B8A98F"/><rect x="61" y="66" width="65" height="87" rx="3" fill="#F7F1E5"/><path d="M91 140v-43m0 22q-30 0-22-25 24 1 22 25Zm0-13q1-30 24-26 4 23-24 26Z" fill="#97AF8C"/></g>
    <g class="room-bookshelf"><path d="m25 196 116 23 30-9-114-22Z" fill="#B19A7B"/><path d="m25 196 116 23v9L25 205Z" fill="#98846D"/><path d="m42 146 13 3v50l-13-3Z" fill="#9CAF97"/><path d="m58 153 12 3v46l-12-3Z" fill="#D8BC9C"/><path d="m72 162 14 3v40l-14-3Z" fill="#9FAEAD"/><path d="m91 158 12 3v48l-12-3Z" fill="#C5AA95"/></g>
    <g class="room-fireplace"><rect x="40" y="228" width="109" height="100" rx="14" fill="#B99A83"/><rect x="51" y="238" width="87" height="80" rx="27" fill="#716B60"/><ellipse class="room-fire-glow" cx="96" cy="291" rx="38" ry="29" fill="#E8AC72" opacity=".3"/><path class="room-flame" d="M73 305q-17-21 5-39-3 15 9 15 16-12 12-31 39 38 13 58Z" fill="#DFA16D"/><path class="room-flame room-flame-inner" d="M89 308q-15-17 7-35-4 12 9 17 11 16-3 19Z" fill="#F3D2A0"/><path d="m68 309 51 1" stroke="#88705A" stroke-width="7" stroke-linecap="round"/><path d="M33 228h123" stroke="#CCB198" stroke-width="9" stroke-linecap="round"/></g>
    <g class="room-plant"><path d="M571 310v-87" stroke="#789071" stroke-width="5"/><path class="room-leaf" d="M570 259q-57-13-40-46 37-2 40 46Z" fill="#8CA780"/><path class="room-leaf room-leaf-right" d="M572 245q1-47 37-48 20 33-37 48Z" fill="#9CB58C"/><path d="M548 297h49l-8 44q-17 10-32 0Z" fill="#D6B69A"/><ellipse cx="572" cy="297" rx="25" ry="6" fill="#B59C7F"/></g>
    <g class="room-chair"><path d="m327 316-9 59m45-57 15 55" stroke="#9C8E75" stroke-width="8" stroke-linecap="round"/><path d="M316 283q33-12 61 0v40q-30 13-61 0Z" fill="#8FA58E"/><rect x="314" y="300" width="64" height="23" rx="9" fill="#A4B59C"/></g>
    <g class="room-table"><path d="M223 288v70m269-73v65" stroke="#A38C71" stroke-width="10" stroke-linecap="round"/><path d="m202 263 230-26 83 31-231 30Z" fill="#D7BA91"/><path d="m202 263 82 24 231-29v14l-231 30-82-25Z" fill="#B99B77"/>
      <path d="m308 260 43-8 22 9-44 8Z" fill="#FBF5E8"/><path d="m329 269 22-17 22 9-44 8Z" fill="#EAE2CF"/><path d="m351 252-2 13" stroke="#C8BFA9" stroke-width="1.5"/>
      <path d="m391 250 29-4" stroke="#7F998B" stroke-width="3" stroke-linecap="round"/>
      <ellipse class="room-lamp-light" cx="260" cy="258" rx="44" ry="12" fill="#FFF1C6" opacity=".5"/>
      <path d="m244 248 15-45 28-15" fill="none" stroke="#74887B" stroke-width="5" stroke-linecap="round"/><ellipse cx="246" cy="250" rx="16" ry="4" fill="#819482"/><path d="m271 183 29 12-11 18-35-15Z" fill="#92A48D"/>
      <g class="room-mug"><ellipse cx="452" cy="254" rx="16" ry="4" fill="#B5987D" opacity=".4"/><path d="M442 237h19v16q-9 7-19 0Z" fill="#F1E5D5"/><path d="M460 239q16-3 11 9l-10 2" stroke="#E6D6C1" stroke-width="4" fill="none"/><ellipse cx="451" cy="237" rx="10" ry="3" fill="#A48C73"/><path class="room-steam" d="M449 227q-9-7 0-13t0-14m10 28q-6-7 0-12" fill="none" stroke="#FFF8EB" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>
    </g>
    <g class="room-bokeh" fill="#FFF0CA" opacity=".4"><circle cx="230" cy="96" r="12"/><circle cx="580" cy="169" r="16"/><circle cx="229" cy="190" r="6"/></g>
    <g class="room-fireflies" fill="#F7E2A2"><circle cx="293" cy="180" r="2.5"/><circle cx="551" cy="280" r="2.5"/><circle cx="212" cy="132" r="2"/></g>
  </svg>`;
  layers.forEach((layer,index)=>{layer.innerHTML=artwork.replace(/ROOM-/g, 'room'+index+'-');});
  function render(snapshot) {
    const scene=rooms.find(room=>room.id===snapshot.settings.visualScene)||rooms[0];
    if(current!==scene.id){
      current=scene.id;active=1-active;
      const incoming=layers[active];incoming.dataset.scene=scene.id;incoming.dataset.effect=scene.effect;
      for(const [key,value] of Object.entries(scene.colors))incoming.style.setProperty('--'+key,value);
      layers.forEach((layer,index)=>layer.classList.toggle('is-active',index===active));
      $('roomName').textContent=scene.name;$('roomUse').setAttribute('href','#'+scene.icon);
      $('roomCaption').textContent=scene.detail;
      document.querySelectorAll('[data-room-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roomChoice===scene.id)));
      const sound=scene.sound;const preset=sound&&JSON.parse(window.Sakin.getAudioCatalog()).find(p=>p.id===sound);
      $('roomSound').hidden=!preset;$('roomSound').dataset.suggestedSound=sound||'';
      if(preset)$('roomSound').textContent='اختيار صوت: '+preset.name;
    }
    $('roomPanel').dataset.session=snapshot.timer.status==='running'?snapshot.timer.phase:'idle';
  }
  function connect(callbacks) {
    hooks=callbacks;
    rooms.forEach(room=>{
      const button=document.createElement('button');button.type='button';button.dataset.roomChoice=room.id;button.setAttribute('aria-pressed','false');
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      const use=document.createElementNS(icon.namespaceURI,'use');use.setAttribute('href','#'+room.icon);icon.append(use);icon.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=room.name;
      const detail=document.createElement('small');detail.textContent=room.detail;
      button.append(icon,name,detail);button.addEventListener('click',()=>hooks.save({visualScene:room.id}));$('roomChoices').append(button);
    });
    $('openRoom').addEventListener('click',()=>hooks.open($('roomDialog')));
    $('roomSound').addEventListener('click',()=>hooks.save({sound:$('roomSound').dataset.suggestedSound}));
  }
  window.SakinRoom={connect,render,catalog:rooms};
})();
