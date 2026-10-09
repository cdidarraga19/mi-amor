'use strict';

const $ = id => document.getElementById(id);
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Navegación y música funcionan también si no se puede cargar el JSON.
function closeMenu() {
  $('nav-links').classList.remove('open');
  $('menu-toggle').setAttribute('aria-expanded', 'false');
}
$('menu-toggle').addEventListener('click', () => {
  const open = $('nav-links').classList.toggle('open');
  $('menu-toggle').setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => {
    if (document.hidden) return;
    const heart = element('div', 'heart', ['💗', '💕', '💖', '💞'][Math.floor(Math.random() * 4)]);
    heart.style.left = Math.random() * 100 + 'vw';
    const duration = 6 + Math.random() * 6;
    heart.style.animationDuration = duration + 's';
    $('hearts-container').appendChild(heart);
    setTimeout(() => heart.remove(), duration * 1000);
  }, 800);
}

async function loadContent() {
  try {
    const response = await fetch('json/contenido.json');
    if (!response.ok) throw new Error('No se pudo cargar el contenido');
    const config = await response.json();
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
    config.cartas.forEach((letter, index) => {
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
    for (let i = 1; i <= config.totalFotos; i++) {
      const box = element('div', 'foto-box');
      const img = element('img');
      img.alt = 'Nuestro recuerdo ' + i;
      img.loading = 'lazy';
      img.addEventListener('error', () => box.classList.add('no-photo'));
      img.src = 'img/foto' + i + '.jpg';
      box.appendChild(img);
      $('galeria-grid').appendChild(box);
    }
    config.timeline.forEach(memory => {
      const item = element('article', 'timeline-item');
      item.append(element('div', 'fecha', memory.fecha), element('h3', '', memory.titulo), element('p', '', memory.texto));
      $('timeline').appendChild(item);
    });
    $('btn-razon').addEventListener('click', () => {
      $('razon-caja').textContent = config.razones[Math.floor(Math.random() * config.razones.length)];
    });
    config.razones.slice(0, 6).forEach(reason => $('razones-grid').appendChild(element('div', 'razon-card', reason)));
  } catch {
    $('page-status').hidden = false;
    $('page-status').textContent = 'No pudimos cargar los recuerdos. Recarga la página. Si abriste el archivo directamente, usa un servidor local como se explica en el README.';
  }
}

// Los textos se insertan con textContent para conservarlos como texto seguro.
let messages = [];
let editingId = null;
let storageReady = true;
const form = $('message-form');
const status = text => { $('message-status').textContent = text; };
try { messages = KaritoStorage.read(); }
catch {
  storageReady = false;
  status('No pudimos leer tus mensajes guardados. No los sobrescribiremos. Habilita el almacenamiento del navegador o recupera una copia antes de continuar.');
  form.querySelector('button[type="submit"]').disabled = true;
  $('import-messages').disabled = true;
}
function resetEditor() {
  editingId = null;
  form.reset();
  $('editor-title').textContent = 'Escribe algo bonito';
  $('save-message').textContent = 'Guardar mensaje';
  $('cancel-edit').hidden = true;
}
function save(next) {
  if (!storageReady) return false;
  try {
    messages = KaritoStorage.write(next);
    renderMessages();
    return true;
  } catch {
    status('No pudimos guardar los cambios. El almacenamiento puede estar lleno o bloqueado. Tu texto sigue en el formulario; puedes copiarlo e intentar de nuevo.');
    return false;
  }
}
function renderMessages() {
  $('karito-messages').replaceChildren();
  $('empty-messages').hidden = messages.length > 0 || !storageReady;
  $('export-messages').disabled = !messages.length;
  messages.forEach(message => {
    const card = element('article', 'personal-message');
    const footer = element('footer', 'message-footer');
    const date = element('time', '', new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(message.fecha)));
    date.dateTime = message.fecha;
    footer.append(element('span', 'message-author', 'Escrito por Karito 💗'), date);
    const actions = element('div', 'message-actions');
    const edit = element('button', 'secondary-btn', 'Editar');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Editar: ' + message.titulo);
    edit.addEventListener('click', () => {
      editingId = message.id;
      $('message-title').value = message.titulo;
      $('message-body').value = message.texto;
      $('editor-title').textContent = 'Dale tu toque al mensaje';
      $('save-message').textContent = 'Guardar cambios';
      $('cancel-edit').hidden = false;
      $('message-title').focus();
    });
    actions.appendChild(edit);
    card.append(element('h3', '', message.titulo), element('p', 'message-text', message.texto), footer, actions);
    $('karito-messages').appendChild(card);
  });
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const title = $('message-title');
  const body = $('message-body');
  for (const input of [title, body]) {
    input.setCustomValidity(input.value.trim() ? '' : 'Escribe algo más que espacios.');
  }
  if (!form.reportValidity()) return;
  const original = messages.find(message => message.id === editingId);
  const message = {
    id: original?.id || crypto.randomUUID(),
    titulo: title.value.trim(), texto: body.value.trim(),
    fecha: original?.fecha || new Date().toISOString(), autor: 'Karito'
  };
  const next = original ? messages.map(item => item.id === editingId ? message : item) : [message, ...messages];
  if (save(next)) {
    resetEditor();
    status(original ? 'Cambios guardados con tu firma, Karito. 💗' : 'Tu mensaje ya está guardado con tu firma, Karito. 💗');
  }
});
[$('message-title'), $('message-body')].forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
$('cancel-edit').addEventListener('click', resetEditor);
$('export-messages').addEventListener('click', () => {
  const data = JSON.stringify({ app: 'mi-amor', version: 1, mensajes: messages }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = element('a');
  link.href = url;
  link.download = 'mensajes-de-karito.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Copia preparada. Consérvala para recuperar o llevar tus mensajes a otro navegador.');
});
$('import-messages').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Archivo demasiado grande');
    const imported = KaritoStorage.parseBackup(await file.text());
    const ids = new Set(messages.map(message => message.id));
    const additions = imported.filter(message => !ids.has(message.id));
    if (save([...additions, ...messages])) status(`Se importaron ${additions.length} mensajes. Tus mensajes existentes se conservaron.`);
  } catch {
    status('No pudimos importar esa copia. Elige un archivo JSON descargado desde esta página (máximo 5 MB). Tus mensajes siguen intactos.');
  } finally { event.target.value = ''; }
});
renderMessages();
loadContent();
