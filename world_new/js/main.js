/* ============================================================
   js/main.js — 启动入口
   ============================================================ */
'use strict';

/* URL 参数预填 */
(function prefillFromUrl(){
  try{
    const q = new URLSearchParams(location.search);
    const room = (q.get('room')||'').trim();
    if(room) $('roomInput').value = room.slice(0,16);
    const nm = (q.get('name')||'').trim();
    if(nm) $('nameInput').value = nm.slice(0,10);
  }catch(e){}
})();

/* 登录选择绑定 */
bindLoginUI();
renderLoginHelp();

/* 生成世界并开始渲染 */
generateWorld();
render();

