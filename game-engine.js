// ============================================================
// game-engine.js  ─  サーバー権威ゲームロジック
// ============================================================
'use strict';

// ── カードデータ ──
const ING_DEFS = [
  {id:'rice',name:'お米',cat:'carb',catL:'炭水化物',eff:'食材山札からカードを1枚引く。'},
  {id:'flour',name:'小麦粉',cat:'carb',catL:'炭水化物',eff:'食材山札からカードを1枚引く。'},
  {id:'potato',name:'じゃがいも',cat:'carb',catL:'炭水化物',eff:'食材山札からカードを1枚引く。'},
  {id:'konjac',name:'こんにゃく',cat:'carb',catL:'炭水化物',eff:null},
  {id:'ginger',name:'生姜',cat:'carb',catL:'炭水化物',eff:null},
  {id:'beef',name:'牛肉',cat:'protein',catL:'たんぱく質',eff:'食材ゾーンのカードを1枚山札に戻し、食材山札から1枚引いて食材ゾーンへ出す。'},
  {id:'salmon',name:'鮭',cat:'protein',catL:'たんぱく質',eff:'食材山札から1枚引く。その後、手札を1枚選び山札に戻す。'},
  {id:'egg',name:'卵',cat:'protein',catL:'たんぱく質',eff:'手札の食材カードを1枚公開する。その後、そのカードを食材山札に戻し、レシピ山札から1枚引く。'},
  {id:'tofu',name:'豆腐',cat:'protein',catL:'たんぱく質',eff:'ごみ箱から「たんぱく質」カードを1枚選び、手札に加える。'},
  {id:'chicken',name:'鶏肉',cat:'protein',catL:'たんぱく質',eff:'食材山札から1枚引き、そのカードを食材ゾーンに出す。'},
  {id:'pork',name:'豚肉',cat:'protein',catL:'たんぱく質',eff:'食材ゾーンのカードを2枚選ぶ。内1枚を手札に戻し、残り1枚を山札に戻す。'},
  {id:'yellowtail',name:'ぶり',cat:'protein',catL:'たんぱく質',eff:'食材山札から1枚引く。その後、手札を1枚選び山札に戻す。'},
  {id:'miso',name:'味噌',cat:'protein',catL:'たんぱく質',eff:'手札の「たんぱく質」カードを1枚ごみ箱に送ってもよい。そうしたなら、食材山札から2枚引く。'},
  {id:'abura',name:'油揚げ',cat:'fat',catL:'脂質',eff:'手札のレシピカードを1枚公開する。そのカードをレシピ山札に戻し、レシピ山札から1枚引く。'},
  {id:'butter',name:'バター',cat:'fat',catL:'脂質',eff:'次に完成させる料理の満腹度+1。（ターン終了時まで）'},
  {id:'curryroux',name:'カレールー',cat:'fat',catL:'脂質',eff:null},
  {id:'cabbage',name:'キャベツ',cat:'vitamin',catL:'ビタミン',eff:'ごみ箱から食材カードを1枚選び、食材山札に戻す。'},
  {id:'daikon',name:'大根',cat:'vitamin',catL:'ビタミン',eff:'相手の食材ゾーンが3枚以上なら、レシピ山札から1枚引く。'},
  {id:'chili',name:'唐辛子',cat:'vitamin',catL:'ビタミン',eff:'相手の満腹度-1。その後、このカードをごみ箱に送る。（1回限定）'},
  {id:'tomato',name:'トマト',cat:'vitamin',catL:'ビタミン',eff:'自分の食材ゾーンが3枚以下なら、食材山札から2枚引く。'},
  {id:'carrot',name:'にんじん',cat:'vitamin',catL:'ビタミン',eff:'自分の食材ゾーンのカードを1枚選び、手札に戻す。'},
  {id:'broccoli',name:'ブロッコリー',cat:'vitamin',catL:'ビタミン',eff:'食材ゾーンのカードを1枚選び、食材山札から同名カードを1枚手札に加える。その後、このカードをごみ箱に送る。'},
  {id:'lettuce',name:'レタス',cat:'vitamin',catL:'ビタミン',eff:'ごみ箱から食材カードを1枚選び、食材山札に戻す。'},
  {id:'lemon',name:'レモン',cat:'vitamin',catL:'ビタミン',eff:'自分の食材ゾーンが3枚以下なら、レシピ山札から1枚引く。'},
  {id:'negi',name:'青ねぎ',cat:'vitamin',catL:'ビタミン',eff:null},
  {id:'onion',name:'玉ねぎ',cat:'vitamin',catL:'ビタミン',eff:null},
  {id:'garlic',name:'にんにく',cat:'vitamin',catL:'ビタミン',eff:null},
  {id:'moyashi',name:'もやし',cat:'vitamin',catL:'ビタミン',eff:null},
  {id:'milk',name:'牛乳',cat:'mineral',catL:'ミネラル',eff:'ごみ箱から「チーズ」か「バター」を1枚選び、手札に加える。'},
  {id:'saba',name:'さば',cat:'mineral',catL:'ミネラル',eff:'ごみ箱から「ミネラル」カードを1枚選び、手札に戻す。'},
  {id:'shiitake',name:'しいたけ',cat:'mineral',catL:'ミネラル',eff:'手札を2枚ごみ箱に送ってもよい。そうしたなら、食材山札から「ミネラル」カードを1枚選び手札に加える。その後、このカードをごみ箱に送る。'},
  {id:'cheese',name:'チーズ',cat:'mineral',catL:'ミネラル',eff:'自分の手札を1枚選び、ごみ箱に送る。'},
  {id:'nori',name:'海苔',cat:'mineral',catL:'ミネラル',eff:'ごみ箱から「お米」カードを1枚選び、手札に加える。'},
  {id:'spinach',name:'ほうれん草',cat:'mineral',catL:'ミネラル',eff:null},
  {id:'wakame',name:'わかめ',cat:'mineral',catL:'ミネラル',eff:null},
];

const REC_DEFS = [
  {id:'onigiri',name:'おにぎり',sat:3,req:['rice','nori'],eff:'食材山札から2枚引く。'},
  {id:'tkgr',name:'卵かけご飯',sat:3,req:['rice','egg'],eff:'レシピ山札から2枚引く。'},
  {id:'sushiSalmon',name:'サーモン寿司',sat:3,req:['rice','salmon'],eff:'手札を1枚ごみ箱に送ってもよい。そうしたなら、食材山札から2枚引く。'},
  {id:'jagabata',name:'じゃがバター',sat:4,req:['potato','butter'],eff:null},
  {id:'steak',name:'ステーキ',sat:5,req:['beef','butter'],eff:'次の自分のターン中、料理を提供できない。'},
  {id:'sabaMiso',name:'さばの味噌煮',sat:3,req:['saba','miso','ginger'],eff:'相手の食材ゾーンのカードを1枚選び、ごみ箱に送る。'},
  {id:'buriDaikon',name:'ぶり大根',sat:3,req:['ginger','yellowtail','daikon'],eff:'相手の食材ゾーンのカードを1枚選び、山札に戻す。'},
  {id:'horenSote',name:'ほうれん草のソテー',sat:4,req:['pork','butter','spinach'],eff:'自分と相手はランダムな手札1枚を山札に戻す。'},
  {id:'hiyakko',name:'冷やっこ',sat:4,req:['tofu','ginger','negi'],eff:'食材山札から1枚引く。その後、相手の満腹度-2。'},
  {id:'yasaiSalad',name:'温野菜サラダ',sat:4,req:['carrot','potato','broccoli'],eff:'手札を1枚ごみ箱に送ってもよい。そうしたなら、ごみ箱から食材カードを1枚選び手札に加える。'},
  {id:'omelet',name:'オムレツ',sat:4,req:['egg','milk','butter'],eff:'食材山札から2枚引く。その後、手札を1枚ごみ箱に送る。'},
  {id:'cheeseOmelet',name:'チーズオムレツ',sat:5,req:['egg','cheese','butter'],eff:'食材山札から3枚引く。その後、手札を2枚ごみ箱に送る。'},
  {id:'mashed',name:'マッシュポテト',sat:5,req:['potato','butter','milk'],eff:'次に完成させる料理の満腹度+2。（ターン終了時まで）'},
  {id:'peperoncino',name:'ペペロンチーノ',sat:6,req:['flour','garlic','chili'],eff:'相手は手札を全て公開する。その後、自分はごみ箱から食材カードを1枚選び手札に加える。'},
  {id:'germanPotato',name:'ジャーマンポテト',sat:6,req:['potato','pork','onion'],eff:'手札の「脂質」カードを1枚ごみ箱に送ってもよい。そうしたなら、食材山札から食材カードを1枚選び手札に加える。'},
  {id:'gyudon',name:'牛丼',sat:6,req:['rice','beef','onion'],eff:null},
  {id:'butaNinger',name:'豚の生姜焼き',sat:6,req:['ginger','pork','onion'],eff:null},
  {id:'misoShiru',name:'味噌汁',sat:5,req:['miso','tofu','abura','wakame'],eff:'自分の満腹度-3。'},
  {id:'yakisoba',name:'焼きそば',sat:6,req:['flour','pork','cabbage','moyashi'],eff:'手札を全てごみ箱に送る。その後、食材山札から3枚引き、レシピ山札から2枚引く。'},
  {id:'chickenSalad',name:'チキンサラダ',sat:6,req:['chicken','lettuce','broccoli','tomato'],eff:'レシピ山札から1枚引く。その後、ごみ箱から食材カードを1枚選び手札に加える。'},
  {id:'caesarSalad',name:'シーザーサラダ',sat:6,req:['flour','pork','lettuce','cheese'],eff:'レシピ山札からレシピカードを1枚選び手札に加える。その後、自分の満腹度+1。'},
  {id:'oyakodon',name:'親子丼',sat:6,req:['rice','chicken','egg','onion'],eff:'食材山札から食材カードを1枚選び手札に加える。'},
  {id:'salmonMeuniere',name:'鮭のムニエル',sat:6,req:['flour','salmon','butter','lemon'],eff:'食材山札から食材カードを1枚選び手札に加える。'},
  {id:'gratin',name:'グラタン',sat:6,req:['flour','cheese','butter','milk'],eff:'次の相手のターン終了時、相手の満腹度+3。'},
  {id:'frenchToast',name:'フレンチトースト',sat:6,req:['flour','egg','milk','butter'],eff:'食材ゾーンのカードを1枚選ぶ。そのカードを使用した料理完成時、相手の満腹度+2。'},
  {id:'maboTofu',name:'麻婆豆腐',sat:7,req:['miso','tofu','pork','negi'],eff:'手札の「たんぱく質」カードを1枚ごみ箱に送ってもよい。そうしたなら、レシピ山札から2枚引く。'},
  {id:'hamburg',name:'ハンバーグ',sat:7,req:['beef','pork','egg','onion'],eff:'食材山札から3枚引く。次の自分のターン終了時まで料理を提供できない。'},
  {id:'curryUdon',name:'カレーうどん',sat:7,req:['flour','abura','curryroux','negi'],eff:'食材山札から2枚引き、そのカードを食材ゾーンに出す。'},
  {id:'okonomiyaki',name:'お好み焼き',sat:8,req:['flour','pork','egg','cabbage'],eff:null},
  {id:'yasaiItame',name:'野菜炒め',sat:8,req:['pork','carrot','moyashi','cabbage'],eff:null},
  {id:'carbonara',name:'カルボナーラ',sat:6,req:['flour','egg','pork','milk','cheese'],eff:'手札を全て山札に戻す。その後、食材山札から4枚引き、レシピ山札から3枚引く。'},
  {id:'butajiru',name:'豚汁',sat:6,req:['pork','miso','carrot','konjac','daikon'],eff:'食材山札から2枚引く。その後、自分の満腹度-4。'},
  {id:'nikujaga',name:'肉じゃが',sat:9,req:['potato','beef','carrot','onion','konjac'],eff:'ごみ箱からレシピカードを1枚選び手札に加える。その後、手札を1枚ごみ箱に送る。'},
  {id:'okosamLunch',name:'お子様ランチ',sat:9,req:['rice','beef','egg','carrot','broccoli'],eff:'レシピ山札から3枚引く。その後、手札を2枚山札に戻す。'},
  {id:'croquette',name:'コロッケ',sat:10,req:['potato','flour','egg','beef','onion'],eff:null},
  {id:'meatSauce',name:'ミートソースパスタ',sat:6,req:['flour','beef','tomato','carrot','onion','garlic'],eff:'手札を全て山札に戻す。その後、食材山札からX枚引く（X=相手の食材ゾーンの枚数）。'},
  {id:'minestrone',name:'ミネストローネ',sat:7,req:['potato','pork','carrot','cabbage','tomato','onion'],eff:'ごみ箱から食材カードを2枚選び手札に加える。その後、自分の満腹度-4。'},
  {id:'creamStew',name:'クリームシチュー',sat:9,req:['potato','chicken','milk','butter','carrot','onion'],eff:'レシピ山札からレシピカードを2枚選び手札に加える。'},
  {id:'curryRice',name:'カレーライス',sat:10,req:['rice','potato','beef','curryroux','carrot','onion'],eff:'食材山札から2枚引き、そのカードを食材ゾーンに出す。'},
  {id:'sukiyaki',name:'すき焼き',sat:12,req:['konjac','beef','tofu','negi','carrot','shiitake'],eff:null},
];

const ING_MAP = Object.fromEntries(ING_DEFS.map(d => [d.id, d]));
const REC_MAP = Object.fromEntries(REC_DEFS.map(d => [d.id, d]));

// ── ユーティリティ ──
function uid() { return Math.random().toString(36).slice(2, 8); }
function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function addLog(G, msg, type = 'n') {
  return { ...G, log: [{ msg, type, id: uid() }, ...G.log].slice(0, 50) };
}
function ovP(G, pi, u) {
  const pl = [...G.players];
  pl[pi] = { ...pl[pi], ...u };
  return { ...G, players: pl };
}
function mkI(def) { return { ...def, _uid: def.id + '_' + uid(), _isRec: false, _used: false }; }
function mkR(def) { return { ...def, _uid: def.id + '_r' + uid(), _isRec: true }; }
function ph(p, cards) {
  let h = [...p.hand, ...cards], t = [...p.trash];
  if (h.length > 10) { t = [...t, ...h.slice(10)]; h = h.slice(0, 10); }
  return { hand: h, trash: t };
}

function buildRandom() {
  const i = shuffle([...ING_DEFS, ...ING_DEFS, ...ING_DEFS]).slice(0, 30).map(d => mkI(d));
  const r = shuffle([...REC_DEFS, ...REC_DEFS]).slice(0, 15).map(d => mkR(d));
  return { i, r };
}

function buildFromConfig(ic, rc) {
  const i = [];
  Object.entries(ic).forEach(([id, n]) => {
    const d = ING_MAP[id]; if (d) for (let k = 0; k < n; k++) i.push(mkI(d));
  });
  const r = [];
  Object.entries(rc).forEach(([id, n]) => {
    const d = REC_MAP[id]; if (d) for (let k = 0; k < n; k++) r.push(mkR(d));
  });
  return { i: shuffle(i), r: shuffle(r) };
}

function initPlayer(cfg) {
  const { i, r } = cfg ? buildFromConfig(cfg.ingDeck, cfg.recDeck) : buildRandom();
  return {
    ingDeck: i.slice(3), recDeck: r.slice(2),
    hand: [...i.slice(0, 3), ...r.slice(0, 2)],
    ingZone: [], recZone: [], trash: [],
    satiety: 0, bufNextRec: 0, debuffs: {},
    revealed: false, activatedThisTurn: false,
  };
}

function checkWin(G) {
  if (G.players[0].satiety >= 20) return { ...G, winner: 1 };
  if (G.players[1].satiety >= 20) return { ...G, winner: 0 };
  const p = G.players[G.currentPlayer];
  if (!p.ingDeck.length && !p.recDeck.length) return { ...G, winner: 1 - G.currentPlayer };
  return G;
}

// ── 基本操作 ──
function drawI(G, pi, n) {
  const p = G.players[pi];
  const d = p.ingDeck.slice(0, Math.min(n, p.ingDeck.length));
  if (!d.length) return G;
  const r = ph(p, d);
  return addLog(ovP(G, pi, { ingDeck: p.ingDeck.slice(d.length), ...r }), `P${pi + 1}: 食材${d.length}枚ドロー`);
}
function drawR(G, pi, n) {
  const p = G.players[pi];
  const d = p.recDeck.slice(0, Math.min(n, p.recDeck.length));
  if (!d.length) return G;
  const r = ph(p, d);
  return addLog(ovP(G, pi, { recDeck: p.recDeck.slice(d.length), ...r }), `P${pi + 1}: レシピ${d.length}枚ドロー`);
}
function drawToZone(G, pi, n) {
  let s = G;
  for (let i = 0; i < n; i++) {
    const p = s.players[pi];
    if (!p.ingDeck.length) break;
    const c = p.ingDeck[0];
    s = p.ingZone.length < 7
      ? ovP(s, pi, { ingDeck: p.ingDeck.slice(1), ingZone: [...p.ingZone, c] })
      : ovP(s, pi, { ingDeck: p.ingDeck.slice(1), trash: [...p.trash, c] });
    s = addLog(s, `P${pi + 1}: ${c.name}を直接配置`);
  }
  return s;
}
function bufR(G, pi, n) {
  return addLog(ovP(G, pi, { bufNextRec: (G.players[pi].bufNextRec || 0) + n }), `P${pi + 1}: 次の料理+${n}バフ`);
}
function setDeb(G, pi, k, v) {
  return addLog(ovP(G, pi, { debuffs: { ...G.players[pi].debuffs, [k]: v } }), `P${pi + 1}: デバフ[${k}]`, 'warn');
}
function setOppDeb(G, pi, v) {
  const o = 1 - pi;
  return addLog(ovP(G, o, { debuffs: { ...G.players[o].debuffs, satBuff: (G.players[o].debuffs.satBuff || 0) + v } }), `P${pi + 1}: 相手次ターン満腹+${v}設定`, 'warn');
}
function redOpp(G, pi, n) {
  const o = 1 - pi;
  return addLog(ovP(G, o, { satiety: Math.max(0, G.players[o].satiety - n) }), `P${pi + 1}: 相手満腹-${n}！`, 'warn');
}
function redSelf(G, pi, n) {
  return addLog(ovP(G, pi, { satiety: Math.max(0, G.players[pi].satiety - n) }), `P${pi + 1}: 自満腹-${n}`);
}
function addSelf(G, pi, n) {
  return addLog(ovP(G, pi, { satiety: Math.min(20, G.players[pi].satiety + n) }), `P${pi + 1}: 自満腹+${n}`);
}
function revOpp(G, pi) {
  return addLog(ovP(G, 1 - pi, { revealed: true }), `P${pi + 1}: 相手手札全公開！`, 'warn');
}
function rndBounce(G, pi) {
  let s = G;
  [0, 1].forEach(p => {
    const pl = s.players[p]; if (!pl.hand.length) return;
    const idx = Math.floor(Math.random() * pl.hand.length); const c = pl.hand[idx];
    const hand = pl.hand.filter((_, i) => i !== idx);
    s = addLog(ovP(s, p, { hand, ...(c._isRec ? { recDeck: shuffle([...pl.recDeck, c]) } : { ingDeck: shuffle([...pl.ingDeck, c]) }) }), `P${p + 1}: ${c.name}が山札へ`, 'warn');
  });
  return s;
}
function retAll(G, pi, in_, re_) {
  const p = G.players[pi];
  const i = p.hand.filter(c => !c._isRec); const r = p.hand.filter(c => c._isRec);
  let s = ovP(G, pi, { hand: [], ingDeck: shuffle([...p.ingDeck, ...i]), recDeck: shuffle([...p.recDeck, ...r]) });
  s = drawI(s, pi, in_); return drawR(s, pi, re_);
}
function discAll(G, pi, in_, re_) {
  const p = G.players[pi];
  let s = ovP(G, pi, { hand: [], trash: [...p.trash, ...p.hand] });
  s = drawI(s, pi, in_); return drawR(s, pi, re_);
}
function retByOpp(G, pi) {
  const o = 1 - pi; const n = G.players[o].ingZone.length;
  const p = G.players[pi];
  const i = p.hand.filter(c => !c._isRec); const r = p.hand.filter(c => c._isRec);
  let s = ovP(G, pi, { hand: [], ingDeck: shuffle([...p.ingDeck, ...i]), recDeck: shuffle([...p.recDeck, ...r]) });
  return n > 0 ? drawI(s, pi, n) : s;
}

// ── pending システム ──
function mkPending(G, pd) { return { ...G, pending: pd }; }
function clearPending(G) { const { pending: _, ...rest } = G; return rest; }

// ── ブロックエンジン ──
function runBlocks(G, pi, blocks, cardId) {
  let s = G; let prevDone = true;
  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    if (blk.type === 'ifPrev') { if (!prevDone) return s; continue; }
    const res = execBlock(s, pi, blk, cardId);
    if (res && res.pending) {
      res.pending.resume = { pi, blocks: blocks.slice(i + 1), cardId };
      return res;
    }
    if (res === null) { prevDone = false; }
    else { s = res; prevDone = true; }
    s = checkWin(s); if (s.winner != null) return s;
  }
  return s;
}

function runBlocksFrom(G, pi, blocks, cardId, prevDone) {
  let s = G;
  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    if (blk.type === 'ifPrev') { if (!prevDone) return s; continue; }
    const res = execBlock(s, pi, blk, cardId);
    if (res && res.pending) {
      res.pending.resume = { pi, blocks: blocks.slice(i + 1), cardId };
      return res;
    }
    if (res === null) { prevDone = false; }
    else { s = res; prevDone = true; }
    s = checkWin(s); if (s.winner != null) return s;
  }
  return s;
}

function execBlock(G, pi, blk, cardId) {
  const p = G.players[pi]; const opp = 1 - pi;
  switch (blk.type) {
    case 'drawIng': return drawI(G, pi, blk.n || 1);
    case 'drawRec': return drawR(G, pi, blk.n || 1);
    case 'drawToZone': return drawToZone(G, pi, blk.n || 1);
    case 'bufNextRec': return bufR(G, pi, blk.n || 1);
    case 'setDebuff': return setDeb(G, pi, blk.key, blk.val);
    case 'setOppDebuff': return setOppDeb(G, pi, blk.n || 3);
    case 'redOppSat': return redOpp(G, pi, blk.n || 1);
    case 'redSelfSat': return redSelf(G, pi, blk.n || 1);
    case 'addSelfSat': return addSelf(G, pi, blk.n || 1);
    case 'revealOpp': return revOpp(G, pi);
    case 'rndBounce': return rndBounce(G, pi);
    case 'retAllHand': return retAll(G, pi, blk.ing || 0, blk.rec || 0);
    case 'discAllHand': return discAll(G, pi, blk.ing || 0, blk.rec || 0);
    case 'retAllDrawByOpp': return retByOpp(G, pi);
    case 'selfTrash': {
      const t = p.ingZone.find(c => c.id === cardId);
      if (!t) return G;
      return addLog(ovP(G, pi, { ingZone: p.ingZone.filter(c => c._uid !== t._uid), trash: [...p.trash, t] }), `P${pi + 1}: ${t.name}をごみ箱へ`);
    }
    case 'condIngZone': {
      const len = p.ingZone.length;
      if (!(blk.op === 'le' ? len <= blk.n : len >= blk.n)) return addLog(G, `P${pi + 1}: 条件不成立`);
      return runBlocks(G, pi, blk.then, cardId);
    }
    case 'condOppZone': {
      const len = G.players[opp].ingZone.length;
      if (!(blk.op === 'le' ? len <= blk.n : len >= blk.n)) return addLog(G, `P${pi + 1}: 条件不成立`);
      return runBlocks(G, pi, blk.then, cardId);
    }
    case 'discardHand': {
      const cands = (blk.filter ? p.hand.filter(blk.filter) : p.hand);
      if (!cands.length) return blk.optional ? null : G;
      return mkPending(G, { type: 'discardHand', pi, n: blk.n || 1, optional: !!blk.optional, filterKey: blk.filterKey });
    }
    case 'retHand': {
      if (p.hand.length < (blk.n || 1)) return G;
      return mkPending(G, { type: 'retHand', pi, n: blk.n || 1 });
    }
    case 'recoverTrash': {
      const f = blk.filterKey;
      const cands = p.trash.filter(c => !c._isRec && (!f || matchFilter(c, f)));
      if (!cands.length) return addLog(G, `P${pi + 1}: ごみ箱に対象なし`);
      return mkPending(G, { type: 'trash_to_hand', pi, filterKey: f });
    }
    case 'recoverTrash2': {
      const f = blk.filterKey;
      const cands = p.trash.filter(c => !c._isRec && (!f || matchFilter(c, f)));
      if (!cands.length) return addLog(G, `P${pi + 1}: ごみ箱に対象なし`);
      return mkPending(G, { type: 'trash_to_hand_multi', pi, n: Math.min(blk.n || 2, cands.length), filterKey: f });
    }
    case 'recoverTrashToDeck': {
      const cands = p.trash.filter(c => !c._isRec);
      if (!cands.length) return addLog(G, `P${pi + 1}: ごみ箱に食材なし`);
      return mkPending(G, { type: 'trash_to_ingdeck', pi });
    }
    case 'recoverRecFromTrash': {
      const cands = p.trash.filter(c => c._isRec);
      if (!cands.length) return addLog(G, `P${pi + 1}: ごみ箱にレシピなし`);
      return mkPending(G, { type: 'trash_to_hand_rec', pi });
    }
    case 'selectIngZone': {
      if (!p.ingZone.length) return addLog(G, '食材ゾーンが空');
      return mkPending(G, { type: 'selectIngZone_' + blk.then, pi });
    }
    case 'selectOppZone': {
      if (!G.players[opp].ingZone.length) return addLog(G, '相手食材ゾーンが空');
      return mkPending(G, { type: 'selectOppZone_' + blk.then, pi });
    }
    case 'selectHand': {
      const cands = blk.filterKey ? p.hand.filter(c => matchFilter(c, blk.filterKey)) : p.hand;
      if (!cands.length) return blk.optional ? null : addLog(G, `P${pi + 1}: 手札に対象なし`);
      return mkPending(G, { type: 'selectHand_' + blk.then, pi, optional: !!blk.optional, filterKey: blk.filterKey });
    }
    case 'selectIngZoneMulti': {
      if (p.ingZone.length < (blk.n || 2)) return addLog(G, `食材ゾーンに${blk.n || 2}枚以上必要`);
      return mkPending(G, { type: 'pork_step1', pi, n: blk.n || 2 });
    }
    case 'searchIngDeck': {
      const f = blk.filterKey;
      const cands = f ? p.ingDeck.filter(c => matchFilter(c, f)) : p.ingDeck;
      if (!cands.length) return addLog(G, `P${pi + 1}: 食材山札に対象なし`);
      return mkPending(G, { type: 'searchIngDeck', pi, filterKey: f });
    }
    case 'searchRecDeck': {
      if (!p.recDeck.length) return addLog(G, `P${pi + 1}: レシピ山札が空`);
      return mkPending(G, { type: 'searchRecDeck', pi });
    }
    case 'markIngZone': {
      if (!p.ingZone.length) return addLog(G, '食材ゾーンが空');
      return mkPending(G, { type: 'markIngZone', pi });
    }
    default: return G;
  }
}

function matchFilter(c, key) {
  if (!key) return true;
  if (key === 'ingredient') return !c._isRec;
  if (key === 'recipe') return c._isRec;
  if (['protein', 'carb', 'fat', 'vitamin', 'mineral'].includes(key)) return c.cat === key && !c._isRec;
  if (key === 'fat_ing') return c.cat === 'fat' && !c._isRec;
  if (key === 'mineral_ing') return c.cat === 'mineral' && !c._isRec;
  if (key.startsWith('id:')) return c.id === key.slice(3);
  return true;
}

function resumeBlocks(G, chosen) {
  const pd = G.pending; if (!pd) return G;
  const { pi, blocks, cardId } = pd.resume || { pi: G.currentPlayer, blocks: [], cardId: '' };
  let s = clearPending(G);
  const r = resolveChoice(s, pi, pd, chosen);
  if (r === null) {
    if (!blocks || !blocks.length) return s;
    if (blocks[0] && blocks[0].type === 'ifPrev') return s;
    return runBlocksFrom(s, pi, blocks, cardId, false);
  }
  s = r; s = checkWin(s); if (s.winner != null) return s;
  if (!blocks || !blocks.length) return s;
  return runBlocksFrom(s, pi, blocks, cardId, true);
}

function resolveChoice(G, pi, pd, chosen) {
  const p = G.players[pi]; const opp = 1 - pi;
  if (chosen[0] === 'skip') return null;

  if (pd.type === 'discardHand') {
    const cards = chosen.map(u => p.hand.find(c => c._uid === u)).filter(Boolean);
    if (!cards.length) return null;
    return addLog(ovP(G, pi, { hand: p.hand.filter(c => !chosen.includes(c._uid)), trash: [...p.trash, ...cards] }), `P${pi + 1}: ${cards.map(c => c.name).join('・')}をごみ箱へ`);
  }
  if (pd.type === 'retHand') {
    const cards = chosen.map(u => p.hand.find(c => c._uid === u)).filter(Boolean);
    if (!cards.length) return null;
    let iD = [...p.ingDeck], rD = [...p.recDeck];
    cards.forEach(c => { if (c._isRec) rD = shuffle([...rD, c]); else iD = shuffle([...iD, c]); });
    return addLog(ovP(G, pi, { hand: p.hand.filter(c => !chosen.includes(c._uid)), ingDeck: iD, recDeck: rD }), `P${pi + 1}: ${cards.map(c => c.name).join('・')}を山札へ`);
  }
  if (pd.type === 'trash_to_hand') {
    const card = p.trash.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { trash: p.trash.filter(c => c._uid !== card._uid), ...ph(p, [card]) }), `P${pi + 1}: ${card.name}を手札へ`);
  }
  if (pd.type === 'trash_to_hand_multi') {
    const cards = chosen.map(u => p.trash.find(c => c._uid === u)).filter(Boolean);
    if (!cards.length) return G;
    return addLog(ovP(G, pi, { trash: p.trash.filter(c => !chosen.includes(c._uid)), ...ph(p, cards) }), `P${pi + 1}: ${cards.map(c => c.name).join('・')}を手札へ`);
  }
  if (pd.type === 'trash_to_hand_rec') {
    const card = p.trash.find(c => c._uid === chosen[0] && c._isRec); if (!card) return G;
    return addLog(ovP(G, pi, { trash: p.trash.filter(c => c._uid !== card._uid), ...ph(p, [card]) }), `P${pi + 1}: ${card.name}を手札へ`);
  }
  if (pd.type === 'trash_to_ingdeck') {
    const card = p.trash.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { trash: p.trash.filter(c => c._uid !== card._uid), ingDeck: shuffle([...p.ingDeck, card]) }), `P${pi + 1}: ${card.name}を食材山札へ`);
  }
  if (pd.type === 'selectIngZone_toHand') {
    const card = p.ingZone.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { ingZone: p.ingZone.filter(c => c._uid !== card._uid), hand: [...p.hand, card] }), `P${pi + 1}: ${card.name}を手札へ`);
  }
  if (pd.type === 'selectIngZone_retAndDraw') {
    const card = p.ingZone.find(c => c._uid === chosen[0]); if (!card) return G;
    let s = ovP(G, pi, { ingZone: p.ingZone.filter(c => c._uid !== card._uid), ingDeck: shuffle([...p.ingDeck, card]) });
    s = addLog(s, `P${pi + 1}: ${card.name}を山札へ戻した`);
    return drawToZone(s, pi, 1);
  }
  if (pd.type === 'selectIngZone_searchSame') {
    const ref = p.ingZone.find(c => c._uid === chosen[0]); if (!ref) return G;
    const found = p.ingDeck.find(c => c.id === ref.id);
    if (!found) return addLog(G, `P${pi + 1}: 山札に${ref.name}なし`);
    return addLog(ovP(G, pi, { ingDeck: shuffle(p.ingDeck.filter(c => c._uid !== found._uid)), ...ph(p, [found]) }), `P${pi + 1}: ${found.name}をサーチ`);
  }
  if (pd.type === 'selectHand_retToIngDeck') {
    const card = p.hand.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { hand: p.hand.filter(c => c._uid !== card._uid), ingDeck: shuffle([...p.ingDeck, card]) }), `P${pi + 1}: ${card.name}を食材山札へ`);
  }
  if (pd.type === 'selectHand_retToRecDeck') {
    const card = p.hand.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { hand: p.hand.filter(c => c._uid !== card._uid), recDeck: shuffle([...p.recDeck, card]) }), `P${pi + 1}: ${card.name}をレシピ山札へ`);
  }
  if (pd.type === 'selectOppZone_trash') {
    const oppP = G.players[opp];
    const card = oppP.ingZone.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, opp, { ingZone: oppP.ingZone.filter(c => c._uid !== card._uid), trash: [...oppP.trash, card] }), `P${pi + 1}: ${card.name}をごみ箱へ！`, 'warn');
  }
  if (pd.type === 'selectOppZone_deck') {
    const oppP = G.players[opp];
    const card = oppP.ingZone.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, opp, { ingZone: oppP.ingZone.filter(c => c._uid !== card._uid), ingDeck: shuffle([...oppP.ingDeck, card]) }), `P${pi + 1}: ${card.name}を山札へ！`, 'warn');
  }
  if (pd.type === 'pork_step1') {
    if (chosen.length < 2) return addLog(G, '2枚選択してください');
    const resume = pd.resume || { pi, blocks: [], cardId: '' };
    return { ...G, pending: { type: 'pork_step2', pi, uids: chosen, resume, title: 'どちらを手札に戻す？' } };
  }
  if (pd.type === 'pork_step2') {
    const cards = pd.uids.map(u => p.ingZone.find(c => c._uid === u)).filter(Boolean);
    if (cards.length < 2) return G;
    const toHand = cards.find(c => c._uid === chosen[0]);
    const toDeck = cards.find(c => c._uid !== chosen[0]);
    if (!toHand || !toDeck) return G;
    return addLog(ovP(G, pi, { ingZone: p.ingZone.filter(c => !pd.uids.includes(c._uid)), hand: [...p.hand, toHand], ingDeck: shuffle([...p.ingDeck, toDeck]) }), `P${pi + 1}: ${toHand.name}→手札、${toDeck.name}→山札`);
  }
  if (pd.type === 'searchIngDeck') {
    const card = p.ingDeck.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { ingDeck: shuffle(p.ingDeck.filter(c => c._uid !== card._uid)), ...ph(p, [card]) }), `P${pi + 1}: ${card.name}をサーチ`);
  }
  if (pd.type === 'searchRecDeck') {
    const card = p.recDeck.find(c => c._uid === chosen[0]); if (!card) return G;
    return addLog(ovP(G, pi, { recDeck: shuffle(p.recDeck.filter(c => c._uid !== card._uid)), ...ph(p, [card]) }), `P${pi + 1}: ${card.name}をサーチ`);
  }
  if (pd.type === 'markIngZone') {
    const target = p.ingZone.find(c => c._uid === chosen[0]); if (!target) return G;
    return addLog(ovP(G, pi, { ingZone: p.ingZone.map(c => c._uid === chosen[0] ? { ...c, _toastMark: true } : c) }), `P${pi + 1}: ${target.name}をマーク`);
  }
  return G;
}

// ── カード効果定義 ──
const ING_BLOCKS = {
  rice: [{ type: 'drawIng', n: 1 }],
  flour: [{ type: 'drawIng', n: 1 }],
  potato: [{ type: 'drawIng', n: 1 }],
  konjac: [], ginger: [],
  beef: [{ type: 'selectIngZone', then: 'retAndDraw' }],
  salmon: [{ type: 'drawIng', n: 1 }, { type: 'retHand', n: 1 }],
  egg: [{ type: 'selectHand', then: 'retToIngDeck', filterKey: 'ingredient' }, { type: 'drawRec', n: 1 }],
  tofu: [{ type: 'recoverTrash', filterKey: 'protein' }],
  chicken: [{ type: 'drawToZone', n: 1 }],
  pork: [{ type: 'selectIngZoneMulti', n: 2 }],
  yellowtail: [{ type: 'drawIng', n: 1 }, { type: 'retHand', n: 1 }],
  miso: [{ type: 'discardHand', n: 1, optional: true, filterKey: 'protein' }, { type: 'ifPrev' }, { type: 'drawIng', n: 2 }],
  abura: [{ type: 'selectHand', then: 'retToRecDeck', optional: true, filterKey: 'recipe' }, { type: 'ifPrev' }, { type: 'drawRec', n: 1 }],
  butter: [{ type: 'bufNextRec', n: 1 }],
  curryroux: [],
  cabbage: [{ type: 'recoverTrashToDeck' }],
  daikon: [{ type: 'condOppZone', op: 'ge', n: 3, then: [{ type: 'drawRec', n: 1 }] }],
  chili: [{ type: 'redOppSat', n: 1 }, { type: 'selfTrash' }],
  tomato: [{ type: 'condIngZone', op: 'le', n: 3, then: [{ type: 'drawIng', n: 2 }] }],
  carrot: [{ type: 'selectIngZone', then: 'toHand' }],
  broccoli: [{ type: 'selectIngZone', then: 'searchSame' }, { type: 'selfTrash' }],
  lettuce: [{ type: 'recoverTrashToDeck' }],
  lemon: [{ type: 'condIngZone', op: 'le', n: 3, then: [{ type: 'drawRec', n: 1 }] }],
  negi: [], onion: [], garlic: [], moyashi: [],
  milk: [{ type: 'recoverTrash', filterKey: 'cheese_or_butter' }],
  saba: [{ type: 'recoverTrash', filterKey: 'mineral_ing' }],
  shiitake: [{ type: 'discardHand', n: 2, optional: true }, { type: 'ifPrev' }, { type: 'searchIngDeck', filterKey: 'mineral_ing' }, { type: 'selfTrash' }],
  cheese: [{ type: 'discardHand', n: 1 }],
  nori: [{ type: 'recoverTrash', filterKey: 'id:rice' }],
  spinach: [], wakame: [],
};

const REC_BLOCKS = {
  onigiri: [{ type: 'drawIng', n: 2 }],
  tkgr: [{ type: 'drawRec', n: 2 }],
  sushiSalmon: [{ type: 'discardHand', n: 1, optional: true }, { type: 'ifPrev' }, { type: 'drawIng', n: 2 }],
  jagabata: [],
  steak: [{ type: 'setDebuff', key: 'noServe', val: 1 }],
  sabaMiso: [{ type: 'selectOppZone', then: 'trash' }],
  buriDaikon: [{ type: 'selectOppZone', then: 'deck' }],
  horenSote: [{ type: 'rndBounce' }],
  hiyakko: [{ type: 'drawIng', n: 1 }, { type: 'redOppSat', n: 2 }],
  yasaiSalad: [{ type: 'discardHand', n: 1, optional: true }, { type: 'ifPrev' }, { type: 'recoverTrash', filterKey: 'ingredient' }],
  omelet: [{ type: 'drawIng', n: 2 }, { type: 'discardHand', n: 1 }],
  cheeseOmelet: [{ type: 'drawIng', n: 3 }, { type: 'discardHand', n: 2 }],
  mashed: [{ type: 'bufNextRec', n: 2 }],
  peperoncino: [{ type: 'revealOpp' }, { type: 'recoverTrash', filterKey: 'ingredient' }],
  germanPotato: [{ type: 'discardHand', n: 1, optional: true, filterKey: 'fat_ing' }, { type: 'ifPrev' }, { type: 'searchIngDeck' }],
  gyudon: [], butaNinger: [],
  misoShiru: [{ type: 'redSelfSat', n: 3 }],
  yakisoba: [{ type: 'discAllHand', ing: 3, rec: 2 }],
  chickenSalad: [{ type: 'drawRec', n: 1 }, { type: 'recoverTrash', filterKey: 'ingredient' }],
  caesarSalad: [{ type: 'searchRecDeck' }, { type: 'addSelfSat', n: 1 }],
  oyakodon: [{ type: 'searchIngDeck' }],
  salmonMeuniere: [{ type: 'searchIngDeck' }],
  gratin: [{ type: 'setOppDebuff', n: 3 }],
  frenchToast: [{ type: 'markIngZone' }],
  maboTofu: [{ type: 'discardHand', n: 1, optional: true, filterKey: 'protein' }, { type: 'ifPrev' }, { type: 'drawRec', n: 2 }],
  hamburg: [{ type: 'drawIng', n: 3 }, { type: 'setDebuff', key: 'noServe', val: 1 }],
  curryUdon: [{ type: 'drawToZone', n: 2 }],
  okonomiyaki: [], yasaiItame: [],
  carbonara: [{ type: 'retAllHand', ing: 4, rec: 3 }],
  butajiru: [{ type: 'drawIng', n: 2 }, { type: 'redSelfSat', n: 4 }],
  nikujaga: [{ type: 'recoverRecFromTrash' }, { type: 'discardHand', n: 1 }],
  okosamLunch: [{ type: 'drawRec', n: 3 }, { type: 'retHand', n: 2 }],
  croquette: [],
  meatSauce: [{ type: 'retAllDrawByOpp' }],
  minestrone: [{ type: 'recoverTrash2', n: 2, filterKey: 'ingredient' }, { type: 'redSelfSat', n: 4 }],
  creamStew: [{ type: 'drawRec', n: 2 }],
  curryRice: [{ type: 'drawToZone', n: 2 }],
  sukiyaki: [],
};

// filterKey に cheese_or_butter を対応
const origMatchFilter = matchFilter;
function matchFilter(c, key) {
  if (key === 'cheese_or_butter') return ['cheese', 'butter'].includes(c.id) && !c._isRec;
  if (key === 'ingredient') return !c._isRec;
  if (key === 'recipe') return c._isRec;
  if (['protein', 'carb', 'fat', 'vitamin', 'mineral'].includes(key)) return c.cat === key && !c._isRec;
  if (key === 'fat_ing') return c.cat === 'fat' && !c._isRec;
  if (key === 'mineral_ing') return c.cat === 'mineral' && !c._isRec;
  if (key && key.startsWith('id:')) return c.id === key.slice(3);
  return true;
}

// ── 公開用ゲーム状態（手札は秘匿） ──
function publicState(G, myPi) {
  return {
    ...G,
    players: G.players.map((p, pi) => ({
      ...p,
      hand: pi === myPi
        ? p.hand  // 自分の手札は全部見える
        : p.hand.map(() => ({ _hidden: true })),  // 相手手札は隠す
      ingDeck: p.ingDeck.length,   // 枚数だけ
      recDeck: p.recDeck.length,
      trash: p.trash,              // ごみ箱は公開
    })),
    // pending の選択肢もプレイヤーに応じてフィルタ
    pending: G.pending && G.pending.pi === myPi ? G.pending : (G.pending ? { pi: G.pending.pi, waiting: true } : undefined),
  };
}

// ── ゲーム操作API ──
function doDrawCard(G, pi, type) {
  if (G.phase !== 'draw' || G.currentPlayer !== pi) return { error: '操作できません' };
  let s = type === 'ing' ? drawI(G, pi, 1) : drawR(G, pi, 1);
  return { G: { ...s, phase: 'place' } };
}

function doPlaceCard(G, pi, cardUid) {
  if (G.phase !== 'place' || G.currentPlayer !== pi) return { error: '操作できません' };
  const p = G.players[pi];
  const card = p.hand.find(c => c._uid === cardUid);
  if (!card || card._isRec) return { error: '無効なカード' };
  if (p.ingZone.length >= 7) return { error: '食材ゾーンが満杯' };
  const s = addLog(ovP(G, pi, {
    hand: p.hand.filter(c => c._uid !== cardUid),
    ingZone: [...p.ingZone, { ...card, _placedThisTurn: true }]
  }), `P${pi + 1}: ${card.name}を配置`);
  return { G: s };
}

function doReturnCard(G, pi, cardUid) {
  if (G.phase !== 'place' || G.currentPlayer !== pi) return { error: '操作できません' };
  const p = G.players[pi];
  const card = p.ingZone.find(c => c._uid === cardUid);
  if (!card || !card._placedThisTurn) return { error: 'このターン配置したカードのみ戻せます' };
  const s = addLog(ovP(G, pi, {
    ingZone: p.ingZone.filter(c => c._uid !== cardUid),
    hand: [...p.hand, { ...card, _placedThisTurn: false }]
  }), `P${pi + 1}: ${card.name}を手札に戻した`);
  return { G: s };
}

function doActivate(G, pi, cardUid) {
  if (G.phase !== 'activate' || G.currentPlayer !== pi) return { error: '操作できません' };
  const p = G.players[pi];
  if (p.activatedThisTurn) return { error: '起動効果は1ターン1回まで' };
  const card = p.ingZone.find(c => c._uid === cardUid);
  if (!card) return { error: 'カードが見つかりません' };
  if (card._used) return { error: '起動効果は使用済み' };
  const blocks = ING_BLOCKS[card.id];
  if (!blocks || !blocks.length) return { error: `${card.name}は起動効果なし` };
  const ingZone = p.ingZone.map(c => c._uid === cardUid ? { ...c, _used: true } : c);
  let s = ovP(G, pi, { ingZone, activatedThisTurn: true });
  s = runBlocks(s, pi, blocks, card.id);
  if (!s.pending) s = addLog(s, `P${pi + 1}: ${card.name}の効果発動`);
  return { G: checkWin(s) };
}

function doServeRecipe(G, pi, recUid, ingUids) {
  if (G.phase !== 'serve' || G.currentPlayer !== pi) return { error: '操作できません' };
  const p = G.players[pi];
  if (p.debuffs && p.debuffs.noServe) return { error: 'デバフ中：料理提供不可' };
  const rec = p.hand.find(c => c._uid === recUid);
  if (!rec || !rec._isRec) return { error: '無効なレシピ' };
  const zoneIds = p.ingZone.map(c => c.id);
  if (!rec.req.every(r => zoneIds.includes(r))) return { error: '食材が揃っていません' };
  const used = ingUids.map(u => p.ingZone.find(c => c._uid === u)).filter(Boolean);
  if (used.length !== rec.req.length) return { error: '食材の選択が正しくありません' };
  const buf = p.bufNextRec || 0;
  const toastBonus = used.some(c => c._toastMark) ? 2 : 0;
  const gain = rec.sat + buf + toastBonus;
  const opp = 1 - pi;
  let G2 = ovP(G, pi, {
    hand: p.hand.filter(c => c._uid !== recUid),
    ingZone: p.ingZone.filter(c => !ingUids.includes(c._uid)),
    trash: [...p.trash, ...used],
    recZone: [...p.recZone, rec],
    bufNextRec: 0,
  });
  G2 = ovP(G2, opp, { satiety: Math.min(20, G2.players[opp].satiety + gain) });
  G2 = addLog(G2, `P${pi + 1}: 【${rec.name}】完成！相手+${gain}！`, 'hl');
  G2 = checkWin(G2); if (G2.winner != null) return { G: G2 };
  const blocks = REC_BLOCKS[rec.id];
  if (blocks && blocks.length) G2 = runBlocks(G2, pi, blocks, rec.id);
  return { G: checkWin(G2) };
}

function doDiscard(G, pi, cardUid) {
  if (G.phase !== 'discard' || G.currentPlayer !== pi) return { error: '操作できません' };
  const p = G.players[pi];
  const card = p.hand.find(c => c._uid === cardUid);
  if (!card) return { error: 'カードが見つかりません' };
  const s = addLog(ovP(G, pi, {
    hand: p.hand.filter(c => c._uid !== cardUid),
    trash: [...p.trash, card],
  }), `P${pi + 1}: ${card.name}を廃棄`);
  return { G: s };
}

function doNextPhase(G, pi) {
  if (G.currentPlayer !== pi) return { error: '相手のターンです' };
  const phases = ['draw', 'place', 'activate', 'serve', 'discard'];
  const idx = phases.indexOf(G.phase);
  if (idx < phases.length - 1) {
    return { G: { ...G, phase: phases[idx + 1] } };
  }
  // ターン終了
  return { G: endTurn(G) };
}

function doResolveChoice(G, pi, chosen) {
  if (!G.pending || G.pending.pi !== pi) return { error: '選択権がありません' };
  let s = resumeBlocks(G, chosen);
  return { G: checkWin(s) };
}

function endTurn(G) {
  const pi = G.currentPlayer; const opp = 1 - pi; let s = G;
  const p = s.players[pi];
  if (p.debuffs && p.debuffs.satBuff) {
    const v = p.debuffs.satBuff;
    s = ovP(s, pi, { satiety: Math.min(20, p.satiety + v), debuffs: { ...p.debuffs, satBuff: 0 } });
    s = addLog(s, `P${pi + 1}: バフで満腹+${v}`, 'warn');
    s = checkWin(s); if (s.winner != null) return s;
  }
  const np = [...s.players];
  np[pi] = { ...np[pi], activatedThisTurn: false, ingZone: np[pi].ingZone.map(c => ({ ...c, _used: false, _placedThisTurn: false })), revealed: false };
  const od = { ...np[opp].debuffs };
  if (od.noServe) od.noServe = Math.max(0, od.noServe - 1);
  np[opp] = { ...np[opp], debuffs: od };
  return addLog({ ...s, players: np, currentPlayer: opp, phase: 'draw', turn: s.turn + 1 }, `Turn ${s.turn + 1} - P${opp + 1}のターン`);
}

function doMulligan(players, sels) {
  return players.map((p, pi) => {
    const ret = p.hand.filter(c => sels[pi].includes(c._uid));
    const kept = p.hand.filter(c => !sels[pi].includes(c._uid));
    let iD = [...p.ingDeck], rD = [...p.recDeck];
    ret.forEach(c => { if (c._isRec) rD = shuffle([...rD, c]); else iD = shuffle([...iD, c]); });
    const inN = ret.filter(c => !c._isRec).length, reN = ret.filter(c => c._isRec).length;
    return { ...p, hand: [...kept, ...iD.slice(0, inN), ...rD.slice(0, reN)], ingDeck: iD.slice(inN), recDeck: rD.slice(reN) };
  });
}

function createGame(configs) {
  const players = configs.map(cfg => initPlayer(cfg));
  return {
    players,
    currentPlayer: 0,
    phase: 'draw',
    turn: 1,
    winner: null,
    log: [{ msg: 'ゲーム開始！P1の先攻です', type: 'hl', id: uid() }],
  };
}

module.exports = {
  ING_DEFS, REC_DEFS, ING_MAP, REC_MAP,
  createGame, doMulligan, publicState,
  doDrawCard, doPlaceCard, doReturnCard,
  doActivate, doServeRecipe, doDiscard,
  doNextPhase, doResolveChoice,
  initPlayer,
};
