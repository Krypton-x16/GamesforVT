import * as THREE from 'three';
import {createVehicleFactory} from './vehicles.js';
import {createCharacterFactory} from './characters.js';
import {createSurfaces} from './surfaces.js';
import {createArchitecture} from './architecture.js';
import {CITY_SIZE,CITY_LIMIT,CITY_OFFSET,BOUNDS,RIVER,WORLD_WIDTH} from './geography.js';
import {addPlaces,addRiver} from './places.js';
export const WORLD_SIZE=WORLD_WIDTH;
export const WORLD_LIMIT=CITY_LIMIT;
export const ROADS=Array.from({length:11},(_,i)=>(i-5)*72);
const palette={road:0x28373e,pavement:0x7b8983,concrete:0x778c8c,dark:0x344f5f,glass:0x31596a,light:0x99b6bd,grass:0x46665a};
export function createWorld(scene){
  const colliders=[],roadMeshes=[],roadSegments=[],cars=[],trees=[],buildings=[];
  const mats=new Map(),surfaces=createSurfaces();const geo=new THREE.BoxGeometry(1,1,1),trunkGeo=new THREE.CylinderGeometry(.18,.33,4.2,9),crownGeo=new THREE.IcosahedronGeometry(1.6,1);let seed=909;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const material=(color,emissive=0)=>{const key=`${color}:${emissive}`;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.05,emissive,emissiveIntensity:.55}));return mats.get(key);};
  const character=createCharacterFactory(scene,material),architecture=createArchitecture(scene,geo,surfaces);
  function box(x,y,z,w,h,d,color,parent=scene,cast=true){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
  for(const offset of [0,CITY_OFFSET]){
    box(offset,-2.8,0,CITY_SIZE,5.5,CITY_SIZE,0x76816d,scene,false);
    box(offset,-.44,0,CITY_SIZE,.8,CITY_SIZE,palette.pavement,scene,false).material=surfaces.get('paving');
    for(const v of ROADS){
      roadMeshes.push(box(offset+v,.015,0,17,.04,CITY_SIZE,palette.road,scene,false));roadSegments.push({x:offset+v,z:0,w:17,d:CITY_SIZE});
      roadMeshes.push(box(offset,.02,v,CITY_SIZE,.04,17,palette.road,scene,false));roadSegments.push({x:offset,z:v,w:CITY_SIZE,d:17});
      for(let n=-CITY_LIMIT+6;n<CITY_LIMIT;n+=12){if(ROADS.some(r=>Math.abs(r-n)<13))continue;for(const lane of [-.13,.13]){box(offset+v+lane,.055,n,.075,.02,5,0xd7c694,scene,false);box(offset+n,.06,v+lane,5,.02,.075,0xd7c694,scene,false);}}
    }
    for(const x of ROADS)for(const z of ROADS){
      roadMeshes.push(box(offset+x,.055,z,17,.04,17,palette.road,scene,false));
      for(const side of [-1,1])for(let n=-5;n<=5;n+=2){box(offset+x+n,.084,z+side*11,1.1,.025,3,0xbfc3b6,scene,false);box(offset+x+side*11,.084,z+n,3,.025,1.1,0xbfc3b6,scene,false);}
    }
  }
  for(const road of roadMeshes)road.material=surfaces.get('asphalt');
  function building(x,z,w,d,h,color){
    architecture.building(x,z,w,d,h);
    colliders.push({x,z,w:w+1,d:d+1,h});buildings.push({x,z,w,d,h});
    // Preserve the established seed sequence and city layout used by saves/missions.
    for(let y=3;y<h-1;y+=3.8){
      for(let dx=-w/2+2.3;dx<w/2-1;dx+=3.8){rand();rand();}
      for(let dz=-d/2+2.3;dz<d/2-1;dz+=3.8){rand();rand();}
    }
  }
  const special=(x,z)=>Math.hypot(x-118,z-67)<30||Math.hypot(x+96,z-52)<24||Math.hypot(x,z+126)<34||Math.hypot(x,z-25)<29;
  const blocks=Array.from({length:10},(_,i)=>-324+i*72);
  for(const x of blocks)for(const z of blocks){
    if(x===36&&z===36||x===-252&&z===-252||x===252&&z===252||x<-216&&z>216)continue;
    for(const dx of [-15,15])for(const dz of [-15,15]){let xx=x+dx,zz=z+dz;if(special(xx,zz))continue;
      const high=(z<0&&x>0),outer=Math.abs(x)>180||Math.abs(z)>180;let h=outer?7+rand()*20:(high?20:10)+rand()*(high?47:28);building(xx,zz,19+rand()*5,19+rand()*5,h,[0x66808c,0x8b9b97,0x47667a,0x71818b,0x9ca69a][Math.floor(rand()*5)]);
    }
  }
  for(const x of blocks)for(const z of blocks){
    if((x===36&&z===36)||(x===-252&&z===-252)||x<-216&&Math.abs(z)<50)continue;
    for(const dx of [-15,15])for(const dz of [-15,15]){const lx=x+dx,lz=z+dz;if(special(lx,lz)||Math.abs(lx+24)<20&&Math.abs(lz-25)<20)continue;if(Math.abs(x)>180&&Math.abs(z)>180&&dx<0)continue;const h=(Math.abs(x)<130?20:9)+rand()*(z<0?42:18);building(CITY_OFFSET+lx,lz,19+rand()*4,19+rand()*4,h,0x9ba7a4);}
  }
  architecture.finish();
  // A little park and its central sculpture.
  box(36,.1,36,48,.18,48,palette.grass);box(36,.22,36,8,.15,48,0xb2aea0);box(36,.23,36,48,.15,6,0xb2aea0);
  const fountain=new THREE.Mesh(new THREE.CylinderGeometry(7,7.7,.6,24),material(0xb7b9ac));fountain.position.set(36,.4,36);scene.add(fountain);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(6.3,6.3,.08,24),new THREE.MeshStandardMaterial({color:0x5ca9b8,metalness:.55,roughness:.15}));water.position.set(36,.74,36);scene.add(water);
  const sculpture=new THREE.Mesh(new THREE.TorusKnotGeometry(1.4,.35,48,7),material(0xd3a35b));sculpture.position.set(36,3,36);scene.add(sculpture);colliders.push({x:36,z:36,w:13,d:13,h:3});
  function tree(x,z){
    const trunk=new THREE.Mesh(trunkGeo,material(0x615e4d));trunk.position.set(x,1.9,z);scene.add(trunk);
    const leafColor=[0x516347,0x5e7048,0x67734d][Math.floor(rand()*3)];
    for(let i=0;i<7;i++){const a=i*2.399;const crown=new THREE.Mesh(crownGeo,material(leafColor));crown.position.set(x+Math.sin(a)*(i?1.1:0),4.8+(i%3)*.65,z+Math.cos(a)*(i?1.1:0));crown.scale.set(1,1.15,1);crown.castShadow=true;scene.add(crown);}trees.push({x,z});
  }
  for(const x of [19,51])for(const z of [19,51])tree(x,z);
  for(const v of ROADS)for(let i=-348;i<360;i+=72){if(rand()>.35&&!special(v+13,i)&&!colliders.some(b=>Math.abs(b.x-v-13)<b.w/2+2&&Math.abs(b.z-i)<b.d/2+2))tree(v+13,i);}
  for(const [px,pz]of [[-252,-252],[252,252]]){box(px,.12,pz,48,.15,48,palette.grass);box(px,.21,pz,7,.12,48,0xb2aea0);for(const dx of [-17,17])for(const dz of [-17,17])tree(px+dx,pz+dz);}
  box(-289,.1,289,132,.14,132,0x374951);for(let z=236;z<350;z+=12)box(-289,.21,z,1,.04,6,0xc7c6b0);
  for(const x of [-329,-249])for(let z=242;z<348;z+=14)box(x,.22,z,20,.05,.25,0xd3c89a);
  for(const x of ROADS)for(const z of ROADS.map(v=>v-18)){
    box(x-11,3.3,z,.16,6.6,.16,0x345261);box(x-9.7,6.6,z,2.8,.15,.18,0x345261);const lamp=box(x-8.6,6.48,z,.7,.12,.45,0xffd89a);lamp.material=material(0xffd89a,0xeea648);
  }
  // Mission locations and garage.

  const crates=[];for(const [x,z] of [[113,58],[118,55],[124,58],[124,83],[-12,-126],[12,-122]]){box(x,1.3,z,3,2.6,3,0x927b55);box(x,1.3,z,3.1,.16,3.1,0x544f41);colliders.push({x,z,w:3,d:3,h:2.6});crates.push({x,z});}
  box(117,4.6,95,24,9,15,0x607981);box(117,9.3,95,25,.5,16,0x9ba6a0);colliders.push({x:117,z:95,w:24,d:15,h:9});
  // Outer edge surrounds both cities; the river and bridge lie inside it.
  for(const x of [BOUNDS.minX-2,BOUNDS.maxX+2])box(x,1.1,0,2,2.2,CITY_SIZE,0x6e7f7d);
  for(const z of [-CITY_LIMIT-2,CITY_LIMIT+2])box((BOUNDS.minX+BOUNDS.maxX)/2,1.1,z,WORLD_WIDTH,2.2,2,0x6e7f7d);
  for(const [px,pz]of [[CITY_OFFSET+36,36],[CITY_OFFSET-252,-252]]){box(px,.12,pz,48,.15,48,0x647654);box(px,.20,pz,6,.1,48,0xafad9e);for(const dx of [-17,17])for(const dz of [-17,17])tree(px+dx,pz+dz);}
  for(let z=-340;z<360;z+=54){for(const x of [RIVER.minX-15,RIVER.maxX+15]){if(Math.abs(z)<30)continue;tree(x,z);box(x,3.2,z+6,.12,6.4,.12,0x55605f);box(x,6.4,z+6,1.6,.12,.5,0xd9d3b4);}}
  const createCar=createVehicleFactory(scene,character,cars);
  createCar(5,28,0xefa640,0);createCar(-76,63,0x8dadb4,Math.PI/2);createCar(65,-78,0xa05346,Math.PI/2);createCar(147,103,0x586478,0);createCar(-4,-109,0xccc0a1,Math.PI);
  createCar(5,39,0xd95143,0,false,'sport');createCar(5,51,0x6f9272,0,false,'suv');createCar(5,63,0xc3b594,0,false,'pickup');
  createCar(-3,-48,0x779fba,Math.PI,true,'coupe');
  const types=['sport','suv','pickup','coupe'];for(let i=0;i<12;i++){const x=[-288,-216,216,288][i%4]+5,z=-252+Math.floor(i/4)*216;createCar(x,z,[0xce9e42,0x76989c,0x7c628c,0xa86c54][i%4],0,false,types[i%4]);}
  for(const [x,z,a,col,type]of [[-3,-165,Math.PI,0x657e92,'suv'],[75,110,0,0x9d675d,'sport'],[-115,-75,-Math.PI/2,0x6b967e,'pickup'],[120,3,Math.PI/2,0xceaa6c,'coupe'],[219,-240,0,0xb68166,'pickup'],[-219,240,Math.PI,0x859780,'suv']])createCar(x,z,col,a,true,type);
  for(const [i,z]of [28,40,52,64].entries())createCar(CITY_OFFSET+5,z,[0x889fa8,0x942f3c,0x668b6c,0xb7afa0][i],0,false,['coupe','sport','suv','pickup'][i]);
  createCar(CITY_OFFSET-3,-130,0x496d8a,Math.PI,true,'coupe');createCar(CITY_OFFSET+75,140,0x969b84,0,true,'suv');createCar(CITY_OFFSET-120,-3,0xa86c48,-Math.PI/2,true,'sport');
  const pedestrians=[];for(let i=0;i<32;i++){const side=i%2?1:-1,x=ROADS[i%ROADS.length]+side*11,z=-350+rand()*700;if(colliders.some(b=>Math.abs(b.x-x)<b.w/2+1&&Math.abs(b.z-z)<b.d/2+1))continue;const m=character([0x6e888c,0x987452,0x83906d,0xa55d4d,0x7b718b][i%5],false,{civilian:true,variant:i});m.position.set(x,0,z);pedestrians.push({mesh:m,x,z,dir:i%2?1:-1,axis:'z',state:'walk',vx:0,vz:0,vy:0,home:{x,z}});}
  // People visibly use the central crossings near the player's starting street.
  for(const [i,x,z,dir]of [[0,-13,11,1],[1,14,11,-1],[2,-11,58,-1],[3,13,-11,-1]]){const m=character([0xb66b52,0x537d91,0x849759,0xab936a][i],false,{civilian:true,variant:i+3});m.position.set(x,0,z);pedestrians.push({mesh:m,x,z,dir,axis:i<2?'x':'z',state:'walk',vx:0,vz:0,vy:0,home:{x,z},crossing:i<2});}
  for(let i=0;i<12;i++){const x=CITY_OFFSET+(i%3-1)*72+11,z=-280+i*48;if(colliders.some(b=>Math.abs(x-b.x)<b.w/2+1&&Math.abs(z-b.z)<b.d/2+1))continue;const m=character([0x657a81,0x7a735d,0x827475][i%3],false,{civilian:true,variant:i+10});m.position.set(x,0,z);pedestrians.push({mesh:m,x,z,dir:i%2?1:-1,axis:'z',state:'walk',vx:0,vz:0,vy:0,home:{x,z}});}
  function sign(text,x,y,z,ry=0,width=12,height=width/4){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#16303f';c.fillRect(0,0,512,128);c.fillStyle='#f5c178';c.font='bold 52px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66,484);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);}
  sign('НОВЫЙ БЕРЕГ',36,5,10,0,19);sign('СКЛАД 04',117,7,87.4,Math.PI,15);
  sign('АВТОДРОМ',-289,5,230,0,18);sign('СЕВЕРНЫЕ САДЫ',-252,4,-275,0,20);sign('ЮЖНЫЙ ПАРК',252,4,229,0,18);
  const places=addPlaces(scene,box,material,colliders,sign,surfaces,character),river=addRiver(scene,box,material,colliders,sign,surfaces);
  roadSegments.push({x:(RIVER.minX+RIVER.maxX)/2,z:0,w:RIVER.maxX-RIVER.minX+24,d:17});
  sign('ЗАРЕЧЕНСК',CITY_OFFSET+36,5,10,0,20);
  // Batch immutable city blocks by material to keep the city fast on modest GPUs.
  const batches=new Map();for(const mesh of [...scene.children]){if(mesh.userData.dynamicRoof||!mesh.isMesh||mesh.isInstancedMesh||![geo,trunkGeo,crownGeo].includes(mesh.geometry))continue;const key=`${mesh.geometry.id}:${mesh.material.id}:${Math.floor(mesh.position.x/144)}:${Math.floor(mesh.position.z/144)}:${mesh.castShadow}`;let group=batches.get(key);if(!group){group=[];batches.set(key,group);}mesh.updateMatrix();group.push(mesh);}
  for(const list of batches.values()){const batch=new THREE.InstancedMesh(list[0].geometry,list[0].material,list.length);for(let i=0;i<list.length;i++){batch.setMatrixAt(i,list[i].matrix);scene.remove(list[i]);}batch.castShadow=list[0].castShadow;batch.receiveShadow=true;batch.computeBoundingSphere();scene.add(batch);}
  return {colliders,cars,buildings,trees,pedestrians,character,box,material,sculpture,architecture,roadSegments,services:places.services,places,river};
}
