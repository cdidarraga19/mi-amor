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

test('exige la contraseña exacta en cada operación y limpia el campo', async () => {
  const { access, get, emit } = setup();
  for (let i = 0; i < 2; i++) {
    const result = access.request('Guardar mensaje');
    assert.equal(get('message-access').open, true);
    assert.equal(get('access-password').value, '');
    get('access-password').value = '60324';
    emit('access-form', 'submit');
    assert.equal(get('message-access').open, true);
    assert.match(get('access-error').textContent, /incorrecta/);
    get('access-password').value = '060324';
    emit('access-form', 'submit');
    assert.equal(await result, true);
    assert.equal(get('access-password').value, '');
    assert.equal(get('message-access').open, false);
  }
});

test('cancelar o Escape deniegan la operación; no se superponen solicitudes', async () => {
  const { access, get, emit } = setup();
  for (const [id, event] of [['access-cancel', 'click'], ['message-access', 'cancel']]) {
    const result = access.request('Eliminar el mensaje seleccionado', 'Eliminar mensaje');
    assert.equal(get('access-confirm').textContent, 'Eliminar mensaje');
    assert.equal(await access.request('Otra operación'), false);
    get('access-password').value = '060324';
    emit(id, event);
    assert.equal(await result, false);
    assert.equal(get('access-password').value, '');
  }
});

test('el borrado pide permiso, conserva los demás mensajes y limpia la edición', async () => {
  const nodes = new Map();
  function node() {
    return { events: {}, children: [], value: '',
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute() {}, focus() {}, reset() {},
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; }
    };
  }
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const records = ['uno', 'dos'].map(id => ({ id, titulo: id, texto: 'Recuerdo', fecha: '2026-10-08T12:00:00Z' }));
  let stored = records;
  let allowed = false;
  let description = '';
  const source = fs.readFileSync(path.join(__dirname, '../js/karito.js'), 'utf8');
  const context = vm.createContext({
    $: get, element(tag, cls, text) { return Object.assign(node(), { textContent: text }); },
    KaritoStorage: { read: () => stored, write: next => { stored = next; return next; } },
    KaritoAccess: { request: async text => { description = text; return allowed; } },
    loadContent() {}, Intl, Date
  });
  vm.runInContext(source.slice(source.indexOf('// Los textos se insertan')), context);
  const actions = () => get('karito-messages').children[0].children[3].children;
  await actions()[1].events.click();
  assert.match(description, /uno/);
  assert.equal(stored.length, 2);
  actions()[0].events.click();
  assert.equal(vm.runInContext('editingId', context), 'uno');
  allowed = true;
  await actions()[1].events.click();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, 'dos');
  assert.equal(vm.runInContext('editingId', context), null);
  await actions()[1].events.click();
  assert.equal(stored.length, 0);
  assert.equal(get('empty-messages').hidden, false);
});
