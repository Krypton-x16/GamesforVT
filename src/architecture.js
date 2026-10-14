import * as THREE from 'three';

export function createArchitecture(scene,geometry,surfaces){
  const batches=new Map(),dummy=new THREE.Object3D(),materials=new Map(),details=[];let detail=0;
  const solid=(color,metalness=0)=>{const key=color+':'+metalness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metalness?.35:.78,metalness}));return materials.get(key);};
  const trim=solid(0xb9b3a4),dark=solid(0x292d30),metal=solid(0x657075,.65),roof=surfaces.get('asphalt',0x999999);
  const glass=new THREE.MeshStandardMaterial({color:0x718792,roughness:.19,metalness:.65,envMapIntensity:1.15});
  const lit=new THREE.MeshStandardMaterial({color:0x98907b,roughness:.3,metalness:.18,emissive:0xd8a469,emissiveIntensity:.18});
  const signs=new Map();
  function add(x,y,z,w,h,d,mat,cast=true){const tx=Math.floor(x/72),tz=Math.floor(z/72),key=`${mat.id}:${tx}:${tz}:${cast}:${detail}`;if(!batches.has(key))batches.set(key,{mat,cast,detail,tx,tz,items:[]});dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batches.get(key).items.push(dummy.matrix.clone());}
  function sign(label,x,y,z,rotation){
    if(!signs.has(label)){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#25322f';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#b6a47b';ctx.lineWidth=3;ctx.strokeRect(7,7,498,82);ctx.fillStyle='#e2d3aa';ctx.font='500 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,48);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;signs.set(label,new THREE.MeshStandardMaterial({map:tex,roughness:.8}));}
    const m=new THREE.Mesh(new THREE.PlaneGeometry(4,.75),signs.get(label));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);
  }
  function building(x,z,w,d,h){
    let seed=Math.abs(Math.round(x*171+z*919))|0;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const style=h>38?3:Math.floor(rand()*3),colors=[0xe9d5c1,0xd6d2c7,0xd3c6b5,0xb6c1c2];
    const wall=surfaces.get(['brick','stone','plaster','plaster'][style],colors[style]);
    add(x,h/2+.3,z,w,h,d,wall);add(x,.20,z,w+1.4,.4,d+1.4,surfaces.get('stone',0x99978e));
    add(x,1.75,z,w+.08,3.3,d+.08,surfaces.get('stone',style===0?0xa6a497:0xc7c1b2));
    add(x,3.6,z,w+.25,.24,d+.25,trim);add(x,h+.37,z,w+.46,.28,d+.46,trim);add(x,h+.56,z,w-.2,.12,d-.2,roof);
    for(const s of [-1,1]){add(x+s*(w/2-.12),h+.85,z,.25,.75,d,trim);add(x,h+.85,z+s*(d/2-.12),w,.75,.25,trim);}
    add(x-w*.17,h+1,z+d*.18,3.2,1.2,2.4,metal);add(x-w*.17,h+1.63,z+d*.18,2.8,.06,2,dark);add(x+w*.24,h+1.2,z-d*.18,1.2,1.8,1.2,surfaces.get('brick'));
    // Face-local coordinates give all four sides true frames, sills and entrances.
    for(let side=0;side<4;side++){
      const horizontal=side<2,dir=side%2?-1:1,width=horizontal?w:d;
      const b=(u,y,out,a,b,c,mat,cast=true)=>horizontal?add(x+u,y,z+dir*(d/2+out),a,b,c,mat,cast):add(x+dir*(w/2+out),y,z+u,c,b,a,mat,cast);
      const count=Math.max(3,Math.floor((width-2)/3.6)),spacing=(width-2)/count;
      for(let row=0,y=5.2;y<h-1.2;y+=3.35,row++){
        if(style===3)b(0,y+1.42,.04,width,.12,.2,metal);
        for(let col=0;col<count;col++){
          const u=(col-(count-1)/2)*spacing,ww=style===3?spacing-.28:1.65,hh=2.05;
          b(u,y,.05,ww+.22,hh+.24,.12,dark);b(u,y,.125,ww,hh,.055,rand()<.1?lit:glass,false);detail=1;
          for(const s of [-1,1]){b(u+s*(ww/2+.065),y,.15,.105,hh+.25,.16,trim);b(u,y+s*(hh/2+.08),.16,ww+.3,.10,.22,trim);}
          b(u,y,.19,.05,hh,.06,metal);b(u,y+.18,.19,ww,.035,.06,metal);b(u,y-hh/2-.16,.23,ww+.4,.13,.42,trim);
          if(style===2&&row<4&&col%3===1){b(u,y-1.19,.45,ww+.7,.17,.90,trim);b(u,y-.73,.84,ww+.65,.035,.055,metal);for(const offset of [-.85,-.43,0,.43,.85])b(u+offset,y-.97,.84,.035,.48,.045,metal);}
          if(style!==3&&row===0&&col%3===0){b(u+ww*.68,y-.48,.29,.50,.53,.45,solid(0xbcbab0));for(let k=0;k<4;k++)b(u+ww*.68,y-.65+k*.10,.53,.40,.02,.035,metal);}detail=0;
        }
      }
      // Ground floor windows, glazed door, stone jambs, awning, address plate.
      for(const u of [-width*.32,width*.32]){b(u,1.7,.08,3.2,2.5,.14,dark);b(u,1.7,.17,2.98,2.32,.04,glass,false);b(u,1.7,.22,.065,2.34,.07,trim);}
      b(0,1.51,.1,1.9,2.85,.2,dark);b(0,1.5,.23,1.63,2.67,.06,glass,false);b(0,1.48,.28,.055,2.72,.06,metal);b(.15,1.28,.33,.035,.46,.04,trim);
      for(const s of [-1,1])b(s*1.03,1.5,.12,.16,3.02,.32,trim);
      b(0,.14,.40,2.5,.20,.8,trim);b(0,3.22,.37,4.5,.12,.8,metal);b(1.37,2.27,.19,.30,.37,.09,dark);
      if((side===0||side===2)&&Math.abs(x)<180&&Math.abs(z)<180){const label=['КАФЕ','МАРКЕТ','АТЕЛЬЕ','АПТЕКА','БАНК','ОТЕЛЬ'][Math.abs(Math.round(x+z))%6];if(horizontal)sign(label,x,3.22,z+dir*(d/2+.79),dir>0?0:Math.PI);else sign(label,x+dir*(w/2+.79),3.22,z,dir>0?Math.PI/2:-Math.PI/2);}
      // Drainpipe and continuous corner masonry visually anchor each facade.
      b(-width/2+.35,h/2,.12,.075,h,.075,metal);for(const u of [-width/2+.16,width/2-.16])b(u,h/2,.02,.24,h,.11,trim);
    }
  }
  function finish(){for(const {mat,cast,items,detail,tx,tz}of batches.values()){const m=new THREE.InstancedMesh(geometry,mat,items.length);items.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=cast;m.receiveShadow=true;m.computeBoundingSphere();scene.add(m);details.push({mesh:m,detail,x:m.boundingSphere.center.x,z:m.boundingSphere.center.z,radius:m.boundingSphere.radius});}batches.clear();}
  function update(position,quality){const distance=quality==='high'?150:quality==='low'?50:95,far=quality==='high'?650:quality==='low'?330:460;for(const d of details)d.mesh.visible=Math.hypot(d.x-position.x,d.z-position.z)<(d.detail?distance:far+d.radius);}
  return {building,finish,update};
}
