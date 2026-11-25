/* ============================================================
   js/input.js — 键盘 / 鼠标 / 触屏 / 按钮绑定
   ============================================================ */
'use strict';

function syncKeys(){
  input.up = !!(KEYS[BINDS.moveUp]||KEYS['ArrowUp']);
  input.down = !!(KEYS[BINDS.moveDown]||KEYS['ArrowDown']);
  input.left = !!(KEYS[BINDS.moveLeft]||KEYS['ArrowLeft']);
  input.right = !!(KEYS[BINDS.moveRight]||KEYS['ArrowRight']);
}

/* 按键码 → 动作名 */
function actionOf(code){
  for(const a of BIND_ACTIONS) if(BINDS[a.id] === code) return a.id;
  return null;
}

document.addEventListener('keydown', e=>{
  const tgt = e.target;
  if(tgt && (tgt.tagName==='INPUT' || tgt.tagName==='TEXTAREA')) return;   // 聊天输入中不抢键
  if(rebindingId){ handleRebindKey(e); return; }
  if(G.mode!=='playing') return;

  KEYS[e.code] = true;
  syncKeys();

  if(e.code==='Escape'){
    cancelRebind();
    closeSettings();
    closeShop();
    closeSectPanel();
    closeGift();
    $('chatInput').blur();
    return;
  }

  const act = actionOf(e.code);
  if(act){
    if(act==='meditate'){ input.med = true; }
    else if(!e.repeat){
      switch(act){
        case 'basic': cast('basic'); break;
        case 's1': case 's2': case 's3': case 's4': case 's5':
        case 's6': case 's7': case 's8': case 's9':
          cast(act.slice(1)); break;
        case 'secret': cast('secret'); break;
        case 'sect': cast('sect'); break;
        case 'gather': gather(); break;
        case 'break': requestBreak(); break;
        case 'herb': useHerb(); break;
        case 'healPill': useItem('heal'); break;
        case 'expPill': useItem('exp'); break;
        case 'thunder': useThunderHerb(); break;
        case 'swap': swapRoot(); break;
        case 'trial': tryTrial(); break;
        case 'leaveSect': leaveSect(); break;
        case 'spar': spar(); break;
        case 'mentor': mentor(); break;
        case 'rage': toggleRage(); break;
        case 'shop': toggleShop(); break;
        case 'control': cycleControl(); break;
        case 'mute': toggleMute(); break;
        case 'settings': toggleSettings(); break;
        case 'chat': e.preventDefault(); $('chatInput').focus(); break;
      }
    }
  }

  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup', e=>{
  KEYS[e.code] = false;
  syncKeys();
  if(actionOf(e.code) === 'meditate') input.med = false;
});

window.addEventListener('blur', ()=>{
  for(const k in KEYS) KEYS[k] = false;
  syncKeys();
  input.med = false;
  input.ax = 0; input.ay = 0;
});

/* ---------------- 鼠标 ---------------- */
canvas.addEventListener('mousemove', e=>{
  input.mouseX = e.clientX;
  input.mouseY = e.clientY;
  input.hasMouse = true;
});
canvas.addEventListener('mousedown', e=>{
  if(e.button!==0) return;
  if(G.mode!=='playing') return;
  input.hasMouse = true;
  input.mouseX = e.clientX; input.mouseY = e.clientY;
  updateAim();
  cast('basic');
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

/* ---------------- 聊天 ---------------- */
$('chatInput').addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    const text = $('chatInput').value.trim();
    if(text){ sendChat(text); $('chatInput').value = ''; }
    $('chatInput').blur();
    e.preventDefault();
  }else if(e.key==='Escape'){
    $('chatInput').blur();
  }
});
$('chatSend').onclick = ()=>{
  const text = $('chatInput').value.trim();
  if(!text) return;
  sendChat(text);
  $('chatInput').value = '';
};
document.querySelectorAll('.emote-btn').forEach(el=>{
  el.onclick = ()=> emote(el.dataset.emote);
});
$('giftBtn').onclick = ()=> openGift();
$('giftClose').onclick = ()=> closeGift();

/* ---------------- 触屏摇杆 ---------------- */
(function setupStick(){
  const stick = $('mobileStick');
  const knob = stick.querySelector('.knob');
  let active = false, cx=0, cy=0;
  const maxR = 42;
  function setKnob(dx,dy){ knob.style.transform = `translate(${dx}px,${dy}px)`; }
  stick.addEventListener('pointerdown', e=>{
    active = true;
    try{ stick.setPointerCapture(e.pointerId); }catch(err){}
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width/2; cy = r.top + r.height/2;
    move(e);
  });
  function move(e){
    if(!active) return;
    let dx = e.clientX-cx, dy = e.clientY-cy;
    const d = Math.hypot(dx,dy);
    if(d > maxR){ dx = dx/d*maxR; dy = dy/d*maxR; }
    setKnob(dx,dy);
    input.ax = dx/maxR; input.ay = dy/maxR;
  }
  stick.addEventListener('pointermove', move);
  function end(){
    active = false;
    setKnob(0,0);
    input.ax = 0; input.ay = 0;
  }
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
  stick.addEventListener('pointerleave', ()=>{ if(active) end(); });
})();

/* ---------------- 按钮 ---------------- */
$('createBtn').onclick = ()=> startNet(true);
$('joinBtn').onclick = ()=> startNet(false);
$('shopBtn').onclick = ()=> openShop();
$('shopClose').onclick = ()=> closeShop();
$('sectClose').onclick = ()=> closeSectPanel();
document.querySelectorAll('#shopPanel [data-buy]').forEach(el=>{
  el.onclick = ()=> buy(el.dataset.buy);
});
$('backLogin').onclick = ()=> location.reload();
$('muteBtn').onclick = ()=> toggleMute();
$('settingBtn').onclick = ()=> toggleSettings();
$('settingsClose').onclick = ()=> closeSettings();
$('resetBinds').onclick = ()=> resetBinds();
$('replayTut').onclick = ()=>{ closeSettings(); tutIdx=0; startTutorial(); };
$('tuPrev').onclick = ()=> tutorialPrev();
$('tuNext').onclick = ()=> tutorialNext();
$('tuSkip').onclick = ()=> endTutorial(true);

function toggleMute(){
  G.muted = !G.muted;
  $('muteBtn').textContent = G.muted ? '🔇' : '🔊';
  if(!G.muted) ensureAudio();
}

$('nameInput').addEventListener('keydown', e=>{ if(e.key==='Enter') $('roomInput').focus(); });
$('roomInput').addEventListener('keydown', e=>{ if(e.key==='Enter') startNet(true); });

