'use strict';

// Barrera de confirmación local; no sustituye autenticación en un servidor.
const KaritoAccess = (() => {
  const dialog = document.getElementById('message-access');
  const form = document.getElementById('access-form');
  const password = document.getElementById('access-password');
  const error = document.getElementById('access-error');
  let pending = null;
  let returnFocus = null;

  function finish(allowed) {
    const resolve = pending;
    pending = null;
    password.value = '';
    error.textContent = '';
    dialog.close();
    if (returnFocus?.isConnected) returnFocus.focus();
    resolve?.(allowed);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (password.value !== '060324') {
      password.value = '';
      error.textContent = 'Contraseña incorrecta. Intenta de nuevo.';
      password.focus();
      return;
    }
    finish(true);
  });
  document.getElementById('access-cancel').addEventListener('click', () => finish(false));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    finish(false);
  });
  dialog.addEventListener('close', () => { if (pending) finish(false); });

  function request(description, action = 'Guardar') {
    if (pending) return Promise.resolve(false);
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
