# Para Mi Cielito 💗

Página de recuerdos con un espacio para que Karito escriba sus propios mensajes.

## Carpetas

```text
index.html             Estructura de la página
css/styles.css         Estilos y presentación en celular
js/app.js              Interacciones y editor de mensajes
js/storage.js          Guardado y validación de copias
js/music.js            Volumen y selección de canción o Spotify
json/musica.json       Playlist predeterminada y volumen inicial
json/contenido.json    Fecha de inicio, cartas, historia y razones
img/                   Fotos originales
musica/                Canción original
scripts/serve.cjs      Servidor local sin dependencias
tests/storage.test.cjs Pruebas del almacenamiento y copias
```

## Ver la página

Con Node.js instalado, ejecuta desde esta carpeta:

```sh
node scripts/serve.cjs
```

Abre http://localhost:8080. También puedes usar Live Server de VS Code o publicar estas carpetas en un alojamiento estático como GitHub Pages. Abrir `index.html` con doble clic no permite cargar el JSON en los navegadores habituales.

## Personalizar

Edita `json/contenido.json` para cambiar los textos originales. Conserva las comillas y comas del formato JSON. Las fotos están en `img/foto1.jpg` a `img/foto8.jpg`; la canción está en `musica/cancion.mp3`.

## Música y Spotify

Pulsa el botón flotante 🎵 para abrir los controles. **Nuestra canción** permite reproducir, pausar y ajustar el volumen de 0 a 100 %. En algunos celulares el volumen solo se puede ajustar con los botones del dispositivo.

Elige **Playlist de Spotify**, pega el enlace completo de una playlist (`https://open.spotify.com/playlist/...`) y pulsa **Cargar playlist**. El enlace y el volumen se recuerdan en ese navegador. Al cambiar de fuente se detiene la anterior. Cerrar el panel permite seguir escuchando.

Para elegir una playlist predeterminada para quienes visitan la página, coloca su enlace en `spotifyPlaylist` dentro de `json/musica.json`. Mientras ese campo esté vacío y no haya una preferencia guardada, se mantiene la canción local. `volumenInicial` define el volumen inicial de la canción local, de 0 a 100.

Se usa el reproductor oficial de Spotify, sin claves ni inicio de sesión propio. Spotify decide la reproducción disponible para cada visitante y puede ofrecer fragmentos. El control de volumen local no controla Spotify: su API de inserción no expone ese control; usa el volumen del dispositivo. El enlace **Abrir en Spotify** permite abrir la playlist si el reproductor integrado no carga.

Referencias: [insertar una playlist](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed) y [API del reproductor integrado](https://developer.spotify.com/documentation/embeds/references/iframe-api).

## Mensajes de Karito

En **Karito escribe**, escribe un título y un mensaje y pulsa **Guardar mensaje**. Se respetan los saltos de línea y cada texto incluye el pie **Escrito por Karito 💗**. El botón **Editar** permite modificarlo.

Los mensajes se guardan en `localStorage` del navegador y del sitio donde se abre la página. No hay cuentas ni servidor de datos: la firma es una atribución, no una verificación de identidad. Los mensajes no se sincronizan entre dispositivos ni se escriben en el JSON del repositorio. Borrar los datos del navegador puede eliminarlos.

**Descargar mis mensajes** crea una copia JSON. **Importar una copia** agrega mensajes nuevos sin reemplazar los que tengan el mismo identificador; si hay versiones diferentes del mismo mensaje, se conserva la local. Solo se aceptan copias válidas, hasta 5 MB y 1000 mensajes. Si el almacenamiento falla, el formulario conserva el texto y muestra el error.

Para que ambos vean automáticamente los mensajes desde distintos dispositivos, será necesario conectar almacenamiento compartido y definir el acceso.

## Comprobar

```sh
node --check js/app.js
node --check js/music.js
node --test --test-isolation=none tests/storage.test.cjs tests/music.test.cjs
```
