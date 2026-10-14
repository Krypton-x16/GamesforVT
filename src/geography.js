export const CITY_SIZE=780,CITY_LIMIT=390,CITY_OFFSET=1008;
export const BOUNDS={minX:-390,maxX:1398,minZ:-390,maxZ:390};
export const RIVER={minX:390,maxX:618,bridgeZ:0,halfDeck:11.7};
export const WORLD_WIDTH=BOUNDS.maxX-BOUNDS.minX,WORLD_DEPTH=780;
export function onLand(x,z,r=0){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<BOUNDS.minX+r||x>BOUNDS.maxX-r||z<BOUNDS.minZ+r||z>BOUNDS.maxZ-r)return false;
  if(x>RIVER.minX-r&&x<RIVER.maxX+r)return Math.abs(z-RIVER.bridgeZ)<=RIVER.halfDeck-r;
  return true;
}
export function trafficBounds(car){
  if(Math.abs(car.z)<8)return BOUNDS;
  const offset=car.x>RIVER.maxX?CITY_OFFSET:0;
  return {minX:offset-CITY_LIMIT,maxX:offset+CITY_LIMIT,minZ:-CITY_LIMIT,maxZ:CITY_LIMIT};
}
export function districtAt(x,z){if(x>RIVER.minX&&x<RIVER.maxX)return 'МОСТ ДРУЖБЫ';if(x>=RIVER.maxX)return 'ЗАРЕЧЕНСК';if(x< -216&&z>216)return 'АВТОДРОМ';return 'НОВЫЙ БЕРЕГ';}
