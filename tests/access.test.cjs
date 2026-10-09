const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', textContent: '', open: false, events: {},
      addEventListener(name, fn) { this.events[name] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; }, focus() {}
    });
    return nodes.get(id);
  };
  const source = fs.readFileSync(path.join(__dirname, '../js/access.js'), 'utf8');
  const access = vm.runInNewContext(source + '\nKaritoAccess', { document: { getElementById: get } });
  const emit = (id, name) => get(id).events[name]({ preventDefault() {} });
  return { access, get, emit };
}

test('valida en el servidor cada operación y limpia el campo', async () => {
  const { access, get, emit } = setup();
  let calls = 0;
  const operation = async password => {
    calls++;
    if (password !== 'compartida') throw Object.assign(new Error('Contraseña incorrecta.'), { code: 'PASSWORD' });
  };
  for (let i = 0; i < 2; i++) {
    const result = access.request('Guardar mensaje', 'Guardar', operation);
    assert.equal(get('message-access').open, true);
    assert.equal(get('access-password').value, '');
    get('access-password').value = 'incorrecta';
    await emit('access-form', 'submit');
    assert.equal(get('message-access').open, true);
    assert.match(get('access-error').textContent, /incorrecta/);
    get('access-password').value = 'compartida';
    await emit('access-form', 'submit');
    assert.equal(await result, true);
    assert.equal(get('access-password').value, '');
    assert.equal(get('message-access').open, false);
  }
  assert.equal(calls, 4);
});

test('cancelar o Escape deniegan la operación; no se superponen solicitudes', async () => {
  const { access, get, emit } = setup();
  for (const [id, event] of [['access-cancel', 'click'], ['message-access', 'cancel']]) {
    const result = access.request('Eliminar el mensaje seleccionado', 'Eliminar mensaje', async () => {});
    assert.equal(get('access-confirm').textContent, 'Eliminar mensaje');
    assert.equal(await access.request('Otra operación'), false);
    get('access-password').value = 'compartida';
    emit(id, event);
    assert.equal(await result, false);
    assert.equal(get('access-password').value, '');
  }
});

test('un fallo de red conserva el diálogo; cancelar no ejecuta otra operación', async () => {
  const { access, get, emit } = setup();
  let calls = 0;
  const result = access.request('Guardar', 'Guardar', async () => { calls++; throw new Error('offline'); });
  get('access-password').value = 'compartida';
  await emit('access-form', 'submit');
  assert.equal(get('message-access').open, true);
  assert.equal(get('access-password').value, '');
  assert.match(get('access-error').textContent, /conexión/);
  emit('access-cancel', 'click');
  assert.equal(await result, false);
  assert.equal(calls, 1);
});

test('evita solicitudes duplicadas y cancelación mientras guarda', async () => {
  const { access, get, emit } = setup();
  let release;
  let calls = 0;
  const result = access.request('Guardar', 'Guardar', () => { calls++; return new Promise(resolve => { release = resolve; }); });
  get('access-password').value = 'compartida';
  const saving = emit('access-form', 'submit');
  await emit('access-form', 'submit');
  emit('message-access', 'cancel');
  assert.equal(get('message-access').open, true);
  assert.equal(get('access-confirm').disabled, true);
  assert.equal(calls, 1);
  release();
  await saving;
  assert.equal(await result, true);
});

