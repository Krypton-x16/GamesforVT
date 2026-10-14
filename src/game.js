import * as THREE from 'three';
import {createWorld,WORLD_LIMIT,WORLD_SIZE,ROADS} from './world.js';
import {CONTRACTS,parseSave,rewardContract,purchase,segmentHitsBox} from './core.js';
import {GRAVITY,stepVehicle,vehicleBounds} from './physics.js';
import {Ballistics} from './ballistics.js';
import {Population} from './population.js';
import {animatePerson} from './characters.js';
import {createLighting} from './lighting.js';
import {onLand,districtAt} from './geography.js';
import {applyTuning,purchaseTuning} from './tuning.js';
import {seatCharacter} from './vehicles.js';
import {drawWorldMap} from './map.js';

const SAVE_KEY='sector09.save.v1',SETTINGS_KEY='sector09.settings.v1';
const clamp=THREE.MathUtils.clamp,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Game extends EventTarget{
  constructor(container){
    super();this.save=parseSave(localStorage.getItem(SAVE_KEY));this.settings={quality:'medium',sensitivity:1,volume:.35};
    try{Object.assign(this.settings,JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}catch{}
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xa1b2b9);this.scene.fog=new THREE.Fog(0xa1b2b9,95,340);
    this.camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1600);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);container.append(this.renderer.domElement);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    const lighting=createLighting(this.scene,this.renderer);this.sun=lighting.sun;this.sky=lighting.sky;
    this.world=createWorld(this.scene);for(const car of this.world.cars)applyTuning(car,this.save);this.player=this.world.character(this.save.skin?0xd79a40:0x3d6777);this.player.position.set(0,0,24);
    this.ballistics=new Ballistics(this);this.population=new Population(this);this.verticalSpeed=0;this.grounded=true;this.recoil=0;
    this.health=100;this.yaw=0;this.pitch=.27;this.keys=new Set();this.running=false;this.started=false;this.inCar=null;this.weapon='pistol';this.ammo={pistol:12,rifle:30};this.reload=0;this.shotCooldown=0;this.mouseDown=false;this.time=0;this.totalTime=0;this.lastDamage=-100;this.enemies=[];this.effects=[];this.active=null;this.heat=0;this.heatTimer=0;this.hitTime=0;this.toastTime=0;this.prompt='';this.raceTime=0;this.lastHud=0;this.stepTime=0;
    this.racePoints=[{x:216,z:0},{x:360,z:0},{x:720,z:0},{x:1008,z:144},{x:1296,z:144}];
    this.marker=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(2.8,.13,8,48),new THREE.MeshBasicMaterial({color:0xf8be60}));ring.rotation.x=Math.PI/2;this.marker.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,15,8),new THREE.MeshBasicMaterial({color:0xffc66d,transparent:true,opacity:.4,depthWrite:false}));beam.position.y=7.5;this.marker.add(beam);
    const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.6),new THREE.MeshBasicMaterial({color:0xffcb73}));diamond.position.y=4;this.marker.add(diamond);this.marker.visible=false;this.scene.add(this.marker);
    this.ray=new THREE.Raycaster();this.previousFrame=performance.now();this.map=document.querySelector('#minimap');this.mapCtx=this.map.getContext('2d');this.applySettings();this.bindInput();this.animate();
  }
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  message(text){this.emit('toast',text);}
  persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save));}catch{this.message('Не удалось сохранить прогресс: хранилище недоступно.');}}
  applySettings(){this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.settings.quality==='high'?1.75:this.settings.quality==='low'?1:1.3));this.renderer.shadowMap.enabled=this.settings.quality!=='low';this.scene.fog.far=this.settings.quality==='high'?650:this.settings.quality==='low'?330:460;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{}}
  start(){this.started=true;this.running=true;this.player.visible=!this.inCar;this.emit('start');this.lock();this.sound(440,.12,'sine',.04);}
  resume(){if(!this.started)return;this.running=true;this.lock();}
  pause(){this.running=false;this.mouseDown=false;this.keys.clear();if(document.pointerLockElement)document.exitPointerLock();}
  lock(){try{const p=this.renderer.domElement.requestPointerLock();p?.catch(()=>{});}catch{}if(this.audio?.state==='suspended')this.audio.resume();}
  home(){this.pause();this.started=false;this.emit('home');}
  bindInput(){
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
    addEventListener('keydown',e=>{
      if(e.target.matches?.('input,select'))return;
      if(this.running&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
      if(e.repeat){this.keys.add(e.code);return;}
      if(e.code==='Escape'){if(this.started)this.emit('menu','pause');return;}
      if(e.code==='F11'){e.preventDefault();window.desktop?.fullscreen();return;}
      if(!this.running)return;
      if(e.code==='KeyG'){this.openGarage();return;}if(e.code==='KeyM'){this.emit('menu','missions');return;}if(e.code==='KeyB'){this.emit('menu','shop');return;}if(e.code==='Tab'){this.emit('menu','map');return;}
      this.keys.add(e.code);if(e.code==='KeyE')this.interact();if(e.code==='KeyR')this.doReload();if(e.code==='Digit1')this.switchWeapon('pistol');if(e.code==='Digit2')this.switchWeapon('rifle');
      if(e.code==='Space'&&!this.inCar&&this.grounded){this.verticalSpeed=8;this.grounded=false;this.sound(150,.08,'triangle',.025);}
    });
    addEventListener('keyup',e=>this.keys.delete(e.code));
    addEventListener('mousemove',e=>{if(document.pointerLockElement&&this.running){this.yaw-=e.movementX*.0022*this.settings.sensitivity;this.pitch=clamp(this.pitch+e.movementY*.0018*this.settings.sensitivity,-.22,1.1);this.lastMouseLook=this.time;}});
    this.renderer.domElement.addEventListener('mousedown',e=>{if(!this.running)return;if(!document.pointerLockElement){this.lock();return;}if(e.button===0)this.mouseDown=true;if(e.button===2)this.aim=true;});
    addEventListener('mouseup',e=>{if(e.button===0)this.mouseDown=false;if(e.button===2)this.aim=false;});
    addEventListener('contextmenu',e=>e.preventDefault());
    addEventListener('blur',()=>{if(this.running){this.pause();this.emit('menu','pause');}});
    document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&this.running){this.pause();this.emit('menu','pause');}});
    addEventListener('beforeunload',()=>this.persist());
  }
  switchWeapon(w){if(w==='rifle'&&!this.save.rifle){this.message('Винтовка доступна в магазине: B.');return;}this.weapon=w;this.reload=0;this.sound(240,.07,'triangle',.025);}
  sound(freq,duration=.07,type='sine',volume=.04){
    if(this.settings.volume<=0)return;
    try{if(!this.audio)this.audio=new AudioContext();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.35),this.audio.currentTime+duration);g.gain.setValueAtTime(volume*this.settings.volume,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}catch{}
  }
  canStand(x,z,r=.5){if(!onLand(x,z,r))return false;return !this.world.colliders.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
  overlapsCar(x,z,c,pad=.35){const dx=x-c.mesh.position.x,dz=z-c.mesh.position.z,co=Math.cos(c.angle),s=Math.sin(c.angle);return Math.abs(co*dx-s*dz)<c.spec.width/2+pad&&Math.abs(s*dx+co*dz)<c.spec.length/2+pad;}
  move(mesh,dx,dz,r=.5){const p=mesh.position,free=(x,z)=>this.canStand(x,z,r)&&(mesh!==this.player||(!this.world.cars.some(c=>p.y<c.spec.height-.08&&this.overlapsCar(x,z,c,r))&&!this.world.pedestrians.some(n=>n.state!=='down'&&p.y<1.5&&Math.hypot(x-n.x,z-n.z)<.85)));const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.5));for(let i=0;i<steps;i++){if(free(p.x+dx/steps,p.z))p.x+=dx/steps;if(free(p.x,p.z+dz/steps))p.z+=dz/steps;}}
  lineClear(a,b){return !this.world.colliders.some(box=>segmentHitsBox(a.x,a.z,b.x,b.z,box));}
  canCarStand(c,x,z,angle=c.angle){
    const co=Math.cos(angle),s=Math.sin(angle),w=c.spec.width/2,l=c.spec.length/2;
    for(const [dx,dz] of [[-w,-l],[w,-l],[-w,l],[w,l],[0,-l],[0,l],[0,0]])if(!this.canStand(x+co*dx+s*dz,z-s*dx+co*dz,.15))return false;
    return !this.world.cars.some(other=>{if(other===c)return false;const dx=x-other.mesh.position.x,dz=z-other.mesh.position.z,oc=Math.cos(other.angle),os=Math.sin(other.angle);return Math.abs(oc*dx-os*dz)<other.spec.width/2+c.spec.width*.45&&Math.abs(os*dx+oc*dz)<other.spec.length/2+c.spec.length*.4;});
  }
  nearCar(){return this.world.cars.filter(c=>dist(this.player.position,c.mesh.position)<c.spec.length/2+3.2).sort((a,b)=>dist(this.player.position,a.mesh.position)-dist(this.player.position,b.mesh.position))[0];}
  serviceHere(kind,position=this.player.position){return this.world.services.find(s=>s.kind===kind&&dist(position,s)<s.radius);}
  setServiceWaypoint(kind){const s=this.world.services.filter(s=>s.kind===kind).sort((a,b)=>dist(this.player.position,a)-dist(this.player.position,b))[0];this.navTarget={...s.entry,name:s.name};this.message(s.name+' отмечен на карте.');}
  openGarage(){const c=this.inCar??this.nearCar();if(!c||!this.serviceHere('garage',c)){this.setServiceWaypoint('garage');this.message('Заезжай в отмеченный гараж на машине и нажми G.');return false;}if(Math.abs(c.speed)>1){this.message('Останови машину для тюнинга.');return false;}this.garageCar=c;this.emit('menu','garage');return true;}
  tune(kind,value){const c=this.garageCar;if(!c||!this.serviceHere('garage',c))return {ok:false,message:'Машина должна находиться в гараже.'};const result=purchaseTuning(this.save,c,kind,value);if(result.ok){applyTuning(c,this.save);this.persist();this.emit('hud');this.sound(660,.12,'sine',.08);}this.message(result.message);return result;}
  interact(){
    if(this.inCar){if(Math.abs(this.inCar.speed)>5){this.message('Сначала останови машину.');return;}const c=this.inCar;let safe=null;for(const [dx,dz] of [[3,0],[-3,0],[0,4],[0,-4]]){const x=c.x+Math.cos(c.angle)*dx+Math.sin(c.angle)*dz,z=c.z-Math.sin(c.angle)*dx+Math.cos(c.angle)*dz;if(this.canStand(x,z,.6)&&!this.world.cars.some(o=>o!==c&&this.overlapsCar(x,z,o,.6))&&!this.world.pedestrians.some(p=>Math.hypot(x-p.x,z-p.z)<1)){safe={x,z};break;}}if(!safe){this.message('Мало места, отъедь от стены.');return;}this.player.position.set(safe.x,0,safe.z);this.player.visible=true;this.inCar=null;c.vx=c.vz=c.speed=0;if(c.occupant){c.body.remove(c.occupant);c.occupant=null;}this.verticalSpeed=0;this.grounded=true;this.message('Ты вышел из машины.');return;}
    if(this.active&&this.marker.visible&&dist(this.player.position,this.marker.position)<5){
      if(this.active.id==='courier'){if(this.active.stage===0){this.active.stage=1;this.active.target={x:83,z:-72};this.message('Посылка получена. Доставь её к новой метке.');}else{this.complete();}return;}
      if(this.active.id==='data'&&this.active.kills>=5){this.complete();return;}
    }
    if(this.serviceHere('shop')){this.emit('menu','shop');return;}
    const c=this.nearCar();if(c){if(c.health<=0){this.message('Эта машина повреждена. Выбери другую.');return;}if(Math.abs(c.speed)>1.2){this.message('Дождись остановки. Водитель тормозит перед людьми.');return;}if(c.traffic&&!this.population.takeVehicle(c))return;this.inCar=c;this.player.visible=false;this.verticalSpeed=0;this.yaw=c.angle;this.pitch=.24;
      const seated=this.world.character(this.save.skin?0xd79a40:0x3d6777,false,{variant:this.player.userData.variant});seatCharacter(seated,c.spec,c.type);c.body.add(seated);c.occupant=seated;
      this.message(`${c.spec.name} · W/S — газ и тормоз · Пробел — занос`);return;}
    if(this.serviceHere('garage'))this.openGarage();
  }
  doReload(){if(this.reload>0||this.inCar)return;const cap=this.weapon==='pistol'?12:30;if(this.ammo[this.weapon]===cap)return;this.reload=this.weapon==='pistol'?1.2:1.75;this.sound(220,.2,'triangle',.06);}
  shoot(){
    if(this.inCar||this.reload>0||this.shotCooldown>0)return;if(this.ammo[this.weapon]<=0){this.doReload();return;}
    this.ammo[this.weapon]--;this.shotCooldown=this.weapon==='pistol'?.27:.105;this.sound(this.weapon==='pistol'?140:90,.11,'sawtooth',.2);
    this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);let max=160,enemy=null;const point=new THREE.Vector3();
    for(const b of this.world.colliders){const hit=this.ray.ray.intersectBox(new THREE.Box3(new THREE.Vector3(b.x-b.w/2,0,b.z-b.d/2),new THREE.Vector3(b.x+b.w/2,b.h,b.z+b.d/2)),point);if(hit)max=Math.min(max,this.ray.ray.origin.distanceTo(hit));}
    for(const e of this.enemies){if(e.hp<=0)continue;const hit=this.ray.ray.intersectSphere(new THREE.Sphere(e.mesh.position.clone().add(new THREE.Vector3(0,1.2,0)),.9),new THREE.Vector3());if(hit){const d=this.ray.ray.origin.distanceTo(hit);if(d<max){max=d;enemy=e;}}}
    const end=this.ray.ray.at(max,new THREE.Vector3());const start=this.player.position.clone().add(new THREE.Vector3(-Math.sin(this.yaw)*.8,1.4,-Math.cos(this.yaw)*.8));
    if(enemy&&!this.lineClear(start,enemy.mesh.position))enemy=null;
    const direction=end.clone().sub(start).normalize();
    this.ballistics.fire(start,direction,'player',this.weapon==='pistol'?36:27,this.weapon==='pistol'?95:145);this.recoil=Math.min(.045,this.recoil+.014);
    this.ballistics.impact(start,'player');
    if(!this.active||!['clear','data'].includes(this.active.id)){this.heat=clamp(this.heat+.14,0,3);this.heatTimer=16;}
  }
  trace(start,end,color){const geom=new THREE.BufferGeometry().setFromPoints([start,end]);const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.85});const line=new THREE.Line(geom,mat);this.scene.add(line);this.effects.push({mesh:line,life:.08,full:.08});}
  damage(value){if(this.health<=0)return;let armor=Math.min(this.save.armor,value*.7);this.save.armor-=armor;this.health=Math.max(0,this.health-(value-armor));this.lastDamage=this.time;this.emit('hurt');if(this.health<=0)this.die();}
  die(){this.pause();this.save.money=Math.max(0,this.save.money-100);this.persist();this.emit('dead');}
  respawn(){if(this.active)this.cancelContract(false);this.clearEnemies();this.ballistics.clear();this.verticalSpeed=0;this.grounded=true;this.health=100;this.heat=0;this.heatTimer=0;if(this.inCar){this.inCar.speed=0;this.inCar.vx=0;this.inCar.vz=0;if(this.inCar.occupant){this.inCar.body.remove(this.inCar.occupant);this.inCar.occupant=null;}this.inCar=null;}this.player.position.set(0,0,24);this.player.visible=true;this.yaw=0;this.pitch=.27;this.reload=0;this.ammo={pistol:12,rifle:30};this.resume();this.message('Снова в городе. Снаряжение сохранено.');}
  buy(id){const r=purchase(this.save,id,this.health);if(r.ok){this.health=r.health;this.persist();this.sound(650,.13,'sine',.09);if(id==='skin')this.player.userData.parts.body.material=this.world.material(0xd79a40);if(id==='rifle')this.switchWeapon('rifle');}this.message(r.message);return r;}
  accept(id){
    if(this.active){this.message('Сначала заверши или отмени текущий контракт.');return false;}const contract=CONTRACTS.find(c=>c.id===id);if(!contract)return false;
    this.clearEnemies();this.ballistics.clear();this.active={id,stage:0,kills:0,target:{...contract.destination}};this.raceTime=220;
    if(id==='clear')for(const p of [[-8,-119],[9,-129],[-9,-139],[8,-112]])this.spawnEnemy(...p,true);
    if(id==='data')for(const p of [[105,68],[128,74],[112,80],[131,56],[103,51]])this.spawnEnemy(...p,true);
    this.message(`Контракт принят: ${contract.title}`);this.sound(550,.15,'sine',.08);return true;
  }
  cancelContract(notify=true){this.active=null;this.marker.visible=false;this.clearEnemies();this.ballistics.clear();if(notify)this.message('Контракт отменён. Можно взять другой.');}
  complete(){const c=CONTRACTS.find(c=>c.id===this.active.id);const amount=rewardContract(this.save,c.id);this.active=null;this.marker.visible=false;this.persist();this.clearEnemies();this.message(`КОНТРАКТ ВЫПОЛНЕН · +$${amount.toLocaleString('ru-RU')}`);this.sound(880,.4,'sine',.1);this.emit('complete',{title:c.title,amount});}
  spawnEnemy(x,z,mission=false){const mesh=this.world.character(0x946952,true);mesh.position.set(x,0,z);const e={mesh,hp:100,cooldown:1+Math.random(),mission,alert:false,home:{x,z}};this.enemies.push(e);return e;}
  clearEnemies(){for(const e of this.enemies)this.scene.remove(e.mesh);this.enemies=[];}
  killEnemy(e){this.scene.remove(e.mesh);this.save.kills++;this.save.money+=40;this.save.earned+=40;if(e.mission&&this.active){this.active.kills++;if(this.active.id==='clear'&&this.active.kills>=4){this.complete();return;}if(this.active.id==='data'&&this.active.kills>=5)this.message('Охрана устранена. Подойди к метке и нажми E.');}this.persist();}
  tick(dt){
    this.time+=dt;this.totalTime+=dt;this.shotCooldown=Math.max(0,this.shotCooldown-dt);this.hitTime=Math.max(0,this.hitTime-dt);
    if(this.reload>0){this.reload-=dt;if(this.reload<=0){this.ammo[this.weapon]=this.weapon==='pistol'?12:30;this.sound(380,.07,'triangle',.08);}}
    const forward=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0),side=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
    if(this.inCar){
      const c=this.inCar;c.previousX=c.x;c.previousZ=c.z;c.braking=forward<0||this.keys.has('Space');const impact=stepVehicle(c,{throttle:forward,steer:side,handbrake:this.keys.has('Space')},dt,(x,z,a)=>this.canCarStand(c,x,z,a));
      if(impact>5&&this.time-(c.lastCrash??-5)>.4){c.lastCrash=this.time;c.health=Math.max(0,c.health-impact*.6);this.damage(impact*.12);this.sound(60,.15,'sawtooth',.13);this.ballistics.impact(c.mesh.position.clone().add(new THREE.Vector3(0,.8,0)));}
      this.syncCar(c,dt);this.player.position.copy(c.mesh.position);
      if(this.time-(this.lastMouseLook??-10)>1.2){const delta=Math.atan2(Math.sin(c.angle-this.yaw),Math.cos(c.angle-this.yaw));this.yaw+=delta*(1-Math.exp(-3*dt));}
    }else{
      const len=Math.hypot(forward,side),speed=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?10.5:6;
      if(len){const dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side)/len*speed*dt,dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*side)/len*speed*dt;this.move(this.player,dx,dz);this.stepTime+=dt*speed;this.player.userData.parts.leftLeg.rotation.x=Math.sin(this.stepTime*1.9)*.6;this.player.userData.parts.rightLeg.rotation.x=-Math.sin(this.stepTime*1.9)*.6;}else{this.player.userData.parts.leftLeg.rotation.x=0;this.player.userData.parts.rightLeg.rotation.x=0;}
      this.player.rotation.y=this.yaw;
      animatePerson(this.player,this.stepTime/3,len?speed/3:0);
      const previousY=this.player.position.y;this.verticalSpeed-=GRAVITY*dt;let floor=0;for(const c of this.world.cars)if(previousY>=c.spec.height-.1&&this.overlapsCar(this.player.position.x,this.player.position.z,c,-.12))floor=Math.max(floor,c.spec.height);this.player.position.y=Math.max(floor,previousY+this.verticalSpeed*dt);if(this.player.position.y===floor){this.verticalSpeed=0;this.grounded=true;}else this.grounded=false;
      if(this.mouseDown)this.shoot();
    }
    this.population.tickTraffic(dt);
    if(!this.inCar)for(const c of this.world.cars)if(Math.abs(c.speed)>3&&this.player.position.y<c.spec.height&&this.overlapsCar(this.player.position.x,this.player.position.z,c)&&this.time-(this.lastVehicleHit??-5)>1){this.lastVehicleHit=this.time;this.damage(Math.min(25,Math.abs(c.speed)*1.2));const dx=this.player.position.x-c.x,dz=this.player.position.z-c.z,len=Math.hypot(dx,dz)||1;this.player.position.x+=dx/len*1.8;this.player.position.z+=dz/len*1.8;this.verticalSpeed=4;this.grounded=false;}
    this.population.tickPeople(dt);
    for(const e of this.enemies){if(e.hp<=0)continue;let d=dist(e.mesh.position,this.player.position);if(d<48)e.alert=true;if(!e.alert)continue;
      const dx=this.player.position.x-e.mesh.position.x,dz=this.player.position.z-e.mesh.position.z;e.mesh.rotation.y=Math.atan2(-dx,-dz);
      if(d>13&&d<95){this.move(e.mesh,dx/d*2.5*dt,dz/d*2.5*dt,.5);e.mesh.userData.parts.leftLeg.rotation.x=Math.sin(this.time*7)*.4;e.mesh.userData.parts.rightLeg.rotation.x=-Math.sin(this.time*7)*.4;}
      e.cooldown-=dt;if(e.cooldown<=0&&d<45&&this.lineClear(e.mesh.position,this.player.position)){e.cooldown=1.1+Math.random()*.65;const muzzle=e.mesh.position.clone().add(new THREE.Vector3(0,1.4,0)),target=this.player.position.clone().add(new THREE.Vector3((Math.random()-.5)*1.8,1.2,(Math.random()-.5)*1.8));this.ballistics.fire(muzzle,target.sub(muzzle).normalize(),'enemy',5.5,55);this.sound(80,.05,'sawtooth',.045);}
      if(this.inCar&&d<2.7&&Math.abs(this.inCar.speed)>9){e.hp=0;this.killEnemy(e);break;}
    }
    if(this.heatTimer>0)this.heatTimer-=dt;else this.heat=Math.max(0,this.heat-dt*.17);
    if(this.heat>1&&this.enemies.filter(e=>e.hp>0).length<2&&Math.floor(this.time)%5===0){const x=this.player.position.x+18,z=this.player.position.z-20;if(this.canStand(x,z,.8))this.spawnEnemy(x,z);}
    if(!this.active&&this.heat===0&&this.enemies.length){this.clearEnemies();}
    if(this.time-this.lastDamage>10&&this.health<100)this.health=Math.min(100,this.health+dt*2.5);
    this.ballistics.update(dt);this.recoil*=Math.exp(-10*dt);
    this.updateMission(dt);this.updatePrompt();
  }
  syncCar(c,dt){c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=c.angle;c.body.rotation.z=c.roll;c.body.rotation.x=c.pitch;c.body.position.y=Math.sin(this.time*17)*Math.min(.025,Math.abs(c.speed)*.001);for(const w of c.wheels){w.mesh.rotation.x-=c.speed*dt/c.spec.wheel;if(w.front)w.pivot.rotation.y=c.steer;}if(c.health<=0)c.body.position.y=-.15;c.brakeMaterial?.color.setHex(c.braking?0xff3a21:0x852e23);}
  updateMission(dt){
    this.marker.visible=!!(this.active||this.navTarget);if(!this.active){if(this.navTarget){this.marker.position.set(this.navTarget.x,.3,this.navTarget.z);this.marker.children[2].rotation.y=this.time;if(dist(this.player.position,this.navTarget)<4)this.navTarget=null;}return;}const a=this.active;
    if(a.id==='race'){
      a.target=this.racePoints[a.stage];if(a.stage===0&&!this.inCar){a.target=this.racePoints[0];}
      else if(a.stage>0||this.inCar){this.raceTime-=dt;if(this.raceTime<=0){this.cancelContract(false);this.message('Время вышло. Возьми контракт и попробуй ещё раз.');return;}}
      if(this.inCar&&dist(this.player.position,a.target)<9){a.stage++;this.sound(750,.15,'sine',.09);if(a.stage>=this.racePoints.length){this.complete();return;}a.target=this.racePoints[a.stage];this.message(`Контрольная точка ${a.stage} / 5`);}
    }
    this.marker.position.set(a.target.x,.3,a.target.z);this.marker.children[2].rotation.y=this.time;this.marker.children[2].position.y=4+Math.sin(this.time*2)*.35;
  }
  updatePrompt(){
    this.prompt='';if(this.inCar){this.prompt=this.serviceHere('garage',this.inCar)?'G · Тюнинг и ремонт     E · Выйти':'E · Выйти     Пробел · Ручной тормоз';return;}
    if(this.active&&dist(this.player.position,this.marker.position)<5&&(this.active.id==='courier'||this.active.id==='data'&&this.active.kills>=5)){this.prompt=this.active.id==='courier'?(this.active.stage===0?'E · Забрать посылку':'E · Передать посылку'):'E · Забрать накопитель';return;}
    if(this.serviceHere('shop')){this.prompt='E · Купить снаряжение у прилавка';return;}
    if(this.serviceHere('garage')){this.prompt='G · Тюнинг машины в гараже     E · Сесть';return;}
    const nearby=this.nearCar();if(nearby){this.prompt=nearby.traffic&&Math.abs(nearby.speed)>1.2?'Водитель остановится перед тобой. Затем нажми E.':`E · ${nearby.traffic?'Сесть в остановившуюся машину':nearby.spec.name}`;return;}
  }
  updateCamera(dt){
    if(!this.started){const t=this.totalTime*.035;this.camera.position.set(110+Math.sin(t)*17,59,145+Math.cos(t)*10);this.camera.lookAt(0,9,0);return;}
    const p=this.player.position;const target=p.clone().add(new THREE.Vector3(Math.cos(this.yaw)*.5,1.65,-Math.sin(this.yaw)*.5));const distance=this.inCar?13:this.aim?4.2:7.5;
    const viewPitch=this.pitch-this.recoil;const offset=new THREE.Vector3(Math.sin(this.yaw)*Math.cos(viewPitch),Math.sin(viewPitch),Math.cos(this.yaw)*Math.cos(viewPitch));let actual=distance;
    const ray=new THREE.Ray(target,offset);for(const b of this.world.colliders){const hit=ray.intersectBox(new THREE.Box3(new THREE.Vector3(b.x-b.w/2-.2,0,b.z-b.d/2-.2),new THREE.Vector3(b.x+b.w/2+.2,b.h+.2,b.z+b.d/2+.2)),new THREE.Vector3());if(hit)actual=Math.min(actual,Math.max(.9,target.distanceTo(hit)-.4));}
    this.camera.position.copy(target).addScaledVector(offset,actual);this.camera.lookAt(target);const fov=this.aim&&!this.inCar?51:65;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.exp(-10*dt));this.camera.updateProjectionMatrix();
    this.sun.position.set(p.x-70,105,p.z+60);this.sun.target.position.set(p.x,0,p.z);this.sun.target.updateMatrixWorld();
  }
  drawMap(canvas=this.map,large=false){drawWorldMap(this,canvas,large);}
  animate(){requestAnimationFrame(()=>this.animate());const now=performance.now(),dt=Math.min((now-this.previousFrame)/1000,.05);this.previousFrame=now;if(this.running)this.tick(dt);else if(!this.started)this.totalTime+=dt;
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;e.mesh.material.opacity=Math.max(0,e.life/e.full);if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);}}
    this.updateCamera(dt);this.world.architecture.update(this.camera.position,this.settings.quality);this.world.places.update(this.player.position);this.world.river.update(this.totalTime);this.sky.position.copy(this.camera.position);this.world.sculpture.rotation.y+=dt*.2;this.renderer.render(this.scene,this.camera);
    if(this.started&&(this.totalTime-this.lastHud>.07||!this.running)){this.lastHud=this.totalTime;this.drawMap();this.emit('hud');}
  }
}

