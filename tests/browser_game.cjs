/* Exercise the actual game entry point with a deterministic native bridge. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.env.PYTHON || 'python',['tests/preview_server.py','8767'],{
  cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:'pipe'
});
let browser;
(async()=>{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
  const page=await browser.newPage({viewport:{width:393,height:852}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const loc=s=>page.locator(s);
  const target=id=>loc('.room-target[data-id="'+id+'"]');
  const screenshot=async name=>{if(process.env.SAKIN_SCREENSHOTS){
    fs.mkdirSync(process.env.SAKIN_SCREENSHOTS,{recursive:true});
    await page.screenshot({path:path.join(process.env.SAKIN_SCREENSHOTS,'phase-a-'+name+'.png')});
  }};
  await page.goto('http://127.0.0.1:8767');
  await loc('html[data-game=ready]').waitFor();
  await page.evaluate(()=>Sakin.saveSettings(JSON.stringify({configured:true,city:'الخليل',timezone:'Asia/Hebron'})));
  await loc('[data-setup-preset="50"]').click();
  assert.equal(await loc('[data-setup-preset="50"]').getAttribute('aria-pressed'),'true');
  await loc('#setupGoal').fill('الفصل الثاني');
  await loc('#setupCustom').click();
  await loc('#focusMinutes').fill('1');await loc('#breakMinutes').fill('1');
  await loc('#customForm button').click();
  await screenshot('setup');
  await loc('#beginSession').click();
  await page.setViewportSize({width:844,height:390});
  await loc('#gameRoom[data-plate=study_notebook]').waitFor();
  await page.waitForTimeout(950);
  await screenshot('focus');
  assert(await target('paper').isHidden());
  assert.equal(await page.evaluate(()=>__preview.settings.task),'الفصل الثاني');
  for(const [w,h] of [[844,390],[800,360],[768,432],[1024,768],[568,320]]){
    await page.setViewportSize({width:w,height:h});
    for(const id of ['timer','window','book','device','lamp','drawer']){
      const b=target(id);await b.click({trial:true,timeout:4000});
      const box=await b.boundingBox();assert(box.width>=47.9&&box.height>=47.9,id);
    }
  }
  await target('book').click();await loc('#journalDialog').waitFor();
  await loc('#journalDialog [data-close]').click();
  await target('device').click();await loc('#audioDialog').waitFor();await loc('#audioDialog [data-close]').click();
  await target('window').click();await loc('[data-room-choice=night]').click();await loc('#roomDialog [data-close]').click();
  await target('lamp').click();await loc('#lampLevel').fill('72');await loc('#lampLevel').dispatchEvent('change');
  assert.equal(await page.evaluate(()=>__preview.settings.lampLevel),72);await loc('#lampDialog [data-close]').click();
  await target('drawer').click();await loc('#toolsDialog [data-control=openPrayers]').click();
  await loc('#prayersDialog').waitFor();await loc('#prayersDialog [data-close]').click();
  await target('timer').click();assert.equal(await page.evaluate(()=>__preview.timer.status),'paused');
  await target('timer').click();await page.evaluate(()=>__preview.advance(60000));
  await loc('#sessionNotice').waitFor();await page.evaluate(()=>__preview.advance(5100));
  await loc('#gameRoom[data-plate=empty]').waitFor();await target('paper').click();await loc('#prayersDialog [data-close]').click();
  await page.evaluate(()=>__preview.advance(60500));await loc('#sessionSetup').waitFor();
  await loc('#sessionSetup [data-control=openSettings]').click();
  await loc('.cal-settings summary').click();await loc('#calStart').click();
  await loc('#calObject').selectOption('timer');const handle=loc('#calMap circle').first();
  const b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
  await page.mouse.down();await page.mouse.move(b.x+b.width/2+9,b.y+b.height/2);await page.mouse.up();
  await loc('#calExport').click();const exported=JSON.parse(await loc('#calJson').inputValue());assert.notEqual(exported.anchors.laptop.quad[0][0],650);
  await loc('#calDialog [data-close]').click();await loc('#calDone').click();await loc('#sessionSetup').waitFor();
  assert.deepEqual(errors,[]);console.log('PASS game: setup, five layouts, room objects, timer phases, saved settings, prayer access and calibration.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
