(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const INSTALL_KEY = 'mesacards_install_gate_seen_v4';
  const PROFILE_KEY = 'mesacards_profile_v4';
  const MODE_KEY = 'mesacards_play_mode_v4';
  const PLAYERS_KEY = 'mesacards_players_ready_v4';
  const AVATARS = ['🦊','🐺','🐯','🦁','🐼','🐵','🐙','🦅'];

  let deferredInstall = null;
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
    shell(`<div class="flowHero"><div class="flowLogo">♣</div><div><p class="eyebrow">Paso 1 · instalación</p><h2>Instala MesaCards</h2><p>Para jugar correctamente, instala la app en tu celular y ábrela desde el ícono de MesaCards.</p></div></div><div class="flowPreview"><span>📱 Pantalla completa</span><span>🔊 Sonido + vibración</span><span>🎮 Experiencia completa</span></div><div class="flowActions"><button class="btn primary" id="installNow" type="button">Instalar MesaCards</button></div><p class="flowFine">Después de instalar, no continúes desde Chrome. Sal del navegador y abre MesaCards desde la pantalla principal.</p>`, { close:false });
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
    shell(`<div class="flowHero"><div class="flowLogo">✅</div><div><p class="eyebrow">Instalación lista</p><h2>Abre MesaCards desde el ícono</h2><p>Busca MesaCards en tu pantalla principal o cajón de apps. Desde Chrome no se puede continuar la configuración.</p></div></div><div class="flowPreview"><span>1. Sal de Chrome</span><span>2. Busca el ícono</span><span>3. Abre la app</span></div><div class="miniSteps"><span><i>✓</i> La app instalada se abrirá en pantalla completa.</span><span><i>✓</i> Ahí crearás tu perfil y elegirás cómo jugar.</span><span><i>✓</i> Si no ves el ícono, usa el menú ⋮ y toca “Agregar a pantalla principal”.</span></div><p class="flowFine">Esta pantalla no tiene botón para avanzar porque la configuración debe continuar dentro de la app instalada.</p>`, { close:false });
  }

  function startAppFlow(){
    if(!profile()) return showProfileSetup();
    if(!localStorage.getItem(MODE_KEY)) return showPlayMode();
    if(!localStorage.getItem(PLAYERS_KEY)) return showPlayerSetup(localStorage.getItem(MODE_KEY));
  }

  function avatarPicker(){
    return `<div class="profileMiniGrid" id="avatarGrid">${AVATARS.map((a,i)=>`<button type="button" class="${i===0?'active':''}" data-avatar="${a}">${a}</button>`).join('')}</div>`;
  }

  function showProfileSetup(){
    shell(`<div class="flowHero"><div class="flowLogo">👤</div><div><p class="eyebrow">Paso 1 · perfil</p><h2>Crea tu perfil</h2><p>Elige cómo aparecerás en MesaCards. Después podrás buscar amigos, compartir tu perfil y jugar en mesas.</p></div></div><div class="setupForm"><label>Nombre de jugador<input id="profileName" maxlength="18" placeholder="Ej. Stiven" autocomplete="off"></label><label>Personaje${avatarPicker()}</label></div><div class="flowActions"><button class="btn primary" id="saveProfile" type="button">Crear perfil</button></div><p class="flowFine">Tu nombre debe tener al menos 3 caracteres. Más adelante podrás personalizar colores, marcos y efectos.</p>`, { close:false });
    $('#avatarGrid').onclick = e => {
      const btn = e.target.closest('[data-avatar]'); if(!btn) return;
      $('#avatarGrid').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); sound('chip'); haptic('tap');
    };
    $('#saveProfile').onclick = () => {
      const name = $('#profileName').value.trim();
      const avatar = $('#avatarGrid .active')?.dataset.avatar || '🦊';
      if(name.length < 3) return toast('Escribe un nombre de al menos 3 letras');
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar, createdAt: Date.now() }));
      sound('win'); haptic('win');
      showPlayMode();
    };
  }

  function showPlayMode(){
    const p = profile();
    shell(`<div class="flowHero"><div class="flowLogo">🎮</div><div><p class="eyebrow">Paso 2 · modo de juego</p><h2>¿Cómo quieren jugar?</h2><p>${p?.avatar || '👤'} ${escapeHtml(p?.name || 'Jugador')}, elige la forma de partida.</p></div></div><div class="modeGrid"><button class="modeCard ready" id="modeLocal" type="button"><div class="modeIcon">📱</div><div class="modeText"><b>Mismo celular</b><p>Para jugar juntos ahora. Ideal si están en el mismo lugar o no quieren usar internet.</p></div><span class="modeBadge">Listo</span></button><button class="modeCard locked" id="modeOnline" type="button"><div class="modeIcon">🌐</div><div class="modeText"><b>Sala con código</b><p>Para que cada jugador entre desde su propio celular con una invitación privada.</p></div><span class="modeBadge soon">Pronto</span></button><button class="modeCard locked" id="modeNearby" type="button"><div class="modeIcon">📡</div><div class="modeText"><b>Modo cercano</b><p>Para jugar cerca sin compartir el celular. Se está preparando como función extra.</p></div><span class="modeBadge soon">Extra</span></button></div><div class="miniSteps"><span><i>1.</i> Para jugar ya, usa “Mismo celular”.</span><span><i>2.</i> Para celulares separados, usa “Sala con código” cuando esté activa.</span><span><i>3.</i> El modo cercano será una opción extra según el celular.</span></div>`, { close:false });
    $('#modeLocal').onclick = () => chooseMode('local');
    $('#modeOnline').onclick = () => showComingSoon('🌐','Sala con código','Muy pronto podrás crear una sala privada, compartir un código y jugar desde celulares separados.');
    $('#modeNearby').onclick = () => showComingSoon('📡','Modo cercano','Esta función está en preparación. Por ahora la experiencia más estable es jugar en el mismo celular.');
  }

  function showComingSoon(icon, title, text){
    shell(`<div class="flowHero"><div class="flowLogo">${icon}</div><div><p class="eyebrow">Próximamente</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div></div><div class="miniSteps"><span><i>✓</i> No perderás tu perfil.</span><span><i>✓</i> Esta opción aparecerá completa cuando esté lista.</span><span><i>✓</i> Puedes jugar ahora con el modo mismo celular.</span></div><div class="flowActions"><button class="btn primary" id="soonLocal" type="button">Jugar en mismo celular</button><button class="btn ghost" id="soonBack" type="button">Volver</button></div>`, { close:true });
    $('#soonLocal').onclick = () => chooseMode('local');
    $('#soonBack').onclick = () => showPlayMode();
  }

  function chooseMode(mode){
    localStorage.setItem(MODE_KEY, mode);
    sound('chip'); haptic('chip');
    showPlayerSetup(mode);
  }

  function showPlayerSetup(mode='local'){
    const p = profile();
    const modeLabel = mode === 'local' ? 'Mismo celular' : 'Sala';
    shell(`<div class="flowHero"><div class="flowLogo">👥</div><div><p class="eyebrow">Paso 3 · jugadores</p><h2>Crea la mesa</h2><p>Escribe los nombres de quienes van a jugar en este celular.</p></div></div><div class="flowPreview"><span>${escapeHtml(modeLabel)}</span><span>2 a 8 jugadores</span><span>Puntos virtuales</span></div><div class="setupForm"><label>Jugador 1<input id="flowP1" maxlength="18" placeholder="${escapeHtml(p?.name || 'Nombre')}" autocomplete="off"></label><label>Jugador 2<input id="flowP2" maxlength="18" placeholder="Nombre del otro jugador" autocomplete="off"></label></div><div class="flowActions"><button class="btn ghost" id="playersBack" type="button">Volver</button><button class="btn primary" id="playersSave" type="button">Empezar</button></div><p class="flowFine">En modo mismo celular, pasen el celular por turnos y cuiden no mirar cartas privadas.</p>`, { close:false });
    $('#playersBack').onclick = () => showPlayMode();
    $('#playersSave').onclick = () => {
      const p1 = $('#flowP1').value.trim() || p?.name || '';
      const p2 = $('#flowP2').value.trim();
      const names = [p1, p2].filter(Boolean);
      if(names.length < 2) return toast('Agrega al menos 2 jugadores');
      if(new Set(names.map(n => n.toLowerCase())).size !== names.length) return toast('Los nombres no pueden repetirse');
      savePlayers(names);
      localStorage.setItem(PLAYERS_KEY,'1');
      closeFlow();
      toast('Mesa lista');
      sound('win'); haptic('win');
    };
  }

  function savePlayers(names){
    const players = names.map((name, i) => ({ name, chips: 40 }));
    try{
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, players, screen:'home', game:null, data:null }));
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, screen:'home', game:null, data:null }));
    }
    const box = $('#playersText');
    if(box){ box.value = names.join('\n'); if(typeof window.savePlayersFromText === 'function') window.savePlayersFromText(); }
    setTimeout(() => window.render?.(), 30);
  }

  function enhanceHomeButtons(){
    const panel = $('.panel');
    if(panel && !$('#flowModeBtn')) panel.querySelector('.heroActions')?.insertAdjacentHTML('beforeend','<button class="btn ghost" id="flowModeBtn" onclick="openPlayFlow()">Perfil / modo</button>');
    const hero = $('.hero');
    if(hero && !$('.flowHint')) hero.insertAdjacentHTML('beforeend','<p class="flowHint">Instala la app para continuar con la experiencia completa.</p>');
  }

  window.openPlayFlow = () => isStandalone() ? startAppFlow() : showInstallGate();
  const oldRender = window.render;
  if(typeof oldRender === 'function') window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(enhanceHomeButtons, 60); return result; };
  window.addEventListener('load', () => setTimeout(() => { enhanceHomeButtons(); isStandalone() ? startAppFlow() : showInstallGate(); }, 500));
})();
