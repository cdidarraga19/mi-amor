# Para Mi Cielito 💗

Página de recuerdos con un espacio para que Karito escriba sus propios mensajes.

## Carpetas

```text
index.html             Portada y accesos a los catálogos
pages/                 Nosotros, mensajes, Karito, fotos, historia y razones
css/styles.css         Estilos y presentación en celular
js/app.js              Menú y corazones compartidos
js/content.js          Carga del catálogo de la página actual
js/karito.js           Crear, editar y eliminar mensajes
js/access.js           Confirmación por contraseña
js/storage.js          Guardado y validación de mensajes
js/music.js            Volumen y selección de canción o Spotify
json/musica.json       Playlist predeterminada y volumen inicial
json/contenido.json    Fecha de inicio, cartas, historia y razones
img/                   Fotos originales
musica/                Canción original
scripts/serve.cjs      Servidor local sin dependencias
tests/                Pruebas de navegación, contenido, música y mensajes
```

## Ver la página

Con Node.js instalado, ejecuta desde esta carpeta:

```sh
node scripts/serve.cjs
```

Abre http://localhost:8080. También puedes usar Live Server de VS Code o publicar estas carpetas en un alojamiento estático como GitHub Pages. Abrir `index.html` con doble clic no permite cargar el JSON en los navegadores habituales.

## Personalizar

Cada catálogo tiene su propio archivo en `pages/`: `nosotros.html`, `mensajes.html`, `karito.html`, `fotos.html`, `historia.html` y `razones.html`. El menú permite navegar entre todos y marca la página actual. La portada no carga los mensajes ni el contenido de los catálogos. Los enlaces relativos funcionan también al alojar el proyecto en una subcarpeta.

Edita `json/contenido.json` para cambiar los textos originales. Conserva las comillas y comas del formato JSON. Las fotos están en `img/foto1.jpg` a `img/foto8.jpg`; la canción está en `musica/cancion.mp3`.

## Música y Spotify

Pulsa el botón flotante 🎵 para abrir los controles. **Nuestra canción** permite reproducir, pausar y ajustar el volumen de 0 a 100 %. En algunos celulares el volumen solo se puede ajustar con los botones del dispositivo.

Elige **Playlist de Spotify** para escuchar la playlist fija del proyecto. No hay campo de enlace ni botón para cargar otra playlist. La fuente y el volumen local se recuerdan en ese navegador. Al cambiar de fuente se detiene la anterior. Cerrar el panel permite seguir escuchando.

Al navegar a otro catálogo se carga una página nueva y la reproducción se detiene; puedes iniciarla otra vez desde el botón de música. Las preferencias de fuente y volumen se conservan.

Para elegir una playlist predeterminada para quienes visitan la página, coloca su enlace en `spotifyPlaylist` dentro de `json/musica.json`. Mientras ese campo esté vacío y no haya una preferencia guardada, se mantiene la canción local. `volumenInicial` define el volumen inicial de la canción local, de 0 a 100.

Se usa el reproductor oficial de Spotify, sin claves ni inicio de sesión propio. Spotify decide la reproducción disponible para cada visitante y puede ofrecer fragmentos. El control de volumen local no controla Spotify: su API de inserción no expone ese control; usa el volumen del dispositivo. El enlace **Abrir en Spotify** permite abrir la playlist si el reproductor integrado no carga.

Referencias: [insertar una playlist](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed) y [API del reproductor integrado](https://developer.spotify.com/documentation/embeds/references/iframe-api).

## Mensajes de Karito

En **Karito escribe**, escribe un título y un mensaje y pulsa **Guardar mensaje**. Se respetan los saltos de línea y cada texto incluye el pie **Escrito por Karito 💗**. El botón **Editar** permite modificarlo.

Cada vez que se agrega, modifica o elimina un mensaje se solicita la contraseña `060324`. No se mantiene una sesión desbloqueada. **Cancelar** o pulsar Escape cierra la solicitud sin aplicar cambios ni perder el borrador. **Eliminar** muestra el título del mensaje y pide la contraseña como confirmación; la eliminación solo afecta a ese mensaje en este navegador y no se puede deshacer.

Esta contraseña es una barrera sencilla dentro de la página, no autenticación segura: al ser un sitio estático, el código y el almacenamiento local pueden inspeccionarse o modificarse. Para proteger los datos frente a otras personas se necesita validación en un servidor.

Los mensajes se guardan en `localStorage` del navegador y del sitio donde se abre la página. No hay cuentas ni servidor de datos: la firma es una atribución, no una verificación de identidad. Los mensajes no se sincronizan entre dispositivos ni se escriben en el JSON del repositorio. Borrar los datos del navegador puede eliminarlos.

No hay opciones de exportación ni importación en la página. Los mensajes guardados antes de la separación en páginas se mantienen si abres el sitio desde el mismo navegador y origen. Si el almacenamiento falla, el formulario conserva el texto y muestra el error.

Para que ambos vean automáticamente los mensajes desde distintos dispositivos, será necesario conectar almacenamiento compartido y definir el acceso.

## Comprobar

```sh
node --check js/app.js
node --check js/music.js
node --test --test-isolation=none tests/storage.test.cjs tests/music.test.cjs tests/access.test.cjs tests/pages.test.cjs
```
