/* ============================================================
   js/render.js — Canvas 渲染：四环地貌、宗门、秘境、角色、妖兽、特效
   ============================================================ */
'use strict';

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
let W = 0, H = 0, DPR = 1;

/* ---------- 动态分辨率（自适应画质） ---------- */
function perfState(){
  if(!window.__PERF) window.__PERF = { acc:0, frames:0, q:1 };
  return window.__PERF;
}
function resize(){
  W = window.innerWidth; H = window.innerHeight;
  const base = Math.min(window.devicePixelRatio||1, 2);
  DPR = Math.max(0.75, Math.min(base, 1.5) * perfState().q);
  canvas.width = Math.floor(W*DPR);
  canvas.height = Math.floor(H*DPR);
  canvas.style.width = W+'px';
  canvas.style.height = H+'px';
}
/* 每约 2 秒评估帧耗时：慢了自动降分辨率，流畅了再升回去 */
function perfWatch(ms){
  const P = perfState();
  P.acc += ms; P.frames++;
  if(P.frames < 40 || P.acc < 2000) return;
  const avg = P.acc/P.frames;
  P.acc = 0; P.frames = 0;
  if(avg > 20.5 && P.q > 0.6){ P.q = Math.max(0.6, P.q-0.12); resize(); }
  else if(avg < 13.2 && P.q < 1){ P.q = Math.min(1, P.q+0.08); resize(); }
}
window.addEventListener('resize', resize);
resize();

function inView(x,y,pad=90){
  return Math.abs(x-G.cam.x) < W/2+pad && Math.abs(y-G.cam.y) < H/2+pad;
}
function sx(x){ return x - G.cam.x + W/2; }
function sy(y){ return y - G.cam.y + H/2; }
function selfArea(){
  const me = world.players.get(G.selfId);
  return me && me.area==='secret' ? 'secret' : 'world';
}

/* ---------------- 地面：四环 ---------------- */
/* 静态地面离屏缓存：世界地面只绘制一次，之后每帧只贴可视区 */
const GROUND_SCALE = 0.5;
var groundCacheScale = GROUND_SCALE;

function drawWorldGroundStatic(c){
  c.fillStyle = '#0a1815';
  c.fillRect(0,0,WORLD.w,WORLD.h);

  // 由外向内铺四环底色
  for(let i=RINGS.length-1;i>=0;i--){
    const r = RINGS[i];
    const g = c.createRadialGradient(CX,CY,r.r0*0.96,CX,CY,r.r1);
    g.addColorStop(0, r.color);
    g.addColorStop(0.82, r.color);
    g.addColorStop(1, 'rgba(9,22,19,.92)');
    c.fillStyle = g;
    c.beginPath(); c.arc(CX,CY,r.r1,0,Math.PI*2); c.fill();
  }

  // 环带纹理
  for(const r of RINGS){
    c.strokeStyle = 'rgba(255,255,255,.04)';
    c.lineWidth = 1;
    for(let k=0;k<3;k++){
      c.beginPath(); c.arc(CX,CY,r.r0+30+k*((r.r1-r.r0-40)/3),0,Math.PI*2); c.stroke();
    }
  }

  // 村庄 / 坊市地表
  const tg = c.createRadialGradient(TOWN.x,TOWN.y,10,TOWN.x,TOWN.y,TOWN.r*1.35);
  tg.addColorStop(0,'rgba(120,140,90,.20)');
  tg.addColorStop(1,'rgba(120,140,90,0)');
  c.fillStyle = tg; c.beginPath(); c.arc(TOWN.x,TOWN.y,TOWN.r*1.35,0,Math.PI*2); c.fill();
  const fg = c.createRadialGradient(FAIR.x,FAIR.y,6,FAIR.x,FAIR.y,FAIR.r*1.3);
  fg.addColorStop(0,'rgba(200,170,100,.18)');
  fg.addColorStop(1,'rgba(200,170,100,0)');
  c.fillStyle = fg; c.beginPath(); c.arc(FAIR.x,FAIR.y,FAIR.r*1.3,0,Math.PI*2); c.fill();

  // 道路
  c.lineCap = 'round';
  for(const p of worldGeo.paths){
    c.strokeStyle = 'rgba(146,132,92,.10)';
    c.lineWidth = 74;
    c.beginPath(); c.moveTo(p.x1,p.y1); c.lineTo(p.x2,p.y2); c.stroke();
    c.strokeStyle = 'rgba(180,164,116,.07)';
    c.lineWidth = 42;
    c.beginPath(); c.moveTo(p.x1,p.y1); c.lineTo(p.x2,p.y2); c.stroke();
  }

  // 静态雾层（原逐帧 screen 混合雾，烘一次即可）
  {
    let seedf = 20261116;
    const rndf = ()=>{ seedf = (seedf*1103515245+12345) & 0x7fffffff; return seedf/0x7fffffff; };
    c.save();
    c.globalCompositeOperation = 'screen';
    for(let i=0;i<44;i++){
      const fx = rndf()*WORLD.w, fy = rndf()*WORLD.h;
      const rr2 = 420 + rndf()*560;
      const fg2 = c.createRadialGradient(fx,fy,12,fx,fy,rr2);
      fg2.addColorStop(0,'rgba(150,200,190,.045)');
      fg2.addColorStop(1,'rgba(150,200,190,0)');
      c.fillStyle = fg2;
      c.beginPath(); c.arc(fx,fy,rr2,0,Math.PI*2); c.fill();
    }
    c.restore();
  }

  // 水潭底
  for(const p of worldGeo.ponds){
    const g = c.createRadialGradient(p.x,p.y,4,p.x,p.y,Math.max(p.rx,p.ry));
    g.addColorStop(0, p.color);
    g.addColorStop(0.7, 'rgba(30,70,72,.55)');
    g.addColorStop(1, 'rgba(20,50,52,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(p.x,p.y,p.rx,p.ry,0,0,Math.PI*2); c.fill();
  }
}

function buildGroundCache(){
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(WORLD.w*GROUND_SCALE);
  cv.height = Math.ceil(WORLD.h*GROUND_SCALE);
  const c = cv.getContext('2d');
  c.setTransform(GROUND_SCALE,0,0,GROUND_SCALE,0,0);
  drawWorldGroundStatic(c);
  groundCache = cv;
  groundCacheScale = GROUND_SCALE;
  groundDirty = false;
}

// 动态部分：境界光幕、符文、水面涟漪（随时间变化，不能缓存）
function drawWorldGroundDynamic(){
  for(let i=1;i<RINGS.length;i++){
    const r = RINGS[i];
    if(!inView(CX,CY,r.r0+60)) continue;
    const accent = r.accent;
    const pulse = 0.24 + Math.sin(G.time*1.4 + i)*0.1;
    ctx.strokeStyle = hexA(accent, pulse);
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(CX,CY,r.r0,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle = hexA(accent, pulse*1.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(CX,CY,r.r0,0,Math.PI*2); ctx.stroke();

    for(let k=0;k<48;k++){
      const a = k/48*Math.PI*2 + G.time*0.04*(i%2?1:-1);
      const px = CX+Math.cos(a)*r.r0, py = CY+Math.sin(a)*r.r0;
      if(!inView(px,py,20)) continue;
      ctx.fillStyle = hexA(accent, 0.32+Math.sin(G.time*2+k)*0.2);
      ctx.beginPath(); ctx.arc(px,py,1.6,0,Math.PI*2); ctx.fill();
    }
  }

  for(const p of worldGeo.ponds){
    if(!inView(p.x,p.y,Math.max(p.rx,p.ry))) continue;
    ctx.strokeStyle = 'rgba(150,220,210,.12)'; ctx.lineWidth = 1;
    for(let i=1;i<=3;i++){
      const t = G.time*0.6 + i*1.4;
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,p.rx*(0.3+i*0.18)+Math.sin(t)*4,p.ry*(0.3+i*0.18)+Math.cos(t)*3,0,0,Math.PI*2);
      ctx.stroke();
    }
  }
}

function drawWorldGround(){
  if(groundDirty || !groundCache) buildGroundCache();

  const vx = G.cam.x - W/2 - 80, vy = G.cam.y - H/2 - 80;
  const vw = W + 160, vh = H + 160;

  // 视野铺底（防止缓存边缘露出空白）
  ctx.fillStyle = '#0a1815';
  ctx.fillRect(vx,vy,vw,vh);

  // 从离屏缓存裁出可视区贴图
  const wx0 = Math.max(0, vx), wy0 = Math.max(0, vy);
  const wx1 = Math.min(WORLD.w, vx+vw), wy1 = Math.min(WORLD.h, vy+vh);
  if(wx1 > wx0 && wy1 > wy0){
    const S = groundCacheScale;
    ctx.drawImage(groundCache,
      wx0*S, wy0*S, (wx1-wx0)*S, (wy1-wy0)*S,
      wx0, wy0, wx1-wx0, wy1-wy0);
  }

  drawWorldGroundDynamic();
}

function hexA(hex,a){
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h,16);
  const r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* ---------------- 装饰 ---------------- */
function drawDecor(){
  for(const d of worldGeo.decor){
    if(!inView(d.x,d.y,40)) continue;
    if(d.type==='grass'){
      const c = d.zone===3 ? 'rgba(150,140,190,.26)' : d.zone===4 ? 'rgba(170,205,215,.22)' : 'rgba(120,170,120,.25)';
      ctx.strokeStyle = c; ctx.lineWidth = 1;
      const sway = Math.sin(G.time*1.2 + d.x*0.03)*2;
      for(let i=-1;i<=1;i++){
        ctx.beginPath();
        ctx.moveTo(d.x+i*3, d.y);
        ctx.quadraticCurveTo(d.x+i*3+sway, d.y-8*d.s, d.x+i*5+sway*1.5, d.y-13*d.s);
        ctx.stroke();
      }
    }else if(d.type==='reed'){
      ctx.strokeStyle = 'rgba(150,140,190,.35)'; ctx.lineWidth = 1.2;
      const sway = Math.sin(G.time*1.5 + d.x*0.05)*3;
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.quadraticCurveTo(d.x+sway,d.y-18*d.s,d.x+sway*2,d.y-32*d.s); ctx.stroke();
      ctx.fillStyle = 'rgba(170,160,210,.25)';
      ctx.beginPath(); ctx.ellipse(d.x+sway*2,d.y-33*d.s,2,5,0,0,Math.PI*2); ctx.fill();
    }else if(d.type==='lantern'){
      const glow = ctx.createRadialGradient(d.x,d.y-30,2,d.x,d.y-30,36);
      glow.addColorStop(0,'rgba(255,190,110,.32)');
      glow.addColorStop(1,'rgba(255,190,110,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(d.x,d.y-30,36,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,70,45,.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x,d.y-22); ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,130,.85)';
      ctx.beginPath(); ctx.ellipse(d.x,d.y-28,4,6,0,0,Math.PI*2); ctx.fill();
    }
  }
}

function drawTree(o){
  const s = o.s||1;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(o.x,o.y+3,18*s,6*s,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = o.dead ? '#3a332b' : '#3b2c1e';
  ctx.fillRect(o.x-3*s, o.y-26*s, 6*s, 27*s);
  const sway = Math.sin(G.time*0.9 + o.x*0.02)*2.2;
  if(o.dead){
    ctx.strokeStyle = 'rgba(110,100,88,.75)'; ctx.lineWidth = 2*s;
    ctx.beginPath();
    ctx.moveTo(o.x,o.y-10*s); ctx.lineTo(o.x-10*s+sway,o.y-30*s);
    ctx.moveTo(o.x,o.y-16*s); ctx.lineTo(o.x+12*s+sway,o.y-34*s);
    ctx.moveTo(o.x-2*s,o.y-22*s); ctx.lineTo(o.x-10*s+sway,o.y-40*s);
    ctx.stroke();
    return;
  }
  const dark = o.tone>0.5 ? '#1c4a37' : '#22513a';
  const mid  = o.tone>0.5 ? '#2a6047' : '#316b4b';
  const light= o.tone>0.5 ? '#3b7d5c' : '#468a63';
  const blobs = [ [0,-46,26,18,mid],[-13,-38,18,14,dark],[14,-39,17,13,dark],[0,-58,16,12,light] ];
  for(const b of blobs){
    ctx.fillStyle = b[4];
    ctx.beginPath(); ctx.ellipse(o.x+b[0]*s+sway, o.y+b[1]*s, b[2]*s, b[3]*s, 0,0,Math.PI*2); ctx.fill();
  }
}

function drawRock(o){
  const s = o.s||1;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(o.x,o.y+2,20*s,7*s,0,0,Math.PI*2); ctx.fill();
  const g = ctx.createLinearGradient(o.x,o.y-30*s,o.x,o.y);
  g.addColorStop(0,'#7f9aa3'); g.addColorStop(0.55,'#4d6870'); g.addColorStop(1,'#2c4148');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(o.x-20*s,o.y); ctx.lineTo(o.x-15*s,o.y-16*s); ctx.lineTo(o.x-4*s,o.y-28*s);
  ctx.lineTo(o.x+9*s,o.y-24*s); ctx.lineTo(o.x+19*s,o.y-8*s); ctx.lineTo(o.x+14*s,o.y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(200,230,240,.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(o.x-4*s,o.y-26*s); ctx.lineTo(o.x-1*s,o.y-12*s); ctx.lineTo(o.x+7*s,o.y-6*s); ctx.stroke();
}

function drawHouse(h){
  const x = h.x, y = h.y, w = h.w, hh = h.h;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(x,y+8,w*0.55,10,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = h.color;
  ctx.fillRect(x-w/2, y-hh/2, w, hh);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(x-w/2, y-hh/2, w, 6);
  ctx.fillStyle = '#2e3a33';
  ctx.beginPath();
  ctx.moveTo(x-w/2-10, y-hh/2); ctx.lineTo(x, y-hh/2-26); ctx.lineTo(x+w/2+10, y-hh/2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(217,192,138,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x-w/2-10,y-hh/2); ctx.lineTo(x,y-hh/2-26); ctx.lineTo(x+w/2+10,y-hh/2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,205,130,.55)';
  ctx.fillRect(x-10, y-4, 20, 26);
  ctx.fillStyle = 'rgba(30,25,18,.8)';
  ctx.fillRect(x-7, y+2, 14, 20);
  ctx.fillStyle = 'rgba(255,220,150,.35)';
  ctx.fillRect(x-w/2+10, y-hh/2+12, 14, 14);
  ctx.fillRect(x+w/2-24, y-hh/2+12, 14, 14);
  ctx.fillStyle = 'rgba(20,18,12,.75)';
  ctx.fillRect(x-18,y-hh/2+2,36,12);
  ctx.fillStyle = '#d9c08a';
  ctx.font = '9px "Songti SC",serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(h.name, x, y-hh/2+8.5);
}

/* ---------------- 宗门 ---------------- */
function drawSectBase(s){
  if(!inView(s.x,s.y,190)) return;
  const col = s.color;
  // 平台
  const g = ctx.createRadialGradient(s.x,s.y,8,s.x,s.y,130);
  g.addColorStop(0, hexA(col,.22));
  g.addColorStop(0.6, hexA(col,.09));
  g.addColorStop(1, hexA(col,0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x,s.y,130,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexA(col,.35); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(s.x,s.y,86,0,Math.PI*2); ctx.stroke();

  // 石阶
  ctx.fillStyle = 'rgba(60,64,58,.55)';
  ctx.fillRect(s.x-46,s.y+30,92,10);
  ctx.fillRect(s.x-38,s.y+40,76,10);
  ctx.fillRect(s.x-30,s.y+50,60,10);
  // 门柱
  ctx.fillStyle = '#2c3630';
  ctx.fillRect(s.x-52,s.y-14,12,44);
  ctx.fillRect(s.x+40,s.y-14,12,44);
  ctx.fillStyle = hexA(col,.5);
  ctx.fillRect(s.x-54,s.y-18,16,6);
  ctx.fillRect(s.x+38,s.y-18,16,6);
  // 匾额
  ctx.fillStyle = 'rgba(14,20,17,.9)';
  ctx.fillRect(s.x-46,s.y-6,92,18);
  ctx.strokeStyle = hexA(col,.7); ctx.lineWidth = 1;
  ctx.strokeRect(s.x-46,s.y-6,92,18);
  ctx.fillStyle = col;
  ctx.font = '11px "Songti SC",serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(s.name, s.x, s.y+3);

  // 山头
  for(const pk of s.peaks){
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(pk.x,pk.y+3,16,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = pk.main ? hexA(col,.85) : hexA(col,.55);
    ctx.beginPath();
    ctx.moveTo(pk.x-13,pk.y); ctx.lineTo(pk.x,pk.y-30); ctx.lineTo(pk.x+13,pk.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(12,22,19,.85)';
    ctx.fillRect(pk.x-2,pk.y-16,4,16);
    ctx.font = '9px system-ui'; ctx.fillStyle = '#cfd9d4'; ctx.textAlign='center';
    ctx.fillText(pk.name, pk.x, pk.y-36);
    if(pk.main){
      ctx.fillStyle = 'rgba(240,223,180,.85)';
      ctx.beginPath(); ctx.arc(pk.x, pk.y-44, 2.2,0,Math.PI*2); ctx.fill();
    }
  }
}

/* ---------------- 传送门 ---------------- */
function drawPortal(pt){
  if(!inView(pt.x,pt.y,80)) return;
  const col = elColor(pt.el);
  const t = G.time*1.6;
  ctx.save();
  ctx.translate(pt.x,pt.y-12);
  // 光柱
  const g = ctx.createLinearGradient(0,-80,0,10);
  g.addColorStop(0, hexA(col,0));
  g.addColorStop(0.5, hexA(col,.22));
  g.addColorStop(1, hexA(col,.05));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-26,10); ctx.lineTo(-14,-80); ctx.lineTo(14,-80); ctx.lineTo(26,10); ctx.closePath(); ctx.fill();
  // 门
  ctx.strokeStyle = hexA(col,.8); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(0,0,24,30,0,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle = hexA(col,.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0,0,18+Math.sin(t)*3,23+Math.cos(t)*2.4,0,0,Math.PI*2); ctx.stroke();
  // 旋转符文
  for(let i=0;i<6;i++){
    const a = t + i*Math.PI/3;
    ctx.fillStyle = hexA(col,.75);
    ctx.beginPath(); ctx.arc(Math.cos(a)*24, Math.sin(a)*30, 2,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.font = '10px system-ui'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(SECRET_NAMES[pt.el], 0, 36);
  ctx.restore();
}

/* ---------------- 灵草 / 奇珍 ---------------- */
function drawHerb(h){
  if(!h.alive) return;
  const col = elColor(h.el);
  const pulse = 0.7 + Math.sin(G.time*2 + h.phase)*0.3;
  const g = ctx.createRadialGradient(h.x,h.y-6,1,h.x,h.y-6,24);
  g.addColorStop(0, hexA(col, 0.24*pulse));
  g.addColorStop(1, hexA(col,0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x,h.y-6,24,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.quadraticCurveTo(h.x-2,h.y-8,h.x,h.y-14); ctx.stroke();
  for(let i=0;i<3;i++){
    const a = -Math.PI/2 + (i-1)*0.9;
    ctx.beginPath();
    ctx.fillStyle = hexA(col,.9);
    ctx.ellipse(h.x+Math.cos(a)*6,h.y-10+Math.sin(a)*4,5,2.6,a,0,Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = '#f2fff8';
  ctx.beginPath(); ctx.arc(h.x,h.y-16,1.8,0,Math.PI*2); ctx.fill();
  if(h.el==='thunder'){
    ctx.strokeStyle = hexA(col,.85); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(h.x+8,h.y-22); ctx.lineTo(h.x+3,h.y-14); ctx.lineTo(h.x+8,h.y-14); ctx.stroke();
  }
}

function drawSecretItem(it){
  if(!it.alive) return;
  const col = it.color;
  const bob = Math.sin(G.time*2 + it.phase)*3;
  const g = ctx.createRadialGradient(it.x,it.y+bob,1,it.x,it.y+bob,26);
  g.addColorStop(0, hexA(col,.45));
  g.addColorStop(1, hexA(col,0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.x,it.y+bob,26,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(it.x,it.y+bob,6,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
  ctx.strokeRect(it.x-2.4, it.y+bob-2.4, 4.8, 4.8);
}

/* ---------------- 妖兽 ---------------- */
function drawMob(mo){
  const cfg = MOB_TYPES[mo.type];
  if(!cfg) return;
  const x = mo.renderX!==undefined?mo.renderX:mo.x;
  const y = mo.renderY!==undefined?mo.renderY:mo.y;
  const el = ELEMENT_INFO[cfg.el]||{color:'#cfe3dd'};
  const scale = cfg.boss ? 1.6 : 1;
  const bob = Math.sin(G.time*3 + mo.id.length)*1.5;

  ctx.save();
  ctx.translate(x,y+bob);

  // 影
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(0,2,cfg.r*1.3*scale,cfg.r*0.44*scale,0,0,Math.PI*2); ctx.fill();

  // 元素灵光
  const aura = ctx.createRadialGradient(0,-cfg.r*0.9,2,0,-cfg.r*0.9,cfg.r*2.1*scale);
  aura.addColorStop(0, hexA(el.color, cfg.boss?0.20:0.10));
  aura.addColorStop(1, hexA(el.color,0));
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0,-cfg.r*0.9,cfg.r*2.1*scale,0,Math.PI*2); ctx.fill();

  const face = (mo.dir||1) < 0 ? -1 : 1;
  const r = cfg.r*scale;
  const c = cfg.color;

  if(mo.type==='dragon' || cfg.shape==='dragon'){
    // 蛇形蛟龙
    ctx.strokeStyle = c; ctx.lineWidth = 12*scale; ctx.lineCap='round';
    ctx.beginPath();
    for(let i=0;i<=8;i++){
      const px = -r*1.5 + i*(r*0.42);
      const py = -r*0.5 + Math.sin(G.time*1.6 + i*0.7)*r*0.28;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.strokeStyle = hexA(el.color,.8); ctx.lineWidth = 4*scale;
    ctx.beginPath();
    for(let i=0;i<=8;i++){
      const px = -r*1.5 + i*(r*0.42);
      const py = -r*0.58 + Math.sin(G.time*1.6 + i*0.7)*r*0.28;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(r*1.6,-r*0.6,r*0.5,r*0.36,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffcf6b';
    ctx.beginPath(); ctx.arc(r*1.75,-r*0.7,r*0.08,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = hexA(el.color,.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(r*1.5,-r*0.9); ctx.lineTo(r*1.4,-r*1.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*1.7,-r*0.9); ctx.lineTo(r*1.85,-r*1.25); ctx.stroke();
  }else{
    ctx.save(); ctx.scale(face,1);
    // 躯干
    ctx.fillStyle = c;
    if(cfg.shape==='golem'||cfg.shape==='puppet'){
      ctx.fillRect(-r*0.9,-r*1.5,r*1.8,r*1.5);
      ctx.fillStyle = hexA(el.color,.55);
      ctx.fillRect(-r*0.9,-r*1.5,r*1.8,r*0.18);
      ctx.fillStyle = c;
      ctx.fillRect(-r*0.55,-r*2.05,r*1.1,r*0.6);
      ctx.fillStyle = '#1a2420';
      ctx.fillRect(-r*0.28,-r*1.85,r*0.2,2); ctx.fillRect(r*0.08,-r*1.85,r*0.2,2);
      if(cfg.shape==='puppet'){
        ctx.strokeStyle = hexA(el.color,.9); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(r*0.7,-r*1.3); ctx.lineTo(r*0.7,-r*2.4); ctx.stroke();
      }
      ctx.fillStyle = hexA(el.color,.35);
      for(let i=0;i<3;i++) ctx.fillRect(-r*0.7+i*r*0.5,-r*0.8,r*0.28,r*0.12);
    }else if(cfg.shape==='spider'){
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      for(let i=0;i<4;i++){
        const a = -0.9+i*0.6;
        ctx.beginPath(); ctx.moveTo(0,-r*0.9);
        ctx.quadraticCurveTo(Math.cos(a)*r*1.2,-r*0.9+Math.sin(a)*r*0.7,Math.cos(a)*r*1.8,Math.sin(G.time*4+i)*3);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-r*0.9);
        ctx.quadraticCurveTo(-Math.cos(a)*r*1.2,-r*0.9+Math.sin(a)*r*0.7,-Math.cos(a)*r*1.8,Math.sin(G.time*4+i)*3);
        ctx.stroke();
      }
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0,-r*1.1,r,r*0.85,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f0e8ff';
      ctx.beginPath(); ctx.arc(r*0.5,-r*1.3,r*0.1,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(r*0.75,-r*1.05,r*0.08,0,Math.PI*2); ctx.fill();
    }else if(cfg.shape==='wraith'){
      ctx.globalAlpha = .85;
      const g = ctx.createLinearGradient(0,-r*2.4,0,r*0.2);
      g.addColorStop(0, c); g.addColorStop(1, hexA(c,.15));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-r*0.8,-r*0.9);
      ctx.quadraticCurveTo(-r*0.9,-r*2.4,0,-r*2.5);
      ctx.quadraticCurveTo(r*0.9,-r*2.4,r*0.8,-r*0.9);
      ctx.quadraticCurveTo(r*0.5,r*0.1,0,-r*0.2);
      ctx.quadraticCurveTo(-r*0.5,r*0.1,-r*0.8,-r*0.9);
      ctx.fill();
      ctx.fillStyle = '#e8e0ff';
      ctx.beginPath(); ctx.arc(-r*0.28,-r*1.8,r*0.09,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(r*0.28,-r*1.8,r*0.09,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }else if(cfg.shape==='bird'){
      const flap = Math.sin(G.time*8)*r*0.5;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0,-r*1.3,r*0.6,r*0.8,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r*0.2,-r*1.4); ctx.lineTo(-r*1.7,-r*1.9-flap); ctx.lineTo(-r*0.3,-r*1.0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r*0.2,-r*1.4); ctx.lineTo(r*1.7,-r*1.9-flap); ctx.lineTo(r*0.3,-r*1.0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffcf6b';
      ctx.beginPath(); ctx.moveTo(r*0.5,-r*1.6); ctx.lineTo(r*1.0,-r*1.45); ctx.lineTo(r*0.5,-r*1.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hexA(el.color,.9);
      ctx.beginPath(); ctx.arc(r*0.2,-r*1.55,r*0.08,0,Math.PI*2); ctx.fill();
    }else if(cfg.shape==='turtle'){
      ctx.fillStyle = hexA(c,.9);
      ctx.beginPath(); ctx.ellipse(0,-r*1.1,r*1.05,r*0.7,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = hexA(el.color,.55);
      ctx.beginPath(); ctx.ellipse(0,-r*1.2,r*0.85,r*0.52,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(30,50,40,.65)'; ctx.lineWidth = 1.2;
      for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.arc(0,-r*1.2,r*0.35+i*3,0,Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(r*1.05,-r*1.15,r*0.32,r*0.26,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1d2b22';
      ctx.beginPath(); ctx.arc(r*1.14,-r*1.25,r*0.06,0,Math.PI*2); ctx.fill();
    }else{
      // 四足（狐/狼/蜥）
      const long = cfg.shape==='lizard';
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(0,-r*0.95,r*1.05,r*0.55,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.95,-r*1.35,r*0.46,r*0.4,0,0,Math.PI*2); ctx.fill();
      // 耳/角
      if(cfg.shape==='fox'){
        ctx.beginPath(); ctx.moveTo(r*0.6,-r*1.7); ctx.lineTo(r*0.74,-r*2.3); ctx.lineTo(r*1.1,-r*1.66); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r*1.05,-r*1.66); ctx.lineTo(r*1.35,-r*2.2); ctx.lineTo(r*1.42,-r*1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(c,.7);
        ctx.beginPath(); ctx.ellipse(-r*1.0,-r*1.05,r*0.65,r*0.35,-0.5,0,Math.PI*2); ctx.fill();
      }else if(cfg.shape==='wolf'){
        ctx.beginPath(); ctx.moveTo(r*0.7,-r*1.72); ctx.lineTo(r*0.82,-r*2.3); ctx.lineTo(r*1.14,-r*1.68); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(el.color,.85);
        ctx.beginPath(); ctx.ellipse(r*1.36,-r*1.18,r*0.3,r*0.16,0,0,Math.PI*2); ctx.fill();
      }else if(long){
        for(let i=0;i<4;i++){
          ctx.beginPath(); ctx.moveTo(-r*0.3+i*r*0.36,-r*1.5);
          ctx.lineTo(-r*0.3+i*r*0.36,-r*1.95); ctx.lineTo(-r*0.12+i*r*0.36,-r*1.5);
          ctx.closePath(); ctx.fill();
        }
      }
      // 腿
      ctx.fillStyle = hexA(c,.75);
      ctx.fillRect(-r*0.6,-r*0.55,r*0.2,r*0.55);
      ctx.fillRect(r*0.4,-r*0.55,r*0.2,r*0.55);
      // 眼
      ctx.fillStyle = cfg.boss ? '#ff9a6a' : '#20140d';
      ctx.beginPath(); ctx.arc(r*1.18,-r*1.42,r*0.1,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // 精英/BOSS 光环
  if(cfg.boss){
    ctx.strokeStyle = hexA(el.color,.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0,0,r*1.9,r*0.65,0,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();

  // 血条 / 名称
  if(mo.hp < mo.maxHp || cfg.boss){
    const w = cfg.boss ? 84 : 40;
    const top = y + (cfg.boss? -cfg.r*3.1 : -cfg.r*2.5) - 10;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x-w/2, top, w, 4);
    ctx.fillStyle = cfg.boss ? '#e05a4a' : hexA(el.color,.95);
    ctx.fillRect(x-w/2, top, w*clamp(mo.hp/mo.maxHp,0,1), 4);
    if(cfg.boss){
      ctx.fillStyle = '#ffd9c2';
      ctx.font = '11px system-ui'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(cfg.name, x, top-2);
    }
  }
}

/* ---------------- 玩家 ---------------- */
function drawPlayer(p, isSelf){
  const x = p.renderX!==undefined?p.renderX:p.x;
  const y = p.renderY!==undefined?p.renderY:p.y;
  const moving = Math.abs(p.mx||0)+Math.abs(p.my||0) > 0.1;
  const bob = moving ? Math.sin(G.time*10)*1.6 : Math.sin(G.time*2)*0.7;
  const face = (p.dir||1) < 0 ? -1 : 1;
  const female = p.gender === 'female';
  const devil = !!p.devil;
  const rootEl = (p.root && p.root[p.activeRoot||0]) || 'fire';
  const robeCol = p.sect ? (SECT_BY_ID[p.sect]?SECT_BY_ID[p.sect].color:'#cfd8de') : (ELEMENT_INFO[rootEl]?ELEMENT_INFO[rootEl].robe:'#cfd8de');

  ctx.save();
  ctx.translate(x, y+bob);

  // 影
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0,3,15,5.5,0,0,Math.PI*2); ctx.fill();

  // 魔鬼气场
  if(devil){
    const pulse = 0.55 + Math.sin(G.time*3)*0.2;
    const dg = ctx.createRadialGradient(0,-14,4,0,-14,46);
    dg.addColorStop(0, 'rgba(150,80,200,'+(0.28*pulse)+')');
    dg.addColorStop(0.55, 'rgba(90,40,140,'+(0.16*pulse)+')');
    dg.addColorStop(1, 'rgba(90,40,140,0)');
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(0,-14,46,0,Math.PI*2); ctx.fill();
    // 魔气触须
    ctx.strokeStyle = 'rgba(190,140,255,.55)'; ctx.lineWidth = 1.4;
    for(let i=0;i<4;i++){
      const a = G.time*1.2 + i*1.57;
      ctx.beginPath();
      ctx.moveTo(0,-10);
      ctx.quadraticCurveTo(Math.cos(a)*22,-30+Math.sin(a)*10,Math.cos(a)*30,-46+Math.sin(a)*12);
      ctx.stroke();
    }
  }

  // 打坐光环
  if(p.meditating){
    const pr = 34 + Math.sin(G.time*2)*3;
    const g = ctx.createRadialGradient(0,-8,4,0,-8,pr);
    g.addColorStop(0,'rgba(121,224,189,.20)');
    g.addColorStop(0.7,'rgba(121,224,189,.07)');
    g.addColorStop(1,'rgba(121,224,189,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,-8,pr,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,240,210,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0,2,26,9,0,0,Math.PI*2); ctx.stroke();
    for(let i=0;i<5;i++){
      const a = G.time*0.6 + i*1.256;
      const rr = 24 + Math.sin(G.time*1.5+i)*3;
      ctx.fillStyle = 'rgba(190,250,225,.6)';
      ctx.beginPath(); ctx.arc(Math.cos(a)*rr, -6+Math.sin(a)*rr*0.35, 1.6, 0, Math.PI*2); ctx.fill();
    }
  }

  // 死亡
  if(p.dead){
    ctx.globalAlpha = 0.55 + Math.sin(G.time*4)*0.15;
    ctx.fillStyle = '#cfe3dd';
    ctx.beginPath(); ctx.ellipse(0,-16,9,16,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#a8c4bb';
    ctx.beginPath(); ctx.arc(0,-34,8,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  ctx.scale(face,1);

  // 背后剑
  ctx.strokeStyle = 'rgba(190,215,220,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10,-30); ctx.lineTo(9,-4); ctx.stroke();
  ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-12,-27); ctx.lineTo(-7,-33); ctx.stroke();

  // 道袍
  const robe = ctx.createLinearGradient(0,-30,0,2);
  robe.addColorStop(0, isSelf ? '#efe8d4' : robeCol);
  robe.addColorStop(1, isSelf ? '#c2d0c8' : hexA(robeCol,.72));
  ctx.fillStyle = robe;
  ctx.beginPath();
  if(female){
    ctx.moveTo(-7,-27);
    ctx.quadraticCurveTo(-17,-8,-19,3);
    ctx.lineTo(19,3);
    ctx.quadraticCurveTo(17,-8,7,-27);
  }else{
    ctx.moveTo(-10,-27);
    ctx.quadraticCurveTo(-16,-10,-16,1);
    ctx.lineTo(16,1);
    ctx.quadraticCurveTo(15,-10,10,-27);
  }
  ctx.closePath(); ctx.fill();

  // 衣襟
  ctx.strokeStyle = 'rgba(60,60,45,.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-3,-12); ctx.lineTo(0,0); ctx.stroke();
  // 腰带
  ctx.fillStyle = p.sect ? hexA(SECT_BY_ID[p.sect].color,.9) : '#b99a5f';
  ctx.fillRect(-11,-9,22,3.5);
  // 宗门纹饰
  if(p.sect){
    ctx.fillStyle = hexA(SECT_BY_ID[p.sect].color,.9);
    ctx.beginPath(); ctx.arc(0,-20,2.4,0,Math.PI*2); ctx.fill();
  }
  // 灵根气纹
  ctx.strokeStyle = hexA(elColor(rootEl),.6); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-14,-4); ctx.lineTo(-11,-14); ctx.stroke();

  // 头
  ctx.fillStyle = '#e8c9a8';
  ctx.beginPath(); ctx.arc(0,-34,7.5,0,Math.PI*2); ctx.fill();
  // 发
  ctx.fillStyle = devil ? '#2a1c33' : '#221b16';
  ctx.beginPath(); ctx.arc(0,-36,7.7,Math.PI*0.95,Math.PI*2.05); ctx.fill();
  if(female){
    // 女修：侧发 + 发簪
    ctx.beginPath(); ctx.ellipse(-6,-32,3.4,8.5,0.25,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6,-32,3.4,8.5,-0.25,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#e8d891'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0,-42); ctx.lineTo(6,-46); ctx.stroke();
    ctx.fillStyle = hexA(elColor(rootEl),.85);
    ctx.beginPath(); ctx.arc(6.6,-46.4,1.8,0,Math.PI*2); ctx.fill();
  }else{
    ctx.beginPath(); ctx.ellipse(-2,-40,3.2,5.5,0.3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = p.sect ? hexA(SECT_BY_ID[p.sect].color,.9) : '#d9c08a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7,-38); ctx.lineTo(-11,-42); ctx.stroke();
  }
  // 魔鬼角
  if(devil){
    ctx.strokeStyle = 'rgba(200,160,255,.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5,-42); ctx.quadraticCurveTo(-9,-50,-7,-54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-42); ctx.quadraticCurveTo(9,-50,7,-54); ctx.stroke();
  }

  // 攻击表现
  if(p.attacking>0){
    ctx.strokeStyle = hexA(elColor(rootEl),.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(6,-14); ctx.lineTo(26,-26); ctx.stroke();
  }
  ctx.restore();

  // 名称 / 血条
  const tag = [];
  if(p.sect) tag.push(SECT_BY_ID[p.sect].name);
  if(devil) tag.push('魔鬼');
  const label = p.name + (tag.length? ' · '+tag.join('·') : '');
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = isSelf ? 'rgba(240,223,180,.95)' : devil ? 'rgba(216,192,255,.95)' : 'rgba(210,225,218,.9)';
  ctx.fillText(label, x, y-50);
  const bw = 40;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x-bw/2, y-48, bw, 3);
  ctx.fillStyle = p.hp/p.maxHp > 0.35 ? '#6fc98f' : '#e06b5a';
  ctx.fillRect(x-bw/2, y-48, bw*clamp(p.hp/p.maxHp,0,1), 3);
  // 护盾
  if(p.shield > 0){
    ctx.strokeStyle = hexA(elColor(rootEl),.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y-22, 19, 0, Math.PI*2); ctx.stroke();
  }
  drawBubble(p, x, y);
}

/* ---------------- 头顶气泡（聊天 / 表情） ---------------- */
function drawBubble(p, x, y){
  const b = p.bubble;
  if(!b) return;
  const left = b.until - Date.now();
  if(left <= 0){ p.bubble = null; return; }
  const emote = b.kind === 'emote';
  const font = emote ? '12px system-ui' : '11px system-ui';
  const maxW = emote ? 84 : 138;
  ctx.font = font;
  const chars = Array.from(String(b.text||''));
  const lines = [];
  let cur = '';
  for(const ch of chars){
    if(ctx.measureText(cur + ch).width > maxW && cur){ lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if(cur) lines.push(cur);
  if(lines.length > 3){
    lines.length = 3;
    lines[2] = lines[2].slice(0, -1) + '…';
  }
  let wid = 0;
  for(const ln of lines) wid = Math.max(wid, ctx.measureText(ln).width);
  const pad = emote ? 8 : 7, lh = emote ? 16 : 15;
  const w = Math.min(maxW + pad*2, wid + pad*2);
  const h = lines.length*lh + pad*2 - 2;
  const bx = x - w/2;
  const by = y - 70 - h;
  const alpha = Math.min(1, left/500);
  const col = emote ? '#e8cf8a' : '#9fd3b8';

  ctx.save();
  ctx.globalAlpha = alpha;
  // 框
  ctx.fillStyle = 'rgba(8,18,15,.9)';
  ctx.strokeStyle = emote ? 'rgba(217,192,138,.7)' : 'rgba(159,211,184,.5)';
  ctx.lineWidth = 1;
  const r = 5;
  ctx.beginPath();
  ctx.moveTo(bx+r, by);
  ctx.lineTo(bx+w-r, by); ctx.quadraticCurveTo(bx+w, by, bx+w, by+r);
  ctx.lineTo(bx+w, by+h-r); ctx.quadraticCurveTo(bx+w, by+h, bx+w-r, by+h);
  ctx.lineTo(bx+r, by+h); ctx.quadraticCurveTo(bx, by+h, bx, by+h-r);
  ctx.lineTo(bx, by+r); ctx.quadraticCurveTo(bx, by, bx+r, by);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // 小尾巴
  ctx.beginPath();
  ctx.moveTo(x-5, by+h-1); ctx.lineTo(x, by+h+7); ctx.lineTo(x+5, by+h-1);
  ctx.closePath(); ctx.fill();
  // 文字
  ctx.fillStyle = emote ? '#f2e2b8' : '#dfeade';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((ln, i)=>{
    ctx.fillText(ln, x, by + pad + i*lh + (emote?1:0));
  });
  ctx.restore();
}

/* ---------------- 弹道 ---------------- */
function drawProjectile(pr){
  const x = pr.x, y = pr.y;
  const col = elColor(pr.el);
  if(pr.type==='bolt' || pr.type==='multi' || pr.type==='pierce'){
    const ang = Math.atan2(pr.vy,pr.vx);
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(-26,0,18,0);
    g.addColorStop(0, hexA(col,0));
    g.addColorStop(0.6, hexA(col,.75));
    g.addColorStop(1, 'rgba(255,255,255,.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-28,0); ctx.lineTo(4,-5); ctx.lineTo(20,0); ctx.lineTo(4,5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }else if(pr.type==='fire'){
    const g = ctx.createRadialGradient(x,y,2,x,y,22);
    g.addColorStop(0,'rgba(255,250,210,.95)');
    g.addColorStop(0.35, hexA(col,.85));
    g.addColorStop(1, hexA(col,0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,170,.9)';
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
  }else{
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
  }
}

/* ---------------- 特效 ---------------- */
function drawEffects(){
  for(const r of G.rings){
    const t = 1 - r.life/r.max;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = (1-t)*0.8;
    ctx.lineWidth = 2*(1-t)+0.5;
    ctx.beginPath(); ctx.arc(r.x,r.y,lerp(r.r,r.maxR,t),0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for(const p of G.particles){
    const a = clamp(p.life/p.max,0,1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for(const f of G.floaters){
    const a = clamp(f.life/f.max,0,1);
    ctx.globalAlpha = a;
    ctx.font = '600 '+f.size+'px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(f.text,f.x,f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text,f.x,f.y);
  }
  ctx.globalAlpha = 1;
}

function drawMotes(){
  for(const m of G.motes){
    const a = 0.18 + Math.sin(G.time*1.5 + m.p)*0.12;
    ctx.globalAlpha = a;
    ctx.fillStyle = m.c;
    ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFog(){ /* 静态雾已烘入地面缓存，逐帧雾关闭 —— 原本 6 层大面积 screen 混合是全帧最大开销 */ }

/* ---------------- 秘境 ---------------- */
function drawArenaGround(el){
  const col = elColor(el);
  ctx.fillStyle = '#060b12';
  ctx.fillRect(G.cam.x-W/2-80, G.cam.y-H/2-80, W+160, H+160);

  // 虚空星尘
  ctx.fillStyle = 'rgba(200,220,255,.06)';
  for(let i=0;i<90;i++){
    const a = i*2.399, rr = 380 + (i%9)*60;
    const x = ARENA.cx+Math.cos(a)*rr, y = ARENA.cy+Math.sin(a)*rr*0.72;
    ctx.fillRect(x,y,1.6,1.6);
  }

  // 平台
  const g = ctx.createRadialGradient(ARENA.cx,ARENA.cy,20,ARENA.cx,ARENA.cy,ARENA.r+40);
  g.addColorStop(0, hexA(col,.28));
  g.addColorStop(0.55, 'rgba(22,30,38,.9)');
  g.addColorStop(1, 'rgba(10,14,20,.95)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(ARENA.cx,ARENA.cy,ARENA.r+30,(ARENA.r+30)*0.82,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexA(col,.55); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(ARENA.cx,ARENA.cy,ARENA.r,ARENA.r*0.82,0,0,Math.PI*2); ctx.stroke();

  // 地面法阵
  ctx.strokeStyle = hexA(col,.35); ctx.lineWidth = 1.2;
  for(let i=1;i<=3;i++){
    ctx.beginPath(); ctx.ellipse(ARENA.cx,ARENA.cy,ARENA.r*0.22*i,ARENA.r*0.18*i,0,0,Math.PI*2); ctx.stroke();
  }
  for(let i=0;i<8;i++){
    const a = G.time*0.15 + i*Math.PI/4;
    ctx.beginPath();
    ctx.moveTo(ARENA.cx+Math.cos(a)*ARENA.r*0.2, ARENA.cy+Math.sin(a)*ARENA.r*0.16);
    ctx.lineTo(ARENA.cx+Math.cos(a)*ARENA.r*0.88, ARENA.cy+Math.sin(a)*ARENA.r*0.72);
    ctx.stroke();
  }

  // 石柱
  for(let i=0;i<6;i++){
    const a = i*Math.PI/3 + 0.3;
    const px = ARENA.cx+Math.cos(a)*ARENA.r*0.86, py = ARENA.cy+Math.sin(a)*ARENA.r*0.7;
    ctx.fillStyle = 'rgba(40,48,56,.85)';
    ctx.fillRect(px-7,py-52,14,52);
    ctx.fillStyle = hexA(col,.4);
    ctx.fillRect(px-9,py-56,18,6);
  }

  // 返回传送门
  const bp = ARENA.back;
  const bt = G.time*2;
  ctx.strokeStyle = hexA('#79e0bd',.8); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(bp.x,bp.y,26,32,0,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(121,224,189,.10)';
  ctx.beginPath(); ctx.ellipse(bp.x,bp.y,24,30,0,0,Math.PI*2); ctx.fill();
  for(let i=0;i<5;i++){
    const a = bt+i*1.256;
    ctx.fillStyle = hexA('#79e0bd',.7);
    ctx.beginPath(); ctx.arc(bp.x+Math.cos(a)*26, bp.y+Math.sin(a)*32, 1.8,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#79e0bd'; ctx.font='10px system-ui'; ctx.textAlign='center';
  ctx.fillText('归途', bp.x, bp.y+46);
}

/* ---------------- 主渲染 ---------------- */
function render(){
  const rawNow = now();
  const rawMs = render._last ? (rawNow-render._last) : 16.7;
  const dt = Math.min(0.05, rawMs/1000);
  render._last = rawNow;
  if(G.mode==='playing') perfWatch(rawMs);
  G.time += dt;

  if(G.mode==='playing') tickClientVisuals(dt);

  const me = getSelf();
  const area = me && me.area==='secret' ? 'secret' : (G.mode==='login' ? 'login' : 'world');

  // 相机
  if(G.mode==='login'){
    G.cam.x = CX + Math.sin(G.time*0.09)*230;
    G.cam.y = CY + Math.cos(G.time*0.07)*130;
  }else if(me){
    const tx = me.renderX!==undefined ? me.renderX : me.x;
    const ty = me.renderY!==undefined ? me.renderY : me.y;
    G.cam.x = lerp(G.cam.x, tx, 1-Math.exp(-dt*6));
    G.cam.y = lerp(G.cam.y, ty, 1-Math.exp(-dt*6));
    if(area==='secret'){
      G.cam.x = clamp(G.cam.x, W/2, ARENA.w-W/2);
      G.cam.y = clamp(G.cam.y, H/2, ARENA.h-H/2);
    }else{
      G.cam.x = clamp(G.cam.x, W/2, WORLD.w-W/2);
      G.cam.y = clamp(G.cam.y, H/2, WORLD.h-H/2);
    }
  }

  // 粒子更新
  for(let i=G.particles.length-1;i>=0;i--){
    const p = G.particles[i];
    p.life -= dt;
    if(p.life<=0){ G.particles.splice(i,1); continue; }
    p.x += p.vx*dt; p.y += p.vy*dt;
    p.vy += p.gravity*dt;
    p.vx *= 0.98;
  }
  for(let i=G.floaters.length-1;i>=0;i--){
    const f = G.floaters[i];
    f.life -= dt; f.y += f.vy*dt; f.vy *= 0.94;
    if(f.life<=0) G.floaters.splice(i,1);
  }
  for(let i=G.rings.length-1;i>=0;i--){
    const r = G.rings[i];
    r.life -= dt;
    if(r.life<=0) G.rings.splice(i,1);
  }

  // 灵光
  if(G.motes.length < 80){
    for(let i=G.motes.length;i<80;i++){
      G.motes.push({
        x: G.cam.x + (Math.random()-0.5)*W*1.2,
        y: G.cam.y + (Math.random()-0.5)*H*1.2,
        r: 0.8+Math.random()*1.8,
        p: Math.random()*6.28,
        vy: -(4+Math.random()*10),
        c: Math.random()>0.6 ? 'rgba(240,220,160,.9)' : 'rgba(140,240,210,.9)',
      });
    }
  }
  for(let i=G.motes.length-1;i>=0;i--){
    const m = G.motes[i];
    m.y += m.vy*dt;
    m.x += Math.sin(G.time*0.7+m.p)*6*dt;
    if(Math.abs(m.x-G.cam.x)>W*0.75 || Math.abs(m.y-G.cam.y)>H*0.75){
      m.x = G.cam.x + (Math.random()-0.5)*W*1.1;
      m.y = G.cam.y + H*0.55 + Math.random()*80;
    }
  }

  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,W,H);
  ctx.save();
  const shakeX = G.shake>0 ? (Math.random()-0.5)*G.shake : 0;
  const shakeY = G.shake>0 ? (Math.random()-0.5)*G.shake : 0;
  G.shake = Math.max(0, G.shake - dt*40);
  ctx.translate(W/2-G.cam.x+shakeX, H/2-G.cam.y+shakeY);

  if(G.mode==='login'){
    drawWorldGround();
    drawDecor();
    for(const h of worldGeo.houses) if(inView(h.x,h.y,120)) drawHouse(h);
    drawFog();
  }else if(area==='secret'){
    drawArenaGround(me.secretEl || 'fire');
    // 秘境奇珍
    for(const it of world.items.values()){
      if(it.el===me.secretEl && inView(it.x,it.y,40)) drawSecretItem(it);
    }
    // 秘境实体
    const drawables = [];
    for(const mo of world.mobs.values()){
      if(mo.area==='secret' && mo.secretEl===me.secretEl && inView(mo.x,mo.y,90)){
        drawables.push({ y:mo.y, kind:'mob', o:mo });
      }
    }
    for(const p of world.players.values()){
      if(p.area==='secret' && p.secretEl===me.secretEl && inView(p.x,p.y,70)){
        drawables.push({ y:p.y, kind:'player', o:p });
      }
    }
    drawables.sort((a,b)=>a.y-b.y);
    for(const d of drawables){
      if(d.kind==='mob') drawMob(d.o);
      else drawPlayer(d.o, d.o.id===G.selfId);
    }
    for(const pr of world.projectiles.values()){
      if(pr.area==='secret' && pr.secretEl===me.secretEl && inView(pr.x,pr.y,40)) drawProjectile(pr);
    }
  }else{
    drawWorldGround();
    drawDecor();

    // 灵草
    for(const h of world.herbs.values()){
      if(h.alive && inView(h.x,h.y,40)) drawHerb(h);
    }
    // 宗门
    for(const s of worldGeo.sects) drawSectBase(s);
    // 传送门
    for(const pt of G.portals) drawPortal(pt);

    // 实体排序
    const drawables = [];
    for(const o of worldGeo.obstacles){
      if(!inView(o.x,o.y,80)) continue;
      if(o.type==='tree' || o.type==='rock') drawables.push({ y:o.y, kind:'obs', o });
    }
    for(const h of worldGeo.houses){
      if(!inView(h.x,h.y,120)) continue;
      drawables.push({ y:h.y+h.h/2, kind:'house', o:h });
    }
    for(const mo of world.mobs.values()){
      if(mo.area!=='world') continue;
      if(inView(mo.x,mo.y,70)) drawables.push({ y:mo.y, kind:'mob', o:mo });
    }
    for(const p of world.players.values()){
      if(p.area==='secret') continue;
      if(inView(p.x,p.y,70)) drawables.push({ y:p.y, kind:'player', o:p });
    }
    for(const n of world.npcs.values()){
      if(n.area==='secret') continue;
      if(inView(n.x,n.y,70)) drawables.push({ y:n.y, kind:'npc', o:n });
    }
    drawables.sort((a,b)=>a.y-b.y);
    for(const d of drawables){
      if(d.kind==='obs'){
        if(d.o.type==='tree') drawTree(d.o);
        else drawRock(d.o);
      }else if(d.kind==='house') drawHouse(d.o);
      else if(d.kind==='mob') drawMob(d.o);
      else if(d.kind==='npc') drawNpc(d.o);
      else drawPlayer(d.o, d.o.id===G.selfId);
    }

    // 弹道
    for(const pr of world.projectiles.values()){
      if(pr.area!=='world') continue;
      if(inView(pr.x,pr.y,40)) drawProjectile(pr);
    }
  }

  drawEffects();
  drawMotes();
  drawFog();
  ctx.restore();

  if(G.mode!=='login'){
    render._mmTick = (render._mmTick||0)+1;
    if(render._mmTick % 3 === 0) drawMinimap();   // 小地图约 20fps，够用
  }
  requestAnimationFrame(render);
}

/* ---------------- 奇遇 NPC ---------------- */
function drawNpc(n){
  const t = G.time*0.002;
  const bob = Math.sin(t + (n.phase||0))*3;
  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.scale(1.55, 1.55);
  // 影
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); ctx.ellipse(0, 4, 17, 7, 0, 0, Math.PI*2); ctx.fill();
  // 灵光
  const col = n.color || '#e8cf8a';
  ctx.globalAlpha = 0.2 + Math.sin(t*2.2 + (n.phase||0))*0.1;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, -22+bob, 30, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  // 光柱
  ctx.strokeStyle = col; ctx.globalAlpha = 0.4; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0,-52+bob); ctx.lineTo(0,-22+bob); ctx.stroke();
  ctx.globalAlpha = 1;
  // 袍
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-11, 3); ctx.quadraticCurveTo(0, -26+bob, 11, 3); ctx.lineTo(10, 8); ctx.lineTo(-10, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(16,24,20,.55)'; ctx.lineWidth = 2; ctx.stroke();
  // 腰带
  ctx.fillStyle = 'rgba(16,24,20,.5)';
  ctx.fillRect(-10, 1+bob*0.8, 20, 3);
  // 头
  ctx.fillStyle = '#f7ecd2';
  ctx.beginPath(); ctx.arc(0, -28+bob, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(16,24,20,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
  // 发髻
  ctx.fillStyle = 'rgba(30,36,30,.75)';
  ctx.beginPath(); ctx.arc(0, -35+bob, 4.2, Math.PI, Math.PI*2); ctx.fill();
  // 手中灯笼
  const lx = 13, ly = -18+bob;
  ctx.strokeStyle = 'rgba(20,24,20,.7)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(9,-2+bob); ctx.lineTo(lx, ly+7); ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.arc(lx, ly, 11, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI*2); ctx.fill();
  // 问号
  ctx.fillStyle = '#fff8e0';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('?', 0, -47+bob);
  // 名字
  ctx.restore();
  // 名字（不随缩放）
  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(n.name).width + 12;
  ctx.fillStyle = 'rgba(6,14,12,.78)';
  ctx.fillRect(-tw/2, 18, tw, 15);
  ctx.fillStyle = col;
  ctx.fillText(n.name, 0, 29);
  ctx.restore();
}

/* ---------------- 小地图 ---------------- */
const mm = $('minimap');
const mctx = mm.getContext('2d');
function drawMinimap(){
  const w = mm.width, h = mm.height;
  mctx.clearRect(0,0,w,h);
  mctx.fillStyle = '#081512';
  mctx.fillRect(0,0,w,h);

  const me = getSelf();
  if(me && me.area==='secret'){
    mctx.strokeStyle = 'rgba(200,180,255,.25)';
    mctx.lineWidth = 1;
    mctx.strokeRect(8,8,w-16,h-16);
    mctx.fillStyle = elColor(me.secretEl||'fire');
    mctx.font='11px system-ui'; mctx.textAlign='center';
    mctx.fillText(SECRET_NAMES[me.secretEl||'fire'], w/2, 26);
    const kx = w/ARENA.w, ky = h/ARENA.h;
    mctx.fillStyle = 'rgba(121,224,189,.85)';
    mctx.beginPath(); mctx.arc(ARENA.back.x*kx, ARENA.back.y*ky, 3,0,Math.PI*2); mctx.fill();
    mctx.fillStyle = '#f0dfb4';
    mctx.beginPath(); mctx.arc(me.x*kx, me.y*ky, 3,0,Math.PI*2); mctx.fill();
    for(const mo of world.mobs.values()){
      if(mo.area==='secret' && mo.secretEl===me.secretEl && mo.hp>0){
        mctx.fillStyle = '#ff8a5c';
        mctx.beginPath(); mctx.arc(mo.x*kx, mo.y*ky, MOB_TYPES[mo.type].boss?3:1.6,0,Math.PI*2); mctx.fill();
      }
    }
    return;
  }

  const kx = w/WORLD.w, ky = h/WORLD.h;

  // 四环
  for(const r of RINGS){
    mctx.fillStyle = r.safe ? 'rgba(217,192,138,.12)' : hexA(r.accent,.10);
    mctx.beginPath();
    mctx.arc(CX*kx,CY*ky,r.r1*kx,0,Math.PI*2);
    mctx.fill();
    mctx.strokeStyle = 'rgba(255,255,255,.08)'; mctx.lineWidth = 1;
    mctx.beginPath(); mctx.arc(CX*kx,CY*ky,r.r0*kx,0,Math.PI*2); mctx.stroke();
  }
  // 村 / 坊市
  mctx.fillStyle = 'rgba(217,192,138,.35)';
  mctx.beginPath(); mctx.arc(TOWN.x*kx,TOWN.y*ky,TOWN.r*kx,0,Math.PI*2); mctx.fill();
  mctx.fillStyle = 'rgba(240,223,180,.4)';
  mctx.beginPath(); mctx.arc(FAIR.x*kx,FAIR.y*ky,FAIR.r*kx,0,Math.PI*2); mctx.fill();

  // 宗门
  for(const s of worldGeo.sects){
    mctx.strokeStyle = hexA(s.color,.75); mctx.lineWidth = 1.4;
    mctx.beginPath(); mctx.arc(s.x*kx,s.y*ky,4,0,Math.PI*2); mctx.stroke();
    mctx.fillStyle = hexA(s.color,.5);
    mctx.fillRect(s.x*kx-2,s.y*ky-2,4,4);
  }
  // 传送门
  for(const pt of G.portals){
    mctx.fillStyle = elColor(pt.el);
    mctx.beginPath(); mctx.arc(pt.x*kx,pt.y*ky,2.2,0,Math.PI*2); mctx.fill();
  }
  // 妖兽
  for(const mo of world.mobs.values()){
    if(mo.area!=='world' || mo.hp<=0) continue;
    const boss = MOB_TYPES[mo.type] && MOB_TYPES[mo.type].boss;
    mctx.fillStyle = boss ? '#ff8a5c' : 'rgba(224,107,90,.75)';
    mctx.beginPath(); mctx.arc(mo.x*kx,mo.y*ky, boss?3:1.5,0,Math.PI*2); mctx.fill();
  }
  // 玩家
  for(const p of world.players.values()){
    if(p.area==='secret') continue;
    mctx.fillStyle = p.id===G.selfId ? '#f0dfb4' : (p.devil ? '#c9b8ff' : 'rgba(121,224,189,.9)');
    mctx.beginPath(); mctx.arc(p.x*kx,p.y*ky, p.id===G.selfId?3:2.2,0,Math.PI*2); mctx.fill();
  }
  // 奇遇 NPC
  for(const n of world.npcs.values()){
    if(n.area==='secret') continue;
    mctx.fillStyle = 'rgba(232,207,138,.95)';
    mctx.save();
    mctx.translate(n.x*kx, n.y*ky);
    mctx.rotate(Math.PI/4);
    mctx.fillRect(-1.8, -1.8, 3.6, 3.6);
    mctx.restore();
  }
  // 视野框
  const vw = (W/WORLD.w)*w, vh = (H/WORLD.h)*h;
  mctx.strokeStyle = 'rgba(240,223,180,.35)'; mctx.lineWidth = 1;
  mctx.strokeRect(me? (me.x*kx-vw/2):0, me? (me.y*ky-vh/2):0, vw, vh);

  // 环名
  mctx.font = '9px system-ui'; mctx.textAlign='center'; mctx.textBaseline='middle';
  mctx.fillStyle = 'rgba(230,225,210,.4)';
  for(const r of RINGS) mctx.fillText('第'+r.id+'环', CX*kx, (CY+r.r0+30)*ky);
}

