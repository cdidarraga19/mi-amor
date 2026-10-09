const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/karito.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const record = id => ({ id, titulo: id, texto: 'Recuerdo\n<script>texto seguro</script>', autor: 'Karito', fecha: '2026-10-09T12:00:00Z', updated_at: '2026-10-09T12:00:00.123456Z' });

async function setup({ initial = [], local = [], configured = true } = {}) {
  const nodes = new Map();
  const listeners = {};
  const intervals = [];
  const node = () => ({ events: {}, children: [], value: '', hidden: false, disabled: false, textContent: '',
    addEventListener(name, fn) { this.events[name] = fn; }, setAttribute() {}, focus() {},
    append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; }, setCustomValidity() {}, reportValidity() { return true; }
  });
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  get('message-author').value = 'Karito';
  get('empty-messages').hidden = true;
  get('message-form').reset = () => { get('message-title').value = ''; get('message-body').value = ''; get('message-author').value = 'Karito'; };
  const state = { records: structuredClone(initial), allowed: true, offline: false, calls: [], description: '', requests: 0, error: null };
  const shared = {
    async init() { if (!configured) throw Object.assign(new Error('Falta configuración'), { code: 'CONFIG' }); },
    async read() { if (state.offline) throw new Error('offline'); return structuredClone(state.records); },
    async save(message) {
      state.calls.push(['save', structuredClone(message)]);
      if (state.offline) throw new Error('offline');
      const original = state.records.find(item => item.id === message.id);
      if (original && original.updated_at !== message.updated_at) throw Object.assign(new Error('conflict'), { code: 'CONFLICT' });
      const saved = { ...record(message.id), ...message, updated_at: '2026-10-09T13:00:00Z' };
      state.records = [saved, ...state.records.filter(item => item.id !== saved.id)];
      return saved;
    },
    async remove(message) {
      state.calls.push(['remove', message.id]);
      if (state.offline) throw new Error('offline');
      state.records = state.records.filter(item => item.id !== message.id);
    },
    async migrate(messages) {
      state.calls.push(['migrate', structuredClone(messages)]);
      if (state.offline) throw new Error('offline');
      const ids = new Set(state.records.map(item => item.id));
      state.records.push(...messages.filter(item => !ids.has(item.id)).map(item => ({ ...item, updated_at: record('').updated_at })));
      return messages.length;
    }
  };
  const context = vm.createContext({
    $: get, element(tag, cls, text) { return Object.assign(node(), { textContent: text }); },
    document: { hidden: false, querySelectorAll() { return get('karito-messages').children.flatMap(card => card.children[3].children); },
      addEventListener(name, fn) { listeners[name] = fn; } },
    window: { addEventListener(name, fn) { listeners[name] = fn; } },
    crypto: { randomUUID: () => 'new-id' }, Intl, Date,
    setInterval(fn, ms) { intervals.push({ fn, ms }); },
    KaritoStorage: { read: () => structuredClone(local) }, KaritoSharedStorage: shared,
    KaritoAccess: { async request(description, action, perform) {
      state.description = description;
      state.requests++;
      if (!state.allowed) return false;
      try { await perform('compartida'); return true; }
      catch (error) { state.error = error; return false; }
    } }
  });
  vm.runInContext(source, context);
  await tick();
  const actions = (index = 0) => get('karito-messages').children[index].children[3].children;
  const submit = () => get('message-form').events.submit({ preventDefault() {} });
  return { get, state, context, actions, submit, intervals, listeners, shared };
}

test('carga mensajes compartidos y actualiza automáticamente sin tocar el borrador', async () => {
  const { get, state, intervals } = await setup({ initial: [record('uno')] });
  assert.equal(get('karito-messages').children.length, 1);
  assert.equal(get('save-message').disabled, false);
  get('message-title').value = 'Borrador';
  get('message-body').value = 'Sin terminar';
  state.records.unshift(record('dos'));
  assert.equal(intervals[0].ms, 10000);
  await intervals[0].fn();
  await tick();
  assert.equal(get('karito-messages').children.length, 2);
  assert.equal(get('message-title').value, 'Borrador');
  assert.equal(get('message-body').value, 'Sin terminar');
});

test('sin configuración desactiva el guardado y conserva los textos locales', async () => {
  const { get, state, submit } = await setup({ configured: false, local: [record('local')] });
  assert.equal(get('save-message').disabled, true);
  assert.equal(get('empty-messages').hidden, true);
  assert.match(get('message-status').textContent, /todavía no está conectado/);
  await submit();
  assert.equal(state.calls.length, 0);
  assert.equal(state.requests, 0);
});

test('publica con la firma elegida y conserva saltos de línea y texto literal', async () => {
  const { get, state, submit } = await setup();
  get('message-title').value = 'Nuestro momento';
  get('message-body').value = 'Primera línea\n<script>texto seguro</script>';
  get('message-author').value = 'Tu Amor';
  await submit();
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].autor, 'Tu Amor');
  assert.equal(get('karito-messages').children[0].children[1].textContent, state.records[0].texto);
  assert.equal(get('message-title').value, '');
  assert.match(get('message-status').textContent, /compartido/);
});

test('borrar pide confirmación para todos los dispositivos y limpia la edición', async () => {
  const { get, state, context, actions } = await setup({ initial: [record('uno'), record('dos')] });
  state.allowed = false;
  await actions()[1].events.click();
  assert.match(state.description, /todos los dispositivos/);
  assert.equal(state.records.length, 2);
  actions()[0].events.click();
  state.allowed = true;
  await actions()[1].events.click();
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].id, 'dos');
  assert.equal(vm.runInContext('editingId', context), null);
  await actions()[1].events.click();
  assert.equal(state.records.length, 0);
  assert.equal(get('empty-messages').hidden, false);
});

test('una edición conserva su versión original aunque otro dispositivo cambie el mensaje', async () => {
  const { get, state, actions, submit, intervals } = await setup({ initial: [record('uno')] });
  actions()[0].events.click();
  get('message-body').value = 'Mi borrador editado';
  state.records[0].texto = 'Editado desde otro dispositivo';
  state.records[0].updated_at = '2026-10-09T14:00:00Z';
  await intervals[0].fn();
  await tick();
  await submit();
  assert.equal(state.calls[0][1].updated_at, record('uno').updated_at);
  assert.equal(state.error.code, 'CONFLICT');
  assert.equal(state.records[0].texto, 'Editado desde otro dispositivo');
  assert.equal(get('message-body').value, 'Mi borrador editado');
});

test('una interrupción de internet conserva el borrador y la vista anterior', async () => {
  const { get, state, submit } = await setup({ initial: [record('uno')] });
  get('message-title').value = 'Sin conexión';
  get('message-body').value = 'No perder';
  state.offline = true;
  await submit();
  assert.equal(get('message-body').value, 'No perder');
  assert.equal(get('karito-messages').children.length, 1);
  assert(!get('message-status').textContent.includes('compartido'));
});

test('traslada solo mensajes locales pendientes, sin sobrescribir los compartidos', async () => {
  const { get, state } = await setup({ initial: [record('uno')], local: [record('uno'), record('local')] });
  assert.equal(get('migrate-messages').hidden, false);
  await get('migrate-messages').events.click();
  assert.equal(state.records.length, 2);
  assert.equal(state.calls[0][0], 'migrate');
  assert.equal(state.calls[0][1].length, 1);
  assert.equal(state.calls[0][1][0].id, 'local');
  assert.equal(get('migrate-messages').hidden, true);
});

test('una lectura antigua en vuelo no oculta un mensaje recién guardado', async () => {
  const { get, state, shared, submit } = await setup();
  let release;
  let reads = 0;
  shared.read = async () => {
    if (reads++ === 0) return new Promise(resolve => { release = resolve; });
    return structuredClone(state.records);
  };
  const refresh = get('refresh-messages').events.click();
  get('message-title').value = 'Nuevo';
  get('message-body').value = 'No ocultar';
  await submit();
  release([]);
  await refresh;
  assert.equal(get('karito-messages').children.length, 1);
  assert.equal(get('karito-messages').children[0].children[0].textContent, 'Nuevo');
});
