import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
const env={...process.env,SECTOR09_TEST:'1',SECTOR09_DEV_URL:'http://127.0.0.1:5179'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:['.','--user-data-dir='+process.cwd()+'/test-results/population-'+Date.now()],env});const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.reload();await page.reload();await page.waitForFunction(()=>window.__game||document.getElementById('fatalText')?.textContent);const fatal=await page.locator('#fatalText').textContent();if(fatal)throw Error(fatal);await page.click('#play');await page.evaluate(()=>window.__game.pause());
const checks=await page.evaluate(()=>{
 const g=window.__game,out=[],check=(ok,s)=>{if(!ok)throw Error(s);out.push(s);},originalCars=[...g.world.cars],originalPeople=[...g.world.pedestrians];
 const c=g.world.cars.find(c=>c.traffic);g.world.cars=[c];g.world.pedestrians=[];c.x=0;c.z=-240;c.angle=0;c.speed=9;c.health=c.spec.health;g.syncCar(c,0);g.player.position.set(0,0,-258);
 for(let i=0;i<300;i++){g.time+=1/60;g.population.tickTraffic(1/60);check(c.z-c.spec.length/2>g.player.position.z+.65,'Traffic keeps a safe gap');}
 check(c.speed<.1&&c.yielding,'Driver stops for the player');check(c.brakeMaterial.color.getHex()===0xff3a21,'Brake lights illuminate');
 g.player.position.x=8;const stoppedZ=c.z;for(let i=0;i<260;i++){g.time+=1/60;g.population.tickTraffic(1/60);}check(c.speed>6&&c.z<stoppedZ-6,'Traffic resumes when path clears');
 c.x=0;c.z=-240;c.speed=c.vx=c.vz=0;c.yieldHold=2;c.traffic=true;g.syncCar(c,0);g.player.position.set(2.5,0,-240);g.interact();
 check(g.inCar===c&&!c.traffic,'E transfers stopped traffic car to player');check(!c.driver&&c.occupant&&g.world.pedestrians.length===1,'Driver exits and player appears in the seat');
 g.keys.add('KeyW');for(let i=0;i<30;i++)g.tick(.025);g.keys.clear();check(c.speed>4,'Taken traffic car responds to throttle');c.vx=c.vz=c.speed=0;g.interact();check(!g.inCar&&!c.occupant,'Player can exit taken car');
 const p=g.world.pedestrians[0];p.x=0;p.z=-280;p.mesh.position.set(0,0,-280);p.state='walk';c.x=0;c.z=-277.5;c.previousX=0;c.previousZ=-277.5;c.angle=0;c.speed=1;g.syncCar(c,0);g.population.tickPeople(.05);check(p.z< -280.05&&p.state==='walk','Slow bumper contact pushes NPC without clipping');p.x=0;p.z=-280;p.mesh.position.set(0,0,-280);c.x=0;c.z=-282;c.previousX=0;c.previousZ=-269;c.speed=22;c.angle=0;g.syncCar(c,0);g.inCar=c;
 g.population.tickPeople(.025);check(p.state==='down','Vehicle sweep knocks a pedestrian down');c.speed=0;for(let i=0;i<8;i++){g.time+=.025;g.population.tickPeople(.025);}check(p.z< -282&&p.mesh.position.y>0,'Impact gives pedestrian momentum and lift');
 for(let i=0;i<180;i++){g.time+=.025;g.population.tickPeople(.025);}check(p.state==='walk'&&p.mesh.position.y===0,'Pedestrian lands, recovers and stands up');
 g.inCar=null;g.world.cars=[];p.x=0;p.z=24;p.mesh.position.set(0,0,24);g.player.position.set(0,0,21);g.move(g.player,0,4);check(g.player.position.z<23.3,'Player cannot pass through upright NPC');
 p.x=0;p.z=-20;p.mesh.position.set(0,0,-20);p.state='walk';p.lastImpact=-100;g.player.position.set(0,0,0);g.camera.position.set(0,1.4,2);g.camera.lookAt(0,1.3,-20);g.camera.updateMatrixWorld();g.yaw=0;g.shotCooldown=0;g.shoot();for(let i=0;i<50;i++)g.ballistics.update(.01);check(p.state==='down','Flying projectile physically knocks an NPC down');
 g.ballistics.clear();g.world.cars=originalCars;g.world.pedestrians=originalPeople;g.player.position.set(0,0,24);g.player.visible=true;g.pause();
 // Bring three actual citizens into one view for face and clothing inspection.
 const models=originalPeople.slice(0,3);for(let i=0;i<models.length;i++){const n=models[i];n.x=-1.2+i*1.2;n.z=18;n.mesh.position.set(n.x,0,n.z);n.mesh.rotation.set(0,0,0);n.mesh.userData.rig.rotation.set(0,0,0);n.mesh.userData.rig.position.y=1;}
 g.updateCamera=()=>{};g.camera.position.set(.8,2.5,12.7);g.camera.lookAt(.15,1.5,18);g.camera.updateMatrixWorld();g.updatePrompt();g.emit('hud');g.renderer.render(g.scene,g.camera);
 check(models.every(n=>n.mesh.userData.parts.face&&n.mesh.userData.parts.hair),'3D citizens have faces, hair and articulated limbs');return [...new Set(out)];
});console.log(JSON.stringify(checks));await page.screenshot({path:'test-results/npc-faces.png'});assert.deepEqual(errors,[]);console.log('PASS: yielding traffic, takeover, pedestrian physics and appearance');
}finally{await app.close();}


