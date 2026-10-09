'use strict';

// Los textos se insertan con textContent para conservarlos como texto seguro.
let messages = [];
let localMessages = [];
let editingId = null;
let editingVersion = null;
let draftId = null;
let storageReady = false;
let configReady = false;
let busy = false;
let refreshing = false;
let mutationRevision = 0;
const form = $('message-form');
const status = text => { $('message-status').textContent = text; };

function updateControls() {
  $('save-message').disabled = !storageReady || busy;
  $('refresh-messages').disabled = !configReady || busy || refreshing;
  $('migrate-messages').disabled = !storageReady || busy;
  $('cancel-edit').disabled = busy;
  for (const input of [$('message-title'), $('message-body'), $('message-author')]) input.disabled = busy;
  document.querySelectorAll('.message-actions button').forEach(button => { button.disabled = busy; });
}
function resetEditor() {
  editingId = null;
  editingVersion = null;
  draftId = null;
  form.reset();
  $('editor-title').textContent = 'Escribe algo bonito';
  $('save-message').textContent = 'Guardar mensaje';
  $('cancel-edit').hidden = true;
}
function updateMigration() {
  const sharedIds = new Set(messages.map(message => message.id));
  $('migrate-messages').hidden = !localMessages.some(message => !sharedIds.has(message.id));
}
function renderMessages() {
  $('karito-messages').replaceChildren();
  $('empty-messages').hidden = messages.length > 0 || !storageReady;
  messages.forEach(message => {
    const card = element('article', 'personal-message');
    const footer = element('footer', 'message-footer');
    const date = element('time', '', new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(message.fecha)));
    date.dateTime = message.fecha;
    footer.append(element('span', 'message-author', 'Escrito por ' + message.autor + ' 💗'), date);
    const actions = element('div', 'message-actions');
    const edit = element('button', 'secondary-btn', 'Editar');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Editar: ' + message.titulo);
    edit.addEventListener('click', () => {
      if (busy) return;
      editingId = message.id;
      editingVersion = message.updated_at;
      $('message-title').value = message.titulo;
      $('message-body').value = message.texto;
      $('message-author').value = message.autor;
      $('editor-title').textContent = 'Dale tu toque al mensaje';
      $('save-message').textContent = 'Guardar cambios';
      $('cancel-edit').hidden = false;
      $('message-title').focus();
    });
    const remove = element('button', 'secondary-btn delete-message', 'Eliminar');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Eliminar: ' + message.titulo);
    remove.addEventListener('click', async () => {
      if (await change(
        `¿Eliminar «${message.titulo}»? Se borrará para los dos, en todos los dispositivos. Esta acción no se puede deshacer.`,
        'Eliminar mensaje', password => KaritoSharedStorage.remove(message, password),
        () => {
          messages = messages.filter(item => item.id !== message.id);
          if (editingId === message.id) resetEditor();
        }
      )) status('Mensaje eliminado para los dos.');
    });
    actions.append(edit, remove);
    card.append(element('h3', '', message.titulo), element('p', 'message-text', message.texto), footer, actions);
    $('karito-messages').appendChild(card);
  });
  updateMigration();
  updateControls();
}

async function syncMessages() {
  if (!configReady || refreshing || busy) return false;
  refreshing = true;
  const revision = mutationRevision;
  updateControls();
  try {
    const latest = await KaritoSharedStorage.read();
    if (revision !== mutationRevision) return false;
    if (!storageReady) status('');
    const changed = !storageReady || JSON.stringify(messages) !== JSON.stringify(latest);
    messages = latest;
    storageReady = true;
    if (changed) renderMessages();
    $('sync-status').textContent = 'Mensajes actualizados. Se revisan automáticamente cada 10 segundos.';
    return true;
  } catch {
    $('sync-status').textContent = 'No pudimos actualizar los mensajes. Revisa tu conexión y pulsa Actualizar mensajes. Los textos que ya ves se conservan.';
    return false;
  } finally {
    refreshing = false;
    updateControls();
  }
}

async function change(description, action, operation, apply) {
  if (!storageReady || busy) return false;
  busy = true;
  updateControls();
  let result;
  try {
    const allowed = await KaritoAccess.request(description, action, async password => {
      result = await operation(password);
    });
    if (!allowed) return false;
    mutationRevision++;
    apply(result);
    renderMessages();
    return true;
  } finally {
    busy = false;
    updateControls();
    // La operación ya está confirmada por el servidor; un fallo al releer no deshace el guardado.
    await syncMessages();
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !storageReady) return;
  const title = $('message-title');
  const body = $('message-body');
  for (const input of [title, body]) {
    input.setCustomValidity(input.value.trim() ? '' : 'Escribe algo más que espacios.');
  }
  if (!form.reportValidity()) return;
  const editing = editingId !== null;
  if (!editing && !draftId) draftId = crypto.randomUUID();
  const message = {
    id: editing ? editingId : draftId,
    titulo: title.value.trim(), texto: body.value.trim(),
    autor: $('message-author').value,
    ...(editing ? { updated_at: editingVersion } : {})
  };
  if (await change(
    editing ? 'Escribe la contraseña compartida para guardar los cambios.' : 'Escribe la contraseña compartida para publicar este mensaje para los dos.',
    'Guardar', password => KaritoSharedStorage.save(message, password),
    saved => {
      messages = [saved, ...messages.filter(item => item.id !== saved.id)]
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
      resetEditor();
    }
  )) status(editing ? 'Cambios guardados para los dos. 💗' : 'Tu mensaje ya está compartido para los dos. 💗');
});
[$('message-title'), $('message-body')].forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
$('cancel-edit').addEventListener('click', () => { if (!busy) resetEditor(); });
$('refresh-messages').addEventListener('click', syncMessages);
$('migrate-messages').addEventListener('click', async () => {
  const sharedIds = new Set(messages.map(message => message.id));
  const pending = localMessages.filter(message => !sharedIds.has(message.id));
  if (!pending.length) return;
  if (await change(
    `¿Compartir los ${pending.length} mensajes guardados en este navegador? Se verán desde todos los dispositivos. La copia de este navegador se conserva.`,
    'Compartir mensajes', password => KaritoSharedStorage.migrate(pending, password),
    () => { localMessages = []; updateMigration(); }
  )) status('Tus mensajes anteriores ya están guardados en la base de datos compartida. 💗');
});

document.addEventListener('visibilitychange', () => { if (!document.hidden) syncMessages(); });
window.addEventListener('online', syncMessages);
setInterval(() => { if (!document.hidden) syncMessages(); }, 10000);

async function initializeMessages() {
  updateControls();
  status('Conectando con sus mensajes…');
  try {
    await KaritoSharedStorage.init();
    configReady = true;
    try { localMessages = KaritoStorage.read(); }
    catch { $('sync-status').textContent = 'No pudimos leer la copia anterior de este navegador.'; }
    if (await syncMessages()) status('');
    else status('Todavía no pudimos cargar sus mensajes compartidos. Puedes volver a intentar con Actualizar mensajes.');
  } catch (failure) {
    status(failure.code === 'CONFIG' ? 'Este espacio todavía no está conectado. Podrán compartir mensajes cuando esté listo.' : 'No pudimos conectar con sus mensajes. Revisa tu conexión y recarga la página.');
  }
  updateControls();
}
initializeMessages();
