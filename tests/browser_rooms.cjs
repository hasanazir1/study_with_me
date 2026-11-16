/* Actual bundled room/UI files with a mock native bridge; not an Android test. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=spawn(process.env.PYTHON||'python',['tests/preview_server.py','8766'],{cwd:root,windowsHide:true,stdio:'pipe'});
let browser;
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>{if(c)reject(new Error('Preview server exited '+c));});});
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [w,h]of [[320,568],[396,806],[784,388],[568,320],[1151,791]]){
  await page.setViewportSize({width:w,height:h});await page.goto('http://127.0.0.1:8766');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);
  await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({configured:true,city:'الخليل',timezone:'Asia/Hebron',latitude:31.5326,longitude:35.0998})));
  await page.waitForTimeout(1050);
  const bounds=await page.evaluate(()=>{
   const r=id=>{const b=document.getElementById(id).getBoundingClientRect();return {id,x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
   return {scroll:document.documentElement.scrollHeight,room:r('roomPanel'),stage:r('timerStage'),items:['roomPanel','openRoom','timer','start','reset','nextPhase','fitPrayer','soundToggle','openPrayers','openSettings'].map(r)};
  });
  assert(bounds.scroll<=h+1,JSON.stringify(bounds));
  for(const b of bounds.items)assert(b.w>0&&b.h>0&&b.x>=-.5&&b.y>=-.5&&b.right<=w+.5&&b.bottom<=h+.5,JSON.stringify(b));
  assert(bounds.room.h>=60&&bounds.room.w>=90,JSON.stringify(bounds.room));
  assert(bounds.room.bottom<=bounds.stage.y+.5||bounds.room.right<=bounds.stage.x+.5||bounds.stage.right<=bounds.room.x+.5,JSON.stringify(bounds));
  await page.locator('#openRoom').click();await page.waitForTimeout(480);
  assert.equal(await page.locator('[data-room-choice]').count(),6);
  for(const id of ['nature','fire','cafe','night','quiet','rain']){
   await page.locator(`[data-room-choice="${id}"]`).click();
   assert.equal(await page.evaluate(()=>window.__preview.settings.visualScene),id);
   assert.equal(await page.locator('.room-scene.is-active').getAttribute('data-scene'),id);
   assert.equal(await page.evaluate(()=>window.__preview.settings.sound),'rain','Visual choice must not change audio');
   assert.equal(await page.locator('.room-scene.is-active').count(),1);
  }
  await page.locator('[data-room-choice="night"]').click();assert(await page.locator('#roomSound').isHidden());
  await page.locator('[data-room-choice="nature"]').click();await page.locator('#roomSound').click();assert.equal(await page.evaluate(()=>window.__preview.settings.sound),'stream');
  await page.locator('#roomDialog [data-close]').click();await page.waitForTimeout(250);
  if(process.env.SAKIN_SCREENSHOTS&&w!==568){fs.mkdirSync(process.env.SAKIN_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SAKIN_SCREENSHOTS,`sakin-phase3-${w}x${h}.png`)});}
  console.log('PASS room, controls, six scenes and independent sound:',w+'x'+h);
 }
 await page.setViewportSize({width:396,height:806});await page.reload();await page.waitForTimeout(250);
 await page.locator('#openRoom').click();await page.waitForTimeout(450);
 // Repeated changes reuse exactly two SVG layers; no accumulating particles/timers.
 for(let i=0;i<30;i++)await page.locator(`[data-room-choice="${i%2?'rain':'fire'}"]`).click();
 assert.equal(await page.locator('.room-scene').count(),2);assert.equal(await page.locator('.room-scene svg').count(),2);
 await page.locator('#roomDialog [data-close]').click();await page.waitForTimeout(250);
 await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({theme:'dark',lightEffects:true})));await page.waitForTimeout(1050);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 if(process.env.SAKIN_SCREENSHOTS)await page.screenshot({path:path.join(process.env.SAKIN_SCREENSHOTS,'sakin-phase3-dark.png')});
 assert.equal(await page.locator('.room-scene.is-active .room-rain').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({lightEffects:false,visualScene:'rain'})));await page.waitForTimeout(1050);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.room-scene.is-active .room-rain').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Simulate lifecycle delivery; actual Android visibility still needs a phone.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('.room-scene.is-active .room-rain').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('.room-scene.is-active .room-rain').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
 const ids=await page.locator('[id]').evaluateAll(els=>els.map(el=>el.id));assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(errors,[]);console.log('PASS rapid changes, unique SVG IDs, dark/light effects, reduced motion, pause/resume and no JS errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
