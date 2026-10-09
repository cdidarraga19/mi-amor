/* Formato compartido por el navegador y las copias JSON. */
const KaritoStorage = (() => {
  const key = 'mi-amor.karito.mensajes.v1';
  function validate(messages) {
    if (!Array.isArray(messages) || messages.length > 1000) throw new Error('Copia no válida');
    const ids = new Set();
    return messages.map(message => {
      if (!message || typeof message.id !== 'string' || !message.id || ids.has(message.id) ||
          typeof message.titulo !== 'string' || !message.titulo.trim() || message.titulo.length > 120 ||
          typeof message.texto !== 'string' || !message.texto.trim() || message.texto.length > 10000 ||
          typeof message.fecha !== 'string' || !Number.isFinite(Date.parse(message.fecha))) {
        throw new Error('Mensaje no válido');
      }
      ids.add(message.id);
      return { id: message.id, titulo: message.titulo.trim(), texto: message.texto.trim(), fecha: message.fecha, autor: 'Karito' };
    });
  }
  function read() {
    const raw = localStorage.getItem(key);
    return raw === null ? [] : validate(JSON.parse(raw));
  }
  function write(messages) {
    const clean = validate(messages);
    localStorage.setItem(key, JSON.stringify(clean));
    return clean;
  }
  function parseBackup(raw) {
    const backup = JSON.parse(raw);
    if (backup.version !== 1 || backup.app !== 'mi-amor') throw new Error('Copia no válida');
    return validate(backup.mensajes);
  }
  return { read, write, parseBackup };
})();
