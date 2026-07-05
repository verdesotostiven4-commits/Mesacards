(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const SETUP_KEY = 'mesacards_setup_done_v1';
  let audioCtx = null;
  let lastTap = 0;
  let appliedNameFix = false;

  function getAudio(){
    if(audioCtx) return audioCtx;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; } catch { return null; }
  }
  function sound(type='tap'){
    try{
      const ctx = getAudio(); if(!ctx) return;
      if(ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const map = {
        tap:[420,.018,.055,'sine'],
        card:[620,.025,.08,'triangle'],
        chip:[320,.035,.13,'square'],
        win:[740,.04,.2,'triangle'],
        error:[130,.035,.16,'sawtooth'],
        open:[520,.026,.12,'sine']
      }[type] || [420,.018,.055,'sine'];
      osc.type = map[3]; osc.frequency.setValueAtTime(map[0], now);
      if(type==='win') osc.frequency.exponentialRampToValueAtTime(980, now + map[2]);
      if(type==='card') osc.frequency.exponentialRampToValueAtTime(430, now + map[2]);
      filter.type = 'lowpass'; filter.frequency.value = type==='error' ? 500 : 1800;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(map[1], now + .012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + map[2]);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + map[2] + .02);
    } catch {}
  }
  function haptic(pattern='tap'){
    if(!navigator.vibrate) return;
    const patterns = { tap:12, card:[8,22,10], chip:[14,30,18], win:[22,40,30,40,24], error:[60] };
    navigator.vibrate(patterns[pattern] || 10);
  }
  function toast(text){
    let el = document.querySelector('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 1900);
  }
  function normalizeStoredNames(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const data = JSON.parse(raw);
      const names = (data.players || []).map(p => p.name).join('|').toLowerCase();
      if(names === 'tú|moni' || names === 'tu|moni'){
        data.players = [{name:'Jugador 1', chips:40},{name:'Jugador 2', chips:40}];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {}
  }
  function fixVisibleNames(){
    if(appliedNameFix) return;
    const box = document.querySelector('#playersText');
    if(!box) return;
    const clean = box.value.trim().toLowerCase();
    if(clean === 'tú\nmoni' || clean === 'tu\nmoni'){
      appliedNameFix = true;
      box.value = 'Jugador 1\nJugador 2';
      if(typeof window.savePlayersFromText === 'function') window.savePlayersFromText();
    }
  }
  function showSetup(force=false){
    if(!force && localStorage.getItem(SETUP_KEY)) return;
    if(document.querySelector('.setupOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'setupOverlay';
    overlay.innerHTML = `<div class="setupSheet"><div class="setupTop"><div class="setupLogo">♣</div><div><h2>Crea tu mesa</h2><p>Personaliza los nombres antes de jugar. Así cualquiera que instale la app empieza limpio y profesional.</p></div></div><div class="premiumStatus"><span>Local</span><span>Sin cuentas</span><span>Puntos virtuales</span></div><div class="setupForm"><label>Jugador 1<input id="setupP1" maxlength="18" placeholder="Ej. Stiven" value="Jugador 1"></label><label>Jugador 2<input id="setupP2" maxlength="18" placeholder="Ej. Invitado" value="Jugador 2"></label></div><div class="setupActions"><button class="btn ghost" id="setupGuest">Omitir</button><button class="btn primary" id="setupSave">Crear mesa</button></div><p class="setupFine">Puedes agregar más personas desde la sección Jugadores. Este modo es pass-and-play: se pasan el celular por turnos.</p></div>`;
    document.body.appendChild(overlay);
    sound('open'); haptic('card');
    overlay.querySelector('#setupGuest').onclick = () => { localStorage.setItem(SETUP_KEY,'1'); overlay.remove(); sound('tap'); haptic('tap'); };
    overlay.querySelector('#setupSave').onclick = () => {
      const p1 = overlay.querySelector('#setupP1').value.trim() || 'Jugador 1';
      const p2 = overlay.querySelector('#setupP2').value.trim() || 'Jugador 2';
      const box = document.querySelector('#playersText');
      if(box){ box.value = `${p1}\n${p2}`; if(typeof window.savePlayersFromText === 'function') window.savePlayersFromText(); }
      localStorage.setItem(SETUP_KEY,'1'); overlay.remove(); sound('chip'); haptic('chip'); toast('Mesa creada');
    };
  }
  function enhanceHome(){
    const hero = document.querySelector('.hero');
    if(hero && !document.querySelector('.premiumStatus.home')){
      const status = document.createElement('div');
      status.className = 'premiumStatus home';
      status.innerHTML = '<span>PWA</span><span>Offline</span><span>Multijugador local</span>';
      hero.appendChild(status);
    }
    const panel = document.querySelector('.panel');
    if(panel && !document.querySelector('#openSetupBtn')){
      panel.querySelector('.heroActions')?.insertAdjacentHTML('beforeend','<button class="btn ghost" id="openSetupBtn" onclick="openMesaSetup()">Crear mesa</button>');
    }
  }
  function wireInteractions(){
    document.addEventListener('pointerup', e => {
      const target = e.target.closest('button,.gameTile,.card,.gem,.chip');
      if(!target) return;
      const now = Date.now(); if(now - lastTap < 35) return; lastTap = now;
      document.body.classList.remove('soundPulse'); void document.body.offsetWidth; document.body.classList.add('soundPulse');
      if(target.classList.contains('gameTile')) { sound('open'); haptic('card'); }
      else if(target.classList.contains('card') || target.classList.contains('handCard')) { sound('card'); haptic('card'); }
      else if(target.classList.contains('gem') || target.classList.contains('chip')) { sound('chip'); haptic('chip'); }
      else { sound('tap'); haptic('tap'); }
    }, true);
  }
  function overrideFeedback(){
    window.proSound = sound;
    window.proHaptic = haptic;
    try{
      window.beep = () => sound('tap');
      window.vibrate = (ms=12) => haptic(ms > 30 ? 'chip' : 'tap');
      window.feedback = (text) => { sound('chip'); haptic('chip'); toast(text); };
    } catch {}
  }
  const oldStartGame = window.startGame;
  if(typeof oldStartGame === 'function'){
    window.startGame = function(mode){ sound('open'); haptic('card'); return oldStartGame.apply(this, arguments); };
  }
  const oldRender = window.render;
  if(typeof oldRender === 'function'){
    window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(afterRender, 30); return result; };
  }
  window.openMesaSetup = () => showSetup(true);
  function afterRender(){ fixVisibleNames(); enhanceHome(); }
  normalizeStoredNames(); overrideFeedback(); wireInteractions();
  window.addEventListener('load', () => {
    setTimeout(() => { afterRender(); showSetup(false); }, 250);
  });
})();
