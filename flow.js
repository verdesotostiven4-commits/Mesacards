(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const PROFILE_KEY = 'mesacards_profile_v6';
  const MODE_KEY = 'mesacards_play_mode_v6';
  const PLAYERS_KEY = 'mesacards_players_ready_v6';
  const AVATARS = ['🦊','🐺','🐯','🦁','🐼','🐵','🐙','🦅'];
  const GAME_LABELS = { bj:'21 Flash', holdem:'Hold’em Social', rummy:'Rummy Parejas', gem:'Gem Clash' };

  let deferredInstall = null;
  let pendingGame = null;
  const $ = sel => document.querySelector(sel);

  function isStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function sound(type='tap'){ window.proSound?.(type); }
  function haptic(type='tap'){ window.proHaptic?.(type); }
  function toast(text){
    let el = $('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2200);
  }
  function escapeHtml(str=''){ return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function profile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; } }
  function generateCode(){ return 'MC-' + Math.random().toString(36).slice(2,8).toUpperCase(); }

  function installCleanupStyles(){
    if(document.querySelector('#mesaCleanStyles')) return;
    const style = document.createElement('style');
    style.id = 'mesaCleanStyles';
    style.textContent = `.panel:has(#playersText),.infoCard,.socialFab,#openSetupBtn{display:none!important}.hero .heroActions #flowModeBtn{display:inline-flex!important}.gameTile{cursor:pointer}.flowHint{margin-top:18px!important}`;
    document.head.appendChild(style);
  }
  function cleanupHome(){
    installCleanupStyles();
    document.querySelectorAll('.panel').forEach(p => { if(p.querySelector('#playersText')) p.style.display='none'; });
    document.querySelectorAll('.infoCard,.socialFab,#openSetupBtn').forEach(el => el.remove());
    const heroActions = document.querySelector('.hero .heroActions');
    if(heroActions && !document.querySelector('#flowModeBtn')) heroActions.insertAdjacentHTML('beforeend','<button class="btn ghost" id="flowModeBtn" onclick="openPlayFlow()">Perfil</button>');
    const hero = document.querySelector('.hero');
    if(hero && !document.querySelector('.flowHint')) hero.insertAdjacentHTML('beforeend','<p class="flowHint">Elige un juego para iniciar una partida.</p>');
  }

  function syncPlayersToGame(names){
    const unique = [];
    names.map(n => n.trim()).filter(Boolean).forEach(name => { if(!unique.some(x => x.toLowerCase() === name.toLowerCase())) unique.push(name); });
    const clean = unique.slice(0,8);
    if(clean.length < 2) return false;
    const players = clean.map(name => ({ name, chips:40 }));
    try{
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, players, screen:'home', game:null, data:null }));
    }catch{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, screen:'home', game:null, data:null })); }
    const box = document.querySelector('#playersText');
    if(box && typeof window.savePlayersFromText === 'function'){
      box.value = clean.join('\n');
      window.savePlayersFromText();
    }
    return true;
  }

  function closeFlow(){ document.querySelector('.flowOverlay')?.remove(); }
  function shell(content, { close=true } = {}){
    closeFlow();
    const overlay = document.createElement('div');
    overlay.className = 'flowOverlay';
    overlay.innerHTML = `<div class="flowSheetWrap">${close?'<button class="flowClose" data-close-flow="1" type="button">×</button>':''}<div class="flowSheet">${content}</div></div>`;
    overlay.addEventListener('click', e => {
      if(e.target.closest('[data-close-flow]')){ closeFlow(); sound('tap'); haptic('tap'); }
    });
    document.body.appendChild(overlay);
    sound('open'); haptic('card');
  }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

  function showInstallGate(){
    if(isStandalone()) return startAppFlow();
    shell(`<div class="flowHero"><div class="flowLogo">♣</div><div><p class="eyebrow">Instalación</p><h2>Instala MesaCards</h2><p>Instala la app y luego ábrela desde el ícono para jugar en pantalla completa.</p></div></div><div class="flowPreview"><span>📱 Pantalla completa</span><span>🔊 Sonido + vibración</span><span>🎮 Mejor experiencia</span></div><div class="flowActions"><button class="btn primary" id="installNow" type="button">Instalar MesaCards</button></div><p class="flowFine">Después de instalar, sal de Chrome y abre MesaCards desde tu pantalla principal.</p>`, { close:false });
    $('#installNow').onclick = async () => {
      sound('chip'); haptic('chip');
      if(deferredInstall){ deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch {} deferredInstall = null; }
      else if(typeof window.installApp === 'function') window.installApp();
      showInstallComplete();
    };
  }
  function showInstallComplete(){
    shell(`<div class="flowHero"><div class="flowLogo">✅</div><div><p class="eyebrow">Instalación lista</p><h2>Abre MesaCards desde el ícono</h2><p>Desde Chrome no se continúa. Busca el ícono de MesaCards y abre la app instalada.</p></div></div><div class="flowPreview"><span>1. Sal de Chrome</span><span>2. Busca el ícono</span><span>3. Abre la app</span></div><p class="flowFine">Ahí crearás tu perfil y entrarás al inicio.</p>`, { close:false });
  }

  function startAppFlow(){
    cleanupHome();
    if(!profile()) return showProfileSetup(false);
    closeFlow();
  }

  function avatarPicker(selected='🦊'){
    return `<div class="profileMiniGrid" id="avatarGrid">${AVATARS.map((a,i)=>`<button type="button" class="${a===selected || (!selected && i===0)?'active':''}" data-avatar="${a}">${a}</button>`).join('')}</div>`;
  }
  function showProfileSetup(editing=true){
    const current = profile();
    const isEdit = editing && !!current;
    shell(`<div class="flowHero"><div class="flowLogo">${escapeHtml(current?.avatar || '👤')}</div><div><p class="eyebrow">${isEdit?'Perfil':'Primer inicio'}</p><h2>${isEdit?'Editar perfil':'Crea tu perfil'}</h2><p>${isEdit?'Cambia tu nombre o personaje.':'Elige tu nombre y personaje para entrar a MesaCards.'}</p></div></div><div class="setupForm"><label>Nombre de jugador<input id="profileName" maxlength="18" placeholder="Ej. Stiven" autocomplete="off" value="${escapeHtml(current?.name || '')}"></label><label>Personaje${avatarPicker(current?.avatar || '🦊')}</label></div><div class="flowActions">${isEdit?'<button class="btn ghost" id="cancelProfile" type="button">Cancelar</button>':''}<button class="btn primary" id="saveProfile" type="button">${isEdit?'Guardar perfil':'Entrar'}</button></div><p class="flowFine">Tu perfil queda guardado en este dispositivo.</p>`, { close:isEdit });
    $('#avatarGrid').onclick = e => {
      const btn = e.target.closest('[data-avatar]'); if(!btn) return;
      $('#avatarGrid').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); sound('chip'); haptic('tap');
    };
    $('#cancelProfile')?.addEventListener('click', closeFlow);
    $('#saveProfile').onclick = () => {
      const name = $('#profileName').value.trim();
      const avatar = $('#avatarGrid .active')?.dataset.avatar || '🦊';
      if(name.length < 3) return toast('Escribe un nombre de al menos 3 letras');
      const code = current?.code || generateCode();
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar, code, createdAt: current?.createdAt || Date.now(), updatedAt: Date.now() }));
      syncPlayersToGame([name, 'Invitado']);
      closeFlow();
      cleanupHome();
      toast(isEdit ? 'Perfil guardado' : 'Perfil creado');
    };
  }

  function showModeForGame(gameId){
    pendingGame = gameId;
    const p = profile();
    const title = GAME_LABELS[gameId] || 'MesaCards';
    shell(`<div class="flowHero"><div class="flowLogo">🎮</div><div><p class="eyebrow">${escapeHtml(title)}</p><h2>Iniciar partida</h2><p>${p?.avatar || '👤'} ${escapeHtml(p?.name || 'Jugador')}, elige cómo jugar ahora.</p></div></div><div class="modeGrid"><button class="modeCard ready" id="modeLocal" type="button"><div class="modeIcon">📱</div><div class="modeText"><b>Jugar en este celular</b><p>Ideal para jugar juntos pasando el celular por turnos.</p></div><span class="modeBadge">Disponible</span></button></div><div class="flowActions"><button class="btn ghost" id="modeBack" type="button">Volver</button></div>`, { close:true });
    $('#modeLocal').onclick = () => showPlayerSetup();
    $('#modeBack').onclick = closeFlow;
  }

  function showPlayerSetup(){
    const p = profile();
    const title = GAME_LABELS[pendingGame] || 'MesaCards';
    shell(`<div class="flowHero"><div class="flowLogo">👥</div><div><p class="eyebrow">${escapeHtml(title)}</p><h2>Jugadores</h2><p>Agrega al menos dos nombres para empezar.</p></div></div><div class="setupForm"><label>Jugador 1<input id="flowP1" maxlength="18" placeholder="${escapeHtml(p?.name || 'Tu nombre')}" autocomplete="off"></label><label>Jugador 2<input id="flowP2" maxlength="18" placeholder="Nombre del otro jugador" autocomplete="off"></label></div><div class="flowActions"><button class="btn ghost" id="playersBack" type="button">Volver</button><button class="btn primary" id="playersSave" type="button">Empezar</button></div>`, { close:true });
    $('#playersBack').onclick = () => showModeForGame(pendingGame || 'bj');
    $('#playersSave').onclick = () => {
      const names = [$('#flowP1').value.trim() || p?.name || '', $('#flowP2').value.trim()].filter(Boolean);
      if(names.length < 2) return toast('Agrega al menos 2 jugadores');
      if(new Set(names.map(n => n.toLowerCase())).size !== names.length) return toast('Los nombres no pueden repetirse');
      if(!syncPlayersToGame(names)) return toast('Revisa los nombres');
      localStorage.setItem(MODE_KEY, 'local');
      localStorage.setItem(PLAYERS_KEY,'1');
      closeFlow();
      const original = window.__mesaOriginalStartGame || window.startGame;
      original(pendingGame || 'bj');
    };
  }

  function hookStartGame(){
    if(window.__mesaFlowHooked || typeof window.startGame !== 'function') return;
    window.__mesaOriginalStartGame = window.startGame;
    window.startGame = function(id){
      if(!isStandalone()) return showInstallGate();
      if(!profile()) return showProfileSetup(false);
      return showModeForGame(id);
    };
    window.__mesaFlowHooked = true;
  }

  window.openPlayFlow = () => isStandalone() ? showProfileSetup(true) : showInstallGate();
  const oldRender = window.render;
  if(typeof oldRender === 'function') window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(() => { cleanupHome(); hookStartGame(); }, 30); return result; };
  window.addEventListener('load', () => setTimeout(() => { installCleanupStyles(); hookStartGame(); cleanupHome(); if(isStandalone()) startAppFlow(); else showInstallGate(); }, 450));
})();
