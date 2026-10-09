'use strict';

function renderBook(config) {
  const book = $('memory-book');
  const pages = [];
  for (let i = 0; i < config.totalFotos; i++) {
    const memory = (config.libro || [])[i] || {};
    const page = element('article', 'book-page');
    page.setAttribute('aria-label', 'Página ' + (i + 1));
    const photo = element('figure', 'book-photo');
    const img = element('img');
    img.alt = memory.descripcionFoto || 'Nuestro recuerdo ' + (i + 1);
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.src = (document.body.dataset.root || '') + 'img/foto' + (i + 1) + '.jpg';
    const unavailable = element('p', 'book-photo-unavailable', 'No se pudo cargar esta foto. Intenta recargar la página.');
    unavailable.hidden = true;
    img.addEventListener('error', () => {
      img.hidden = true;
      unavailable.hidden = false;
    });
    photo.append(img, unavailable, element('figcaption', '', 'Un pedacito de nosotros · ' + String(i + 1).padStart(2, '0')));
    const copy = element('div', 'book-copy');
    copy.append(
      element('p', 'book-kicker', 'Nuestro álbum de amor'),
      element('h2', '', memory.titulo || 'Un recuerdo contigo'),
      element('p', 'book-text', memory.texto || 'Una foto, un instante y otro recuerdo que quiero guardar contigo.'),
      element('span', 'book-signature', 'Con todo mi amor'),
      element('span', 'book-number', String(i + 1).padStart(2, '0'))
    );
    page.append(photo, copy);
    page.hidden = i !== 0;
    $('book-pages').appendChild(page);
    pages.push(page);
  }
  if (!pages.length) {
    $('book-help').textContent = 'Pronto llenaremos este libro con nuestros recuerdos.';
    return;
  }
  let current = 0;
  function showPage(index) {
    if (index < 0 || index >= pages.length) return;
    pages[current].hidden = true;
    current = index;
    pages[current].hidden = false;
    $('book-prev').disabled = current === 0;
    $('book-next').disabled = current === pages.length - 1;
    $('book-position').textContent = 'Página ' + (current + 1) + ' de ' + pages.length;
  }
  $('book-prev').addEventListener('click', () => showPage(current - 1));
  $('book-next').addEventListener('click', () => showPage(current + 1));
  book.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPage(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  showPage(0);
  book.hidden = false;
}

async function loadContent() {
  try {
    const response = await fetch((document.body.dataset.root || '') + 'json/contenido.json');
    if (!response.ok) throw new Error('No se pudo cargar el contenido');
    const config = await response.json();
    if ($('memory-book')) renderBook(config);
    if ($('contador-caja')) {
    const start = new Date(config.fechaInicio).getTime();
    function updateCounter() {
      const diff = Math.max(0, Date.now() - start);
      $('c-dias').textContent = Math.floor(diff / 86400000);
      $('c-horas').textContent = Math.floor(diff % 86400000 / 3600000);
      $('c-min').textContent = Math.floor(diff % 3600000 / 60000);
      $('c-seg').textContent = Math.floor(diff % 60000 / 1000);
    }
    updateCounter();
    setInterval(updateCounter, 1000);
    }
    if ($('cartas-grid')) config.cartas.forEach((letter, index) => {
      const card = element('article', 'carta');
      const body = element('p', '', letter.texto);
      body.id = 'letter-' + index;
      const toggle = element('button', 'ver-mas', 'Leer completo');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', body.id);
      toggle.addEventListener('click', () => {
        const open = card.classList.toggle('abierta');
        toggle.textContent = open ? 'Cerrar mensaje' : 'Leer completo';
        toggle.setAttribute('aria-expanded', String(open));
      });
      card.append(element('h3', '', letter.titulo), body, toggle);
      $('cartas-grid').appendChild(card);
    });
    if ($('timeline')) config.timeline.forEach(memory => {
      const item = element('article', 'timeline-item');
      item.append(element('div', 'fecha', memory.fecha), element('h3', '', memory.titulo), element('p', '', memory.texto));
      $('timeline').appendChild(item);
    });
    if ($('btn-razon')) {
    $('btn-razon').addEventListener('click', () => {
      $('razon-caja').textContent = config.razones[Math.floor(Math.random() * config.razones.length)];
    });
    config.razones.slice(0, 6).forEach(reason => $('razones-grid').appendChild(element('div', 'razon-card', reason)));
    }
  } catch {
    $('page-status').hidden = false;
    $('page-status').textContent = 'No pudimos cargar los recuerdos. Recarga la página. Si abriste el archivo directamente, usa un servidor local como se explica en el README.';
  }
}

loadContent();
