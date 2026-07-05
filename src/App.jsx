import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hbiqjewiioieolmkwvax.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJoYmlxamV3aWlvaWVvbG1rd3ZheCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgzMjY3ODI2LCJleHAiOjIwOTg4NDM4MjZ9.qNq1-3njyVQ5WW3OSxq4SZ9FZS99oEVuks8TSc5XFi8'.replace('c3Vw','c3Vw');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const PROFILE_KEY = 'mesacards_profile_v10';
const DEVICE_KEY = 'mesacards_device_v2';
const ROOM_REFRESH_MS = 2200;

const avatarPresets = [
  { seed: 'Nico pro player', label: 'Nico', type: 'Hombre' },
  { seed: 'Sofi card master', label: 'Sofi', type: 'Mujer' },
  { seed: 'Marco poker cap', label: 'Marco', type: 'Hombre' },
  { seed: 'Vale golden player', label: 'Vale', type: 'Mujer' },
  { seed: 'Leo vip table', label: 'Leo', type: 'Hombre' },
  { seed: 'Luna neon cards', label: 'Luna', type: 'Mujer' }
];

const games = [
  { id: 'bj', icon: 'A♠', title: '21 Flash', desc: 'Blackjack rápido con turnos online.', accent: 'blue' },
  { id: 'holdem', icon: '♠', title: "Hold’em Social", desc: 'Mesa social, lectura y presión.', accent: 'gold' },
  { id: 'rummy', icon: 'J♥', title: 'Rummy Parejas', desc: 'Roba, combina y toca.', accent: 'pink' },
  { id: 'gem', icon: '◆', title: 'Gem Clash', desc: 'Gemas y decisiones rápidas.', accent: 'cyan' }
];

const suits = [
  { suit: '♠', color: 'black' },
  { suit: '♥', color: 'red' },
  { suit: '♦', color: 'red' },
  { suit: '♣', color: 'black' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function randomCode(size = 5) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function loadProfile() {
  const keys = [PROFILE_KEY, 'mesacards_profile_v9', 'mesacards_profile_v7', 'mesacards_profile_v6'];
  for (const key of keys) {
    try {
      const profile = JSON.parse(localStorage.getItem(key));
      if (profile?.name) return profile;
    } catch {}
  }
  return null;
}

function saveProfileLocal(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: Date.now() }));
}

function avatarUrl(seed = 'MesaCards') {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0b1021,101b31,17213a&radius=50`;
}

function deck() {
  const cards = [];
  for (const suit of suits) {
    for (const rank of ranks) cards.push({ rank, suit: suit.suit, color: suit.color });
  }
  return shuffle(cards);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function drawCards(source, amount = 1) {
  return source.splice(0, amount);
}

function bjValue(cards = []) {
  let total = 0;
  let aces = 0;
  cards.forEach(card => {
    if (card.rank === 'A') {
      total += 11;
      aces += 1;
    } else {
      total += Math.min(10, Number(card.rank) || 10);
    }
  });
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function cardText(card) {
  return card ? `${card.rank}${card.suit}` : '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatError(error) {
  if (!error) return 'Error desconocido';
  return error.message || error.details || error.hint || error.code || String(error);
}

function playerFromRow(row) {
  const profile = row.guest_profiles || row.profile || {};
  return {
    device_id: row.device_id,
    seat_number: row.seat_number || 0,
    name: profile.display_name || profile.name || 'Jugador',
    avatar: profile.avatar || profile.display_name || row.device_id,
    code: profile.player_code || 'MC'
  };
}

function buildBlackjackState(players) {
  const cards = deck();
  const hands = players.map((player, index) => ({
    device_id: player.device_id,
    name: player.name,
    avatar: player.avatar,
    cards: drawCards(cards, 2),
    chips: 5000,
    bet: 500,
    status: 'playing',
    result: '',
    seat: index + 1
  }));
  return {
    phase: 'blackjack',
    game: 'bj',
    deck: cards,
    dealer: drawCards(cards, 2),
    turn: 0,
    round: 1,
    startedAt: Date.now(),
    settings: { rounds: 10, initialChips: 5000, timer: 30, minBet: 100 },
    hands,
    log: ['La mesa empezó 21 Flash.', `${hands[0]?.name || 'Jugador'} tiene el primer turno.`]
  };
}

function finishBlackjack(gameState) {
  while (bjValue(gameState.dealer) < 17 && gameState.deck.length) {
    gameState.dealer.push(...drawCards(gameState.deck, 1));
  }
  const dealerScore = bjValue(gameState.dealer);
  gameState.hands = gameState.hands.map(hand => {
    const score = bjValue(hand.cards);
    let result = 'Empate';
    let chips = hand.chips;
    if (score > 21) {
      result = 'Pierde';
      chips = Math.max(0, chips - hand.bet);
    } else if (dealerScore > 21 || score > dealerScore) {
      result = 'Gana';
      chips += hand.bet;
    } else if (score < dealerScore) {
      result = 'Pierde';
      chips = Math.max(0, chips - hand.bet);
    }
    return { ...hand, status: 'done', result, chips };
  });
  gameState.phase = 'roundEnd';
  gameState.turn = -1;
  gameState.log = [`Banca termina con ${dealerScore}.`, ...gameState.hands.map(h => `${h.name}: ${h.result} con ${bjValue(h.cards)}.`), ...(gameState.log || [])].slice(0, 16);
  return gameState;
}

function advanceBlackjackTurn(gameState) {
  const next = gameState.hands.findIndex((hand, index) => index > gameState.turn && hand.status === 'playing' && bjValue(hand.cards) <= 21);
  if (next >= 0) {
    gameState.turn = next;
    gameState.log = [`Turno de ${gameState.hands[next].name}.`, ...(gameState.log || [])].slice(0, 16);
    return gameState;
  }
  return finishBlackjack(gameState);
}

function PlayingCard({ card, hidden = false }) {
  if (hidden || !card) return <div className="playing-card back"><span>♣</span></div>;
  return (
    <div className={`playing-card ${card.color}`}>
      <b>{card.rank}</b>
      <span>{card.suit}</span>
    </div>
  );
}

function Avatar({ seed, className = '', badge = true }) {
  return (
    <span className={`avatar ${className}`}>
      <img src={avatarUrl(seed)} alt="" />
      {badge && <i />}
    </span>
  );
}

function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark">♣</span>
      <span>Mesa<b>Cards</b></span>
    </div>
  );
}

function AppHeader({ profile, onProfile, compact = false, back }) {
  return (
    <header className={`app-header ${compact ? 'compact' : ''}`}>
      {back ? <button className="icon-button" onClick={back} aria-label="Volver">‹</button> : <Logo />}
      {back && <Logo />}
      <div className="header-actions">
        {profile && <button className="plain-avatar" onClick={onProfile}><Avatar seed={profile.avatar || profile.name} /></button>}
        <div className="balance"><span className="coin" />12.450<button>＋</button></div>
      </div>
    </header>
  );
}

function BottomNav({ active, setScreen }) {
  const items = [
    ['home', '⌂', 'Inicio'],
    ['friends', '👥', 'Amigos'],
    ['rooms', '♣', 'Salas'],
    ['profile', '♙', 'Perfil']
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([id, icon, label]) => (
        <button key={id} className={active === id ? 'active' : ''} onClick={() => setScreen(id)}>
          <span>{icon}</span>{label}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [profile, setProfile] = useState(loadProfile);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [screen, setScreen] = useState(() => (loadProfile() ? 'home' : 'profile'));
  const [profileMode, setProfileMode] = useState(() => (loadProfile() ? 'edit' : 'create'));
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [roomBundle, setRoomBundle] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [pendingInvite, setPendingInvite] = useState(() => new URLSearchParams(window.location.search).get('room') || '');
  const [selectedGame, setSelectedGame] = useState('bj');

  const notify = useCallback(message => {
    setToast(message);
    window.clearTimeout(window.__mesaToastTimer);
    window.__mesaToastTimer = window.setTimeout(() => setToast(''), 2300);
  }, []);

  const saveProfile = useCallback(nextProfile => {
    const saved = {
      ...nextProfile,
      code: nextProfile.code || profile?.code || `MC-${randomCode(6)}`,
      createdAt: nextProfile.createdAt || profile?.createdAt || Date.now()
    };
    saveProfileLocal(saved);
    setProfile(saved);
    setProfileMode('edit');
  }, [profile]);

  const syncProfile = useCallback(async (current = profile) => {
    if (!current?.name) return null;
    const { data, error } = await supabase
      .from('guest_profiles')
      .upsert({
        device_id: deviceId,
        display_name: current.name.slice(0, 18),
        avatar: current.avatar || current.name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'device_id' })
      .select('*')
      .single();
    if (error) {
      notify(`Online no conectado: ${formatError(error)}`);
      return null;
    }
    setRemoteProfile(data);
    if (data?.player_code && data.player_code !== current.code) {
      const updated = { ...current, code: data.player_code };
      saveProfileLocal(updated);
      setProfile(updated);
    }
    return data;
  }, [deviceId, notify, profile]);

  const refreshSocial = useCallback(async () => {
    if (!profile?.name) return;
    try {
      const [{ count }, requestRes, friendshipRes] = await Promise.all([
        supabase.from('guest_profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('guest_friendships')
          .select('id, requester_device, status, guest_profiles!guest_friendships_requester_device_fkey(device_id, display_name, avatar, player_code, updated_at)')
          .eq('receiver_device', deviceId)
          .eq('status', 'pending')
          .limit(20),
        supabase
          .from('guest_friendships')
          .select('id, requester_device, receiver_device, status')
          .eq('status', 'accepted')
          .or(`requester_device.eq.${deviceId},receiver_device.eq.${deviceId}`)
          .limit(40)
      ]);
      setOnlineCount(typeof count === 'number' ? count : null);
      setRequests((requestRes.data || []).map(row => ({ id: row.id, ...row.guest_profiles })));
      const ids = [...new Set((friendshipRes.data || []).map(row => row.requester_device === deviceId ? row.receiver_device : row.requester_device))];
      if (ids.length) {
        const profiles = await supabase.from('guest_profiles').select('device_id, display_name, avatar, player_code, updated_at').in('device_id', ids);
        setFriends(profiles.data || []);
      } else setFriends([]);
    } catch {
      setOnlineCount(null);
    }
  }, [deviceId, profile]);

  const refreshRoomBundle = useCallback(async (id = roomId) => {
    if (!id) return null;
    const roomRes = await supabase.from('guest_rooms').select('*').eq('id', id).single();
    if (roomRes.error) {
      notify(`No se pudo cargar la sala: ${formatError(roomRes.error)}`);
      return null;
    }
    const playersRes = await supabase
      .from('guest_room_players')
      .select('device_id, seat_number, joined_at, guest_profiles(device_id, display_name, avatar, player_code, updated_at)')
      .eq('room_id', id)
      .order('seat_number', { ascending: true });
    if (playersRes.error) {
      notify(`No se pudieron cargar jugadores: ${formatError(playersRes.error)}`);
      return null;
    }
    const bundle = { room: roomRes.data, players: (playersRes.data || []).map(playerFromRow) };
    setRoomBundle(bundle);
    return bundle;
  }, [notify, roomId]);

  useEffect(() => {
    if (!profile?.name) return;
    syncProfile();
    refreshSocial();
    const timer = window.setInterval(refreshSocial, 12000);
    return () => window.clearInterval(timer);
  }, [profile?.name, syncProfile, refreshSocial]);

  useEffect(() => {
    if (profile?.name && pendingInvite) setScreen('invite');
  }, [pendingInvite, profile?.name]);

  useEffect(() => {
    if (!roomId) return;
    refreshRoomBundle(roomId);
    const timer = window.setInterval(() => refreshRoomBundle(roomId), ROOM_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [roomId, refreshRoomBundle]);

  async function searchPlayers(query) {
    const q = query.trim();
    if (q.length < 2) return notify('Escribe un ID o nombre más claro.');
    setLoading(true);
    let req = supabase.from('guest_profiles').select('device_id, display_name, avatar, player_code, updated_at').limit(12);
    req = q.toUpperCase().startsWith('MC') ? req.ilike('player_code', `%${q.toUpperCase()}%`) : req.ilike('display_name', `%${q}%`);
    const { data, error } = await req;
    setLoading(false);
    if (error) return notify(formatError(error));
    setSearchResults((data || []).filter(player => player.device_id !== deviceId));
  }

  async function addFriend(targetDevice) {
    const { error } = await supabase.from('guest_friendships').insert({ requester_device: deviceId, receiver_device: targetDevice, status: 'pending' });
    if (error) notify('Ya existe amistad o solicitud con ese jugador.');
    else notify('Solicitud enviada.');
  }

  async function answerRequest(id, accept) {
    const { error } = await supabase
      .from('guest_friendships')
      .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return notify(formatError(error));
    notify(accept ? 'Amigo agregado.' : 'Solicitud rechazada.');
    refreshSocial();
  }

  async function createRoom(game = selectedGame) {
    if (!profile?.name) {
      setProfileMode('create');
      setScreen('profile');
      return;
    }
    setLoading(true);
    await syncProfile();
    const code = randomCode(5);
    const { data, error } = await supabase
      .from('guest_rooms')
      .insert({
        room_code: code,
        host_device: deviceId,
        game_key: game,
        max_players: 6,
        game_state: { phase: 'lobby', game, createdAt: Date.now(), settings: { rounds: 10, initialChips: 5000, timer: 30 } }
      })
      .select('*')
      .single();
    if (error) {
      setLoading(false);
      return notify(`No se pudo crear sala: ${formatError(error)}`);
    }
    await supabase.from('guest_room_players').upsert({ room_id: data.id, device_id: deviceId, seat_number: 1 }, { onConflict: 'room_id,device_id' });
    setRoomId(data.id);
    setRoomBundle({ room: data, players: [{ device_id: deviceId, seat_number: 1, name: profile.name, avatar: profile.avatar, code: profile.code }] });
    setScreen('lobby');
    setLoading(false);
    notify('Sala creada. Comparte el código o link.');
  }

  async function joinRoom(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return notify('Escribe el código de sala.');
    if (!profile?.name) {
      setPendingInvite(clean);
      setProfileMode('create');
      setScreen('profile');
      return;
    }
    setLoading(true);
    await syncProfile();
    const { data: room, error } = await supabase.from('guest_rooms').select('*').eq('room_code', clean).maybeSingle();
    if (error || !room) {
      setLoading(false);
      return notify('Sala no encontrada. Revisa el código.');
    }
    const current = await supabase.from('guest_room_players').select('device_id').eq('room_id', room.id);
    const seat = (current.data || []).findIndex(row => row.device_id === deviceId) + 1 || (current.data || []).length + 1;
    await supabase.from('guest_room_players').upsert({ room_id: room.id, device_id: deviceId, seat_number: seat }, { onConflict: 'room_id,device_id' });
    setRoomId(room.id);
    setRoomCodeInput('');
    setPendingInvite('');
    window.history.replaceState({}, '', window.location.pathname);
    await refreshRoomBundle(room.id);
    setScreen('lobby');
    setLoading(false);
    notify('Entraste a la sala.');
  }

  async function startRoomGame() {
    if (!roomBundle?.room) return;
    if (roomBundle.room.host_device !== deviceId) return notify('Solo el anfitrión puede empezar.');
    if ((roomBundle.players || []).length < 1) return notify('Agrega al menos un jugador.');
    if (roomBundle.room.game_key !== 'bj') return notify('Primero dejé completo 21 Flash online. Los otros modos quedan preparados.');
    const gameState = buildBlackjackState(roomBundle.players);
    const { error } = await supabase.from('guest_rooms').update({ game_state: gameState }).eq('id', roomBundle.room.id);
    if (error) return notify(formatError(error));
    await refreshRoomBundle(roomBundle.room.id);
    notify('Partida iniciada.');
  }

  async function updateGameState(nextGameState) {
    if (!roomBundle?.room?.id) return;
    const { error } = await supabase.from('guest_rooms').update({ game_state: nextGameState }).eq('id', roomBundle.room.id);
    if (error) return notify(formatError(error));
    setRoomBundle(current => current ? { ...current, room: { ...current.room, game_state: nextGameState } } : current);
  }

  async function blackjackAction(action) {
    const gameState = clone(roomBundle?.room?.game_state || {});
    if (gameState.phase !== 'blackjack') return;
    const hand = gameState.hands?.[gameState.turn];
    if (!hand) return;
    if (hand.device_id !== deviceId) return notify('Aún no es tu turno.');
    if (action === 'hit') {
      hand.cards.push(...drawCards(gameState.deck, 1));
      const score = bjValue(hand.cards);
      gameState.log = [`${hand.name} pidió carta y tiene ${score}.`, ...(gameState.log || [])].slice(0, 16);
      if (score > 21) {
        hand.status = 'done';
        hand.result = 'Se pasó';
        advanceBlackjackTurn(gameState);
      }
    }
    if (action === 'stand') {
      hand.status = 'done';
      hand.result = 'Plantado';
      gameState.log = [`${hand.name} se plantó con ${bjValue(hand.cards)}.`, ...(gameState.log || [])].slice(0, 16);
      advanceBlackjackTurn(gameState);
    }
    await updateGameState(gameState);
  }

  async function restartBlackjack() {
    if (!roomBundle?.players?.length) return;
    const gameState = buildBlackjackState(roomBundle.players);
    gameState.round = ((roomBundle.room.game_state?.round || 1) + 1);
    await updateGameState(gameState);
  }

  async function shareRoom() {
    const code = roomBundle?.room?.room_code;
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'MesaCards', text: `Únete a mi sala ${code} de MesaCards`, url });
      else {
        await navigator.clipboard.writeText(url);
        notify('Link copiado.');
      }
    } catch {}
  }

  const openProfile = () => {
    setProfileMode(profile ? 'edit' : 'create');
    setScreen('profile');
  };

  const activeGame = roomBundle?.room?.game_state;
  const shouldShowBlackjack = activeGame?.phase === 'blackjack' || activeGame?.phase === 'roundEnd';

  let content;
  if (!profile || screen === 'profile') {
    content = <ProfileScreen profile={profile} mode={profileMode} saveProfile={saveProfile} back={profile ? () => setScreen('home') : null} afterCreate={() => pendingInvite ? setScreen('invite') : setScreen('home')} />;
  } else if (screen === 'invite') {
    content = <InvitationScreen code={pendingInvite} profile={profile} joinRoom={joinRoom} reject={() => { setPendingInvite(''); setScreen('home'); }} />;
  } else if (shouldShowBlackjack && roomBundle) {
    content = <BlackjackScreen bundle={roomBundle} deviceId={deviceId} profile={profile} action={blackjackAction} restart={restartBlackjack} back={() => setScreen('lobby')} openProfile={openProfile} />;
  } else if (screen === 'friends') {
    content = <FriendsScreen profile={profile} remoteProfile={remoteProfile} friends={friends} requests={requests} searchResults={searchResults} loading={loading} searchPlayers={searchPlayers} addFriend={addFriend} answerRequest={answerRequest} setScreen={setScreen} openProfile={openProfile} />;
  } else if (screen === 'rooms') {
    content = <RoomsScreen selectedGame={selectedGame} setSelectedGame={setSelectedGame} roomCodeInput={roomCodeInput} setRoomCodeInput={setRoomCodeInput} createRoom={createRoom} joinRoom={joinRoom} loading={loading} setScreen={setScreen} profile={profile} openProfile={openProfile} />;
  } else if (screen === 'lobby' && roomBundle) {
    content = <LobbyScreen bundle={roomBundle} deviceId={deviceId} profile={profile} startRoomGame={startRoomGame} shareRoom={shareRoom} setScreen={setScreen} openProfile={openProfile} />;
  } else if (screen === 'holdem') {
    content = <HoldemPreview profile={profile} setScreen={setScreen} openProfile={openProfile} />;
  } else {
    content = <HomeScreen profile={profile} onlineCount={onlineCount} friends={friends} createRoom={createRoom} setSelectedGame={setSelectedGame} setScreen={setScreen} openProfile={openProfile} />;
  }

  return (
    <>
      {content}
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

function HomeScreen({ profile, onlineCount, friends, createRoom, setSelectedGame, setScreen, openProfile }) {
  return (
    <main className="page home-page">
      <AppHeader profile={profile} onProfile={openProfile} />
      <section className="hero-card">
        <div className="status-pill"><span />{onlineCount ? `${onlineCount} perfiles online` : 'Online disponible'}</div>
        <div className="daily-bonus">🎁 <b>Bono diario</b><small>Solo puntos virtuales</small></div>
        <h1>Juega cartas<br />con tus <em>amigos</em></h1>
        <p>Cada jugador desde su celular. Salas privadas, turnos sincronizados y cero dinero real.</p>
        <div className="hero-chip">♣</div>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => createRoom('bj')}>▶ Jugar ahora</button>
          <button className="btn outline" onClick={() => setScreen('friends')}>👥 Invitar amigos</button>
        </div>
      </section>
      <div className="mode-tabs">
        <button className="active" onClick={() => setScreen('rooms')}>🌐 Online</button>
        <button onClick={() => createRoom('bj')}>📱 Local</button>
        <button onClick={() => setScreen('rooms')}>🚪 Salas</button>
      </div>
      <section className="game-grid">
        {games.map(game => (
          <button key={game.id} className={`game-card ${game.accent}`} onClick={() => {
            setSelectedGame(game.id);
            game.id === 'holdem' ? setScreen('holdem') : setScreen('rooms');
          }}>
            <i>{game.icon}</i>
            <b>{game.title}</b>
            <small>{game.desc}</small>
            <span>›</span>
          </button>
        ))}
      </section>
      <section className="panel friends-panel">
        <header><h2>Amigos conectados</h2><button onClick={() => setScreen('friends')}>Ver todos ›</button></header>
        <div className="friend-row">
          {friends.length ? friends.slice(0, 4).map(friend => <div className="mini-friend" key={friend.device_id}><Avatar seed={friend.avatar || friend.display_name} /><span>{friend.display_name}</span></div>) : <p className="empty-text">Agrega amigos por ID para verlos aquí.</p>}
          <button className="add-friend" onClick={() => setScreen('friends')}>＋<span>Invitar</span></button>
        </div>
      </section>
      <BottomNav active="home" setScreen={setScreen} />
    </main>
  );
}

function ProfileScreen({ profile, mode, saveProfile, back, afterCreate }) {
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [avatar, setAvatar] = useState(profile?.avatar || avatarPresets[0].seed);
  const [gender, setGender] = useState('Todos');
  const filtered = gender === 'Todos' ? avatarPresets : avatarPresets.filter(item => item.type === gender);
  const chosen = avatarPresets.find(item => item.seed === avatar) || avatarPresets[0];

  function submit() {
    if (name.trim().length < 3) return;
    saveProfile({ ...profile, name: name.trim().slice(0, 18), email: email.trim(), avatar, style: 'Clásico Elite' });
    afterCreate?.();
  }

  return (
    <main className="page profile-page">
      <AppHeader profile={profile} onProfile={() => {}} back={back || undefined} />
      <section className="profile-hero">
        <div>
          <h1>{mode === 'create' ? 'Crea tu perfil' : 'Personaliza tu personaje'}</h1>
          <p>Cada jugador usa su propio celular para jugar.</p>
        </div>
        <div className="hero-chip big">♣</div>
      </section>
      <section className="form-card">
        <label className="field"><span>👤</span><input value={name} onChange={e => setName(e.target.value)} maxLength={18} placeholder="Nombre de jugador" /></label>
        <label className="field"><span>✉</span><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo (opcional)" /></label>
        <label className="field"><span>🌐</span><input value="Español (Latam)" readOnly /></label>
      </section>
      <section className="character-stage">
        <div className="character-preview">
          <Avatar seed={avatar} className="huge" />
          <div>
            <b>{name || chosen.label}</b>
            <span>Nivel 1 · Clásico Elite</span>
          </div>
        </div>
        <div className="segmented"><button className={gender === 'Todos' ? 'active' : ''} onClick={() => setGender('Todos')}>Todos</button><button className={gender === 'Hombre' ? 'active' : ''} onClick={() => setGender('Hombre')}>Hombre</button><button className={gender === 'Mujer' ? 'active' : ''} onClick={() => setGender('Mujer')}>Mujer</button></div>
        <div className="avatar-grid">
          {filtered.map(item => <button key={item.seed} className={avatar === item.seed ? 'active' : ''} onClick={() => setAvatar(item.seed)}><Avatar seed={item.seed} badge={false} /><span>{item.label}</span></button>)}
        </div>
        <div className="custom-tabs"><button>☺ Rostro</button><button>〰 Peinado</button><button className="active">👕 Outfit</button><button>◌ Color</button></div>
        <div className="outfit-grid">{['Clásico Elite', 'Urbano Luxe', 'Trendy Casual', 'Noche VIP'].map((item, index) => <button key={item} className={index === 0 ? 'active' : ''}><span>{index === 0 ? '♠' : index === 1 ? '◆' : index === 2 ? '♣' : '♥'}</span>{item}</button>)}</div>
        <div className="safe-check"><span>✓</span><p>Acepto jugar solo con fichas virtuales. No hay dinero real involucrado.</p></div>
        <button className="btn primary full" onClick={submit}>▶ {mode === 'create' ? 'Continuar' : 'Guardar personaje'}</button>
        {mode === 'create' && <button className="btn outline full" onClick={submit}>Ya tengo perfil</button>}
      </section>
    </main>
  );
}

function FriendsScreen({ profile, remoteProfile, friends, requests, searchResults, loading, searchPlayers, addFriend, answerRequest, setScreen, openProfile }) {
  const [query, setQuery] = useState('');
  return (
    <main className="page">
      <AppHeader profile={profile} onProfile={openProfile} />
      <section className="profile-summary">
        <Avatar seed={profile.avatar || profile.name} />
        <div><h2>{profile.name}</h2><p>ID: <b>{remoteProfile?.player_code || profile.code}</b></p></div>
        <div className="stat"><b>12.450</b><span>Puntos</span></div>
        <div className="stat"><b>0</b><span>Racha</span></div>
      </section>
      <form className="search-bar" onSubmit={e => { e.preventDefault(); searchPlayers(query); }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por ID o nombre" />
        <button disabled={loading}>⌕</button>
      </form>
      <div className="social-tabs"><button className="active">👥 Amigos</button><button>➕ Solicitudes <b>{requests.length}</b></button><button>◷ Recientes</button></div>
      {searchResults.length > 0 && <section className="panel list"><h2>Resultados</h2>{searchResults.map(player => <PlayerRow key={player.device_id} player={player} action="Agregar" onClick={() => addFriend(player.device_id)} />)}</section>}
      <section className="panel list"><header><h2>Solicitudes ({requests.length})</h2></header>{requests.length ? requests.map(req => <div className="request-row" key={req.id}><Avatar seed={req.avatar || req.display_name} /><div><b>{req.display_name}</b><small>Quiere agregarte como amigo</small></div><button className="btn mini outline" onClick={() => answerRequest(req.id, false)}>Rechazar</button><button className="btn mini primary" onClick={() => answerRequest(req.id, true)}>Aceptar</button></div>) : <p className="empty-text">No tienes solicitudes pendientes.</p>}</section>
      <section className="panel list"><header><h2>Amigos conectados ({friends.length})</h2><button onClick={() => setScreen('rooms')}>Crear sala ›</button></header>{friends.length ? friends.map(friend => <PlayerRow key={friend.device_id} player={friend} action="Invitar" onClick={() => setScreen('rooms')} />) : <p className="empty-text">Busca a alguien por ID para agregarlo.</p>}</section>
      <section className="panel share-card"><div className="qr">▦</div><div><h2>Compartir perfil</h2><p>Comparte tu ID para que te agreguen.</p><code>{remoteProfile?.player_code || profile.code}</code></div></section>
      <BottomNav active="friends" setScreen={setScreen} />
    </main>
  );
}

function PlayerRow({ player, action, onClick }) {
  return <div className="player-row"><Avatar seed={player.avatar || player.display_name} /><div><b>{player.display_name}</b><small>{player.player_code || 'En línea'}</small></div><button className="btn mini outline" onClick={onClick}>{action}</button></div>;
}

function RoomsScreen({ selectedGame, setSelectedGame, roomCodeInput, setRoomCodeInput, createRoom, joinRoom, loading, setScreen, profile, openProfile }) {
  return (
    <main className="page">
      <AppHeader profile={profile} onProfile={openProfile} />
      <section className="section-title"><h1>Salas privadas</h1><p>Crea una sala o entra con código. Cada jugador juega desde su celular.</p></section>
      <section className="panel room-maker">
        <h2>Elige juego</h2>
        <div className="game-picker">{games.map(game => <button key={game.id} className={selectedGame === game.id ? 'active' : ''} onClick={() => setSelectedGame(game.id)}><i>{game.icon}</i><b>{game.title}</b><small>{game.id === 'bj' ? 'Online real listo' : 'Diseño preparado'}</small></button>)}</div>
        <button className="btn primary full" disabled={loading} onClick={() => createRoom(selectedGame)}>{loading ? 'Creando...' : 'Crear sala'}</button>
      </section>
      <section className="panel join-card"><h2>Entrar a sala</h2><div className="join-form"><input value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="Código de sala" /><button className="btn primary" onClick={() => joinRoom(roomCodeInput)}>Entrar</button></div></section>
      <section className="panel tips"><h2>Estado del online</h2><p><b>21 Flash</b> ya usa lobby y turnos sincronizados. Los otros juegos quedan con pantalla premium y se conectan después sobre la misma base.</p></section>
      <BottomNav active="rooms" setScreen={setScreen} />
    </main>
  );
}

function InvitationScreen({ code, profile, joinRoom, reject }) {
  return (
    <main className="page invite-page">
      <AppHeader profile={profile} onProfile={() => {}} />
      <section className="invite-card">
        <h1>Invitación a jugar</h1>
        <p>Te invitaron a una sala en tiempo real.</p>
        <div className="invite-hero"><Avatar seed="Invitacion MesaCards" className="large" /><div><h2>Mesa privada</h2><span>Código de sala</span><b>{code}</b></div><div className="floating-card">A♠</div></div>
        <div className="invite-info"><div><span>Juego</span><b>21 Flash</b><small>Rondas rápidas contra la banca.</small></div><div><span>Jugadores</span><b>1-6</b><small>Hay lugar disponible</small></div></div>
        <div className="invite-actions"><button className="btn primary" onClick={() => joinRoom(code)}>✓ Aceptar</button><button className="btn danger" onClick={reject}>✕ Rechazar</button></div>
      </section>
    </main>
  );
}

function LobbyScreen({ bundle, deviceId, profile, startRoomGame, shareRoom, setScreen, openProfile }) {
  const { room, players } = bundle;
  const host = room.host_device === deviceId;
  const settings = room.game_state?.settings || {};
  return (
    <main className="page lobby-page">
      <AppHeader profile={profile} onProfile={openProfile} back={() => setScreen('rooms')} />
      <section className="lobby-card">
        <div className="lobby-head"><div className="glow-card">A♠</div><div><h1>{room.game_key === 'bj' ? '21 Flash' : "Hold’em Social"} <small>· Sala privada</small></h1><p>Código de sala <b>{room.room_code}</b> <button onClick={() => navigator.clipboard?.writeText(room.room_code)}>⧉</button></p><span className="online-dot">● Online</span></div></div>
        <p className="device-note">📱 Cada quien juega desde su propio celular.</p>
        <div className="seat-grid">
          {players.map(player => <div key={player.device_id} className={`seat-card ${player.device_id === room.host_device ? 'host' : ''}`}><Avatar seed={player.avatar || player.name} className="large" /><h3>{player.name}</h3><p>{player.device_id === room.host_device ? '★ Anfitrión' : '✓ Listo'}</p></div>)}
          {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => <button className="seat-card empty" key={i} onClick={shareRoom}>＋<span>Invitar</span></button>)}
        </div>
        <div className="lobby-actions"><button className="btn outline" onClick={shareRoom}>↗ Compartir sala</button><button className="btn outline" onClick={shareRoom}>👥 Invitar amigos</button></div>
        {host ? <button className="btn primary full" onClick={startRoomGame}>▶ Empezar partida</button> : <button className="btn outline full" disabled>Esperando al anfitrión</button>}
      </section>
      <div className="two-cols"><section className="panel"><h2>⚙ Ajustes de la partida</h2><InfoLine label="Rondas" value={settings.rounds || 10} /><InfoLine label="Fichas iniciales" value={(settings.initialChips || 5000).toLocaleString('es-EC')} /><InfoLine label="Límite de tiempo" value={`${settings.timer || 30} seg`} /></section><section className="panel"><h2>💬 Actividad</h2>{players.map(player => <InfoLine key={player.device_id} label={`${player.name} está listo`} value="●" />)}</section></div>
      <BottomNav active="rooms" setScreen={setScreen} />
    </main>
  );
}

function InfoLine({ label, value }) {
  return <div className="info-line"><span>{label}</span><b>{value}</b></div>;
}

function BlackjackScreen({ bundle, deviceId, profile, action, restart, back, openProfile }) {
  const game = bundle.room.game_state;
  const hands = game.hands || [];
  const myHand = hands.find(hand => hand.device_id === deviceId) || hands[0];
  const current = hands[game.turn];
  const isMyTurn = current?.device_id === deviceId && game.phase === 'blackjack';
  const dealerScore = game.phase === 'roundEnd' ? bjValue(game.dealer) : bjValue((game.dealer || []).slice(0, 1));
  return (
    <main className="game-page">
      <header className="game-header"><button className="icon-button" onClick={back}>‹</button><div className="game-title"><b>21 Flash</b><small>Sala {bundle.room.room_code}</small></div><div className="balance"><span className="coin" />{myHand?.chips?.toLocaleString('es-EC') || '0'}</div><button className="icon-button" onClick={openProfile}>☰</button></header>
      <section className="table-stage">
        <div className="table-status"><span>● En línea</span><b>{hands.length} jugadores</b></div>
        <div className="timer">◷ 00:{isMyTurn ? '30' : '18'}</div>
        <div className="dealer-zone"><Avatar seed="Banca MesaCards" /><strong>Banca</strong><div className="cards-row">{(game.dealer || []).map((card, index) => <PlayingCard key={index} card={card} hidden={game.phase !== 'roundEnd' && index === 1} />)}</div><b className="score-box">{dealerScore}</b><p>La banca debe plantarse en 17 o más.</p></div>
        <div className="opponents-ring">{hands.filter(hand => hand.device_id !== deviceId).slice(0, 4).map(hand => <div key={hand.device_id} className={`opponent ${current?.device_id === hand.device_id ? 'turn' : ''}`}><Avatar seed={hand.avatar || hand.name} /><b>{hand.name}</b><span>{hand.status === 'playing' ? (current?.device_id === hand.device_id ? 'Turno' : 'Esperando') : hand.result}</span><small>🪙 {hand.chips}</small></div>)}</div>
        <div className="my-zone"><div className="bet-box">Tu apuesta <b>🪙 {myHand?.bet || 500}</b></div><div className="cards-row big">{(myHand?.cards || []).map((card, index) => <PlayingCard key={index} card={card} />)}</div><div className="me-badge"><Avatar seed={profile.avatar || profile.name} /><b>Tú</b><span>{bjValue(myHand?.cards || [])}</span></div></div>
      </section>
      <section className="action-zone">{game.phase === 'roundEnd' ? <><button className="btn primary" onClick={restart}>Nueva ronda</button><button className="btn outline" onClick={back}>Lobby</button></> : <><button className="btn blue" disabled={!isMyTurn} onClick={() => action('hit')}>🃏 Pedir</button><button className="btn gold" disabled={!isMyTurn} onClick={() => action('stand')}>✋ Plantarse</button></>}</section>
      <section className="panel activity"><header><h2>Actividad de la mesa</h2></header>{(game.log || []).slice(0, 5).map((item, index) => <p key={index}>{item}</p>)}</section>
    </main>
  );
}

function HoldemPreview({ profile, setScreen, openProfile }) {
  return (
    <main className="game-page holdem-page">
      <header className="game-header"><button className="icon-button" onClick={() => setScreen('home')}>‹</button><div className="game-title"><b>Hold’em Social</b><small>Mesa Social 24 · Vista premium</small></div><button className="icon-button" onClick={openProfile}>☰</button></header>
      <section className="poker-table">
        <div className="pot">Pozo total <b>12,50</b></div>
        <div className="community-cards"><PlayingCard card={{ rank: 'A', suit: '♠', color: 'black' }} /><PlayingCard card={{ rank: 'K', suit: '♥', color: 'red' }} /><PlayingCard card={{ rank: 'Q', suit: '♦', color: 'red' }} /><PlayingCard card={{ rank: '7', suit: '♣', color: 'black' }} /><PlayingCard hidden /></div>
        <div className="me-badge poker"><Avatar seed={profile.avatar || profile.name} /><b>Tú</b><span>112,30</span></div>
        <div className="cards-row big"><PlayingCard card={{ rank: 'J', suit: '♠', color: 'black' }} /><PlayingCard card={{ rank: '10', suit: '♠', color: 'black' }} /></div>
      </section>
      <section className="raise-panel"><span>Mín. 2,50</span><b>Subir a 4,00</b><span>Bote 12,50</span></section>
      <section className="action-zone"><button className="btn danger">Retirarse</button><button className="btn blue">Pasar</button><button className="btn primary">Subir 4,00</button></section>
      <section className="panel tips"><p>Esta pantalla ya queda visualmente preparada. La lógica online completa de Hold’em se conecta después de estabilizar 21 Flash.</p></section>
    </main>
  );
}
