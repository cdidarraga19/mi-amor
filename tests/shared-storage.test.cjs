const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-storage.js'), 'utf8');
const url = 'https://test-project.supabase.co';
const key = 'sb_publishable_example';

function setup(remote = async () => [], config = { supabaseUrl: url, publicKey: key }) {
  const calls = [];
  const api = vm.runInNewContext(source + '\nKaritoSharedStorage', {
    document: { body: { dataset: { root: '../' } } }, URL, AbortController, atob, setTimeout, clearTimeout,
    fetch: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (endpoint === '../json/karito.json') return { ok: true, json: async () => config };
      return remote(endpoint, options);
    }
  });
  return { api, calls };
}
const ok = data => ({ ok: true, status: 200, json: async () => data });
const record = { id: 'one', titulo: 'Compartido', texto: 'Desde mi celular', autor: 'Tu Amor', fecha: '2026-10-09T12:00:00Z', updated_at: '2026-10-09T12:00:00.123456Z' };

test('dos navegadores leen la misma fuente; guardar modifica solo un mensaje', async () => {
  let records = [];
  const remote = async (endpoint, options) => {
    if (endpoint.includes('/rpc/karito_guardar')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_password, 'compartida');
      assert.equal(body.p_expected, null);
      assert(!Array.isArray(body.p_message));
      records.push(record);
      return ok(record);
    }
    return ok(structuredClone(records));
  };
  const first = setup(remote), second = setup(remote);
  await Promise.all([first.api.init(), second.api.init()]);
  assert.equal((await second.api.read()).length, 0);
  await first.api.save({ ...record, updated_at: undefined }, 'compartida');
  // La versión es obligatoria para editar; en una creación todavía no existe.
  assert.equal((await second.api.read())[0].texto, record.texto);
  for (const call of first.calls.filter(call => call.endpoint.startsWith(url))) {
    assert.equal(call.options.headers.apikey, key);
    assert.equal(call.options.headers.Authorization, undefined);
    assert.equal(call.options.cache, 'no-store');
  }
});

test('envía la versión del mensaje para editar y borrar, y usa RPC para importar', async () => {
  const { api, calls } = setup(async () => ok(record));
  await api.init();
  await api.save(record, 'compartida');
  await api.remove(record, 'compartida');
  await api.migrate([record], 'compartida');
  const [save, remove, migrate] = calls.slice(1).map(call => JSON.parse(call.options.body));
  assert.equal(save.p_expected, record.updated_at);
  assert.equal(remove.p_expected, record.updated_at);
  assert.equal(remove.p_id, record.id);
  assert.equal(migrate.p_messages.length, 1);
});

test('pagina la lectura para no perder mensajes por el límite de respuesta', async () => {
  const { api, calls } = setup(async endpoint => ok(endpoint.endsWith('offset=0') ? Array.from({ length: 100 }, (_, i) => ({ ...record, id: String(i) })) : [record]));
  await api.init();
  assert.equal((await api.read()).length, 101);
  assert(calls[2].endpoint.endsWith('offset=100'));
});

test('rechaza claves secretas, URL inválida y configuración incompleta', async () => {
  const serviceRole = 'x.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.x';
  for (const config of [
    { supabaseUrl: '', publicKey: '' },
    { supabaseUrl: 'http://test-project.supabase.co', publicKey: key },
    { supabaseUrl: url, publicKey: 'sb_secret_secret' },
    { supabaseUrl: url, publicKey: serviceRole },
    { supabaseUrl: url + '/rest/v1', publicKey: key }
  ]) {
    const { api, calls } = setup(undefined, config);
    await assert.rejects(api.init());
    assert.equal(calls.length, 1);
  }
});

test('admite la clave anon antigua y comunica contraseña incorrecta o conflicto', async () => {
  const anon = 'x.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.x';
  for (const [message, code] of [['KARITO_PASSWORD', 'PASSWORD'], ['KARITO_CONFLICT', 'CONFLICT']]) {
    const { api, calls } = setup(async () => ({ ok: false, status: 400, json: async () => ({ message }) }), { supabaseUrl: url, publicKey: anon });
    await api.init();
    await assert.rejects(api.save(record, 'incorrecta'), error => error.code === code);
    assert.equal(calls[1].options.headers.Authorization, 'Bearer ' + anon);
  }
});
