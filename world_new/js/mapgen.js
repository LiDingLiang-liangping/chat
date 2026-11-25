/* ============================================================
   js/mapgen.js — 环形四环世界生成、区域判定、碰撞与境界门禁
   ============================================================ */
'use strict';

function zoneInfoAt(x,y){
  if(dist(x,y,TOWN.x,TOWN.y) < TOWN.r) return { name:'青云村', density:1.0, safe:true, ring:1, sect:null };
  if(dist(x,y,FAIR.x,FAIR.y) < FAIR.r) return { name:'青云坊市', density:1.0, safe:true, ring:1, sect:null };
  const ring = ringIndexAt(x,y);
  return { name:ring.name, density:ring.density, safe:ring.safe, ring:ring.id, sect:null };
}
function densityAt(x,y){
  const z = zoneInfoAt(x,y);
  let d = z.density;
  const s = sectSiteAt(x,y);
  if(s && s.nearPeak) d = Math.max(d, s.nearPeak.dens);
  return d;
}
function sectSiteAt(x,y){
  for(const s of worldGeo.sects){
    if(dist(x,y,s.x,s.y) < 170){
      let nearPeak = null, best = 1e9;
      for(const pk of s.peaks){
        const d = dist(x,y,pk.x,pk.y);
        if(d < 70 && d < best){ best = d; nearPeak = pk; }
      }
      return { sect:s, nearPeak };
    }
  }
  return null;
}

function generateWorld(){
  const rand = mulberry32(G.seed || 20261113);
  worldGeo.obstacles.length = 0;
  worldGeo.houses.length = 0;
  worldGeo.herbs.length = 0;
  worldGeo.decor.length = 0;
  worldGeo.ponds.length = 0;
  worldGeo.paths.length = 0;
  worldGeo.sects.length = 0;

  /* 村中建筑 */
  const houses = [
    { x:TOWN.x-96, y:TOWN.y-58, w:116, h:70, name:'客栈', color:'#6b5438' },
    { x:TOWN.x+28, y:TOWN.y-66, w:108, h:66, name:'丹房', color:'#5c4a35' },
    { x:TOWN.x-68, y:TOWN.y+50, w:124, h:72, name:'问道堂', color:'#65503a' },
    { x:TOWN.x+82, y:TOWN.y+44, w:110, h:66, name:'器阁', color:'#5a4633' },
    { x:FAIR.x-32, y:FAIR.y-18, w:140, h:80, name:'坊市', color:'#6a5638' },
    { x:FAIR.x+86, y:FAIR.y+40, w:92, h:58, name:'丹铺', color:'#5f4c34' },
  ];
  for(const h of houses){
    worldGeo.houses.push(h);
    worldGeo.obstacles.push({ type:'house', x:h.x, y:h.y, r:Math.max(h.w,h.h)*0.42, w:h.w, h:h.h });
  }

  /* 水潭 */
  worldGeo.ponds.push({ x:CX-620, y:CY-480, rx:130, ry:78, color:'#2c7f86' });
  worldGeo.ponds.push({ x:CX+780, y:CY+900, rx:150, ry:88, color:'#3b3a72' });

  /* 径向道路：由村通向四环 */
  for(let i=0;i<4;i++){
    const a = i*Math.PI/2 + 0.4;
    worldGeo.paths.push({ x1:CX, y1:CY, x2:CX+Math.cos(a)*RINGS[3].r1, y2:CY+Math.sin(a)*RINGS[3].r1 });
  }

  /* 树木：第二环密，第三环疏，第四环枯木 */
  const treePlan = [
    { ring:2, n:150, radius:[RINGS[1].r0+30, RINGS[1].r1-30], tone:'green' },
    { ring:3, n:110, radius:[RINGS[2].r0+30, RINGS[2].r1-30], tone:'green' },
    { ring:4, n:52,  radius:[RINGS[3].r0+30, RINGS[3].r1-30], tone:'dead' },
  ];
  for(const tp of treePlan){
    let placed = 0, tries = 0;
    while(placed < tp.n && tries < tp.n*14){
      tries++;
      const a = rand()*Math.PI*2, rr = tp.radius[0] + rand()*(tp.radius[1]-tp.radius[0]);
      const x = CX + Math.cos(a)*rr, y = CY + Math.sin(a)*rr;
      if(dist(x,y,TOWN.x,TOWN.y) < TOWN.r+40) continue;
      if(dist(x,y,FAIR.x,FAIR.y) < FAIR.r+30) continue;
      if(worldGeo.obstacles.some(o=>dist(x,y,o.x,o.y) < 46)) continue;
      if(sectSiteAt(x,y)) continue;
      worldGeo.obstacles.push({ type:'tree', x, y, r:15+rand()*5, s:0.8+rand()*0.55, tone:rand(), dead:tp.tone==='dead' });
      placed++;
    }
  }

  /* 山石：第三、四环 */
  for(const rp of [{ ring:3, n:46 }, { ring:4, n:64 }]){
    let placed = 0, tries = 0;
    while(placed < rp.n && tries < rp.n*14){
      tries++;
      const a = rand()*Math.PI*2, rr = (rp.ring===3?900:1560) + rand()*(rp.ring===3?350:380);
      const x = CX + Math.cos(a)*rr, y = CY + Math.sin(a)*rr;
      if(worldGeo.obstacles.some(o=>dist(x,y,o.x,o.y) < 44)) continue;
      if(sectSiteAt(x,y)) continue;
      worldGeo.obstacles.push({ type:'rock', x, y, r:15+rand()*14, s:0.8+rand()*0.9, tone:rand() });
      placed++;
    }
  }

  /* 草丛 / 芦苇 / 灯笼 */
  for(let i=0;i<760;i++){
    const a = rand()*Math.PI*2, rr = Math.sqrt(rand())*(RINGS[3].r1-20);
    const x = CX + Math.cos(a)*rr, y = CY + Math.sin(a)*rr;
    const ring = ringIndexAt(x,y).id;
    worldGeo.decor.push({ type:'grass', x, y, s:0.6+rand()*0.9, tone:rand(), zone:ring });
  }
  for(let i=0;i<70;i++){
    const p = worldGeo.ponds[i%2];
    const a = rand()*Math.PI*2, rr = rand()*0.9;
    worldGeo.decor.push({ type:'reed', x:p.x+Math.cos(a)*p.rx*rr, y:p.y+Math.sin(a)*p.ry*rr, s:0.8+rand()*0.7, tone:rand() });
  }
  for(let i=0;i<20;i++){
    const a = rand()*Math.PI*2, rr = 60+rand()*(TOWN.r-30);
    worldGeo.decor.push({ type:'lantern', x:TOWN.x+Math.cos(a)*rr, y:TOWN.y+Math.sin(a)*rr, s:0.8+rand()*0.4, tone:rand() });
  }

  /* 宗门山门与山头 */
  for(const s of SECTS){
    const x = CX + Math.cos(s.ang)*s.radius;
    const y = CY + Math.sin(s.ang)*s.radius;
    const peaks = s.peaks.map((pk,i)=>{
      const pa = s.ang + i*2.0;
      return { ...pk, x:x+Math.cos(pa)*110, y:y+Math.sin(pa)*110 };
    });
    worldGeo.sects.push({ ...s, x, y, peaks });
    worldGeo.obstacles.push({ type:'sect', x, y, r:56 });
  }

  /* 灵草：各环固定属性分布 */
  let hid = 1;
  const herbPlan = [
    { ring:2, n:42, els:['wood','wood','earth','metal'] },
    { ring:3, n:42, els:['water','fire','earth','wood','metal'] },
    { ring:4, n:40, els:['metal','fire','water','earth','thunder'] },
  ];
  for(const hp of herbPlan){
    for(let i=0;i<hp.n;i++){
      let x,y,ok=false,t=0;
      while(!ok && t<90){
        t++;
        const a = rand()*Math.PI*2;
        const rr = RINGS[hp.ring-1].r0 + 30 + Math.sqrt(rand())*(RINGS[hp.ring-1].r1 - RINGS[hp.ring-1].r0 - 60);
        x = CX + Math.cos(a)*rr; y = CY + Math.sin(a)*rr;
        ok = !worldGeo.obstacles.some(o=>dist(x,y,o.x,o.y) < o.r+20);
      }
      if(!ok) continue;
      const el = hp.els[Math.floor(rand()*hp.els.length)];
      worldGeo.herbs.push({ id:'h'+(hid++), x, y, el, alive:true, respawnAt:0, phase:rand()*6.28 });
    }
  }
  /* 世界重建：让障碍网格与地面缓存失效 */
  invalidateWorldCaches();
}

/* ---------------- 碰撞 ---------------- */
/* 障碍物网格索引：避免每次碰撞都遍历全部障碍（原来 400+ 个） */
let obsGrid = null; var obsGridCell = 220, obsGridN = 1, obsGridMaxR = 0;
var groundCache = null, groundDirty = true;
function invalidateWorldCaches(){ obsGrid = null; groundCache = null; groundDirty = true; }
/* 妖兽碰撞隔帧：每两帧精算一次，另一帧只做边界钳制（妖兽由客户端插值渲染，抖动不可见） */
var mobCollideTick = 0;
function mobResolve(nx,ny,r){
  mobCollideTick++;
  if(mobCollideTick % 2) return resolveCollision(nx,ny,r);
  return { x:clamp(nx,r+10,WORLD.w-r-10), y:clamp(ny,r+10,WORLD.h-r-10) };
}
function buildObsGrid(){
  obsGridCell = 220;
  obsGridN = Math.ceil(WORLD.w/obsGridCell) + 1;
  obsGrid = new Map();
  obsGridMaxR = 0;
  for(const o of worldGeo.obstacles){
    const rr = o.type==='house' ? Math.max(o.w,o.h)/2 : (o.r||0);
    if(rr > obsGridMaxR) obsGridMaxR = rr;
    const cx = Math.floor(o.x/obsGridCell), cy = Math.floor(o.y/obsGridCell);
    const key = cy*obsGridN + cx;
    let arr = obsGrid.get(key);
    if(!arr){ arr = []; obsGrid.set(key, arr); }
    arr.push(o);
  }
}
function collideOne(o, x, y, r){
  if(o.type==='house'){
    const hx = o.w/2 + r, hy = o.h/2 + r;
    const dx = x - o.x, dy = y - o.y;
    if(Math.abs(dx) < hx && Math.abs(dy) < hy){
      const ox = hx - Math.abs(dx), oy = hy - Math.abs(dy);
      if(ox < oy) x = o.x + (dx<0?-1:1)*hx;
      else y = o.y + (dy<0?-1:1)*hy;
    }
  }else{
    const d = dist(x,y,o.x,o.y);
    const min = r + o.r;
    if(d < min && d > 0.0001){
      const k = (min-d)/d;
      x += (x-o.x)*k;
      y += (y-o.y)*k;
    }
  }
  return [x,y];
}
function resolveCollision(x,y,r){
  x = clamp(x, r+10, WORLD.w-r-10);
  y = clamp(y, r+10, WORLD.h-r-10);
  if(!obsGrid) buildObsGrid();
  const reach = r + obsGridMaxR + 2;
  const c0x = Math.floor((x-reach)/obsGridCell), c1x = Math.floor((x+reach)/obsGridCell);
  const c0y = Math.floor((y-reach)/obsGridCell), c1y = Math.floor((y+reach)/obsGridCell);
  for(let cy=c0y; cy<=c1y; cy++){
    for(let cx=c0x; cx<=c1x; cx++){
      const arr = obsGrid.get(cy*obsGridN + cx);
      if(!arr) continue;
      for(let i=0;i<arr.length;i++){
        const res = collideOne(arr[i], x, y, r);
        x = res[0]; y = res[1];
      }
    }
  }
  return { x:clamp(x,r+10,WORLD.w-r-10), y:clamp(y,r+10,WORLD.h-r-10) };
}

/* 境界门禁：低阶不能进入第三、四环 */
function gatePos(x,y,realm){
  const max = maxRadiusFor(realm);
  const d = dist(x,y,CX,CY);
  if(d > max){
    const k = max/d;
    return { x:CX+(x-CX)*k, y:CY+(y-CY)*k };
  }
  return { x,y };
}
function canEnterRing(realm, ringId){
  return tierOf(realm) >= RINGS[ringId-1].tier;
}

/* 秘境竞技场边界 */
function arenaClamp(x,y,r){
  const d = dist(x,y,ARENA.cx,ARENA.cy);
  const max = ARENA.r - r - 6;
  if(d > max && d > 0.001){
    const k = max/d;
    return { x:ARENA.cx+(x-ARENA.cx)*k, y:ARENA.cy+(y-ARENA.cy)*k };
  }
  return { x, y };
}

