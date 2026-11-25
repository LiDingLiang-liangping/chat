/* ============================================================
   js/ui.js — 登录选择、HUD、技能栏、草药面板、宗门面板、提示与聊天
   ============================================================ */
'use strict';

/* ---------------- 登录界面选择 ---------------- */
function bindLoginUI(){
  // 以界面当前高亮项为准，避免默认值不一致
  const actGender = document.querySelector('#genderPick .pick.active');
  if(actGender) G.gender = actGender.dataset.gender;
  const actRoot = document.querySelector('#rootPick .pick.active');
  if(actRoot) G.root = actRoot.dataset.el;
  const actCtrl = document.querySelector('#ctrlPick .ctrl.active');
  if(actCtrl) G.control = actCtrl.dataset.ctrl;
  if($('sectToggle')) G.sectsOn = $('sectToggle').checked;

  document.querySelectorAll('#genderPick .pick').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('#genderPick .pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      G.gender = btn.dataset.gender;
      const lock = $('lockCtrl');
      if(G.gender === 'male'){
        lock.classList.add('muted');
        if(G.control === 'lockon'){ G.control = 'classic'; syncCtrlUI(); }
      }else{
        lock.classList.remove('muted');
      }
    };
  });

  document.querySelectorAll('#rootPick .pick').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('#rootPick .pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      G.root = btn.dataset.el;
    };
  });

  document.querySelectorAll('#ctrlPick .ctrl').forEach(btn=>{
    btn.onclick = ()=>{
      if(btn.dataset.ctrl==='lockon' && G.gender!=='female'){
        toast('灵觉锁敌为女修专属','');
        return;
      }
      document.querySelectorAll('#ctrlPick .ctrl').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      G.control = btn.dataset.ctrl;
    };
  });

  $('sectToggle').onchange = ()=>{ G.sectsOn = $('sectToggle').checked; };

  // 默认女性/男性互斥提示
  if(G.gender==='male') $('lockCtrl').classList.add('muted');
}
function syncCtrlUI(){
  document.querySelectorAll('#ctrlPick .ctrl').forEach(b=>{
    b.classList.toggle('active', b.dataset.ctrl===G.control);
  });
}

/* 登录页「操作与玩法」随当前键位生成 */
function renderLoginHelp(){
  const body = $('helpBody');
  if(!body) return;
  const k = bindLabel;
  body.innerHTML =
    '<b>移动</b>：'+k('moveUp')+' / '+k('moveLeft')+' / '+k('moveDown')+' / '+k('moveRight')+' 或方向键，移动端左下摇杆<br>'+
    '<b>战斗</b>：'+k('basic')+' 普攻；'+k('s1')+'–'+k('s9')+' 九式五行技能（6–7 回血、8–9 遁术）<br>'+
    '<b>秘法</b>：'+k('secret')+' 秘境秘法，'+k('sect')+' 宗门秘法（需先习得）<br>'+
    '<b>修行</b>：'+k('meditate')+' 打坐纳气，'+k('gather')+' 采草药；'+k('herb')+' 服草药，'+k('thunder')+' 服雷草引雷劫<br>'+
    '<b>破境</b>：修为满后按 '+k('break')+' 突破，失败损失三成修为<br>'+
    '<b>宗门</b>：靠近山门按 '+k('trial')+' 试炼；入宗后按 '+k('leaveSect')+' 退宗；'+k('rage')+' 魔鬼狂暴<br>'+
    '<b>坊市</b>：走到青云坊市按 '+k('shop')+' 交易丹药与草药，也可用碎片炼制法宝<br>'+
    '<b>切磋</b>：靠近道友按 '+k('spar')+' 发邀请，对方再按 '+k('spar')+' 应战；45 秒点到为止，不积煞气<br>'+
    '<b>法宝</b>：斩妖掉落碎片，3 碎片 + 200 灵石炼一件，只能佩一件（攻击／气血／移速）<br>'+
    '<b>奇遇</b>：第二、三环偶现光柱奇人，走近即得赠礼<br>'+
    '<b>称号</b>：达成成就自动获称号，设置面板里可任选一个佩戴<br>'+
    '<b>社交</b>：聊天会在头顶冒气泡；聊天栏下可作揖 / 抱拳 / 挥手 / 鼓掌 / 大笑；「赠礼」把丹药、碎片送给道友；靠近境界差一辈的道友按 '+k('mentor')+' 结师徒<br>'+
    '<b>聊天</b>：'+k('chat')+' 输入并发送<br>'+
    '<b>设置</b>：进游戏后点右上角 ⚙ 或按 '+k('settings')+'，可改键位、切换操作方式、重看新手教程';
}

/* ---------------- 聊天 / 提示 ---------------- */
function toast(text, cls){
  const d = document.createElement('div');
  d.className = 'toast ' + (cls||'');
  d.textContent = text;
  $('toasts').appendChild(d);
  setTimeout(()=>d.remove(), 3200);
}
function addChat(name, text, self){
  const box = $('chatLog');
  const d = document.createElement('div');
  d.className = 'cm' + (self?' self':'');
  const b = document.createElement('b');
  b.textContent = name + '：';
  d.appendChild(b);
  d.appendChild(document.createTextNode(text));
  box.appendChild(d);
  while(box.children.length > 60) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function addSys(text, cls){
  const box = $('chatLog');
  const d = document.createElement('div');
  d.className = 'sys ' + (cls||'');
  d.textContent = '· ' + text;
  box.appendChild(d);
  while(box.children.length > 60) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

/* ---------------- 技能栏 ---------------- */
let dockSig = '';
function buildSkillDock(me){
  const el = activeEl(me);
  const secret = firstSecretOf(me);
  const sig = [el, me.activeRoot, !!secret, me.sect, me.root.length].join('|')
            + (secret?secret.name:'') + '|' + BIND_ACTIONS.map(a=>BINDS[a.id]).join(',');
  if(sig === dockSig) return;
  dockSig = sig;

  const list = [];
  list.push({ key:'basic', icon:'⚔', name:'普攻', keyLabel:bindLabel('basic'), cls:'basic' });
  ELEMENT_SKILLS[el].forEach((sk,i)=>{
    list.push({ key:sk.key, icon:sk.icon, name:sk.name, keyLabel:bindLabel('s'+(i+1)), cls:'' });
  });
  if(secret){
    list.push({ key:'secret', icon:'✵', name:secret.name, keyLabel:bindLabel('secret'), cls:'secret' });
  }
  if(me.sect){
    const ss = SECT_SKILLS[me.sect];
    list.push({ key:'sect', icon:'⚚', name:ss.name, keyLabel:bindLabel('sect'), cls:'sect' });
  }

  const dock = $('skillDock');
  dock.innerHTML = '';
  for(const s of list){
    const d = document.createElement('div');
    d.className = 'skill ' + s.cls;
    d.dataset.skill = s.key;
    d.innerHTML = '<span class="key">'+s.keyLabel+'</span><span class="ic">'+s.icon+'</span><span class="nm">'+s.name+'</span><span class="cd"></span>';
    d.onclick = ()=>cast(s.key);
    dock.appendChild(d);
  }

  // 移动端技能键
  const mob = $('mobileSkills');
  mob.innerHTML = '';
  for(const s of list){
    const b = document.createElement('div');
    b.className = 'ms';
    b.dataset.skill = s.key;
    b.innerHTML = s.icon + '<span class="mk">'+s.keyLabel+'</span>';
    b.addEventListener('pointerdown', e=>{ e.preventDefault(); cast(s.key); });
    mob.appendChild(b);
  }
}

/* ---------------- HUD ---------------- */
function updateHUD(){
  if(G.mode!=='playing') return;
  const me = getSelf();
  if(!me) return;

  const hpPct = clamp(me.hp/me.maxHp,0,1)*100;
  const mpPct = clamp(me.mp/me.maxMp,0,1)*100;
  const expPct = clamp(me.exp/me.expMax,0,1)*100;
  const grPct = clamp((me.grudge||0)/100,0,1)*100;
  $('hpBar').style.width = hpPct+'%';
  $('mpBar').style.width = mpPct+'%';
  $('expBar').style.width = expPct+'%';
  $('grudgeBar').style.width = grPct+'%';
  $('hpNum').textContent = Math.round(me.hp)+'/'+me.maxHp;
  $('mpNum').textContent = Math.round(me.mp)+'/'+me.maxMp;
  $('expNum').textContent = Math.round(me.exp)+'/'+me.expMax;
  $('grudgeText').textContent = Math.round(me.grudge||0)+'/100';

  $('realmBadge').textContent = me.realmName;
  $('rootBadge').textContent = me.root.map(elName).join('·')+'灵根';
  $('stateBadge').classList.toggle('hidden', !me.devil);
  $('stones').textContent = me.stones;
  $('herbs').textContent = Object.values(me.herbInv||{}).reduce((a,b)=>a+(b||0),0);
  $('grudgeNum').textContent = Math.round(me.grudge||0);
  $('shards').textContent = me.shards||0;
  $('online').textContent = world.players.size;
  $('ping').textContent = G.isHost ? '房主' : (G.ping?G.ping+' ms':'-- ms');

  const x = G.isHost ? me.x : G.pred.x;
  const y = G.isHost ? me.y : G.pred.y;

  if(me.area === 'secret'){
    $('zoneName').textContent = SECRET_NAMES[me.secretEl] || '秘境';
    $('zoneDensity').textContent = '杀气森然 · 秘境';
  }else{
    const z = zoneInfoAt(x,y);
    $('zoneName').textContent = z.name;
    $('zoneDensity').textContent = '灵气 ×'+(densityAt(x,y)||1).toFixed(1)+(z.safe?' · 安全':' · 危险');
  }

  if(me.meditating) G.quests.meditated = true;

  // 技能冷却
  document.querySelectorAll('#skillDock .skill').forEach(el=>{
    const sk = el.dataset.skill;
    let cd = me.cd[sk]||0, mp = 0;
    if(sk==='basic') mp = 0;
    else if(sk==='secret'){ const s=firstSecretOf(me); mp = s?s.mp:0; }
    else if(sk==='sect'){ const s=me.sect?SECT_SKILLS[me.sect]:null; mp = s?s.mp:0; }
    else mp = (skillAt(activeEl(me), parseInt(sk.slice(-1),10))||{}).mp||0;
    const cdEl = el.querySelector('.cd');
    if(cd > 0.05){
      el.classList.add('cooling');
      cdEl.textContent = cd>=1 ? Math.ceil(cd) : cd.toFixed(1);
    }else{
      el.classList.remove('cooling');
    }
    el.classList.toggle('no-mp', mp > me.mp);
  });

  // 任务
  const qs = [
    { t:'入世修行', d:'按 R 打坐，吸纳灵气', done:G.quests.meditated },
    { t:'初试锋芒', d:'击败一只妖兽', done:me.kills>=1 },
    { t:'采药炼丹', d:'采集 3 株草药', done:me.gathered>=3 },
    { t:'引气入体', d:'突破至炼气二层', done:me.realm>=1 },
    { t:'秘境探幽', d:'踏入任意秘境', done:!!G.quests.revealedSecret },
  ];
  const ul = $('questList');
  ul.innerHTML = '';
  for(const q of qs){
    const li = document.createElement('li');
    if(q.done) li.className = 'done';
    const b = document.createElement('b'); b.textContent = q.t;
    li.appendChild(b);
    li.appendChild(document.createTextNode(q.d));
    ul.appendChild(li);
  }

  // 死亡 / 雷劫
  // 技能栏随灵根/秘法/宗门变化重建
  buildSkillDock(me);

  if(me.dead){
    $('deathOverlay').classList.remove('hidden');
    const left = me.respawnAt ? Math.max(0, Math.ceil((me.respawnAt-Date.now())/1000)) : (me.respawnIn||0);
    $('deathTip').textContent = left>0 ? `${left} 秒后于青云村复生` : '魂魄正在归位…';
  }else{
    $('deathOverlay').classList.add('hidden');
  }
  const tribOn = !!me.trib;
  $('tribOverlay').classList.toggle('hidden', !tribOn);
  if(tribOn) $('tribCount').textContent = Math.max(0, (me.trib.total||10) - (me.trib.hit||0));

  // 坊市按钮
  const inFair = me.area!=='secret' && zoneInfoAt(x,y).name === '青云坊市';
  $('shopBtn').classList.toggle('hidden', !inFair || G.shopOpen);
  if(!inFair && G.shopOpen) closeShop();

  // 草药面板
  const hp = $('herbPanel');
  const inv = me.herbInv || {};
  let chips = '';
  for(const el of EL_LIST){
    chips += `<span class="herb-chip ${inv[el]?'':'zero'}" data-el="${el}">${elName(el)} ${inv[el]||0}</span>`;
  }
  chips += `<span class="herb-chip ${inv.thunder?'':'zero'}" data-el="thunder">雷 ${inv.thunder||0}</span>`;
  hp.innerHTML = `<div class="panel-title">草药囊</div><div class="herb-row">${chips}</div>
    <div class="herb-tip">${bindLabel('herb')} 服药（相生属性回血更厚） · ${bindLabel('thunder')} 服雷草引雷劫</div>`;
  hp.querySelectorAll('.herb-chip').forEach(c=>{
    c.onclick = ()=>{ if(c.dataset.el==='thunder') useThunderHerb(); else useHerb(); };
  });

  // 宗门卡片
  if(me.sect){
    const s = SECT_BY_ID[me.sect];
    const pk = s.peaks[me.sectPeak] || s.peaks[0];
    $('sectCard').classList.remove('hidden');
    $('sectName').textContent = s.name;
    $('sectPeakInfo').textContent = pk.name + ' · ' + pk.elder + ' · 灵气 ×' + pk.dens;
  }else{
    $('sectCard').classList.add('hidden');
  }

  updateHint(me, x, y);
  tutorialTick(me, x, y);
}

function mentorCandidate(me){
  for(const o of world.players.values()){
    if(o.id===me.id || o.dead) continue;
    if(o.area!==me.area) continue;
    if(dist(me.x,me.y,o.x,o.y) > 240) continue;
    if(o.masterId || o.apprenticeId) continue;
    if((me.realm>=9 && o.realm<=8) || (me.realm<=8 && o.realm>=9)) return true;
  }
  return false;
}
function updateHint(me, x, y){
  let hint = '';
  // 奇遇 NPC 优先
  let nearNpc = null;
  for(const n of world.npcs.values()){
    if(n.area==='secret') continue;
    if(dist(x,y,n.x,n.y) < 100) nearNpc = n;
  }
  const invited = [...world.players.values()].find(o=>o.sparInvite===G.selfId && Date.now()-o.sparInviteAt<10000);
  if(me.sparWith) hint = '切磋中 · '+bindLabel('spar')+' 认输收手';
  else if(me.area === 'secret'){
    hint = '走到南侧「归途」门可返回青云界';
  }else if(nearNpc){
    hint = '走近'+nearNpc.name+'（流光处）可获赠礼';
  }else if(invited){
    hint = invited.name+' 邀你切磋，按 '+bindLabel('spar')+' 应战';
  }else if(!me.masterId && !me.apprenticeId && mentorCandidate(me)){
    hint = '附近道友辈分有别，按 '+bindLabel('mentor')+' 收徒 / 拜师';
  }else{
    const site = sectSiteAt(x,y);
    if(site && !me.sect && G.sectsOn) hint = '按 '+bindLabel('trial')+' 接受'+site.sect.name+'试炼';
    else if(me.devil) hint = bindLabel('rage')+' 开关狂暴 · 魔鬼只能杀戮妖兽';
    else {
      let nearPortal = null;
      for(const pt of G.portals) if(dist(x,y,pt.x,pt.y)<120) nearPortal = pt;
      if(nearPortal) hint = '走近'+SECRET_NAMES[nearPortal.el]+'传送门即可踏入';
      else if(zoneInfoAt(x,y).name==='青云坊市') hint = '按 '+bindLabel('shop')+' 打开坊市';
      else if(nearestPlayer(me, 180)) hint = '按 '+bindLabel('spar')+' 与最近道友切磋';
      else if(me.herbInv && me.herbInv.thunder>0) hint = bindLabel('thunder')+' 服雷草，主动引动雷劫';
      else if(me.hp < me.maxHp*0.5 && Object.values(me.herbInv||{}).some(v=>v>0)) hint = bindLabel('herb')+' 服草药回血';
      else if(me.root.length>1) hint = bindLabel('swap')+' 切换灵根（'+elName(me.root[0])+' / '+elName(me.root[1])+'）';
    }
  }
  if(hint !== G.lastHint){
    G.lastHint = hint;
    const bar = $('hintBar');
    bar.textContent = hint;
    bar.classList.toggle('hidden', !hint);
  }
}

let onlineTick = 0;
function updateOnline(){
  const ul = $('onlineList');
  const arr = [...world.players.values()].sort((a,b)=> b.realm-a.realm || a.name.localeCompare(b.name));
  ul.innerHTML = '';
  for(const p of arr){
    const li = document.createElement('li');
    if(p.id===G.selfId) li.className = 'me';
    const dot = document.createElement('span'); dot.className='dot';
    const nm = document.createElement('span'); nm.className='nm';
    nm.textContent = p.name + (p.id===G.selfId?'（你）':'');
    const rl = document.createElement('span'); rl.className='rl'; rl.textContent = p.realmName;
    li.appendChild(dot); li.appendChild(nm);
    if(p.title){
      const tb = document.createElement('span'); tb.className='eb';
      tb.textContent = '「'+p.title+'」';
      tb.style.color = '#e8cf8a';
      li.appendChild(tb);
    }
    if(p.masterName){
      const mb = document.createElement('span'); mb.className='eb';
      mb.textContent = '师从'+p.masterName; mb.style.color = '#8fa9c9';
      li.appendChild(mb);
    }
    if(p.apprenticeName){
      const mb = document.createElement('span'); mb.className='eb';
      mb.textContent = '徒'+p.apprenticeName; mb.style.color = '#9fd3b8';
      li.appendChild(mb);
    }
    if(p.sect){
      const eb = document.createElement('span'); eb.className='eb';
      eb.textContent = SECT_BY_ID[p.sect].name;
      eb.style.color = SECT_BY_ID[p.sect].color;
      li.appendChild(eb);
    }
    if(p.devil){
      const eb = document.createElement('span'); eb.className='eb'; eb.textContent='魔';
      eb.style.color = '#c9b8ff';
      li.appendChild(eb);
    }
    li.appendChild(rl);
    ul.appendChild(li);
  }
}

/* ---------------- 坊市 / 宗门面板 ---------------- */
function buildArtList(){
  const box = $('artList');
  if(!box) return;
  const me = getSelf();
  if(!me){ box.innerHTML=''; return; }
  box.innerHTML = '';
  for(const d of ART_DEFS){
    const owned = (me.arts||[]).indexOf(d.id) >= 0;
    const equipped = me.art === d.id;
    const row = document.createElement('div');
    row.className = 'shop-item';
    const si = document.createElement('div');
    si.className = 'si';
    si.textContent = equipped ? '✦' : (owned ? '◇' : '◆');
    const info = document.createElement('div');
    info.className = 'info';
    const t = document.createElement('div'); t.className = 't';
    t.textContent = d.name + (equipped ? ' · 佩戴中' : '');
    const sub = document.createElement('div'); sub.className = 'd';
    sub.textContent = owned ? d.desc : `${d.desc} · 碎片 ${me.shards||0}/${ART_COST_SHARD} 灵石 ${me.stones}/${ART_COST_STONE}`;
    info.appendChild(t); info.appendChild(sub);
    const btn = document.createElement('button');
    let act = 'craft', label = '炼制';
    if(equipped){ act = 'unequip'; label = '卸下'; }
    else if(owned){ act = 'equip'; label = '佩戴'; }
    if(act === 'craft' && ((me.shards||0) < ART_COST_SHARD || me.stones < ART_COST_STONE)) label = '材料不足';
    btn.textContent = label;
    btn.onclick = ()=>{ artAction(act, d.id); setTimeout(()=>{ buildArtList(); updateHUD(); }, 200); };
    row.appendChild(si); row.appendChild(info); row.appendChild(btn);
    box.appendChild(row);
  }
}

function buildAchList(){
  const box = $('achList');
  if(!box) return;
  const me = getSelf();
  if(!me){ box.innerHTML=''; return; }
  box.innerHTML = '';
  for(const a of ACH_DEFS){
    const got = (me.ach||[]).indexOf(a.id) >= 0;
    const cur = me.title === a.title;
    const row = document.createElement('div');
    row.className = 'ach-row' + (got ? ' on' : '');
    const info = document.createElement('div'); info.className = 'info';
    const it = document.createElement('div'); it.className='it'; it.textContent = a.name;
    const id = document.createElement('div'); id.className='id';
    id.innerHTML = '<b>「'+a.title+'」</b> · ' + a.desc;
    info.appendChild(it); info.appendChild(id);
    const btn = document.createElement('button');
    btn.textContent = cur ? '佩戴中' : (got ? '佩戴' : '未达成');
    btn.disabled = !got || cur;
    btn.onclick = ()=>{ setTitle(a.title); setTimeout(()=>{ buildAchList(); updateHUD(); }, 150); };
    row.appendChild(info); row.appendChild(btn);
    box.appendChild(row);
  }
  const row = document.createElement('div');
  row.className = 'ach-row' + (me.title ? '' : ' on');
  const info = document.createElement('div'); info.className='info';
  const it = document.createElement('div'); it.className='it'; it.textContent='不佩称号';
  const id = document.createElement('div'); id.className='id'; id.textContent='保持本名，名前不显示称号';
  info.appendChild(it); info.appendChild(id);
  const btn = document.createElement('button');
  btn.textContent = me.title ? '卸下' : '当前';
  btn.disabled = !me.title;
  btn.onclick = ()=>{ setTitle(''); setTimeout(()=>{ buildAchList(); updateHUD(); }, 150); };
  row.appendChild(info); row.appendChild(btn);
  box.appendChild(row);
}

function buildGiftList(){
  const box = $('giftList');
  if(!box) return;
  const me = getSelf();
  if(!me){ box.innerHTML=''; return; }
  const others = [...world.players.values()].filter(p=>p.id!==me.id);
  if(!others.length){
    box.innerHTML = '<div class="gift-empty">洞天里还没有其他道友</div>';
    return;
  }
  box.innerHTML = '';
  for(const p of others){
    const row = document.createElement('div');
    row.className = 'shop-item';
    const si = document.createElement('div'); si.className='si'; si.textContent = '🎁';
    const info = document.createElement('div'); info.className='info';
    const t = document.createElement('div'); t.className='t'; t.textContent = p.name;
    const d = document.createElement('div'); d.className='d';
    d.textContent = p.realmName + (p.masterName?' · 师从'+p.masterName:'') + (p.apprenticeName?' · 收徒'+p.apprenticeName:'');
    info.appendChild(t); info.appendChild(d);
    const wrap = document.createElement('div');
    const opts = [
      { kind:'heal',  label:'💊', n:me.pillsHeal||0 },
      { kind:'exp',   label:'🔮', n:me.pillsExp||0 },
      { kind:'shard', label:'◆',  n:me.shards||0 },
    ];
    for(const o of opts){
      const b = document.createElement('button');
      b.className='gbtn'; b.textContent = o.label + ' ' + o.n;
      b.disabled = o.n < 1;
      b.title = {heal:'赠回春丹',exp:'赠聚气丹',shard:'赠法宝碎片'}[o.kind];
      b.onclick = ()=>{ giftTo(p.id, o.kind); setTimeout(()=>{ buildGiftList(); updateHUD(); }, 180); };
      wrap.appendChild(b);
    }
    row.appendChild(si); row.appendChild(info); row.appendChild(wrap);
    box.appendChild(row);
  }
}
function openGift(){
  if(G.mode!=='playing') return;
  closeShop();
  G.giftOpen = true;
  $('giftPanel').classList.remove('hidden');
  buildGiftList();
}
function closeGift(){
  G.giftOpen = false;
  $('giftPanel').classList.add('hidden');
}

function openShop(){ G.shopOpen = true; buildArtList(); $('shopPanel').classList.remove('hidden'); $('shopBtn').classList.add('hidden'); }
function closeShop(){ G.shopOpen = false; $('shopPanel').classList.add('hidden'); }
function toggleShop(){
  if(G.mode!=='playing') return;
  const me = getSelf(); if(!me) return;
  const x = G.isHost?me.x:G.pred.x, y = G.isHost?me.y:G.pred.y;
  if(me.area==='secret' || zoneInfoAt(x,y).name!=='青云坊市'){ toast('需走到青云坊市',''); return; }
  if(G.shopOpen) closeShop(); else openShop();
}

function openSectPanel(sectId){
  const sect = SECT_BY_ID[sectId];
  if(!sect) return;
  G.sectOpen = true;
  $('sectPanel').classList.remove('hidden');
  $('sectPanelTitle').textContent = sect.name + ' · 择峰';
  $('sectPanelSub').textContent = sect.desc;
  const box = $('sectPeakList');
  box.innerHTML = '';
  sect.peaks.forEach((pk,i)=>{
    const row = document.createElement('div');
    row.className = 'peak-item';
    row.innerHTML = `<div class="pi"><div class="pt">${pk.name} · ${pk.elder}${pk.main?'（主长老）':''}</div>
      <div class="pd">山头灵气 ×${pk.dens} · ${pk.main?'必定接纳':'可能婉拒'}</div></div>
      <span class="pdens">灵气 ×${pk.dens}</span>`;
    const btn = document.createElement('button');
    btn.textContent = '拜入';
    btn.onclick = ()=>{ joinSect(sectId, i); closeSectPanel(); };
    row.appendChild(btn);
    box.appendChild(row);
  });
}
function closeSectPanel(){ G.sectOpen = false; $('sectPanel').classList.add('hidden'); }

/* ---------------- 开局 ---------------- */
function startPlaying(isHost){
  G.mode = 'playing';
  $('login').classList.add('hidden');
  $('hud').classList.remove('hidden');

  if(!loopsStarted){
    loopsStarted = true;
    setInterval(sendInput, 50);
    setInterval(()=>{ if(G.mode==='playing') updateHUD(); }, 120);
    setInterval(()=>{ if(G.mode==='playing') updateOnline(); }, 600);
    setInterval(()=>{
      if(G.mode==='playing' && !G.isHost && hostConn && hostConn.open){
        send({type:'ping', t:performance.now()});
      }
    }, 2500);
  }

  if(isHost){
    G.isHost = true;
    initHostWorld();
    startSimLoop();
    setInterval(broadcastSnapshot, SNAP_MS);
    addSys(`洞天「${G.roomName}」已开辟，等待道友踏入`, 'gold');
    const me = getSelf();
    if(me && me.root.length>1){
      toast('天成双灵根！同时拥有'+me.root.map(elName).join('、')+'双属性','thunder');
    }
  }
  const me = getSelf();
  if(me) buildSkillDock(me);
  addSys('按 '+bindLabel('meditate')+' 打坐纳气，'+bindLabel('gather')+' 采药，'+bindLabel('break')+' 破境，'+bindLabel('settings')+' 打开设置','');
  if(!tutorialSeen()) setTimeout(()=>{ if(G.mode==='playing' && !tutOn) startTutorial(); }, 900);
}

/* ---------------- 设置面板：操作方式 / 键位绑定 ---------------- */
G.settingsOpen = false;

function toggleSettings(){
  if(G.mode!=='playing') return;
  if(G.settingsOpen) closeSettings(); else openSettings();
}
function openSettings(){
  if(G.mode!=='playing') return;
  cancelRebind();
  G.settingsOpen = true;
  $('settingsPanel').classList.remove('hidden');
  $('settingsPanel').scrollTop = 0;
  buildSettingsPanel();
  if(tutOn){ $('tutorialBox').classList.add('hidden'); G.tutPausedBySettings = true; }
}
function closeSettings(){
  if(!G.settingsOpen) return;
  cancelRebind();
  G.settingsOpen = false;
  $('settingsPanel').classList.add('hidden');
  if(tutOn && G.tutPausedBySettings){
    G.tutPausedBySettings = false;
    $('tutorialBox').classList.remove('hidden');
    renderTutorial();
  }
}
function buildSettingsPanel(){
  buildCtrlOptions();
  buildFFRow();
  buildAchList();
  buildBindList();
}

/* 友伤开关：关闭时自己的群攻 / 飞剑不再波及其他道友 */
function readFFSetting(){
  try{ return localStorage.getItem('qw_ff_v1')==='1'; }catch(e){ return false; }
}
function buildFFRow(){
  const b = $('ffToggle');
  if(!b) return;
  b.textContent = G.ff ? '开启' : '关闭';
  b.onclick = toggleFF;
}
function toggleFF(){
  G.ff = !G.ff;
  try{ localStorage.setItem('qw_ff_v1', G.ff?'1':'0'); }catch(e){}
  const me = getSelf();
  if(me) me.ff = G.ff;
  if(!G.isHost) send({type:'ff', on:G.ff});
  buildFFRow();
  toast('友伤：'+(G.ff?'开启（会伤到道友）':'关闭（不会伤到道友）'), G.ff?'thunder':'jade');
}

/* 操作方式三选一（与登录页同一套模式） */
function buildCtrlOptions(){
  const box = $('ctrlOptions');
  box.innerHTML = '';
  ['classic','facing','lockon'].forEach(key=>{
    const info = CONTROL_INFO[key];
    const blocked = !!info.femaleOnly && G.gender !== 'female';
    const row = document.createElement('div');
    row.className = 'ctrl-opt' + (G.control===key?' active':'') + (blocked?' muted':'');
    row.innerHTML = '<span class="co-dot"></span><div><div class="co-t">'+info.name
      + (info.femaleOnly?' · 女修专属':'') + '</div><div class="co-d">'+info.desc+'</div></div>';
    row.onclick = ()=>{
      if(blocked){ toast('灵觉锁敌为女修专属',''); return; }
      setControlMode(key);
    };
    box.appendChild(row);
  });
}
function setControlMode(key){
  if(!CONTROL_INFO[key]) return;
  if(key==='lockon' && G.gender!=='female'){ toast('灵觉锁敌为女修专属',''); return; }
  G.control = key;
  const me = getSelf();
  if(me) me.control = key;
  if(!G.isHost) send({ type:'control', control:key });
  syncCtrlUI();
  buildCtrlOptions();
  toast('操作方式：'+CONTROL_INFO[key].name,'jade');
}

/* 键位列表 */
function buildBindList(){
  const box = $('bindList');
  box.innerHTML = '';
  let group = '';
  for(const a of BIND_ACTIONS){
    if(a.group !== group){
      group = a.group;
      const h = document.createElement('div');
      h.className = 'set-sec';
      h.textContent = group;
      box.appendChild(h);
    }
    const row = document.createElement('div');
    row.className = 'bind-row';
    const nm = document.createElement('span');
    nm.className = 'bn';
    nm.textContent = a.name;
    const btn = document.createElement('button');
    btn.className = 'bk' + (rebindingId===a.id?' waiting':'');
    btn.textContent = rebindingId===a.id ? '按下新键…' : keyLabel(BINDS[a.id]);
    btn.onclick = ()=> startRebind(a.id);
    row.appendChild(nm);
    row.appendChild(btn);
    box.appendChild(row);
  }
}
function startRebind(id){
  if(!BIND_ACTIONS.some(a=>a.id===id)) return;
  rebindingId = id;
  buildBindList();
}
function cancelRebind(){
  if(!rebindingId) return;
  rebindingId = null;
  if(G.settingsOpen) buildBindList();
}
function handleRebindKey(e){
  try{ e.preventDefault(); }catch(err){}
  const id = rebindingId;
  if(!id) return;
  if(e.code==='Escape'){ rebindingId = null; buildBindList(); return; }
  const code = e.code || '';
  if(!code || /^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(code)){ toast('这个键不能绑定',''); return; }
  const owner = bindOwner(code, id);
  if(owner){ toast('该键已被「'+owner+'」占用',''); return; }
  BINDS[id] = code;
  saveBinds();
  rebindingId = null;
  buildBindList();
  dockSig = '';
  toast('已绑定：'+bindName(id)+' → '+keyLabel(code),'jade');
}
function resetBinds(){
  BINDS = Object.assign({}, DEFAULT_BINDS);
  saveBinds();
  rebindingId = null;
  buildBindList();
  dockSig = '';
  toast('键位已恢复默认','jade');
}

/* ---------------- 新手教程 ---------------- */
const TUT_STORE_KEY = 'qw_tutorial_done_v1';
let tutOn = false, tutIdx = 0, tutMoveFrom = null, tutMoveTicks = 0;

function tutorialSeen(){
  try{ return localStorage.getItem(TUT_STORE_KEY)==='1'; }catch(e){ return false; }
}
function markTutorialSeen(){
  try{ localStorage.setItem(TUT_STORE_KEY,'1'); }catch(e){}
}
function tutSteps(){
  const k = bindLabel;
  return [
    { t:'欢迎来到青云问道',
      d:'这是同心四环的修仙世界：越靠外的环，妖兽越强、灵气越浓。境界决定你能走多远——炼气期只能在前两环活动，筑基后开第三环，金丹后才进得了第四环。' },
    { t:'先学会走路',
      d:k('moveUp')+' / '+k('moveLeft')+' / '+k('moveDown')+' / '+k('moveRight')+' 移动，鼠标决定攻击方向。想改键或换操作方式，按 '+k('settings')+' 打开设置即可。',
      auto:'move' },
    { t:'打坐纳气',
      d:'按 '+k('meditate')+' 打坐，原地吸纳灵气：脚下灵气越浓，修为涨得越快；一旦移动就会中断。',
      auto:'med' },
    { t:'采集草药',
      d:'走到草药旁按 '+k('gather')+' 采集；按 '+k('herb')+' 服用，同时回气血与灵力。与自身灵根相生的草药效果更好。',
      auto:'gather' },
    { t:'第一次出手',
      d:'按 '+k('basic')+' 普攻，'+k('s1')+'–'+k('s9')+' 是九式五行技能（6–7 回血、8–9 遁术）。五行相克时伤害 +35%，被克则减半。',
      auto:'kill' },
    { t:'破境',
      d:'修为条满后按 '+k('break')+' 破境。境界越高成功率越低，失败会损失三成修为，先攒够再点。' },
    { t:'坊市与宗门',
      d:'走到青云坊市按 '+k('shop')+' 买卖丹药与草药；靠近宗门山门按 '+k('trial')+' 试炼，入宗后按 '+k('sect')+' 放宗门秘法。' },
    { t:'秘境与雷劫',
      d:'金色传送门每半分钟到一分钟随机换位，踏入即进入对应五行的秘境，击败 BOSS 可习得秘境秘法。主动攻击道友会积累煞气，满 100 会引来雷劫，出手前想清楚。' },
    { t:'与道友同行',
      d:'按 '+k('settings')+' 进设置 → 战斗 → 友伤（默认关闭）：关闭时群攻与飞剑不会伤到身边道友，切磋照常。要主动斗法再打开，击杀道友积的煞气更多。' },
    { t:'出发吧',
      d:'教程结束。按 '+k('settings')+' 可随时查看或修改键位，祝道友早日化神。' },
  ];
}
function startTutorial(){
  tutOn = true;
  tutIdx = 0;
  tutMoveFrom = null; tutMoveTicks = 0;
  if(G.settingsOpen){            // 设置面板优先，关闭后再显示教程
    G.tutPausedBySettings = true;
    $('tutorialBox').classList.add('hidden');
    return;
  }
  $('tutorialBox').classList.remove('hidden');
  renderTutorial();
}
function renderTutorial(){
  const steps = tutSteps();
  const st = steps[tutIdx] || steps[0];
  $('tuStep').textContent = (tutIdx+1) + ' / ' + steps.length;
  $('tuTitle').textContent = st.t;
  $('tuText').textContent = st.d;
  $('tuPrev').style.visibility = tutIdx===0 ? 'hidden' : 'visible';
  $('tuNext').textContent = tutIdx===steps.length-1 ? '开始修行' : '下一步';
  const box = $('tutorialBox');
  box.classList.remove('flash');
  void box.offsetWidth;
  box.classList.add('flash');
}
function tutorialNext(){
  const steps = tutSteps();
  if(tutIdx >= steps.length-1){ endTutorial(false); return; }
  tutIdx++;
  tutMoveFrom = null; tutMoveTicks = 0;
  renderTutorial();
}
function tutorialPrev(){
  if(tutIdx<=0) return;
  tutIdx--;
  tutMoveFrom = null; tutMoveTicks = 0;
  renderTutorial();
}
function endTutorial(skipped){
  tutOn = false;
  G.tutPausedBySettings = false;
  markTutorialSeen();
  $('tutorialBox').classList.add('hidden');
  if(skipped) addSys('教程已跳过，按 '+bindLabel('settings')+' 可重看','');
}
/* 做到对应动作自动进入下一步 */
function tutorialTick(me, x, y){
  if(!tutOn || !me) return;
  const steps = tutSteps();
  const st = steps[tutIdx];
  if(!st || !st.auto) return;
  if(st.auto==='move'){
    if(!tutMoveFrom){ tutMoveFrom = { x:x, y:y }; tutMoveTicks = 0; }
    // 有移动输入（哪怕撞墙）或位移超过 30，都算学会移动
    const mv = computeMoveVector(x, y);
    const pressing = Math.abs(mv.x) + Math.abs(mv.y) > 0.15
                  || dist(tutMoveFrom.x, tutMoveFrom.y, x, y) > 30;
    tutMoveTicks = pressing ? tutMoveTicks + 1 : 0;
    if(tutMoveTicks >= 5) tutorialNext();
  }else if(st.auto==='med'){
    if(me.meditating) tutorialNext();
  }else if(st.auto==='gather'){
    if((me.gathered||0) >= 1) tutorialNext();
  }else if(st.auto==='kill'){
    if((me.kills||0) >= 1) tutorialNext();
  }
}

/* ---------------- 隐藏内置挂面板 ---------------- */
const CHEAT_LOCKS = [
  { key:'hp', name:'气血' },
  { key:'mp', name:'灵力' },
  { key:'exp', name:'修为' },
  { key:'grudge', name:'煞气' },
];
G.cheatLocal = { lock:{}, preset:null };

function showCheatMask(){ $('maskBtn').classList.remove('hidden'); }

function toggleCheatPanel(){
  if(!G.cheatOn || G.cheatOff) return;
  G.cheatOpen = !G.cheatOpen;
  $('cheatPanel').classList.toggle('hidden', !G.cheatOpen);
  if(G.cheatOpen) buildCheatPanel();
}

function buildCheatPanel(){
  const me = getSelf();
  if(!me) return;

  const rootBox = $('cheatRoot'); rootBox.innerHTML = '';
  EL_LIST.forEach(el=>{
    const inRoot = me.root.includes(el);
    const b = document.createElement('button');
    b.className = 'cheat-chip' + (inRoot?' active':'');
    b.textContent = elName(el);
    b.onclick = ()=>{
      let roots = me.root.slice();
      if(roots.includes(el)){ if(roots.length>1) roots = roots.filter(x=>x!==el); }
      else { roots.push(el); if(roots.length>2) roots.shift(); }
      cheat('root', { roots, active: me.activeRoot||0 });
      buildCheatPanel();
    };
    rootBox.appendChild(b);
  });

  const actBox = $('cheatActive'); actBox.innerHTML = '';
  if(me.root.length>1){
    me.root.forEach((el,i)=>{
      const b = document.createElement('button');
      b.className = 'cheat-chip' + ((me.activeRoot||0)===i?' active':'');
      b.textContent = '当前 · '+elName(el);
      b.onclick = ()=>{ cheat('activeRoot', { index:i }); buildCheatPanel(); };
      actBox.appendChild(b);
    });
  }else{
    actBox.textContent = '单一灵根，无需切换';
  }

  const lockBox = $('cheatLock'); lockBox.innerHTML = '';
  CHEAT_LOCKS.forEach(lk=>{
    const on = !!(me.lock && me.lock[lk.key]) || !!G.cheatLocal.lock[lk.key];
    const b = document.createElement('button');
    b.className = 'cheat-chip' + (on?' locked':'');
    b.textContent = lk.name + (on?' · 已锁':' · 解锁');
    b.onclick = ()=>{
      G.cheatLocal.lock[lk.key] = !on;
      cheat('lock', { key:lk.key, on:!on });
      buildCheatPanel();
    };
    lockBox.appendChild(b);
  });

  const preBox = $('cheatPreset'); preBox.innerHTML = '';
  Object.keys(CHEAT_PRESETS).forEach(k=>{
    const cp = CHEAT_PRESETS[k];
    const active = me.preset===k || G.cheatLocal.preset===k;
    const b = document.createElement('button');
    b.className = 'cheat-chip' + (active?' active':'');
    b.textContent = cp.name;
    b.onclick = ()=>{
      const next = active ? null : k;
      G.cheatLocal.preset = next;
      cheat('preset', { preset:next });
      buildCheatPanel();
    };
    preBox.appendChild(b);
  });
}

$('maskBtn').onclick = toggleCheatPanel;

/* ---------------- 控制台接口：Goff / Gon / Gme ---------------- */
window.Goff = function(){
  // 先撤销已生效的挂，再禁用（避免禁用后仍带着预设加成）
  if(G.mode==='playing' && G.cheatOn && !G.cheatOff && (G.isHost || (hostConn && hostConn.open))){
    try{
      cheat('preset', { preset:null });
      CHEAT_LOCKS.forEach(lk=>{ if(G.cheatLocal.lock[lk.key]) cheat('lock', { key:lk.key, on:false }); });
    }catch(e){}
  }
  G.cheatLocal = { lock:{}, preset:null };
  G.cheatOff = true;
  G.cheatOpen = false;
  $('cheatPanel').classList.add('hidden');
  $('maskBtn').classList.add('hidden');
  return '挂已禁用';
};
window.Gon = function(){
  G.cheatOff = false;
  if(G.cheatOn) showCheatMask();
  return '挂已启用';
};
window.Gme = function(){
  if(G.cheatOff) return '挂已禁用，Gon() 后再试';
  G.cheatOn = true;
  showCheatMask();
  return '已解锁';
};

