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

## Laboratorios interactivos

Los 17 capítulos tienen un laboratorio complementario original de The Red Guild. El acceso aparece después de la introducción de cada capítulo; [catálogo de laboratorios](site/laboratorios.md) reúne los recorridos y enlaza el registro de revisión. No son parte del texto original ni modifican sus ejemplos.

Cada interfaz muestra un paso por vez; ajustes, fuentes, bytes y registros extensos quedan bajo demanda. Los recorridos distinguen preparar, autorizar, ejecutar y observar, con reglas propias de cada capítulo. Editar invalida la autorización correspondiente; una reversión incluida conserva su recibo, gas y nonce, no se presenta como rechazo previo.

No requieren billetera, RPC, base de datos ni servidor de aplicación. EthereumJS `10.1.3` ejecuta y firma transacciones en Workers locales con cadena educativa `31337` y reglas Shanghai explícitas. Las firmas, hashes y derivaciones HD son reales; red, consenso y economía muestran sus supuestos y omisiones. Las claves privadas educativas son conocidas públicamente: nunca financiarlas, importarlas en una billetera ni introducir secretos personales.

Los capítulos 7 y 8 compilan fuentes editables con Solidity `0.8.30` y Vyper `0.4.3` en el navegador, usando recursos del propio sitio. Los capítulos 16 y 17 generan y verifican pruebas Groth16 reales vinculadas a los circuitos incluidos; no son una zk-EVM ni una configuración apta para fondos. La licencia real de Vyper tiene una adición restrictiva que exige revisión jurídica humana antes de publicar ese compilador; no se presume compatibilidad a partir de sus metadatos.

`npm run build` prepara las páginas, regenera contratos educativos, verifica los artefactos ZK incluidos, compila las 17 entradas de `labs/catalog.mjs`, copia los runtimes y prepara fuentes y licencias antes de compilar Vocs. Node 26 y `tar` son necesarios. El único artefacto de publicación sigue siendo `dist/public/`. Los accesos usan navegación HTML nativa, no el router de Waku; la paginación permanece entre páginas del libro. Raíz y `VOCS_BASE_PATH` se aplican también a módulos, Workers, recursos y enlaces de regreso.

```sh
npm run test:labs
npm run build
npm run preview
```

Las pruebas ejecutan modelos y contratos originales en memoria, sin redes ni ejemplos del libro. `npm run dev` también prepara los laboratorios; sus fuentes independientes no tienen recarga en caliente. Después de editarlas, ejecutar `npm run build:labs` o reiniciar desarrollo. Para acceso por IP HTTP de una VM, usar la vista previa de producción descrita más abajo.

`npm run setup:zk` regenera circuitos, parámetros y claves educativos; no se ejecuta durante una compilación ordinaria. `npm run verify:zk` comprueba los hashes de las fuentes y artefactos incluidos. `npm run setup:licenses` actualiza los textos de licencias de los runtimes fijados; cualquier cambio requiere revisar su procedencia y condiciones.

El catálogo y los pies de los 16 laboratorios nuevos abren `/labs/recursos.html`, con licencias, inventarios y archivo de fuentes preferidas para modificación. El laboratorio original del capítulo 6 conserva su interfaz; el catálogo también permite acceder a sus fuentes. Se incluyen instrucciones para extraer y compilar por separado. El software propio de los laboratorios usa GPL-3.0-or-later; el libro y cada dependencia conservan sus condiciones respectivas. Véanse [licencia](LICENSE.md), [plan](LABS_PLAN.md) y [hallazgos y revisiones](LABS_REVIEW.md).

El estado vive solo en memoria. Reiniciar o recargar descarta el recorrido. Algunos cálculos siguen funcionando sin conexión después de cargar sus recursos; esto no ofrece instalación offline ni recarga sin caché. La revisión asistida no sustituye la aprobación editorial, jurídica o de accesibilidad humana.

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
