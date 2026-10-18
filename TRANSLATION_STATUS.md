# Estado de la traducción

Original fijado: `5907a8c137135588a7d5dacd1c3bd6ff6c9c5151`. Actualizado: 2026-10-18.

«Primera revisión» significa cotejo del borrador con el original realizado con asistencia de IA. No implica aprobación humana ni que la edición esté lista para publicarse. La aprobación corresponde a Matta.

Estado gráfico actual: 107 diagramas recreados y 56 capturas editadas en español visibles por defecto, con aviso de traducción mediante IA y revisión humana pendiente. Sus originales intactos en inglés se conservan en desplegables cerrados. La captura 12-9 no necesita duplicado porque solo contiene literales, nombres e iconos. Los textos ilegibles, recortados u ocultos se conservan sin inventar contenido.

| Archivo | Estado | Pendiente |
| --- | --- | --- |
| `README.md` y `src/intro.md` | Presentación del proyecto en español | Revisión humana de atribución y presentación. |
| `src/SUMMARY.md` | Navegación de los 19 apartados en español | Revisión humana de títulos. |
| `src/preface.md` | Borrador traducido y primera revisión | Revisión humana de texto, créditos y avisos. |
| `src/chapter_1.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C1-01 a C1-08 en `TRANSLATION_REVIEW.md`; figura 1-1. |
| `src/chapter_2.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C2 y figuras. |
| `src/chapter_3.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C3 y figura. |
| `src/chapter_4.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C4 y figuras. |
| `src/chapter_5.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C5 y figuras. |
| `src/chapter_6.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C6 y figuras. |
| `src/chapter_7.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C7 y figura. |
| `src/chapter_8.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C8. |
| `src/chapter_9.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C9 y figura. |
| `src/chapter_10.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C10 y figura. |
| `src/chapter_11.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C11 y figuras. |
| `src/chapter_12.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C12 y figuras. |
| `src/chapter_13.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C13 y figuras. |
| `src/chapter_14.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C14 y figuras. |
| `src/chapter_15.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C15 y figuras. |
| `src/chapter_16.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C16 y figuras. |
| `src/chapter_17.md` | Borrador traducido y primera revisión | Revisión humana; observaciones C17 y figuras. |

La tabla registra avance, no una estimación porcentual de calidad. Las reglas y las equivalencias propuestas se encuentran en `TRANSLATION.md` y `GLOSSARY.md`.

## Recuperación del piloto y migración a Vocs

- Se recuperó `changes.patch` del ZIP `mastering-ethereum-es-419-pilot.zip` sobre la base indicada. SHA-256 del ZIP comprobado: `930a87887e3bde17d3512bac0893a68e87a30b643eb553f356cf365e4a712c26`; sus sumas internas también coinciden.
- El capítulo 1 coincide byte por byte con el archivo del ZIP y no se retradujo. Al recuperar el piloto, el prefacio y los capítulos 2 a 17 aún coincidían con la base inglesa; se tradujeron en la continuación posterior.
- Vocs reemplaza mdBook en desarrollo, compilación y CI. La navegación mantiene las 19 entradas del libro y agrega acceso a los cinco documentos editoriales.
- La aprobación humana del capítulo, las convenciones «proof of stake (PoS)» y «hacer staking», las ocho observaciones técnicas y el tratamiento gráfico y de derechos de la figura 1-1 siguen pendientes.
- Rama local de trabajo: `translation/es-419-pilot-chapter-1`. Se aplicó el contenido del parche, sin recrear el commit `b64b1d90e4352bb56f593976b379099e56cfd59f`. No se creó un commit nuevo, una rama remota ni un PR.

## Continuación del libro completo: etapa textual

- Por instrucción del usuario se tradujeron íntegramente el prefacio y los capítulos 2 a 17, sin esperar ni presumir aprobación humana del piloto.
- Cada archivo recibió un cotejo semántico completo asistido por IA contra la fuente fijada. Criptografía, billeteras, Solidity, seguridad, DeFi, EVM, consenso y pruebas de conocimiento cero recibieron además un cotejo independiente completo.
- Se conservan código operativo, cadenas, comandos, argumentos, direcciones, hashes, cifras, unidades, resultados y MathML. Se identificaron por línea los comentarios explicativos y las etiquetas editoriales traducidos; no se modificaron imágenes.
- Las nuevas observaciones técnicas se registran por capítulo en `TRANSLATION_REVIEW.md`, sin corregir las afirmaciones del original.
- El prefacio y los 17 capítulos son borradores revisados con asistencia de IA, no una edición aprobada ni lista para publicar. Permanecen pendientes revisión humana, convenciones propuestas, recursos gráficos y derechos.

## Localización gráfica

- Se cotejaron visualmente los 183 usos de imágenes, correspondientes a 183 archivos distintos. El capítulo 8 no contiene figuras de imagen.
- Se recrearon 107 diagramas con texto editorial en español y fuentes editables SVG o Graphviz. Se conservan los destinos publicados, los literales técnicos, los datos y las relaciones del original, incluidas las dudas registradas.
- Las 57 capturas auténticas permanecen byte por byte y reciben notas de la traducción separadas que explican sus etiquetas en español. Otras 19 figuras contienen solo literales, matemáticas o nombres propios y no se modifican.
- El manifiesto de `figure-sources/` registra procedencia fijada, hashes, etiquetas, decisiones y fuentes de cada figura. La regeneración se documenta en `README.md`.
- La revisión gráfica asistida y las recreaciones no equivalen a aprobación humana ni a revisión individual de derechos completada. Esos pendientes se mantienen.

## Piloto de capturas editadas del capítulo 2

Registro histórico. Esta etapa mostraba las ediciones españolas de forma opcional; el orden actual se describe al final.

- Por instrucción del usuario se agregaron versiones editadas en español de las figuras 2-2 y 2-5. Son dos suplementos opcionales, no reemplazos de las capturas originales ni capturas nativas de una interfaz actualizada.
- Cada suplemento incluye identificación visible, fuente de superposición SVG, texto seleccionable y procedencia separada en el manifiesto. Se consultó el catálogo oficial `es_419` de MetaMask v13.52.0; las cadenas históricas sin coincidencia se tradujeron editorialmente.
- Los 183 recursos de la etapa gráfica anterior no cambian. Las 57 capturas originales siguen coincidiendo por SHA-256 con la fuente inglesa. En los dos suplementos no cambian píxeles fuera de las máscaras aprobadas y la banda añadida; se conservan el dígito `8`, pasos, campos ocultos, iconos, nombres de redes y estados.
- La versión de la aplicación mostrada en las capturas históricas no está documentada. No se instaló ni ejecutó MetaMask, no se creó una billetera y no se usaron claves, fondos o transacciones.
- La revisión humana y los derechos individuales de originales y adaptaciones siguen pendientes.

## Continuación de las capturas del libro completo

Registro histórico. Esta etapa conservaba los originales primero; el orden actual se describe al final.

- Se revisaron las 55 capturas restantes después del piloto y se agregaron 54 versiones editadas, con superposiciones SVG, identificación visible y texto seleccionable. El total es de 56 ediciones de capturas; las dos del piloto permanecen sin cambios.
- Las 57 capturas originales quedan cubiertas por una decisión: 56 tienen edición adicional y la figura 12-9 se conserva sin duplicado. Los 107 diagramas recreados y las otras 19 figuras con literales o matemáticas no se modificaron en esta continuación.
- Cada figura recibió cotejo visual asistido independiente. Se corrigieron rótulos reducidos en exceso, glifos que desbordaban sus máscaras y el fondo de una etiqueta flotante. Algunas miniaturas y fragmentos tapados no son recuperables; sus limitaciones se registran individualmente.
- No se instalaron billeteras ni se ejecutaron ejemplos, contratos, comandos del libro o transacciones. Revisión humana y derechos individuales de originales y adaptaciones siguen pendientes.
- La integración conserva los 185 recursos anteriores y el texto de los 17 capítulos fuera de los 54 apartados añadidos. El cotejo de píxeles no encontró cambios fuera de las máscaras ni en las regiones protegidas. Vocs compiló y el recorrido real comprobó 24 páginas y 239 imágenes; evidencia y límites en `TRANSLATION_REVIEW.md`.

## Presentación en español por defecto

- Por instrucción del usuario se invirtió la presentación de las 56 parejas. La imagen editada en español precede a su leyenda, seguida por un aviso visible de traducción mediante inteligencia artificial, revisión humana pendiente y carácter no nativo de la captura.
- El original en inglés y la explicación de sus controles permanecen en un desplegable cerrado con el número de figura. Las descripciones, etiquetas seleccionables, advertencias y aclaraciones españolas quedan visibles.
- No se modificaron imágenes, leyendas, datos ni ejemplos. La figura 12-9 y los diagramas no cambiaron. Los registros anteriores describen el orden utilizado durante sus respectivos cotejos.
