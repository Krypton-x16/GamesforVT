import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
const env={...process.env,SECTOR09_TEST:'1',SECTOR09_DEV_URL:'http://127.0.0.1:5179'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.','--user-data-dir='+process.cwd()+'/test-results/runtime-profile-'+Date.now()],env});
const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.reload();
await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>{localStorage.removeItem('sector09.save.v1');});await page.reload();await page.waitForFunction(()=>!!window.__game);
await page.click('#play');await page.evaluate(()=>window.__game.pause());
const result=await page.evaluate(async()=>{
  const g=window.__game,checks=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  g.running=true;document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));const before=g.player.position.z;for(let i=0;i<20;i++)g.tick(.05);document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));g.running=false;check(g.player.position.z<before-5,'W moves player with keyboard input');
  const wall=g.world.colliders.find(b=>b.h>10);g.player.position.set(wall.x-wall.w/2-2,0,wall.z);g.move(g.player,wall.w+5,0);check(g.player.position.x<wall.x-wall.w/2,'Building collision prevents tunnelling');
  const car=g.world.cars[0];g.player.position.copy(car.mesh.position).add({x:3,y:0,z:0});g.interact();check(g.inCar===car,'Enter parked car');g.keys.add('KeyW');const z=car.mesh.position.z;for(let i=0;i<30;i++)g.tick(.05);g.keys.clear();check(car.mesh.position.z<z-8,'Car accelerates and travels');car.speed=0;car.vx=0;car.vz=0;g.interact();check(!g.inCar&&g.player.visible,'Exit car safely');
  check(g.accept('courier'),'Accept delivery');g.player.position.set(-96,0,56);g.updateMission(0);g.interact();check(g.active.stage===1,'Pick up delivery with E interaction');g.player.position.set(83,0,-72);g.updateMission(0);g.interact();check(!g.active&&g.save.completed.includes('courier')&&g.save.money===1500,'Delivery pays exactly 900');
  const shootAll=()=>{for(const e of [...g.enemies]){const p=e.mesh.position;const d=[[0,1],[0,-1],[1,0],[-1,0]].find(([x,z])=>g.canStand(p.x+x*10,p.z+z*10,.5)&&g.canStand(p.x+x*7,p.z+z*7,.5)&&g.lineClear({x:p.x+x*10,z:p.z+z*10},p));if(!d)throw Error('No clear shooting position');g.player.position.set(p.x+d[0]*7,0,p.z+d[1]*7);g.camera.position.set(p.x+d[0]*10,1.5,p.z+d[1]*10);g.camera.lookAt(p.x,1.2,p.z);g.camera.updateMatrixWorld();g.yaw=Math.atan2(d[0],d[1]);g.ammo.pistol=12;g.reload=0;for(let i=0;i<3;i++){g.shotCooldown=0;g.shoot();for(let frame=0;frame<30;frame++)g.ballistics.update(1/120);}check(e.hp<=0,'Flying bullets defeat enemy: '+JSON.stringify({x:e.mesh.position.x,z:e.mesh.position.z,hp:e.hp,clear:g.lineClear(g.player.position,e.mesh.position)}));}};
  check(g.accept('clear'),'Accept combat contract');shootAll();check(!g.active&&g.save.completed.includes('clear'),'Combat mission completes after four enemies');
  check(g.buy('rifle').ok,'Earned money buys rifle');g.switchWeapon('pistol');
  check(g.accept('data'),'Accept data mission');shootAll();check(g.active?.kills===5,'Five guards eliminated');g.player.position.set(118,0,67);g.updateMission(0);g.interact();check(!g.active&&g.save.completed.includes('data'),'Retrieve data and finish mission');
  check(g.accept('race'),'Accept driving mission');g.inCar=car;g.player.visible=false;for(const p of g.racePoints){car.mesh.position.set(p.x,0,p.z);g.player.position.copy(car.mesh.position);g.updateMission(.1);}check(!g.active&&g.save.completed.includes('race'),'All five race checkpoints complete in a car');
  check(g.accept('race'),'Replay driving mission');g.inCar=null;g.player.position.set(0,0,72);g.updateMission(.1);check(g.active.stage===0,'On-foot checkpoint does not count');g.inCar=car;g.raceTime=.001;g.updateMission(.1);check(!g.active,'Expired race can be retried');
  g.inCar=null;g.player.visible=true;g.health=40;check(g.buy('heal').ok&&g.health===100,'Shop heals player');check(g.buy('armor').ok,'Shop grants armor');const hp=g.health;g.damage(10);check(g.health===hp-3&&g.save.armor===93,'Armor absorbs 70 percent of damage');
  check(g.buy('skin').ok&&g.save.credits===250,'Demo cosmetic uses test tokens');g.persist();
  g.accept('courier');g.health=1;g.damage(100);check(!g.running&&g.health===0,'Death pauses play');g.respawn();g.pause();check(g.health===100&&!g.active,'Respawn clears failed contract');
  g.player.position.set(0,0,24);g.camera.position.set(0,3.5,31);g.camera.lookAt(0,1.5,24);g.persist();
  return {checks,save:JSON.parse(localStorage.getItem('sector09.save.v1')),calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};
});
console.log(JSON.stringify(result,null,2));assert.equal(result.save.completed.length,4);assert.equal(result.save.rifle,true);assert.equal(result.save.skin,true);
await page.reload();await page.waitForFunction(()=>!!window.__game);const restored=await page.evaluate(()=>({money:window.__game.save.money,completed:window.__game.save.completed,rifle:window.__game.save.rifle,skin:window.__game.save.skin}));assert.equal(restored.money,result.save.money);assert.equal(restored.completed.length,4);assert.equal(restored.rifle,true);assert.equal(restored.skin,true);console.log('PASS: reload restores rewards, gear, cosmetics and mission progress');
await page.click('#play');await page.evaluate(()=>window.__game.pause());await page.keyboard.press('Escape');await page.click('#pauseMissions');await page.screenshot({path:'test-results/missions.png'});await page.click('#closePanel');await page.evaluate(()=>window.__game.pause());await page.click('#wallet');await page.click('#donateTab');await page.screenshot({path:'test-results/donate.png'});assert.equal(await page.getByRole('button',{name:'ПЛАТЕЖИ НЕ ПОДКЛЮЧЕНЫ',exact:true}).isDisabled(),true);
assert.deepEqual(errors,[]);console.log('PASS: menus render and real payments remain disabled; no renderer errors');
}finally{await app.close();}




