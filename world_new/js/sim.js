/* ============================================================
   js/sim.js — 房主权威模拟：玩家、妖兽、战斗、五行、煞气雷劫、
              秘境、宗门、草药、掉落与事件表现
   ============================================================ */
'use strict';

/* ---------------- 玩家 ---------------- */
function activeEl(p){ return (p.root && p.root[p.activeRoot||0]) || 'earth'; }

function makePlayer(id,name,x,y,opt){
  opt = opt || {};
  const info = realmInfo(0);
  return {
    id, name,
    gender: opt.gender || 'male',
    root: (opt.root && opt.root.length) ? opt.root.slice(0,2) : ['fire'],
    activeRoot: 0,
    control: opt.control || 'classic',
    ff: opt.ff !== undefined ? !!opt.ff : false,
    x, y, dir:1, mx:0, my:0,
    hp:info.maxHp, maxHp:info.maxHp,
    mp:info.maxMp, maxMp:info.maxMp,
    shield:0, shieldUntil:0,
    realm:0, realmName:info.name,
    exp:0, expMax:info.need,
    atk:info.atk, def:info.def,
    stones:30,
    herbInv:{ metal:0, wood:0, water:0, fire:0, earth:0, thunder:0 },
    pillsHeal:1, pillsExp:0,
    kills:0, gathered:0, deaths:0,
    grudge:0, devil:false, rage:false, trib:null,
    devilUntil:0, devilCause:null,
    deathCause:null, preset:null, lock:{}, expRate:1,
    sect:null, sectPeak:-1, trialCd:0,
    secret:{},
    shards:0, arts:[], art:null,
    ach:[], title:'',
    bossKills:0, sparWins:0, encounters:0,
    sparWith:null, sparUntil:0, sparInvite:null, sparInviteAt:0,
    masterId:null, masterName:'', apprenticeId:null, apprenticeName:'',
    mentorInvite:null, mentorInviteAt:0,
    meditating:false, dead:false, respawnAt:0,
    cd:{}, aim:0, attacking:0,
    inp:null, lastCombat:0,
    renderX:x, renderY:y, fullNotified:false,
    area:'world', secretEl:null, secretReturn:null,
    enterCd:0,
  };
}

function recalcPlayer(p){
  const info = realmInfo(p.realm);
  let hpB=0, mpB=0, atkB=0, defB=0;
  if(p.sect && SECT_BY_ID[p.sect]){
    hpB = SECT_BY_ID[p.sect].hpBonus||0;
    mpB = SECT_BY_ID[p.sect].mpBonus||0;
    atkB = SECT_BY_ID[p.sect].atkBonus||0;
  }
  const cp = CHEAT_PRESETS[p.preset];
  if(cp){ hpB+=cp.hp; mpB+=cp.mp; atkB+=cp.atk; defB+=cp.def; p.expRate=cp.expRate; }
  else p.expRate = 1;
  const artD = p.art ? ART_BY_ID[p.art] : null;
  if(artD){ hpB += artD.hp||0; atkB += artD.atk||0; }
  // 师徒：徒弟修为 +10%，师父气血上限 +5%
  if(p.masterId && p.masterId !== p.id) p.expRate *= 1.1;
  if(p.apprenticeId && p.apprenticeId !== p.id) hpB += 0.05;
  p.realmName = info.name;
  p.maxHp = Math.round(info.maxHp*(1+hpB));
  p.maxMp = Math.round(info.maxMp*(1+mpB));
  p.atk = Math.round(info.atk*(1+atkB));
  p.def = Math.round(info.def*(1+defB));
  p.expMax = info.need;
  p.hp = Math.min(p.hp, p.maxHp);
  p.mp = Math.min(p.mp, p.maxMp);
}

function getSelf(){ return world.players.get(G.selfId) || null; }

/* ---------------- 世界初始化 ---------------- */
function spawnMobs(){
  mobSeq = 0;
  world.mobs.clear();

  // 各环特色小怪（固定环位、随机极角，属于该环固定生态）
  for(const plan of RING_SPAWNS){
    const cfg = MOB_TYPES[plan.type];
    const ring = RINGS[plan.ring-1];
    for(let i=0;i<plan.count;i++){
      let x=0,y=0,ok=false,t=0;
      while(!ok && t<80){
        t++;
        const a = Math.random()*Math.PI*2;
        const rr = ring.r0 + 40 + Math.sqrt(Math.random())*(ring.r1-ring.r0-90)*plan.spread;
        x = CX + Math.cos(a)*rr;
        y = CY + Math.sin(a)*rr;
        ok = !worldGeo.obstacles.some(o=>dist(x,y,o.x,o.y) < o.r+cfg.r+16);
      }
      if(!ok) continue;
      addMob(plan.type,x,y,'world',null);
    }
  }

  // BOSS
  for(const b of RING_BOSSES){
    const cfg = MOB_TYPES[b.type];
    let x = CX + Math.cos(b.ang)*b.dist;
    let y = CY + Math.sin(b.ang)*b.dist;
    const r = resolveCollision(x,y,cfg.r);
    addMob(b.type,r.x,r.y,'world',null);
  }

  // 秘境 BOSS
  for(const el of EL_LIST){
    addMob(SECRET_MOB[el], ARENA.cx, ARENA.cy-120, 'secret', el);
  }
}

function addMob(type,x,y,area,secretEl){
  const cfg = MOB_TYPES[type];
  const mo = {
    id:'m'+(++mobSeq), type,
    x, y, homeX:x, homeY:y,
    hp:cfg.hp, maxHp:cfg.hp,
    dir:1, state:'idle', attackCd:0, patrolT:0,
    tx:x, ty:y, respawnAt:0, renderX:x, renderY:y,
    area:area||'world', secretEl:secretEl||null,
  };
  world.mobs.set(mo.id, mo);
  return mo;
}

function initItems(){
  itemSeq = 0;
  world.items.clear();
  for(const el of EL_LIST){
    for(let i=0;i<4;i++){
      const kind = SECRET_ITEM_KINDS[Math.floor(Math.random()*SECRET_ITEM_KINDS.length)];
      const a = Math.random()*Math.PI*2, rr = 60+Math.random()*230;
      const it = {
        id:'i'+(++itemSeq), el, kind:kind.kind, name:kind.name, color:kind.color,
        x:ARENA.cx+Math.cos(a)*rr, y:ARENA.cy+Math.sin(a)*rr*0.78,
        alive:true, respawnAt:0, phase:Math.random()*6.28,
      };
      world.items.set(it.id,it);
    }
  }
}

/* 传送门落点校验：不能压在水潭、房屋、树木岩石、山门，也要离其他传送门足够远 */
function portalSpotOk(x, y, others, minGap){
  if(x < 240 || y < 240 || x > WORLD.w-240 || y > WORLD.h-240) return false;
  if(dist(x, y, TOWN.x, TOWN.y) < TOWN.r + 260) return false;
  for(const p of worldGeo.ponds){
    const dx = (x-p.x)/(p.rx+90), dy = (y-p.y)/(p.ry+90);
    if(dx*dx + dy*dy < 1) return false;
  }
  for(const o of worldGeo.obstacles){
    if(o.type === 'house'){
      if(Math.abs(x-o.x) < o.w/2+70 && Math.abs(y-o.y) < o.h/2+70) return false;
    }else if(dist(x, y, o.x, o.y) < (o.r||0) + 100){   // 100 留量：取整后也不会蹭到树石
      return false;
    }
  }
  for(const s2 of worldGeo.sects){
    if(dist(x, y, s2.x, s2.y) < 300) return false;
  }
  for(const pt of others){
    if(dist(x, y, pt.x, pt.y) < minGap) return false;
  }
  return true;
}

/* 换位：方位角全随机，而不是原来的「五等分扇区 + 小幅抖动」 */
function relocatePortals(){
  const els = EL_LIST.slice();
  const band = RINGS[3];
  const rMin = band.r0 + 200;              // 1680
  const rSpan = band.r1 - band.r0 - 460;   // 1690 上界，留出外环边缘
  const out = [];
  for(let i = 0; i < els.length; i++){
    let x = CX, y = CY, ok = false;
    for(let k = 0; k < 80; k++){
      const a = Math.random() * Math.PI * 2;
      const r = rMin + Math.random() * rSpan;
      const px = CX + Math.cos(a) * r;
      const py = CY + Math.sin(a) * r;
      if(portalSpotOk(px, py, out, 520)){ x = px; y = py; ok = true; break; }
    }
    if(!ok){                                // 罕见兜底：放宽间距
      for(let k = 0; k < 60; k++){
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * rSpan;
        const px = CX + Math.cos(a) * r;
        const py = CY + Math.sin(a) * r;
        if(portalSpotOk(px, py, out, 260)){ x = px; y = py; ok = true; break; }
      }
    }
    if(!ok){                                // 再兜底：只保证不压障碍
      for(let k = 0; k < 120; k++){
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * rSpan;
        const px = CX + Math.cos(a) * r;
        const py = CY + Math.sin(a) * r;
        if(portalSpotOk(px, py, out, 0)){ x = px; y = py; ok = true; break; }
      }
    }
    if(!ok){                                // 最后兜底：贴环带随机放，绝不重叠
      const a = Math.random() * Math.PI * 2;
      x = CX + Math.cos(a) * (band.r0 + 260);
      y = CY + Math.sin(a) * (band.r0 + 260);
    }
    out.push({ el: els[i], x: Math.round(x), y: Math.round(y) });
  }
  worldGeo.portals = out;
  G.portals = out;
}

function initHostWorld(){
  generateWorld();
  world.players.clear();
  world.projectiles.clear();
  world.herbs.clear();
  for(const h of worldGeo.herbs) world.herbs.set(h.id, { ...h });
  spawnMobs();
  initItems();
  relocatePortals();
  nextPortalAt = Date.now() + portalNextDelay();
  nextEncAt = Date.now() + 30000 + Math.random()*45000;
  world.npcs.clear();
  addPlayer('host', G.playerName, { gender:G.gender, root:[G.root], control:G.control, ff:G.ff }, true);
}

function addPlayer(id, name, opt, isHostPlayer){
  const x = TOWN.x + (Math.random()-0.5)*120;
  const y = TOWN.y + 60 + (Math.random()-0.5)*70;
  const r = resolveCollision(x,y,14);
  const p = makePlayer(id, name, r.x, r.y, opt);
  // 1% 天成双灵根
  if(p.root.length === 1 && Math.random() < 0.01){
    const pool = EL_LIST.filter(e=>e!==p.root[0]);
    p.root.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  world.players.set(id, p);
  if(isHostPlayer){
    G.selfId = id;
    G.pred = { x:r.x, y:r.y };
  }
  return p;
}

/* ---------------- 房主 Tick ---------------- */
/* ---------------- 固定步长调度 ----------------
   逻辑永远按 TICK_MS(33ms) 一步推进，与渲染帧率完全解耦：
   渲染掉到 20fps 也不会变慢，渲染冲到 120fps 也不会变快。
   落后时在一帧内补步（最多 3 步），仍然跟不上就丢弃积压，避免螺旋卡死。 */
const SIM_STEP_MS = TICK_MS;
let simAcc = 0, simLast = 0, simStarted = false;
let simStepsRun = 0;

function simLoop(ts){
  requestAnimationFrame(simLoop);
  if(!G.isHost || G.mode!=='playing'){ simLast = ts; simAcc = 0; return; }
  if(!simLast) simLast = ts;
  let delta = ts - simLast;
  simLast = ts;
  if(delta > 250) delta = 250;          // 切标签页回来不补一大堆
  simAcc += delta;
  let steps = 0;
  while(simAcc >= SIM_STEP_MS && steps < 3){
    hostTick();
    simAcc -= SIM_STEP_MS;
    steps++; simStepsRun++;
  }
  if(steps >= 3 && simAcc > SIM_STEP_MS) simAcc = 0;   // 追不上就丢弃积压
}

function startSimLoop(){
  if(simStarted) return;
  simStarted = true;
  simLast = 0; simAcc = 0;
  requestAnimationFrame(simLoop);
  // 后台标签页 rAF 会停，这里兜底由定时器推进，联机不至于卡死
  setInterval(()=>{ if(document.hidden) hostTick(); }, TICK_MS);
}

function hostTick(){
  if(!G.isHost || G.mode!=='playing') return;
  const dt = TICK_MS/1000;
  const tnow = Date.now();

  // 秘境传送门换位：间隔 30–60 秒随机，方位全随机
  if(tnow >= nextPortalAt){
    relocatePortals();
    nextPortalAt = tnow + portalNextDelay();
    emit({ e:'portalMove' });
  }

  // 成就判定（每秒一次即可）
  if(tnow - lastAchAt > 1200){
    lastAchAt = tnow;
    for(const p of world.players.values()) checkAch(p);
  }

  // 切磋：超时 / 距离过远 / 对手离场
  for(const p of world.players.values()){
    if(!p.sparWith) continue;
    const o = world.players.get(p.sparWith);
    if(!o || o.dead || o.sparWith !== p.id){ p.sparWith = null; continue; }
    if(tnow >= p.sparUntil){
      const win = (p.hp/p.maxHp) >= (o.hp/o.maxHp) ? p.id : o.id;
      endSpar(p, win, 'time');
      emit({e:'sys', text:'切磋时限到，点到为止', id:p.id});
      emit({e:'sys', text:'切磋时限到，点到为止', id:o.id});
    }else if(dist(p.x,p.y,o.x,o.y) > 700){
      endSpar(p, null, 'far');
      emit({e:'sys', text:'相距太远，切磋作罢', id:p.id});
      emit({e:'sys', text:'相距太远，切磋作罢', id:o.id});
    }
  }

  // 随机奇遇：40–80 秒刷一位，30 秒未遇自散
  if(tnow >= nextEncAt){
    nextEncAt = tnow + 40000 + Math.random()*40000;
    spawnEncounter();
  }
  for(const n of world.npcs.values()){
    if(tnow - n.born > 35000){ world.npcs.delete(n.id); continue; }
    for(const p of world.players.values()){
      if(p.dead || p.area !== 'world') continue;
      if(dist(p.x, p.y, n.x, n.y) < 48){ encounterReward(p, n); break; }
    }
  }

  /* ---- 玩家 ---- */
  for(const p of world.players.values()){
    if(p.dead){
      if(tnow >= p.respawnAt){
        // 死亡降级：雷劫降 5 级，正常陨落降 2 级
        const drop = p.deathCause==='trib' ? 5 : 2;
        if(drop > 0 && p.realm > 0){
          const before = p.realm;
          p.realm = Math.max(0, p.realm - drop);
          if(p.realm !== before){
            recalcPlayer(p);
            p.exp = 0;
            emit({e:'sys', text:`魂魄归位，境界跌落 ${before-p.realm} 级`, id:p.id});
          }
        }
        const r = resolveCollision(TOWN.x + (Math.random()-0.5)*100, TOWN.y+60, 14);
        p.x=r.x; p.y=r.y; p.hp=p.maxHp; p.mp=p.maxMp; p.dead=false; p.meditating=false;
        p.cd={}; p.area='world'; p.secretEl=null; p.shield=0; p.devil=p.devil; p.deathCause=null;
        emit({e:'respawn', x:p.x, y:p.y, name:p.name, id:p.id});
      }
      continue;
    }

    /* 雷劫：开始时按来源掷骰 —— 自然煞气 99% 死 / 1% 成魔；雷草 70% 死 / 30% 成魔 */
    if(p.trib){
      if(tnow >= p.trib.next){
        p.trib.next = tnow + 640;
        p.trib.hit++;
        const dmg = p.trib.fatal
          ? Math.round(p.maxHp*0.16)+25
          : Math.round(p.maxHp*0.08)+12;
        p.hp -= dmg;
        emit({e:'tribhit', x:p.x, y:p.y-10, dmg, id:p.id, left:Math.max(0,p.trib.total-p.trib.hit)});
        if(p.hp <= 0){
          p.hp = 0; p.trib = null;
          killPlayerSelf(p, '天雷焚身', 'trib');
          continue;
        }
      }
      if(p.trib && tnow >= p.trib.end){
        const fatal = !!p.trib.fatal;
        const cause = p.trib.cause;
        p.trib = null;
        if(fatal){
          p.hp = 0;
          killPlayerSelf(p, '天雷焚身', 'trib');
          continue;
        }
        makeDevil(p, cause);
      }
    }

    /* 成魔时限：自然煞气成魔 60 秒后陨落；雷草成魔 120 秒后退回凡人 */
    if(p.devil && p.devilUntil && tnow >= p.devilUntil){
      if(p.devilCause === 'herb'){
        p.devil = false; p.rage = false; p.grudge = 0; p.shield = 0;
        p.devilUntil = 0;
        emit({e:'devilEnd', x:p.x, y:p.y, name:p.name, id:p.id});
      }else{
        p.devil = false; p.rage = false; p.devilUntil = 0;
        p.hp = 0;
        killPlayerSelf(p, '魔道焚身', 'normal');
        continue;
      }
    }

    const inp = p.inp || {};
    let vx = Number(inp.ax)||0, vy = Number(inp.ay)||0;
    if(Math.abs(vx)<0.05 && Math.abs(vy)<0.05){
      if(inp.left) vx -= 1;
      if(inp.right) vx += 1;
      if(inp.up) vy -= 1;
      if(inp.down) vy += 1;
    }
    const len = Math.hypot(vx,vy);
    if(len>1){ vx/=len; vy/=len; }
    const moving = len>0.08;
    if(moving) p.meditating = false;
    if(inp.med && !moving) p.meditating = true;
    if(!inp.med && !moving && p.meditating && tnow-p.lastCombat>2500) p.meditating = true;

    const speed = SPEED * (p.devil && p.rage ? 1.3 : 1) * (p.art==='boots' ? 1.08 : 1);
    if(moving){
      let nx = p.x + vx*speed*dt, ny = p.y + vy*speed*dt;
      if(p.area==='secret'){
        const a = arenaClamp(nx,ny,14); p.x=a.x; p.y=a.y;
      }else{
        const g = gatePos(nx,ny,p.realm);
        const r = resolveCollision(g.x,g.y,14);
        p.x=r.x; p.y=r.y;
      }
      p.dir = vx<0 ? -1 : 1;
    }
    p.mx = vx; p.my = vy;
    p.aim = Number(inp.aim)||0;
    p.attacking = Math.max(0, p.attacking-dt);
    for(const k in p.cd) p.cd[k] = Math.max(0, p.cd[k]-dt);
    if(p.shieldUntil && tnow > p.shieldUntil){ p.shield = 0; p.shieldUntil = 0; }

    // 煞气缓慢消散
    if(p.grudge > 0) p.grudge = Math.max(0, p.grudge - 0.55*dt);

    if(p.area==='secret'){
      // 奇珍异宝
      for(const it of world.items.values()){
        if(!it.alive || it.el!==p.secretEl) continue;
        if(dist(p.x,p.y,it.x,it.y) < 30){
          it.alive = false; it.respawnAt = tnow + 45000;
          if(it.kind==='hp'){ const v=Math.round(p.maxHp*0.4); p.hp=Math.min(p.maxHp,p.hp+v); emit({e:'item',x:it.x,y:it.y,text:'+'+v+' 气血',color:'#e06b5a',id:p.id}); }
          else if(it.kind==='mp'){ const v=Math.round(p.maxMp*0.6); p.mp=Math.min(p.maxMp,p.mp+v); emit({e:'item',x:it.x,y:it.y,text:'+'+v+' 灵力',color:'#69c7e8',id:p.id}); }
          else if(it.kind==='exp'){ const v=Math.round(320*(p.expRate||1)); p.exp=Math.min(p.expMax,p.exp+v); emit({e:'item',x:it.x,y:it.y,text:'+'+v+' 修为',color:'#e8cf8a',id:p.id}); }
          else { p.stones += 60; emit({e:'item',x:it.x,y:it.y,text:'+60 灵石',color:'#b9c7c0',id:p.id}); }
        }
      }
      // 归途
      if(tnow > p.enterCd && dist(p.x,p.y,ARENA.back.x,ARENA.back.y) < 54){
        p.area = 'world';
        const back = p.secretReturn || {x:TOWN.x, y:TOWN.y+40};
        p.x = back.x; p.y = back.y; p.secretEl = null;
        p.enterCd = tnow + 1200;
        emit({e:'leaveSecret', x:p.x, y:p.y, name:p.name, id:p.id});
      }
    }else{
      // 踏入秘境
      if(tnow > p.enterCd){
        for(const pt of G.portals){
          if(dist(p.x,p.y,pt.x,pt.y) < 56){
            p.secretReturn = { x:p.x, y:p.y };
            p.area = 'secret'; p.secretEl = pt.el;
            p.x = ARENA.entry.x; p.y = ARENA.entry.y;
            p.meditating = false; p.enterCd = tnow + 1400;
            emit({e:'enterSecret', x:p.x, y:p.y, name:p.name, id:p.id, el:pt.el});
            break;
          }
        }
      }
    }

    // 灵气 / 修行
    if(p.area==='secret'){
      if(p.meditating){ p.exp = Math.min(p.expMax, p.exp + 2.4*(p.expRate||1)*dt); }
      p.hp = Math.min(p.maxHp, p.hp + 0.9*dt);
      p.mp = Math.min(p.maxMp, p.mp + 2.2*dt);
    }else{
      const z = zoneInfoAt(p.x,p.y);
      const dens = densityAt(p.x,p.y) || z.density;
      if(p.meditating){
        p.exp = Math.min(p.expMax, p.exp + 2.6*dens*(p.expRate||1)*dt);
        p.hp = Math.min(p.maxHp, p.hp + 3.2*dt);
        p.mp = Math.min(p.maxMp, p.mp + 3.8*dt);
      }else{
        p.hp = Math.min(p.maxHp, p.hp + 0.45*dt);
        p.mp = Math.min(p.maxMp, p.mp + 1.4*dt);
      }
    }
    if(p.exp >= p.expMax && !p.fullNotified){
      p.fullNotified = true;
      emit({e:'full', x:p.x, y:p.y, id:p.id, name:p.name});
    }
    if(p.exp < p.expMax) p.fullNotified = false;

    // 内置挂：锁定项冻结在锁定瞬间的值
    if(p.lock){
      const lv = p.lockVal || {};
      if(p.lock.hp) p.hp = clamp(lv.hp||p.maxHp, 0, p.maxHp);
      if(p.lock.mp) p.mp = clamp(lv.mp||p.maxMp, 0, p.maxMp);
      if(p.lock.exp) p.exp = clamp(lv.exp||0, 0, p.expMax);
      if(p.lock.grudge) p.grudge = clamp(lv.grudge||0, 0, 130);
    }
  }

  /* ---- 妖兽 ---- */
  for(const m of world.mobs.values()){
    const cfg = MOB_TYPES[m.type];
    if(!cfg) continue;
    if(m.hp <= 0){
      if(tnow >= m.respawnAt){
        m.hp = m.maxHp;
        m.x = m.homeX; m.y = m.homeY;
        m.state='idle'; m.attackCd=0;
      }
      continue;
    }
    m.attackCd = Math.max(0, m.attackCd - dt);

    let target=null, bd=1e9;
    for(const p of world.players.values()){
      if(p.dead) continue;
      if(m.area==='secret'){
        if(p.area!=='secret' || p.secretEl!==m.secretEl) continue;
      }else{
        if(p.area==='secret') continue;
        const z = zoneInfoAt(p.x,p.y);
        if(z.safe) continue;
      }
      const d = dist(m.x,m.y,p.x,p.y);
      if(d < cfg.aggro && d < bd){ bd=d; target=p; }
    }

    const homeDist = dist(m.x,m.y,m.homeX,m.homeY);
    if(homeDist > 720){ target = null; m.state='return'; }

    if(target){
      m.state='chase';
      m.dir = target.x < m.x ? -1 : 1;
      if(bd > cfg.range){
        const ang = Math.atan2(target.y-m.y, target.x-m.x);
        const nx = m.x + Math.cos(ang)*cfg.speed*dt, ny = m.y + Math.sin(ang)*cfg.speed*dt;
        if(m.area==='secret'){ const a=arenaClamp(nx,ny,cfg.r*0.7); m.x=a.x; m.y=a.y; }
        else { const r=mobResolve(nx,ny,cfg.r*0.7); m.x=r.x; m.y=r.y; }
      }else if(m.attackCd <= 0){
        m.attackCd = cfg.cd;
        mobHitPlayer(m, cfg, target);
      }
    }else if(m.state==='return' || homeDist > 40){
      const ang = Math.atan2(m.homeY-m.y, m.homeX-m.x);
      const nx = m.x + Math.cos(ang)*cfg.speed*0.8*dt, ny = m.y + Math.sin(ang)*cfg.speed*0.8*dt;
      if(m.area==='secret'){ const a=arenaClamp(nx,ny,cfg.r*0.7); m.x=a.x; m.y=a.y; }
      else { const r=mobResolve(nx,ny,cfg.r*0.7); m.x=r.x; m.y=r.y; }
      m.state='return';
    }else{
      m.state='idle';
      m.patrolT -= dt;
      if(m.patrolT <= 0){
        m.patrolT = 2.5 + Math.random()*3.5;
        m.tx = m.homeX + (Math.random()-0.5)*130;
        m.ty = m.homeY + (Math.random()-0.5)*130;
      }
      const d = dist(m.x,m.y,m.tx,m.ty);
      if(d > 12){
        const ang = Math.atan2(m.ty-m.y, m.tx-m.x);
        const nx = m.x + Math.cos(ang)*cfg.speed*0.32*dt, ny = m.y + Math.sin(ang)*cfg.speed*0.32*dt;
        if(m.area==='secret'){ const a=arenaClamp(nx,ny,cfg.r*0.7); m.x=a.x; m.y=a.y; }
        else { const r=mobResolve(nx,ny,cfg.r*0.7); m.x=r.x; m.y=r.y; }
        m.dir = Math.cos(ang) < 0 ? -1 : 1;
      }
    }
  }

  /* ---- 弹道 ---- */
  for(const [pid, pr] of [...world.projectiles]){
    pr.x += pr.vx*dt; pr.y += pr.vy*dt;
    pr.life -= dt;
    let hitSomething = false;

    if(pr.area==='secret' && dist(pr.x,pr.y,ARENA.cx,ARENA.cy) > ARENA.r) hitSomething = true;

    if(!hitSomething){
      for(const m of world.mobs.values()){
        if(m.hp<=0) continue;
        if(m.area!==pr.area) continue;
        if(pr.area==='secret' && m.secretEl!==pr.secretEl) continue;
        const cfg = MOB_TYPES[m.type];
        if(dist(pr.x,pr.y,m.x,m.y) < pr.radius + cfg.r*0.85){
          if(pr.hitIds.indexOf(m.id)>=0) continue;
          pr.hitIds.push(m.id);
          damageMob(m, pr.dmg, pr.owner, pr.el, pr.crit);
          if(pr.pierce > 0){ pr.pierce--; }
          else { hitSomething = true; }
          break;
        }
      }
    }
    if(!hitSomething){
      for(const p of world.players.values()){
        if(p.id===pr.owner || p.dead) continue;
        if(p.area!==pr.area) continue;
        if(pr.area==='secret' && p.secretEl!==pr.secretEl) continue;
        if(pr.hitIds.indexOf(p.id)>=0) continue;
        if(dist(pr.x,pr.y,p.x,p.y) < pr.radius + 13){
          pr.hitIds.push(p.id);
          damagePlayer(p, pr.dmg, pr.owner, pr.el);
          emit({e:'pvpcast', x:pr.x, y:pr.y});
          if(pr.pierce > 0){ pr.pierce--; }
          else { hitSomething = true; }
          break;
        }
      }
    }

    if(hitSomething || pr.life <= 0){
      if(pr.type==='aoeBoom') explodeAt(pr.x,pr.y,pr.aoe,pr.dmg,pr.owner,pr.el);
      world.projectiles.delete(pid);
    }
  }

  /* ---- 灵草重生 ---- */
  for(const h of world.herbs.values()){
    if(!h.alive && tnow >= h.respawnAt){
      h.alive = true;
      herbChanges.push({ id:h.id, alive:true });
    }
  }
  /* ---- 奇珍重生 ---- */
  for(const it of world.items.values()){
    if(!it.alive && tnow >= it.respawnAt){
      it.alive = true;
      it.el = EL_LIST[Math.floor(Math.random()*EL_LIST.length)];
      const kind = SECRET_ITEM_KINDS[Math.floor(Math.random()*SECRET_ITEM_KINDS.length)];
      it.kind = kind.kind; it.name = kind.name; it.color = kind.color;
    }
  }
}

/* ---------------- 妖兽攻击玩家 ---------------- */
function mobHitPlayer(m, cfg, target){
  const em = elemMult(cfg.el, activeEl(target));
  let dmg = cfg.atk*em - target.def*0.5;
  dmg = Math.max(1, Math.round(dmg));
  if(target.shield > 0){
    const absorb = Math.min(target.shield, dmg);
    target.shield -= absorb; dmg -= absorb;
    emit({e:'shield', x:target.x, y:target.y, val:absorb});
  }
  if(dmg <= 0) return;
  if(target.lock && target.lock.hp) return;
  target.hp -= dmg;
  target.lastCombat = Date.now();
  target.meditating = false;
  emit({e:'mobhit', x:target.x, y:target.y-16, dmg, id:target.id, name:cfg.name});
  if(target.hp <= 0){
    target.hp = 0;
    killPlayerSelf(target, cfg.name);
  }
}

function killPlayerSelf(p, byName, cause){
  p.dead = true;
  p.deathCause = cause || 'normal';
  p.respawnAt = Date.now() + 5000;
  p.exp = Math.floor(p.exp*0.9);
  p.deaths++;
  p.grudge = Math.floor(p.grudge*0.5);
  p.meditating = false;
  p.trib = null;
  emit({e:'death', x:p.x, y:p.y, id:p.id, name:p.name, by:byName||''});
}

/* ---------------- 战斗：妖兽 ---------------- */
function damageMob(m, dmg, ownerId, el, crit){
  if(m.hp<=0) return;
  const cfg = MOB_TYPES[m.type];
  const em = elemMult(el, cfg.el);
  const isCrit = crit !== undefined ? crit : Math.random()<0.12;
  const real = Math.max(1, Math.round(dmg*em*(isCrit?1.7:1) - cfg.def*0.6));
  m.hp -= real;
  emit({e:'hit', x:m.x, y:m.y-12, dmg:real, crit:isCrit, vuln:em>1.1, resist:em<0.9, target:'mob'});
  if(m.hp <= 0) killMob(m, ownerId);
}

function killMob(m, ownerId){
  if(m.hp > 0) return;
  const cfg = MOB_TYPES[m.type];
  m.hp = 0;
  m.respawnAt = Date.now() + (cfg.boss ? 60000 : 15000);
  const p = world.players.get(ownerId);
  if(p){
    p.kills++;
    p.exp = Math.min(p.expMax, p.exp + Math.round(cfg.exp*(p.expRate||1)));
    const stones = randInt(cfg.stones[0], cfg.stones[1]);
    p.stones += stones;
    if(Math.random() < (cfg.boss ? 1 : 0.24)){
      const dropEl = cfg.el;
      p.herbInv[dropEl] = (p.herbInv[dropEl]||0) + (cfg.boss?3:1);
      if(Math.random()<0.3) p.herbInv.thunder = (p.herbInv.thunder||0)+1;
    }
    // 法宝碎片：BOSS 必掉 3，精英小怪 6% 掉 1
    if(cfg.boss){
      p.bossKills = (p.bossKills||0) + 1;
      p.shards = (p.shards||0) + 3;
      emit({e:'item', x:m.x, y:m.y-18, text:'+3 法宝碎片', color:'#e8cf8a', id:p.id});
    }else if(Math.random() < 0.06){
      p.shards = (p.shards||0) + 1;
      emit({e:'item', x:m.x, y:m.y-18, text:'+1 法宝碎片', color:'#e8cf8a', id:p.id});
    }

    // 秘境 BOSS：授秘法
    if(m.area==='secret' && cfg.boss){
      const el = m.secretEl;
      if(!p.secret[el]){
        p.secret[el] = true;
        emit({e:'secretSkill', x:m.x, y:m.y, el, name:p.name, id:p.id, skill:SECRET_SKILLS[el].name});
      }
    }
  }
  emit({e:'kill', x:m.x, y:m.y, name:cfg.name, boss:!!cfg.boss, el:cfg.el, by:p?p.name:''});
}

/* ---------------- 战斗：玩家 ---------------- */
function damagePlayer(target, raw, attackerId, el){
  if(target.dead) return;
  const attacker = world.players.get(attackerId);
  if(attacker && attacker.devil){
    if(attackerId !== target.id){
      emit({e:'sys', text:'魔鬼之身不可再伤道友，只能向妖兽倾泻杀意', id:attackerId});
      return;
    }
  }
  // 切磋不受友伤开关影响
  const sparring = attacker && target.sparWith === attacker.id && attacker.sparWith === target.id;
  // 友伤开关：关闭时群攻 / 飞剑不再波及身边道友（在扣盾、扣血之前直接拦下）
  if(!sparring && attacker && attacker.id !== target.id && !attacker.ff) return;
  const em = elemMult(el, activeEl(target));
  let real = Math.max(1, Math.round(raw*em - target.def*0.4));
  if(target.shield > 0){
    const absorb = Math.min(target.shield, real);
    target.shield -= absorb; real -= absorb;
    emit({e:'shield', x:target.x, y:target.y, val:absorb});
  }
  if(real <= 0) return;
  if(target.lock && target.lock.hp) return;

  // 切磋：双方都收着力，打到剩 1 点即止，不积煞气
  if(sparring){
    const soft = Math.max(1, Math.round(real*0.6));
    target.hp -= soft;
    target.lastCombat = Date.now();
    target.meditating = false;
    emit({e:'pvpHit', x:target.x, y:target.y-16, dmg:soft, id:target.id, atk:attackerId, spar:true});
    if(target.hp <= 1){
      target.hp = 1;
      endSpar(target, attacker.id, 'ko');
      emit({e:'sys', text:'切磋点到为止，承让', id:attacker.id});
      emit({e:'sys', text:'切磋落败，受教了', id:target.id});
    }
    return;
  }

  target.hp -= real;
  target.lastCombat = Date.now();
  target.meditating = false;
  emit({e:'pvpHit', x:target.x, y:target.y-16, dmg:real, id:target.id, atk:attackerId, vuln:em>1.1, resist:em<0.9});
  if(attacker && attacker.id !== target.id){
    if(!(attacker.lock && attacker.lock.grudge)){
      attacker.grudge = Math.min(130, attacker.grudge + 7);
      if(attacker.grudge >= 100 && !attacker.trib) startTribulation(attacker);
    }
  }
  if(target.hp <= 0){
    target.hp = 0;
    handlePlayerKill(target, attacker);
  }
}

function handlePlayerKill(target, attacker){
  // 宗门外被击败：长老出手保命
  const targetSect = target.sect ? SECT_BY_ID[target.sect] : null;
  const inOwnSect = targetSect && dist(target.x,target.y,targetSect.x,targetSect.y) < 175;
  if(targetSect && !inOwnSect && attacker && attacker.id !== target.id){
    target.hp = 1;
    target.dead = false;
    const mainElder = targetSect.peaks.find(k=>k.main) || targetSect.peaks[0];
    const strike = Math.round(attacker.maxHp*0.62);
    attacker.hp -= strike;
    emit({e:'elder', x:attacker.x, y:attacker.y, name:attacker.name, elder:mainElder.elder, target:target.name, dmg:strike});
    if(attacker.hp <= 0){
      attacker.hp = 0;
      attacker.dead = true;
      attacker.deathCause = 'normal';
      attacker.respawnAt = Date.now() + 5000;
      attacker.exp = Math.floor(attacker.exp*0.8);
      attacker.grudge = Math.floor(attacker.grudge*0.5);
      attacker.deaths++;
      attacker.trib = null;
      emit({e:'death', x:attacker.x, y:attacker.y, id:attacker.id, name:attacker.name, by:mainElder.elder});
    }
    return;
  }

  // 宗门范围内同门/他人相杀：受罚
  if(attacker && attacker.sect){
    const as = SECT_BY_ID[attacker.sect];
    if(as && dist(attacker.x,attacker.y,as.x,as.y) < 175){
      attacker.exp = Math.floor(attacker.exp*0.72);
      attacker.stones = Math.max(0, attacker.stones - Math.round(attacker.stones*0.5));
      if(!(attacker.lock && attacker.lock.grudge)) attacker.grudge = Math.min(130, attacker.grudge + 50);
      emit({e:'sys', text:`宗门执法堂：门内行凶，罚没半数灵石、两成八修为`, id:attacker.id});
      if(attacker.grudge >= 100 && !attacker.trib) startTribulation(attacker);
    }
  }

  // 击杀掠夺：先记下对方当前修为的 10%，再结算其损失
  const stolenExp = Math.floor(target.exp * 0.1);
  const killer = (attacker && attacker.id !== target.id) ? attacker : null;

  target.dead = true;
  target.deathCause = 'normal';
  target.respawnAt = Date.now() + 5000;
  target.exp = Math.floor(target.exp*0.9);
  target.deaths++;
  target.meditating = false;
  target.trib = null;
  target.grudge = Math.floor(target.grudge*0.5);
  target.area = 'world';
  target.secretEl = null;
  if(attacker && attacker.id !== target.id){
    if(!(attacker.lock && attacker.lock.grudge)){
      attacker.grudge = Math.min(130, attacker.grudge + 22);
      if(attacker.grudge >= 100 && !attacker.trib) startTribulation(attacker);
    }
  }
  // 击杀者获得对方修为的 10%
  if(killer && stolenExp > 0 && !killer.dead){
    const gain = Math.round(stolenExp * (killer.expRate||1));
    killer.exp = Math.min(killer.expMax, killer.exp + gain);
    emit({e:'item', x:killer.x, y:killer.y-26, text:'掠得修为 +'+gain, color:'#e8cf8a', id:killer.id});
  }
  emit({e:'death', x:target.x, y:target.y, id:target.id, name:target.name, by:attacker?attacker.name:''});
}

/* ---------------- 雷劫 / 魔鬼 ---------------- */
function startTribulation(p, cause){
  if(p.trib || p.devil) return;
  cause = cause || 'grudge';
  // 自然煞气雷劫 99% 致死；雷草主动引动 70% 致死
  const fatal = cause==='herb' ? Math.random() < 0.70 : Math.random() < 0.99;
  p.trib = { end: Date.now()+7200, next: Date.now()+340, hit:0, total:10, cause, fatal };
  emit({e:'trib', x:p.x, y:p.y, name:p.name, id:p.id});
}
function makeDevil(p, cause){
  p.devil = true;
  p.rage = true;
  p.grudge = 0;
  p.shield = 0;
  p.devilCause = cause || 'grudge';
  // 自然煞气成魔 1 分钟；雷草成魔 2 分钟
  p.devilUntil = Date.now() + (p.devilCause==='herb' ? 120000 : 60000);
  emit({e:'devil', x:p.x, y:p.y, name:p.name, id:p.id});
}

/* ---------------- 技能施放 ---------------- */
function scaleSkill(p, sk){
  const el = sk.el || activeEl(p);
  const devilBoost = (p.devil && p.rage) ? 2.6 : 1;
  return { ...sk, el, dmg: p.atk * sk.mult * devilBoost };
}

function spawnProj(p, aim, sk, type){
  projSeq++;
  const id = 'p'+projSeq;
  const pr = {
    id, type, el:sk.el, owner:p.id,
    x: p.x + Math.cos(aim)*24, y: p.y - 12 + Math.sin(aim)*24,
    vx: Math.cos(aim)*(sk.speed||560), vy: Math.sin(aim)*(sk.speed||560),
    life: sk.life || 0.95, dmg: sk.dmg, radius: sk.radius || 14,
    crit:false, pierce: sk.pierce || 0, hitIds:[],
    area: p.area, secretEl: p.secretEl,
  };
  world.projectiles.set(id, pr);
  return pr;
}

function explodeAt(x,y,radius,dmg,ownerId,el){
  emit({e:'boom', x, y, radius, el});
  for(const m of world.mobs.values()){
    if(m.hp<=0) continue;
    if(m.area!==(world.players.get(ownerId)||{}).area) continue;
    const cfg = MOB_TYPES[m.type];
    if((world.players.get(ownerId)||{}).area==='secret' && m.secretEl!==(world.players.get(ownerId)||{}).secretEl) continue;
    if(dist(x,y,m.x,m.y) < radius + cfg.r*0.6) damageMob(m, dmg, ownerId, el, false);
  }
  for(const p of world.players.values()){
    if(p.id===ownerId || p.dead) continue;
    if(p.area !== (world.players.get(ownerId)||{}).area) continue;
    if(p.area==='secret' && p.secretEl !== (world.players.get(ownerId)||{}).secretEl) continue;
    if(dist(x,y,p.x,p.y) < radius + 12) damagePlayer(p, dmg, ownerId, el);
  }
}

function hostCast(id, skillKey, aim){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const el = activeEl(p);

  /* 选技能 */
  let sk = null;
  if(skillKey === 'basic'){
    sk = BASIC_SKILL(el);
    sk.el = el;
    sk.dmg = p.atk * 1.0 * ((p.devil&&p.rage)?2.6:1);
  }else if(skillKey === 'secret'){
    const sec = firstSecretOf(p);
    if(!sec) return;
    sk = { ...sec, el:sec.el, dmg: p.atk * sec.mult * ((p.devil&&p.rage)?2.6:1) };
  }else if(skillKey === 'sect'){
    if(!p.sect) return;
    const ss = SECT_SKILLS[p.sect];
    if(!ss) return;
    sk = { ...ss, el: SECT_BY_ID[p.sect].el, dmg: p.atk * ss.mult * ((p.devil&&p.rage)?2.6:1) };
  }else{
    const s = skillAt(el, parseInt(skillKey.slice(-1),10));
    if(!s || s.el !== el) return;
    sk = scaleSkill(p, s);
  }

  const cdKey = skillKey;
  if((p.cd[cdKey]||0) > 0.02) return;
  if(p.mp < (sk.mp||0)) return;
  p.cd[cdKey] = sk.cd;
  p.mp -= sk.mp;
  p.lastCombat = Date.now();
  p.meditating = false;
  p.aim = aim;
  p.dir = Math.cos(aim) < 0 ? -1 : 1;
  p.attacking = 0.2;

  const type = sk.type || 'melee';
  if(type === 'melee'){
    emit({e:'cast', x:p.x, y:p.y, skill:type, el, aim, id:p.id});
    let hits = 0;
    for(const m of world.mobs.values()){
      if(m.hp<=0) continue;
      if(m.area!==p.area) continue;
      if(p.area==='secret' && m.secretEl!==p.secretEl) continue;
      const cfg = MOB_TYPES[m.type];
      if(dist(p.x,p.y,m.x,m.y) > (sk.range||92) + cfg.r) continue;
      if(angleDiff(Math.atan2(m.y-p.y,m.x-p.x), aim) < (sk.arc||1.9)/2){
        damageMob(m, sk.dmg, id, el);
        hits++;
        if(hits>=4) break;
      }
    }
    for(const o of world.players.values()){
      if(o.id===id || o.dead) continue;
      if(o.area!==p.area) continue;
      if(p.area==='secret' && o.secretEl!==p.secretEl) continue;
      if(dist(p.x,p.y,o.x,o.y) > (sk.range||92) + 13) continue;
      if(angleDiff(Math.atan2(o.y-p.y,o.x-p.x), aim) < (sk.arc||1.9)/2){
        damagePlayer(o, sk.dmg, id, el);
      }
    }
  }else if(type === 'bolt' || type === 'pierce'){
    spawnProj(p, aim, sk, 'bolt');
    emit({e:'cast', x:p.x, y:p.y-14, skill:'bolt', el, aim, id:p.id});
  }else if(type === 'multi'){
    const n = sk.count||3, spread = sk.spread||0.13;
    for(let i=0;i<n;i++){
      spawnProj(p, aim + (i-(n-1)/2)*spread, sk, 'bolt');
    }
    emit({e:'cast', x:p.x, y:p.y-14, skill:'bolt', el, aim, id:p.id});
  }else if(type === 'aoe'){
    explodeAt(p.x, p.y-10, sk.aoe||140, sk.dmg, id, el);
  }else if(type === 'burst'){
    const bx = p.x + Math.cos(aim)*(sk.range||140);
    const by = p.y + Math.sin(aim)*(sk.range||140);
    explodeAt(bx, by, sk.aoe||100, sk.dmg, id, el);
  }else if(type === 'heal'){
    let amount = Math.round(p.maxHp*(sk.pct||0.3));
    // 相生加成：用与另一灵根相生的属性回血
    if(p.root.length>1){
      const other = p.root[1-(p.activeRoot||0)];
      if(shengRel(el, other)) amount = Math.round(amount*1.3);
    }
    p.hp = Math.min(p.maxHp, p.hp+amount);
    if(sk.mpGain) p.mp = Math.min(p.maxMp, p.mp + p.maxMp*sk.mpGain);
    emit({e:'heal', x:p.x, y:p.y, amount, id:p.id, name:p.name, el});
  }else if(type === 'healShield'){
    let amount = Math.round(p.maxHp*(sk.pct||0.2));
    if(p.root.length>1){
      const other = p.root[1-(p.activeRoot||0)];
      if(shengRel(el, other)) amount = Math.round(amount*1.3);
    }
    p.hp = Math.min(p.maxHp, p.hp+amount);
    p.shield = Math.round(p.maxHp*(sk.shield||0.3));
    p.shieldUntil = Date.now() + 6000;
    if(sk.mpGain) p.mp = Math.min(p.maxMp, p.mp + p.maxMp*sk.mpGain);
    emit({e:'heal', x:p.x, y:p.y, amount, id:p.id, name:p.name, el, shield:p.shield});
  }else if(type === 'dash' || type === 'blink'){
    const d = sk.dist || 200;
    let nx = p.x + Math.cos(aim)*d, ny = p.y + Math.sin(aim)*d;
    if(p.area==='secret'){ const a=arenaClamp(nx,ny,14); nx=a.x; ny=a.y; }
    else { const g=gatePos(nx,ny,p.realm); const r=resolveCollision(g.x,g.y,14); nx=r.x; ny=r.y; }
    emit({e:'dash', x:p.x, y:p.y, x2:nx, y2:ny, el, id:p.id});
    p.x = nx; p.y = ny;
  }
}

/* ---------------- 交互：采药 / 服丹 / 服草 / 破境 ---------------- */
function hostGather(id){
  const p = world.players.get(id);
  if(!p || p.dead || p.area==='secret') return;
  let best=null, bd=95;
  for(const h of world.herbs.values()){
    if(!h.alive) continue;
    const d = dist(p.x,p.y,h.x,h.y);
    if(d<bd){ bd=d; best=h; }
  }
  if(!best){ emit({e:'sys', text:'附近没有可采的草药', id}); return; }
  best.alive = false;
  best.respawnAt = Date.now() + 30000;
  herbChanges.push({ id:best.id, alive:false });
  p.herbInv[best.el] = (p.herbInv[best.el]||0)+1;
  p.gathered++;
  p.exp = Math.min(p.expMax, p.exp + Math.round(12*(p.expRate||1)));
  emit({e:'gather', x:best.x, y:best.y, name:p.name, id:p.id, el:best.el});
}

function hostUseHerb(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const els = EL_LIST.filter(e=>(p.herbInv[e]||0)>0);
  if(!els.length){ emit({e:'sys', text:'囊中并无草药', id}); return; }
  const own = activeEl(p);
  let chosen = els.find(e=>shengRel(e, own)) || els.find(e=>e===own) || els[0];
  p.herbInv[chosen]--;
  let amount = Math.round(p.maxHp*0.28);
  let mp = Math.round(p.maxMp*0.18);
  let sheng = shengRel(chosen, own);
  if(sheng){ amount = Math.round(amount*1.45); mp = Math.round(mp*1.8); }
  else if(chosen===own){ amount = Math.round(amount*1.15); }
  p.hp = Math.min(p.maxHp, p.hp+amount);
  p.mp = Math.min(p.maxMp, p.mp+mp);
  emit({e:'herb', x:p.x, y:p.y, amount, mp, el:chosen, sheng:!!sheng, id:p.id, name:p.name});
}

function hostThunderHerb(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  if((p.herbInv.thunder||0) < 1){ emit({e:'sys', text:'没有雷属性草药', id}); return; }
  if(p.devil){ emit({e:'sys', text:'已是魔鬼之身，雷劫不再加身', id}); return; }
  p.herbInv.thunder--;
  emit({e:'sys', text:'服下雷草，引动天雷…', id});
  startTribulation(p, 'herb');
}

function hostUse(id, item){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  if(item==='heal'){
    if(p.pillsHeal < 1){ emit({e:'sys', text:'没有回春丹', id}); return; }
    if(p.hp >= p.maxHp){ emit({e:'sys', text:'气血充盈，无需服丹', id}); return; }
    p.pillsHeal--;
    const amount = Math.round(p.maxHp*0.6);
    p.hp = Math.min(p.maxHp, p.hp+amount);
    emit({e:'heal', x:p.x, y:p.y, amount, id:p.id, name:p.name, el:activeEl(p)});
  }else if(item==='exp'){
    if(p.pillsExp < 1){ emit({e:'sys', text:'没有聚气丹', id}); return; }
    p.pillsExp--;
    const before = p.exp;
    p.exp = Math.min(p.expMax, p.exp+180);
    emit({e:'heal', x:p.x, y:p.y, amount:p.exp-before, id:p.id, name:p.name, exp:true, el:activeEl(p)});
  }
}

function hostBreak(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  if(p.realm >= REALM_NAMES.length-1){ emit({e:'sys', text:'已至化神，此界再无可破之境', id}); return; }
  if(p.exp < p.expMax){ emit({e:'sys', text:`修为不足，还需 ${Math.ceil(p.expMax-p.exp)} 点修为`, id}); return; }
  const chance = p.realm<9 ? 0.90 : p.realm<12 ? 0.82 : p.realm<15 ? 0.74 : 0.66;
  if(Math.random() < chance){
    p.realm++;
    recalcPlayer(p);
    p.exp = 0; p.hp = p.maxHp; p.mp = p.maxMp;
    emit({e:'break', x:p.x, y:p.y, name:p.name, realm:p.realmName, id:p.id});
  }else{
    p.exp = Math.floor(p.exp*0.7);
    emit({e:'breakfail', x:p.x, y:p.y, name:p.name, id:p.id});
  }
}

function hostBuy(id, item){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const z = zoneInfoAt(p.x,p.y);
  if(!z || z.name!=='青云坊市'){ emit({e:'sys', text:'需在青云坊市才能交易', id}); return; }
  if(item==='heal'){
    if(p.stones < 60){ emit({e:'sys', text:'灵石不足', id}); return; }
    p.stones -= 60; p.pillsHeal++;
    emit({e:'buy', x:p.x, y:p.y, name:p.name, text:'回春丹 ×1', id:p.id});
  }else if(item==='exp'){
    if(p.stones < 90){ emit({e:'sys', text:'灵石不足', id}); return; }
    p.stones -= 90; p.pillsExp++;
    emit({e:'buy', x:p.x, y:p.y, name:p.name, text:'聚气丹 ×1', id:p.id});
  }else if(item==='sellherb'){
    let total = 0, n = 0;
    for(const el of EL_LIST){ n += p.herbInv[el]||0; total += (p.herbInv[el]||0)*15; p.herbInv[el]=0; }
    const th = p.herbInv.thunder||0;
    total += th*60; p.herbInv.thunder = 0; n += th;
    if(n<=0){ emit({e:'sys', text:'没有草药可卖', id}); return; }
    p.stones += total;
    emit({e:'buy', x:p.x, y:p.y, name:p.name, text:`草药 ×${n} · +${total} 灵石`, id:p.id});
  }
}

/* ---------------- 成就 / 称号 ---------------- */
function checkAch(p){
  if(!p) return false;
  let got = false;
  for(const a of ACH_DEFS){
    if(p.ach.indexOf(a.id) >= 0) continue;
    let ok = false;
    try{ ok = !!a.cond(p); }catch(e){ ok = false; }
    if(ok){
      p.ach.push(a.id);
      if(!p.title) p.title = a.title;
      emit({e:'ach', id:p.id, name:p.name, ach:a.id, title:a.title});
      got = true;
    }
  }
  return got;
}
function hostTitle(id, title){
  const p = world.players.get(id);
  if(!p) return;
  title = String(title||'').slice(0,10);
  if(!title){ p.title = ''; emit({e:'sys', text:'已卸下称号', id}); return; }
  const a = ACH_DEFS.find(x=>x.title===title);
  if(!a || p.ach.indexOf(a.id) < 0){ emit({e:'sys', text:'尚未获得该称号', id}); return; }
  p.title = title;
  emit({e:'sys', text:`称号已换为「${title}」`, id, gold:true});
}

/* ---------------- 法宝：炼制 / 佩戴 ---------------- */
function hostArt(id, action, artId){
  const p = world.players.get(id);
  const d = ART_BY_ID[artId];
  if(!p || !d) return;
  if(action === 'craft'){
    if(p.arts.indexOf(artId) >= 0){ emit({e:'sys', text:'这法宝已经炼过了', id}); return; }
    if(p.shards < ART_COST_SHARD || p.stones < ART_COST_STONE){
      emit({e:'sys', text:`需 ${ART_COST_SHARD} 碎片 + ${ART_COST_STONE} 灵石`, id}); return;
    }
    p.shards -= ART_COST_SHARD;
    p.stones -= ART_COST_STONE;
    p.arts.push(artId);
    emit({e:'buy', x:p.x, y:p.y, name:p.name, text:`炼成 ${d.name}`, id:p.id});
    checkAch(p);
  }else if(action === 'equip'){
    if(p.arts.indexOf(artId) < 0){ emit({e:'sys', text:'尚未炼成该法宝', id}); return; }
    p.art = artId;
    recalcPlayer(p);
    emit({e:'sys', text:`已佩 ${d.name} · ${d.desc}`, id, gold:true});
    emit({e:'art', x:p.x, y:p.y, art:artId, id:p.id});
  }else if(action === 'unequip'){
    if(p.art !== artId) return;
    p.art = null;
    recalcPlayer(p);
    emit({e:'sys', text:`已卸下 ${d.name}`, id});
  }
}

/* ---------------- 切磋 ---------------- */
function nearestPlayer(p, maxD){
  let best = null, bd = maxD;
  for(const o of world.players.values()){
    if(o.id === p.id || o.dead) continue;
    if(o.area !== p.area) continue;
    if(p.area === 'secret' && o.secretEl !== p.secretEl) continue;
    const d = dist(p.x, p.y, o.x, o.y);
    if(d < bd){ bd = d; best = o; }
  }
  return best;
}
function endSpar(p, winnerId, reason){
  if(!p) return;
  const o = p.sparWith ? world.players.get(p.sparWith) : null;
  if(o && o.sparWith === p.id) o.sparWith = null;
  const partnerId = p.sparWith;
  p.sparWith = null;
  p.sparUntil = 0;
  if(o) o.sparUntil = 0;
  const w = winnerId ? world.players.get(winnerId) : null;
  if(w){
    w.sparWins = (w.sparWins||0) + 1;
    checkAch(w);
  }
  emit({e:'sparEnd', x:p.x, y:p.y, winner:winnerId||null,
        a:p.id, b:partnerId, reason:reason||'', wn:w?w.name:''});
}
function hostSpar(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const now = Date.now();

  if(p.sparWith){                        // 切磋中再按一次 = 认输收手
    const wid = p.sparWith;
    endSpar(p, wid, 'yield');
    emit({e:'sys', text:'切磋结束，点到为止', id});
    return;
  }
  const o = nearestPlayer(p, 180);
  if(!o){ emit({e:'sys', text:'附近没有可切磋的道友', id}); return; }
  if(o.sparWith && o.sparWith !== p.id){
    emit({e:'sys', text:`${o.name} 正在与人切磋`, id}); return;
  }
  if(p.sparInvite === o.id && now - p.sparInviteAt < 10000){
    p.sparWith = o.id; o.sparWith = p.id;
    p.sparUntil = o.sparUntil = now + 45000;
    p.sparInvite = null; o.sparInvite = null;
    emit({e:'sparStart', x:p.x, y:p.y, a:p.id, b:o.id, an:p.name, bn:o.name});
    emit({e:'sys', text:`与 ${o.name} 切磋开始：45 秒内点到为止，不积煞气`, id, gold:true});
    emit({e:'sys', text:`已与 ${p.name} 开始切磋`, id:o.id, gold:true});
  }else{
    o.sparInvite = p.id; o.sparInviteAt = now;
    emit({e:'sys', text:`${p.name} 邀你切磋，按 ${keyLabel(BINDS.spar)} 应战`, id:o.id});
    emit({e:'sys', text:`已向 ${o.name} 发出切磋邀请`, id});
  }
}

/* ---------------- 随机奇遇 ---------------- */
let npcSeq = 0, nextEncAt = 0;
function spawnEncounter(){
  if(world.npcs.size >= 3) return;
  const def = ENCOUNTER_DEFS[Math.floor(Math.random()*ENCOUNTER_DEFS.length)];
  const ring = RINGS[1 + Math.floor(Math.random()*2)];   // 第二 / 三环
  let x = 0, y = 0, ok = false;
  for(let k=0;k<50;k++){
    const a = Math.random()*Math.PI*2;
    const r = ring.r0 + 90 + Math.random()*(ring.r1 - ring.r0 - 180);
    x = CX + Math.cos(a)*r;
    y = CY + Math.sin(a)*r;
    if(portalSpotOk(x, y, [], 0)){ ok = true; break; }
  }
  if(!ok) return;
  const n = {
    id:'n'+(++npcSeq), type:def.type, name:def.name, color:def.color,
    x:Math.round(x), y:Math.round(y), phase:Math.random()*6.28, born:Date.now(),
  };
  world.npcs.set(n.id, n);
  emit({e:'npcSpawn', x:n.x, y:n.y, name:n.name});
}
function encounterReward(p, n){
  const def = ENCOUNTER_DEFS.find(d=>d.type===n.type) || ENCOUNTER_DEFS[0];
  let text = '';
  if(n.type === 'merchant'){
    p.pillsHeal = (p.pillsHeal||0) + 1; text = '+1 回春丹';
  }else if(n.type === 'rogue'){
    const v = Math.round(p.expMax*0.25);
    p.exp = Math.min(p.expMax, p.exp + v); text = '+'+v+' 修为';
  }else if(n.type === 'swordsman'){
    p.shards = (p.shards||0) + 1; text = '+1 法宝碎片';
  }else if(n.type === 'kid'){
    p.stones += 120; text = '+120 灵石';
  }else if(n.type === 'herbalist'){
    const el = EL_LIST[Math.floor(Math.random()*EL_LIST.length)];
    p.herbInv[el] = (p.herbInv[el]||0) + 2; text = '+2 '+elName(el)+'草';
  }
  p.encounters = (p.encounters||0) + 1;
  emit({e:'encounter', x:n.x, y:n.y, name:n.name, line:def.line, text, id:p.id});
  checkAch(p);
  world.npcs.delete(n.id);
}

/* ---------------- 灵根切换 / 魔鬼狂暴 ---------------- */
function hostSwapRoot(id){
  const p = world.players.get(id);
  if(!p) return;
  if(p.root.length < 2){ emit({e:'sys', text:'你只有单一灵根', id}); return; }
  p.activeRoot = 1 - (p.activeRoot||0);
  emit({e:'root', el:activeEl(p), id:p.id});
}

function hostRage(id){
  const p = world.players.get(id);
  if(!p || !p.devil){ emit({e:'sys', text:'未入魔道，无法狂暴', id}); return; }
  p.rage = !p.rage;
  emit({e:'rage', on:p.rage, id:p.id});
}

/* ---------------- 隐藏内置挂（仅作用于调用者自己） ---------------- */
function hostCheat(id, action, payload){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  payload = payload || {};
  if(action === 'root'){
    const roots = (payload.roots||[]).filter(e=>EL_LIST.includes(e)).slice(0,2);
    if(!roots.length) return;
    p.root = roots;
    p.activeRoot = Math.min(payload.active===1?1:0, roots.length-1);
    emit({e:'root', el:activeEl(p), id:p.id});
  }else if(action === 'activeRoot'){
    if(p.root.length < 2) return;
    p.activeRoot = payload.index===1 ? 1 : 0;
    emit({e:'root', el:activeEl(p), id:p.id});
  }else if(action === 'lock'){
    const k = payload.key;
    if(['hp','mp','exp','grudge'].indexOf(k) < 0) return;
    p.lock = p.lock || {}; p.lockVal = p.lockVal || {};
    if(payload.on){
      p.lock[k] = true;
      p.lockVal[k] = k==='hp' ? p.hp : k==='mp' ? p.mp : k==='exp' ? p.exp : p.grudge;
    }else{
      p.lock[k] = false;
    }
  }else if(action === 'preset'){
    const key = payload.preset;
    p.preset = (key && CHEAT_PRESETS[key]) ? key : null;
    recalcPlayer(p);
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
    if(p.preset) emit({e:'sys', text:CHEAT_PRESETS[p.preset].name+' 已启', id:p.id});
  }
}

function hostFF(id, on){
  const p = world.players.get(id);
  if(p) p.ff = !!on;
}

function hostControl(id, control){
  const p = world.players.get(id);
  if(!p) return;
  if(!CONTROL_INFO[control]) return;
  if(control==='lockon' && p.gender!=='female') return; // 锁敌仍为女修专属
  p.control = control;
}

/* ---------------- 宗门 ---------------- */
function hostTrial(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  if(!G.sectsOn){ emit({e:'sys', text:'此洞天未开启宗门系统', id}); return; }
  if(p.sect){ emit({e:'sys', text:'你已身属宗门，需先退宗', id}); return; }
  const tnow = Date.now();
  if(tnow < p.trialCd){ emit({e:'sys', text:'试炼尚未冷却', id}); return; }
  let site = null, best = 1e9;
  for(const s of worldGeo.sects){
    const d = dist(p.x,p.y,s.x,s.y);
    if(d < 175 && d < best){ best=d; site=s; }
  }
  if(!site){ emit({e:'sys', text:'需走近宗门山门方可试炼', id}); return; }
  if(tierOf(p.realm) < site.tier){
    p.trialCd = tnow + 8000;
    emit({e:'sys', text:`修为不足：${site.name}只收${TIER_NAMES[site.tier]}修士`, id});
    return;
  }
  const chance = 0.62 + (tierOf(p.realm)-site.tier)*0.12;
  if(Math.random() < chance){
    emit({e:'trialok', sectId:site.id, id});
  }else{
    p.trialCd = tnow + 12000;
    emit({e:'sys', text:'试炼未过，气血翻涌，稍后再试', id});
    emit({e:'trialfail', x:p.x, y:p.y, id});
  }
}

function hostJoinSect(id, sectId, peakIdx){
  const p = world.players.get(id);
  if(!p || p.sect) return;
  const sect = SECT_BY_ID[sectId];
  if(!sect){ emit({e:'sys', text:'宗门不存在', id}); return; }
  const site = worldGeo.sects.find(s=>s.id===sectId);
  if(!site || dist(p.x,p.y,site.x,site.y) > 200){ emit({e:'sys', text:'你已离山门太远', id}); return; }
  const peak = sect.peaks[peakIdx];
  if(!peak) return;
  if(!peak.main && Math.random() > 0.55){
    emit({e:'sys', text:`${peak.elder}摇头婉拒：你与我峰缘分未到，另择山头吧`, id});
    emit({e:'sectRefuse', x:p.x, y:p.y, id});
    return;
  }
  p.sect = sectId;
  p.sectPeak = peakIdx;
  recalcPlayer(p);
  p.hp = p.maxHp; p.mp = p.maxMp;
  emit({e:'sectjoin', x:p.x, y:p.y, name:p.name, id:p.id, sect:sect.name, peak:peak.name, elder:peak.elder, skill:SECT_SKILLS[sectId].name});
}

function hostLeaveSect(id){
  const p = world.players.get(id);
  if(!p || !p.sect) return;
  const name = SECT_BY_ID[p.sect].name;
  p.sect = null; p.sectPeak = -1;
  recalcPlayer(p);
  p.hp = Math.min(p.hp, p.maxHp);
  emit({e:'sectleave', x:p.x, y:p.y, name:p.name, id:p.id, sect:name});
}

/* ---------------- 聊天 ---------------- */
function hostChat(id, text){
  const p = world.players.get(id);
  if(!p) return;
  const t = String(text||'').trim().slice(0,80);
  if(!t) return;
  addChat(p.name, t, id===G.selfId);
  bubbleFor(id, t, 'chat');
  broadcast({ type:'chat', id, name:p.name, text:t });
}

/* ---------------- 事件表现 ---------------- */
function emit(ev){
  pendingEvents.push(ev);
  applyEvent(ev);
}

function applyEvent(ev){
  switch(ev.e){
    case 'hit':
      floatText(ev.x, ev.y, (ev.crit?'暴击 ':'')+ev.dmg, ev.crit?'#ffd166':(ev.vuln?'#ffb0d0':'#f2f6f0'), ev.crit?16:13);
      spawnParticles(ev.x, ev.y, ev.crit?10:5, ev.vuln?'#ffb0d0':'#ffb38a', 110, 2.6, 0.45);
      sfx('hit');
      break;
    case 'pvpHit':
      floatText(ev.x, ev.y, '-'+ev.dmg, ev.vuln?'#ff9ad0':'#ff8f7a', 13);
      spawnParticles(ev.x, ev.y, 6, '#ff7a9a', 90, 2.6, 0.45);
      if(ev.id===G.selfId || ev.atk===G.selfId) G.shake = 6;
      break;
    case 'shield':
      floatText(ev.x, ev.y-24, '护盾 -'+ev.val, '#a6d8ff', 11);
      break;
    case 'kill':
      floatText(ev.x, ev.y-20, ev.name+' 陨落', ev.boss?'#ffb38a':elColor(ev.el||'earth'), ev.boss?16:13);
      spawnParticles(ev.x, ev.y, ev.boss?40:16, ev.boss?'#ff9a6a':elColor(ev.el||'earth'), ev.boss?220:130, ev.boss?5:3, 0.9);
      ring(ev.x,ev.y, ev.boss?'rgba(255,150,100,.7)':'rgba(217,192,138,.55)', ev.boss?180:70, 0.6);
      if(ev.boss) toast(`${ev.name}已被斩杀！`,'gold');
      sfx('die');
      break;
    case 'mobhit':
      if(ev.id===G.selfId){ G.shake = 7; }
      floatText(ev.x, ev.y, '-'+ev.dmg, '#ff8f7a', 13);
      spawnParticles(ev.x, ev.y, 4, '#ff7a5a', 80, 2.4, 0.4);
      break;
    case 'death':
      if(ev.id===G.selfId){ toast('道躯已陨，五秒后于青云村复生','gold'); sfx('die'); }
      spawnParticles(ev.x, ev.y, 26, '#cfe3dd', 150, 3.4, 1.0);
      break;
    case 'respawn':
      if(ev.id===G.selfId){ toast('魂魄归位，道躯重塑','jade'); G.pred.x=ev.x; G.pred.y=ev.y; }
      ring(ev.x,ev.y,'rgba(121,224,189,.6)',70,0.7);
      break;
    case 'break':
      floatText(ev.x, ev.y-40, ev.name+' 破境 · '+ev.realm, '#f0dfb4', 16);
      spawnParticles(ev.x, ev.y, 46, '#f0dfb4', 240, 4.2, 1.2);
      ring(ev.x,ev.y,'rgba(240,223,180,.85)',150,1.0);
      ring(ev.x,ev.y,'rgba(121,224,189,.6)',100,0.8);
      toast(`${ev.name} 破境成功，晋入 ${ev.realm}`,'gold');
      sfx('break');
      if(ev.id===G.selfId) G.shake = 9;
      break;
    case 'breakfail':
      floatText(ev.x, ev.y-30, '破境失败', '#e06b5a', 14);
      spawnParticles(ev.x, ev.y, 14, '#b05a4a', 110, 3, 0.7);
      if(ev.id===G.selfId) toast('破境失败，修为损失三成','gold');
      break;
    case 'cast':
      sfx(ev.skill==='aoe'||ev.skill==='burst'?'aoe':'attack');
      spawnParticles(ev.x, ev.y, 5, elColor(ev.el||'fire'), 90, 2.4, 0.4);
      break;
    case 'boom':
      ring(ev.x,ev.y,hexA(elColor(ev.el||'fire'),.85),ev.radius||140,0.5);
      spawnParticles(ev.x, ev.y, 22, elColor(ev.el||'fire'), 180, 3.4, 0.7);
      sfx('aoe');
      break;
    case 'heal':
      floatText(ev.x, ev.y-30, '+'+ev.amount+(ev.exp?' 修为':' 气血'), '#8fe0bd', 13);
      ring(ev.x,ev.y,'rgba(121,224,189,.65)',60,0.6);
      sfx('heal');
      break;
    case 'herb':
      floatText(ev.x, ev.y-30, '+'+ev.amount+' 气血 / +'+ev.mp+' 灵力'+(ev.sheng?' · 相生':''), elColor(ev.el), 13);
      spawnParticles(ev.x, ev.y, 10, elColor(ev.el), 70, 2.2, 0.5);
      ring(ev.x,ev.y,hexA(elColor(ev.el),.6),56,0.5);
      sfx('heal');
      break;
    case 'dash':
      spawnParticles(ev.x, ev.y, 10, elColor(ev.el||'fire'), 70, 2.2, 0.4);
      spawnParticles(ev.x2, ev.y2, 10, elColor(ev.el||'fire'), 70, 2.2, 0.4);
      break;
    case 'gather':
      floatText(ev.x, ev.y-20, elName(ev.el)+'草 +1', elColor(ev.el), 12);
      spawnParticles(ev.x, ev.y, 8, elColor(ev.el), 70, 2.2, 0.5);
      sfx('gather');
      break;
    case 'full':
      if(ev.id===G.selfId) toast('修为已满，按 B 破境','gold');
      break;
    case 'buy':
      floatText(ev.x, ev.y-30, ev.text, '#f0dfb4', 12);
      sfx('buy');
      break;
    case 'sys':
      if(!ev.id || ev.id===G.selfId) addSys(ev.text, 'gold');
      break;
    case 'trib':
      if(ev.id===G.selfId){ toast('煞气冲霄，雷劫降临！撑过十道天雷','thunder'); sfx('thunder'); }
      break;
    case 'tribhit':
      spawnParticles(ev.x, ev.y, 16, '#c9b8ff', 150, 3.4, 0.5);
      floatText(ev.x, ev.y, '-'+ev.dmg, '#d8c8ff', 15);
      ring(ev.x,ev.y,'rgba(200,180,255,.8)',120,0.4);
      if(ev.id===G.selfId){ G.shake = 12; sfx('thunder'); }
      break;
    case 'devil':
      floatText(ev.x, ev.y-46, '蜕变为魔 · '+ev.name, '#d8c0ff', 17);
      spawnParticles(ev.x, ev.y, 60, '#b48fe0', 260, 4.6, 1.3);
      ring(ev.x,ev.y,'rgba(200,180,255,.9)',200,1.1);
      toast(`${ev.name} 渡过雷劫，坠入魔道，化为魔鬼`,'thunder');
      sfx('devil');
      if(ev.id===G.selfId) G.shake = 14;
      break;
    case 'devilEnd':
      floatText(ev.x, ev.y-46, '魔道消散 · '+ev.name, '#c6d2cc', 15);
      if(ev.id===G.selfId) toast('时限已到，重归凡人','jade');
      break;
    case 'elder':
      floatText(ev.x, ev.y-40, ev.elder+' 出手 · '+ev.dmg, '#9fc7d8', 15);
      spawnParticles(ev.x, ev.y, 30, '#9fc7d8', 190, 4, 0.9);
      ring(ev.x,ev.y,'rgba(159,199,216,.8)',160,0.8);
      if(ev.name===G.playerName || ev.dmg>0) toast(`${ev.elder}出手：${ev.name} 被击退`,'gold');
      sfx('sect');
      break;
    case 'sectjoin':
      if(ev.id===G.selfId){
        toast(`拜入 ${ev.sect} · ${ev.peak}（${ev.elder}）`,'jade');
        addSys(`习得宗门秘法：${ev.skill}（按 Q 施展）`,'gold');
      }
      ring(ev.x,ev.y,'rgba(121,224,189,.75)',120,0.9);
      spawnParticles(ev.x, ev.y, 32, '#79e0bd', 170, 3.6, 0.9);
      sfx('sect');
      break;
    case 'secretSkill':
      if(ev.id===G.selfId){
        toast(`斩杀秘境之主，习得秘法：${ev.skill}（按 0 施展）`,'thunder');
        addSys(`秘法「${ev.skill}」已刻入识海，耗灵极巨`,'gold');
      }
      break;
    case 'enterSecret':
      if(ev.id===G.selfId){ toast(`踏入 ${SECRET_NAMES[ev.el]}`, 'jade'); }
      ring(ev.x,ev.y,hexA(elColor(ev.el),.8),110,0.8);
      sfx('sect');
      break;
    case 'leaveSecret':
      if(ev.id===G.selfId) toast('自秘境归来','jade');
      break;
    case 'item':
      if(!ev.id || ev.id===G.selfId){
        floatText(ev.x, ev.y-16, ev.text, ev.color, 12);
        spawnParticles(ev.x, ev.y, 10, ev.color, 80, 2.4, 0.5);
      }
      break;
    case 'root':
      if(ev.id===G.selfId){ toast('灵根已转换为 '+elName(ev.el),'jade'); }
      break;
    case 'rage':
      if(ev.id===G.selfId){ toast(ev.on?'狂暴开启：杀意滔天':'狂暴收敛','thunder'); }
      break;
    case 'ach':{
      const a = achInfo(ev.ach);
      if(ev.id === G.selfId){
        toast(`成就达成 ·「${a?a.name:ev.ach}」 称号「${ev.title}」`, 'gold');
        sfx('buff');
      }
      break;
    }
    case 'sparStart':
      ring(ev.x, ev.y, 'rgba(140,220,190,.8)', 120, 0.6);
      if(ev.a===G.selfId || ev.b===G.selfId) toast('切磋开始：点到为止', 'gold');
      break;
    case 'sparEnd':
      if(ev.a===G.selfId || ev.b===G.selfId){
        const won = ev.winner === G.selfId;
        toast(ev.winner ? (won?'切磋胜出！':'切磋落败，再接再厉') : '切磋作罢', won?'gold':'');
        if(ev.winner) ring(ev.x, ev.y, won?'rgba(255,214,120,.8)':'rgba(160,170,190,.6)', 90, 0.5);
      }
      break;
    case 'npcSpawn':
      ring(ev.x, ev.y, 'rgba(200,220,255,.55)', 60, 0.6);
      break;
    case 'encounter':
      floatText(ev.x, ev.y-30, ev.name+'：'+ev.line, ev.color||'#e8cf8a', 12);
      if(ev.id === G.selfId){
        addSys(`${ev.name} 赠你 ${ev.text}`, 'gold');
        toast(`${ev.name} 赠你 ${ev.text}`, 'gold');
        sfx('buff');
      }
      break;
    case 'art':
      if(ev.id === G.selfId){
        const d = ART_BY_ID[ev.art];
        if(d) toast(`已佩 ${d.name} · ${d.desc}`, 'gold');
      }
      break;
    case 'emote':
      bubbleFor(ev.id, ev.text, 'emote');
      break;
    case 'gift':
      ring(ev.x, ev.y, 'rgba(255,214,120,.7)', 55, 0.45);
      floatText(ev.x, ev.y-46, '赠 '+ev.item, '#ffd166', 12);
      if(ev.id === G.selfId) toast('收到 '+ev.from+' 的 '+ev.item, 'gold');
      if(ev.fromId === G.selfId) toast('已赠 '+ev.to+' '+ev.item, 'gold');
      break;
    case 'mentor':
      ring(ev.x, ev.y, 'rgba(200,180,255,.75)', 80, 0.6);
      if(ev.masterId === G.selfId || ev.apId === G.selfId)
        toast(`${ev.ap} 拜 ${ev.master} 为师`, 'gold');
      break;
    case 'portalMove':
      addSys('秘境传送门已变换方位','');
      break;
    case 'trialok':
      if(ev.id===G.selfId) openSectPanel(ev.sectId);
      break;
    case 'trialfail':
      if(ev.id===G.selfId) toast('试炼未过','');
      break;
    case 'sectRefuse':
      if(ev.id===G.selfId) toast('长老婉拒，另择山头','');
      break;
    case 'sectleave':
      if(ev.id===G.selfId) toast('已退出 '+ev.sect,'gold');
      break;
  }
}

