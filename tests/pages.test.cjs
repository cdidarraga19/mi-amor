const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const pages = ['index.html', ...fs.readdirSync(path.join(root, 'pages')).filter(file => file !== 'fotos.html').map(file => 'pages/' + file)];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('las seis páginas tienen enlaces y recursos válidos, con su sección activa', () => {
  assert.equal(pages.length, 6);
  for (const page of pages) {
    const html = read(page);
    assert.equal([...html.matchAll(/<section\b/g)].length, 1, page);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, page);
    assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1, page);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, page);
    const nav = html.match(/<div class="nav-links"[\s\S]*?<\/div>/)[0];
    assert.equal([...nav.matchAll(/<a /g)].length, 6, page);
    assert(!html.includes('href="fotos.html"') && !html.includes('href="pages/fotos.html"'), page);
    for (const [, target] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (target.startsWith('https://')) continue;
      assert(fs.existsSync(path.resolve(root, path.dirname(page), target)), `${page}: ${target}`);
    }
    for (const [, references] of html.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) {
      for (const id of references.split(' ')) assert(ids.includes(id), `${page}: ${id}`);
    }
  }
  assert(!read('index.html').includes('js/content.js'));
  assert(!read('index.html').includes('js/karito.js'));
  const karito = read('pages/karito.html');
  for (const removed of ['export-messages', 'import-messages', 'import-file', 'storage-note']) assert(!karito.includes(removed));
});

test('el enlace anterior de fotos lleva al libro', () => {
  const html = read('pages/fotos.html');
  assert(html.includes('http-equiv="refresh" content="0; url=nosotros.html#memory-book"'));
  assert(html.includes('href="nosotros.html#memory-book"'));
  assert(!html.includes('galeria-grid'));
});

const config = JSON.parse(read('json/contenido.json'));
for (const [page, container, expected] of [
  ['nosotros', 'contador-caja', null], ['mensajes', 'cartas-grid', config.cartas.length],
  ['historia', 'timeline', config.timeline.length],
  ['razones', 'razones-grid', 6]
]) {
  test(`carga ${page} sin depender de elementos de otros catálogos`, async () => {
    function node() {
      return { children: [], textContent: '', hidden: true, events: {},
        addEventListener(type, fn) { this.events[type] = fn; }, setAttribute() {},
        append(...children) { this.children.push(...children); },
        appendChild(child) { this.children.push(child); }, classList: { add() {} }
      };
    }
    const html = read(`pages/${page}.html`);
    const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], node()]));
    vm.runInNewContext(read('js/content.js'), {
      $: id => nodes.get(id) || null,
      element(tag, cls, text) { return Object.assign(node(), { textContent: text }); },
      document: { body: { dataset: { root: '../' } } },
      fetch: async url => {
        assert.equal(url, '../json/contenido.json');
        return { ok: true, json: async () => config };
      }, setInterval() {}, Date, Math
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(nodes.get('page-status').hidden, true);
    if (expected !== null) assert.equal(nodes.get(container).children.length, expected);
    else assert(Number(nodes.get('c-dias').textContent) > 0);
    if (page === 'nosotros') {
      const bookPages = nodes.get('book-pages').children;
      assert.equal(bookPages.length, config.totalFotos);
      assert.equal(nodes.get('memory-book').hidden, false);
      const photos = bookPages.map(page => page.children[0].children[0].src);
      assert.equal(new Set(photos).size, config.totalFotos);
      for (const photo of photos) assert(fs.existsSync(path.resolve(root, 'pages', photo)));
      const checkPage = index => {
        assert.equal(bookPages.filter(page => !page.hidden).length, 1);
        assert.equal(bookPages[index].hidden, false);
        assert.equal(nodes.get('book-position').textContent, `Página ${index + 1} de ${config.totalFotos}`);
        assert.equal(nodes.get('book-prev').disabled, index === 0);
        assert.equal(nodes.get('book-next').disabled, index === config.totalFotos - 1);
      };
      checkPage(0);
      nodes.get('book-prev').events.click();
      checkPage(0);
      for (let i = 1; i < config.totalFotos; i++) {
        nodes.get('book-next').events.click();
        checkPage(i);
      }
      nodes.get('book-next').events.click();
      checkPage(config.totalFotos - 1);
      let prevented = false;
      nodes.get('memory-book').events.keydown({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
      assert(prevented);
      checkPage(config.totalFotos - 2);
      for (let i = config.totalFotos - 3; i >= 0; i--) {
        nodes.get('book-prev').events.click();
        checkPage(i);
      }
      const [img, fallback] = bookPages[0].children[0].children;
      img.events.error();
      assert.equal(img.hidden, true);
      assert.equal(fallback.hidden, false);
    }
    if (page === 'razones') {
      nodes.get('btn-razon').events.click();
      assert(config.razones.includes(nodes.get('razon-caja').textContent));
    }
  });
}
