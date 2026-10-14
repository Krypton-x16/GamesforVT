import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSurfaces} from './surfaces.js';

let headGeometry,headColor,headNormal;
const eyePoints=[];
export async function loadCharacterAssets(){
  const base=new URL('./assets/people/',document.baseURI).href,textures=new THREE.TextureLoader();
  const [model,color,normal]=await Promise.all([new GLTFLoader().loadAsync(base+'LeePerrySmith.glb'),textures.loadAsync(base+'Map-COL.jpg'),textures.loadAsync(base+'Infinite-Level_02_Tangent_SmoothUV.jpg')]);
  headGeometry=model.scene.children[0].geometry;headColor=color;headColor.colorSpace=THREE.SRGBColorSpace;headNormal=normal;
  // Trim the scan's bare shoulders so the bust cannot protrude through a shirt.
  const retained=[],positions=headGeometry.attributes.position,originalIndex=headGeometry.index;
  for(let i=0;i<originalIndex.count;i+=3){const ids=[originalIndex.getX(i),originalIndex.getX(i+1),originalIndex.getX(i+2)];if(ids.every(id=>positions.getY(id)>=-1.3))retained.push(...ids);}headGeometry.setIndex(retained);
  const uv=headGeometry.attributes.uv,p=headGeometry.attributes.position,index=headGeometry.index;
  for(const [x,y]of [[440,304],[580,304]]){
    const point=new THREE.Vector3(x/1024,1-y/1024,0),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),bary=new THREE.Vector3();
    for(let i=0;i<index.count;i+=3){const ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);a.set(uv.getX(ia),uv.getY(ia),0);b.set(uv.getX(ib),uv.getY(ib),0);c.set(uv.getX(ic),uv.getY(ic),0);if(!THREE.Triangle.containsPoint(point,a,b,c))continue;THREE.Triangle.getBarycoord(point,a,b,c,bary);eyePoints.push(new THREE.Vector3().fromBufferAttribute(p,ia).multiplyScalar(bary.x).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,ib),bary.y).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,ic),bary.z));break;}
  }
}
function tailoredShape(rings,segments=12){
  const positions=[],uv=[],indices=[];
  for(let j=0;j<rings.length;j++){const [y,w,d,z=0]=rings[j];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.sin(a)*w,y,Math.cos(a)*d+z);uv.push(i/segments,j/(rings.length-1));}}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;if(rings[1][0]>rings[0][0])indices.push(a,a+1,b,b,a+1,b+1);else indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createCharacterFactory(scene,material){
  const surfaces=createSurfaces(),cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,16,12),capsule=new THREE.CapsuleGeometry(1,1,4,10);let sequence=0;
  const shirt=tailoredShape([[.975,.177,.121],[1.00,.18,.123],[1.09,.175,.115],[1.26,.205,.13],[1.40,.235,.115],[1.49,.24,.095],[1.54,.095,.085],[1.55,.07,.075]]);
  const thigh=tailoredShape([[0,.092,.105],[-.12,.097,.10],[-.28,.076,.085],[-.40,.065,.067]]),calf=tailoredShape([[0,.067,.068],[-.10,.075,.077],[-.24,.058,.059],[-.36,.05,.057]]);
  const sleeve=tailoredShape([[0,.082,.092],[-.09,.083,.09],[-.25,.059,.066],[-.30,.054,.056]]),forearm=tailoredShape([[0,.058,.059],[-.09,.063,.06],[-.20,.045,.045],[-.27,.035,.037]]);
  const skinMats=new Map(),clothMats=new Map(),hairGeometry=new Map();
  function fittedHair(variant){const key=variant%3;if(hairGeometry.has(key))return hairGeometry.get(key);const g=headGeometry.clone(),p=g.attributes.position,n=g.attributes.normal,ids=[];for(let i=0;i<g.index.count;i+=3){const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];const x=tri.reduce((s,i)=>s+p.getX(i),0)/3,y=tri.reduce((s,i)=>s+p.getY(i),0)/3,z=tri.reduce((s,i)=>s+p.getZ(i),0)/3;if(y>2.55+key*.12||(y>1.1&&z<.2)||(y>1.55&&Math.abs(x)>1.3&&z<1.3))ids.push(...tri);}g.setIndex(ids);for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*.065,p.getY(i)+n.getY(i)*.065,p.getZ(i)+n.getZ(i)*.065);hairGeometry.set(key,g);return g;}
  const cloth=color=>{if(!clothMats.has(color))clothMats.set(color,surfaces.get('cloth',color));return clothMats.get(color);};
  const scan=variant=>{if(!skinMats.has(variant%4)){const mat=new THREE.MeshStandardMaterial({map:headColor,normalMap:headNormal,normalScale:new THREE.Vector2(.65,.65),color:[0xffffff,0xcda98b,0xe0c2a8,0xa1826a][variant%4],roughness:.72,metalness:0});skinMats.set(variant%4,mat);}return skinMats.get(variant%4);};
  const detailsMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8});
  function mergeDetails(parent,list){if(list.length<2)return;const copies=list.map(m=>{m.updateMatrix();const copy=m.geometry.clone().applyMatrix4(m.matrix),col=m.material.color,colors=new Float32Array(copy.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=col.r;colors[i+1]=col.g;colors[i+2]=col.b;}copy.setAttribute('color',new THREE.BufferAttribute(colors,3));return copy;});const geometry=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(geometry){const m=new THREE.Mesh(geometry,detailsMat);m.castShadow=m.receiveShadow=true;list.forEach(m=>parent.remove(m));parent.add(m);}}
  return function character(color=0x3d6777,enemy=false,options={}){
    const variant=options.variant??sequence++,civilian=options.civilian===true,skin=[0xc69476,0xa87856,0xb98965,0x845c43][variant%4],hair=[0x251d19,0x403326,0x302a25,0x242320][variant%4],pants=[0x3b4248,0x4b4940,0x383a38,0x454955][variant%4];
    const g=new THREE.Group(),rig=new THREE.Group();rig.position.y=1;g.add(rig);const parts={};
    function mesh(geometry,mat,parent=rig){const m=new THREE.Mesh(geometry,typeof mat==='number'?material(mat):mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
    function box(x,y,z,w,h,d,col,parent=rig){const m=mesh(cube,col,parent);m.position.set(x,y-1,z);m.scale.set(w,h,d);return m;}
    parts.body=mesh(shirt,cloth(color));parts.body.position.y=-1;
    box(0,.9,0,.32,.15,.20,pants);box(0,.95,-.005,.36,.045,.235,0x292929);box(0,.95,-.128,.06,.04,.012,0x8c8b80);
    // The attributed scan supplies a real jaw, ears, nose, eyelids and skin detail.
    parts.head=mesh(headGeometry,scan(variant));parts.head.position.set(0,.61,-.005);parts.head.rotation.y=Math.PI;parts.head.scale.set(.049*(variant%2?1.02:.97),.052,.05);parts.face=parts.head;
    for(const point of eyePoints){const eye=mesh(sphere,material(0xb4b1a6),parts.head);eye.position.copy(point).add(new THREE.Vector3(0,0,.035));eye.scale.set(.27,.085,.11);const iris=mesh(sphere,material(variant%2?0x524438:0x4c585b),parts.head);iris.position.copy(point).add(new THREE.Vector3(0,0,.14));iris.scale.set(.076,.072,.017);const pupil=mesh(sphere,material(0x202222),parts.head);pupil.position.copy(point).add(new THREE.Vector3(0,0,.157));pupil.scale.set(.033,.051,.008);}
    mergeDetails(parts.head,[...parts.head.children]);parts.hair=mesh(fittedHair(variant),cloth(hair),parts.head);
    if(enemy){const cap=mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,1.65),cloth(0x464a3e));cap.position.set(0,.745,.008);cap.scale.set(.096,.09,.112);box(0,1.73,-.102,.16,.018,.10,0x333a32);}
    const seam=new THREE.Color(color).multiplyScalar(.65).getHex();box(0,1.245,-.132,.009,.48,.008,seam);
    for(const x of [-.112,.112]){box(x,1.335,-.126,.09,.10,.016,seam);box(x,1.385,-.139,.10,.017,.012,color);}
    for(const side of [-1,1]){const collar=box(side*.06,1.525,-.079,.055,.09,.027,color);collar.rotation.z=side*.4;}
    if(!civilian){box(0,1.30,-.121,.31,.34,.095,enemy?0x4e5040:0x293b40);for(const x of [-.105,0,.105])box(x,1.20,-.183,.085,.11,.036,0x4d5756);box(.08,1.47,.104,.09,.12,.045,0x273a40);}
    for(const [key,side] of [['leftLeg',-1],['rightLeg',1]]){
      const leg=new THREE.Group();leg.position.set(side*.10,-.065,0);rig.add(leg);parts[key]=leg;mesh(thigh,cloth(pants),leg);
      const knee=new THREE.Group();knee.position.y=-.40;leg.add(knee);parts[key+'Knee']=knee;mesh(calf,cloth(pants),knee);
      const shoe=mesh(sphere,material(0x292a28),knee);shoe.position.set(0,-.42,-.039);shoe.scale.set(.072,.078,.145);
      const sole=mesh(cube,material(0x191d1e),knee);sole.position.set(0,-.466,-.041);sole.scale.set(.14,.026,.27);
      const pocket=mesh(cube,material(pants),leg);pocket.position.set(side*.093,-.14,.006);pocket.scale.set(.018,.13,.10);
    }
    for(const [key,side] of [['leftArm',-1],['rightArm',1]]){
      const arm=new THREE.Group();arm.position.set(side*.247,.475,0);arm.rotation.z=side*.05;rig.add(arm);parts[key]=arm;mesh(sleeve,cloth(color),arm);const shoulder=mesh(sphere,cloth(color),arm);shoulder.scale.set(.083,.072,.092);
      const elbow=new THREE.Group();elbow.position.y=-.29;elbow.rotation.x=-.12;arm.add(elbow);parts[key+'Elbow']=elbow;mesh(forearm,cloth(color),elbow);
      const cuff=mesh(cube,material(seam),elbow);cuff.position.y=-.255;cuff.scale.set(.075,.03,.073);
      const hand=mesh(sphere,material(skin),elbow);hand.position.set(0,-.322,-.005);hand.scale.set(.04,.062,.025);
      for(let finger=0;finger<4;finger++){const f=mesh(capsule,material(skin),elbow);f.position.set((finger-1.5)*.016,-.373,-.007);f.scale.set(.008,.018-finger*.001,.008);}
      const thumb=mesh(capsule,material(skin),elbow);thumb.position.set(-side*.038,-.331,-.02);thumb.rotation.z=-side*.4;thumb.scale.set(.011,.02,.011);mergeDetails(elbow,elbow.children.filter(m=>m.isMesh&&m.geometry!==forearm));
    }
    parts.gun=new THREE.Group();rig.add(parts.gun);box(.285,1.06,-.30,.075,.09,.26,0x242a2d,parts.gun);box(.285,.98,-.22,.063,.13,.065,0x20262a,parts.gun);parts.gun.visible=!civilian;
    mergeDetails(rig,rig.children.filter(m=>m.isMesh&&m.geometry===cube));g.userData={parts,rig,civilian,variant,skin,realistic:true};scene.add(g);animatePerson(g,0,0);return g;
  };
}
export function animatePerson(mesh,time,speed=0){
  const {parts,rig,civilian}=mesh.userData;if(!rig)return;const stride=Math.sin(time*6)*Math.min(.6,speed*.36);parts.leftLeg.rotation.x=stride;parts.rightLeg.rotation.x=-stride;parts.leftLegKnee.rotation.x=Math.max(0,-stride)*1.3;parts.rightLegKnee.rotation.x=Math.max(0,stride)*1.3;parts.leftArm.rotation.x=-stride*.65;parts.rightArm.rotation.x=civilian?stride*.65:-.5;parts.leftArm.rotation.z=-.05;parts.rightArm.rotation.z=.05;rig.position.y=1+Math.abs(Math.sin(time*6))*Math.min(.025,speed*.015);rig.rotation.set(0,0,Math.sin(time*6)*Math.min(.018,speed*.009));
}
export function fallenPose(mesh,fall,phase=0){
  const {parts,rig}=mesh.userData;if(!rig)return;rig.position.y=1-.69*fall;rig.rotation.x=-Math.PI*.48*fall;rig.rotation.z=Math.sin(phase*2)*.08*fall;parts.leftArm.rotation.z=-.8*fall;parts.rightArm.rotation.z=.8*fall;parts.leftLeg.rotation.x=.4*fall;parts.rightLeg.rotation.x=-.2*fall;parts.leftLegKnee.rotation.x=.3*fall;parts.rightLegKnee.rotation.x=.6*fall;
}
