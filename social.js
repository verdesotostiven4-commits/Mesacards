(function(){
  const PROFILE_KEYS = ['mesacards_profile_v7','mesacards_profile_v6','mesacards_profile_v5'];
  const DEVICE_KEY = 'mesacards_guest_device_v1';
  let db = null, me = null;
  const $ = s => document.querySelector(s);
  const esc = v => String(v || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const roomCode = () => Math.random().toString(36).slice(2,7).toUpperCase();
  function deviceId(){ let id = localStorage.getItem(DEVICE_KEY); if(!id){ id = crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Date.now(); localStorage.setItem(DEVICE_KEY,id); } return id; }
  function localProfile(){
    for(const k of PROFILE_KEYS){ try{ const p = JSON.parse(localStorage.getItem(k)); if(p?.name) return p; }catch{} }
    return { name:'Jugador', avatar:'🦊' };
  }
  function err(e){
    if(!e) return 'Error vacío';
    if(typeof e === 'string') return e;
    const parts = [e.message,e.details,e.hint,e.code,e.status,e.name].filter(Boolean);
    if(parts.length) return parts.join(' · ');
    try{ return JSON.stringify(e) || String(e); }catch{ return String(e); }
  }
  function client(){
    if(db) return db;
    if(!window.supabase || !window.MESACARDS_SUPABASE) throw new Error('No cargó la conexión online');
    db = window.supabase.createClient(window.MESACARDS_SUPABASE.url, window.MESACARDS_SUPABASE.key, { auth:{ persistSession:false, autoRefreshToken:false } });
    return db;
  }
  function toast(text){ let el=$('.toast'); if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); } el.textContent=text; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2300); }
  function close(){ $('.socialOverlay')?.remove(); }
  function shell(html){ close(); const el=document.createElement('div'); el.className='socialOverlay'; el.innerHTML=`<section class="socialSheet"><button class="socialClose" id="socialClose" type="button">×</button>${html}</section>`; document.body.appendChild(el); $('#socialClose').onclick=close; }
  async function prepare(){
    const p = localProfile();
    const name = (p.name || 'Jugador').trim().slice(0,18);
    const res = await client().from('guest_profiles').upsert({ device_id:deviceId(), display_name:name.length>=3?name:'Jugador', avatar:p.avatar||'🦊', updated_at:new Date().toISOString() }, { onConflict:'device_id' }).select('*').single();
    if(res.error) throw res.error;
    me = res.data;
  }
  async function openOnline(){
    shell(`<div class="socialTop"><div class="socialAvatar">⏳</div><div><h2>Conectando</h2><p>Preparando tu perfil online...</p></div></div>`);
    try{ await prepare(); renderHub(); }
    catch(e){ const text = err(e); shell(`<div class="socialTop"><div class="socialAvatar">⚠️</div><div><h2>No se pudo conectar</h2><p>Falta ejecutar el parche guest online o hay un problema de conexión.</p></div></div><div class="socialActions"><button class="btn primary" id="retryOnline" type="button">Reintentar</button><button class="btn ghost" id="copyError" type="button">Copiar error</button></div><p class="socialNotice">${esc(text)}</p>`); $('#retryOnline').onclick=openOnline; $('#copyError').onclick=async()=>{ await navigator.clipboard?.writeText(text); toast('Error copiado'); }; }
  }
  function renderHub(){
    const url = `${location.origin}${location.pathname}?profile=${encodeURIComponent(me.player_code)}`;
    shell(`<div class="socialTop"><div class="socialAvatar">${esc(me.avatar)}</div><div><h2>${esc(me.display_name)}</h2><p><span class="socialCode">${esc(me.player_code)}</span> · Nivel ${me.level||1}</p></div></div><div class="socialGrid"><div class="socialStat"><b>${me.total_points||0}</b><span>Puntos</span></div><div class="socialStat"><b>${me.wins||0}</b><span>Victorias</span></div><div class="socialStat"><b>${me.current_streak||0}</b><span>Racha</span></div><div class="socialStat"><b>${me.games_played||0}</b><span>Partidas</span></div></div><div class="socialActions"><button class="btn primary" id="shareMe" type="button">Compartir perfil</button><button class="btn ghost" id="copyId" type="button">Copiar ID</button></div><div class="socialForm"><input id="findPlayer" placeholder="Buscar por ID o nombre"><button class="btn primary" id="findBtn" type="button">Buscar amigo</button></div><div class="socialResults" id="socialResults"></div><div class="socialActions"><button class="btn ghost" id="requestsBtn" type="button">Solicitudes</button><button class="btn ghost" id="roomBtn" type="button">Crear sala</button></div><div class="socialForm"><input id="joinRoomInput" placeholder="Código de sala"><button class="btn primary" id="joinRoomBtn" type="button">Entrar a sala</button></div><div class="inviteBox" id="shareBox" hidden>${esc(url)}</div>`);
    $('#shareMe').onclick=()=>share(url,`Agrégame en MesaCards: ${me.display_name}`); $('#copyId').onclick=async()=>{ await navigator.clipboard?.writeText(me.player_code); toast('ID copiado'); }; $('#findBtn').onclick=searchPlayer; $('#requestsBtn').onclick=listRequests; $('#roomBtn').onclick=createRoom; $('#joinRoomBtn').onclick=()=>joinRoom($('#joinRoomInput').value.trim().toUpperCase());
  }
  async function share(url,text){ $('#shareBox')?.removeAttribute('hidden'); if($('#shareBox')) $('#shareBox').textContent=url; try{ if(navigator.share) await navigator.share({title:'MesaCards',text,url}); else { await navigator.clipboard?.writeText(url); toast('Link copiado'); } }catch{} }
  async function searchPlayer(){
    const q=$('#findPlayer').value.trim(), box=$('#socialResults'); if(q.length<2) return toast('Escribe ID o nombre'); box.innerHTML='<p class="socialNotice">Buscando...</p>';
    let req=client().from('guest_profiles').select('device_id,player_code,display_name,avatar,level,wins').limit(8); req=q.toUpperCase().startsWith('MC-')?req.ilike('player_code',q.toUpperCase()):req.ilike('display_name',`%${q}%`);
    const res=await req; if(res.error) return box.innerHTML=`<p class="socialNotice">${esc(err(res.error))}</p>`; const data=(res.data||[]).filter(p=>p.device_id!==me.device_id); if(!data.length) return box.innerHTML='<p class="socialNotice">No encontré jugadores.</p>';
    box.innerHTML=data.map(p=>`<article class="socialResult"><span class="avatar">${esc(p.avatar||'🦊')}</span><div><b>${esc(p.display_name)}</b><small><span class="socialCode">${esc(p.player_code)}</span> · Nivel ${p.level||1}</small></div><button class="btn small primary" data-add="${p.device_id}" type="button">Agregar</button></article>`).join(''); box.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>sendRequest(b.dataset.add));
  }
  async function sendRequest(id){ const res=await client().from('guest_friendships').insert({requester_device:me.device_id,receiver_device:id,status:'pending'}); toast(res.error?'Ya existe solicitud o amistad':'Solicitud enviada'); }
  async function listRequests(){
    const box=$('#socialResults'); box.innerHTML='<p class="socialNotice">Cargando solicitudes...</p>'; const res=await client().from('guest_friendships').select('id,requester_device,status,guest_profiles!guest_friendships_requester_device_fkey(display_name,avatar,player_code)').eq('receiver_device',me.device_id).eq('status','pending').limit(20);
    if(res.error) return box.innerHTML=`<p class="socialNotice">${esc(err(res.error))}</p>`; if(!res.data.length) return box.innerHTML='<p class="socialNotice">No tienes solicitudes pendientes.</p>';
    box.innerHTML=res.data.map(r=>`<article class="socialResult"><span class="avatar">${esc(r.guest_profiles?.avatar||'🦊')}</span><div><b>${esc(r.guest_profiles?.display_name||'Jugador')}</b><small>${esc(r.guest_profiles?.player_code||'')}</small></div><button class="btn small primary" data-accept="${r.id}" type="button">Aceptar</button></article>`).join(''); box.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptRequest(b.dataset.accept));
  }
  async function acceptRequest(id){ const res=await client().from('guest_friendships').update({status:'accepted',updated_at:new Date().toISOString()}).eq('id',id); if(res.error) return toast('No se pudo aceptar'); toast('Solicitud aceptada'); listRequests(); }
  async function createRoom(){ const res=await client().from('guest_rooms').insert({room_code:roomCode(),host_device:me.device_id,game_key:'bj',max_players:4}).select('*').single(); if(res.error) return toast(err(res.error)); await client().from('guest_room_players').insert({room_id:res.data.id,device_id:me.device_id,seat_number:1}); showRoom(res.data); }
  async function joinRoom(text){ if(!text) return toast('Escribe código de sala'); const res=await client().from('guest_rooms').select('*').eq('room_code',text).maybeSingle(); if(res.error||!res.data) return toast('Sala no encontrada'); await client().from('guest_room_players').insert({room_id:res.data.id,device_id:me.device_id,seat_number:2}); showRoom(res.data); }
  async function showRoom(room){ const url=`${location.origin}${location.pathname}?room=${encodeURIComponent(room.room_code)}`; const members=await client().from('guest_room_players').select('guest_profiles(display_name,avatar,player_code)').eq('room_id',room.id).limit(8); shell(`<div class="socialTop"><div class="socialAvatar">🎮</div><div><h2>Sala ${esc(room.room_code)}</h2><p>Comparte el código para que entren otros jugadores.</p></div></div><div class="inviteBox">${esc(url)}</div><div class="socialActions"><button class="btn primary" id="shareRoom" type="button">Compartir sala</button><button class="btn ghost" id="backHub" type="button">Perfil</button></div><div class="socialResults">${(members.data||[]).map(m=>`<article class="socialResult"><span class="avatar">${esc(m.guest_profiles?.avatar||'🦊')}</span><div><b>${esc(m.guest_profiles?.display_name||'Jugador')}</b><small>${esc(m.guest_profiles?.player_code||'')}</small></div></article>`).join('')}</div><p class="socialNotice">La sala ya existe online. Las cartas en tiempo real van en la siguiente fase.</p>`); $('#shareRoom').onclick=()=>share(url,'Únete a mi sala de MesaCards'); $('#backHub').onclick=renderHub; }
  function addHomeButton(){ document.querySelectorAll('.socialFab').forEach(el=>el.remove()); const actions=document.querySelector('.hero .heroActions'); if(actions&&!$('#onlineBtn')) actions.insertAdjacentHTML('beforeend','<button class="btn ghost" id="onlineBtn" type="button">Online</button>'); $('#onlineBtn')?.addEventListener('click',openOnline); }
  window.openMesaSocial=openOnline; window.addEventListener('load',()=>setInterval(addHomeButton,1000));
})();
