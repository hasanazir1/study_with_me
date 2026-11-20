/* The Android timer owns time and study credit. The scene only presents its snapshots. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const svgNS = 'http://www.w3.org/2000/svg';
  const storageKey = 'sakin.room.geometry.1';
  let scene, hooks, snapshot, values, phase = 'setup', plate = 'empty', ready = false;
  let calibration = false, calState = 'empty', scale = 1, settle, settling = false, enterTime = 0;
  let hold, pressed, captured;
  let hitRegions = [], calibrationObjects = [];
  const minTouch = 48;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const targets = new Map();
  const hues = {rain:'#617895', nature:'#75a963', fire:'#f39952', cafe:'#cc985c', night:'#162f5c', quiet:'transparent'};
  const show = id => hooks.open($(id));
  const trigger = id => $(id).click();
  const actions = {
    atmosphere: () => trigger('openRoom'),
    lamp: () => show('lampDialog'),
    timer: () => hooks.command(snapshot.timer.status === 'running' ? 'pause' : 'start'),
    journal: () => trigger('openJournal'),
    prayer: () => trigger(snapshot.settings.configured ? 'openPrayers' : 'setupLocation'),
    audio: () => trigger('openAudio'),
    tools: () => show('toolsDialog')
  };
  const shape = (spot, state) => ({...spot, ...spot.states?.[state]});
  const anchorName = spot => spot.anchor === 'timerAnchor' ? scene.timerAnchor : spot.anchor;
  function points(spot, state) {
    const anchor = scene.anchors[anchorName(spot)];
    return anchor ? (anchor.states?.[state]?.quad || anchor.quad) : shape(spot,state).poly;
  }
  function bounds(poly) {
    const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  // Project a 240 x 150 HTML screen onto the measured four corners.
  function project(q) {
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = q;
    const dx1=x1-x2, dx2=x3-x2, dy1=y1-y2, dy2=y3-y2;
    const sx=x0-x1+x2-x3, sy=y0-y1+y2-y3;
    const det=dx1*dy2-dx2*dy1;
    if (Math.abs(det)<0.01) return;
    const g=(sx*dy2-dx2*sy)/det, h=(dx1*sy-sx*dy1)/det;
    const matrix=[(x1-x0+g*x1)/240,(y1-y0+g*y1)/240,0,g/240,
      (x3-x0+h*x3)/150,(y3-y0+h*y3)/150,0,h/150,0,0,1,0,x0,y0,0,1];
    $('screenFace').style.transform='matrix3d('+matrix.join(',')+')';
  }
  function layout() {
    const stage=$('gameRoom'), world=$('roomWorld');
    if (!ready || stage.hidden) return;
    const {w,h}=scene.image, width=stage.clientWidth, height=stage.clientHeight;
    // Preserve the desk and both plates' hotspots across a crossfade. Tablets
    // can need a little overscan beyond the image; the backdrop fills that edge.
    const frame = [...scene.frame];
    for (const state of Object.keys(scene.states)) {
      for (const spot of scene.hotspots) {
        if (shape(spot,state).enabled === false) continue;
        const [x0,y0,x1,y1] = bounds(points(spot,state));
        frame[0]=Math.min(frame[0],x0); frame[1]=Math.min(frame[1],y0);
        frame[2]=Math.max(frame[2],x1); frame[3]=Math.max(frame[3],y1);
      }
    }
    const cover = Math.max(width/w,height/h);
    const barHeight = calibration ? $('calBar').offsetHeight+14 : 0;
    scale = calibration ? Math.min(width/w,(height-barHeight)/h) :
      Math.min(cover,width/(frame[2]-frame[0]),height/(frame[3]-frame[1]));
    function offset(view, size, focus, low, high) {
      const extent = size*scale;
      if (extent <= view) return (view-extent)/2;
      return clamp(view/2-focus*extent, Math.max(view-extent,-low*scale),
        Math.min(0,view-high*scale));
    }
    const x=offset(width,w,scene.focus.x,frame[0],frame[2]);
    const y=offset(height-barHeight,h,scene.focus.y,frame[1],frame[3]);
    hitRegions=[];
    world.style.width=w+'px'; world.style.height=h+'px';
    world.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
    for (const spot of scene.hotspots) {
      const button=targets.get(spot.id), poly=points(spot,plate);
      const [left,top,right,bottom]=bounds(poly);
      button.hidden=shape(spot,plate).enabled===false;
      Object.assign(button.style,{left:(left+right)/2+'px',top:(top+bottom)/2+'px',
        width:Math.max(right-left,minTouch/scale)+'px',height:Math.max(bottom-top,minTouch/scale)+'px'});
      if(!button.hidden)hitRegions.push({spot,poly,cx:(left+right)/2,cy:(top+bottom)/2});
      if(spot.action==='timer') project(poly);
      if(spot.action==='lamp') Object.assign($('lampGlow').style,{left:(left+right)/2+'px',top:(top+bottom)/2+'px'});
    }
    if(calibration) drawCalibration();
  }
  function choosePlate(state) {
    plate=state;
    $('gameRoom').dataset.plate=state;
    layout();
  }
  function settled() {
    clearTimeout(settle);
    settle=setTimeout(()=>{
      if(!settling)return;
      settling=false;
      $('sessionSetup').hidden=true;
      $('gameRoom').hidden=false;
      choosePlate('empty');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(phase!=='setup'&&!calibration)choosePlate(phase==='session_focus'?'study_notebook':'empty');
      }));
    },Math.max(0,Math.min(100,enterTime+230-performance.now())));
  }
  function transition(next) {
    if(next===phase || calibration)return;
    const old=phase;
    phase=next;root.dataset.sessionPhase=next;
    if(next==='session_end'||next==='setup'){
      clearTimeout(settle);settling=false;
      $('gameRoom').hidden=true;$('sessionSetup').hidden=false;
      if(old.startsWith('session_') && old!=='session_end')document.querySelector('dialog[open]')?.close();
      choosePlate('empty');
    }else if(old==='setup'||old==='session_end'){
      settling=true;enterTime=performance.now();settled();
    }else if(!settling)choosePlate(next==='session_focus'?'study_notebook':'empty');
  }
  function render(s,v) {
    snapshot=s;values=v;
    if(!ready)return;
    const t=s.timer;
    const active=t.status==='running'||t.status==='paused'||Boolean(t.autoBreakRemainingMs);
    const next=active?(t.phase==='focus'?'session_focus':'session_break'):(t.status==='finished'?'session_end':'setup');
    transition(next);
    $('setupTime').textContent=v.time;$('setupPrayer').textContent=v.prayer;
    if(document.activeElement!==$('setupGoal'))$('setupGoal').value=s.settings.task||'';
    for(const b of document.querySelectorAll('[data-setup-preset]')){
      const source=document.querySelector('[data-focus="'+b.dataset.setupPreset+'"]');
      b.disabled=source.disabled;b.setAttribute('aria-pressed',source.getAttribute('aria-pressed'));
    }
    $('setupCustom').textContent=$('customTimerLabel').textContent;
    $('setupCustom').setAttribute('aria-pressed',$('customTimer').getAttribute('aria-pressed'));
    $('beginSession').querySelector('span').textContent=$('startLabel').textContent;
    $('screenDigits').textContent=v.remaining;
    $('screenPhase').textContent=t.status==='paused'?'متوقّف':t.autoBreakRemainingMs?'اكتمل التركيز':t.phase==='focus'?'تركيز':'استراحة';
    $('sessionNotice').hidden=!t.autoBreakRemainingMs;
    $('sessionNotice').querySelector('span').textContent=$('autoBreakText').textContent;
    const level=Number(s.settings.lampLevel??45);
    if(document.activeElement!==$('lampLevel'))$('lampLevel').value=level;
    $('lampGlow').style.opacity=level/100;
    $('gameRoom').dataset.mood=s.settings.visualScene||'rain';
    $('gameRoom').style.setProperty('--window-color',hues[$('gameRoom').dataset.mood]||'transparent');
  }
  function distanceToPolygon(x, y, poly) {
    let inside=false, edge=Infinity;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const [ax,ay]=poly[j], [bx,by]=poly[i], dx=bx-ax, dy=by-ay;
      if((ay>y)!==(by>y) && x<ax+(y-ay)*dx/dy)inside=!inside;
      const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy || 1),0,1);
      edge=Math.min(edge,(x-ax-t*dx)**2+(y-ay-t*dy)**2);
    }
    return inside?0:edge;
  }
  function hitAt(event) {
    const rect=$('roomWorld').getBoundingClientRect();
    const x=(event.clientX-rect.left)/scale, y=(event.clientY-rect.top)/scale;
    const half=minTouch/(2*scale);
    let best=null, shortest=Infinity, bestCenter=Infinity;
    for(const {spot,poly,cx,cy} of hitRegions){
      const distance=distanceToPolygon(x,y,poly);
      // Touch padding is a 48dp square. Where padding overlaps a different
      // actual object, its painted polygon always takes precedence.
      if(distance>0 && (Math.abs(x-cx)>half || Math.abs(y-cy)>half))continue;
      const center=(x-cx)**2+(y-cy)**2;
      if(distance<shortest || (distance===shortest && center<bestCenter)){
        best=spot; shortest=distance; bestCenter=center;
      }
    }
    return best;
  }
  function activate(spot) {
    if(!spot || calibration)return;
    if(spot.action!=='timer' && window.Sakin.touchFeedback)window.Sakin.touchFeedback();
    const el=targets.get(spot.id);
    el.classList.add('pulse');
    setTimeout(()=>el.classList.remove('pulse'),320);
    actions[spot.action]();
  }
  function buildTargets() {
    const layer=$('roomTargets');
    for(const spot of scene.hotspots){
      const el=document.createElement('button');
      el.className='room-target';el.dataset.id=spot.id;el.setAttribute('aria-label',spot.label);
      el.title=spot.label;targets.set(spot.id,el);layer.append(el);
      // Keyboard, TalkBack and switch access activate the explicitly focused object.
      el.addEventListener('click',event=>{if(event.detail===0)activate(spot);});
    }
    layer.oncontextmenu=e=>e.preventDefault();
    layer.onpointerdown=e=>{
      if(e.button!==0 || !e.isPrimary || calibration)return;
      clearTimeout(hold);
      const spot=hitAt(e);
      if(!spot){pressed=null;return;}
      pressed={spot,id:e.pointerId,x:e.clientX,y:e.clientY,long:false};
      layer.setPointerCapture(e.pointerId);
      if(spot.action==='timer')hold=setTimeout(()=>{
        if(!pressed)return;
        pressed.long=true;
        hooks.command('reset');
      },650);
    };
    layer.onpointermove=e=>{
      if(pressed?.id===e.pointerId && Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>12){
        clearTimeout(hold);pressed=null;
      }
    };
    layer.onpointerup=e=>{
      if(pressed?.id!==e.pointerId)return;
      clearTimeout(hold);
      const done=pressed;pressed=null;
      if(!done.long && hitAt(e)===done.spot)activate(done.spot);
    };
    layer.onpointercancel=layer.onlostpointercapture=()=>{clearTimeout(hold);pressed=null;};
    for(const poly of scene.windowPanes) {
      const p=document.createElementNS(svgNS,'polygon');p.setAttribute('points',poly.map(v=>v.join(',')).join(' '));$('glassClip').append(p);
    }
  }
  function drawCalibration() {
    const map=$('calMap');
    map.setAttribute('viewBox','0 0 '+scene.image.w+' '+scene.image.h);
    // Preserve captured pointer while the selected vertex moves.
    map.replaceChildren();
    for(const spot of calibrationObjects){
      const poly=points(spot,calState), selected=spot.id===$('calObject').value;
      const p=document.createElementNS(svgNS,'polygon');p.setAttribute('points',poly.map(v=>v.join(',')).join(' '));
      p.setAttribute('fill',selected?'#ffc65b55':'#162c4140');p.setAttribute('stroke',selected?'#ffe38b':'#a1e9ed');p.setAttribute('stroke-width',2/scale);
      map.append(p);
      if(shape(spot,calState).enabled===false)p.setAttribute('stroke-dasharray','8 6');
    }
    // Draw handles last so a neighbouring polygon cannot intercept a drag.
    const selected=calibrationObjects.find(o=>o.id===$('calObject').value);
    points(selected,calState).forEach(([x,y],i)=>{
      const c=document.createElementNS(svgNS,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);
      c.setAttribute('r',9/scale);c.classList.add('handle');c.dataset.index=i;map.append(c);
    });
    const toggle=$('calEnabled');
    toggle.hidden=selected.reserved===true || selected.action==='tools' || selected.action==='timer';
    toggle.textContent=shape(selected,calState).enabled===false?'تفعيل العنصر':'تعطيل العنصر';

  }
  function calibrationMode(on) {
    calibration=on;
    $('calBar').hidden=!on;
    $('calMap').toggleAttribute('hidden', !on);
    $('roomTargets').inert=on;
    if(on){document.querySelector('dialog[open]')?.close();$('sessionSetup').hidden=true;$('gameRoom').hidden=false;
      $('calState').value=calState;choosePlate(calState);
    }else{
      phase='';render(snapshot,values);
      if(phase.startsWith('session_')&&phase!=='session_end'){$('gameRoom').hidden=false;choosePlate(phase==='session_focus'?'study_notebook':'empty');}
    }
  }
  function validPolygon(poly, quad) {
    if(!Array.isArray(poly) || poly.length<3 || (quad && poly.length!==4))return false;
    if(!poly.every(p=>Array.isArray(p) && p.length===2 && Number.isFinite(p[0]) &&
      Number.isFinite(p[1]) && p[0]>=0 && p[0]<=scene.image.w && p[1]>=0 && p[1]<=scene.image.h))return false;
    const signedArea=poly.reduce((sum,[x,y],i)=>{
      const [xx,yy]=poly[(i+1)%poly.length];return sum+x*yy-xx*y;
    },0);
    if(Math.abs(signedArea)<16)return false;
    if(!quad)return true;
    return poly.every(([x,y],i)=>{
      const [bx,by]=poly[(i+1)%4],[cx,cy]=poly[(i+2)%4];
      return (bx-x)*(cy-by)-(by-y)*(cx-bx)>1;
    });
  }
  function restoreGeometry(saved) {
    const apply=(owner,edit,key)=>{
      if(!edit)return;
      if(validPolygon(edit[key],key==='quad'))owner[key]=edit[key];
      for(const state of Object.keys(scene.states)){
        const patch=edit.states?.[state];if(!patch)continue;
        owner.states??={};owner.states[state]??={};
        if(validPolygon(patch[key],key==='quad'))owner.states[state][key]=patch[key];
        if(typeof patch.enabled==='boolean')owner.states[state].enabled=patch.enabled;
      }
    };
    for(const [name,owner] of Object.entries(scene.anchors))apply(owner,saved.anchors?.[name],'quad');
    for(const spot of scene.hotspots)apply(spot,saved.hotspots?.find(edit=>edit.id===spot.id),'poly');
  }
  function wireCalibration() {
    const map=$('calMap');
    calibrationObjects=[...scene.hotspots];
    for(const name of Object.keys(scene.anchors)){
      if(!scene.hotspots.some(spot=>anchorName(spot)===name)){
        calibrationObjects.push({id:'anchor-'+name,anchor:name,reserved:true,label:name==='clock'?'موضع ساعة الحائط':name});
      }
    }
    for(const s of calibrationObjects)$('calObject').add(new Option(s.label,s.id));
    const toggle=document.createElement('button');toggle.id='calEnabled';toggle.type='button';
    $('calBar').insertBefore(toggle,$('calExport'));
    toggle.onclick=()=>{
      const spot=scene.hotspots.find(s=>s.id===$('calObject').value);
      if(!spot)return;
      const enabled=shape(spot,calState).enabled===false;
      spot.states??={};
      spot.states[calState]={...spot.states[calState],enabled};
      layout();
    };
    $('calStart').onclick=()=>calibrationMode(true);
    $('calState').onchange=()=>{calState=$('calState').value;choosePlate(calState);};
    $('calObject').onchange=drawCalibration;
    map.onpointerdown=e=>{
      if(e.target.dataset.index===undefined)return;
      captured={i:Number(e.target.dataset.index),pid:e.pointerId};
      map.setPointerCapture(e.pointerId);e.preventDefault();
    };
    map.onpointermove=e=>{
      if(captured?.pid!==e.pointerId)return;
      const r=map.getBoundingClientRect(), spot=calibrationObjects.find(s=>s.id===$('calObject').value);
      const poly=points(spot,calState).map(p=>[...p]);
      poly[captured.i]=[Math.round(Math.max(0,Math.min(scene.image.w,(e.clientX-r.left)/scale))),Math.round(Math.max(0,Math.min(scene.image.h,(e.clientY-r.top)/scale)))];
      const anchor=scene.anchors[anchorName(spot)], owner=anchor||spot, key=anchor?'quad':'poly';
      if(!validPolygon(poly,Boolean(anchor)))return;
      if(calState==='empty' && !owner.states?.empty?.[key]){
        // Keep the other photograph calibrated independently when a formerly
        // shared default moves in the empty room.
        owner.states??={};
        for(const state of Object.keys(scene.states)){
          if(state!==calState && !owner.states[state]?.[key]){
            owner.states[state]={...owner.states[state],[key]:owner[key].map(p=>[...p])};
          }
        }
        owner[key]=poly;
      }
      else{owner.states??={};owner.states[calState]={...owner.states[calState],[key]:poly};}
      layout();
    };
    map.onpointerup=map.onpointercancel=()=>{captured=null;};
    $('calDone').onclick=()=>{
      try{localStorage.setItem(storageKey,JSON.stringify({anchors:scene.anchors,hotspots:scene.hotspots.map(s=>({id:s.id,poly:s.poly,states:s.states}))}));}catch{}
      calibrationMode(false);
    };
    $('calExport').onclick=()=>{$('calJson').value=JSON.stringify(scene,null,2);show('calDialog');$('calJson').select();};
    $('copyCal').onclick=async()=>{const box=$('calJson');box.focus();box.select();
      try{await navigator.clipboard.writeText(box.value);hooks.toast('تم النسخ');}catch{hooks.toast('النص محدّد، اضغط مطوّلًا لنسخه');}};
  }
  async function connect(callbacks) {
    hooks=callbacks;
    try{
      const response=await fetch('room/scene.json');
      if(!response.ok)throw Error('scene');
      scene=await response.json();
      await Promise.all(Object.entries(scene.states).map(async([id,state])=>{
        const img=$(id==='empty'?'emptyPlate':'studyPlate');img.src=state.base;await img.decode();
      }));
      try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved){
        restoreGeometry(saved);
      }}catch{}
      const glass = scene.windowGlass;
      const view = $('windowView');
      Object.assign(view.style, {
        left: glass.x + 'px', top: glass.y + 'px',
        width: glass.width + 'px', height: glass.height + 'px'
      });
      window.SakinRoom.enableWindowScenes();
      buildTargets();wireCalibration();
      for(const b of document.querySelectorAll('[data-setup-preset]'))b.onclick=()=>document.querySelector('[data-focus="'+b.dataset.setupPreset+'"]').click();
      $('setupPrayer').onclick=actions.prayer;
      $('setupGoal').onchange=()=>hooks.save({task:$('setupGoal').value.trim()});
      $('beginSession').onclick=()=>trigger('start');
      $('toolLamp').onclick=actions.lamp;
      $('toolDisplay').onclick=()=>trigger('displayMode');
      $('endSession').onclick=()=>{if(hooks.command('reset') && snapshot.timer.phase!=='focus')hooks.command('next');$('toolsDialog').close();};
      $('lampLevel').oninput=()=>{$('lampGlow').style.opacity=$('lampLevel').value/100;};
      $('lampLevel').onchange=()=>hooks.save({lampLevel:Number($('lampLevel').value)});
      for(const b of document.querySelectorAll('[data-control]'))b.onclick=()=>b.dataset.control==='openPrayers'?actions.prayer():trigger(b.dataset.control);
      window.addEventListener('resize',()=>{layout();if(settling)settled();});
      ready=true;root.dataset.game='ready';root.dataset.sessionPhase='setup';
      $('sessionSetup').hidden=false;hooks.refresh();
    }catch(error){
      delete root.dataset.game;$('sessionSetup').hidden=true;$('gameRoom').hidden=true;
      console.warn('Original room active. Game room could not load.',error);
    }
  }
  function back(){
    if(calibration){calibrationMode(false);return true;}
    if(ready&&!$('gameRoom').hidden){show('toolsDialog');return true;}
    return false;
  }
  window.GameRoom={connect,render,back};
})();
