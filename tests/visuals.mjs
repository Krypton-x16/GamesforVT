import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
const env={...process.env,SECTOR09_TEST:'1',SECTOR09_DEV_URL:'http://127.0.0.1:5179'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--user-data-dir='+process.cwd()+'/test-results/visuals-'+Date.now()],env}),page=await app.firstWindow(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false));
  await page.reload();await page.waitForFunction(()=>window.__game||document.getElementById('fatalText')?.textContent,null,{timeout:60000});assert.equal(await page.locator('#fatalText').textContent(),'');
  await page.click('#play');await page.evaluate(()=>window.__game.pause());
  const info=await page.evaluate(()=>{const g=window.__game;g.camera.updateMatrixWorld();g.renderer.render(g.scene,g.camera);const surfaces=new Set();g.scene.traverse(m=>{if(m.isMesh&&m.material?.userData.surface)surfaces.add(m.material.userData.surface);});return {surfaces:[...surfaces],texturedFace:!!g.player.userData.parts.head.material.normalMap,headVertices:g.player.userData.parts.head.geometry.attributes.position.count,height:g.player.userData.parts.head.position.y+1+3.973*g.player.userData.parts.head.scale.y,environment:!!g.scene.environment,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};});
  assert.ok(info.texturedFace&&info.headVertices>1000&&info.height<2);assert.ok(info.environment);for(const s of ['brick','stone','plaster','asphalt','paving'])assert.ok(info.surfaces.includes(s));
  await page.screenshot({path:'test-results/visual-street.png'});
  await page.evaluate(()=>{const g=window.__game;g.updateCamera=()=>{};g.player.visible=false;g.camera.position.set(-4,5.2,35);g.camera.lookAt(-23,10,52);g.camera.updateMatrixWorld();});await page.waitForTimeout(200);await page.screenshot({path:'test-results/visual-buildings.png'});
  await page.evaluate(()=>{const g=window.__game;const models=g.world.pedestrians.slice(0,3);models.forEach((p,i)=>{p.mesh.position.set((i-1)*.9,0,18);p.mesh.rotation.set(0,0,0);p.mesh.userData.rig.rotation.set(0,0,0);p.mesh.userData.rig.position.y=1;});g.camera.position.set(.3,1.65,14.9);g.camera.lookAt(0,1.02,18);g.camera.updateMatrixWorld();});await page.waitForTimeout(200);await page.screenshot({path:'test-results/visual-people.png'});
  const frames=await page.evaluate(async()=>{const samples=[];let last=performance.now();for(let i=0;i<6;i++){await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-last);last=now;}return samples.sort((a,b)=>a-b)[3];});
  await page.evaluate(()=>{const g=window.__game;g.settings.quality='low';g.applySettings();});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__game.renderer.shadowMap.enabled),false);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...info,medianFrameMs:Math.round(frames),errors}));console.log('PASS: detailed character assets, all facade materials, environment, shaders and low quality mode');
}finally{await app.close();}
