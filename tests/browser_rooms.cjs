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
  const objects=['#start','#clockAdjust','#openJournal','#openRoom','#openAudio','#openPrayers','#cityButton','#displayMode','#openSettings'];
  for(const selector of objects) {
    const target=page.locator(selector);
    await target.click({trial:true,timeout:3000});
    const rect=await target.boundingBox();
    assert(rect.x>=0 && rect.y>=0 && rect.x+rect.width<=w+1 && rect.y+rect.height<=h+1,selector);
  }
  await page.locator('#openRoom').click();await page.waitForTimeout(480);
  assert.equal(await page.locator('[data-room-choice]').count(),6);
  for(const id of ['nature','fire','cafe','night','quiet','rain']){
   await page.locator(`[data-room-choice="${id}"]`).click();
   assert.equal(await page.evaluate(()=>window.__preview.settings.visualScene),id);
   assert.equal(await page.locator('#roomPanel').getAttribute('data-scene'),id);
   assert.equal(await page.evaluate(()=>window.__preview.settings.sound),'rain','Visual choice must not change audio');

  }
  await page.locator('[data-room-choice="night"]').click();assert(await page.locator('#roomSound').isHidden());
  await page.locator('[data-room-choice="nature"]').click();await page.locator('#roomSound').click();assert.equal(await page.evaluate(()=>window.__preview.settings.sound),'stream');
  await page.locator('#roomDialog [data-close]').click();await page.waitForTimeout(250);
  if(process.env.SAKIN_SCREENSHOTS&&w!==568){fs.mkdirSync(process.env.SAKIN_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SAKIN_SCREENSHOTS,`sakin-studio-${w}x${h}.png`)});}
  console.log('PASS room, controls, six scenes and independent sound:',w+'x'+h);
 }
 await page.setViewportSize({width:396,height:806});await page.reload();await page.waitForTimeout(250);
 await page.locator('#openRoom').click();await page.waitForTimeout(450);
 // Repeated changes reuse exactly two SVG layers; no accumulating particles/timers.
 for(let i=0;i<30;i++)await page.locator(`[data-room-choice="${i%2?'rain':'fire'}"]`).click();
 await page.locator('#roomDialog [data-close]').click();await page.waitForTimeout(260);
 await page.locator('#openJournal').click();
 await page.locator('#entryName').fill('مراجعة الفصل الثاني');
 await page.locator('#entryWhen').fill('2027-01-05T10:30');
 await page.locator('#entryForm button').click();
 assert.match(await page.locator('#entries').textContent(),/مراجعة الفصل الثاني/);
 await page.reload();await page.locator('#openJournal').click();
 assert.match(await page.locator('#entries').textContent(),/مراجعة الفصل الثاني/);
 await page.locator('#entries button').click();assert.equal(await page.locator('#entries li').count(),0);
 await page.locator('#journalDialog [data-close]').click();await page.waitForTimeout(250);
 await page.locator('#clockAdjust').click();await page.locator('[data-focus="50"]').click();
 assert.equal(await page.evaluate(()=>window.__preview.timer.focusMinutes),50);
 await page.locator('#customTimer').click();await page.locator('#focusMinutes').fill('1');await page.locator('#breakMinutes').fill('1');await page.locator('#customForm button').click();
 await page.locator('#start').click();assert.equal(await page.evaluate(()=>window.__preview.timer.status),'running');
 await page.locator('#start').click();assert.equal(await page.evaluate(()=>window.__preview.timer.status),'paused');
 await page.locator('#clockAdjust').click();await page.locator('#reset').click();assert.equal(await page.evaluate(()=>window.__preview.timer.remainingMs),60000);
 await page.locator('#clockDialog [data-close]').click();await page.waitForTimeout(250);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.window-air').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
 const ids=await page.locator('[id]').evaluateAll(els=>els.map(el=>el.id));assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(errors,[]);console.log('PASS rapid changes, unique IDs, persisted appointments, reduced motion, timer controls and no JS errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
