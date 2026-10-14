import {sanitizeMods} from './tuning.js';
export const CONTRACTS = [
  { id:'courier', title:'Особая доставка', category:'ДОСТАВКА', reward:900, description:'Забери посылку у западного гаража и доставь её в деловой квартал.', destination:{x:-96,z:52}, stages:['Забери посылку у гаража. Подойди к метке и нажми E.','Доставь посылку в деловой квартал. Нажми E у метки.'] },
  { id:'clear', title:'Тихий квартал', category:'ЗАЧИСТКА', reward:1600, description:'Четыре наёмника заняли северную площадь. Очисти район.', destination:{x:0,z:-126}, count:4 },
  { id:'data', title:'Чёрный ящик', category:'ОПЕРАЦИЯ', reward:2400, description:'Проберись к восточному складу, устрани охрану и забери накопитель.', destination:{x:118,z:67}, count:5 },
  { id:'race', title:'Последний рейс', category:'ВОЖДЕНИЕ', reward:1300, description:'Сядь в любую машину и пройди пять точек за 220 секунд: через мост в Зареченск.', destination:{x:216,z:0} }
];
export const ITEMS = {
  armor:{cost:350,label:'Бронежилет'}, heal:{cost:120,label:'Медпакет'}, rifle:{cost:1800,label:'Винтовка AR-4'},
  skin:{cost:250,label:'Костюм «Янтарь»',premium:true}
};
export function freshSave(){return {version:1,money:600,credits:500,completed:[],rifle:false,skin:false,armor:0,kills:0,earned:0,vehicles:{}};}
export function parseSave(raw){
  try { const x=JSON.parse(raw); if(!x||x.version!==1) return freshSave(); const r=freshSave();
    for(const k of ['money','credits','armor','kills','earned']) if(Number.isFinite(x[k]))r[k]=Math.max(0,Math.min(99999999,Math.floor(x[k])));
    r.armor=Math.min(100,r.armor);r.completed=[...new Set((Array.isArray(x.completed)?x.completed:[]).filter(id=>CONTRACTS.some(c=>c.id===id)))];
    r.rifle=x.rifle===true;r.skin=x.skin===true;r.vehicles=sanitizeMods(x.vehicles);return r;
  }catch{return freshSave();}
}
export function purchase(save,id,health){
  const item=ITEMS[id];if(!item)return {ok:false,message:'Товар не найден.'};
  if((id==='rifle'&&save.rifle)||(id==='skin'&&save.skin))return {ok:false,message:'Уже куплено.'};
  if(id==='armor'&&save.armor>=100)return {ok:false,message:'Броня уже полная.'};
  if(id==='heal'&&health>=100)return {ok:false,message:'Здоровье уже полное.'};
  const currency=item.premium?'credits':'money';if(save[currency]<item.cost)return {ok:false,message:'Недостаточно средств. Выполни контракт.'};
  save[currency]-=item.cost;if(id==='armor')save.armor=100;if(id==='rifle')save.rifle=true;if(id==='skin')save.skin=true;
  return {ok:true,message:`${item.label}: получено.`,health:id==='heal'?100:health};
}
export function rewardContract(save,id){
  const c=CONTRACTS.find(c=>c.id===id);if(!c)return 0;const reward=save.completed.includes(id)?Math.round(c.reward*.6):c.reward;
  save.money+=reward;save.earned+=reward;if(!save.completed.includes(id))save.completed.push(id);return reward;
}
export function segmentHitsBox(ax,az,bx,bz,b,pad=0){
  let low=0,high=1;for(const [a,d,min,max] of [[ax,bx-ax,b.x-b.w/2-pad,b.x+b.w/2+pad],[az,bz-az,b.z-b.d/2-pad,b.z+b.d/2+pad]]){
    if(Math.abs(d)<1e-8){if(a<min||a>max)return false;}else{let t1=(min-a)/d,t2=(max-a)/d;if(t1>t2)[t1,t2]=[t2,t1];low=Math.max(low,t1);high=Math.min(high,t2);if(low>high)return false;}
  }return true;
}

