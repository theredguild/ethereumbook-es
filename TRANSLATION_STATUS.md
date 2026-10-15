# Estado de la traducción

Original fijado: `5907a8c137135588a7d5dacd1c3bd6ff6c9c5151`. Actualizado: 2026-10-15.

«Primera revisión» significa cotejo del borrador con el original realizado con asistencia de IA. No implica aprobación humana ni que la edición esté lista para publicarse. La aprobación corresponde a Matta.

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

## Continuación del libro completo

- Por instrucción del usuario se tradujeron íntegramente el prefacio y los capítulos 2 a 17, sin esperar ni presumir aprobación humana del piloto.
- Cada archivo recibió un cotejo semántico completo asistido por IA contra la fuente fijada. Criptografía, billeteras, Solidity, seguridad, DeFi, EVM, consenso y pruebas de conocimiento cero recibieron además un cotejo independiente completo.
- Se conservan código operativo, cadenas, comandos, argumentos, direcciones, hashes, cifras, unidades, resultados y MathML. Se identificaron por línea los comentarios explicativos y las etiquetas editoriales traducidos; no se modificaron imágenes.
- Las nuevas observaciones técnicas se registran por capítulo en `TRANSLATION_REVIEW.md`, sin corregir las afirmaciones del original.
- El prefacio y los 17 capítulos son borradores revisados con asistencia de IA, no una edición aprobada ni lista para publicar. Permanecen pendientes revisión humana, convenciones propuestas, recursos gráficos y derechos.
