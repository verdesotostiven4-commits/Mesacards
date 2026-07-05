(function(){
  const TUTORIAL_VERSION = 'v2';
  const SEEN_KEY = `mesacards_tutorial_seen_${TUTORIAL_VERSION}`;
  const modeByTitle = {
    '21 Flash': 'bj',
    'Hold’em Social': 'holdem',
    'Rummy Parejas': 'rummy',
    'Gem Clash': 'gem'
  };
  const gameTitles = {
    bj: '21 Flash',
    holdem: 'Hold’em Social',
    rummy: 'Rummy Parejas',
    gem: 'Gem Clash'
  };
  const TUTORIALS = {
    bj: {
      icon: '🂡', title: '21 Flash', level: 'Fácil · 2 minutos para aprender',
      intro: 'Tu meta es quedar lo más cerca posible de 21 sin pasarte. La banca virtual juega al final.',
      steps: [
        ['Objetivo', 'Suma tus cartas y acércate a 21. Si pasas de 21, pierdes esa ronda.'],
        ['Valores', 'Las cartas J, Q y K valen 10. El As puede valer 1 u 11 según te convenga.'],
        ['Tu turno', 'Toca Pedir carta si quieres arriesgarte o Plantarse si ya tienes una buena suma.'],
        ['Ganar', 'Si tu total supera a la banca sin pasarte, ganas fichas virtuales de puntuación.']
      ],
      tips: ['Con 17 o más normalmente conviene plantarse.', 'Con 11 o menos casi siempre puedes pedir otra carta.']
    },
    holdem: {
      icon: '♠️', title: 'Hold’em Social', level: 'Medio · lectura y estrategia',
      intro: 'Cada jugador recibe 2 cartas privadas y luego aparecen cartas en la mesa. Gana la mejor mano de 5 cartas.',
      steps: [
        ['Tus cartas', 'Mira tus 2 cartas. Nadie más debería verlas cuando se pasen el celular.'],
        ['Mesa', 'Revela Flop, Turn y River para completar hasta 5 cartas comunitarias.'],
        ['Acciones', 'Seguir mantiene tu mano, Presión +1 sube el bote de puntos y Salir abandona la ronda.'],
        ['Manos fuertes', 'Pareja, doble pareja, trío, escalera, color, full house y póker son mejores que carta alta.']
      ],
      tips: ['No presiones siempre; úsalo cuando tengas buena mano o quieras asustar.', 'Si tus cartas son muy bajas y no conectan con la mesa, salir puede ser inteligente.']
    },
    rummy: {
      icon: '🃏', title: 'Rummy Parejas', level: 'Medio · memoria y orden',
      intro: 'Roba, organiza y descarta cartas para formar grupos. Gana quien se quede con menos puntos sueltos.',
      steps: [
        ['Roba', 'En cada turno roba del mazo o del descarte visible.'],
        ['Combina', 'Busca tríos del mismo número o escaleras del mismo símbolo, por ejemplo 5-6-7 de corazones.'],
        ['Descarta', 'Después de robar, elige una carta y toca Descartar para terminar el turno.'],
        ['Tocar', 'Cuando tus puntos sueltos sean 10 o menos, toca Tocar para cerrar la ronda.']
      ],
      tips: ['No guardes demasiadas cartas altas si no combinan.', 'Tomar del descarte ayuda, pero revela un poco tu estrategia.']
    },
    gem: {
      icon: '💎', title: 'Gem Clash', level: 'Fácil · rápido y original',
      intro: 'Toma gemas y úsalas para completar contratos. Es el modo más simple para jugar con personas que no saben cartas.',
      steps: [
        ['Toma gemas', 'Selecciona hasta 2 gemas del tablero y toca Tomar gemas.'],
        ['Contratos', 'Cada contrato pide una combinación de gemas y da puntos.'],
        ['Pagar', 'Si tienes las gemas necesarias, toca un contrato para completarlo.'],
        ['Victoria', 'La primera persona que llega a 18 puntos gana la ronda y recibe fichas virtuales.']
      ],
      tips: ['No tomes gemas al azar: mira primero qué contratos están cerca.', 'A veces conviene bloquear una gema que otra persona necesita.']
    }
  };

  let currentMode = null;
  let currentTutorialMode = null;
  let currentTutorialStep = 0;

  const originalStartGame = window.startGame;
  const originalRender = window.render;
  const originalTopbar = window.topbar;

  function esc(str=''){
    return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function seenList(){
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; }
  }
  function hasSeen(mode){ return !!seenList()[mode]; }
  function markSeen(mode){ const seen = seenList(); seen[mode] = true; localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); }
  function resetTutorials(){ localStorage.removeItem(SEEN_KEY); toastLite('Tutoriales reiniciados'); }
  function toastLite(text){
    let el = document.querySelector('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 1800);
  }

  window.startGame = function(mode){
    if(!originalStartGame) return;
    currentMode = mode;
    if(!hasSeen(mode)){
      showTutorial(mode, false, () => {
        markSeen(mode);
        originalStartGame(mode);
        setTimeout(() => enhanceScreen(mode), 60);
      });
      return;
    }
    originalStartGame(mode);
    setTimeout(() => enhanceScreen(mode), 60);
  };

  window.render = function(){
    const result = originalRender ? originalRender.apply(this, arguments) : undefined;
    setTimeout(() => enhanceScreen(currentMode), 0);
    return result;
  };

  window.topbar = function(title, subtitle=''){
    const mode = modeByTitle[title];
    if(!mode && originalTopbar) return originalTopbar(title, subtitle);
    return `<div class="topbar pro"><button class="iconBtn" onclick="navHome()">⌂</button><div class="barTitle"><strong>${esc(title)}</strong>${subtitle?`<small>${esc(subtitle)}</small>`:''}</div><div class="barActions"><button class="iconBtn helpBtn" onclick="showTutorial('${mode}', true)">?</button><button class="iconBtn" onclick="openSettings()">⚙</button></div></div>`;
  };

  window.showTutorial = function(mode, force=false){
    showTutorial(mode || currentMode || 'bj', force, () => {
      markSeen(mode || currentMode || 'bj');
      closeTutorial();
    });
  };
  window.nextTutorialStep = function(){
    const data = TUTORIALS[currentTutorialMode];
    if(!data) return;
    if(currentTutorialStep < data.steps.length - 1){ currentTutorialStep++; renderTutorialStep(); }
    else document.querySelector('#tutorialStart')?.click();
  };
  window.prevTutorialStep = function(){ if(currentTutorialStep>0){ currentTutorialStep--; renderTutorialStep(); } };
  window.closeTutorial = closeTutorial;
  window.resetMesaTutorials = resetTutorials;

  function showTutorial(mode, force, onDone){
    const data = TUTORIALS[mode]; if(!data) return onDone?.();
    currentTutorialMode = mode; currentTutorialStep = 0;
    document.querySelector('.tutorialOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'tutorialOverlay';
    overlay.innerHTML = `<div class="tutorialSheet" role="dialog" aria-modal="true"><button class="tutorialClose" onclick="closeTutorial()">×</button><div class="tutorialHero"><div class="tutorialIcon">${data.icon}</div><div><p class="eyebrow">Tutorial guiado</p><h2>${esc(data.title)}</h2><small>${esc(data.level)}</small></div></div><p class="tutorialIntro">${esc(data.intro)}</p><div id="tutorialStep"></div><div class="tutorialControls"><button class="btn ghost" onclick="prevTutorialStep()">Atrás</button><button class="btn primary" onclick="nextTutorialStep()" id="tutorialNext">Siguiente</button></div><button class="btn ghost tutorialSkip" id="tutorialStart">Entendido, jugar</button></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#tutorialStart').onclick = () => { closeTutorial(); onDone?.(); };
    renderTutorialStep();
    if(force) overlay.classList.add('manual');
  }
  function renderTutorialStep(){
    const data = TUTORIALS[currentTutorialMode];
    const step = data.steps[currentTutorialStep];
    const total = data.steps.length;
    const el = document.querySelector('#tutorialStep'); if(!el) return;
    el.innerHTML = `<div class="tutorialProgress"><span>Paso ${currentTutorialStep+1} de ${total}</span><div>${data.steps.map((_,i)=>`<i class="${i===currentTutorialStep?'active':''}"></i>`).join('')}</div></div><article class="ruleCard"><b>${esc(step[0])}</b><p>${esc(step[1])}</p></article><div class="tutorialTips"><b>Tips rápidos</b>${data.tips.map(t=>`<span>✨ ${esc(t)}</span>`).join('')}</div>`;
    const next = document.querySelector('#tutorialNext');
    if(next) next.textContent = currentTutorialStep === total - 1 ? 'Listo' : 'Siguiente';
  }
  function closeTutorial(){ document.querySelector('.tutorialOverlay')?.remove(); }

  function enhanceScreen(mode){
    addCoachCard(mode);
    tagAnimatedCards();
    attachLongPressTips();
  }
  function addCoachCard(mode){
    if(!mode || document.querySelector('.coachCard')) return;
    const data = TUTORIALS[mode]; const screen = document.querySelector('main.screen');
    if(!data || !screen) return;
    const coach = document.createElement('section');
    coach.className = 'coachCard';
    coach.innerHTML = `<b>${data.icon} Ayuda rápida</b><p>${esc(data.steps[0][1])}</p><button class="btn small ghost" onclick="showTutorial('${mode}', true)">Ver tutorial</button>`;
    screen.insertBefore(coach, screen.children[1] || null);
  }
  function tagAnimatedCards(){
    document.querySelectorAll('.card:not([data-animated])').forEach((card, i) => {
      card.dataset.animated = '1';
      card.style.animationDelay = `${Math.min(i * 35, 420)}ms`;
    });
    document.querySelectorAll('.gem:not([data-animated])').forEach((gem, i) => {
      gem.dataset.animated = '1';
      gem.style.animationDelay = `${Math.min(i * 28, 360)}ms`;
    });
  }
  function attachLongPressTips(){
    document.querySelectorAll('[data-tip-ready]').forEach(el=>el.removeAttribute('data-tip-ready'));
    document.querySelectorAll('.gameTile,.contract,.pile,.handCard,.playerSeat').forEach(el => {
      el.dataset.tipReady = '1';
      el.addEventListener('pointerdown', () => el.classList.add('pressed'), { once:false });
      el.addEventListener('pointerup', () => el.classList.remove('pressed'), { once:false });
      el.addEventListener('pointerleave', () => el.classList.remove('pressed'), { once:false });
    });
  }

  function celebrate(text='¡Ronda terminada!'){
    const wrap = document.createElement('div');
    wrap.className = 'confettiWrap';
    wrap.innerHTML = `<div class="winBadge">${esc(text)}</div>${Array.from({length:26},(_,i)=>`<i style="--x:${Math.random()*100}vw;--d:${Math.random()*1.2+.8}s;--r:${Math.random()*360}deg"></i>`).join('')}`;
    document.body.appendChild(wrap);
    setTimeout(()=>wrap.remove(), 1900);
  }

  ['bjFinish','holdemWinner','rummyKnock','gemBuy'].forEach(name => {
    const original = window[name];
    if(typeof original !== 'function') return;
    window[name] = function(){
      const result = original.apply(this, arguments);
      setTimeout(() => {
        if(document.body.textContent.includes('Nueva ronda')) celebrate('¡Resultado listo!');
      }, 120);
      return result;
    };
  });

  const originalOpenSettings = window.openSettings;
  window.openSettings = function(){
    originalOpenSettings?.();
    setTimeout(() => {
      const body = document.querySelector('.modalBody.settingRows');
      if(body && !document.querySelector('#tutorialResetBtn')){
        body.insertAdjacentHTML('beforeend', `<button class="btn ghost" id="tutorialResetBtn" onclick="resetMesaTutorials()">Mostrar tutoriales otra vez</button>`);
      }
    }, 40);
  };

  window.addEventListener('load', () => setTimeout(() => enhanceScreen(currentMode), 120));
})();
