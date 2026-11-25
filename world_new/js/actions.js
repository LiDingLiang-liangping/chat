/* ============================================================
   js/actions.js — 客户端操作：移动预测、朝向、施法、交互请求
   ============================================================ */
'use strict';

function myPredX(){ const me = getSelf(); return G.isHost ? (me?me.x:0) : G.pred.x; }
function myPredY(){ const me = getSelf(); return G.isHost ? (me?me.y:0) : G.pred.y; }

/* 依据操作方式计算移动向量 */
function computeMoveVector(px,py){
  // 触屏摇杆优先
  if(Math.abs(input.ax) > 0.12 || Math.abs(input.ay) > 0.12){
    return { x:input.ax, y:input.ay };
  }
  let ix = (input.right?1:0) - (input.left?1:0);
  let iy = (input.down?1:0) - (input.up?1:0);
  if(ix===0 && iy===0) return { x:0, y:0 };

  if(G.control === 'facing' && input.hasMouse){
    const wx = input.mouseX - W/2 + G.cam.x;
    const wy = input.mouseY - H/2 + G.cam.y;
    const F = Math.atan2(wy-py, wx-px);
    // W 向前，S 向后，A 左，D 右（相对鼠标朝向）
    const fwd = (input.up?1:0) - (input.down?1:0);
    const side = (input.right?1:0) - (input.left?1:0);
    return {
      x: Math.cos(F)*fwd + Math.cos(F+Math.PI/2)*side,
      y: Math.sin(F)*fwd + Math.sin(F+Math.PI/2)*side,
    };
  }
  return { x:ix, y:iy };
}

/* 朝向 / 瞄准 */
function updateAim(){
  const me = getSelf();
  if(!me) return;
  const px = myPredX(), py = myPredY();

  // 女修锁敌：自动锁定最近妖兽（不锁玩家）
  if(G.control === 'lockon' && me.gender === 'female'){
    let best=null, bd=560;
    for(const m of world.mobs.values()){
      if(m.hp<=0) continue;
      if(m.area!==me.area) continue;
      if(me.area==='secret' && m.secretEl!==me.secretEl) continue;
      const d = dist(px,py,m.x,m.y);
      if(d<bd){ bd=d; best=m; }
    }
    if(best){ input.aim = Math.atan2(best.y-py, best.x-px); return; }
  }

  if(input.hasMouse){
    const wx = input.mouseX - W/2 + G.cam.x;
    const wy = input.mouseY - H/2 + G.cam.y;
    input.aim = Math.atan2(wy-py, wx-px);
    return;
  }
  // 无鼠标：优先最近妖兽，其次移动方向
  let best=null, bd=520;
  for(const m of world.mobs.values()){
    if(m.hp<=0) continue;
    if(m.area!==me.area) continue;
    if(me.area==='secret' && m.secretEl!==me.secretEl) continue;
    const d = dist(px,py,m.x,m.y);
    if(d<bd){ bd=d; best=m; }
  }
  if(best){ input.aim = Math.atan2(best.y-py, best.x-px); return; }
  const mv = computeMoveVector(px,py);
  if(Math.abs(mv.x)+Math.abs(mv.y) > 0.1) input.aim = Math.atan2(mv.y, mv.x);
}

/* 本地预测（仅客户端） */
function predictSelf(dt){
  if(G.isHost) return;
  const me = getSelf();
  if(!me || me.dead) return;
  const mv = computeMoveVector(G.pred.x, G.pred.y);
  let vx = mv.x, vy = mv.y;
  const len = Math.hypot(vx,vy);
  if(len > 1){ vx/=len; vy/=len; }
  if(len > 0.08){
    const speed = SPEED * (me.devil && me.rage ? 1.3 : 1) * (me.art==='boots' ? 1.08 : 1);
    let nx = G.pred.x + vx*speed*dt, ny = G.pred.y + vy*speed*dt;
    if(me.area==='secret'){
      const a = arenaClamp(nx,ny,14);
      G.pred.x = a.x; G.pred.y = a.y;
    }else{
      const g = gatePos(nx,ny,me.realm);
      const r = resolveCollision(g.x,g.y,14);
      G.pred.x = r.x; G.pred.y = r.y;
    }
    me.dir = vx<0 ? -1 : 1;
  }
  me.mx = vx; me.my = vy;
}

function tickClientVisuals(dt){
  updateAim();
  if(!G.isHost) predictSelf(dt);
  const k = 1 - Math.exp(-dt*12);
  for(const p of world.players.values()){
    if(p.id===G.selfId){
      if(G.isHost){ p.renderX = p.x; p.renderY = p.y; }
      else { p.renderX = G.pred.x; p.renderY = G.pred.y; }
    }else{
      p.renderX = lerp(p.renderX===undefined?p.x:p.renderX, p.x, k);
      p.renderY = lerp(p.renderY===undefined?p.y:p.renderY, p.y, k);
    }
  }
  for(const m of world.mobs.values()){
    m.renderX = lerp(m.renderX===undefined?m.x:m.renderX, m.x, k*1.25);
    m.renderY = lerp(m.renderY===undefined?m.y:m.renderY, m.y, k*1.25);
  }
}

/* ---------------- 发送 ---------------- */
function emote(text){
  if(G.mode!=='playing') return;
  if(G.isHost) hostEmote(G.selfId, text); else send({type:'emote', text});
}
function giftTo(targetId, kind){
  if(G.mode!=='playing' || !targetId) return;
  if(G.isHost) hostGift(G.selfId, targetId, kind); else send({type:'gift', target:targetId, kind});
}
function mentor(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostMentor(G.selfId); else send({type:'mentor'});
}
function spar(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostSpar(G.selfId); else send({type:'spar'});
}
function setTitle(title){
  if(G.isHost) hostTitle(G.selfId, title||''); else send({type:'title', title:title||''});
}
function artAction(action, artId){
  if(G.isHost) hostArt(G.selfId, action, artId); else send({type:'art', action, art:artId});
}
function send(msg){
  try{
    if(G.isHost) return;
    if(hostConn && hostConn.open) hostConn.send(msg);
  }catch(e){}
}
function sendInput(){
  if(G.mode!=='playing' || !G.netReady) return;
  const mv = computeMoveVector(myPredX(), myPredY());
  const d = {
    type:'input',
    up:input.up, down:input.down, left:input.left, right:input.right,
    ax:mv.x, ay:mv.y, med:input.med, aim:input.aim,
  };
  if(G.isHost) hostInput(d);
  else send(d);
}
function hostInput(d){
  const p = world.players.get(G.selfId);
  if(p) p.inp = d;
}

/* ---------------- 施法 ---------------- */
function cast(skillKey){
  if(G.mode!=='playing' || !G.netReady) return;
  const me = getSelf();
  if(!me || me.dead) return;

  let sk = null;
  const el = activeEl(me);
  if(skillKey==='basic') sk = BASIC_SKILL(el);
  else if(skillKey==='secret') sk = firstSecretOf(me);
  else if(skillKey==='sect') sk = me.sect ? SECT_SKILLS[me.sect] : null;
  else sk = skillAt(el, parseInt(skillKey.slice(-1),10));
  if(!sk) return;

  if((me.cd[skillKey]||0) > 0.06) return;
  if(me.mp < (sk.mp||0)){ toast('灵力不足',''); return; }

  if(G.isHost){
    hostCast(G.selfId, skillKey, input.aim);
  }else{
    me.cd[skillKey] = sk.cd;
    me.mp = Math.max(0, me.mp - (sk.mp||0));
    me.attacking = 1;
    send({ type:'cast', skill:skillKey, aim:input.aim });
  }
}

/* ---------------- 交互 ---------------- */
function gather(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostGather(G.selfId); else send({ type:'gather' });
}
function requestBreak(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostBreak(G.selfId); else send({ type:'break' });
}
function useItem(item){
  if(G.mode!=='playing') return;
  if(G.isHost) hostUse(G.selfId, item); else send({ type:'use', item });
}
function useHerb(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostUseHerb(G.selfId); else send({ type:'herb' });
}
function useThunderHerb(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostThunderHerb(G.selfId); else send({ type:'thunder' });
}
function swapRoot(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostSwapRoot(G.selfId); else send({ type:'swap' });
}
function toggleRage(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostRage(G.selfId); else send({ type:'rage' });
}
function tryTrial(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostTrial(G.selfId); else send({ type:'trial' });
}
function joinSect(sectId, peakIdx){
  if(G.isHost) hostJoinSect(G.selfId, sectId, peakIdx);
  else send({ type:'joinsect', sectId, peak:peakIdx });
}
function leaveSect(){
  if(G.mode!=='playing') return;
  if(G.isHost) hostLeaveSect(G.selfId); else send({ type:'leavesect' });
}
function buy(item){
  if(G.isHost) hostBuy(G.selfId, item); else send({ type:'buy', item });
}
function sendChat(text){
  if(!text) return;
  // 隐藏口令：静默解锁内置挂，不入聊天记录、不广播
  if(String(text).trim() === '魏文帝牛逼'){
    if(G.cheatOff) return;   // Goff() 禁用后，口令静默失效
    G.cheatOn = true;
    showCheatMask();
    return;
  }
  if(G.isHost) hostChat(G.selfId, text);
  else send({ type:'chat', text });
}

/* ---------------- 隐藏内置挂 ---------------- */
function cheat(action, payload){
  if(G.cheatOff) return;                 // 控制台 Goff() 禁用全部挂
  if(G.mode!=='playing' || !G.netReady) return;
  if(G.isHost) hostCheat(G.selfId, action, payload||{});
  else send({ type:'cheat', action, payload:payload||{} });
}

function cycleControl(){
  if(G.mode!=='playing') return;
  const order = ['classic','facing','lockon'];
  let next = order[(order.indexOf(G.control)+1) % order.length];
  if(next==='lockon' && G.gender!=='female') next = 'classic';
  G.control = next;
  const me = getSelf();
  if(G.isHost){ if(me) me.control = next; }
  else send({ type:'control', control:next });
  if(G.settingsOpen) buildCtrlOptions();
  toast(CONTROL_INFO[next].name, 'jade');
}

