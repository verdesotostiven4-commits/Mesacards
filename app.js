const app = document.querySelector('#app');

const STORAGE_KEY = 'mesacards_state_v1';
const GAME_LIST = [
  { id: 'bj', icon: '🂡', title: '21 Flash', desc: 'Rondas rápidas contra la banca virtual.' },
  { id: 'holdem', icon: '♠️', title: 'Hold’em Social', desc: 'Cartas comunitarias, presión y lectura.' },
  { id: 'rummy', icon: '🃏', title: 'Rummy Parejas', desc: 'Roba, combina y toca cuando convenga.' },
  { id: 'gem', icon: '💎', title: 'Gem Clash', desc: 'Gemas, contratos y decisiones rápidas.' }
];

const SUITS = [
  { s: '♠', red: false }, { s: '♥', red: true }, { s: '♦', red: true }, { s: '♣', red: false }
];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_VALUE = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
const GEM_TYPES = [
  { id: 'ruby', icon: '◆', name: 'Rubí' },
  { id: 'sapphire', icon: '●', name: 'Zafiro' },
  { id: 'emerald', icon: '▲', name: 'Esmeralda' },
  { id: 'amber', icon: '⬟', name: 'Ámbar' },
  { id: 'onyx', icon: '✦', name: 'Ónix' }
];

let state = loadState();
let deferredInstallPrompt = null;
let toastTimer = null;

function defaultState(){
  return {
    screen: 'home',
    players: [
      { name: 'Tú', chips: 40 },
      { name: 'Moni', chips: 40 }
    ],
    game: null,
    data: null,
    installDismissed: false,
    sound: true,
    vibration: true,
    lastGame: null
  };
}
function loadState(){
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState(), ...parsed, screen: 'home', game: null, data: null };
  } catch { return defaultState(); }
}
function persist(){
  const copy = { ...state, screen:'home', game:null, data:null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
}
function vibrate(ms=18){ if(state.vibration && navigator.vibrate) navigator.vibrate(ms); }
function beep(){
  if(!state.sound) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = 520; gain.gain.value = .035;
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    setTimeout(()=>{ osc.stop(); ctx.close(); }, 55);
  } catch {}
}
function feedback(text){ beep(); vibrate(); toast(text); }
function toast(text){
  clearTimeout(toastTimer);
  let el = document.querySelector('.toast');
  if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = text; el.classList.add('show');
  toastTimer = setTimeout(()=>el.classList.remove('show'), 1900);
}
function deck(){
  const cards = [];
  for(const suit of SUITS) for(const r of RANKS) cards.push({ r, s: suit.s, red: suit.red, v: RANK_VALUE[r] });
  return shuffle(cards);
}
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function draw(d, n=1){ return d.splice(0,n); }
function clampPlayers(min=2,max=8){
  const clean = state.players.filter(p => p.name.trim()).map(p => ({ name:p.name.trim(), chips:Number.isFinite(p.chips)?p.chips:40 }));
  state.players = clean.slice(0,max);
  while(state.players.length<min) state.players.push({ name: state.players.length ? 'Invitado' : 'Tú', chips:40 });
}
function escapeHtml(str=''){
  return str.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function cardHTML(card, mini=false){
  if(!card) return `<div class="card ${mini?'mini':''} back">MC</div>`;
  return `<div class="card ${card.red?'red':'black'} ${mini?'mini':''}"><b>${card.r}</b><span>${card.s}</span></div>`;
}
function chips(player){ return `<span class="chip">${player.chips}</span>`; }
function savePlayersFromText(){
  const text = document.querySelector('#playersText')?.value || '';
  const names = text.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8);
  state.players = (names.length?names:['Tú','Moni']).map((name,i)=>({ name, chips: state.players[i]?.chips || 40 }));
  persist(); feedback('Jugadores guardados'); render();
}
function navHome(){ state.screen='home'; state.game=null; state.data=null; render(); }
function topbar(title, subtitle=''){
  return `<div class="topbar"><button class="iconBtn" onclick="navHome()">⌂</button><div><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</div><button class="iconBtn" onclick="openSettings()">⚙</button></div>`;
}
function render(){
  if(state.screen === 'home') return renderHome();
  if(state.game === 'bj') return renderBJ();
  if(state.game === 'holdem') return renderHoldem();
  if(state.game === 'rummy') return renderRummy();
  if(state.game === 'gem') return renderGem();
}
function renderHome(){
  const installBanner = shouldShowInstallBanner() ? installHTML() : '';
  app.innerHTML = `${installBanner}<section class="hero screen"><div class="brandMark">♣</div><p class="eyebrow">PWA móvil · fichas virtuales</p><h1>MesaCards</h1><p>Una mesa social para jugar en celular con tu pareja o amigos. Todo funciona con puntos virtuales: emoción, turnos rápidos y cero dinero real.</p><div class="heroActions"><button class="btn primary" onclick="quickStart()">Jugar ahora</button><button class="btn ghost" onclick="scrollToGames()">Elegir juego</button></div></section><section id="games" class="gameGrid">${GAME_LIST.map(g=>`<button class="gameTile" onclick="startGame('${g.id}')"><span>${g.icon}</span><b>${g.title}</b><small>${g.desc}</small></button>`).join('')}</section><section class="panel"><h2>Jugadores</h2><label class="field"><span>Un nombre por línea</span><textarea id="playersText" rows="4">${state.players.map(p=>p.name).join('\n')}</textarea></label><div class="quickPlayers"><button class="pill" onclick="presetPlayers('Tú\nMoni')">Pareja</button><button class="pill" onclick="presetPlayers('Tú\nMoni\nBro\nInvitada')">4 amigos</button><button class="pill" onclick="presetPlayers('Tú\nMoni\nBro\nInvitada\nPlayer 5\nPlayer 6')">6 jugadores</button></div><div class="heroActions"><button class="btn primary" onclick="savePlayersFromText()">Guardar</button><button class="btn ghost" onclick="resetChips()">Reiniciar fichas</button></div></section><section class="infoCard"><h2>Cómo jugar mejor</h2><p>Usen el modo pass-and-play: cada persona toma el celular en su turno. Es ideal para probar la experiencia antes de meter salas online reales.</p></section>`;
}
function scrollToGames(){ document.querySelector('#games')?.scrollIntoView({behavior:'smooth'}); }
function presetPlayers(text){ document.querySelector('#playersText').value = text; savePlayersFromText(); }
function resetChips(){ state.players = state.players.map(p=>({ ...p, chips:40 })); persist(); feedback('Fichas reiniciadas'); render(); }
function quickStart(){ startGame(state.lastGame || 'bj'); }
function shouldShowInstallBanner(){ return !state.installDismissed && !window.matchMedia('(display-mode: standalone)').matches; }
function installHTML(){ return `<div class="installBanner"><div><b>Instala MesaCards</b><span>Mejor experiencia en pantalla completa.</span></div><button class="btn small primary" onclick="installApp()">Instalar</button><button class="btn small ghost" onclick="dismissInstall()">Luego</button></div>`; }
function dismissInstall(){ state.installDismissed = true; persist(); render(); }
async function installApp(){
  if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; dismissInstall(); }
  else toast('En Chrome: menú ⋮ → Agregar a pantalla principal');
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; render(); });
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

function startGame(id){
  state.lastGame = id; state.game = id; state.screen = 'game'; persist();
  if(id==='bj') startBJ();
  if(id==='holdem') startHoldem();
  if(id==='rummy') startRummy();
  if(id==='gem') startGem();
}

function renderLog(lines=[]){ return `<section class="log">${lines.slice(-8).reverse().map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</section>`; }
function openSettings(){
  document.body.insertAdjacentHTML('beforeend', `<div class="modalOverlay" onclick="closeModal(event)"><div class="modal"><h2>Ajustes</h2><div class="modalBody settingRows"><label><input type="checkbox" ${state.sound?'checked':''} onchange="state.sound=this.checked;persist()"> Sonidos cortos</label><label><input type="checkbox" ${state.vibration?'checked':''} onchange="state.vibration=this.checked;persist()"> Vibración en acciones</label><p>Tip: cuando publiques el proyecto, ábrelo desde Chrome/Safari y agrégalo a la pantalla principal.</p></div><div class="modalActions"><button class="btn primary" onclick="document.querySelector('.modalOverlay').remove()">Listo</button></div></div></div>`);
}
function closeModal(e){ if(e.target.classList.contains('modalOverlay')) e.target.remove(); }

// 21 FLASH
function bjValue(cards){
  let total = 0, aces = 0;
  for(const c of cards){ if(c.r==='A'){ total += 11; aces++; } else total += Math.min(10, Number(c.r) || 10); }
  while(total>21 && aces){ total -= 10; aces--; }
  return total;
}
function startBJ(){
  clampPlayers(1,6); const d = deck();
  state.data = { deck:d, dealer:draw(d,2), current:0, done:false, log:['Nueva ronda de 21 Flash.'], hands: state.players.map(p=>({ name:p.name, cards:draw(d,2), done:false, result:'' })) };
  render();
}
function bjHit(){
  const g = state.data, h = g.hands[g.current]; if(g.done || h.done) return;
  h.cards.push(...draw(g.deck)); const val = bjValue(h.cards);
  if(val>21){ h.done = true; h.result = 'Se pasó'; g.log.push(`${h.name} se pasó con ${val}.`); bjNextAuto(); }
  else g.log.push(`${h.name} pidió carta y tiene ${val}.`);
  feedback('Carta tomada'); render();
}
function bjStand(){ const g=state.data,h=g.hands[g.current]; if(g.done) return; h.done=true; h.result='Plantado'; g.log.push(`${h.name} se plantó con ${bjValue(h.cards)}.`); bjNextAuto(); feedback('Turno cerrado'); render(); }
function bjNextAuto(){
  const g = state.data;
  const next = g.hands.findIndex((h,i)=>i>g.current && !h.done);
  if(next>=0) g.current = next; else bjFinish();
}
function bjFinish(){
  const g = state.data; while(bjValue(g.dealer)<17) g.dealer.push(...draw(g.deck));
  const dealer = bjValue(g.dealer); g.log.push(`Banca virtual termina con ${dealer}.`);
  g.hands.forEach((h,i)=>{
    const hv = bjValue(h.cards); let text = 'Empate';
    if(hv>21) { text='Pierde'; state.players[i].chips = Math.max(0,state.players[i].chips-1); }
    else if(dealer>21 || hv>dealer){ text='Gana +2'; state.players[i].chips += 2; }
    else if(hv<dealer){ text='Pierde -1'; state.players[i].chips = Math.max(0,state.players[i].chips-1); }
    h.result = text; g.log.push(`${h.name}: ${text}.`);
  });
  g.done = true; persist();
}
function renderBJ(){
  const g = state.data;
  app.innerHTML = `${topbar('21 Flash','Llega cerca de 21 sin pasarte')}<main class="screen"><section class="table"><div class="dealerZone"><h3>Banca virtual <small>${g.done?'':'1 carta oculta'}</small></h3><div class="cards">${g.dealer.map((c,i)=>!g.done&&i===1?cardHTML(null):cardHTML(c)).join('')}</div><p class="score">${g.done?bjValue(g.dealer):'?'}</p></div><div class="playersStrip">${g.hands.map((h,i)=>`<div class="playerSeat ${i===g.current&&!g.done?'active':''}"><h4>${escapeHtml(h.name)} ${chips(state.players[i])}</h4><div class="cards smallCards">${h.cards.map(c=>cardHTML(c,true)).join('')}</div><p>${bjValue(h.cards)} · ${h.result || (i===g.current?'Tu turno':'Esperando')}</p></div>`).join('')}</div></section>${renderLog(g.log)}</main><div class="actionDock">${g.done?`<button class="btn primary" onclick="startBJ()">Nueva ronda</button><button class="btn ghost" onclick="navHome()">Salir</button>`:`<button class="btn primary" onclick="bjHit()">Pedir carta</button><button class="btn ghost" onclick="bjStand()">Plantarse</button>`}</div>`;
}

// HOLD'EM SOCIAL
function startHoldem(){
  clampPlayers(2,6); const d = deck();
  state.data = { deck:d, community:[], street:'preflop', turn:0, pot:0, done:false, log:['Cartas repartidas. Pasen el celular con cuidado.'], players: state.players.map(p=>({ name:p.name, chips:p.chips, cards:draw(d,2), folded:false, boost:0, label:'' })) };
  render();
}
function activeHoldemPlayers(){ return state.data.players.filter(p=>!p.folded); }
function holdemAction(type){
  const g=state.data,p=g.players[g.turn]; if(g.done || p.folded) return;
  if(type==='fold'){ p.folded=true; p.label='Fuera'; g.log.push(`${p.name} se retira de esta ronda.`); }
  if(type==='call'){ p.label='Sigue'; g.log.push(`${p.name} sigue en la mano.`); }
  if(type==='press'){
    if(state.players[g.turn].chips>0){ state.players[g.turn].chips--; g.pot++; p.boost++; p.label='Presión +1'; g.log.push(`${p.name} mete presión con 1 ficha virtual.`); }
    else g.log.push(`${p.name} no tiene fichas para presionar.`);
  }
  if(activeHoldemPlayers().length===1) return holdemWinner(activeHoldemPlayers()[0], 'Todos los demás salieron.');
  holdemNextTurn(); feedback('Acción tomada'); render();
}
function holdemNextTurn(){
  const g=state.data; let count=0;
  do { g.turn = (g.turn + 1) % g.players.length; count++; } while(g.players[g.turn].folded && count<20);
}
function holdemStreet(){
  const g=state.data; g.players.forEach(p=>p.label='');
  if(g.street==='preflop'){ g.community.push(...draw(g.deck,3)); g.street='flop'; g.log.push('Flop revelado.'); }
  else if(g.street==='flop'){ g.community.push(...draw(g.deck)); g.street='turn'; g.log.push('Turn revelado.'); }
  else if(g.street==='turn'){ g.community.push(...draw(g.deck)); g.street='river'; g.log.push('River revelado.'); }
  else return holdemShowdown();
  g.turn = g.players.findIndex(p=>!p.folded); feedback('Mesa avanza'); render();
}
function holdemShowdown(){
  const g=state.data; let best = null;
  for(const p of g.players.filter(x=>!x.folded)){
    const ev = evaluateHand([...p.cards,...g.community]); p.eval = ev;
    if(!best || compareEval(ev,best.eval)>0) best = p;
  }
  holdemWinner(best, `Showdown: ${best.name} gana con ${best.eval.name}.`);
}
function holdemWinner(p, msg){
  const g=state.data; const idx=g.players.indexOf(p); const prize=Math.max(2,g.pot+2);
  state.players[idx].chips += prize; p.label = `Gana +${prize}`; g.done=true; g.log.push(msg); persist(); feedback('Ronda terminada'); render();
}
function combinations(arr,k){
  const res=[]; function rec(start,combo){ if(combo.length===k) return res.push(combo); for(let i=start;i<arr.length;i++) rec(i+1,[...combo,arr[i]]); }
  rec(0,[]); return res;
}
function evaluateFive(cards){
  const values = cards.map(c=>c.v).sort((a,b)=>b-a);
  const counts = {}; values.forEach(v=>counts[v]=(counts[v]||0)+1);
  const groups = Object.entries(counts).map(([v,c])=>({v:+v,c})).sort((a,b)=>b.c-a.c || b.v-a.v);
  const flush = cards.every(c=>c.s===cards[0].s);
  const unique = [...new Set(values)].sort((a,b)=>b-a);
  if(unique.includes(14)) unique.push(1);
  let straightHigh = 0;
  for(let i=0;i<=unique.length-5;i++){ const seq=unique.slice(i,i+5); if(seq[0]-seq[4]===4){ straightHigh=seq[0]; break; } }
  if(flush && straightHigh) return { rank:8, t:[straightHigh], name:'Escalera color' };
  if(groups[0].c===4) return { rank:7, t:[groups[0].v, ...groups.filter(g=>g.c!==4).map(g=>g.v)], name:'Póker' };
  if(groups[0].c===3 && groups[1]?.c===2) return { rank:6, t:[groups[0].v, groups[1].v], name:'Full house' };
  if(flush) return { rank:5, t:values, name:'Color' };
  if(straightHigh) return { rank:4, t:[straightHigh], name:'Escalera' };
  if(groups[0].c===3) return { rank:3, t:[groups[0].v, ...groups.filter(g=>g.c!==3).map(g=>g.v).sort((a,b)=>b-a)], name:'Trío' };
  if(groups[0].c===2 && groups[1]?.c===2) return { rank:2, t:[Math.max(groups[0].v,groups[1].v),Math.min(groups[0].v,groups[1].v),...groups.filter(g=>g.c===1).map(g=>g.v)], name:'Doble pareja' };
  if(groups[0].c===2) return { rank:1, t:[groups[0].v,...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)], name:'Pareja' };
  return { rank:0, t:values, name:'Carta alta' };
}
function compareEval(a,b){
  if(a.rank!==b.rank) return a.rank-b.rank;
  for(let i=0;i<Math.max(a.t.length,b.t.length);i++){ if((a.t[i]||0)!==(b.t[i]||0)) return (a.t[i]||0)-(b.t[i]||0); }
  return 0;
}
function evaluateHand(cards){ return combinations(cards,5).map(evaluateFive).sort(compareEval).pop(); }
function renderHoldem(){
  const g=state.data;
  app.innerHTML = `${topbar('Hold’em Social','Ronda de cartas comunitarias')}<main class="screen"><section class="table"><div class="pot">Bote de puntos: ${g.pot}</div><div class="dealerZone"><h3>Mesa · ${g.street.toUpperCase()}</h3><div class="cards community">${[0,1,2,3,4].map(i=>g.community[i]?cardHTML(g.community[i]):'<div class="card slot">+</div>').join('')}</div></div><div class="playersStrip">${g.players.map((p,i)=>`<div class="playerSeat ${i===g.turn&&!g.done?'active':''} ${p.folded?'folded':''}"><h4>${escapeHtml(p.name)} ${chips(state.players[i])}</h4><div class="cards smallCards">${p.cards.map(c=>cardHTML(c,true)).join('')}</div><p>${p.label || (p.eval?.name || (i===g.turn?'Decide':'En ronda'))}</p></div>`).join('')}</div></section>${renderLog(g.log)}</main><div class="actionDock">${g.done?`<button class="btn primary" onclick="startHoldem()">Nueva ronda</button><button class="btn ghost" onclick="navHome()">Salir</button>`:`<button class="btn primary" onclick="holdemAction('call')">Seguir</button><button class="btn ghost" onclick="holdemAction('press')">Presión +1</button><button class="btn danger" onclick="holdemAction('fold')">Salir</button><button class="btn ghost" onclick="holdemStreet()">Revelar</button>`}</div>`;
}

// RUMMY PAREJAS
function startRummy(){
  clampPlayers(2,4); const d=deck();
  state.data = { deck:d, discard:draw(d), turn:0, selected:null, drew:false, done:false, log:['Rummy iniciado. Forma tríos o escaleras.'], hands:state.players.map(p=>({ name:p.name, cards:draw(d,7), score:0, label:'' })) };
  render();
}
function sortRummyHand(cards){ cards.sort((a,b)=>a.s.localeCompare(b.s)||a.v-b.v); }
function rummyDraw(source){
  const g=state.data,h=g.hands[g.turn]; if(g.done || g.drew) return;
  if(source==='discard') h.cards.push(g.discard.pop()); else h.cards.push(...draw(g.deck));
  g.drew=true; g.selected=null; g.log.push(`${h.name} robó una carta.`); feedback('Carta robada'); render();
}
function rummySelect(i){ const g=state.data; if(g.done) return; g.selected = g.selected===i?null:i; render(); }
function rummyDiscard(){
  const g=state.data,h=g.hands[g.turn]; if(g.selected===null || !g.drew) return toast('Primero roba y luego descarta');
  const [c]=h.cards.splice(g.selected,1); g.discard.push(c); g.log.push(`${h.name} descartó ${c.r}${c.s}.`); rummyNext(); feedback('Descartada'); render();
}
function rummyNext(){ const g=state.data; sortRummyHand(g.hands[g.turn].cards); g.turn=(g.turn+1)%g.hands.length; g.selected=null; g.drew=false; }
function cardPoints(c){ return c.r==='A'?1:Math.min(10,Number(c.r)||10); }
function deadwood(cards){
  const used = new Set();
  const byRank = {}; cards.forEach((c,i)=>{ (byRank[c.r] ||= []).push(i); });
  Object.values(byRank).forEach(indices=>{ if(indices.length>=3) indices.forEach(i=>used.add(i)); });
  for(const suit of SUITS.map(x=>x.s)){
    const suitCards = cards.map((c,i)=>({c,i})).filter(x=>x.c.s===suit).sort((a,b)=>a.c.v-b.c.v);
    let run=[];
    for(const item of suitCards){
      if(!run.length || item.c.v===run[run.length-1].c.v+1) run.push(item); else { if(run.length>=3) run.forEach(x=>used.add(x.i)); run=[item]; }
    }
    if(run.length>=3) run.forEach(x=>used.add(x.i));
  }
  return cards.reduce((sum,c,i)=>sum+(used.has(i)?0:cardPoints(c)),0);
}
function rummyKnock(){
  const g=state.data,h=g.hands[g.turn]; const d=deadwood(h.cards);
  if(d>10) return toast(`Aún tienes ${d} puntos sueltos`);
  g.done=true; let best={i:g.turn,d};
  g.hands.forEach((hand,i)=>{ const dw=deadwood(hand.cards); hand.score=dw; if(dw<best.d) best={i,d:dw}; });
  state.players[best.i].chips += 3; g.hands[best.i].label='Gana +3'; g.log.push(`${state.players[best.i].name} gana la ronda con ${best.d} puntos sueltos.`); persist(); feedback('Toque aceptado'); render();
}
function renderRummy(){
  const g=state.data,h=g.hands[g.turn]; const topDiscard=g.discard[g.discard.length-1];
  app.innerHTML = `${topbar('Rummy Parejas','Combina y baja puntos sueltos')}<main class="screen"><section class="table rummyTable"><div class="scoreRow">${g.hands.map((p,i)=>`<div class="scoreCard ${i===g.turn&&!g.done?'active':''}"><b>${escapeHtml(p.name)} ${chips(state.players[i])}</b><span>${g.done?`${p.score} sueltos`:`${p.cards.length} cartas`}</span><small>${p.label||''}</small></div>`).join('')}</div><div class="deckRow"><button class="pile" onclick="rummyDraw('deck')">${cardHTML(null)}<small>Mazo ${g.deck.length}</small></button><button class="pile" onclick="rummyDraw('discard')">${cardHTML(topDiscard)}<small>Descarte</small></button></div><h3>Turno de ${escapeHtml(h.name)} · puntos sueltos: ${deadwood(h.cards)}</h3><div class="handFan">${h.cards.map((c,i)=>`<button class="handCard ${g.selected===i?'selected':''}" onclick="rummySelect(${i})">${cardHTML(c)}</button>`).join('')}</div></section>${renderLog(g.log)}</main><div class="actionDock">${g.done?`<button class="btn primary" onclick="startRummy()">Nueva ronda</button><button class="btn ghost" onclick="navHome()">Salir</button>`:`<button class="btn primary" onclick="rummyDiscard()">Descartar</button><button class="btn ghost" onclick="rummyKnock()">Tocar</button>`}</div>`;
}

// GEM CLASH
function startGem(){
  clampPlayers(2,4);
  state.data = { turn:0, selected:[], board:randomGems(12), done:false, log:['Gem Clash iniciado. Toma hasta 2 gemas por turno.'], players:state.players.map(p=>({ name:p.name, gems:{ruby:0,sapphire:0,emerald:0,amber:0,onyx:0}, points:0, label:'' })), contracts:newContracts() };
  render();
}
function randomGems(n){ return Array.from({length:n},()=>GEM_TYPES[Math.floor(Math.random()*GEM_TYPES.length)].id); }
function contract(){
  const cost={}; shuffle(GEM_TYPES).slice(0,3).forEach(g=>cost[g.id]=1+Math.floor(Math.random()*2));
  const total=Object.values(cost).reduce((a,b)=>a+b,0); return { cost, points: total + Math.floor(Math.random()*3) };
}
function newContracts(){ return Array.from({length:4},contract); }
function gemSelect(i){
  const g=state.data; if(g.done) return;
  if(g.selected.includes(i)) g.selected=g.selected.filter(x=>x!==i); else if(g.selected.length<2) g.selected.push(i); else return toast('Máximo 2 gemas');
  render();
}
function gemTake(){
  const g=state.data,p=g.players[g.turn]; if(!g.selected.length) return toast('Elige gemas');
  g.selected.forEach(i=>p.gems[g.board[i]]++); g.log.push(`${p.name} tomó ${g.selected.length} gema(s).`);
  g.selected.sort((a,b)=>b-a).forEach(i=>g.board.splice(i,1));
  while(g.board.length<12) g.board.push(...randomGems(1));
  gemNext(); feedback('Gemas tomadas'); render();
}
function canPay(player,c){ return Object.entries(c.cost).every(([id,n])=>player.gems[id]>=n); }
function gemBuy(i){
  const g=state.data,p=g.players[g.turn],c=g.contracts[i]; if(!canPay(p,c)) return toast('Te faltan gemas');
  Object.entries(c.cost).forEach(([id,n])=>p.gems[id]-=n); p.points+=c.points; p.label=`+${c.points} puntos`; g.contracts[i]=contract();
  g.log.push(`${p.name} completó contrato de ${c.points} puntos.`);
  if(p.points>=18){ g.done=true; const idx=g.players.indexOf(p); state.players[idx].chips += 5; g.log.push(`${p.name} gana Gem Clash y recibe +5 fichas.`); persist(); }
  else gemNext(); feedback('Contrato listo'); render();
}
function gemNext(){ const g=state.data; g.turn=(g.turn+1)%g.players.length; g.selected=[]; g.players.forEach(p=>p.label=''); }
function gemIcon(id){ const g=GEM_TYPES.find(x=>x.id===id); return `<span class="${id}">${g.icon}</span>`; }
function costHTML(cost){ return Object.entries(cost).map(([id,n])=>`<span class="gemCost ${id}">${gemIcon(id)} ${n}</span>`).join(''); }
function renderGem(){
  const g=state.data;
  app.innerHTML = `${topbar('Gem Clash','Juego original de gemas y contratos')}<main class="screen"><section class="table"><div class="scoreRow">${g.players.map((p,i)=>`<div class="scoreCard ${i===g.turn&&!g.done?'active':''}"><b>${escapeHtml(p.name)}</b><span>${p.points} pts</span><small>${GEM_TYPES.map(x=>`${x.icon}${p.gems[x.id]}`).join(' ')}</small></div>`).join('')}</div><div class="gemBoard">${g.board.map((id,i)=>`<button class="gem ${id} ${g.selected.includes(i)?'selected':''}" onclick="gemSelect(${i})">${gemIcon(id)}</button>`).join('')}</div><div class="contracts">${g.contracts.map((c,i)=>`<button class="contract" onclick="gemBuy(${i})"><b>Contrato</b><span>${c.points} pts</span><small>${costHTML(c.cost)}</small></button>`).join('')}</div></section>${renderLog(g.log)}</main><div class="actionDock">${g.done?`<button class="btn primary" onclick="startGem()">Nueva ronda</button><button class="btn ghost" onclick="navHome()">Salir</button>`:`<button class="btn primary" onclick="gemTake()">Tomar gemas</button><button class="btn ghost" onclick="startGem()">Reiniciar</button>`}</div>`;
}

render();
