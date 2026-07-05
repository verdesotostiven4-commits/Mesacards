(function(){
  window.openMesaSocial = function(){
    if(typeof window.openPlayFlow === 'function') window.openPlayFlow();
  };
  window.addEventListener('load', function(){
    setTimeout(function(){
      document.querySelectorAll('.socialFab').forEach(function(el){ el.remove(); });
    }, 300);
  });
})();
