import * as THREE from 'three';
import {CITY_OFFSET,RIVER,BOUNDS} from './geography.js';

export function addPlaces(scene,box,material,colliders,sign,surfaces,character){
  const services=[],roofs=[];
  function wall(x,y,z,w,h,d,col){const m=box(x,y,z,w,h,d,col);colliders.push({x,z,w,d,h:y+h/2});return m;}
  for(const offset of [0,CITY_OFFSET]){
    const gx=offset-96,gz=48;
    box(gx,.025,gz,26,.04,24,0x68716e).material=surfaces.get('asphalt',0xd4d4d4);
    wall(gx,3,gz-11,26,6,.7,0x526069).material=surfaces.get('brick',0xb9c0bf);
    for(const s of [-1,1]){wall(gx+s*12.65,3,gz,.7,6,22,0x627076);wall(gx+s*9.5,3,gz+11,6,6,.7,0x65757b);}
    const roof=box(gx,6.2,gz,27,.35,24,0x414c53);roof.userData.dynamicRoof=true;roofs.push({mesh:roof,x:gx,z:gz,w:27,d:24});
    box(gx,5.4,gz+11.4,13,1.1,.25,0xd89e43);sign('ГАРАЖ 09 · G',gx,5.4,gz+11.56,0,12,1);
    for(const s of [-1,1]){box(gx+s*3,.08,gz,1.4,.08,11,0x2d4249);box(gx+s*4.1,1.45,gz-4,.35,2.9,.45,0xe5ad43);box(gx+s*8,1,gz-8,3,1.9,1.2,0x314856);}
    for(let z=gz-7;z<gz+14;z+=3){box(gx-5,.058,z,.10,.02,1.4,0xeac45d);box(gx+5,.058,z,.10,.02,1.4,0xeac45d);}
    box(gx-8,2.2,gz-10.5,4,.9,.15,0x2c363a);sign('TUNING / SERVICE',gx,3.6,gz-10.55,0,13,1.2);
    const gl=new THREE.PointLight(0xffdfaf,24,17,2);gl.position.set(gx,4.7,gz);scene.add(gl);
    services.push({kind:'garage',name:offset?'Гараж Зареченска':'Гараж 09',x:gx,z:gz+1,entry:{x:gx,z:gz+17},radius:7.5});

    const sx=offset-24,sz=25;
    box(sx,.025,sz,18,.045,15,0x9c9b8f).material=surfaces.get('paving');
    wall(sx,2.4,sz-7.5,18,4.8,.45,0xc4bfae).material=surfaces.get('stone');
    for(const s of [-1,1]){wall(sx+s*8.8,2.4,sz,.4,4.8,15,0xc4bfae);wall(sx+s*5.4,2.4,sz+7.5,6.8,4.8,.4,0xbab4a1);box(sx+s*5.4,2.1,sz+7.76,5.2,2.5,.03,0x496a73);colliders.push({x:sx+s*6.7,z:sz-2.8,w:1.3,d:5,h:2});for(const end of [-1,1])box(sx+s*6.7,1,sz-2.8+end*2.4,1.3,2,.09,0x586161);for(const y of [.4,.85,1.3,1.75])box(sx+s*6.7,y,sz-2.8,1.3,.06,5,0x687776);box(sx+s*7.3,1,sz-2.8,.09,2,5,0x586161);}
    const sr=box(sx,4.95,sz,19,.3,16,0x414c4d);sr.userData.dynamicRoof=true;roofs.push({mesh:sr,x:sx,z:sz,w:20,d:18});
    wall(sx,.65,sz-3.8,7,1.3,1.25,0x566365);box(sx,1.33,sz-3.8,7.3,.10,1.5,0xb5ab91);
    for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<4;i++)box(sx+side*6.7,.7+row*.45,sz-4+i*.75,.7,.25,.42,[0xb7bbab,0xc48c5b,0x657a78][row]);
    box(sx-2,1.68,sz-3.8,.70,.60,.25,0x28373a);box(sx+1.5,1.49,sz-3.8,.8,.22,.5,0xc2b995);sign('СНАРЯЖЕНИЕ · E',sx,3.9,sz+7.78,0,14,1.1);
    const clerk=character(0x727f65,false,{civilian:true,variant:offset?4:7});clerk.position.set(sx,0,sz-5.8);clerk.rotation.y=Math.PI;colliders.push({x:sx,z:sz-5.8,w:.7,d:.7,h:1.8});
    sign('МАГАЗИН 09',sx,3.4,sz-7.22,0,11,1.2);const sl=new THREE.PointLight(0xe5edeb,18,14,2);sl.position.set(sx,3.7,sz);scene.add(sl);
    services.push({kind:'shop',name:offset?'Магазин Зареченска':'Магазин 09',x:sx,z:sz-1,entry:{x:sx,z:sz+10},radius:3.5});
  }
  function update(player){for(const r of roofs)r.mesh.visible=!(Math.abs(player.x-r.x)<r.w/2&&Math.abs(player.z-r.z)<r.d/2);}
  return {services,update};
}

export function addRiver(scene,box,material,colliders,sign,surfaces){
  const center=(RIVER.minX+RIVER.maxX)/2,width=RIVER.maxX-RIVER.minX;
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),data=ctx.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const v=128+38*Math.sin(x/128*Math.PI*8+Math.sin(y/128*Math.PI*4))+21*Math.sin(y/128*Math.PI*12);const i=(y*128+x)*4;data.data.set([v,v,v,255],i);}ctx.putImageData(data,0,0);const bump=new THREE.CanvasTexture(c);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(13,40);
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x36656c,roughness:.24,metalness:.35,bumpMap:bump,bumpScale:.18,envMapIntensity:1.5,clearcoat:.6});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(width,BOUNDS.maxZ-BOUNDS.minZ+80),waterMat);water.rotation.x=-Math.PI/2;water.position.set(center,-4.7,0);scene.add(water);
  // Stone embankments, safe edges, and an uninterrupted opening onto the bridge.
  for(const x of [RIVER.minX-1,RIVER.maxX+1]){box(x,-2.4,0,2,4.8,780,0x8b938a).material=surfaces.get('stone',0xc2c3b9);for(const z of [-204,204]){const m=box(x,.45,z,.6,.9,382,0x9eaa9e);colliders.push({x,z,w:.6,d:382,h:.9});}for(let z=-360;z<=360;z+=36){if(Math.abs(z)<25)continue;box(x+(x<center?-6:6),.05,z,7,.08,12,0x779071);}}
  box(center,-.42,0,width+24,.75,25,0x8e9b99);box(center,.01,0,width+24,.06,17,0x39454b).material=surfaces.get('asphalt');
  for(const s of [-1,1]){box(center,.10,s*10,width+24,.15,3,0x9daca5);box(center,.67,s*12,width+24,1.15,.3,0x65777b);colliders.push({x:center,z:s*12,w:width+24,d:.3,h:1.25});}
  for(let x=RIVER.minX-10;x<RIVER.maxX+12;x+=12)box(x,.063,0,5,.025,.15,0xebd6a1);
  const archMat=new THREE.MeshStandardMaterial({color:0x93594a,metalness:.6,roughness:.36}),cableMat=material(0x9faaa7);
  for(const side of [-1,1]){
    const points=[];for(let i=0;i<=40;i++)points.push(new THREE.Vector3(RIVER.minX+i/40*width,1.2+Math.sin(i/40*Math.PI)*32,side*11.5));
    const arch=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.56,7,false),archMat);arch.castShadow=true;scene.add(arch);
    for(let i=1;i<18;i++){const x=RIVER.minX+i/18*width,h=Math.sin(i/18*Math.PI)*32;const cable=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,h,5),cableMat);cable.position.set(x,1.2+h/2,side*11.5);scene.add(cable);}
  }
  for(const x of [RIVER.minX,RIVER.maxX]){for(const s of [-1,1])box(x,-1.7,s*10.6,5,7,3.8,0xa3aea8);box(x,4.8,-10.5,1,.2,2,0xf4dfac);}
  sign('ЗАРЕЧЕНСК  →',RIVER.minX-12,4.6,-9,-Math.PI/2,11);sign('←  НОВЫЙ БЕРЕГ',RIVER.maxX+12,4.6,9,Math.PI/2,12);
  const boat=new THREE.Group();scene.add(boat);const hull=box(0,0,0,3.5,.8,10,0xe0d7bc,boat);box(0,.8,-.6,2.9,1.3,4.5,0x50636a,boat);box(0,1.5,-.6,3.1,.15,4.8,0xb6b7a9,boat);boat.position.set(center+42,-4.1,145);boat.rotation.y=.45;
  return {water,update(time){bump.offset.set(time*.008,time*.004);boat.position.y=-4.1+Math.sin(time*.8)*.12;boat.rotation.z=Math.sin(time*.65)*.018;}};
}
