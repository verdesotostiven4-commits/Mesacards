(function(){
  const STORAGE_KEY = 'mesacards_state_v1';
  const PROFILE_KEY = 'mesacards_profile_v7';
  const OLD_PROFILE_KEYS = ['mesacards_profile_v6','mesacards_profile_v5'];
  const AVATARS = [
    {icon:'🧑🏽‍💼',name:'Elite',style:'Clásico'}, {icon:'👩🏻‍💼',name:'Luna',style:'Nocturna'},
    {icon:'🧢',name:'Marco',style:'Urbano'}, {icon:'👩🏽',name:'Vale',style:'Dorada'},
    {icon:'🧔🏽',name:'Nico',style:'VIP'}, {icon:'🦊',name:'Fox',style:'Ágil'},
    {icon:'🐯',name:'Tigre',style:'Fuerte'}, {icon:'🦁',name:'León',style:'Rey'}
  ];
  let deferredInstall = null;
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
  function generateCode(){ return 'MC-' + Math.random().toString(36).slice(2,8).toUpperCase(); }
  function profile(){
    try{
      const current = JSON.parse(localStorage.getItem(PROFILE_KEY));
      if(current?.name) return current;
      for(const key of OLD_PROFILE_KEYS){
        const old = JSON.parse(localStorage.getItem(key));
        if(old?.name){
          const migrated = { name:old.name, avatar:old.avatar || '🧑🏽‍💼', style:old.style || 'Clásico Elite', code:old.code || generateCode(), createdAt:old.createdAt || Date.now(), updatedAt:Date.now() };
          localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    }catch{}
    return null;
  }
  function installStyles(){
    if($('#mesaCleanStyles')) return;
    const style = document.createElement('style');
    style.id = 'mesaCleanStyles';
    style.textContent = `.panel:has(#playersText),.infoCard,.socialFab,#openSetupBtn,.premiumStatus.home{display:none!important}.hero .heroActions #flowModeBtn{display:inline-flex!important}.gameTile{cursor:pointer}.flowHint{display:none!important}`;
    document.head.appendChild(style);
  }
  function cleanupHome(){
    installStyles();
    document.querySelectorAll('.panel').forEach(p => { if(p.querySelector('#playersText')) p.style.display='none'; });
    document.querySelectorAll('.infoCard,.socialFab,#openSetupBtn,.premiumStatus.home,.flowHint').forEach(el => el.remove());
    const heroActions = document.querySelector('.hero .heroActions');
    if(heroActions && !$('#flowModeBtn')) heroActions.insertAdjacentHTML('beforeend','<button class="btn ghost" id="flowModeBtn" onclick="openPlayFlow()">Perfil</button>');
  }
  function syncPlayers(names){
    const clean = [];
    names.map(n => String(n || '').trim()).filter(Boolean).forEach(n => { if(!clean.some(x => x.toLowerCase() === n.toLowerCase())) clean.push(n); });
    while(clean.length < 2) clean.push('Invitado');
    const finalNames = clean.slice(0,8);
    try{
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, players: finalNames.map(name => ({ name, chips:40 })), screen:'home', game:null, data:null }));
    }catch{}
    const box = $('#playersText');
    if(box){ box.value = finalNames.join('\n'); if(typeof window.savePlayersFromText === 'function') window.savePlayersFromText(); }
    return finalNames;
  }
  function ensureProfilePlayers(){
    const p = profile(); if(!p) return;
    let needs = false;
    try{
      const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const names = (old.players || []).map(x => x.name).join('|').toLowerCase();
      needs = !old.players || !old.players.length || names.includes('tú') || names.includes('tu|') || names.includes('moni') || names === 'jugador 1|jugador 2';
    }catch{ needs = true; }
    if(needs) syncPlayers([p.name, 'Invitado']);
  }
  function closeFlow(){ $('.flowOverlay')?.remove(); }
  function shell(content, { close=true } = {}){
    closeFlow();
    const overlay = document.createElement('div'); overlay.className = 'flowOverlay';
    overlay.innerHTML = `<div class="flowSheetWrap">${close?'<button class="flowClose" data-close-flow="1" type="button">×</button>':''}<div class="flowSheet">${content}</div></div>`;
    overlay.addEventListener('click', e => { if(e.target.closest('[data-close-flow]')){ closeFlow(); sound('tap'); haptic('tap'); } });
    document.body.appendChild(overlay); sound('open'); haptic('card');
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  function showInstallGate(){
    shell(`<div class="flowHero"><div class="flowLogo">♣</div><div><p class="eyebrow">Instalación</p><h2>Instala MesaCards</h2><p>Instala la app y luego ábrela desde el ícono para jugar en pantalla completa.</p></div></div><div class="flowPreview"><span>📱 Pantalla completa</span><span>🔊 Sonido + vibración</span><span>🎮 Mejor experiencia</span></div><div class="flowActions"><button class="btn primary" id="installNow" type="button">Instalar MesaCards</button></div><p class="flowFine">Después de instalar, sal de Chrome y abre MesaCards desde tu pantalla principal.</p>`, { close:false });
    $('#installNow').onclick = async () => {
      sound('chip'); haptic('chip');
      if(deferredInstall){ deferredInstall.prompt(); try{ await deferredInstall.userChoice; }catch{} deferredInstall = null; }
      else if(typeof window.installApp === 'function') window.installApp();
      shell(`<div class="flowHero"><div class="flowLogo">✅</div><div><p class="eyebrow">Instalación lista</p><h2>Abre MesaCards desde el ícono</h2><p>Desde Chrome no se continúa. Busca el ícono de MesaCards y abre la app instalada.</p></div></div>`, { close:false });
    };
  }
  function avatarPicker(selected='🧑🏽‍💼'){
    return `<div class="characterPreview"><div class="characterBig" id="characterBig">${escapeHtml(selected)}</div><div><b id="characterName">Personaje</b><small>Identidad visual para tu mesa</small></div></div><div class="personaTabs"><button class="active" type="button">Personajes</button><button type="button">Outfits</button><button type="button">Color</button></div><div class="profileMiniGrid characterGrid" id="avatarGrid">${AVATARS.map(a => `<button type="button" class="${a.icon===selected?'active':''}" data-avatar="${a.icon}" data-style="${escapeHtml(a.style)}" data-name="${escapeHtml(a.name)}"><span>${a.icon}</span><b>${a.name}</b><small>${a.style}</small></button>`).join('')}</div>`;
  }
  function showProfileSetup(editing=true, afterSave=null){
    const current = profile(); const isEdit = editing && !!current;
    shell(`<div class="profileHeader"><div class="flowLogo">♣</div><div><p class="eyebrow">${isEdit?'Perfil':'Primer inicio'}</p><h2>${isEdit?'Personaliza tu personaje':'Crea tu perfil'}</h2><p>Cada jugador usa su propio celular para jugar en salas online o local.</p></div></div><div class="setupForm profileProForm"><label>Nombre de jugador<input id="profileName" maxlength="18" placeholder="Ej. ValentePoker" autocomplete="off" value="${escapeHtml(current?.name || '')}"></label><label>Personaje${avatarPicker(current?.avatar || '🧑🏽‍💼')}</label><div class="safeNote"><span>✓</span><p>Solo fichas virtuales. No hay dinero real involucrado.</p></div></div><div class="flowActions">${isEdit?'<button class="btn ghost" id="cancelProfile" type="button">Cancelar</button>':''}<button class="btn primary" id="saveProfile" type="button">${isEdit?'Guardar personaje':'Continuar'}</button></div><p class="flowFine">Tu perfil se guarda en este dispositivo y se sincroniza con el modo online.</p>`, { close:isEdit });
    const updatePreview = btn => { $('#characterBig').textContent = btn.dataset.avatar; $('#characterName').textContent = `${btn.dataset.name} · ${btn.dataset.style}`; };
    const activeStart = $('#avatarGrid .active') || $('#avatarGrid button'); if(activeStart) updatePreview(activeStart);
    $('#avatarGrid').onclick = e => {
      const btn = e.target.closest('[data-avatar]'); if(!btn) return;
      $('#avatarGrid').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); updatePreview(btn); sound('chip'); haptic('tap');
    };
    $('#cancelProfile')?.addEventListener('click', closeFlow);
    $('#saveProfile').onclick = () => {
      const name = $('#profileName').value.trim();
      const chosen = $('#avatarGrid .active');
      const avatar = chosen?.dataset.avatar || '🧑🏽‍💼';
      const style = chosen?.dataset.style || 'Clásico Elite';
      if(name.length < 3) return toast('Escribe un nombre de al menos 3 letras');
      const saved = { name, avatar, style, code: current?.code || generateCode(), createdAt: current?.createdAt || Date.now(), updatedAt:Date.now() };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));
      syncPlayers([name, 'Invitado']); closeFlow(); cleanupHome(); toast(isEdit?'Personaje guardado':'Perfil creado');
      if(typeof afterSave === 'function') setTimeout(afterSave, 50);
    };
  }
  function hookStartGame(){
    if(window.__mesaDirectHooked || typeof window.startGame !== 'function') return;
    const original = window.startGame;
    window.startGame = function(id){
      if(!isStandalone()) return showInstallGate();
      const p = profile();
      if(!p) return showProfileSetup(false, () => { ensureProfilePlayers(); original(id); });
      ensureProfilePlayers(); return original(id);
    };
    window.__mesaDirectHooked = true;
  }
  window.openPlayFlow = () => isStandalone() ? showProfileSetup(true) : showInstallGate();
  const oldRender = window.render;
  if(typeof oldRender === 'function') window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(() => { cleanupHome(); hookStartGame(); ensureProfilePlayers(); }, 40); return result; };
  window.addEventListener('load', () => setTimeout(() => { installStyles(); hookStartGame(); cleanupHome(); if(isStandalone()){ if(!profile()) showProfileSetup(false); else ensureProfilePlayers(); } else showInstallGate(); }, 450));
})();
