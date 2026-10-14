import * as THREE from 'three';
import {trafficClearance,trafficMotion,stepVehicle,segmentBox} from './physics.js';
import {animatePerson,fallenPose} from './characters.js';
import {trafficBounds} from './geography.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Population{
  constructor(game){this.game=game;}
  obstaclesFor(car){
    const g=this.game,list=[];
    if(!g.inCar)list.push({x:g.player.position.x,z:g.player.position.z,radius:.65});
    for(const p of g.world.pedestrians)list.push({x:p.x,z:p.z,radius:p.state==='down'?.95:.55,vx:p.walkVx??0,vz:p.walkVz??0});
    for(const e of g.enemies)if(e.hp>0)list.push({x:e.mesh.position.x,z:e.mesh.position.z,radius:.6});
    for(const c of g.world.cars){if(c===car)continue;const delta=c.angle-car.angle,co=Math.abs(Math.cos(delta)),s=Math.abs(Math.sin(delta));list.push({id:c,x:c.x,z:c.z,halfLength:(co*c.spec.length+s*c.spec.width)/2,halfWidth:(co*c.spec.width+s*c.spec.length)/2});}
    return list;
  }
  tickTraffic(dt){
    const g=this.game;for(const c of g.world.cars){if(c===g.inCar)continue;c.previousX=c.x;c.previousZ=c.z;
      if(c.traffic){const gap=trafficClearance(c,this.obstaclesFor(c));if(gap<4&&c.speed<.6)c.yieldHold=2.5;else c.yieldHold=Math.max(0,(c.yieldHold??0)-dt);const step=trafficMotion(Math.max(0,c.speed),gap,dt,c.health>0&&!c.yieldHold?9:0);c.braking=step.braking||c.yieldHold>0;c.yielding=gap<4;c.speed=step.speed;
        c.x-=Math.sin(c.angle)*step.distance;c.z-=Math.cos(c.angle)*step.distance;c.vx=-Math.sin(c.angle)*c.speed;c.vz=-Math.cos(c.angle)*c.speed;
        const bounds=trafficBounds(c);let wrapped=false;if(c.x<bounds.minX+6){c.x=bounds.maxX-7;wrapped=true;}else if(c.x>bounds.maxX-6){c.x=bounds.minX+7;wrapped=true;}if(c.z<bounds.minZ+6){c.z=bounds.maxZ-7;wrapped=true;}else if(c.z>bounds.maxZ-6){c.z=bounds.minZ+7;wrapped=true;}if(wrapped){c.previousX=c.x;c.previousZ=c.z;}
        g.syncCar(c,dt);
      }else if(Math.hypot(c.vx,c.vz)>.05){stepVehicle(c,{throttle:0,steer:0,handbrake:false},dt,(x,z,a)=>g.canCarStand(c,x,z,a));g.syncCar(c,dt);}
    }
  }
  canWalk(p,x,z){const g=this.game;if(!g.canStand(x,z,.4))return false;if(g.world.cars.some(c=>g.overlapsCar(x,z,c,.46)))return false;
    if(!g.inCar&&Math.hypot(x-g.player.position.x,z-g.player.position.z)<.95)return false;
    return !g.world.pedestrians.some(other=>other!==p&&Math.hypot(x-other.x,z-other.z)<(other.state==='down'?1.05:.75));
  }
  movePerson(p,dx,dz,physical=false){const g=this.game,free=(x,z)=>physical?g.canStand(x,z,.5):this.canWalk(p,x,z),steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));for(let n=0;n<steps;n++){if(free(p.x+dx/steps,p.z))p.x+=dx/steps;else if(physical)p.vx*=-.2;if(free(p.x,p.z+dz/steps))p.z+=dz/steps;else if(physical)p.vz*=-.2;}}
  knock(p,vx,vz,force=5){
    if(this.game.time-(p.lastImpact??-100)<.65)return;p.lastImpact=this.game.time;p.state='down';p.downFor=3.2;p.fall=0;p.vx=clamp(vx,-17,17);p.vz=clamp(vz,-17,17);p.vy=Math.min(5.5,2+force*.1);p.height=p.mesh.position.y;p.walkVx=p.walkVz=0;
  }
  collisionWithCar(person,car){
    const co=Math.cos(car.angle),s=Math.sin(car.angle),local=(x,z)=>{const dx=x-car.x,dz=z-car.z;return {x:co*dx-s*dz,y:.8,z:s*dx+co*dz};};
    const previousX=car.previousX??car.x,previousZ=car.previousZ??car.z;
    const start=local(person.x+(car.x-previousX),person.z+(car.z-previousZ)),end=local(person.x,person.z);
    return segmentBox(start,end,{x:-car.spec.width/2-.45,y:0,z:-car.spec.length/2-.45},{x:car.spec.width/2+.45,y:3,z:car.spec.length/2+.45})!==null;
  }
  tickPeople(dt){
    const g=this.game;
    for(const p of g.world.pedestrians){
      for(const c of g.world.cars){if(Math.abs(c.speed)<.05)continue;if(this.collisionWithCar(p,c)){if(Math.abs(c.speed)<2.5){this.movePerson(p,-Math.sin(c.angle)*c.speed*dt*1.6,-Math.cos(c.angle)*c.speed*dt*1.6,true);}else{this.knock(p,-Math.sin(c.angle)*c.speed*.62,-Math.cos(c.angle)*c.speed*.62,Math.abs(c.speed));if(c===g.inCar){g.heat=Math.min(3,g.heat+.35);g.heatTimer=15;}}}}
      if(p.state==='down'){
        this.movePerson(p,p.vx*dt,p.vz*dt,true);p.vy-=18*dt;p.height=Math.max(0,p.height+p.vy*dt);const friction=p.height<=0?4.2:.7;p.vx*=Math.exp(-friction*dt);p.vz*=Math.exp(-friction*dt);if(p.height===0)p.vy=0;p.fall=Math.min(1,p.fall+dt*4.5);p.downFor-=dt;fallenPose(p.mesh,p.fall,g.time);p.mesh.position.set(p.x,p.height,p.z);
        if(p.downFor<=0&&p.height===0){p.state='recover';p.recoverFor=.8;}continue;
      }
      if(p.state==='recover'){p.recoverFor-=dt;fallenPose(p.mesh,clamp(p.recoverFor/.8,0,1),g.time);if(p.recoverFor<=0){p.state='walk';p.mesh.userData.parts.leftArm.rotation.z=0;p.mesh.userData.parts.rightArm.rotation.z=0;}continue;}
      const speed=1.25,axis=p.axis??'z';let dx=axis==='x'?p.dir*speed*dt:0,dz=axis==='z'?p.dir*speed*dt:0;
      if(p.crossing&&Math.abs(p.x-(p.home?.cityOffset??0))>15){p.dir*=-1;dx=-dx;dz=-dz;}
      const oldX=p.x,oldZ=p.z;this.movePerson(p,dx,dz);
      const moved=Math.hypot(p.x-oldX,p.z-oldZ);p.waiting=moved<.002;p.walkVx=(p.x-oldX)/dt;p.walkVz=(p.z-oldZ)/dt;
      if(p.waiting){p.blockedFor=(p.blockedFor??0)+dt;if(p.blockedFor>2.5){p.dir*=-1;p.blockedFor=0;}}else p.blockedFor=0;
      p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=axis==='x'?(p.dir>0?-Math.PI/2:Math.PI/2):(p.dir>0?Math.PI:0);animatePerson(p.mesh,g.time+p.x,moved/dt);
    }
  }
  takeVehicle(c){
    const g=this.game;if(Math.abs(c.speed)>1.2)return false;
    c.traffic=false;c.taken=true;c.vx=c.vz=c.speed=0;c.braking=true;
    if(c.driver){const options=[[c.spec.width/2+1,0],[-c.spec.width/2-1,0],[0,c.spec.length/2+1]];let safe=null;for(const [dx,dz]of options){const x=c.x+Math.cos(c.angle)*dx+Math.sin(c.angle)*dz,z=c.z-Math.sin(c.angle)*dx+Math.cos(c.angle)*dz;if(g.canStand(x,z,.5)&&!g.world.cars.some(o=>o!==c&&g.overlapsCar(x,z,o,.5))&&Math.hypot(x-g.player.position.x,z-g.player.position.z)>1){safe={x,z};break;}}
      if(safe){const axis=Math.abs(Math.sin(c.angle))>.5?'z':'x',dir=Math.sign(axis==='x'?safe.x-c.x:safe.z-c.z)||1;const p={mesh:c.driver,x:safe.x,z:safe.z,dir,axis,state:'walk',vx:0,vz:0,vy:0,home:{...safe}};g.scene.add(p.mesh);p.mesh.scale.setScalar(1);p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.set(0,0,0);animatePerson(p.mesh,g.time,0);g.world.pedestrians.push(p);}else c.body.remove(c.driver);
      c.driver=null;
    }return true;
  }
}
