(function(){
  const LOCAL_PROFILE_KEY = 'mesacards_profile_v6';
  let sb = null;
  let me = null;
  let remote = null;
  let lastError = '';

  const $ = s => document.querySelector(s);
  const esc = v => String(v || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const code = () => Math.random().toString(36).slice(2,7).toUpperCase();

  function localProfile(){
    try { return JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY)); } catch { return null; }
  }
  function toast(text){
    let el = $('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2300);
  }
  function client(){
    if(sb) return sb;
    if(!window.supabase || !window.MESACARDS_SUPABASE) throw new Error('La app no cargó la conexión online');
    sb = window.supabase.createClient(window.MESACARDS_SUPABASE.url, window.MESACARDS_SUPABASE.key);
    return sb;
  }
  function close(){ $('.socialOverlay')?.remove(); }
  function shell(html){
    close();
    const el = document.createElement('div');
    el.className = 'socialOverlay';
    el.innerHTML = `<section class="socialSheet"><button class="socialClose" id="socialClose" type="button">×</button>${html}</section>`;
    document.body.appendChild(el);
    $('#socialClose').onclick = close;
  }
  async function ensureOnline(){
    const c = client();
    let session = null;
    const current = await c.auth.getSession();
    session = current.data.session;
    if(!session){
      const signed = await c.auth.signInAnonymously();
      if(signed.error) throw signed.error;
      session = signed.data.session;
    }
    if(!session?.user) throw new Error('No se pudo iniciar sesión online');
    me = session.user;

    let res = await c.from('profiles').select('*').eq('id', me.id).maybeSingle();
    if(res.error) throw res.error;
    if(!res.data){
      const lp = localProfile();
      const rpc = await c.rpc('ensure_profile', { p_display_name: lp?.name || 'Jugador', p_avatar: lp?.avatar || '🦊' });
      if(rpc.error) throw rpc.error;
      remote = rpc.data;
    } else {
      remote = res.data;
    }
    await syncLocalProfile();
    return remote;
  }
  async function syncLocalProfile(){
    const lp = localProfile();
    if(!lp || !remote) return;
    const patch = { avatar: lp.avatar || remote.avatar, updated_at: new Date().toISOString() };
    if(lp.name && lp.name !== remote.display_name) patch.display_name = lp.name.slice(0,18);
    const res = await client().from('profiles').update(patch).eq('id', me.id).select('*').single();
    if(!res.error && res.data) remote = res.data;
  }
  async function openOnline(){
    shell(`<div class="socialTop"><div class="socialAvatar">⏳</div><div><h2>Conectando</h2><p>Preparando tu perfil online...</p></div></div>`);
    try { await ensureOnline(); renderHub(); }
    catch(e){
      lastError = e?.message || 'Error desconocido';
      const needsSql = lastError.includes('ensure_profile') || lastError.includes('function') || lastError.includes('permission') || lastError.includes('policy');
      shell(`<div class="socialTop"><div class="socialAvatar">⚠️</div><div><h2>No se pudo conectar</h2><p>${needsSql ? 'Falta ejecutar el parche online en Supabase.' : 'La conexión online respondió con un error.'}</p></div></div><div class="socialActions"><button class="btn primary" id="retryOnline" type="button">Reintentar</button><button class="btn ghost" id="copyError" type="button">Copiar error</button></div><p class="socialNotice">${esc(lastError)}</p>`);
      $('#retryOnline').onclick = openOnline;
      $('#copyError').onclick = async () => { await navigator.clipboard?.writeText(lastError); toast('Error copiado'); };
    }
  }
  function renderHub(){
    const url = `${location.origin}${location.pathname}?profile=${encodeURIComponent(remote.player_code)}`;
    shell(`<div class="socialTop"><div class="socialAvatar">${esc(remote.avatar || '🦊')}</div><div><h2>${esc(remote.display_name)}</h2><p><span class="socialCode">${esc(remote.player_code)}</span> · Nivel ${remote.level || 1}</p></div></div><div class="socialGrid"><div class="socialStat"><b>${remote.total_points || 0}</b><span>Puntos</span></div><div class="socialStat"><b>${remote.wins || 0}</b><span>Victorias</span></div><div class="socialStat"><b>${remote.current_streak || 0}</b><span>Racha</span></div><div class="socialStat"><b>${remote.games_played || 0}</b><span>Partidas</span></div></div><div class="socialActions"><button class="btn primary" id="shareMe" type="button">Compartir perfil</button><button class="btn ghost" id="copyId" type="button">Copiar ID</button></div><div class="socialForm"><input id="findPlayer" placeholder="Buscar por ID o nombre"><button class="btn primary" id="findBtn" type="button">Buscar amigo</button></div><div class="socialResults" id="socialResults"></div><div class="socialActions"><button class="btn ghost" id="requestsBtn" type="button">Solicitudes</button><button class="btn ghost" id="roomBtn" type="button">Crear sala</button></div><div class="socialForm"><input id="joinRoomInput" placeholder="Código de sala"><button class="btn primary" id="joinRoomBtn" type="button">Entrar a sala</button></div><div class="inviteBox" id="shareBox" hidden>${esc(url)}</div>`);
    $('#shareMe').onclick = () => shareText(url, `Agrégame en MesaCards: ${remote.display_name}`);
    $('#copyId').onclick = async () => { await navigator.clipboard?.writeText(remote.player_code); toast('ID copiado'); };
    $('#findBtn').onclick = searchPlayer;
    $('#requestsBtn').onclick = listRequests;
    $('#roomBtn').onclick = createRoom;
    $('#joinRoomBtn').onclick = () => joinRoom($('#joinRoomInput').value.trim().toUpperCase());
  }
  async function shareText(url, text){
    $('#shareBox')?.removeAttribute('hidden');
    if($('#shareBox')) $('#shareBox').textContent = url;
    try{
      if(navigator.share) await navigator.share({ title:'MesaCards', text, url });
      else { await navigator.clipboard?.writeText(url); toast('Link copiado'); }
    }catch{}
  }
  async function searchPlayer(){
    const q = $('#findPlayer').value.trim();
    const box = $('#socialResults');
    if(q.length < 2) return toast('Escribe ID o nombre');
    box.innerHTML = '<p class="socialNotice">Buscando...</p>';
    const isId = q.toUpperCase().startsWith('MC-');
    let req = client().from('profiles').select('id,player_code,display_name,avatar,level,wins').limit(8);
    req = isId ? req.ilike('player_code', q.toUpperCase()) : req.ilike('display_name', `%${q}%`);
    const res = await req;
    if(res.error) return box.innerHTML = '<p class="socialNotice">No se pudo buscar.</p>';
    const data = (res.data || []).filter(p => p.id !== me.id);
    if(!data.length) return box.innerHTML = '<p class="socialNotice">No encontré jugadores.</p>';
    box.innerHTML = data.map(p => `<article class="socialResult"><span class="avatar">${esc(p.avatar || '🦊')}</span><div><b>${esc(p.display_name)}</b><small><span class="socialCode">${esc(p.player_code)}</span> · Nivel ${p.level || 1}</small></div><button class="btn small primary" data-add="${p.id}" type="button">Agregar</button></article>`).join('');
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => sendRequest(b.dataset.add));
  }
  async function sendRequest(id){
    const res = await client().from('friendships').insert({ requester_id: me.id, receiver_id: id, status:'pending' });
    if(res.error) return toast('Ya existe solicitud o amistad');
    toast('Solicitud enviada');
  }
  async function listRequests(){
    const box = $('#socialResults');
    box.innerHTML = '<p class="socialNotice">Cargando solicitudes...</p>';
    const res = await client().from('friendships').select('id,requester_id,status,profiles!friendships_requester_id_fkey(display_name,avatar,player_code)').eq('receiver_id', me.id).eq('status','pending').limit(20);
    if(res.error) return box.innerHTML = '<p class="socialNotice">No se pudieron cargar.</p>';
    if(!res.data.length) return box.innerHTML = '<p class="socialNotice">No tienes solicitudes pendientes.</p>';
    box.innerHTML = res.data.map(r => `<article class="socialResult"><span class="avatar">${esc(r.profiles?.avatar || '🦊')}</span><div><b>${esc(r.profiles?.display_name || 'Jugador')}</b><small>${esc(r.profiles?.player_code || '')}</small></div><button class="btn small primary" data-accept="${r.id}" type="button">Aceptar</button></article>`).join('');
    box.querySelectorAll('[data-accept]').forEach(b => b.onclick = () => acceptRequest(b.dataset.accept));
  }
  async function acceptRequest(id){
    const res = await client().from('friendships').update({ status:'accepted', updated_at:new Date().toISOString() }).eq('id', id);
    if(res.error) return toast('No se pudo aceptar');
    toast('Solicitud aceptada');
    listRequests();
  }
  async function createRoom(){
    const room = code();
    const res = await client().from('rooms').insert({ room_code:room, host_id:me.id, game_key:'bj', max_players:4 }).select('*').single();
    if(res.error) return toast('No se pudo crear sala');
    await client().from('room_players').insert({ room_id:res.data.id, profile_id:me.id, seat_number:1 });
    showRoom(res.data);
  }
  async function joinRoom(roomCode){
    if(!roomCode) return toast('Escribe código de sala');
    const res = await client().from('rooms').select('*').eq('room_code', roomCode).maybeSingle();
    if(res.error || !res.data) return toast('Sala no encontrada');
    await client().from('room_players').insert({ room_id:res.data.id, profile_id:me.id, seat_number:2 });
    showRoom(res.data);
  }
  async function showRoom(room){
    const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(room.room_code)}`;
    const members = await client().from('room_players').select('profiles(display_name,avatar,player_code)').eq('room_id', room.id).limit(8);
    shell(`<div class="socialTop"><div class="socialAvatar">🎮</div><div><h2>Sala ${esc(room.room_code)}</h2><p>Comparte el código para que entren otros jugadores.</p></div></div><div class="inviteBox">${esc(url)}</div><div class="socialActions"><button class="btn primary" id="shareRoom" type="button">Compartir sala</button><button class="btn ghost" id="backHub" type="button">Perfil</button></div><div class="socialResults">${(members.data || []).map(m => `<article class="socialResult"><span class="avatar">${esc(m.profiles?.avatar || '🦊')}</span><div><b>${esc(m.profiles?.display_name || 'Jugador')}</b><small>${esc(m.profiles?.player_code || '')}</small></div></article>`).join('')}</div><p class="socialNotice">La sala ya existe online. La sincronización completa de cartas por internet va en la siguiente fase del juego.</p>`);
    $('#shareRoom').onclick = () => shareText(url, 'Únete a mi sala de MesaCards');
    $('#backHub').onclick = renderHub;
  }
  function addHomeButton(){
    document.querySelectorAll('.socialFab').forEach(el => el.remove());
    const actions = document.querySelector('.hero .heroActions');
    if(actions && !document.querySelector('#onlineBtn')) actions.insertAdjacentHTML('beforeend','<button class="btn ghost" id="onlineBtn" type="button">Online</button>');
    $('#onlineBtn')?.addEventListener('click', openOnline);
  }
  window.openMesaSocial = openOnline;
  window.addEventListener('load', () => setInterval(addHomeButton, 1000));
})();
