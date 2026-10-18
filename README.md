# Mastering Ethereum: segunda edición — español latinoamericano

Traducción al español latinoamericano de la segunda edición de *Mastering Ethereum*, desarrollada por The Red Guild.

**Borrador completo en español latinoamericano.** El prefacio y los capítulos 1 a 17 están traducidos y cuentan con una primera revisión con asistencia de IA. La revisión y aprobación humana están pendientes. Se conserva el texto del capítulo 1 del piloto, sin retraducirlo. Las figuras se cotejaron visualmente y se localizaron los diagramas con texto editorial; las capturas auténticas permanecen intactas y tienen explicaciones separadas en español. La fidelidad gráfica y los derechos siguen sujetos a revisión humana.

## Original y autores

- [Repositorio original](https://github.com/ethereumbook/ethereumbook).
- [Lectura en línea del original en inglés](https://masteringethereum.xyz).
- [Edición original en Amazon](https://www.amazon.com/_/dp/1098168429?smid=ATVPDKIKX0DER&_encoding=UTF8&tag=oreilly20-20).

Autores originales:

- [Andreas M. Antonopoulos](https://github.com/aantonop).
- [Gavin Wood](https://github.com/gavofyork).
- [Carlo Parisi](https://github.com/ManInBlackie).
- [Alessandro Mazza](https://github.com/alessandromazza98).
- [Niccolò Pozzolini](https://github.com/choco-cupcake).

La traducción parte de la revisión inglesa `5907a8c137135588a7d5dacd1c3bd6ff6c9c5151`. La versión del repositorio puede contener cambios respecto de la edición impresa.

## Criterios y revisión

- [Guía de traducción](TRANSLATION.md).
- [Glosario](GLOSSARY.md).
- [Estado por capítulo](TRANSLATION_STATUS.md).
- [Observaciones y decisiones de revisión](TRANSLATION_REVIEW.md).

Gas, nonce, rollup, stake y staking se mantienen en inglés. Los ejemplos ejecutables, identificadores, cifras, unidades y resultados se conservan; solo se traducen comentarios explicativos no operativos y etiquetas editoriales identificadas. Las posibles erratas técnicas se registran por separado para que cualquier corrección sea explícita.

## Compilación

El proyecto utiliza [Vocs](https://vocs.dev/) `2.10.3`, con Node.js `26` y dependencias fijadas en `package-lock.json`.

```sh
npm ci
npm run dev
```

Para comprobar la compilación de producción:

```sh
npm run build
npm run preview
```

El servidor de desarrollo usa `http://localhost:5173`; la vista previa, `http://localhost:4173`. El artefacto estático está en `dist/public/`.

`src/SUMMARY.md` define el orden, los títulos y las marcas «en inglés». El preparador copia los capítulos y los documentos editoriales a `.vocs-content/`; no modifica las fuentes. Editar `src/` o los documentos raíz y reiniciar el servidor para regenerar las copias. No editar los directorios generados.

`src/favicon.svg` contiene el rombo de Ethereum usado como favicon, con fondo transparente. El preparador lo copia al directorio público generado; `iconUrl` en `vocs.config.ts` respeta la raíz o subruta de publicación. Para cambiarlo, editar esa fuente y volver a compilar.

El flujo `translation-check.yml` instala con `npm ci` y compila los PR hacia `develop`, sin desplegar. `vocs-pages.yml` solo admite ejecución manual; ya no publica automáticamente al recibir cambios en `develop`. Antes de ejecutarlo se requiere autorización expresa, aprobación editorial y revisión de derechos de las figuras. Esta continuación no publica el sitio ni crea un PR.

Para reproducir una instalación bajo la subruta habitual de GitHub Pages:

```sh
VOCS_BASE_PATH=/ethereumbook-es npm run build
VOCS_BASE_PATH=/ethereumbook-es npm run preview
```

Abrir `http://localhost:4173/ethereumbook-es/`. El workflow obtiene `VOCS_BASE_PATH` y `VOCS_BASE_URL` de `actions/configure-pages`; no se fija un dominio de publicación sin aprobarlo.

## Regeneración de diagramas

Las fuentes editables de las figuras localizadas se conservan en `figure-sources/`, fuera del árbol público. `figure-sources/manifest.json` relaciona cada fuente con su PNG publicado y registra los originales, las etiquetas traducidas, los literales conservados y las revisiones pendientes. Las capturas de aplicaciones permanecen intactas; sus explicaciones se agregan como notas de la traducción.

Las 57 capturas auténticas fueron revisadas: 56 tienen versiones editadas en español que se muestran por defecto. Cada una incluye un aviso visible de traducción mediante inteligencia artificial y revisión humana pendiente. El original en inglés y la explicación de sus controles quedan en un desplegable cerrado; el texto seleccionable y las advertencias de la versión española permanecen visibles. La figura 12-9 contiene solo datos, nombres e iconos y no necesita duplicado. Son traducciones gráficas educativas, no capturas nativas ni actualizaciones de las aplicaciones. El manifiesto separa `screenshot_editions` de `screenshot_preserved`, con máscaras de texto, zonas protegidas, decisiones, procedencia y cotejos por figura. Algunos fragmentos pequeños o tapados se conservan sin reconstruirlos.

La regeneración requiere Graphviz `16.0.0`, librsvg `2.62.3` con `rsvg-convert` y la fuente DejaVu Sans. Las versiones editadas de capturas requieren también ImageMagick `7.1.2-31`. No son dependencias de Vocs ni se necesitan para compilar los PNG ya incluidos:

```sh
node scripts/render-figures.mjs
```

Las fuentes SVG de los diagramas se rasterizan con fondo blanco y escala 2. Para Graphviz se convierte primero DOT a SVG; en ambos casos se usa `rsvg-convert --background-color white --zoom 2`. No se usan recursos externos ni fuentes remotas. Evitar valores de pintura basados en variables CSS `var()`: el renderizador usado puede omitir esas formas. Inspeccionar el PNG generado y cotejarlo con el original antes de actualizarlo. Versiones distintas del renderizador o de las fuentes pueden cambiar la disposición y los bytes de salida.

Para regenerar solo las 56 versiones editadas de capturas, sin procesar los 107 diagramas:

```sh
node scripts/render-figures.mjs --screenshots-only
```

Las superposiciones SVG son transparentes y usan escala 1. El script comprueba el hash y las dimensiones del original, lo compone con ImageMagick desde el origen superior izquierdo y agrega una banda de identificación de 74 px debajo. No redimensiona la captura ni incrusta una copia en la fuente editable. Los valores técnicos y los indicadores de selección conservan sus píxeles; el texto de estado se traduce sin cambiar su significado ni sus roles de color. El cotejo de integración comprueba que los glifos permanezcan dentro de las máscaras y que no haya cambios en las regiones protegidas.

En pantallas pequeñas se puede leer el texto seleccionable de cada suplemento o abrir la imagen mediante el menú contextual del navegador para ampliarla a su resolución completa.

## Revisión desde el host de una VM

Para abrir el libro por la IP de la VM, usar la vista previa de producción:

```sh
npm run preview:host
```

El comando compila el sitio y luego escucha en `0.0.0.0:5173`. Abrir `http://IP_DE_LA_VM:5173/` desde el host. Después de editar las fuentes, detenerlo y ejecutar nuevamente el mismo comando para recompilar.

No exponer `npm run dev` por HTTP mediante una IP: el canal de depuración de Waku usa `crypto.randomUUID()`, disponible solo en contextos seguros como HTTPS o `localhost`. Esto puede romper la navegación entre capítulos aunque la primera página cargue. La compilación de producción no incluye ese canal; no requiere polyfills ni desactivar protecciones del navegador.

La vista previa no tiene autenticación. Usar únicamente en redes de confianza; no publicar el puerto en internet.

## Licencia

La traducción textual se distribuye bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), conforme a la autorización comunicada por Matta y con atribución a los autores originales. Véanse [licencia y atribución](LICENSE.md) y las [condiciones de publicación](TRANSLATION.md#atribución-y-condiciones-de-publicación).

El original describe un período inicial de doce meses bajo [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) y una transición posterior a CC BY-SA 4.0. Se conserva esta información como parte de la procedencia del proyecto.

La autorización comunicada excluye la portada y los elementos de diseño de O'Reilly. Los recursos gráficos heredados quedan sujetos a revisión individual antes de publicar la edición traducida.
