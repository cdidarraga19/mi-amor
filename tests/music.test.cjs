const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../js/music.js'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../json/musica.json'), 'utf8'));

async function setup(saved = null) {
  const nodes = new Map();
  function node() {
    return { value: '', hidden: false, paused: true, children: [], attributes: {}, events: {},
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); },
      pause() { this.paused = true; this.events.pause?.(); },
      async play() { this.paused = false; this.events.play?.(); },
      setCustomValidity(value) { this.validationMessage = value; },
      reportValidity() { return !this.validationMessage; }, focus() {}
    };
  }
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  let stored = saved;
  vm.runInNewContext(code, {
    document: { getElementById: get, createElement: node, addEventListener() {} },
    localStorage: { getItem: () => stored, setItem: (key, value) => { stored = value; } },
    URL, fetch: async () => ({ ok: true, json: async () => config })
  });
  await new Promise(resolve => setImmediate(resolve));
  return { get, stored: () => JSON.parse(stored), emit: (id, name) => get(id).events[name]({ preventDefault() {} }) };
}

test('carga la playlist configurada y detiene una fuente al cambiar a la otra', async () => {
  const { get, emit } = await setup();
  assert.equal(get('music-source').value, 'spotify');
  assert.equal(get('spotify-embed').children[0].src, config.spotifyPlaylist.replace('/playlist/', '/embed/playlist/') + '?utm_source=generator');
  get('music-source').value = 'local';
  emit('music-source', 'change');
  assert.equal(get('spotify-embed').children.length, 0);
  await emit('local-play', 'click');
  assert.equal(get('bg-music').paused, false);
  get('music-source').value = 'spotify';
  emit('music-source', 'change');
  assert.equal(get('bg-music').paused, true);
});

test('el volumen controla el audio, incluye silencio y se conserva', async () => {
  const { get, emit, stored } = await setup();
  assert.equal(get('bg-music').volume, 0.5);
  for (const value of [0, 35, 100]) {
    get('music-volume').value = String(value);
    emit('music-volume', 'input');
    assert.equal(get('bg-music').volume, value / 100);
    assert.equal(stored().volume, value);
  }
  const restored = await setup(JSON.stringify({ volume: 35, source: 'local' }));
  assert.equal(restored.get('bg-music').volume, 0.35);
  assert.equal(restored.get('music-source').value, 'local');
});

test('rechaza enlaces ajenos y acepta enlaces de Spotify con parámetros', async () => {
  const { get, emit, stored } = await setup();
  get('spotify-url').value = 'https://example.com/playlist/27r1fgMBYEDofv0Fc3E1tI';
  emit('spotify-form', 'submit');
  assert(get('spotify-url').validationMessage);
  get('spotify-url').value = config.spotifyPlaylist + '?si=example';
  emit('spotify-form', 'submit');
  assert.equal(get('spotify-url').validationMessage, '');
  assert.equal(stored().playlist, config.spotifyPlaylist);
});
