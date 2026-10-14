import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {VEHICLE_TYPES} from './physics.js';

export function createVehicleFactory(scene,character,cars){
  const rubber=new THREE.MeshStandardMaterial({color:0x181b1d,roughness:.96}),trim=new THREE.MeshStandardMaterial({color:0x242a30,roughness:.6,metalness:.2}),chrome=new THREE.MeshStandardMaterial({color:0xadb6b9,roughness:.25,metalness:.85}),glass=new THREE.MeshPhysicalMaterial({color:0x7899a6,metalness:.18,roughness:.1,transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide});
  const white=new THREE.MeshStandardMaterial({color:0xf0e6bd,emissive:0xffdc8b,emissiveIntensity:.8}),red=new THREE.MeshStandardMaterial({color:0x9c2924,emissive:0xa82216,emissiveIntensity:.35});
  const cube=new THREE.BoxGeometry(1,1,1),round=new RoundedBoxGeometry(1,1,1,2,.09),tireGeo=new THREE.CylinderGeometry(1,1,.24,24),rimGeo=new THREE.CylinderGeometry(1,1,.252,20);
  function add(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function slab(parent,mat,x,y,z,w,h,d,rounded=false){return add(parent,rounded?round:cube,mat,x,y,z,w,h,d);}
  function pane(parent,points){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return add(parent,geo,glass,0,0,0);}
  function merge(parent){const groups=new Map();for(const m of [...parent.children])if(m.isMesh){m.updateMatrix();if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}for(const [mat,list]of groups){const copies=list.map(m=>(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix)),geometry=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(!geometry)continue;list.forEach(m=>parent.remove(m));const merged=add(parent,geometry,mat,0,0,0);merged.name='body-batch';}}
  return function createCar(x,z,color=0xdca54c,angle=0,traffic=false,type='coupe'){
    const p={...VEHICLE_TYPES[type]},w=p.width,l=p.length,base=p.wheel+.26;
    const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
    const paintMaterial=new THREE.MeshPhysicalMaterial({color,metalness:.65,roughness:.28,clearcoat:.85,clearcoatRoughness:.16,envMapIntensity:1.2});
    slab(body,trim,0,.28,0,w*.92,.16,l*.92,true);slab(body,paintMaterial,0,base,0,w,.50,l,true);
    const hood=slab(body,paintMaterial,0,base+.25,-l*.31,w*.93,.18,l*.32,true);hood.rotation.x=-.035;
    const frontZ=-l*.19,rearZ=type==='pickup'?l*.03:l*.31,roofFront=-l*.07,roofRear=type==='pickup'?-l*.01:l*.16,cabinBase=base+.31,roofY=p.height-.08;
    const lowW=w*.44,topW=w*.36;
    pane(body,[[-lowW,cabinBase,frontZ],[lowW,cabinBase,frontZ],[topW,roofY,roofFront],[-topW,roofY,roofFront]]);
    pane(body,[[lowW,cabinBase,rearZ],[-lowW,cabinBase,rearZ],[-topW,roofY,roofRear],[topW,roofY,roofRear]]);
    for(const s of [-1,1]){
      pane(body,[[s*lowW,cabinBase,frontZ],[s*lowW,cabinBase,rearZ],[s*topW,roofY,roofRear],[s*topW,roofY,roofFront]]);
      for(const [bz,tz]of [[frontZ,roofFront],[rearZ,roofRear]]){const a=new THREE.Vector3(s*lowW,cabinBase,bz),b=new THREE.Vector3(s*topW,roofY,tz),bar=slab(body,paintMaterial,0,0,0,.055,a.distanceTo(b),.065);bar.position.copy(a).add(b).multiplyScalar(.5);bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());}
      slab(body,trim,s*w*.417,(cabinBase+roofY)/2,.05,.055,roofY-cabinBase,.08);
      slab(body,paintMaterial,s*w*.51,cabinBase+.06,frontZ+.14,.22,.105,.23,true);slab(body,chrome,s*w*.498,base+.13,.23,.028,.04,.23,true);
      slab(body,trim,s*w*.497,base-.09,.12,.018,.012,l*.58);slab(body,trim,s*w*.497,base+.10,.70,.017,.31,.012);
      slab(body,trim,s*w*.27,cabinBase-.03,.25,.46,.37,.52,true);slab(body,trim,s*w*.27,cabinBase+.14,.46,.38,.32,.12,true);
    }
    slab(body,paintMaterial,0,roofY+.025,(roofFront+roofRear)/2,w*.76,.105,roofRear-roofFront+.20,true);
    if(type==='pickup'){slab(body,trim,0,base+.24,l*.29,w*.82,.06,l*.36);for(const s of [-1,1])slab(body,paintMaterial,s*w*.45,base+.47,l*.29,.13,.40,l*.37,true);slab(body,paintMaterial,0,base+.45,l*.46,w*.9,.37,.15,true);}
    if(type==='suv'){for(const s of [-1,1])slab(body,trim,s*w*.30,roofY+.14,.2,.06,.10,l*.32,true);}
    slab(body,trim,0,base-.07,-l/2-.02,w*.8,.17,.07,true);for(const sx of [-.28,0,.28])slab(body,chrome,sx,base-.07,-l/2-.065,.025,.10,.015);
    slab(body,chrome,0,base-.23,l/2+.01,.32,.07,.05,true);slab(body,trim,0,base-.20,-l/2-.03,.42,.11,.03);
    for(const s of [-1,1]){slab(body,white,s*w*.34,base+.14,-l/2-.025,w*.21,.095,.045,true);slab(body,red,s*w*.33,base+.16,l/2+.03,w*.25,.08,.05,true);}
    const steering=add(body,new THREE.TorusGeometry(.13,.024,6,20),trim,-w*.23,cabinBase+.07,frontZ+.25);steering.rotation.x=-.8;
    merge(body);
    const spoiler=new THREE.Group();body.add(spoiler);spoiler.visible=type==='sport';for(const s of [-1,1])slab(spoiler,trim,s*w*.32,base+.53,l*.40,.06,.30,.08);slab(spoiler,paintMaterial,0,base+.70,l*.40,w*.91,.065,.29,true);merge(spoiler);
    const wheels=[];
    for(const s of [-1,1])for(const dz of [-p.wheelbase/2,p.wheelbase/2]){const pivot=new THREE.Group();pivot.position.set(s*w*.49,p.wheel,dz);g.add(pivot);const spin=new THREE.Group();pivot.add(spin);const tire=add(spin,tireGeo,rubber,0,0,0,p.wheel,1,p.wheel);tire.rotation.z=Math.PI/2;const rim=add(spin,rimGeo,chrome,0,0,0,p.wheel*.63,1,p.wheel*.63);rim.rotation.z=Math.PI/2;for(let i=0;i<5;i++){const a=i/5*Math.PI*2,spoke=slab(spin,trim,s*.132,Math.sin(a)*p.wheel*.32,Math.cos(a)*p.wheel*.32,.015,.042,p.wheel*.63);spoke.rotation.x=-a;}merge(spin);wheels.push({pivot,mesh:spin,front:dz<0});}
    const brakeMaterial=new THREE.MeshBasicMaterial({color:0x852e23,toneMapped:false}),brakeLights=[];for(const s of [-1,1])brakeLights.push(slab(body,brakeMaterial,s*w*.33,base+.16,l/2+.06,w*.24,.065,.023));
    let driver=null;if(traffic){driver=character(0x776e5a,false,{civilian:true,variant:cars.length});seatCharacter(driver,p,type);body.add(driver);}
    const c={id:'car-'+cars.length,mesh:g,body,type,spec:p,baseColor:color,paintMaterial,spoiler,health:p.health,x,z,angle,speed:0,vx:0,vz:0,steer:0,roll:0,pitch:0,traffic,wheels,driver,brakeMaterial,brakeLights,original:{x,z,angle}};cars.push(c);return c;
  };
}
export function seatCharacter(person,p,type){person.userData.parts.gun.visible=false;person.scale.setScalar(.70);person.position.set(-p.width*.23,p.height-1.34,type==='pickup'?-.45:.05);const parts=person.userData.parts;parts.leftLeg.rotation.x=parts.rightLeg.rotation.x=1.15;parts.leftLegKnee.rotation.x=parts.rightLegKnee.rotation.x=-1.1;parts.leftArm.rotation.x=parts.rightArm.rotation.x=.65;parts.leftArmElbow.rotation.x=parts.rightArmElbow.rotation.x=.6;}
