(function(){
  let audioCtx = null;
  let lastTap = 0;
  const PROFILE_KEYS = ['mesacards_profile_v7','mesacards_profile_v6','mesacards_profile_v5'];
  const GAME_META = {
    bj:{accent:'blue', icon:'🂡', title:'21 Flash', desc:'Rondas rápidas contra la banca virtual.'},
    holdem:{accent:'gold', icon:'♠', title:'Hold’em Social', desc:'Cartas comunitarias, lectura y presión.'},
    rummy:{accent:'pink', icon:'🃏', title:'Rummy Parejas', desc:'Roba, combina y toca cuando convenga.'},
    gem:{accent:'cyan', icon:'💎', title:'Gem Clash', desc:'Gemas, contratos y decisiones rápidas.'}
  };

  function getProfile(){
    for(const k of PROFILE_KEYS){
      try { const p = JSON.parse(localStorage.getItem(k)); if(p?.name) return p; } catch {}
    }
    return { name:'Jugador', avatar:'👤', code:'MC-LOCAL' };
  }
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
      const map = { tap:[420,.018,.055,'sine'], card:[620,.025,.08,'triangle'], chip:[320,.035,.13,'square'], win:[740,.04,.2,'triangle'], error:[130,.035,.16,'sawtooth'], open:[520,.026,.12,'sine'] }[type] || [420,.018,.055,'sine'];
      osc.type = map[3]; osc.frequency.setValueAtTime(map[0], now);
      if(type==='win') osc.frequency.exponentialRampToValueAtTime(980, now + map[2]);
      if(type==='card') osc.frequency.exponentialRampToValueAtTime(430, now + map[2]);
      filter.type = 'lowpass'; filter.frequency.value = type==='error' ? 500 : 1800;
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(map[1], now + .012); gain.gain.exponentialRampToValueAtTime(0.0001, now + map[2]);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + map[2] + .02);
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
  function wireInteractions(){
    document.addEventListener('pointerup', e => {
      const target = e.target.closest('button,.gameTile,.card,.gem,.chip,.navItem,.friendBubble');
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
    window.proSound = sound; window.proHaptic = haptic;
    try{ window.beep = () => sound('tap'); window.vibrate = (ms=12) => haptic(ms > 30 ? 'chip' : 'tap'); window.feedback = (text) => { sound('chip'); haptic('chip'); toast(text); }; } catch {}
  }
  function cleanOldHomeExtras(){
    document.querySelectorAll('.premiumStatus.home,.setupOverlay,#openSetupBtn').forEach(el => el.remove());
  }
  function gameIdFromTile(tile){
    const onclick = tile.getAttribute('onclick') || '';
    const m = onclick.match(/startGame\('([^']+)'\)/);
    return m?.[1] || 'bj';
  }
  function enhanceHome(){
    const hero = document.querySelector('.hero');
    const grid = document.querySelector('#games');
    if(!hero || !grid || hero.dataset.pro === '1') return;
    const p = getProfile();
    hero.dataset.pro = '1';
    hero.classList.add('proHero');
    hero.innerHTML = `<div class="homeTop"><div class="brandBlock"><div class="brandMark">♣</div><strong>Mesa<span>Cards</span></strong></div><button class="profileChip" onclick="openPlayFlow?.()"><span>${p.avatar || '👤'}</span><b>${p.name || 'Jugador'}</b><small>●</small></button></div><div class="heroCopy"><div class="onlinePill"><span></span> Cada quien en su celular</div><h1>Juega cartas<br>con tus <em>amigos</em></h1><p>Partidas sociales con fichas virtuales, salas privadas y modo local. Cero dinero real.</p></div><div class="heroVisual"><div class="megaChip">♣</div><div class="chipStack"><i></i><i></i><i></i></div></div><div class="heroActions proActions"><button class="btn primary" onclick="quickStart()"><span>▶</span> Jugar ahora</button><button class="btn ghost gold" onclick="openMesaSocial?.()">Invitar amigos</button></div><div class="modeTabs"><button class="active" onclick="openMesaSocial?.()">🌐 Online</button><button onclick="scrollToGames()">📱 Local</button><button onclick="openMesaSocial?.()">♣ Salas</button></div>`;
    grid.classList.add('proGames');
    grid.querySelectorAll('.gameTile').forEach(tile => {
      const id = gameIdFromTile(tile), meta = GAME_META[id] || GAME_META.bj;
      tile.classList.add('proGameTile', `accent-${meta.accent}`);
      tile.innerHTML = `<span class="gameIcon">${meta.icon}</span><b>${meta.title}</b><small>${meta.desc}</small><i class="gameArrow">›</i>`;
    });
    if(!document.querySelector('.friendsHome')){
      grid.insertAdjacentHTML('afterend', `<section class="friendsHome"><div><h2>Amigos conectados</h2><button onclick="openMesaSocial?.()">Ver todos ›</button></div><div class="friendRow"><button class="friendBubble" onclick="openMesaSocial?.()"><span>👩🏻</span><b>Sofi</b><i></i></button><button class="friendBubble" onclick="openMesaSocial?.()"><span>🧢</span><b>Marco</b><i></i></button><button class="friendBubble" onclick="openMesaSocial?.()"><span>👩🏽</span><b>Vale</b><i></i></button><button class="friendBubble" onclick="openMesaSocial?.()"><span>🧔🏽</span><b>Nico</b><i></i></button><button class="inviteBubble" onclick="openMesaSocial?.()">＋<b>Invitar</b></button></div></section><nav class="bottomNav"><button class="navItem active" onclick="navHome()">⌂<span>Inicio</span></button><button class="navItem" onclick="openMesaSocial?.()">👥<span>Amigos</span></button><button class="navItem" onclick="openMesaSocial?.()">♣<span>Salas</span></button><button class="navItem" onclick="openPlayFlow?.()">👤<span>Perfil</span></button></nav>`);
    }
  }
  function enhanceGame(){
    const table = document.querySelector('.table');
    if(table) table.classList.add('premiumTable');
    document.querySelectorAll('.topbar').forEach(t => t.classList.add('pro'));
  }
  const oldRender = window.render;
  if(typeof oldRender === 'function'){
    window.render = function(){
      const result = oldRender.apply(this, arguments);
      setTimeout(() => { cleanOldHomeExtras(); enhanceHome(); enhanceGame(); }, 40);
      return result;
    };
  }
  window.openMesaSetup = function(){ if(typeof window.openPlayFlow === 'function') window.openPlayFlow(); };
  overrideFeedback(); wireInteractions();
  window.addEventListener('load', () => setTimeout(() => { cleanOldHomeExtras(); enhanceHome(); enhanceGame(); }, 250));
})();
