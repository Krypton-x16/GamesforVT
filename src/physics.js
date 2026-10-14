export const GRAVITY=22;
export const VEHICLE_TYPES={
  coupe:{name:'КУПЕ / C-09',width:1.94,length:4.6,height:1.52,wheelbase:2.8,wheel:.36,mass:1250,power:17,maxSpeed:43,grip:8,brake:28,health:100},
  sport:{name:'СПОРТКАР / FALCON',width:2.02,length:4.7,height:1.35,wheelbase:2.9,wheel:.34,mass:1100,power:26,maxSpeed:65,grip:10,brake:34,health:85},
  suv:{name:'ВНЕДОРОЖНИК / ATLAS',width:2.14,length:5.1,height:1.98,wheelbase:3.15,wheel:.46,mass:2150,power:13,maxSpeed:37,grip:6,brake:24,health:160},
  pickup:{name:'ПИКАП / NOMAD',width:2.10,length:5.8,height:1.87,wheelbase:3.6,wheel:.43,mass:2400,power:11,maxSpeed:34,grip:5.5,brake:22,health:180}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function segmentBox(start,end,min,max){
  let enter=0,exit=1;
  for(const k of ['x','y','z']){const delta=end[k]-start[k];if(Math.abs(delta)<1e-9){if(start[k]<min[k]||start[k]>max[k])return null;}else{let a=(min[k]-start[k])/delta,b=(max[k]-start[k])/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit)return null;}}
  return enter;
}
export function segmentSphere(start,end,center,radius){
  const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,ox=start.x-center.x,oy=start.y-center.y,oz=start.z-center.z;
  const a=dx*dx+dy*dy+dz*dz,b=ox*dx+oy*dy+oz*dz,c=ox*ox+oy*oy+oz*oz-radius*radius;
  if(c<=0)return 0;if(a<1e-12)return null;const determinant=b*b-a*c;if(determinant<0)return null;const t=(-b-Math.sqrt(determinant))/a;return t>=0&&t<=1?t:null;
}
export function vehicleBounds(c){
  const s=Math.abs(Math.sin(c.angle)),co=Math.abs(Math.cos(c.angle)),p=c.spec;
  return {x:c.x,z:c.z,w:p.width*co+p.length*s,d:p.length*co+p.width*s,h:p.height};
}
export function trafficClearance(car,obstacles){
  const fx=-Math.sin(car.angle),fz=-Math.cos(car.angle),rx=Math.cos(car.angle),rz=-Math.sin(car.angle),front=car.spec.length/2;let nearest=Infinity;
  for(const o of obstacles){
    if(o.id===car)continue;const dx=o.x-car.x,dz=o.z-car.z,along=dx*fx+dz*fz,lateral=dx*rx+dz*rz;
    const radius=o.radius??.55,halfLength=o.halfLength??radius,halfWidth=o.halfWidth??radius;
    if(along+halfLength< -front*.45)continue;
    const aheadTime=Math.max(0,Math.min(1.4,along/Math.max(3,car.speed))),futureLateral=lateral+((o.vx??0)*rx+(o.vz??0)*rz)*aheadTime;
    const crosses=lateral*futureLateral<=0,lateralDistance=crosses?0:Math.min(Math.abs(lateral),Math.abs(futureLateral));
    if(lateralDistance>car.spec.width/2+halfWidth+.35)continue;
    nearest=Math.min(nearest,Math.max(0,along-front-halfLength));
  }
  return nearest;
}
export function trafficMotion(speed,gap,dt,cruise=9){
  const target=Math.min(cruise,Math.sqrt(2*14*Math.max(0,gap-2.1)));
  const next=speed<target?Math.min(target,speed+3.8*dt):Math.max(target,speed-18*dt);
  const distance=Math.min(Math.max(0,next*dt),Math.max(0,gap-.8));
  return {speed:distance<next*dt-1e-6?0:next,distance,braking:next<speed-.01||gap<4};
}
// Bicycle steering, lateral tyre grip, inertia and swept, sub-stepped collisions.
export function stepVehicle(c,input,dt,canOccupy){
  const p=c.spec,steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;let impact=0;
  for(let i=0;i<steps;i++){
    let fx=-Math.sin(c.angle),fz=-Math.cos(c.angle),rx=Math.cos(c.angle),rz=-Math.sin(c.angle);
    let longitudinal=c.vx*fx+c.vz*fz,lateral=c.vx*rx+c.vz*rz;
    const throttle=c.health>0?input.throttle:0;
    const acceleration=throttle===0?0:Math.sign(throttle)!==Math.sign(longitudinal)&&Math.abs(longitudinal)>1.5?throttle*p.brake:throttle*p.power*(throttle<0?.65:1);
    longitudinal+=acceleration*h;longitudinal*=Math.exp(-(.11+(throttle===0?.38:0)+(input.handbrake?1.35:0))*h);
    longitudinal=clamp(longitudinal,-12,p.maxSpeed);lateral*=Math.exp(-(input.handbrake?1.05:p.grip)*h);
    c.steer+=(-input.steer*.54/(1+Math.abs(longitudinal)/28)-c.steer)*(1-Math.exp(-9*h));
    const oldAngle=c.angle;c.angle+=longitudinal/p.wheelbase*Math.tan(c.steer)*.58*h;
    if(!canOccupy(c.x,c.z,c.angle))c.angle=oldAngle;
    c.vx=fx*longitudinal+rx*lateral;c.vz=fz*longitudinal+rz*lateral;
    const nx=c.x+c.vx*h,nz=c.z+c.vz*h;
    if(canOccupy(nx,c.z,c.angle))c.x=nx;else{impact=Math.max(impact,Math.abs(c.vx));c.vx*=-.2;}
    if(canOccupy(c.x,nz,c.angle))c.z=nz;else{impact=Math.max(impact,Math.abs(c.vz));c.vz*=-.2;}
    c.roll+=(clamp(-lateral*.012+input.steer*Math.abs(longitudinal)*.002,-.13,.13)-c.roll)*(1-Math.exp(-6*h));
    c.pitch+=(clamp(acceleration*.002,-.055,.055)-c.pitch)*(1-Math.exp(-7*h));
  }
  c.speed=-c.vx*Math.sin(c.angle)-c.vz*Math.cos(c.angle);
  return impact;
}
