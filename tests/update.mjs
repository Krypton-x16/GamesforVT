import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
const env={...process.env,SECTOR09_TEST:'1',SECTOR09_DEV_URL:'http://127.0.0.1:5179'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.','--user-data-dir='+process.cwd()+'/test-results/update-'+Date.now()],env});const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.reload();await page.waitForFunction(()=>!!window.__game||document.getElementById('fatalText')?.textContent);const fatal=await page.locator('#fatalText').textContent();if(fatal)throw Error(fatal);await page.click('#play');await page.evaluate(()=>window.__game.pause());
const results=await page.evaluate(()=>{
  const g=window.__game,checks=[],check=(ok,s)=>{if(!ok)throw Error(s);checks.push(s);};
  check(new Set(g.world.cars.map(c=>c.type)).size===4,'Four distinct vehicle types');check(g.world.buildings.some(b=>Math.abs(b.x)>300),'New districts contain buildings');
  g.player.position.set(0,0,-180);g.move(g.player,0,-100);check(g.player.position.z< -270,'Player reaches expanded city beyond old boundary');check(!g.canStand(500,50)&&!g.canStand(1500,0),'New map boundary remains solid');
  g.player.position.set(0,0,24);g.running=true;document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));for(let i=0;i<10;i++)g.tick(.025);check(g.player.position.y>1,'Space produces a real jump');for(let i=0;i<35;i++)g.tick(.025);g.keys.clear();g.running=false;check(g.player.position.y===0&&g.grounded,'Gravity returns player to ground');
  const c=g.world.cars.find(c=>c.type==='sport');c.x=-289;c.z=320;c.angle=0;c.mesh.position.set(c.x,0,c.z);g.inCar=c;g.keys.add('KeyW');for(let i=0;i<80;i++)g.tick(.025);check(c.speed>30,'Sports car acceleration works in game');g.keys.add('KeyD');g.keys.add('Space');for(let i=0;i<15;i++)g.tick(.025);check(Math.abs(c.angle)>.2,'Steering and handbrake turn the moving vehicle');g.keys.clear();
  g.inCar=null;g.player.visible=true;for(const car of g.world.cars){car.x=car.original.x;car.z=car.original.z;car.angle=car.original.angle;car.vx=car.vz=car.speed=car.roll=car.pitch=0;g.syncCar(car,0);}g.player.position.set(0,0,24);g.pause();
  // Freeze this view for visual inspection while still using the real renderer.
  g.updateCamera=()=>{};g.camera.position.set(18,8,15);g.camera.lookAt(5,1,44);g.camera.updateMatrixWorld();g.renderer.render(g.scene,g.camera);
  return {checks,buildings:g.world.buildings.length,cars:g.world.cars.length,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};
});console.log(JSON.stringify(results));await page.screenshot({path:'test-results/new-cars.png'});await page.evaluate(()=>window.__game.emit('menu','map'));await page.screenshot({path:'test-results/new-map.png'});assert.deepEqual(errors,[]);console.log('PASS: expanded world, jump, cars and map render without errors');
}finally{await app.close();}
