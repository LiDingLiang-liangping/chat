/* ============================================================
   js/audio.js — 程序化音效（Web Audio API，无外部资源）
   ============================================================ */
'use strict';

let audioCtx = null;
function ensureAudio(){
  if(!audioCtx){
    try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
  }
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq, dur, type='sine', vol=0.05, slide=0){
  if(G.muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq+slide), t+dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t+dur+0.02);
}
function sfx(name){
  switch(name){
    case 'attack': tone(420,0.08,'triangle',0.035,-180); break;
    case 'bolt':   tone(780,0.14,'sawtooth',0.028,-420); break;
    case 'aoe':    tone(180,0.34,'sawtooth',0.05,120); break;
    case 'hit':    tone(140,0.1,'square',0.04,-60); break;
    case 'heal':   tone(520,0.4,'sine',0.04,260); break;
    case 'gather': tone(660,0.18,'sine',0.035,180); break;
    case 'level':  tone(523,0.18,'sine',0.05,0); setTimeout(()=>tone(659,0.18,'sine',0.05,0),110); setTimeout(()=>tone(784,0.3,'sine',0.05,0),220); break;
    case 'break':  tone(392,0.5,'sine',0.05,392); setTimeout(()=>tone(587,0.6,'sine',0.045,294),160); break;
    case 'die':    tone(220,0.6,'sawtooth',0.045,-160); break;
    case 'buy':    tone(880,0.1,'sine',0.03,120); break;
    case 'thunder':tone(90,0.7,'square',0.07,60); setTimeout(()=>tone(70,0.5,'sawtooth',0.05,-20),120); break;
    case 'devil':  tone(120,0.9,'sawtooth',0.06,-60); setTimeout(()=>tone(88,0.9,'square',0.05,0),300); break;
    case 'sect':   tone(392,0.4,'sine',0.05,196); setTimeout(()=>tone(660,0.5,'sine',0.045,0),200); break;
  }
}

