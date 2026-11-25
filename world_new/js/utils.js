/* ============================================================
   js/utils.js — 基础工具函数
   ============================================================ */
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const lerp = (a,b,t) => a+(b-a)*t;
const dist = (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1);
const now = () => performance.now();
const fmt = n => n>=10000 ? (n/10000).toFixed(1)+'万' : String(Math.round(n));
const randInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0).toString(36);
}
function roomKey(name){
  const raw = String(name||'').trim();
  return 'qx-' + hashStr(raw) + '-' + raw.length;
}
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function angleDiff(a,b){
  return Math.abs(((a-b+Math.PI*3)%(Math.PI*2))-Math.PI);
}
function ringIndexAt(x,y){
  const d = dist(x,y,CX,CY);
  for(const r of RINGS){ if(d >= r.r0 && d < r.r1) return r; }
  return d < RINGS[0].r1 ? RINGS[0] : RINGS[RINGS.length-1];
}

