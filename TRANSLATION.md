# Guía de traducción

## Alcance y original de referencia

Traducción al español latinoamericano de la segunda edición de *Mastering Ethereum*, realizada por el proyecto de The Red Guild. El trabajo comenzó con un piloto del capítulo 1, la guía editorial y el glosario. Por instrucción posterior del usuario se continuó con el prefacio y los capítulos 2 a 17; la autorización para continuar no equivale a aprobación humana del texto ni de las convenciones propuestas.

- Fuente: <https://github.com/ethereumbook/ethereumbook>.
- Fork de trabajo: <https://github.com/theredguild/ethereumbook-es>.
- Rama base del piloto: `develop`.
- Commit original fijado: `5907a8c137135588a7d5dacd1c3bd6ff6c9c5151`.
- Fecha de inicio del piloto: 2026-10-15.
- Idioma de destino: español latinoamericano (`es-419`).

El commit identifica la revisión del repositorio que se traduce; no se presupone que coincida exactamente con el texto de la edición impresa. Los cambios posteriores del upstream deben revisarse por separado antes de incorporarlos.

## Voz y fidelidad

Utilizar español técnico claro, con vocabulario comprensible en Latinoamérica. Usar «computadora», «archivo» y «de código abierto». Evitar voseo, vosotros y expresiones regionales. Conservar la voz del original, incluida la primera persona del plural; preferir formulaciones impersonales cuando el inglés se dirija al lector.

Traducir todo el contenido de cada capítulo: títulos, párrafos, listas, citas, notas, tablas, leyendas y texto alternativo de imágenes. Mantener el orden y la granularidad de los párrafos para facilitar la comparación. No convertir la traducción en una actualización técnica o una adaptación resumida.

Conservar el sentido de negaciones, condiciones, límites, supuestos, grados de certeza y afirmaciones de seguridad. No reforzar «puede» hasta convertirlo en «garantiza», ni confundir firma, cifrado, hash, consenso o finalidad.

Traducir las referencias temporales desde la perspectiva del original: «al momento de escribir este libro», «actualmente» y «en los próximos años» no se actualizan al año de traducción. Registrar las afirmaciones que requieran una revisión técnica en `TRANSLATION_REVIEW.md`.

## Terminología

Consultar `GLOSSARY.md` antes de elegir una traducción. Cuando aporte claridad, introducir el equivalente inglés entre paréntesis en la primera aparición de un concepto por capítulo. Las siglas se conservan y se desarrollan en su primera aparición cuando el original lo haga o sea necesario para comprender el término traducido.

Gas, nonce, rollup, stake y staking permanecen en inglés por decisión de Matta. El piloto propone conservar «proof of stake (PoS)» y usar «hacer staking» como forma verbal; ambas convenciones están pendientes de revisión humana. No crear formas como «estacar», «apostar» o «prueba de participación». Escribir estos términos como vocabulario técnico normal, sin comillas o cursivas sistemáticas; conservar el énfasis cuando el original introduce una definición.

Conservar nombres como The Merge, Beacon Chain, Yellow Paper, Solidity y Script. «Blockchain» se utiliza en femenino; «ether» designa la moneda y «Ethereum», la red o plataforma. Conservar ETH y las unidades del original.

## Integridad técnica y Markdown

- Conservar código ejecutable, palabras reservadas, identificadores, cadenas literales, comandos, argumentos, rutas y resultados esperados.
- Traducir únicamente comentarios explicativos sin función operativa; conservar directivas, anotaciones, doctests y comentarios interpretados por herramientas.
- Conservar cifras, precisión, unidades y notación de ejemplos. Mantener los separadores de las cifras del original para que puedan cotejarse sin ambigüedad; las fechas en prosa se traducen sin alterar su valor.
- Conservar destinos de enlaces y rutas de imágenes. Traducir etiquetas y texto alternativo. No reemplazar enlaces cortos ni actualizar dependencias como parte de una traducción.
- Conservar los nombres de archivo `chapter_N.md`. Actualizar `src/SUMMARY.md` al traducir títulos y distinguir los capítulos aún en inglés.
- Comprobar las anclas internas al traducir encabezados. Una compilación correcta no basta para verificar que todos los fragmentos de URL sigan apuntando al destino adecuado.
- Preservar la semántica del formato. Se pueden corregir delimitadores de Markdown rotos si se registra la corrección editorial, sin cambiar la afirmación técnica.
- No editar imágenes durante el piloto. Traducir leyendas y texto alternativo y registrar cualquier texto incrustado pendiente de tratamiento.

## Compilación con Vocs

El libro se compila con Vocs `2.10.3`, no con mdBook. `npm run dev` y `npm run build` ejecutan primero `scripts/prepare-vocs.mjs`, que deriva la navegación de `src/SUMMARY.md` y copia las fuentes a `.vocs-content/pages/`. La guía, el glosario, el estado, las observaciones y la licencia se incluyen como páginas del sitio sin mantener una segunda copia editorial.

Las rutas de las fuentes y de las imágenes no cambian. La compilación adapta los enlaces Markdown a rutas web y sirve las imágenes desde el directorio público, también bajo una subruta de Pages. Los destinos externos se conservan, incluso cuando apuntan al original en inglés. El HTML del sitio y los bloques de la traducción usan `es-419`; los ejemplos, las salidas, los títulos y las etiquetas literales que deban conservarse pueden permanecer en inglés.

`scripts/plain-markdown.mjs` mantiene un parser CommonMark/GFM para el renderizado, la búsqueda y la exportación. Vocs fuerza MDX en sus índices incluso al leer `.md`; el parser separado evita interpretar autolinks, MathML o ejemplos como JSX. `rehype-raw` conserva el HTML y MathML heredados. `site/_root.tsx` reutiliza el shell de Vocs y sus recursos CSS para fijar el idioma antes de la hidratación; depende de la estructura del wrapper RSC de las versiones fijadas. Al actualizar dependencias, comprobar HTML inicial, estilos, búsqueda, fórmulas y bloques de código.

La configuración de Vite sustituye el enlace de accesibilidad de Vocs `2.10.3` por `components/SkipToContent.client.tsx` para que incluya la subruta de Pages. Conserva la navegación nativa por fragmentos. Las páginas generadas desactivan los accesos a chats externos de IA; la búsqueda local sigue habilitada.

Las instrucciones de instalación y vista previa están en `README.md` del repositorio. El despliegue es manual y requiere autorización; una compilación correcta no equivale a aprobación editorial ni de derechos.

## Revisión y seguimiento

Cada capítulo pasa por: pendiente → borrador traducido → primera revisión de fidelidad e integridad → revisión humana → aprobado. Registrar el estado real en `TRANSLATION_STATUS.md`; no marcar como aprobado un texto que Matta no haya validado.

La primera revisión compara el contenido completo con la versión inglesa fijada: párrafos, encabezados, listas, citas, notas, referencias, cifras y ejemplos. Las comprobaciones automáticas ayudan a detectar diferencias estructurales y destinos alterados; no sustituyen la revisión semántica.

Para la continuación se cotejó cada bloque del prefacio y de los capítulos 2 a 17 con la fuente fijada. Se conservaron la estructura y las líneas para proteger referencias numéricas a ejemplos. Las excepciones al cotejo literal de bloques son comentarios explicativos inequívocos y etiquetas de diagramas editoriales; se conservan directivas, SPDX, NatSpec, cadenas y salidas de herramientas. Las muestras tipográficas del prefacio no se tratan como identificadores. Las expresiones matemáticas se cotejan también fuera de MathML.

El glosario registra las convenciones comunes de los borradores; variantes detectadas entre capítulos se concilian antes de integrar. Un cotejo semántico asistido o una revisión independiente adicional tampoco constituyen aprobación humana. El estado de cada archivo y la evidencia nueva se registran por separado del historial del piloto.

Continuar el trabajo independiente mientras se registra una duda puntual. Consultar a Matta cuando una ambigüedad cambie el significado, una decisión afecte a varios capítulos o se proponga corregir una afirmación técnica del original. Documentar la resolución en el glosario o en el registro de revisión, según corresponda.

Proponer un PR por capítulo. Incluir el commit fuente, el estado de revisión, los términos nuevos, las dudas pendientes y el resultado de la compilación. El piloto incluye además la documentación editorial y la navegación mínima para identificar la traducción.

## Atribución y condiciones de publicación

Autores del original: Andreas M. Antonopoulos, Gavin Wood, Carlo Parisi, Alessandro Mazza y Niccolò Pozzolini. Conservar sus créditos y los avisos del original. Identificar explícitamente la traducción y sus modificaciones.

Matta comunicó autorización de O'Reilly para traducir y publicar bajo CC BY-SA 4.0, con exclusión de la portada y los elementos de diseño de O'Reilly. Confirmó que el plazo habilitante ya se cumplió. Este registro resume las condiciones comunicadas; no reproduce el correo privado ni atribuye un aval editorial a la traducción.

El README del upstream describe un período inicial de doce meses bajo CC BY-NC-ND 4.0 seguido por CC BY-SA 4.0. Conservar esa procedencia documental. La traducción textual se ofrece bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), con atribución, identificación de los cambios y la misma licencia para las adaptaciones, conforme a la autorización comunicada. Véase `LICENSE.md`.

Las figuras heredadas deben revisarse individualmente en cuanto a procedencia, derechos y texto incrustado. No dar por autorizados todos los recursos gráficos por el solo hecho de estar en el repositorio. El piloto conserva sus referencias existentes y no incorpora arte ni diseño nuevos.
