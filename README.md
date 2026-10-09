# Para Mi Cielito 💗

Página de recuerdos con un espacio para que Karito escriba sus propios mensajes.

## Carpetas

```text
index.html             Estructura de la página
css/styles.css         Estilos y presentación en celular
js/app.js              Interacciones y editor de mensajes
js/storage.js          Guardado y validación de copias
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

## Mensajes de Karito

En **Karito escribe**, escribe un título y un mensaje y pulsa **Guardar mensaje**. Se respetan los saltos de línea y cada texto incluye el pie **Escrito por Karito 💗**. El botón **Editar** permite modificarlo.

Los mensajes se guardan en `localStorage` del navegador y del sitio donde se abre la página. No hay cuentas ni servidor de datos: la firma es una atribución, no una verificación de identidad. Los mensajes no se sincronizan entre dispositivos ni se escriben en el JSON del repositorio. Borrar los datos del navegador puede eliminarlos.

**Descargar mis mensajes** crea una copia JSON. **Importar una copia** agrega mensajes nuevos sin reemplazar los que tengan el mismo identificador; si hay versiones diferentes del mismo mensaje, se conserva la local. Solo se aceptan copias válidas, hasta 5 MB y 1000 mensajes. Si el almacenamiento falla, el formulario conserva el texto y muestra el error.

Para que ambos vean automáticamente los mensajes desde distintos dispositivos, será necesario conectar almacenamiento compartido y definir el acceso.

## Comprobar

```sh
node --check js/app.js
node --test tests/storage.test.cjs
```
