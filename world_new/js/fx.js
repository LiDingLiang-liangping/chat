/* ============================================================
   js/fx.js — 粒子 / 飘字 / 光环特效数据
   ============================================================ */
'use strict';

function spawnParticles(x,y,n,color,spread=90,size=3,life=0.6){
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, v = spread*(0.3+Math.random()*0.7);
    G.particles.push({
      x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-20,
      life:life*(0.6+Math.random()*0.7), max:life, size:size*(0.6+Math.random()*0.8),
      color, gravity:40,
    });
  }
}
function floatText(x,y,text,color='#fff',size=13){
  G.floaters.push({ x,y,text,color,size,life:1.0,max:1.0,vy:-46 });
}
function ring(x,y,color,radius=60,life=0.5){
  G.rings.push({ x,y,color,r:8,maxR:radius,life,max:life });
}

