/* ============================================================
   js/state.js — 全局状态容器
   ============================================================ */
'use strict';

const G = {
  mode:'login',
  seed:20261113,
  time:0,
  cam:{ x:CX, y:CY },
  selfId:null,
  isHost:false,
  netReady:false,
  roomName:'',
  playerName:'',
  gender:'male',
  root:'fire',
  control:'classic',
  ff:(function(){ try{ return localStorage.getItem('qw_ff_v1')==='1'; }catch(e){ return false; } })(),
  sectsOn:true,

  area:'world',          // world | secret
  secretEl:null,         // 当前所处秘境属性

  particles:[], floaters:[], rings:[], motes:[],
  shake:0, muted:false, shopOpen:false, sectOpen:false,
  cheatOn:false, cheatOpen:false, cheatOff:false,
  ping:0, portals:[],
  hint:'', lastHint:'',
  quests:{ meditated:false, revealedSecret:false },
  stats:{ kills:0, gathered:0, deaths:0 },
  trib:{ active:false, left:10 },
};

const world = {
  players:new Map(),
  mobs:new Map(),
  herbs:new Map(),
  projectiles:new Map(),
  items:new Map(),       // 秘境奇珍异宝
  npcs:new Map(),        // 随机奇遇 NPC
};

const input = {
  up:false, down:false, left:false, right:false,
  ax:0, ay:0,
  med:false,
  aim:0,
  mouseX:0, mouseY:0,
  hasMouse:false,
};

const KEYS = {};

const worldGeo = {
  obstacles:[], houses:[], herbs:[], decor:[], ponds:[], paths:[], sects:[], portals:[]
};

let peer = null;
let conns = new Map();
let hostConn = null;
let pendingEvents = [];
let herbChanges = [];
let loopsStarted = false;
let mobSeq = 0;
let projSeq = 0;
let itemSeq = 0;
let nextPortalAt = 0;
let lastAchAt = 0;
/* 传送门换位间隔：30–60 秒随机 */
function portalNextDelay(){ return 30000 + Math.random()*30000; }
let lastExpSeen = 0;

