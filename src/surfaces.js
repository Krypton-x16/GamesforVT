import * as THREE from 'three';

// World projection preserves brick size across differently scaled city instances.
export function createSurfaces(){
  let seed=504;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const tiles=new Map(),cache=new Map();
  function tile(kind){
    if(tiles.has(kind))return tiles.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
    const height=document.createElement('canvas');height.width=height.height=512;const hc=height.getContext('2d');
    const base={brick:[135,88,65],stone:[185,180,165],plaster:[204,199,183],asphalt:[66,69,71],paving:[153,151,141],cloth:[191,190,185]}[kind];
    ctx.fillStyle=`rgb(${base})`;ctx.fillRect(0,0,512,512);hc.fillStyle='#b0b0b0';hc.fillRect(0,0,512,512);
    if(['brick','stone','paving'].includes(kind)){
      const row=kind==='brick'?32:kind==='stone'?128:64,col=kind==='brick'?128:kind==='stone'?256:128;
      ctx.fillStyle=kind==='brick'?'#a69c88':'#77756d';ctx.fillRect(0,0,512,512);hc.fillStyle='#303030';hc.fillRect(0,0,512,512);
      for(let y=0;y<512;y+=row)for(let x=-col;x<512;x+=col){const px=x+(y/row%2)*col/2,v=(random()-.5)*27;ctx.fillStyle=`rgb(${base.map(b=>b+v)})`;ctx.fillRect(px+2,y+2,col-4,row-4);hc.fillStyle=`rgb(${[1,1,1].map(()=>170+v)})`;hc.fillRect(px+2,y+2,col-4,row-4);ctx.fillStyle='rgba(255,255,240,.09)';ctx.fillRect(px+3,y+3,col-6,1);ctx.fillStyle='rgba(20,20,15,.16)';ctx.fillRect(px+3,y+row-3,col-6,1);}
    }
    const img=ctx.getImageData(0,0,512,512),bump=hc.getImageData(0,0,512,512);
    for(let i=0;i<img.data.length;i+=4){const n=(random()-.5)*(kind==='asphalt'?26:kind==='cloth'?15:25);for(let ch=0;ch<3;ch++){img.data[i+ch]+=n;bump.data[i+ch]+=n*.75;}}
    ctx.putImageData(img,0,0);hc.putImageData(bump,0,0);
    if(kind==='cloth'){ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;for(let i=0;i<512;i+=4){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(512,i);ctx.stroke();}}
    if(kind==='asphalt'){ctx.strokeStyle='rgba(20,23,24,.22)';ctx.lineWidth=2;for(let i=0;i<7;i++){let x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<7;j++){x+=(random()-.4)*35;y+=random()*24;ctx.lineTo(x,y);}ctx.stroke();}}
    const map=new THREE.CanvasTexture(canvas),bumpMap=new THREE.CanvasTexture(height);map.colorSpace=THREE.SRGBColorSpace;for(const t of [map,bumpMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}const result={map,bumpMap};tiles.set(kind,result);return result;
  }
  function get(kind,color=0xffffff){
    const key=`${kind}:${color}`;if(cache.has(key))return cache.get(key);
    const maps=tile(kind),size={brick:2,stone:4,paving:4,plaster:3,asphalt:5,cloth:.4}[kind];
    const mat=new THREE.MeshStandardMaterial({...maps,color,roughness:kind==='cloth'?.95:.87,bumpScale:kind==='brick'?.04:kind==='asphalt'?.008:.018});mat.userData.surface=kind;
    if(kind!=='cloth'){
      mat.onBeforeCompile=shader=>{
        const declarations='varying vec3 vSurfacePosition; varying vec3 vSurfaceNormal;\n';shader.vertexShader=declarations+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 surfacePosition=vec4(position,1.0); vec3 surfaceNormal=normal;\n#ifdef USE_INSTANCING\nsurfacePosition=instanceMatrix*surfacePosition; surfaceNormal=mat3(instanceMatrix)*surfaceNormal;\n#endif\nvSurfacePosition=(modelMatrix*surfacePosition).xyz; vSurfaceNormal=normalize(mat3(modelMatrix)*surfaceNormal);');
        const uv=`vec2 surfaceUV(){vec3 n=abs(normalize(vSurfaceNormal)); vec2 uv; if(n.y>n.x&&n.y>n.z)uv=vSurfacePosition.xz;else if(n.x>n.z)uv=vSurfacePosition.zy;else uv=vSurfacePosition.xy;return uv/${size.toFixed(2)};}`;
        shader.fragmentShader=declarations+uv+'\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replaceAll('vMapUv','surfaceUV()'));
        shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll('vBumpMapUv','surfaceUV()'));
      };mat.customProgramCacheKey=()=>`surface-v1-${kind}`;
    }
    cache.set(key,mat);return mat;
  }
  return {get};
}
