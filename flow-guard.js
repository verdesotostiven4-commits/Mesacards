(function(){
  try {
    localStorage.setItem('mesacards_setup_done_v1', '1');
  } catch {}

  window.addEventListener('load', () => {
    setTimeout(() => {
      document.querySelector('.setupOverlay')?.remove();
      window.openMesaSetup = function(){
        if (typeof window.openPlayFlow === 'function') window.openPlayFlow();
      };
    }, 700);
  });
})();
