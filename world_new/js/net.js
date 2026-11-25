/* ============================================================
   js/net.js — PeerJS 联机：房主权威、快照广播、客户端同步
   ============================================================ */
'use strict';

function serPlayer(p){
  return {
    id:p.id, name:p.name, gender:p.gender,
    root:p.root, activeRoot:p.activeRoot, control:p.control,
    x:Math.round(p.x*10)/10, y:Math.round(p.y*10)/10,
    dir:p.dir, mx:p.mx, my:p.my,
    hp:Math.round(p.hp), maxHp:p.maxHp,
    mp:Math.round(p.mp), maxMp:p.maxMp, shield:Math.round(p.shield||0),
    realm:p.realm, realmName:p.realmName,
    exp:Math.round(p.exp), expMax:p.expMax,
    atk:p.atk, def:p.def,
    stones:p.stones, herbInv:{...p.herbInv}, pillsHeal:p.pillsHeal, pillsExp:p.pillsExp,
    kills:p.kills, gathered:p.gathered, deaths:p.deaths,
    grudge:Math.round(p.grudge||0), devil:!!p.devil, rage:!!p.rage,
    preset:p.preset||null,
    trib:p.trib ? { hit:p.trib.hit, total:p.trib.total } : null,
    sect:p.sect, sectPeak:p.sectPeak, secret:p.secret,
    shards:p.shards||0, arts:p.arts||[], art:p.art||null,
    ach:p.ach||[], title:p.title||'',
    bossKills:p.bossKills||0, sparWins:p.sparWins||0, encounters:p.encounters||0,
    sparWith:p.sparWith||null,
    masterId:p.masterId||null, masterName:p.masterName||'',
    apprenticeId:p.apprenticeId||null, apprenticeName:p.apprenticeName||'',
    meditating:p.meditating, dead:p.dead,
    respawnIn: p.dead ? Math.max(0, Math.ceil((p.respawnAt-Date.now())/1000)) : 0,
    cd:{ ...p.cd },
    attacking: p.attacking>0 ? 1 : 0,
    area:p.area, secretEl:p.secretEl,
  };
}
function serMob(m){
  return {
    id:m.id, type:m.type,
    x:Math.round(m.x*10)/10, y:Math.round(m.y*10)/10,
    hp:Math.round(m.hp), maxHp:m.maxHp,
    dir:m.dir, state:m.state,
    area:m.area, secretEl:m.secretEl,
  };
}
function serItem(it){
  return { id:it.id, el:it.el, kind:it.kind, name:it.name, color:it.color,
    x:Math.round(it.x), y:Math.round(it.y), alive:it.alive, phase:it.phase };
}

/* ---------------- 师徒关系清理 ---------------- */
function clearMentorLinks(p){
  const m = p.masterId ? world.players.get(p.masterId) : null;
  const a = p.apprenticeId ? world.players.get(p.apprenticeId) : null;
  if(m && m.apprenticeId === p.id){ m.apprenticeId = null; m.apprenticeName = ''; recalcPlayer(m); }
  if(a && a.masterId === p.id){ a.masterId = null; a.masterName = ''; recalcPlayer(a); }
  p.masterId = null; p.masterName = '';
  p.apprenticeId = null; p.apprenticeName = '';
}

/* ---------------- 房主连接 ---------------- */
function setupHostConn(conn){
  conn.on('open', ()=>{ conns.set(conn.peer, conn); });
  conn.on('data', d => handleHostData(conn, d));
  conn.on('close', ()=>{
    conns.delete(conn.peer);
    const p = world.players.get(conn.peer);
    if(p){
      clearMentorLinks(p);
      world.players.delete(conn.peer);
      broadcast({ type:'sys', text:`${p.name} 离开了青云界` });
      addSys(`${p.name} 离开了青云界`);
      if(conns.size===0) addSys('洞天中只剩你一人');
    }
  });
  conn.on('error', ()=>{});
}

function handleHostData(conn, d){
  if(!d || typeof d !== 'object') return;
  const id = conn.peer;
  switch(d.type){
    case 'join':{
      let p = world.players.get(id);
      if(!p){
        const nm = String(d.name||'无名散修').slice(0,10);
        const root = (d.root && EL_LIST.indexOf(d.root)>=0) ? [d.root] : ['fire'];
        p = addPlayer(id, nm, { gender:d.gender==='female'?'female':'male', root, control:d.control }, false);
        addSys(`${nm} 踏入了青云界`, 'gold');
        broadcast({ type:'sys', text:`${nm} 踏入了青云界` });
      }
      conn.send({
        type:'init', seed:G.seed, you:id, room:G.roomName, sectsOn:G.sectsOn,
        players:[...world.players.values()].map(serPlayer),
        mobs:[...world.mobs.values()].map(serMob),
        herbs:[...world.herbs.values()].map(h=>({id:h.id,x:h.x,y:h.y,el:h.el,alive:h.alive,respawnAt:h.respawnAt,phase:h.phase})),
        items:[...world.items.values()].map(serItem),
        npcs:[...world.npcs.values()].map(n=>({ id:n.id, type:n.type, name:n.name, color:n.color,
          x:Math.round(n.x), y:Math.round(n.y), phase:n.phase })),
        portals:G.portals,
      });
      break;
    }
    case 'input':{
      const p = world.players.get(id);
      if(p) p.inp = d;
      break;
    }
    case 'cast': hostCast(id, d.skill, Number(d.aim)||0); break;
    case 'gather': hostGather(id); break;
    case 'break': hostBreak(id); break;
    case 'buy': hostBuy(id, d.item); break;
    case 'use': hostUse(id, d.item); break;
    case 'herb': hostUseHerb(id); break;
    case 'thunder': hostThunderHerb(id); break;
    case 'chat': hostChat(id, d.text); break;
    case 'swap': hostSwapRoot(id); break;
    case 'rage': hostRage(id); break;
    case 'cheat': hostCheat(id, d.action, d.payload||{}); break;
    case 'control': hostControl(id, d.control); break;
    case 'ff': hostFF(id, d.on); break;
    case 'trial': hostTrial(id); break;
    case 'joinsect': hostJoinSect(id, d.sectId, Number(d.peak)|0); break;
    case 'leavesect': hostLeaveSect(id); break;
    case 'spar': hostSpar(id); break;
    case 'emote': hostEmote(id, d.text); break;
    case 'gift': hostGift(id, d.target, d.kind); break;
    case 'mentor': hostMentor(id); break;
    case 'title': hostTitle(id, d.title); break;
    case 'art': hostArt(id, d.action, d.art); break;
    case 'ping': try{ conn.send({type:'pong', t:d.t}); }catch(e){} break;
  }
}

function broadcast(msg, exceptId){
  for(const [id,c] of conns){
    if(id===exceptId) continue;
    try{ if(c.open) c.send(msg); }catch(e){}
  }
}

function broadcastSnapshot(){
  if(!conns.size) return;
  broadcast({
    type:'snap', t:Date.now(),
    players:[...world.players.values()].map(serPlayer),
    mobs:[...world.mobs.values()].map(serMob),
    projectiles:[...world.projectiles.values()].map(pr=>({
      id:pr.id, type:pr.type, el:pr.el, x:Math.round(pr.x), y:Math.round(pr.y),
      vx:pr.vx, vy:pr.vy, area:pr.area, secretEl:pr.secretEl,
    })),
    items:[...world.items.values()].map(serItem),
    npcs:[...world.npcs.values()].map(n=>({ id:n.id, type:n.type, name:n.name, color:n.color,
      x:Math.round(n.x), y:Math.round(n.y), phase:n.phase })),
    portals:G.portals,
    events:pendingEvents.splice(0),
    herbs:herbChanges.splice(0),
  });
}

/* ---------------- 客户端 ---------------- */
function handleClientData(d){
  if(!d || typeof d !== 'object') return;
  switch(d.type){
    case 'init': onInit(d); break;
    case 'snap': onSnapshot(d); break;
    case 'chat': addChat(d.name, d.text, d.id===G.selfId); bubbleFor(d.id, d.text, 'chat'); break;
    case 'sys': addSys(d.text, d.gold?'gold':''); break;
    case 'pong':
      if(d.t) G.ping = Math.max(1, Math.round(performance.now()-d.t));
      break;
  }
}

function onInit(d){
  G.seed = d.seed || G.seed;
  G.sectsOn = d.sectsOn !== false;
  generateWorld();
  world.players.clear(); world.mobs.clear(); world.herbs.clear();
  world.projectiles.clear(); world.items.clear();
  for(const p of d.players||[]) world.players.set(p.id, { ...p, renderX:p.x, renderY:p.y, inp:null });
  for(const m of d.mobs||[]) world.mobs.set(m.id, { ...m, renderX:m.x, renderY:m.y, homeX:m.x, homeY:m.y, attackCd:0 });
  for(const h of d.herbs||[]) world.herbs.set(h.id, { ...h });
  for(const it of d.items||[]) world.items.set(it.id, { ...it });
  world.npcs.clear();
  for(const n of d.npcs||[]) world.npcs.set(n.id, { ...n });
  G.portals = d.portals || [];
  G.selfId = d.you;
  const me = world.players.get(G.selfId);
  if(me){ G.pred = { x:me.x, y:me.y }; }
  G.isHost = false;
  G.netReady = true;
  G.roomName = d.room || G.roomName;
  startPlaying(false);
  addSys(`你踏入了「${G.roomName}」`, 'gold');
  addSys('按 '+bindLabel('meditate')+' 打坐纳气，'+bindLabel('gather')+' 采药，'+bindLabel('break')+' 破境，靠近传送门可入秘境');
}

function onSnapshot(d){
  const seen = new Set();
  for(const sp of d.players||[]){
    seen.add(sp.id);
    let p = world.players.get(sp.id);
    if(!p){
      p = { ...sp, renderX:sp.x, renderY:sp.y, inp:null };
      world.players.set(sp.id, p);
    }else{
      Object.assign(p, sp);
    }
    if(sp.id===G.selfId){
      const err = dist(G.pred.x,G.pred.y,sp.x,sp.y);
      if(err > 130){ G.pred.x = sp.x; G.pred.y = sp.y; }
      else{
        G.pred.x = lerp(G.pred.x, sp.x, 0.18);
        G.pred.y = lerp(G.pred.y, sp.y, 0.18);
      }
    }
  }
  for(const id of [...world.players.keys()]){
    if(!seen.has(id)) world.players.delete(id);
  }

  const mseen = new Set();
  for(const sm of d.mobs||[]){
    mseen.add(sm.id);
    let m = world.mobs.get(sm.id);
    if(!m){ m = { ...sm, renderX:sm.x, renderY:sm.y, homeX:sm.x, homeY:sm.y, attackCd:0 }; world.mobs.set(sm.id, m); }
    else Object.assign(m, sm);
  }
  for(const id of [...world.mobs.keys()]){
    if(!mseen.has(id)) world.mobs.delete(id);
  }

  world.projectiles.clear();
  for(const pr of d.projectiles||[]) world.projectiles.set(pr.id, { ...pr });

  for(const it of d.items||[]){
    const cur = world.items.get(it.id);
    if(cur) Object.assign(cur, it);
    else world.items.set(it.id, { ...it });
  }

  for(const h of d.herbs||[]){
    const cur = world.herbs.get(h.id);
    if(cur) Object.assign(cur, h);
    else world.herbs.set(h.id, { ...h });
  }

  if(d.portals) G.portals = d.portals;
  if(d.npcs){
    const nseen = new Set();
    for(const n of d.npcs){
      nseen.add(n.id);
      const cur = world.npcs.get(n.id);
      if(cur) Object.assign(cur, n);
      else world.npcs.set(n.id, { ...n });
    }
    for(const nid of [...world.npcs.keys()]) if(!nseen.has(nid)) world.npcs.delete(nid);
  }
  for(const ev of d.events||[]) applyEvent(ev);
}

/* ---------------- 启动联机 ---------------- */
function setLoginBusy(busy, text){
  $('createBtn').disabled = busy;
  $('joinBtn').disabled = busy;
  if(text) $('loginTip').textContent = text;
}
function resetLogin(text){
  setLoginBusy(false, text || '同一洞天的道友可在此界相遇 · 建议 2–8 人同修');
}
function failLogin(text){
  resetLogin(text);
  try{ if(peer){ peer.destroy(); peer=null; } }catch(e){}
  if(hostConn){ try{ hostConn.close(); }catch(e){} hostConn=null; }
}

function startNet(asHost){
  ensureAudio();
  if(typeof Peer === 'undefined'){
    resetLogin('PeerJS 加载失败，请检查网络后刷新页面');
    return;
  }
  const name = ($('nameInput').value||'').trim() || '无名散修';
  const room = ($('roomInput').value||'').trim() || '青云界';
  if(name.length > 10){ resetLogin('道号最多 10 个字'); return; }
  G.playerName = name;
  G.roomName = room;
  setLoginBusy(true, asHost ? '正在开辟洞天…' : '正在感应洞天…');

  const key = roomKey(room);

  if(asHost){
    peer = new Peer(key, { debug:0 });
    peer.on('open', ()=>{
      G.isHost = true;
      G.selfId = 'host';
      G.netReady = true;
      startPlaying(true);
    });
    peer.on('connection', setupHostConn);
    peer.on('error', err=>{
      const t = err && err.type;
      if(t==='unavailable-id' || t==='id-taken') failLogin('该洞天已有道友开辟，请直接「踏入洞天」或换个名字');
      else failLogin('开辟失败：'+(t||'网络异常'));
    });
  }else{
    peer = new Peer(undefined, { debug:0 });
    peer.on('open', id=>{
      G.selfId = id;
      hostConn = peer.connect(key, { reliable:true });
      let got = false;
      const timer = setTimeout(()=>{
        if(!got) failLogin('未找到该洞天，请确认名字，或由道友先「开辟洞天」');
      }, 9000);
      hostConn.on('open', ()=>{
        hostConn.send({ type:'join', name:G.playerName, gender:G.gender, root:G.root, control:G.control });
      });
      hostConn.on('data', d=>{
        got = true;
        clearTimeout(timer);
        handleClientData(d);
      });
      hostConn.on('close', ()=>{
        if(G.mode==='playing') showDisconnect('与洞天的联系已断开');
      });
      hostConn.on('error', ()=>{ if(!got) failLogin('连接洞天失败，请重试'); });
    });
    peer.on('error', err=>{
      const t = err && err.type;
      if(t==='peer-unavailable') failLogin('未找到该洞天，请确认名字');
      else if(!G.netReady) failLogin('连接失败：'+(t||'网络异常'));
    });
  }
}

function showDisconnect(text){
  $('disconnectTip').textContent = text || '与洞天的联系已断开';
  $('disconnect').classList.remove('hidden');
  G.netReady = false;
}

