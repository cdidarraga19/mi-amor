'use strict';

async function loadContent() {
  try {
    const response = await fetch((document.body.dataset.root || '') + 'json/contenido.json');
    if (!response.ok) throw new Error('No se pudo cargar el contenido');
    const config = await response.json();
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
    if ($('galeria-grid')) for (let i = 1; i <= config.totalFotos; i++) {
      const box = element('div', 'foto-box');
      const img = element('img');
      img.alt = 'Nuestro recuerdo ' + i;
      img.loading = 'lazy';
      img.addEventListener('error', () => box.classList.add('no-photo'));
      img.src = (document.body.dataset.root || '') + 'img/foto' + i + '.jpg';
      box.appendChild(img);
      $('galeria-grid').appendChild(box);
    }
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
