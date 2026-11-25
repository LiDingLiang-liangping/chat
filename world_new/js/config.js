/* ============================================================
   js/config.js — 世界常量、五行、技能、妖兽、宗门、秘境配置
   ============================================================ */
'use strict';

const WORLD = { w:5200, h:5200 };
const CX = WORLD.w/2, CY = WORLD.h/2;

/* 四环：由内向外的同心环（新手村缩小，外环放大） */
const RINGS = [
  { id:1, r0:0,    r1:300,  name:'第一环 · 青云村',   tier:0, density:1.0, safe:true,  color:'#3d4a33', accent:'#8a9a63' },
  { id:2, r0:300,  r1:850,  name:'第二环 · 基层灵野', tier:0, density:1.5, safe:false, color:'#1e4034', accent:'#5fc9a6' },
  { id:3, r0:850,  r1:1480, name:'第三环 · 中层幽域', tier:1, density:2.2, safe:false, color:'#232b45', accent:'#8a79c9' },
  { id:4, r0:1480, r1:2150, name:'第四环 · 高层绝域', tier:2, density:3.2, safe:false, color:'#294553', accent:'#9fd3e8' },
];
const TIER_NAMES = ['低阶','中阶','高阶'];
function tierOf(realm){ return realm <= 8 ? 0 : (realm <= 14 ? 1 : 2); }
function maxRadiusFor(realm){ const t = tierOf(realm); return t>=2 ? RINGS[3].r1 : (t>=1 ? RINGS[2].r1 : RINGS[1].r1); }

const TOWN = { x:CX-72, y:CY-80, r:150 };
const FAIR = { x:CX+180, y:CY-96, r:105 };

/* 境界 */
const REALM_NAMES = [
  '炼气一层','炼气二层','炼气三层','炼气四层','炼气五层',
  '炼气六层','炼气七层','炼气八层','炼气九层',
  '筑基初期','筑基中期','筑基后期',
  '金丹初期','金丹中期','金丹后期',
  '元婴初期','元婴中期','元婴后期',
  '化神'
];
function realmInfo(i){
  i = i<0?0:(i>REALM_NAMES.length-1?REALM_NAMES.length-1:i);
  return {
    idx:i, name:REALM_NAMES[i],
    maxHp: Math.round(100*Math.pow(1.20,i)),
    maxMp: Math.round(100*Math.pow(1.18,i)),
    atk:   Math.round(14*Math.pow(1.19,i)),
    def:   Math.round(2*Math.pow(1.15,i)),
    need:  Math.round(100*Math.pow(1.40,i)),
  };
}

/* ---------------- 五行 ---------------- */
const EL_LIST = ['metal','wood','water','fire','earth'];
const ELEMENT_INFO = {
  metal:{ key:'metal', name:'金', color:'#f0e2a8', glow:'#ffeaa8', robe:'#cfd8de', dark:'#7c6e3a' },
  wood: { key:'wood',  name:'木', color:'#8fe6b0', glow:'#a6ffc4', robe:'#a8d9b6', dark:'#3f7b52' },
  water:{ key:'water', name:'水', color:'#8fd8f0', glow:'#b0e8ff', robe:'#a6cfe0', dark:'#356a8c' },
  fire: { key:'fire',  name:'火', color:'#ff9a6a', glow:'#ffb98a', robe:'#e0b0a0', dark:'#8c3f33' },
  earth:{ key:'earth', name:'土', color:'#e0b98a', glow:'#f0cfa0', robe:'#d9c6a6', dark:'#8a6b45' },
  thunder:{ key:'thunder', name:'雷', color:'#c9b8ff', glow:'#dcd0ff', robe:'#c8c0e8', dark:'#5b4a94' },
};
const SHENG = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' }; // A 生 B
const KE    = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' }; // A 克 B
function elName(k){ return (ELEMENT_INFO[k]||{name:'无'}).name; }
function elColor(k){ return (ELEMENT_INFO[k]||{color:'#cfe3dd'}).color; }
/* 相克：1 克对方，-1 被对方克，0 无关 */
function relation(a,b){ if(!a||!b||a===b) return 0; if(KE[a]===b) return 1; if(KE[b]===a) return -1; return 0; }
/* 相生（双向判定）：1 有相生，0 无 */
function shengRel(a,b){ if(!a||!b||a===b) return 0; if(SHENG[a]===b||SHENG[b]===a) return 1; return 0; }
function elemMult(atkEl,defEl){ const r = relation(atkEl,defEl); return r===1 ? 1.35 : (r===-1 ? 0.85 : 1); }

/* ---------------- 技能 ---------------- */
/* type: melee / bolt / multi / aoe / burst / pierce / heal / healShield / dash / blink */
const SKILL_ICON = { melee:'⚔', bolt:'➶', multi:'✧', aoe:'💥', burst:'◉', pierce:'☄', heal:'✚', healShield:'❖', dash:'➤', blink:'✦' };

function mk(el, arr){
  return arr.map((s,i)=>({ el, slot:i+1, key:el+(i+1), icon:SKILL_ICON[s.type]||'◈', ...s }));
}

const ELEMENT_SKILLS = {
  metal: mk('metal',[
    { name:'庚金剑气', type:'bolt',   mp:10, cd:0.9,  mult:1.55, speed:640, radius:14, life:0.95 },
    { name:'万剑归宗', type:'multi',  mp:26, cd:3.2,  mult:0.85, speed:560, radius:12, count:4, life:0.9, spread:0.13 },
    { name:'金刃风暴', type:'aoe',    mp:32, cd:4.6,  mult:1.75, aoe:138 },
    { name:'破军斩',   type:'melee',  mp:14, cd:1.6,  mult:2.40, range:112, arc:1.3 },
    { name:'金光穿云', type:'pierce', mp:40, cd:5.5,  mult:2.80, speed:760, radius:16, pierce:5, life:1.3 },
    { name:'金精固元', type:'heal',   mp:26, cd:8.0,  pct:0.32 },
    { name:'庚金护体', type:'healShield', mp:36, cd:14, pct:0.22, shield:0.34 },
    { name:'金遁',     type:'dash',   mp:12, cd:4.0,  dist:200 },
    { name:'剑遁千里', type:'blink',  mp:26, cd:9.0,  dist:420 },
  ]),
  wood: mk('wood',[
    { name:'青木刺',   type:'bolt',   mp:8,  cd:0.75, mult:1.35, speed:600, radius:13, life:0.95 },
    { name:'飞叶成刃', type:'multi',  mp:22, cd:2.6,  mult:0.80, speed:540, radius:11, count:4, life:0.85, spread:0.16 },
    { name:'万木朝春', type:'aoe',    mp:34, cd:5.0,  mult:1.90, aoe:152 },
    { name:'藤鞭绞',   type:'melee',  mp:12, cd:1.3,  mult:2.05, range:104, arc:1.5 },
    { name:'苍木贯日', type:'pierce', mp:38, cd:5.2,  mult:2.55, speed:680, radius:18, pierce:4, life:1.2 },
    { name:'春生术',   type:'heal',   mp:24, cd:7.0,  pct:0.34 },
    { name:'木灵滋养', type:'healShield', mp:32, cd:12, pct:0.22, shield:0.30 },
    { name:'藤跃',     type:'dash',   mp:10, cd:3.6,  dist:185 },
    { name:'林遁',     type:'blink',  mp:24, cd:8.0,  dist:375 },
  ]),
  water: mk('water',[
    { name:'寒水箭',   type:'bolt',   mp:8,  cd:0.75, mult:1.40, speed:620, radius:13, life:0.95 },
    { name:'冰棱三叠', type:'multi',  mp:22, cd:2.6,  mult:0.78, speed:560, radius:11, count:3, life:0.9, spread:0.14 },
    { name:'潮涌术',   type:'aoe',    mp:30, cd:4.4,  mult:1.65, aoe:148 },
    { name:'水龙吟',   type:'melee',  mp:16, cd:2.0,  mult:2.30, range:122, arc:1.6 },
    { name:'玄冰穿心', type:'pierce', mp:38, cd:5.4,  mult:2.60, speed:720, radius:16, pierce:5, life:1.25 },
    { name:'甘露诀',   type:'heal',   mp:22, cd:6.5,  pct:0.36 },
    { name:'清心诀',   type:'healShield', mp:34, cd:13, pct:0.20, shield:0.38, mpGain:0.25 },
    { name:'踏浪',     type:'dash',   mp:10, cd:3.5,  dist:215 },
    { name:'水遁',     type:'blink',  mp:26, cd:8.0,  dist:400 },
  ]),
  fire: mk('fire',[
    { name:'火球术',   type:'bolt',   mp:10, cd:0.9,  mult:1.65, speed:560, radius:15, life:0.9 },
    { name:'火焰连珠', type:'multi',  mp:24, cd:2.8,  mult:0.88, speed:520, radius:13, count:4, life:0.85, spread:0.12 },
    { name:'爆炎术',   type:'aoe',    mp:34, cd:4.8,  mult:2.05, aoe:158 },
    { name:'赤炎爪',   type:'melee',  mp:14, cd:1.5,  mult:2.35, range:106, arc:1.6 },
    { name:'焚天柱',   type:'pierce', mp:42, cd:5.8,  mult:3.05, speed:780, radius:18, pierce:6, life:1.15 },
    { name:'浴火回春', type:'heal',   mp:26, cd:8.0,  pct:0.33 },
    { name:'赤阳暖体', type:'healShield', mp:36, cd:14, pct:0.20, shield:0.32 },
    { name:'火遁',     type:'dash',   mp:12, cd:3.8,  dist:225 },
    { name:'烈焰疾行', type:'blink',  mp:28, cd:9.0,  dist:435 },
  ]),
  earth: mk('earth',[
    { name:'落石术',   type:'bolt',   mp:9,  cd:0.85, mult:1.45, speed:520, radius:18, life:1.0 },
    { name:'地刺阵',   type:'burst',  mp:24, cd:3.0,  mult:1.70, range:150, aoe:105 },
    { name:'山崩',     type:'aoe',    mp:36, cd:5.2,  mult:2.00, aoe:164 },
    { name:'岩拳',     type:'melee',  mp:14, cd:1.6,  mult:2.50, range:110, arc:1.2 },
    { name:'巨岩冲撞', type:'pierce', mp:38, cd:5.4,  mult:2.45, speed:620, radius:22, pierce:4, life:1.2 },
    { name:'厚土回春', type:'heal',   mp:24, cd:7.0,  pct:0.35 },
    { name:'大地滋养', type:'healShield', mp:32, cd:13, pct:0.22, shield:0.30 },
    { name:'土遁',     type:'dash',   mp:10, cd:3.4,  dist:185 },
    { name:'地行术',   type:'blink',  mp:24, cd:8.0,  dist:380 },
  ]),
};

const BASIC_SKILL = el => ({ name:'引气击', type:'melee', mp:0, cd:0.5, mult:1.0, range:92, arc:1.95, el, icon:'⚔' });

/* 秘境秘法（击败秘境 BOSS 习得，威力高、耗灵大） */
const SECRET_SKILLS = {
  metal:{ name:'九天剑狱', type:'aoe',    mp:88, cd:22, mult:5.2, aoe:215 },
  wood: { name:'万古青藤', type:'aoe',    mp:82, cd:20, mult:4.6, aoe:235 },
  water:{ name:'玄冰龙吟', type:'pierce', mp:84, cd:21, mult:4.0, speed:760, radius:26, pierce:9, life:1.6 },
  fire: { name:'焚天灭世', type:'aoe',    mp:90, cd:24, mult:5.6, aoe:225 },
  earth:{ name:'山岳镇魂', type:'aoe',    mp:86, cd:22, mult:5.0, aoe:245 },
};

/* 宗门秘法（主长老传授） */
const SECT_SKILLS = {
  tianjian:{ name:'天剑·诛邪', type:'pierce', mp:90, cd:24, mult:4.8, speed:900, radius:30, pierce:12, life:1.1 },
  lingxi:  { name:'灵溪·万木春', type:'heal', mp:70, cd:26, pct:0.62, mpGain:0.5 },
  youming: { name:'幽冥·噬魂', type:'aoe', mp:78, cd:23, mult:4.4, aoe:205 },
};

function skillAt(el, slot){
  const list = ELEMENT_SKILLS[el]; if(!list) return null;
  return list[slot-1] || null;
}
function firstSecretOf(p){
  for(const el of EL_LIST) if(p.secret && p.secret[el]) return { el, ...SECRET_SKILLS[el], key:'secret', icon:'✵' };
  return null;
}

/* ---------------- 妖兽 ---------------- */
const MOB_TYPES = {
  /* 第二环 */
  fox:    { name:'灵狐',     el:'wood',  ring:2, shape:'fox',   hp:115,  atk:12, def:1,  exp:26,  stones:[4,8],    speed:82,  aggro:230, range:40, cd:1.2, r:14, color:'#d98b4a' },
  wolf:   { name:'赤炎狼',   el:'fire',  ring:2, shape:'wolf',  hp:240,  atk:20, def:3,  exp:54,  stones:[9,16],   speed:106, aggro:280, range:44, cd:1.05,r:16, color:'#b8503c' },
  dragon: { name:'墨蛟',     el:'water', ring:2, shape:'dragon',hp:3400, atk:46, def:16, exp:820, stones:[160,260],speed:92,  aggro:400, range:76, cd:1.4, r:30, color:'#5b8fa8', boss:true },
  /* 第三环 */
  turtle: { name:'玄龟',     el:'earth', ring:3, shape:'turtle',hp:560,  atk:28, def:16, exp:150, stones:[18,30],  speed:52,  aggro:200, range:48, cd:1.6, r:21, color:'#7c9b85' },
  spider: { name:'幽冥毒蛛', el:'water', ring:3, shape:'spider',hp:430,  atk:36, def:4,  exp:140, stones:[16,26],  speed:116, aggro:310, range:42, cd:1.0, r:16, color:'#9a7fc0' },
  golem:  { name:'岩魈',     el:'earth', ring:3, shape:'golem', hp:720,  atk:32, def:22, exp:170, stones:[20,34],  speed:70,  aggro:250, range:52, cd:1.5, r:22, color:'#8a7f70' },
  flamewyrm:{ name:'赤焰蛟王',el:'fire', ring:3, shape:'dragon',hp:4800, atk:62, def:20, exp:1200,stones:[240,360],speed:100, aggro:430, range:80, cd:1.3, r:32, color:'#c9683a', boss:true },
  spiderqueen:{name:'玄冥蛛后',el:'water',ring:3,shape:'spider',hp:4300, atk:58, def:14, exp:1150,stones:[220,340],speed:124, aggro:420, range:74, cd:1.1, r:30, color:'#8a6fc0', boss:true },
  goldcorp:{ name:'金甲尸将', el:'metal', ring:3, shape:'golem', hp:5200, atk:66, def:26, exp:1250,stones:[250,380],speed:88,  aggro:400, range:78, cd:1.4, r:31, color:'#c9b06a', boss:true },
  /* 第四环：血厚、攻高、数量多 */
  bloodlizard:{ name:'血鳞蜥', el:'fire',  ring:4, shape:'lizard', hp:1500, atk:72, def:12, exp:380, stones:[40,60], speed:118, aggro:330, range:50, cd:1.05, r:20, color:'#a8453a' },
  ironcolossus:{name:'玄铁巨像',el:'metal',ring:4, shape:'golem',  hp:2600, atk:64, def:34, exp:460, stones:[50,80], speed:58,  aggro:300, range:56, cd:1.7, r:26, color:'#8a8f9a' },
  wraith:{ name:'幽冥鬼将', el:'water', ring:4, shape:'wraith', hp:1800, atk:84, def:10, exp:430, stones:[45,70], speed:132, aggro:360, range:48, cd:0.95, r:19, color:'#7f8fc0' },
  cinderowl:{ name:'焚天枭', el:'fire',  ring:4, shape:'bird',   hp:1350, atk:96, def:8,  exp:400, stones:[42,66], speed:150, aggro:380, range:46, cd:1.0, r:18, color:'#d86a3a' },
  /* 秘境 BOSS */
  secmetal:{ name:'鎏金剑傀', el:'metal', shape:'puppet', hp:6400, atk:86, def:28, exp:1600, stones:[300,450], speed:96, aggro:600, range:82, cd:1.25, r:32, color:'#e8d891', boss:true },
  secwood: { name:'万年木魈', el:'wood',  shape:'golem',  hp:7000, atk:80, def:24, exp:1600, stones:[300,450], speed:88, aggro:600, range:84, cd:1.3, r:33, color:'#7fbf8a', boss:true },
  secwater:{ name:'寒渊水君', el:'water', shape:'dragon', hp:6800, atk:90, def:20, exp:1600, stones:[300,450], speed:112, aggro:600, range:80, cd:1.2, r:34, color:'#6fb0d8', boss:true },
  secfire: { name:'焚天魔君', el:'fire',  shape:'dragon', hp:6600, atk:98, def:18, exp:1600, stones:[300,450], speed:120, aggro:600, range:78, cd:1.15, r:33, color:'#e07a4a', boss:true },
  secearth:{ name:'厚土山神', el:'earth', shape:'golem',  hp:8200, atk:76, def:36, exp:1600, stones:[300,450], speed:74, aggro:600, range:88, cd:1.5, r:36, color:'#b89a72', boss:true },
};
const SECRET_MOB = { metal:'secmetal', wood:'secwood', water:'secwater', fire:'secfire', earth:'secearth' };
const SECRET_NAMES = { metal:'金之秘境', wood:'木之秘境', water:'水之秘境', fire:'火之秘境', earth:'土之秘境' };

/* 各环固定刷新点位（相对环心极角） —— 保证"固定生成"的区域特色小怪 */
const RING_SPAWNS = [
  { ring:2, type:'fox',    count:12,  spread:0.80 },
  { ring:2, type:'wolf',   count:9,  spread:0.80 },
  { ring:3, type:'turtle', count:8,  spread:0.84 },
  { ring:3, type:'spider', count:10,  spread:0.84 },
  { ring:3, type:'golem',  count:8,  spread:0.84 },
  { ring:4, type:'bloodlizard',  count:15, spread:0.88 },
  { ring:4, type:'ironcolossus', count:12,  spread:0.88 },
  { ring:4, type:'wraith',       count:10,  spread:0.88 },
  { ring:4, type:'cinderowl',    count:10,  spread:0.88 },
];
const RING_BOSSES = [
  { ring:2, type:'dragon',   ang:-0.4,  dist:600 },
  { ring:3, type:'flamewyrm',ang:0.9,   dist:1180 },
  { ring:3, type:'spiderqueen', ang:2.6, dist:1180 },
  { ring:3, type:'goldcorp', ang:4.4,   dist:1180 },
];

/* ---------------- 宗门 ---------------- */
const SECTS = [
  { id:'tianjian', name:'天剑宗', el:'metal', ring:2, radius:600, ang:-1.1, tier:0, color:'#9fc7d8',
    desc:'剑修之地 · 攻伐第一 · 攻击永久 +8%',
    atkBonus:0.08, hpBonus:0,
    peaks:[
      { name:'剑鸣峰', elder:'玄剑长老', dens:1.4, main:false },
      { name:'洗锋峰', elder:'素心长老', dens:1.7, main:false },
      { name:'藏锋峰', elder:'守拙长老', dens:2.0, main:true  },
    ] },
  { id:'lingxi', name:'灵溪宗', el:'wood', ring:3, radius:1160, ang:1.9, tier:1, color:'#79e0bd',
    desc:'灵植药道 · 生生不息 · 气血上限 +10%',
    atkBonus:0, hpBonus:0.10,
    peaks:[
      { name:'青木峰', elder:'青禾长老', dens:1.5, main:false },
      { name:'流泉峰', elder:'听泉长老', dens:1.8, main:false },
      { name:'药王峰', elder:'百草长老', dens:2.2, main:true  },
    ] },
  { id:'youming', name:'幽冥谷', el:'water', ring:4, radius:1820, ang:3.6, tier:2, color:'#9a7fc0',
    desc:'幽冥诡道 · 灵力深厚 · 灵力上限 +15%',
    atkBonus:0, hpBonus:0,
    mpBonus:0.15,
    peaks:[
      { name:'白骨峰', elder:'枯骨长老', dens:1.8, main:false },
      { name:'幽泉峰', elder:'寒潭长老', dens:2.4, main:false },
      { name:'归墟峰', elder:'无归长老', dens:3.0, main:true  },
    ] },
];
const SECT_BY_ID = {};
SECTS.forEach(s=>SECT_BY_ID[s.id]=s);

/* ---------------- 秘境 ---------------- */
const ARENA = { w:1200, h:900, cx:600, cy:450, r:352, entry:{x:600,y:720}, back:{x:600,y:856} };
const SECRET_ITEM_KINDS = [
  { kind:'hp',   name:'血灵芝', color:'#e06b5a' },
  { kind:'mp',   name:'灵泉露', color:'#69c7e8' },
  { kind:'exp',  name:'道果',   color:'#e8cf8a' },
  { kind:'stone',name:'玄铁精', color:'#b9c7c0' },
];

/* 操作方式 */
const CONTROL_INFO = {
  classic:{ name:'经典御剑', desc:'鼠标仅定攻击方向，WASD 绝对方向移动' },
  facing: { name:'意随心动', desc:'鼠标指哪人朝哪，W 向鼠标方向走' },
  lockon: { name:'灵觉锁敌', desc:'攻击自动锁定最近妖兽，WASD 绝对移动', femaleOnly:true },
};

/* ---------------- 成就 / 称号 ---------------- */
const ACH_DEFS = [
  { id:'first',  name:'初见青云', desc:'踏入青云界',        title:'青云散人', cond:p=>true },
  { id:'kill1',  name:'初露锋芒', desc:'击败第一只妖兽',    title:'试剑人',   cond:p=>p.kills>=1 },
  { id:'kill100',name:'百妖斩',   desc:'累计击败 100 只妖兽',title:'屠妖手',   cond:p=>p.kills>=100 },
  { id:'herb10', name:'采药十株', desc:'累计采集 10 株草药', title:'采药人',   cond:p=>p.gathered>=10 },
  { id:'found',  name:'筑基有成', desc:'突破至筑基期',      title:'筑基修士', cond:p=>p.realm>=3 },
  { id:'core',   name:'金丹大成', desc:'凝结金丹',          title:'金丹真人', cond:p=>p.realm>=9 },
  { id:'nascent',name:'元婴出窍', desc:'踏入元婴期',        title:'元婴真君', cond:p=>p.realm>=15 },
  { id:'secret', name:'秘境行者', desc:'习得任一门秘境秘法',title:'秘境行者', cond:p=>!!(p.secret && Object.keys(p.secret).length) },
  { id:'boss',   name:'秘境霸主', desc:'斩杀秘境 BOSS',     title:'秘境霸主', cond:p=>p.bossKills>=1 },
  { id:'sect',   name:'宗门弟子', desc:'拜入任一宗门',      title:'宗门弟子', cond:p=>!!p.sect },
  { id:'rich',   name:'富甲一方', desc:'持有 2000 灵石',    title:'散财真人', cond:p=>p.stones>=2000 },
  { id:'spar',   name:'点到为止', desc:'切磋三胜',          title:'以武会友', cond:p=>p.sparWins>=3 },
  { id:'enc',    name:'奇遇有缘', desc:'遇见 3 位奇人',     title:'有缘人',   cond:p=>p.encounters>=3 },
  { id:'devil',  name:'一念成魔', desc:'入魔一次',          title:'魔头',     cond:p=>!!p.devil||!!p.devilCause },
  { id:'teacher',name:'好为人师', desc:'收下一名徒弟',      title:'引路人',   cond:p=>!!p.apprenticeId },
  { id:'student',name:'尊师重道', desc:'拜入一位师父门下',  title:'门下弟子', cond:p=>!!p.masterId },
];
const ACH_BY_ID = {};
for(const a of ACH_DEFS) ACH_BY_ID[a.id] = a;
function achInfo(id){ return ACH_BY_ID[id] || null; }

/* ---------------- 法宝（占一个槽，只能佩一件） ---------------- */
const ART_DEFS = [
  { id:'sword', name:'剑匣', desc:'攻击 +12%',     atk:0.12 },
  { id:'armor', name:'玉甲', desc:'气血上限 +15%', hp:0.15 },
  { id:'boots', name:'灵靴', desc:'移动速度 +8%',  spd:0.08 },
];
const ART_BY_ID = {};
for(const a of ART_DEFS) ART_BY_ID[a.id] = a;
const ART_COST_SHARD = 3, ART_COST_STONE = 200;

/* ---------------- 快捷动作 / 表情 ---------------- */
const EMOTE_LIST = ['作揖','抱拳','挥手','鼓掌','大笑'];

/* ---------------- 聊天气泡 / 快捷动作 ---------------- */
function bubbleFor(id, text, kind){
  const p = world.players.get(id);
  if(!p) return;
  p.bubble = { text:String(text||'').slice(0,80), kind:kind||'chat',
    until: Date.now() + (kind==='emote' ? 3200 : 5200) };
}
function hostEmote(id, text){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const t = String(text||'');
  if(EMOTE_LIST.indexOf(t) < 0) return;
  bubbleFor(id, t, 'emote');
  emit({e:'emote', id, x:p.x, y:p.y, text:t, name:p.name});
}

/* ---------------- 赠礼 ---------------- */
function hostGift(id, targetId, kind){
  const p = world.players.get(id);
  const t = world.players.get(targetId);
  if(!p || !t || p.id === t.id) return;
  const info = {
    heal:  { key:'pillsHeal', name:'回春丹' },
    exp:   { key:'pillsExp',  name:'聚气丹' },
    shard: { key:'shards',    name:'法宝碎片' },
  }[kind];
  if(!info) return;
  if(t.dead){ emit({e:'sys', text:'对方魂魄未归，稍后再赠', id}); return; }
  if((p[info.key]||0) < 1){ emit({e:'sys', text:`没有${info.name}可赠`, id}); return; }
  p[info.key]--;
  t[info.key] = (t[info.key]||0) + 1;
  emit({e:'gift', x:t.x, y:t.y, from:p.name, to:t.name, item:info.name,
    id:t.id, fromId:p.id});
  emit({e:'sys', text:`你赠予 ${t.name} ${info.name} ×1`, id, gold:true});
  emit({e:'sys', text:`${p.name} 赠你 ${info.name} ×1`, id:t.id, gold:true});
}

/* ---------------- 师徒（雏形） ---------------- */
function linkMentor(m, a){
  m.apprenticeId = a.id; m.apprenticeName = a.name;
  a.masterId = m.id; a.masterName = m.name;
  m.mentorInvite = null; a.mentorInvite = null;
  recalcPlayer(m); recalcPlayer(a);
  checkAch(m); checkAch(a);
  emit({e:'mentor', x:a.x, y:a.y, master:m.name, ap:a.name, masterId:m.id, apId:a.id});
  emit({e:'sys', text:`${a.name} 拜你为师，师徒之礼已成`, id:m.id, gold:true});
  emit({e:'sys', text:`你已拜入 ${m.name} 门下`, id:a.id, gold:true});
}
function hostMentor(id){
  const p = world.players.get(id);
  if(!p || p.dead) return;
  const now = Date.now();
  // 先看有没有待自己应允的请帖
  if(p.mentorInvite && now - p.mentorInviteAt < 12000){
    const from = world.players.get(p.mentorInvite.from);
    if(from){
      const m = from.realm >= p.realm ? from : p;
      const a = m === from ? p : from;
      if(m.apprenticeId || a.masterId){
        emit({e:'sys', text:'你们已各自有师门牵绊', id});
      }else if(m.realm < 9 || a.realm > 8){
        emit({e:'sys', text:'须筑基以上方可收炼气一辈为徒', id});
      }else{
        linkMentor(m, a);
      }
      p.mentorInvite = null;
      return;
    }
    p.mentorInvite = null;
  }
  if(p.masterId){ emit({e:'sys', text:`你已师从 ${p.masterName}`, id}); return; }
  if(p.apprenticeId){ emit({e:'sys', text:`你已有徒弟 ${p.apprenticeName}`, id}); return; }
  const o = nearestPlayer(p, 240);
  if(!o){ emit({e:'sys', text:'附近没有可结师徒的道友', id}); return; }
  if(o.masterId || o.apprenticeId){ emit({e:'sys', text:`${o.name} 已有师门牵绊`, id}); return; }
  const pM = p.realm >= 9, oM = o.realm >= 9;
  if(pM === oM){ emit({e:'sys', text:'辈分相近，平辈论交即可', id}); return; }
  const master = pM ? p : o, ap = pM ? o : p;
  o.mentorInvite = { from:p.id, role: pM ? 'master' : 'apprentice', at: now };
  o.mentorInviteAt = now;
  emit({e:'sys', text:`${p.name} 愿${pM?'收你为徒':'拜你为师'}，按 ${keyLabel(BINDS.mentor)} 应允`, id:o.id, gold:true});
  emit({e:'sys', text:`已向 ${o.name} 发出${pM?'收徒':'拜师'}之请`, id});
}

/* ---------------- 随机奇遇 ---------------- */
const ENCOUNTER_DEFS = [
  { type:'merchant', name:'云游商人', color:'#e8cf8a', line:'有缘，这瓶丹药赠你了。' },
  { type:'rogue',    name:'渡劫散修', color:'#c9b8ff', line:'替老夫护法一场，这缕修为送你。' },
  { type:'swordsman',name:'受伤剑修', color:'#9fd3e8', line:'这枚法宝碎片，替我收好。' },
  { type:'kid',      name:'迷路童子', color:'#79e0bd', line:'谢谢道兄指路，这是家里给的灵石。' },
  { type:'herbalist',name:'采药老翁', color:'#8fbf7a', line:'山野灵草，分你两株。' },
];

/* ---------------- 键位绑定 ---------------- */
/* 全部按键集中于此，设置面板可直接改键；默认值即旧版硬编码键位 */
const DEFAULT_BINDS = {
  moveUp:'KeyW', moveDown:'KeyS', moveLeft:'KeyA', moveRight:'KeyD',
  basic:'Space',
  s1:'Digit1', s2:'Digit2', s3:'Digit3', s4:'Digit4', s5:'Digit5',
  s6:'Digit6', s7:'Digit7', s8:'Digit8', s9:'Digit9',
  secret:'Digit0', sect:'KeyQ',
  meditate:'KeyR', gather:'KeyE', herb:'KeyH',
  healPill:'KeyU', expPill:'KeyJ', thunder:'KeyG', break:'KeyB', swap:'KeyX',
  shop:'KeyF', trial:'KeyT', leaveSect:'KeyK', rage:'KeyV', spar:'KeyC', mentor:'KeyL',
  settings:'KeyO', control:'KeyP', mute:'KeyM', chat:'Enter',
};

const BIND_ACTIONS = [
  { id:'moveUp',   name:'向上移动',   group:'移动' },
  { id:'moveDown', name:'向下移动',   group:'移动' },
  { id:'moveLeft', name:'向左移动',   group:'移动' },
  { id:'moveRight',name:'向右移动',   group:'移动' },
  { id:'basic',    name:'普通攻击',   group:'战斗' },
  { id:'s1', name:'技能 1', group:'战斗' },
  { id:'s2', name:'技能 2', group:'战斗' },
  { id:'s3', name:'技能 3', group:'战斗' },
  { id:'s4', name:'技能 4', group:'战斗' },
  { id:'s5', name:'技能 5', group:'战斗' },
  { id:'s6', name:'技能 6', group:'战斗' },
  { id:'s7', name:'技能 7', group:'战斗' },
  { id:'s8', name:'技能 8', group:'战斗' },
  { id:'s9', name:'技能 9', group:'战斗' },
  { id:'secret',   name:'秘境秘法',   group:'战斗' },
  { id:'sect',     name:'宗门秘法',   group:'战斗' },
  { id:'meditate', name:'打坐纳气',   group:'修行' },
  { id:'gather',   name:'采集草药',   group:'修行' },
  { id:'herb',     name:'服用草药',   group:'修行' },
  { id:'healPill', name:'回春丹',     group:'修行' },
  { id:'expPill',  name:'聚气丹',     group:'修行' },
  { id:'thunder',  name:'服雷草引雷', group:'修行' },
  { id:'break',    name:'破境',       group:'修行' },
  { id:'swap',     name:'切换灵根',   group:'修行' },
  { id:'shop',     name:'坊市',       group:'交互' },
  { id:'trial',    name:'宗门试炼',   group:'交互' },
  { id:'leaveSect',name:'退出宗门',   group:'交互' },
  { id:'spar',     name:'切磋',       group:'交互' },
  { id:'mentor',   name:'拜师/收徒',  group:'交互' },
  { id:'rage',     name:'魔鬼狂暴',   group:'交互' },
  { id:'settings', name:'打开设置',   group:'系统' },
  { id:'control',  name:'切换操作方式', group:'系统' },
  { id:'mute',     name:'音效开关',   group:'系统' },
  { id:'chat',     name:'聊天输入',   group:'系统' },
];

const BIND_STORE_KEY = 'qw_binds_v1';

/* 按键显示名 */
function keyLabel(code){
  if(!code) return '—';
  const m = {
    Space:'空格', Enter:'回车', Escape:'Esc', Tab:'Tab',
    ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→',
    Backquote:'`', Minus:'-', Equal:'=', Backspace:'退格',
    Comma:',', Period:'.', Slash:'/', Semicolon:';', Quote:"'",
    BracketLeft:'[', BracketRight:']', Backslash:'\\',
    LeftShift:'左Shift', RightShift:'右Shift', LeftCtrl:'左Ctrl', RightCtrl:'右Ctrl',
  };
  if(m[code]) return m[code];
  if(code.startsWith('Key')) return code.slice(3);
  if(code.startsWith('Digit')) return code.slice(5);
  if(code.startsWith('Numpad')) return '小键盘'+code.slice(6);
  if(/^F\d+$/.test(code)) return code;
  return code;
}
function bindLabel(actionId){ return keyLabel(BINDS[actionId]); }

/* 读取 / 保存（localStorage 不可用时静默降级为默认） */
function loadBinds(){
  const out = Object.assign({}, DEFAULT_BINDS);
  try{
    const raw = localStorage.getItem(BIND_STORE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      for(const k in out){
        if(saved && typeof saved[k] === 'string' && saved[k]) out[k] = saved[k];
      }
    }
  }catch(e){}
  return out;
}
function saveBinds(){
  try{ localStorage.setItem(BIND_STORE_KEY, JSON.stringify(BINDS)); }catch(e){}
}
let BINDS = loadBinds();
let rebindingId = null;

function bindName(id){
  const a = BIND_ACTIONS.find(x=>x.id===id);
  return a ? a.name : id;
}

/* 键位冲突检测：返回占用该键的动作名 */
function bindOwner(code, exceptId){
  for(const a of BIND_ACTIONS){
    if(a.id === exceptId) continue;
    if(BINDS[a.id] === code) return a.name;
  }
  return '';
}

/* 隐藏预设（内置挂三档，互斥，切换即替换） */
const CHEAT_PRESETS = {
  p1:{ name:'预设一', hp:0.50, mp:0.50, atk:0.30, def:0.20, expRate:2 },
  p2:{ name:'预设二', hp:1.00, mp:1.00, atk:0.60, def:0.50, expRate:3 },
  p3:{ name:'预设三', hp:2.00, mp:2.00, atk:1.20, def:1.00, expRate:5 },
};

const SPEED = 208;
const TICK_MS = 33;
const SNAP_MS = 80;

