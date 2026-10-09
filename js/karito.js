'use strict';

// Los textos se insertan con textContent para conservarlos como texto seguro.
let messages = [];
let editingId = null;
let storageReady = true;
const form = $('message-form');
const status = text => { $('message-status').textContent = text; };
try { messages = KaritoStorage.read(); }
catch {
  storageReady = false;
  status('No pudimos leer tus mensajes guardados. No los sobrescribiremos. Habilita el almacenamiento del navegador e intenta de nuevo.');
  form.querySelector('button[type="submit"]').disabled = true;
}
function resetEditor() {
  editingId = null;
  form.reset();
  $('editor-title').textContent = 'Escribe algo bonito';
  $('save-message').textContent = 'Guardar mensaje';
  $('cancel-edit').hidden = true;
}
async function save(next, description, action = 'Guardar') {
  if (!storageReady) return false;
  if (!await KaritoAccess.request(description, action)) return false;
  try {
    messages = KaritoStorage.write(next);
    renderMessages();
    return true;
  } catch {
    status('No pudimos guardar los cambios. El almacenamiento puede estar lleno o bloqueado. Tus mensajes y el texto del formulario se conservaron; intenta de nuevo.');
    return false;
  }
}
function renderMessages() {
  $('karito-messages').replaceChildren();
  $('empty-messages').hidden = messages.length > 0 || !storageReady;
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
    const remove = element('button', 'secondary-btn delete-message', 'Eliminar');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Eliminar: ' + message.titulo);
    remove.addEventListener('click', async () => {
      const next = messages.filter(item => item.id !== message.id);
      if (await save(next, `¿Eliminar «${message.titulo}»? Se borrará de este navegador. Esta acción no se puede deshacer. Escribe la contraseña para confirmar.`, 'Eliminar mensaje')) {
        if (editingId === message.id) resetEditor();
        status('Mensaje eliminado.');
        $('message-title').focus();
      }
    });
    actions.append(edit, remove);
    card.append(element('h3', '', message.titulo), element('p', 'message-text', message.texto), footer, actions);
    $('karito-messages').appendChild(card);
  });
}
form.addEventListener('submit', async event => {
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
  if (await save(next, original ? 'Escribe la contraseña para guardar los cambios de este mensaje.' : 'Escribe la contraseña para agregar este mensaje.')) {
    resetEditor();
    status(original ? 'Cambios guardados con tu firma, Karito. 💗' : 'Tu mensaje ya está guardado con tu firma, Karito. 💗');
  }
});
[$('message-title'), $('message-body')].forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
$('cancel-edit').addEventListener('click', resetEditor);
renderMessages();
