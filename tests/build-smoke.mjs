import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
const env={...process.env,SECTOR09_TEST:'1'};delete env.ELECTRON_RUN_AS_NODE;delete env.SECTOR09_DEV_URL;
const app=await electron.launch({args:['.','--user-data-dir='+process.cwd()+'/test-results/build-smoke-'+Date.now()],env});
try{const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));await page.waitForSelector('#play:not(:disabled)',{timeout:60000});await page.click('#play');await page.waitForTimeout(1000);assert.equal(await page.locator('#fatal').isVisible(),false);await page.screenshot({path:'test-results/build-smoke.png'});assert.deepEqual(errors,[]);console.log('PASS: production file loads all local character assets and renders without failed requests.');}finally{await app.close();}
