'use strict';

(() => {
  const get = id => document.getElementById(id);
  const audio = get('bg-music');
  const panel = get('music-panel');
  const toggle = get('music-toggle');
  const source = get('music-source');
  const volume = get('music-volume');
  const play = get('local-play');
  const key = 'mi-amor.music.v1';
  let playlist = '';
  let interacted = false;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* Preferencias opcionales. */ }

  function playlistURL(value) {
    try {
      const url = new URL(value);
      const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?playlist\/([a-zA-Z0-9]{22})\/?$/);
      if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.port || url.username || url.password || !match) return '';
      return 'https://open.spotify.com/playlist/' + match[1];
    } catch { return ''; }
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify({ playlist, source: source.value, volume: Number(volume.value) }));
    } catch {
      get('music-status').textContent = 'Puedes escuchar música, pero no pudimos recordar tus preferencias en este navegador.';
    }
  }
  function setVolume(value) {
    const amount = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
    volume.value = amount;
    audio.volume = amount / 100;
    get('volume-value').value = amount + ' %';
    volume.setAttribute('aria-valuetext', amount + ' por ciento');
  }
  function renderSource() {
    const spotify = source.value === 'spotify';
    audio.pause();
    get('local-player').hidden = spotify;
    get('spotify-player').hidden = !spotify;
    // Desmontar el iframe detiene Spotify al volver a la canción local.
    get('spotify-embed').replaceChildren();
    get('spotify-link').hidden = !playlist;
    if (!spotify || !playlist) return;
    const iframe = document.createElement('iframe');
    iframe.title = 'Nuestra playlist de Spotify';
    iframe.src = playlist.replace('/playlist/', '/embed/playlist/') + '?utm_source=generator';
    iframe.width = '100%';
    iframe.height = '352';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    get('spotify-embed').appendChild(iframe);
    get('spotify-link').href = playlist;
  }
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar controles de música' : 'Abrir controles de música');
    toggle.title = open ? 'Cerrar música' : 'Abrir música';
    if (open) source.focus();
    else toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  get('music-close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  function updatePlayback() {
    play.textContent = audio.paused ? 'Reproducir canción' : 'Pausar canción';
    play.setAttribute('aria-pressed', String(!audio.paused));
  }
  audio.addEventListener('play', () => {
    if (source.value !== 'local') audio.pause();
    updatePlayback();
  });
  audio.addEventListener('pause', updatePlayback);
  play.addEventListener('click', async () => {
    interacted = true;
    get('music-status').textContent = '';
    if (!audio.paused) return audio.pause();
    try { await audio.play(); }
    catch { get('music-status').textContent = 'No pudimos reproducir la canción. Intenta de nuevo o elige Spotify.'; }
  });
  volume.addEventListener('input', () => {
    interacted = true;
    setVolume(Number(volume.value));
    persist();
  });
  source.addEventListener('change', () => {
    interacted = true;
    get('music-status').textContent = '';
    renderSource();
    persist();
  });
  get('spotify-url').addEventListener('input', () => {
    interacted = true;
    get('spotify-url').setCustomValidity('');
  });
  get('spotify-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = get('spotify-url');
    const url = playlistURL(input.value.trim());
    input.setCustomValidity(url ? '' : 'Pega el enlace completo de una playlist de open.spotify.com/playlist/.');
    if (!input.reportValidity()) return;
    interacted = true;
    playlist = url;
    input.value = url;
    renderSource();
    get('music-status').textContent = 'Playlist seleccionada. Usa su botón de reproducción; si no carga, pulsa «Abrir en Spotify».';
    persist();
  });

  setVolume(saved.volume);
  playlist = playlistURL(saved.playlist);
  source.value = saved.source === 'spotify' ? 'spotify' : 'local';
  get('spotify-url').value = playlist;
  renderSource();
  fetch('json/musica.json')
    .then(response => { if (!response.ok) throw new Error('Configuración no disponible'); return response.json(); })
    .then(config => {
      if (interacted) return;
      if (typeof saved.volume !== 'number') setVolume(config.volumenInicial);
      if (!playlist) {
        playlist = playlistURL(config.spotifyPlaylist);
        get('spotify-url').value = playlist;
        if (playlist && !saved.source) source.value = 'spotify';
        renderSource();
      }
    })
    .catch(() => { /* La canción y la selección manual funcionan sin configuración. */ });
})();
