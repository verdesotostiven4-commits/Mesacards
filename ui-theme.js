(function(){
  const KEY='mesacards_profile_v7';
  const oldKeys=['mesacards_profile_v6','mesacards_profile_v5'];
  const faces=['🧑','👩','🧔','👱‍♀️','😎','🦊'];
  const games=[['bj','🂡','21 Flash','Rondas rápidas contra la banca.'],['holdem','♠️','Hold’em Social','Cartas comunitarias y lectura.'],['rummy','🃏','Rummy Parejas','Roba, combina y toca.'],['gem','💎','Gem Clash','Gemas y decisiones rápidas.']];
  const $=s=>document.querySelector(s);
  function safe(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function profile(){
    try{const p=JSON.parse(localStorage.getItem(KEY)); if(p?.name) return p;}catch{}
    for(const k of oldKeys){try{const p=JSON.parse(localStorage.getItem(k)); if(p?.name){localStorage.setItem(KEY,JSON.stringify(p));return p;}}catch{}}
    return null;
  }
  function id(){return 'MC-'+Math.random().toString(36).slice(2,8).toUpperCase();}
  function saveProfile(name,avatar){const old=profile()||{}; const p={name,avatar,code:old.code||id(),createdAt:old.createdAt||Date.now(),updatedAt:Date.now()}; localStorage.setItem(KEY,JSON.stringify(p)); try{const st=JSON.parse(localStorage.getItem('mesacards_state_v1')||'{}'); st.players=[{name:p.name,chips:40},{name:'Invitado',chips:40}]; st.screen='home'; st.game=null; st.data=null; localStorage.setItem('mesacards_state_v1',JSON.stringify(st));}catch{} return p;}
  function renderHome(){
    const app=$('#app'); if(!app) return;
    const p=profile()||{name:'Jugador',avatar:'🧑',code:'MC-LOCAL'};
    app.innerHTML=`<main class="mc-screen"><header class="mc-top"><div class="mc-brand"><div class="mc-logo">♣</div><span>Mesa<em>Cards</em></span></div><div class="mc-user"><button class="mc-avatar" id="mcProfile">${safe(p.avatar||'🧑')}</button><div class="mc-pill">🪙 12.450</div></div></header><div class="mc-pill" style="display:inline-flex"><span style="width:10px;height:10px;border-radius:50%;background:#49f07a;box-shadow:0 0 12px #49f07a"></span> Online disponible</div><h1 class="mc-title">Juega cartas<br>con tus <em>amigos</em></h1><p class="mc-sub">Cada uno desde su celular. En <b>tiempo real</b> o local, siempre con puntos virtuales.</p><div class="mc-actions"><button class="mc-btn primary" id="mcPlay">▶ Jugar ahora</button><button class="mc-btn" id="mcInvite">👥 Invitar amigos</button></div><div class="mc-tabs"><button class="active" id="tabOnline">🌐 Online</button><button id="tabLocal">📱 Local</button><button id="tabRooms">🚪 Salas</button></div><section class="mc-games">${games.map(g=>`<button class="mc-game" data-game="${g[0]}"><i>${g[1]}</i><b>${g[2]}</b><small>${g[3]}</small></button>`).join('')}</section><section class="mc-friends"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b>Amigos conectados</b><button class="btn small ghost" id="allFriends">Ver todos</button></div><div style="display:flex;gap:16px;align-items:center;overflow:hidden">${['Sofi','Marco','Vale','Nico'].map((n,i)=>`<div style="text-align:center;color:#c9d5e8"><div class="mc-avatar">${faces[i+1]}</div><small>${n}</small></div>`).join('')}<button class="mc-avatar" id="plusFriend">＋</button></div></section><nav class="mc-bottom"><button class="active">⌂<br>Inicio</button><button id="navFriends">👥<br>Amigos</button><button id="navRooms">♣<br>Salas</button><button id="navProfile">♙<br>Perfil</button></nav></main>`;
    $('#mcPlay').onclick=()=>window.startGame?.('bj');
    $('#mcInvite').onclick=()=>window.openMesaSocial?.();
    $('#mcProfile').onclick=()=>openProfile(); $('#navProfile').onclick=()=>openProfile();
    $('#tabOnline').onclick=$('#navRooms').onclick=$('#plusFriend').onclick=$('#allFriends').onclick=()=>window.openMesaSocial?.();
    $('#tabRooms').onclick=()=>window.openMesaSocial?.();
    $('#tabLocal').onclick=()=>window.startGame?.('bj');
    app.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>window.startGame?.(b.dataset.game));
  }
  function openProfile(after){
    document.querySelector('.flowOverlay')?.remove();
    const p=profile()||{}; const current=p.avatar||faces[0];
    const el=document.createElement('div'); el.className='proOverlay';
    el.innerHTML=`<section class="proCard"><div class="proLogo"><div class="mc-logo">♣</div><span>Mesa<em style="color:#ff7a59;font-style:normal">Cards</em></span></div><div class="proHero"><div><h2>Crea tu perfil</h2><p>Cada jugador usa su propio celular para jugar.</p></div><div class="proMegaChip"></div></div><label class="proField">👤<input id="proName" placeholder="Nombre de jugador" maxlength="18" value="${safe(p.name||'')}"></label><label class="proField">✉️<input placeholder="Correo (opcional)"></label><div class="proField">🌐<span style="flex:1;color:#9fb0ca">Idioma / Región</span><b>Español (Latam)</b></div><div class="avatarPanel"><h3>☆ Elige tu avatar</h3><div class="avatarGrid2">${faces.map(f=>`<button class="avatarChoice ${f===current?'active':''}" data-face="${f}"><span class="avatarFace">${f}</span></button>`).join('')}</div><div class="safeCheck"><span>✓</span><div><b>Acepto jugar solo con puntos virtuales.</b><small>No hay dinero real involucrado.</small></div></div></div><div class="proActions"><button class="mc-btn primary" id="proSave">▶ Continuar</button><button class="mc-btn" id="proClose">Ya tengo perfil</button></div><p class="proSecure">🔒 Tu información está protegida.</p></section>`;
    document.body.appendChild(el);
    el.querySelectorAll('.avatarChoice').forEach(b=>b.onclick=()=>{el.querySelectorAll('.avatarChoice').forEach(x=>x.classList.remove('active'));b.classList.add('active');});
    $('#proClose').onclick=()=>el.remove();
    $('#proSave').onclick=()=>{const name=$('#proName').value.trim(); if(name.length<3){alert('Escribe un nombre de al menos 3 letras');return;} const f=el.querySelector('.avatarChoice.active')?.dataset.face||faces[0]; saveProfile(name,f); el.remove(); renderHome(); if(after) after();};
  }
  function shouldReplace(){const app=$('#app'); return app && (app.querySelector('.hero')||app.querySelector('.mc-screen'));}
  const previousRender=window.render;
  if(typeof previousRender==='function') window.render=function(){const r=previousRender.apply(this,arguments); setTimeout(()=>{if(shouldReplace())renderHome();},20); return r;};
  const previousStart=window.startGame;
  if(typeof previousStart==='function') window.startGame=function(game){if(!profile()) return openProfile(()=>previousStart(game)); return previousStart(game);};
  window.openPlayFlow=openProfile;
  window.renderMesaProHome=renderHome;
  window.addEventListener('load',()=>setTimeout(()=>{if(!profile()) openProfile(); if(shouldReplace()) renderHome();},900));
})();