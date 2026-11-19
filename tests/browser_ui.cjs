/* Optional Playwright UI tests; previews the real assets with a mock bridge, never Android APIs. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=spawn(process.env.PYTHON||'python',['tests/preview_server.py','8765'],{cwd:root,windowsHide:true,stdio:'pipe'});
let browser;
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>{if(code)reject(new Error('Preview exited '+code));});});
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage();await page.route('**/room/scene.json', route=>route.abort()); // Exercise the illustrated fallback.
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.stack);});
 for(const [width,height]of [[320,568],[396,806],[784,388],[1151,791]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8765/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
  await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({configured:true,city:'الخليل',timezone:'Asia/Hebron',latitude:31.5326,longitude:35.0998})));
  await page.waitForTimeout(1100);assert(await page.locator('#prayerContent').isVisible());
  const layout=await page.evaluate(()=>({w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollHeight,buttons:['start','clockAdjust','openJournal','openAudio','soundToggle','openRoom','openSettings'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom};})}));
  assert(layout.scroll<=height+1,JSON.stringify(layout));for(const b of layout.buttons)assert(b.x>=0&&b.y>=0&&b.right<=width+.5&&b.bottom<=height+.5,JSON.stringify(b));
  await page.locator('#openAudio').click();await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-sound]').count(),5);assert.equal(await page.locator('[data-layer]').count(),2);
  await page.locator('[data-sound="stream"]').click();assert.equal(await page.locator('#soundDescription').textContent(),'مياه جارية وفقاعات خفيفة');
  await page.locator('[data-layer="stream_1"]').fill('37');await page.locator('[data-layer="stream_1"]').dispatchEvent('change');
  assert.equal(await page.evaluate(()=>window.__preview.settings.layerVolumes.stream_1),37);
  await page.locator('#miniSound').click();assert.equal(await page.locator('#miniSound').getAttribute('aria-pressed'),'true');
  await page.locator('#audioSleep').selectOption('15');assert.match(await page.locator('#audioSleepStatus').textContent(),/15|ظ،ظ¥/);
  await page.locator('[data-sound="silence"]').click();assert(await page.locator('#miniSound').isDisabled());
  await page.locator('#audioDialog [data-close]').click();await page.waitForTimeout(250);assert.equal(await page.locator('#audioDialog').getAttribute('open'),null);
  console.log('PASS UI layout and audio controls:',width+'x'+height);
 }
 await page.setViewportSize({width:396,height:806});await page.reload();await page.waitForTimeout(400);
 await page.locator('#start').click();await page.waitForTimeout(5200);assert.equal(await page.locator('html').getAttribute('data-idle'),'true');await page.locator('#start').click();assert.equal(await page.evaluate(()=>window.__preview.timer.status),'paused');await page.locator('#clockAdjust').click();await page.locator('#reset').click();await page.locator('#clockDialog [data-close]').click();await page.waitForTimeout(250);
 await page.locator('#start').click();await page.evaluate(()=>window.__preview.advance(25*60000));await page.waitForTimeout(1100);
 assert(await page.locator('#autoBreakBanner').isVisible());
 await page.locator('#cancelAutoBreak').click();await page.evaluate(()=>window.__preview.advance(6000));await page.waitForTimeout(1100);
 assert.equal(await page.evaluate(()=>window.__preview.timer.status),'finished');
 await page.locator('#clockAdjust').click();await page.locator('#reset').click();await page.locator('#clockDialog [data-close]').click();await page.waitForTimeout(250);await page.locator('#start').click();await page.evaluate(()=>window.__preview.advance(25*60000));await page.waitForTimeout(1100);
 assert(await page.locator('#autoBreakBanner').isVisible());await page.evaluate(()=>window.__preview.advance(5100));await page.waitForTimeout(1100);
 assert.equal(await page.evaluate(()=>window.__preview.timer.phase),'break');assert.equal(await page.evaluate(()=>window.__preview.timer.status),'running');
 await page.evaluate(()=>window.__preview.advance(5*60000));await page.waitForTimeout(1100);
 assert.equal(await page.evaluate(()=>window.__preview.timer.status),'finished');assert(!(await page.locator('#autoBreakBanner').isVisible()));
 await page.locator('#openSettings').click();await page.waitForTimeout(500);await page.locator('#theme').selectOption('dark');await page.locator('#settingsDialog [data-close]').click();await page.waitForTimeout(300);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1100);
 assert.equal(await page.locator('#orbitMarker').evaluate(el=>getComputedStyle(el).display),'none');
 const out=process.env.SAKIN_SCREENSHOTS;if(out){fs.mkdirSync(out,{recursive:true});await page.setViewportSize({width:784,height:388});await page.reload();await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({configured:true,city:'الخليل',timezone:'Asia/Hebron',latitude:31.5326,longitude:35.0998})));await page.waitForTimeout(1100);await page.screenshot({path:path.join(out,'sakin-phase2-landscape.png')});await page.setViewportSize({width:396,height:806});await page.locator('#openAudio').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'sakin-phase2-audio.png')});}
 assert.deepEqual(errors,[]);console.log('PASS UI: rest grace/cancel/automatic start, manual focus, dark theme, reduced motion, no JavaScript errors. Native behavior is tested separately.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
