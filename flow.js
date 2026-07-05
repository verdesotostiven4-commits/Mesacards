(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const INSTALL_KEY = 'mesacards_install_gate_seen_v2';
  const FLOW_KEY = 'mesacards_flow_done_v2';
  const MODE_KEY = 'mesacards_play_mode_v2';
  const PLAYERS_KEY = 'mesacards_players_ready_v2';

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
  function closeFlow(){ $('.flowOverlay')?.remove(); }
  function shell(content, close=true){
    closeFlow();
    const overlay = document.createElement('div');
    overlay.className = 'flowOverlay';
    overlay.innerHTML = `<div class="flowSheetWrap">${close?'<button class="flowClose" id="flowClose">×</button>':''}<div class="flowSheet">${content}</div></div>`;
    document.body.appendChild(overlay);
    $('#flowClose')?.addEventListener('click', () => { localStorage.setItem(FLOW_KEY,'1'); closeFlow(); sound('tap'); haptic('tap'); });
    sound('open'); haptic('card');
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
  });

  function showInstallGate(force=false){
    if(!force && (isStandalone() || localStorage.getItem(INSTALL_KEY))) return showPlayMode(false);
    shell(`<div class="flowHero"><div class="flowLogo">♣</div><div><p class="eyebrow">Paso 1 · mejor experiencia</p><h2>Instala MesaCards</h2><p>Abre la app como PWA para jugar en pantalla completa, con sonidos, vibración, mejor rendimiento y modo local offline.</p></div></div><div class="flowPreview"><span>📱 Pantalla completa</span><span>🔊 Sonido + vibración</span><span>📴 Modo local offline</span></div><div class="flowActions"><button class="btn primary" id="installNow">Instalar ahora</button><button class="btn ghost" id="installSkip">Seguir sin instalar</button></div><p class="flowFine">En Android/Chrome también puedes tocar ⋮ y elegir “Agregar a pantalla principal”. En iPhone: compartir → “Agregar a pantalla de inicio”.</p>`, false);
    $('#installNow').onclick = async () => {
      sound('chip'); haptic('chip');
      localStorage.setItem(INSTALL_KEY,'1');
      if(deferredInstall){
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch {}
        deferredInstall = null;
      } else if(typeof window.installApp === 'function') {
        window.installApp();
      } else {
        toast('Usa el menú del navegador para agregar a pantalla principal');
      }
      setTimeout(() => showPlayMode(true), 450);
    };
    $('#installSkip').onclick = () => { localStorage.setItem(INSTALL_KEY,'1'); sound('tap'); haptic('tap'); showPlayMode(true); };
  }

  function showPlayMode(force=false){
    if(!force && localStorage.getItem(MODE_KEY) && localStorage.getItem(PLAYERS_KEY)) return;
    shell(`<div class="flowHero"><div class="flowLogo">🎮</div><div><p class="eyebrow">Paso 2 · cómo quieren jugar</p><h2>Elige la conexión</h2><p>Elige el modo según si están juntos, con internet o quieren jugar desde celulares separados.</p></div></div><div class="modeGrid"><button class="modeCard ready" id="modeLocal"><div class="modeIcon">📱</div><div class="modeText"><b>Mismo celular</b><p>Funciona ya. Ideal para pareja o amigos juntos. Se pasan el celular por turnos y también sirve sin internet.</p></div><span class="modeBadge">Listo</span></button><button class="modeCard locked" id="modeOnline"><div class="modeIcon">🌐</div><div class="modeText"><b>En línea con código</b><p>Cada persona entra desde su celular. Necesita servidor realtime; queda preparado como siguiente fase.</p></div><span class="modeBadge soon">Próximo</span></button><button class="modeCard locked" id="modeNearby"><div class="modeIcon">📡</div><div class="modeText"><b>Cercanos / Bluetooth</b><p>Experimental. Android puede permitirlo en algunos navegadores; iPhone limita mucho este tipo de conexión.</p></div><span class="modeBadge soon">Experimental</span></button></div><div class="miniSteps"><span><i>1.</i> Para jugar ahora, usa “Mismo celular”.</span><span><i>2.</i> Para celulares separados, la próxima fase será Supabase/Firebase con salas privadas.</span><span><i>3.</i> Bluetooth queda como alternativa experimental, no como modo principal.</span></div>`, false);
    $('#modeLocal').onclick = () => chooseMode('local');
    $('#modeOnline').onclick = () => showOnlineInfo();
    $('#modeNearby').onclick = () => showNearbyInfo();
  }

  function chooseMode(mode){
    localStorage.setItem(MODE_KEY, mode);
    sound('chip'); haptic('chip');
    showPlayerSetup(mode);
  }

  function showOnlineInfo(){
    const code = Math.random().toString(36).slice(2,6).toUpperCase();
    shell(`<div class="flowHero"><div class="flowLogo">🌐</div><div><p class="eyebrow">Modo online</p><h2>Salas con código</h2><p>Así funcionará cuando conectemos una base realtime: una persona crea sala, la otra entra con el código y cada celular tendrá su propia mano.</p></div></div><div class="roomBox"><p class="flowFine">Vista de ejemplo del flujo online:</p><div class="roomCode">${code}</div><input value="${code}" readonly></div><div class="miniSteps"><span><i>1.</i> Crear sala privada.</span><span><i>2.</i> Compartir código por WhatsApp.</span><span><i>3.</i> Sincronizar cartas, turnos, mesa y fichas en tiempo real.</span></div><div class="flowActions"><button class="btn primary" id="useLocalFromOnline">Jugar ahora en mismo celular</button><button class="btn ghost" id="backModes">Volver</button></div><p class="flowFine">Para que esto sea real entre dos celulares necesitamos conectar Supabase Realtime o Firebase. Ya queda planteado profesionalmente para esa fase.</p>`, true);
    $('#useLocalFromOnline').onclick = () => chooseMode('local');
    $('#backModes').onclick = () => showPlayMode(true);
  }

  function showNearbyInfo(){
    shell(`<div class="flowHero"><div class="flowLogo">📡</div><div><p class="eyebrow">Modo cercano</p><h2>Bluetooth / cercanos</h2><p>Este modo suena genial, pero en PWA no es igual en todos los celulares. Android/Chrome tiene más posibilidades; iPhone suele bloquearlo o limitarlo.</p></div></div><div class="connectionStrip"><button class="active">Android</button><button>iPhone limitado</button><button>Experimental</button></div><div class="miniSteps"><span><i>✓</i> Lo profesional es priorizar el modo online con código.</span><span><i>✓</i> Bluetooth se puede investigar después como extra, no como base principal.</span><span><i>✓</i> El modo mismo celular queda como solución inmediata sin internet.</span></div><div class="flowActions"><button class="btn primary" id="useLocalFromNearby">Jugar ahora en mismo celular</button><button class="btn ghost" id="backModesNearby">Volver</button></div>`, true);
    $('#useLocalFromNearby').onclick = () => chooseMode('local');
    $('#backModesNearby').onclick = () => showPlayMode(true);
  }

  function showPlayerSetup(mode='local'){
    const modeLabel = mode === 'local' ? 'Mismo celular' : mode === 'online' ? 'En línea' : 'Cercanos';
    shell(`<div class="flowHero"><div class="flowLogo">👥</div><div><p class="eyebrow">Paso 3 · mesa</p><h2>Crea la mesa</h2><p>Agrega los nombres. Después puedes sumar más jugadores desde la sección Jugadores.</p></div></div><div class="flowPreview"><span>${escapeHtml(modeLabel)}</span><span>2 a 8 jugadores</span><span>Puntos virtuales</span></div><div class="setupForm"><label>Jugador 1<input id="flowP1" maxlength="18" placeholder="Nombre" value="Jugador 1"></label><label>Jugador 2<input id="flowP2" maxlength="18" placeholder="Nombre" value="Jugador 2"></label></div><div class="flowActions"><button class="btn ghost" id="playersBack">Volver</button><button class="btn primary" id="playersSave">Empezar</button></div><p class="flowFine">En modo mismo celular, cuando toque cada turno, pasen el celular y eviten ver las cartas del otro.</p>`, false);
    $('#playersBack').onclick = () => showPlayMode(true);
    $('#playersSave').onclick = () => {
      const p1 = $('#flowP1').value.trim() || 'Jugador 1';
      const p2 = $('#flowP2').value.trim() || 'Jugador 2';
      savePlayers([p1,p2]);
      localStorage.setItem(PLAYERS_KEY,'1');
      localStorage.setItem(FLOW_KEY,'1');
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
    if(panel && !$('#flowModeBtn')){
      panel.querySelector('.heroActions')?.insertAdjacentHTML('beforeend','<button class="btn ghost" id="flowModeBtn" onclick="openPlayFlow()">Modo de juego</button>');
    }
    const hero = $('.hero');
    if(hero && !$('.flowHint')){
      hero.insertAdjacentHTML('beforeend','<p class="flowHint">Primero instala la app si quieres pantalla completa. Luego elige si jugarán en un celular o, más adelante, con sala online.</p>');
    }
  }

  function shouldStartFlow(){
    if(localStorage.getItem(FLOW_KEY)) return false;
    return true;
  }

  window.openPlayFlow = () => showInstallGate(true);
  const oldRender = window.render;
  if(typeof oldRender === 'function'){
    window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(enhanceHomeButtons, 60); return result; };
  }
  window.addEventListener('load', () => {
    setTimeout(() => {
      enhanceHomeButtons();
      if(shouldStartFlow()) showInstallGate(false);
    }, 500);
  });
})();
