# Mastering Ethereum: segunda edición — español latinoamericano

Traducción al español latinoamericano de la segunda edición de *Mastering Ethereum*, desarrollada por The Red Guild.

**Borrador completo en español latinoamericano.** El prefacio y los capítulos 1 a 17 están traducidos y cuentan con una primera revisión con asistencia de IA. La revisión y aprobación humana están pendientes. Se conserva el capítulo 1 del piloto, sin retraducirlo; las figuras heredadas siguen pendientes de tratamiento gráfico y revisión de derechos.

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

El flujo `translation-check.yml` instala con `npm ci` y compila los PR hacia `develop`, sin desplegar. `vocs-pages.yml` solo admite ejecución manual; ya no publica automáticamente al recibir cambios en `develop`. Antes de ejecutarlo se requiere autorización expresa, aprobación editorial y revisión de derechos de las figuras. Esta continuación no publica el sitio ni crea un PR.

Para reproducir una instalación bajo la subruta habitual de GitHub Pages:

```sh
VOCS_BASE_PATH=/ethereumbook-es npm run build
VOCS_BASE_PATH=/ethereumbook-es npm run preview
```

Abrir `http://localhost:4173/ethereumbook-es/`. El workflow obtiene `VOCS_BASE_PATH` y `VOCS_BASE_URL` de `actions/configure-pages`; no se fija un dominio de publicación sin aprobarlo.

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
