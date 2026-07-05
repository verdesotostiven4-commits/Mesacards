(function(){
  document.addEventListener('click', function(e){
    const start = e.target.closest('#startRoom');
    if(!start) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.querySelector('.mc-overlay')?.remove();
    if(typeof mcStart === 'function') mcStart('bj');
    else if(typeof startGame === 'function') startGame('bj');
  }, true);
})();
