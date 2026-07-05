(function(){
  try { localStorage.setItem('mesacards_setup_done_v1', '1'); } catch {}
  function polishHome(){
    const games=document.querySelector('#games');
    if(!games)return;
    document.querySelector('.setupOverlay')?.remove();
    if(!document.querySelector('.premiumModeTabs')) games.insertAdjacentHTML('beforebegin','<div class="premiumModeTabs"><button class="active">Online</button><button>Local</button><button>Salas</button></div>');
    if(!document.querySelector('.premiumFriends')) games.insertAdjacentHTML('afterend','<section class="premiumFriends"><header><h2>Amigos conectados</h2><button>Ver todos</button></header><div class="premiumFriendRow"><button class="premiumFriend"><span>👩</span><b>Sofi</b><i></i></button><button class="premiumFriend"><span>🧢</span><b>Marco</b><i></i></button><button class="premiumFriend"><span>👩</span><b>Vale</b><i></i></button><button class="premiumFriend invite"><span>＋</span><b>Invitar</b></button></div></section>');
  }
  window.addEventListener('load',()=>{setInterval(polishHome,1000);setTimeout(()=>{document.querySelector('.setupOverlay')?.remove();window.openMesaSetup=function(){if(typeof window.openPlayFlow==='function')window.openPlayFlow();};},700);});
})();