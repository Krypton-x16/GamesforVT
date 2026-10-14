import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const profile=path.resolve('test-results/migration-'+Date.now());
const env={...process.env,SECTOR09_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.SECTOR09_DEV_URL;
async function run(exe,action){const child=spawn(exe,['--remote-debugging-port=9239','--user-data-dir='+profile],{env,windowsHide:true,stdio:'ignore'});let browser,page;try{for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:9239/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}browser=await chromium.connectOverCDP('http://127.0.0.1:9239');page=browser.contexts()[0].pages()[0];await page.waitForSelector('#play');await action(page);}finally{if(page)try{await page.evaluate(()=>window.desktop.quit());}catch{}if(browser)await browser.close();await new Promise(r=>setTimeout(r,1000));if(child.exitCode===null)child.kill();}}
await run(path.resolve('../../outputs/Sector-09-Windows.exe'),async page=>{await page.click('#play');await page.click('#wallet');await page.click('.buy[data-id="armor"]');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sector09.save.v1')));assert.equal(saved.money,250);assert.equal(saved.armor,100);console.log('Legacy EXE saved purchase.');});
await run(path.resolve('../build-sector09/Sector-09-Windows.exe'),async page=>{assert.match(await page.locator('.build-label').textContent(),/0\.5/);await page.click('#play');await page.waitForFunction(()=>document.getElementById('money').textContent==='250');assert.equal(await page.locator('#armorFill').evaluate(e=>e.style.width),'100%');console.log('PASS: version 0.5 portable EXE loads the old version balance and purchased armor.');});

