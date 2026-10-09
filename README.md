# Para Mi Cielito 💗

Página de recuerdos con un espacio para que Karito escriba sus propios mensajes.

## Carpetas

```text
index.html             Portada y accesos a los catálogos
pages/                 Nosotros, mensajes, Karito, historia y razones
css/styles.css         Estilos y presentación en celular
js/app.js              Menú y corazones compartidos
js/content.js          Carga del catálogo de la página actual
js/karito.js           Crear, editar y eliminar mensajes
js/access.js           Confirmación con contraseña verificada en el servidor
js/storage.js          Lectura y validación de mensajes locales anteriores
js/shared-storage.js   Conexión con los mensajes compartidos en Supabase
js/music.js            Volumen y selección de canción o Spotify
json/karito.json       URL y clave pública de Supabase
supabase/              Script SQL y guía para activar la conexión
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

Cada catálogo tiene su propio archivo en `pages/`: `nosotros.html`, `mensajes.html`, `karito.html`, `historia.html` y `razones.html`. El menú permite navegar entre todos y marca la página actual. La portada no carga los mensajes ni el contenido de los catálogos. Los enlaces relativos funcionan también al alojar el proyecto en una subcarpeta. El enlace anterior `fotos.html` redirige al libro de Nosotros.

Edita `json/contenido.json` para cambiar los textos originales. Conserva las comillas y comas del formato JSON. Las fotos están en `img/foto1.jpg` a `img/foto8.jpg`; la canción está en `musica/cancion.mp3`.

**Nosotros** muestra un libro con una foto por página y conserva el contador de tiempo juntos. Pasa las páginas con **Anterior** y **Siguiente**, o con las flechas del teclado cuando el libro tiene el foco. Las fotos se muestran completas y el diseño se adapta al celular. El apartado independiente de Fotos se integró en este libro; se conservan los archivos originales.

En `json/contenido.json`, `totalFotos` indica cuántas páginas tiene el libro. Cada entrada de `libro` contiene el `titulo` y el `texto` que acompañan a la foto del mismo número: la primera entrada corresponde a `img/foto1.jpg`. Puedes añadir `descripcionFoto` para personalizar el texto alternativo de una imagen. Para agregar una página, guarda la siguiente foto numerada, aumenta `totalFotos` y agrega su texto a `libro`.

## Música y Spotify

Pulsa el botón flotante 🎵 para abrir los controles. **Nuestra canción** permite reproducir, pausar y ajustar el volumen de 0 a 100 %. En algunos celulares el volumen solo se puede ajustar con los botones del dispositivo.

Elige **Playlist de Spotify** para escuchar la playlist fija del proyecto. No hay campo de enlace ni botón para cargar otra playlist. La fuente y el volumen local se recuerdan en ese navegador. Al cambiar de fuente se detiene la anterior. Cerrar el panel permite seguir escuchando.

Al navegar a otro catálogo se carga una página nueva y la reproducción se detiene; puedes iniciarla otra vez desde el botón de música. Las preferencias de fuente y volumen se conservan.

Para elegir una playlist predeterminada para quienes visitan la página, coloca su enlace en `spotifyPlaylist` dentro de `json/musica.json`. Mientras ese campo esté vacío y no haya una preferencia guardada, se mantiene la canción local. `volumenInicial` define el volumen inicial de la canción local, de 0 a 100.

Se usa el reproductor oficial de Spotify, sin claves ni inicio de sesión propio. Spotify decide la reproducción disponible para cada visitante y puede ofrecer fragmentos. El control de volumen local no controla Spotify: su API de inserción no expone ese control; usa el volumen del dispositivo. El enlace **Abrir en Spotify** permite abrir la playlist si el reproductor integrado no carga.

Referencias: [insertar una playlist](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed) y [API del reproductor integrado](https://developer.spotify.com/documentation/embeds/references/iframe-api).

## Mensajes de Karito

**Karito escribe** usa una base de datos compartida en Supabase, compatible con GitHub Pages. Ambos pueden escribir y consultar los mismos mensajes desde cualquier navegador o dispositivo. La página busca novedades cada 10 segundos mientras está visible y permite actualizar manualmente.

Para activarlo, sigue [la guía de configuración de Supabase](supabase/README.md): crea el proyecto, ejecuta `supabase/karito.sql`, configura una contraseña compartida en el SQL Editor y coloca la URL y la clave pública en `json/karito.json`. Después publica los archivos en GitHub Pages. Sin esa configuración, el guardado permanece desactivado.

Elige **Karito** o **Tu Amor**, escribe un título y un mensaje y pulsa **Guardar mensaje**. Cada creación, edición, eliminación o traslado de mensajes antiguos solicita la contraseña compartida, validada en el servidor. No se mantiene una sesión desbloqueada. Cancelar conserva el borrador; al eliminar, el mensaje desaparece para ambos. Las firmas son una atribución, no cuentas individuales. Los mensajes se pueden leer públicamente desde la página; la contraseña protege las modificaciones.

Las ediciones comprueban la versión del mensaje para evitar sobrescribir cambios de otro dispositivo. Un fallo de conexión conserva el borrador y los mensajes ya visibles, sin fingir que se guardaron.

Los mensajes anteriores siguen en el navegador donde se escribieron. El botón **Compartir mensajes de este navegador** permite copiarlos a Supabase, conservando la copia local y sin sobrescribir mensajes ya compartidos. Hay que hacerlo desde cada navegador/origen que contenga mensajes antiguos.

## Comprobar

```sh
node --check js/app.js
node --check js/music.js
node --test --test-isolation=none tests/storage.test.cjs tests/music.test.cjs tests/access.test.cjs tests/pages.test.cjs tests/shared-storage.test.cjs tests/karito.test.cjs
```
