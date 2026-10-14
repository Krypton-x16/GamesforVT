import * as THREE from 'three';
export function createLighting(scene,renderer){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1300,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x759db9)},horizon:{value:new THREE.Color(0xd1d4ca)}},vertexShader:'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 horizon;varying vec3 vSky;void main(){vec3 p=normalize(vSky);float t=pow(max(p.y,0.0),0.45);vec3 color=mix(horizon,top,t);float cloud=sin(p.x*19.0+p.z*7.0)*sin(p.z*23.0-p.x*8.0)+sin(p.x*38.0+p.z*12.0)*0.3;float mist=smoothstep(0.55,1.05,cloud)*smoothstep(0.05,0.25,p.y)*(1.0-smoothstep(0.45,0.8,p.y));color=mix(color,vec3(0.83,0.84,0.80),mist*0.30);gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  // Cubic sky capture is baked once; all window reflections share this environment.
  const environment=new THREE.Scene();environment.add(sky);const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(environment,.03,.1,1800);scene.environment=target.texture;scene.environmentIntensity=.45;environment.remove(sky);scene.add(sky);pmrem.dispose();scene.background=null;
  scene.fog=new THREE.Fog(0xc5ccca,135,425);
  const fill=new THREE.HemisphereLight(0xc6d8e6,0x6b675f,1.5);scene.add(fill);
  const sun=new THREE.DirectionalLight(0xffecd0,2.7);sun.position.set(-80,110,65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:300});sun.shadow.normalBias=.028;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun,sun.target);
  return {sun,sky};
}
