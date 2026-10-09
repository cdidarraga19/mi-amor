'use strict';

// La clave pública identifica el proyecto; la contraseña se valida solo en SQL.
const KaritoSharedStorage = (() => {
  let config = null;
  const fields = 'id,titulo,texto,fecha,autor,updated_at';
  const fail = (message, code) => Object.assign(new Error(message), { code });

  async function init() {
    const response = await fetch((document.body.dataset.root || '') + 'json/karito.json', { cache: 'no-store' });
    if (!response.ok) throw fail('No pudimos cargar la configuración de los mensajes.', 'CONFIG');
    const data = await response.json();
    if (!data.supabaseUrl || !data.publicKey) {
      throw fail('Los mensajes compartidos todavía no están configurados.', 'CONFIG');
    }
    const url = new URL(data.supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || !['', '/'].includes(url.pathname)) {
      throw fail('Revisa la URL del proyecto de Supabase.', 'CONFIG');
    }
    if (typeof data.publicKey !== 'string' || data.publicKey.startsWith('sb_secret_')) {
      throw fail('Usa una clave pública de Supabase.', 'CONFIG');
    }
    if (!data.publicKey.startsWith('sb_publishable_')) {
      // Las claves anon antiguas son JWT. Nunca aceptar service_role.
      let role;
      try { role = JSON.parse(atob(data.publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; }
      catch { throw fail('La clave pública de Supabase no es válida.', 'CONFIG'); }
      if (role !== 'anon') throw fail('Usa la clave anon o publishable, nunca service_role.', 'CONFIG');
    }
    config = { url: url.origin, key: data.publicKey };
  }

  async function request(endpoint, body) {
    if (!config) throw fail('Los mensajes compartidos todavía no están configurados.', 'CONFIG');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const headers = { apikey: config.key };
      if (!config.key.startsWith('sb_publishable_')) headers.Authorization = 'Bearer ' + config.key;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(config.url + '/rest/v1/' + endpoint, {
        method: body === undefined ? 'GET' : 'POST', headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: 'no-store', signal: controller.signal
      });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        if (data?.message === 'KARITO_PASSWORD') throw fail('Contraseña incorrecta. Intenta de nuevo.', 'PASSWORD');
        if (data?.message === 'KARITO_CONFLICT') {
          throw fail('Este mensaje cambió desde otro dispositivo. Cancela, revisa la versión actual y vuelve a editarlo.', 'CONFLICT');
        }
        if (data?.message === 'KARITO_NOT_CONFIGURED') throw fail('Falta configurar la contraseña en Supabase.', 'CONFIG');
        throw fail('No pudimos completar la operación. Revisa la conexión y la configuración de Supabase.', 'REMOTE');
      }
      return data;
    } finally { clearTimeout(timeout); }
  }

  async function read() {
    // Paginar evita truncar la vista al superar el límite de respuesta del servidor.
    const result = [];
    let offset = 0;
    while (true) {
      const batch = await request('karito_mensajes?select=' + fields + '&order=fecha.desc,id.desc&limit=100&offset=' + offset);
      if (!Array.isArray(batch)) throw fail('La respuesta de los mensajes no es válida.', 'REMOTE');
      result.push(...batch);
      if (batch.length < 100) return result;
      offset += batch.length;
    }
  }

  function save(message, password) {
    return request('rpc/karito_guardar', { p_password: password, p_message: message, p_expected: message.updated_at || null });
  }
  function remove(message, password) {
    return request('rpc/karito_eliminar', { p_password: password, p_id: message.id, p_expected: message.updated_at });
  }
  function migrate(messages, password) {
    return request('rpc/karito_importar', { p_password: password, p_messages: messages });
  }
  return { init, read, save, remove, migrate };
})();
