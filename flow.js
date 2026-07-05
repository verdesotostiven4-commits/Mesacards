(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const INSTALL_KEY = 'mesacards_install_gate_seen_v5';
  const PROFILE_KEY = 'mesacards_profile_v5';
  const MODE_KEY = 'mesacards_play_mode_v5';
  const PLAYERS_KEY = 'mesacards_players_ready_v5';
  const AVATARS = ['🦊','🐺','🐯','🦁','🐼','🐵','🐙','🦅'];
  const GAME_LABELS = {
    bj: '21 Flash',
    holdem: 'Hold’em Social',
    rummy: 'Rummy Parejas',
    gem: 'Gem Clash'
  };

  let deferredInstall = null;
  let pendingGame = null;
  const $ = sel => document.querySelector(sel);

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function sound(type='tap'){ window.proSound?.(type); }
  function haptic(type='tap'){ window.proHaptic?.(type); }
  function toast(text){
    let el = $('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2200);
  }
  function escapeHtml(str=''){
    return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function profile(){
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; }
  }
  function writeAppPlayers(names){
    const players = names.map(name => ({ name, chips: 40 }));
    try{
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, players, screen:'home', game:null, data:null }));
    }catch{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, screen:'home', game:null, data:null }));
    }
  }
  function closeFlow(){ $('.flowOverlay')?.remove(); }
  function shell(content, { close=false } = {}){
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

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
  });

  function showInstallGate(){
    if(isStandalone()) return startAppFlow();
    shell(`<div class="flowHero"><div class="flowLogo">♣</div><div><p class="eyebrow">Instalación</p><h2>Instala MesaCards</h2><p>Para jugar correctamente, instala la app en tu celular y ábrela desde el ícono de MesaCards.</p></div></div><div class="flowPreview"><span>📱 Pantalla completa</span><span>🔊 Sonido + vibración</span><span>🎮 Experiencia completa</span></div><div class="flowActions"><button class="btn primary" id="installNow" type="button">Instalar MesaCards</button></div><p class="flowFine">Después de instalar, no continúes desde Chrome. Sal del navegador y abre MesaCards desde la pantalla principal.</p>`, { close:false });
    $('#installNow').onclick = async () => {
      sound('chip'); haptic('chip');
      localStorage.setItem(INSTALL_KEY,'1');
      if(deferredInstall){
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch {}
        deferredInstall = null;
      } else if(typeof window.installApp === 'function') {
        window.installApp();
      }
      showInstallComplete();
    };
  }

  function showInstallComplete(){
    shell(`<div class="flowHero"><div class="flowLogo">✅</div><div><p class="eyebrow">Instalación lista</p><h2>Abre MesaCards desde el ícono</h2><p>Busca MesaCards en tu pantalla principal o cajón de apps. Desde Chrome no se continúa la configuración.</p></div></div><div class="flowPreview"><span>1. Sal de Chrome</span><span>2. Busca el ícono</span><span>3. Abre la app</span></div><div class="miniSteps"><span><i>✓</i> La app instalada se abrirá en pantalla completa.</span><span><i>✓</i> Ahí crearás tu perfil y entrarás al inicio.</span><span><i>✓</i> Luego eliges juego y modo de partida.</span></div><p class="flowFine">Esta pantalla no tiene botón para avanzar porque la configuración debe continuar dentro de la app instalada.</p>`, { close:false });
  }

  function startAppFlow(){
    if(!profile()) return showProfileSetup();
    closeFlow();
    ensureHomeAfterProfile();
  }

  function avatarPicker(selected='🦊'){
    return `<div class="profileMiniGrid" id="avatarGrid">${AVATARS.map((a,i)=>`<button type="button" class="${a===selected || (!selected && i===0)?'active':''}" data-avatar="${a}">${a}</button>`).join('')}</div>`;
  }

  function showProfileSetup(){
    const current = profile();
    const editing = !!current;
    shell(`<div class="flowHero"><div class="flowLogo">👤</div><div><p class="eyebrow">${editing?'Perfil':'Primer inicio'}</p><h2>${editing?'Editar perfil':'Crea tu perfil'}</h2><p>${editing?'Actualiza tu nombre o personaje.':'Elige tu nombre y personaje. Después entrarás directo al inicio de MesaCards.'}</p></div></div><div class="setupForm"><label>Nombre de jugador<input id="profileName" maxlength="18" placeholder="Ej. Stiven" autocomplete="off" value="${escapeHtml(current?.name || '')}"></label><label>Personaje${avatarPicker(current?.avatar || '🦊')}</label></div><div class="flowActions">${editing?'<button class="btn ghost" id="cancelProfile" type="button">Cancelar</button>':''}<button class="btn primary" id="saveProfile" type="button">${editing?'Guardar perfil':'Entrar a MesaCards'}</button></div><p class="flowFine">Tu perfil se guarda en este dispositivo. Más adelante podrás buscar amigos, compartir perfil y jugar en salas.</p>`, { close:editing });
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
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar, createdAt: current?.createdAt || Date.now(), updatedAt: Date.now() }));
      if(!editing) {
        writeAppPlayers([name, 'Invitado']);
        localStorage.removeItem(MODE_KEY);
        localStorage.removeItem(PLAYERS_KEY);
      }
      sound('win'); haptic('win');
      closeFlow();
      if(typeof window.render === 'function') window.render();
      toast(editing ? 'Perfil guardado' : 'Perfil creado');
    };
  }

  function ensureHomeAfterProfile(){
    const p = profile();
    if(!p) return;
    try{
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const names = (current.players || []).map(x => x.name).join('|').toLowerCase();
      if(!current.players || names === 'tú|moni' || names === 'tu|moni' || names === 'jugador 1|jugador 2') writeAppPlayers([p.name, 'Invitado']);
    }catch{ writeAppPlayers([p.name, 'Invitado']); }
    if(typeof window.render === 'function') window.render();
  }

  function showModeForGame(gameId){
    pendingGame = gameId;
    const p = profile();
    const title = GAME_LABELS[gameId] || 'MesaCards';
    shell(`<div class="flowHero"><div class="flowLogo">🎮</div><div><p class="eyebrow">${escapeHtml(title)}</p><h2>¿Cómo jugar?</h2><p>${p?.avatar || '👤'} ${escapeHtml(p?.name || 'Jugador')}, elige el tipo de partida para este juego.</p></div></div><div class="modeGrid"><button class="modeCard ready" id="modeLocal" type="button"><div class="modeIcon">📱</div><div class="modeText"><b>Mismo celular</b><p>Para jugar ahora con personas que estén contigo, pasando el celular por turnos.</p></div><span class="modeBadge">Listo</span></button><button class="modeCard locked" id="modeOnline" type="button"><div class="modeIcon">🌐</div><div class="modeText"><b>Sala con código</b><p>Para invitar jugadores y que cada uno entre desde su celular.</p></div><span class="modeBadge soon">Pronto</span></button><button class="modeCard locked" id="modeNearby" type="button"><div class="modeIcon">📡</div><div class="modeText"><b>Modo cercano</b><p>Para jugar cerca sin compartir el celular cuando esté disponible.</p></div><span class="modeBadge soon">Extra</span></button></div><div class="flowActions"><button class="btn ghost" id="modeBack" type="button">Volver al inicio</button></div>`, { close:true });
    $('#modeLocal').onclick = () => showPlayerSetup('local');
    $('#modeOnline').onclick = () => showComingSoon('🌐','Sala con código','Esta opción permitirá crear una mesa privada y compartir una invitación. Todavía no está activa para partidas reales.');
    $('#modeNearby').onclick = () => showComingSoon('📡','Modo cercano','Esta opción se está preparando como función extra. Por ahora usa el modo mismo celular.');
    $('#modeBack').onclick = () => closeFlow();
  }

  function showComingSoon(icon, title, text){
    shell(`<div class="flowHero"><div class="flowLogo">${icon}</div><div><p class="eyebrow">Próximamente</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div></div><div class="miniSteps"><span><i>✓</i> Puedes volver y jugar ahora en modo mismo celular.</span><span><i>✓</i> Tu perfil se mantiene guardado.</span><span><i>✓</i> Esta opción se activará cuando esté completa.</span></div><div class="flowActions"><button class="btn primary" id="soonLocal" type="button">Usar mismo celular</button><button class="btn ghost" id="soonBack" type="button">Volver</button></div>`, { close:true });
    $('#soonLocal').onclick = () => showPlayerSetup('local');
    $('#soonBack').onclick = () => showModeForGame(pendingGame || 'bj');
  }

  function showPlayerSetup(mode='local'){
    const p = profile();
    const title = GAME_LABELS[pendingGame] || 'MesaCards';
    shell(`<div class="flowHero"><div class="flowLogo">👥</div><div><p class="eyebrow">${escapeHtml(title)}</p><h2>Jugadores</h2><p>Escribe los nombres para esta partida.</p></div></div><div class="flowPreview"><span>Mismo celular</span><span>2 a 8 jugadores</span><span>Puntos virtuales</span></div><div class="setupForm"><label>Jugador 1<input id="flowP1" maxlength="18" placeholder="${escapeHtml(p?.name || 'Tu nombre')}" autocomplete="off"></label><label>Jugador 2<input id="flowP2" maxlength="18" placeholder="Nombre del otro jugador" autocomplete="off"></label></div><div class="flowActions"><button class="btn ghost" id="playersBack" type="button">Volver</button><button class="btn primary" id="playersSave" type="button">Empezar</button></div><p class="flowFine">Puedes agregar más nombres luego desde la sección Jugadores del inicio.</p>`, { close:true });
    $('#playersBack').onclick = () => showModeForGame(pendingGame || 'bj');
    $('#playersSave').onclick = () => {
      const p1 = $('#flowP1').value.trim() || p?.name || '';
      const p2 = $('#flowP2').value.trim();
      const names = [p1, p2].filter(Boolean);
      if(names.length < 2) return toast('Agrega al menos 2 jugadores');
      if(new Set(names.map(n => n.toLowerCase())).size !== names.length) return toast('Los nombres no pueden repetirse');
      writeAppPlayers(names);
      localStorage.setItem(MODE_KEY, mode);
      localStorage.setItem(PLAYERS_KEY,'1');
      closeFlow();
      toast('Mesa lista');
      sound('win'); haptic('win');
      const original = window.__mesaOriginalStartGame || window.startGame;
      original(pendingGame || 'bj');
    };
  }

  function enhanceHomeButtons(){
    const panel = $('.panel');
    if(panel && !$('#flowModeBtn')) panel.querySelector('.heroActions')?.insertAdjacentHTML('beforeend','<button class="btn ghost" id="flowModeBtn" onclick="openPlayFlow()">Perfil</button>');
    const hero = $('.hero');
    if(hero && !$('.flowHint')) hero.insertAdjacentHTML('beforeend','<p class="flowHint">Elige un juego y luego selecciona cómo quieres jugar.</p>');
  }

  function hookStartGame(){
    if(window.__mesaFlowHooked || typeof window.startGame !== 'function') return;
    window.__mesaOriginalStartGame = window.startGame;
    window.startGame = function(id){
      if(!isStandalone()) return showInstallGate();
      if(!profile()) return showProfileSetup();
      showModeForGame(id);
    };
    window.__mesaFlowHooked = true;
  }

  window.openPlayFlow = () => isStandalone() ? showProfileSetup() : showInstallGate();
  const oldRender = window.render;
  if(typeof oldRender === 'function') window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(() => { enhanceHomeButtons(); hookStartGame(); }, 60); return result; };
  window.addEventListener('load', () => setTimeout(() => {
    hookStartGame();
    enhanceHomeButtons();
    if(isStandalone()) startAppFlow(); else showInstallGate();
  }, 500));
})();
