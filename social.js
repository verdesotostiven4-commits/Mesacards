(function(){
  const ready = () => window.supabase && window.MESACARDS_SUPABASE;
  let client = null;
  let currentUser = null;
  let profile = null;

  function initClient(){
    if(client || !ready()) return client;
    client = window.supabase.createClient(window.MESACARDS_SUPABASE.url, window.MESACARDS_SUPABASE.key);
    return client;
  }
  function toast(text){
    let el = document.querySelector('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2300);
  }
  function sound(type='tap'){ window.proSound?.(type); }
  function haptic(type='tap'){ window.proHaptic?.(type); }
  function esc(str=''){ return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function close(){ document.querySelector('.socialOverlay')?.remove(); }
  function shell(content){
    close();
    const overlay = document.createElement('div');
    overlay.className = 'socialOverlay';
    overlay.innerHTML = `<section class="socialSheet"><button class="socialClose" id="socialClose">×</button>${content}</section>`;
    document.body.appendChild(overlay);
    document.querySelector('#socialClose').onclick = close;
    sound('open'); haptic('card');
  }
  async function ensureAuth(){
    const supa = initClient();
    if(!supa) throw new Error('Supabase no está cargado todavía');
    const { data } = await supa.auth.getSession();
    if(data.session?.user){ currentUser = data.session.user; return currentUser; }
    const result = await supa.auth.signInAnonymously();
    if(result.error) throw result.error;
    currentUser = result.data.user;
    return currentUser;
  }
  async function loadProfile(){
    const supa = initClient();
    await ensureAuth();
    const { data, error } = await supa.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    if(error) throw error;
    profile = data;
    return profile;
  }
  async function openSocial(){
    try{
      shell(`<div class="socialTop"><div class="socialAvatar">⏳</div><div><h2>Conectando</h2><p>Preparando tu perfil online...</p></div></div>`);
      const p = await loadProfile();
      renderProfile(p);
      handleDeepLinks();
    } catch(err){
      shell(`<div class="socialTop"><div class="socialAvatar">⚠️</div><div><h2>No se pudo conectar</h2><p>${esc(err.message || 'Revisa Supabase y vuelve a intentar.')}</p></div></div><p class="socialNotice">Si acabas de ejecutar el SQL, revisa que Anonymous sign-ins esté permitido en Supabase Auth.</p>`);
    }
  }
  function renderProfile(p){
    const shareUrl = `${location.origin}${location.pathname}?profile=${encodeURIComponent(p.player_code)}`;
    shell(`<div class="socialTop"><div class="socialAvatar">${esc(p.avatar || '🦊')}</div><div><h2>${esc(p.display_name)}</h2><p><span class="socialCode">${esc(p.player_code)}</span> · Nivel ${p.level || 1}</p></div></div><div class="socialGrid"><div class="socialStat"><b>${p.total_points || 0}</b><span>Puntos</span></div><div class="socialStat"><b>${p.wins || 0}</b><span>Victorias</span></div><div class="socialStat"><b>${p.current_streak || 0}</b><span>Racha</span></div><div class="socialStat"><b>${p.games_played || 0}</b><span>Partidas</span></div></div><div class="socialForm"><input id="displayNameInput" maxlength="18" value="${esc(p.display_name)}" placeholder="Nombre único"><button class="btn primary" id="saveProfileBtn">Guardar perfil</button></div><div class="socialActions"><button class="btn ghost" id="shareProfileBtn">Compartir perfil</button><button class="btn ghost" id="createRoomBtn">Crear sala</button></div><div class="socialForm"><input id="searchPlayerInput" placeholder="Buscar por ID o nombre"><button class="btn primary" id="searchPlayerBtn">Buscar jugador</button></div><div class="socialResults" id="socialResults"></div><div class="inviteBox" id="shareBox" hidden>${esc(shareUrl)}</div><p class="socialNotice">Tu ID se genera automáticamente. El nombre visible no puede repetirse. Las fichas y puntos son virtuales, sin valor real.</p>`);
    document.querySelector('#saveProfileBtn').onclick = saveProfile;
    document.querySelector('#searchPlayerBtn').onclick = searchPlayer;
    document.querySelector('#shareProfileBtn').onclick = async () => shareText(shareUrl);
    document.querySelector('#createRoomBtn').onclick = createRoom;
  }
  async function saveProfile(){
    const name = document.querySelector('#displayNameInput').value.trim();
    if(name.length < 3) return toast('El nombre debe tener al menos 3 caracteres');
    try{
      const supa = initClient();
      const { data, error } = await supa.from('profiles').update({ display_name:name, updated_at:new Date().toISOString() }).eq('id', currentUser.id).select('*').single();
      if(error) throw error;
      profile = data; toast('Perfil guardado'); sound('chip'); haptic('chip'); renderProfile(profile);
    }catch(err){ toast(err.message?.includes('duplicate') ? 'Ese nombre ya está usado' : 'No se pudo guardar'); }
  }
  async function searchPlayer(){
    const query = document.querySelector('#searchPlayerInput').value.trim();
    const box = document.querySelector('#socialResults');
    if(query.length < 2) return toast('Escribe ID o nombre');
    box.innerHTML = '<p class="socialNotice">Buscando...</p>';
    try{
      const supa = initClient();
      const clean = query.toUpperCase();
      let request = supa.from('profiles').select('id,player_code,display_name,avatar,level,total_points,wins,current_streak').limit(8);
      if(clean.startsWith('MC-')) request = request.ilike('player_code', clean);
      else request = request.ilike('display_name', `%${query}%`);
      const { data, error } = await request;
      if(error) throw error;
      if(!data.length){ box.innerHTML = '<p class="socialNotice">No encontré jugadores con ese dato.</p>'; return; }
      box.innerHTML = data.map(p => `<article class="socialResult"><span class="avatar">${esc(p.avatar || '🦊')}</span><div><b>${esc(p.display_name)}</b><small><span class="socialCode">${esc(p.player_code)}</span> · Nivel ${p.level || 1} · ${p.wins || 0} wins</small></div><button class="btn small primary" data-add="${p.id}">Solicitud</button></article>`).join('');
      box.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => sendFriendRequest(btn.dataset.add));
    }catch(err){ box.innerHTML = `<p class="socialNotice">Error: ${esc(err.message || 'No se pudo buscar')}</p>`; }
  }
  async function sendFriendRequest(receiverId){
    if(receiverId === currentUser.id) return toast('Ese eres tú');
    try{
      const supa = initClient();
      const { error } = await supa.from('friendships').insert({ requester_id: currentUser.id, receiver_id: receiverId, status:'pending' });
      if(error) throw error;
      toast('Solicitud enviada'); sound('chip'); haptic('chip');
    }catch(err){ toast(err.message?.includes('duplicate') ? 'Ya existe una solicitud o amistad' : 'No se pudo enviar'); }
  }
  async function createRoom(){
    try{
      const supa = initClient();
      const roomCode = Math.random().toString(36).slice(2,7).toUpperCase();
      const { data, error } = await supa.from('rooms').insert({ room_code: roomCode, host_id: currentUser.id, game_key:'bj', max_players:4 }).select('*').single();
      if(error) throw error;
      const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(data.room_code)}`;
      document.querySelector('#shareBox').hidden = false;
      document.querySelector('#shareBox').textContent = url;
      await shareText(url, 'MesaCards: únete a mi sala');
    }catch(err){ toast('No se pudo crear sala'); }
  }
  async function shareText(text, title='MesaCards'){
    document.querySelector('#shareBox')?.removeAttribute('hidden');
    const box = document.querySelector('#shareBox');
    if(box) box.textContent = text;
    try{
      if(navigator.share) await navigator.share({ title, text:'Juega conmigo en MesaCards', url:text });
      else { await navigator.clipboard.writeText(text); toast('Link copiado'); }
    }catch{}
  }
  async function handleDeepLinks(){
    const params = new URLSearchParams(location.search);
    const profileCode = params.get('profile');
    const roomCode = params.get('room');
    if(profileCode){
      document.querySelector('#searchPlayerInput').value = profileCode;
      searchPlayer();
    }
    if(roomCode){
      toast(`Sala detectada: ${roomCode}`);
    }
  }
  function addFab(){
    if(document.querySelector('.socialFab')) return;
    const btn = document.createElement('button');
    btn.className = 'socialFab';
    btn.textContent = '👤';
    btn.onclick = openSocial;
    document.body.appendChild(btn);
  }
  window.openMesaSocial = openSocial;
  window.addEventListener('load', () => setTimeout(addFab, 900));
})();
