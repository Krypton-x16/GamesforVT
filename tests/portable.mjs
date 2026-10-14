import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const exe=path.resolve('../build-sector09/Sector-09-Windows.exe');
const env={...process.env,SECTOR09_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.SECTOR09_DEV_URL;
const child=spawn(exe,['--remote-debugging-port=9238','--user-data-dir='+process.cwd()+'/test-results/portable-profile-'+Date.now()],{env,windowsHide:true,stdio:'ignore'});
let browser,page;const errors=[];
try{
  for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:9238/json/version');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
  browser=await chromium.connectOverCDP('http://127.0.0.1:9238');page=browser.contexts()[0].pages()[0];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForSelector('#home');await page.waitForTimeout(1300);assert.equal(await page.locator('#fatal').isVisible(),false);assert.equal(await page.locator('#world canvas').count(),1);assert.equal(await page.evaluate(()=>typeof window.__game),'undefined');
  assert.match(await page.locator('.build-label').textContent(),/0\.5/);
  await page.screenshot({path:'test-results/final-home.png'});await page.click('#homeSettings');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'quality');await page.click('#closePanel');
  await page.click('#play');await page.waitForTimeout(1200);await page.screenshot({path:'test-results/final-game.png'});
  // Verify the packaged app's actual keyboard menus and fresh starting balance.
  await page.keyboard.press('Escape');if(!(await page.locator('#panel').isVisible()))await page.click('#pauseButton');await page.click('#pauseMissions');assert.equal(await page.locator('.accept:not(:disabled)').count(),4);await page.click('.accept[data-id="courier"]');await page.waitForFunction(()=>document.getElementById('objectiveTitle').textContent==='Особая доставка',{},{timeout:10000});
  await page.keyboard.press('Escape');if(!(await page.locator('#panel').isVisible()))await page.click('#pauseButton');await page.click('#pauseSettings');await page.selectOption('#quality','low');await page.click('#settingsDone');
  console.log(JSON.stringify({portableExe:exe,title:await page.title(),freshMoney:await page.locator('#money').textContent(),mission:await page.locator('#objectiveTitle').textContent(),devApiAbsent:true,errors}));assert.deepEqual(errors,[]);
}finally{if(page)try{await page.evaluate(()=>window.desktop.quit());}catch{}if(browser)await browser.close();await new Promise(r=>setTimeout(r,800));if(child.exitCode===null)child.kill();}


