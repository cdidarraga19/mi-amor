# Activar los mensajes compartidos en GitHub Pages

GitHub Pages sigue alojando el HTML, CSS y JavaScript. Supabase guarda los mensajes en una base de datos común: ambos dispositivos consultan y modifican los mismos registros. No necesitas cambiar el alojamiento ni subir un archivo al repositorio cada vez que escribes.

## 1. Crear el proyecto

1. Entra en https://supabase.com/dashboard y crea una cuenta si no tienes una.
2. Pulsa **New project**, elige tu organización y un nombre como `mi-amor`.
3. Establece la contraseña de la base de datos y elige una región cercana. Esa contraseña es para administrar la base de datos; no se coloca en la página.
4. Espera a que el proyecto esté listo.

## 2. Crear la tabla y sus permisos

1. Abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido completo de [karito.sql](karito.sql) y pulsa **Run**.
3. El script crea la tabla `karito_mensajes`, habilita Row Level Security y permite leer los mensajes. Solo las funciones que verifican la contraseña compartida pueden crear, editar o eliminar registros.

El script también activa RLS en `karito_private.config`, sin políticas de acceso para visitantes, y revoca sus permisos. Esa tabla guarda únicamente el hash de la contraseña.

Si aparece **Potential issues detected**, vuelve a copiar la versión actual de `karito.sql`. Si la confirmación sigue apareciendo, elige **Run and enable RLS**. El aviso de operaciones destructivas puede señalar el reemplazo de la política de lectura y la definición de la función de eliminación: ejecutar este script no elimina mensajes ni tablas. La función solo elimina un mensaje cuando se invoca después con la contraseña correcta.

La lectura es pública, igual que la página: cualquier visitante con acceso al sitio puede ver estos mensajes. La contraseña protege las modificaciones. Las firmas distinguen a Karito y Tu Amor, pero no son cuentas personales. Si quieres que solo ustedes dos puedan leer, hace falta agregar inicio de sesión y cambiar estos permisos.

## 3. Configurar la contraseña compartida

En **otra consulta del SQL Editor**, ejecuta lo siguiente, reemplazando `REEMPLAZAR_POR_UNA_CONTRASENA_LARGA` por una contraseña que ambos conozcan. Elige una contraseña nueva de al menos 12 caracteres; bcrypt admite hasta 72 bytes.

```sql
insert into karito_private.config (id, password_hash)
values (true, extensions.crypt('REEMPLAZAR_POR_UNA_CONTRASENA_LARGA', extensions.gen_salt('bf', 10)))
on conflict (id) do update set password_hash = excluded.password_hash;
```

Esta consulta se ejecuta únicamente en Supabase. **No guardes la contraseña en un archivo del repositorio ni en `karito.json`.** Si contiene una comilla simple, escríbela duplicada dentro del literal SQL. Puedes volver a ejecutar esta consulta para cambiar la contraseña.

El navegador ya no compara con la antigua contraseña `060324`. Cada operación comprueba la nueva contraseña en el servidor y no la conserva en el navegador.

## 4. Conectar la página

1. En el proyecto de Supabase, abre **Connect** para copiar la **Project URL**. También está en la configuración de la Data API.
2. Abre **Settings → API Keys** y copia la **publishable key** (`sb_publishable_…`). También se admite la antigua clave **anon**.
3. Edita [../json/karito.json](../json/karito.json):

```json
{
  "supabaseUrl": "https://TU_PROYECTO.supabase.co",
  "publicKey": "sb_publishable_TU_CLAVE_PUBLICA"
}
```

La URL debe ser la del proyecto, sin `/rest/v1`. La clave pública se puede publicar en GitHub Pages; los permisos de la base de datos controlan qué permite hacer. **Nunca uses una clave `service_role`, `sb_secret_…` ni la contraseña de la base de datos.**

No necesitas configurar redirecciones de Auth ni instalar dependencias: la página usa HTTPS y la Data REST API de Supabase con `fetch`.

## 5. Publicar y comprobar

1. Sube los cambios del proyecto a la rama/carpeta desde la que publicas GitHub Pages, incluidos `js/shared-storage.js`, `json/karito.json`, `js/access.js`, `js/karito.js`, `pages/karito.html` y los estilos.
2. Espera a que termine la publicación de GitHub Pages y recarga **Karito escribe**.
3. Elige quién escribe, añade un título y un mensaje, y pulsa **Guardar mensaje**. Introduce la contraseña compartida que configuraste en Supabase.
4. Abre la misma página desde otro dispositivo o una ventana privada: el mensaje debe aparecer.
5. Mientras la página está visible, consulta cambios cada 10 segundos. También puedes pulsar **Actualizar mensajes**. Al volver a la pestaña o recuperar internet, vuelve a consultar.
6. Prueba una contraseña incorrecta: no debe guardar cambios. Edita o elimina con la correcta y comprueba el cambio desde el segundo dispositivo.

Si aún no configuras Supabase, la página indica que no está conectada y desactiva el guardado. **No simula un guardado compartido usando `localStorage`.** Una interrupción de internet conserva el texto del formulario y los mensajes que ya se mostraron.

## Pasar los mensajes anteriores

Los mensajes antiguos siguen en el almacenamiento local del navegador donde se escribieron. Abre la página publicada desde ese mismo navegador y origen; aparecerá **Compartir mensajes de este navegador** si hay mensajes pendientes. Pulsa el botón e introduce la contraseña compartida.

La importación conserva las fechas y los identificadores, no sobrescribe mensajes que ya existen en Supabase y no borra la copia local. Repítelo desde cualquier otro navegador donde antes hayan escrito. El sitio no puede recuperar el almacenamiento de otro dispositivo por su cuenta.

## Problemas habituales

- **No está conectado:** faltan la URL o la clave pública en `json/karito.json`, o tienen un formato incorrecto.
- **No permite cargar o guardar:** confirma que ejecutaste `karito.sql` completo y que el proyecto está activo. Revisa la pestaña Network del navegador y la conexión.
- **Falta configurar la contraseña:** ejecuta la consulta del paso 3.
- **El mensaje cambió desde otro dispositivo:** cancela la confirmación, actualiza los mensajes y vuelve a abrir la edición. El texto que estabas escribiendo se conserva hasta que tú lo cambies o canceles la edición.
- **Faltan los mensajes antiguos:** revisa el navegador y la dirección donde se escribieron; los datos locales pertenecen a ese origen.

Referencias oficiales: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Data REST API](https://supabase.com/docs/guides/api), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Database functions](https://supabase.com/docs/guides/database/functions).
