import {BOUNDS,RIVER,CITY_OFFSET,CITY_SIZE,WORLD_WIDTH,WORLD_DEPTH} from './geography.js';
export function drawWorldMap(g,canvas,large=false){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#122a39';ctx.fillRect(0,0,w,h);
  const scale=large?Math.min(w/(WORLD_WIDTH+100),h/(WORLD_DEPTH+120)):w/150,cx=large?(BOUNDS.minX+BOUNDS.maxX)/2:g.player.position.x,cz=large?0:g.player.position.z;
  const point=(x,z)=>[w/2+(x-cx)*scale,h/2+(z-cz)*scale];
  const rect=(x,z,ww,dd,col)=>{const [px,pz]=point(x-ww/2,z-dd/2);ctx.fillStyle=col;ctx.fillRect(px,pz,ww*scale,dd*scale);};
  for(const o of [0,CITY_OFFSET])rect(o,0,CITY_SIZE,CITY_SIZE,'#31453e');rect((RIVER.minX+RIVER.maxX)/2,0,RIVER.maxX-RIVER.minX,WORLD_DEPTH,'#29576e');
  for(const road of g.world.roadSegments)rect(road.x,road.z,road.w,road.d,'#72817f');
  for(const b of g.world.buildings)rect(b.x,b.z,b.w,b.d,'#a1aaa0');
  for(const o of [0,CITY_OFFSET])rect(o+36,36,48,48,'#517558');
  for(const c of g.world.cars){const [x,z]=point(c.x,c.z);ctx.fillStyle=c.traffic?'#8096a2':'#78cabb';ctx.fillRect(x-1.5,z-2,3,4);}
  for(const s of g.world.services){const [x,z]=point(s.x,s.z);ctx.fillStyle=s.kind==='garage'?'#efb555':'#75d4bf';ctx.beginPath();ctx.arc(x,z,large?8:5,0,Math.PI*2);ctx.fill();if(large){ctx.fillStyle='#10232c';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(s.kind==='garage'?'G':'М',x,z+3);}}
  const target=g.active?.target??g.navTarget;if(target){let [x,z]=point(target.x,target.z);x=Math.max(8,Math.min(w-8,x));z=Math.max(8,Math.min(h-8,z));ctx.save();ctx.translate(x,z);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd58a';ctx.fillRect(-4,-4,8,8);ctx.restore();}
  for(const e of g.enemies){if(e.hp<=0)continue;const [x,z]=point(e.mesh.position.x,e.mesh.position.z);ctx.fillStyle='#ef8674';ctx.beginPath();ctx.arc(x,z,3,0,Math.PI*2);ctx.fill();}
  const [px,pz]=point(g.player.position.x,g.player.position.z);ctx.save();ctx.translate(px,pz);ctx.rotate(-g.yaw);ctx.fillStyle='#fff6db';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,2);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();
  if(large){ctx.textAlign='center';ctx.font='bold 16px sans-serif';for(const [label,x,z]of [['НОВЫЙ БЕРЕГ',0,-430],['ЗАРЕЧЕНСК',CITY_OFFSET,-430],['МОСТ ДРУЖБЫ',504,-45]]){const [a,b]=point(x,z);ctx.strokeStyle='#102430';ctx.lineWidth=4;ctx.strokeText(label,a,b);ctx.fillStyle='#e4e9dc';ctx.fillText(label,a,b);}ctx.font='12px sans-serif';ctx.textAlign='left';ctx.fillStyle='#cbd9d5';ctx.fillText('1 788 × 780 м · G — гараж · М — магазин',22,h-22);}
}
