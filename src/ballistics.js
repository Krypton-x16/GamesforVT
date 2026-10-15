import * as THREE from 'three';
import {segmentBox,segmentSphere} from './physics.js';
const BULLET_GRAVITY=2.8;
export class Ballistics{
  constructor(game){this.game=game;this.bullets=[];this.sparks=[];this.geometry=new THREE.SphereGeometry(.085,6,4);this.sparkGeometry=new THREE.BoxGeometry(.06,.06,.06);this.materials={player:new THREE.MeshBasicMaterial({color:0xffed8e,toneMapped:false}),enemy:new THREE.MeshBasicMaterial({color:0xff7252,toneMapped:false})};}
  fire(start,direction,owner='player',damage=36,speed=95){
    const mesh=new THREE.Mesh(this.geometry,this.materials[owner]);mesh.position.copy(start);mesh.scale.set(1,1,18);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);this.game.scene.add(mesh);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start,start]),new THREE.LineBasicMaterial({color:owner==='player'?0xffdc76:0xff7354,transparent:true,opacity:.68,toneMapped:false}));line.frustumCulled=false;this.game.scene.add(line);
    const bullet={mesh,line,position:start.clone(),velocity:direction.clone().multiplyScalar(speed),owner,damage,life:3.5};this.bullets.push(bullet);return bullet;
  }
  impact(point,owner='player'){
    for(let i=0;i<6;i++){const mesh=new THREE.Mesh(this.sparkGeometry,this.materials[owner]);mesh.position.copy(point);this.game.scene.add(mesh);this.sparks.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*7,Math.random()*5,(Math.random()-.5)*7),life:.16+Math.random()*.15});}
  }
  update(dt){
    const g=this.game;
    for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i],start=b.position.clone();b.velocity.y-=BULLET_GRAVITY*dt;const end=start.clone().addScaledVector(b.velocity,dt);b.life-=dt;let hit=null,nearest=Infinity;
      const consider=(t,kind,target)=>{if(t!==null&&t<nearest){nearest=t;hit={kind,target};}};
      for(const wall of g.world.colliders){if(Math.abs(start.x-wall.x)>wall.w/2+dt*150+2||Math.abs(start.z-wall.z)>wall.d/2+dt*150+2)continue;consider(segmentBox(start,end,{x:wall.x-wall.w/2,y:0,z:wall.z-wall.d/2},{x:wall.x+wall.w/2,y:wall.h,z:wall.z+wall.d/2}),'wall',wall);}
      for(const c of g.world.cars){
        const carPosition=c.mesh?.position??{x:c.x,z:c.z};
        if(Math.hypot(carPosition.x-start.x,carPosition.z-start.z)>10+dt*150)continue;
        const co=Math.cos(c.angle),s=Math.sin(c.angle);
        // Transform the swept segment into the car's local space so parked
        // and rotated cars use the same hitbox as driving collisions.
        const local=p=>{const dx=p.x-carPosition.x,dz=p.z-carPosition.z;return {x:co*dx-s*dz,y:p.y,z:s*dx+co*dz};};
        consider(segmentBox(local(start),local(end),{x:-c.spec.width/2,y:.08,z:-c.spec.length/2},{x:c.spec.width/2,y:c.spec.height,z:c.spec.length/2}),'car',c);
      }
      if(b.owner==='player'){for(const e of g.enemies){if(e.hp>0)consider(segmentSphere(start,end,{x:e.mesh.position.x,y:1.2,z:e.mesh.position.z},.8),'enemy',e);}}
      else if(!g.inCar)consider(segmentSphere(start,end,{x:g.player.position.x,y:g.player.position.y+1.15,z:g.player.position.z},.65),'player',g.player);
      for(const p of g.world.pedestrians??[]){if(p.state!=='down')consider(segmentSphere(start,end,{x:p.x,y:p.mesh.position.y+1.15,z:p.z},.65),'pedestrian',p);}
      if(end.y<.08&&start.y>=.08)consider((start.y-.08)/(start.y-end.y),'ground',null);
      if(hit){b.position.copy(start).lerp(end,nearest);this.impact(b.position,b.owner);b.life=0;
        if(hit.kind==='enemy'){const e=hit.target;e.hp-=b.damage;e.alert=true;g.hitTime=.17;g.sound(650,.05,'triangle',.1);if(e.hp<=0)g.killEnemy(e);}
        if(hit.kind==='player')g.damage(b.damage);
        if(hit.kind==='pedestrian'){g.population?.knock(hit.target,b.velocity.x*.065,b.velocity.z*.065,6);if(b.owner==='player'){g.heat=Math.min(3,g.heat+.5);g.heatTimer=18;}}
        if(hit.kind==='car'){const c=hit.target;c.health=Math.max(0,c.health-b.damage*.3);if(c===g.inCar&&b.owner==='enemy')g.damage(b.damage*.2);}
      }else b.position.copy(end);
      b.mesh.position.copy(b.position);b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.velocity.clone().normalize());
      const tail=b.position.clone().addScaledVector(b.velocity.clone().normalize(),-Math.min(3.2,dt*b.velocity.length()));const pos=b.line.geometry.attributes.position;pos.setXYZ(0,tail.x,tail.y,tail.z);pos.setXYZ(1,b.position.x,b.position.y,b.position.z);pos.needsUpdate=true;
      if(b.life<=0){g.scene.remove(b.mesh,b.line);b.line.geometry.dispose();b.line.material.dispose();this.bullets.splice(i,1);}
    }
    for(let i=this.sparks.length-1;i>=0;i--){const s=this.sparks[i];s.life-=dt;s.velocity.y-=16*dt;s.mesh.position.addScaledVector(s.velocity,dt);s.mesh.scale.setScalar(Math.max(.1,s.life*4));if(s.life<=0){g.scene.remove(s.mesh);this.sparks.splice(i,1);}}
  }
  clear(){for(const b of this.bullets){this.game.scene.remove(b.mesh,b.line);b.line.geometry.dispose();b.line.material.dispose();}for(const s of this.sparks)this.game.scene.remove(s.mesh);this.bullets.length=0;this.sparks.length=0;}
}
