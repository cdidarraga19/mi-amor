'use strict';

// La operación verifica la contraseña en Supabase; nunca se guarda en el navegador.
const KaritoAccess = (() => {
  const dialog = document.getElementById('message-access');
  const form = document.getElementById('access-form');
  const password = document.getElementById('access-password');
  const error = document.getElementById('access-error');
  let pending = null;
  let returnFocus = null;
  let operation = null;
  let busy = false;
  const confirm = document.getElementById('access-confirm');
  const cancel = document.getElementById('access-cancel');

  function finish(allowed) {
    const resolve = pending;
    pending = null;
    operation = null;
    password.value = '';
    error.textContent = '';
    dialog.close();
    if (returnFocus?.isConnected) returnFocus.focus();
    resolve?.(allowed);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !pending) return;
    busy = true;
    confirm.disabled = true;
    cancel.disabled = true;
    password.disabled = true;
    error.textContent = 'Guardando los cambios…';
    try {
      await operation(password.value);
      finish(true);
    } catch (failure) {
      password.value = '';
      error.textContent = failure.code ? failure.message : 'No pudimos conectar. Revisa tu conexión e intenta de nuevo. Tu texto se conserva.';
    } finally {
      busy = false;
      confirm.disabled = false;
      cancel.disabled = false;
      password.disabled = false;
      if (pending) password.focus();
    }
  });
  cancel.addEventListener('click', () => { if (!busy) finish(false); });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (!busy) finish(false);
  });
  dialog.addEventListener('close', () => { if (pending) finish(false); });

  function request(description, action = 'Guardar', perform) {
    if (pending) return Promise.resolve(false);
    if (typeof perform !== 'function') return Promise.resolve(false);
    operation = perform;
    returnFocus = document.activeElement;
    password.value = '';
    error.textContent = '';
    document.getElementById('access-description').textContent = description;
    document.getElementById('access-confirm').textContent = action;
    return new Promise(resolve => {
      pending = resolve;
      dialog.showModal();
      password.focus();
    });
  }
  return { request };
})();
