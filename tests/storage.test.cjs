const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../js/storage.js'), 'utf8');
function storage(initial = null, blocked = false) {
  let raw = initial;
  return vm.runInNewContext(code + '\nKaritoStorage', { localStorage: {
    getItem() { return raw; },
    setItem(key, value) { if (blocked) throw new Error('Quota exceeded'); raw = value; }
  } });
}
const message = { id: 'one', titulo: 'Mi recuerdo', texto: 'Primera línea\n<script>alert(1)</script>', fecha: '2026-10-08T12:00:00Z', autor: 'Otra persona' };
test('guarda y recupera textos, saltos de línea y firma fija', () => {
  const api = storage();
  assert.equal(api.read().length, 0);
  api.write([message]);
  assert.equal(api.read()[0].texto, message.texto);
  assert.equal(api.read()[0].autor, 'Karito');
  api.write([{ ...message, titulo: 'Editado' }]);
  assert.equal(api.read()[0].titulo, 'Editado');
});
test('valida copias y rechaza textos vacíos, fechas inválidas y duplicados', () => {
  const api = storage();
  const backup = mensajes => JSON.stringify({ app: 'mi-amor', version: 1, mensajes });
  assert.equal(api.parseBackup(backup([message])).length, 1);
  for (const invalid of [[{ ...message, texto: '  ' }], [{ ...message, fecha: 'ayer' }], [message, message], [{ ...message, titulo: 'a'.repeat(121) }]]) {
    assert.throws(() => api.parseBackup(backup(invalid)));
  }
  assert.throws(() => api.parseBackup('{'));
  assert.throws(() => api.parseBackup('{"version":2}'));
});
test('informa datos dañados y errores de almacenamiento sin fingir guardado', () => {
  assert.throws(() => storage('{').read());
  const api = storage(JSON.stringify([message]), true);
  assert.throws(() => api.write([{ ...message, titulo: 'No guardado' }]));
  assert.equal(api.read()[0].titulo, message.titulo);
});
