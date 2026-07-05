(function(){
  let audioCtx = null;
  let lastTap = 0;

  function getAudio(){
    if(audioCtx) return audioCtx;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; } catch { return null; }
  }
  function sound(type='tap'){
    try{
      const ctx = getAudio(); if(!ctx) return;
      if(ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const map = {
        tap:[420,.018,.055,'sine'],
        card:[620,.025,.08,'triangle'],
        chip:[320,.035,.13,'square'],
        win:[740,.04,.2,'triangle'],
        error:[130,.035,.16,'sawtooth'],
        open:[520,.026,.12,'sine']
      }[type] || [420,.018,.055,'sine'];
      osc.type = map[3]; osc.frequency.setValueAtTime(map[0], now);
      if(type==='win') osc.frequency.exponentialRampToValueAtTime(980, now + map[2]);
      if(type==='card') osc.frequency.exponentialRampToValueAtTime(430, now + map[2]);
      filter.type = 'lowpass'; filter.frequency.value = type==='error' ? 500 : 1800;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(map[1], now + .012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + map[2]);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + map[2] + .02);
    } catch {}
  }
  function haptic(pattern='tap'){
    if(!navigator.vibrate) return;
    const patterns = { tap:12, card:[8,22,10], chip:[14,30,18], win:[22,40,30,40,24], error:[60] };
    navigator.vibrate(patterns[pattern] || 10);
  }
  function toast(text){
    let el = document.querySelector('.toast');
    if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 1900);
  }
  function wireInteractions(){
    document.addEventListener('pointerup', e => {
      const target = e.target.closest('button,.gameTile,.card,.gem,.chip');
      if(!target) return;
      const now = Date.now(); if(now - lastTap < 35) return; lastTap = now;
      document.body.classList.remove('soundPulse'); void document.body.offsetWidth; document.body.classList.add('soundPulse');
      if(target.classList.contains('gameTile')) { sound('open'); haptic('card'); }
      else if(target.classList.contains('card') || target.classList.contains('handCard')) { sound('card'); haptic('card'); }
      else if(target.classList.contains('gem') || target.classList.contains('chip')) { sound('chip'); haptic('chip'); }
      else { sound('tap'); haptic('tap'); }
    }, true);
  }
  function overrideFeedback(){
    window.proSound = sound;
    window.proHaptic = haptic;
    try{
      window.beep = () => sound('tap');
      window.vibrate = (ms=12) => haptic(ms > 30 ? 'chip' : 'tap');
      window.feedback = (text) => { sound('chip'); haptic('chip'); toast(text); };
    } catch {}
  }
  function cleanOldHomeExtras(){
    document.querySelectorAll('.premiumStatus.home,.setupOverlay,#openSetupBtn').forEach(el => el.remove());
  }
  const oldRender = window.render;
  if(typeof oldRender === 'function'){
    window.render = function(){ const result = oldRender.apply(this, arguments); setTimeout(cleanOldHomeExtras, 30); return result; };
  }
  window.openMesaSetup = function(){ if(typeof window.openPlayFlow === 'function') window.openPlayFlow(); };
  overrideFeedback(); wireInteractions();
  window.addEventListener('load', () => setTimeout(cleanOldHomeExtras, 250));
})();
