# Revisión de laboratorios

Material complementario original, separado de la revisión editorial de la traducción. Las revisiones de Astra y Luna no constituyen aprobación humana ni una auditoría de seguridad. No se etiqueta una falla funcional como vulnerabilidad sin evidencia de su impacto.

## Hallazgos

### LAB-001. Descriptor sin cerrar durante verificación de parámetros

- Tipo: falla de herramienta de compilación, no vulnerabilidad del navegador demostrada.
- Evidencia: `snarkjs@0.7.5`, `src/zkey_verify_frominit.js`, función `sameRatioH`, abre `pTauFileName` y no cierra su descriptor. Node `26.8.1` detuvo la generación con `ERR_INVALID_STATE`: `A FileHandle object was closed during garbage collection`.
- Corrección: `scripts/build-zk-artifacts.mjs` proporciona los parámetros públicos como `Uint8Array`, formato admitido por `fastfile`, para que esa ruta no sea propietaria de un descriptor del sistema operativo. No se modifican dependencias, no se suprime el error y no se cambia la versión de Node.
- Comprobación: ejecución posterior de `node scripts/build-zk-artifacts.mjs` completó ambos circuitos, verificó su relación con las claves y produjo recursos públicos. El circuito de conocimiento tiene 514 restricciones no lineales; el de lote, 678 y una lineal. La configuración educativa de un único operador sigue sin ser apta para producción.

### LAB-002. Enlace de salto sin destino enfocable

- Tipo: defecto de accesibilidad.
- Evidencia: en navegador, Tab → Enter sobre "Saltar al paso actual" cambiaba el fragmento a `#paso-actual`, pero `document.activeElement` seguía siendo `BODY`.
- Corrección: el panel compartido recibe `tabIndex="-1"`, como el laboratorio de transacciones ya existente. No se agrega a la secuencia ordinaria de Tab.
- Comprobación: tras recompilar, Tab → Enter enfoca `SECTION#paso-actual` con contorno visible de 3 px. El recorrido completo hasta la comparación se completó usando solo teclado.

### LAB-003. Licencias y fuentes de los runtimes distribuidos

- Tipo: requisito de distribución implementado localmente; clasificación jurídica de Vyper pendiente, no vulnerabilidad confirmada.
- Alcance: compilador Solidity GPL, `snarkjs` y `circomlib` GPL; Pyodide MPL y dependencias Python con condiciones propias. La licencia del texto del libro no los cubre.
- Implementación y comprobación: avisos, 26 textos y fuentes de licencias conservados sin modificar, inventario de paquetes instalados y archivo de fuentes accesibles desde el catálogo Vocs y los pies de los 16 complementos nuevos. El capítulo 6 conserva su interfaz y accede a sus fuentes desde el catálogo. Se comprobaron hashes, extracción y compilación independiente con `npm ci --ignore-scripts && npm run build:labs`. El inventario de paquetes no equivale a una auditoría del bundle.
- Pendiente: el LICENSE real de Vyper 0.4.3 contiene una adición restrictiva ausente de la etiqueta Apache-2.0 de sus metadatos. Se conserva el texto exacto y se muestra la discrepancia; no se afirma compatibilidad jurídica ni autorización para publicar ese compilador. El libro y las dependencias conservan sus condiciones separadas.

### LAB-004. Validación de borrador que robaba el foco al editar un importe

- Tipo: defecto de interacción y accesibilidad del capítulo 1.
- Evidencia: seleccionar el importe de T1, borrarlo con Backspace y escribir el reemplazo dejaba el campo vacío; la validación de cada pulsación movía el foco a la alerta global.
- Corrección: el borrador inválido conserva el foco y muestra un error asociado mediante `aria-invalid` y `aria-describedby`. Solo un intento explícito de continuar usa la alerta global.
- Comprobación: borrar y escribir 4 sin reenfocar mantiene el foco en T1; ejecutar ambas réplicas produce 6/0/8. Volver a ejecutar A bloquea la comparación hasta ejecutar B. Enviar T2=0 se rechaza sin avanzar y enfoca la alerta. Reiniciar tras una regla alterada o un importe inválido restaura 6/8 y elimina resultados anteriores.
- Accesibilidad adicional: registro ampliado en 390 px, sin desbordamiento de página; región de tabla enfocable, contorno de 3 px y desplazamiento horizontal con flecha derecha. Los estados intermedios negativos permanecen visibles como infracción de la regla estricta, no como transacciones válidas de Ethereum.

## Comprobaciones de viabilidad

- Solidity `0.8.30+commit.73712a01` y Vyper `0.4.3` compilaron fuentes editadas en navegador desde una IP HTTP, con objetivo Shanghai. Los contratos originales del laboratorio almacenaron 7; al editar la asignación almacenaron 14. Ambos emitieron un evento real y mostraron diagnósticos reales de fuente inválida.
- Prueba Groth16 real de conocimiento de preimagen Poseidon: paquete original aceptado, punto de prueba alterado rechazado, compromiso público distinto rechazado y testigo que no satisface el circuito rechazado al calcularlo. El paquete público contiene solo el compromiso, no el testigo ni el salt.
- Prueba real del lote educativo: vinculada a saldos iniciales, saldos finales y compromiso del lote ordenado. Cambiar esos valores públicos invalida la prueba. Cambiar importes privados conservando el saldo neto no satisface el compromiso original; sobregiro intermedio viola las restricciones de rango.
- Tras cargar los recursos, se recompiló Vyper y se generó y verificó una prueba nueva con la red desactivada. Esto no ofrece recarga offline ni demuestra todavía los recorridos completos de los laboratorios pendientes.

## Registro por laboratorio

La tabla de avance permanece en `LABS_PLAN.md`. Cada laboratorio se marca completo solo después de ejecutar su interfaz y escenarios, recibir revisiones finales independientes de Astra y Luna en nivel alto, resolver hallazgos válidos y volver a comprobar los cambios. Hasta entonces, tener archivos o pruebas de modelos aprobadas no equivale a completar el laboratorio.

## Capítulo 1: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron el alcance del laboratorio sin nuevos defectos confirmados después de la corrección LAB-004. Se comprobaron ejecución independiente, orden y reglas, edición por teclado, rechazo explícito, regreso entre pasos, reinicio y registro ampliado en móvil de 390 px. La instalación independiente de subruta también ejecutó el caso corregido.

Límites: no se probó un lector de pantalla ni un dispositivo móvil físico. La navegación de ida y vuelta contra el libro completo en subruta sigue siendo una comprobación global pendiente; verificar el `href` no demuestra disponibilidad del destino. Esta revisión no aprueba editorialmente el libro ni los demás laboratorios.

## Capítulo 2: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron el laboratorio sin defectos confirmados. Se comprobaron firma, admisión e inclusión como etapas distintas; recibos vinculados a la transferencia actual; rechazo sin cobro; bloqueo por comisión base y recuperación; reinicio; teclado; escritorio claro y oscuro; móvil de 390 px y ejecución en subruta. Los controles de finalidad comparan escenarios sintéticos alternativos, no revierten la finalidad de una misma historia.

Después de la revisión se completó además la recuperación específica del capítulo: excepción deliberada dentro del Worker inactivo, aviso de fallo, reinicio explícito y nueva transferencia con nonce 0, bloque 1, 21,000 gas y saldo final de 9.899748 ETH ficticios. No se observó una falla espontánea ni se interactuó con Ethereum.

### LAB-005. Worker detenido que dejaba acciones sin respuesta visible

- Tipo: defecto funcional compartido, no vulnerabilidad demostrada.
- Evidencia: una excepción deliberada dentro del Worker inactivo hizo que el cliente terminara el hilo. En criptografía, pulsar comparar no producía resultado ni aviso porque `useWorker.run` devolvía `null` al ver `client.closed`.
- Corrección: primero se eliminó la salida anticipada que ocultaba el rechazo de `client.request`. La revisión posterior reprodujo además un éxito visible después de una falla inactiva, antes de otra solicitud. Se agregó notificación terminal independiente: un único `onFailure` con el mismo error fatal que recibe la solicitud activa; cierre intencional y errores normales no notifican fallo terminal. El hook ignora generaciones reemplazadas.
- Comprobación: siete escenarios con Workers reales cubren falla inactiva, falla activa, respuesta incompleta, respuesta de estado incierto con mensaje y snapshot originales, vencimiento, rechazo normal y cancelación intencional. Las cinco fallas terminales notifican una vez; rechazo normal y cancelación, cero. Criptografía elimina inmediatamente el veredicto anterior, enfoca la alerta y vuelve a verificar tras reiniciar. El capítulo 5 oculta resultados y bloquea pasos; su recorrido completo por teclado vuelve a derivar y comprobar la xpub tras recuperar el Worker. Los clientes de EVM también cercan operaciones auxiliares al fallar; no se declara inválido un artefacto matemático inmutable por perder un Worker.

### LAB-006. Expectativa de gas sin comprobar en una prueba del depurador

- Tipo: defecto de prueba, no falla de ejecución ni vulnerabilidad.
- Evidencia: el programa de almacenamiento consumió 43,224 gas, frente a la constante no verificada de 43,324 en la prueba. La EVM ejecutó correctamente el almacenamiento y la lectura.
- Corrección: se eliminaron expectativas incidentales de costos finitos y comparaciones entre copias de metadatos, sin cambiar el motor ni fijar otra constante para hacer pasar la prueba. Se conservan semántica del programa, muestras previas a instrucciones, contabilidad real, nonce y cobro completo al agotar gas.
- Comprobación: las 13 pruebas del depurador aprobaron. La compilación de las 17 entradas en subruta también completó; esto no sustituye sus comprobaciones de interfaz ni sus revisiones pendientes.

## Capítulo 3: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron el laboratorio sin defectos confirmados. Los recorridos comprobaron canales aislados de ejecución o propuestas, un salto por ronda, inspección histórica sin retroceder la simulación, reconexión sin entrega automática, persistencia de rechazos, límite de 12 rondas, validación y reinicio. Se comprobó además que editar la configuración después de una recuperación completa vuelve a bloquear ambas ramas y elimina sus trazas anteriores.

Se inspeccionaron escritorio claro, móvil oscuro de 390 px y navegación por teclado en subruta. Las tarjetas se apilan en móvil; consultar A y B requiere desplazarse desde los controles inferiores. Ambas revisiones consideraron esto un compromiso de distribución, no un defecto confirmado. No se probó un teléfono físico ni un lector de pantalla; la auditoría global del libro en subruta sigue pendiente.

### LAB-007. Hashes y direcciones cortados dentro de sus cajas

- Tipo: defecto de legibilidad móvil.
- Evidencia: en 390 px, una caja de dirección medía 325 px pero su contenido 399 px; `white-space: pre` impedía que `overflow-wrap` surtiera efecto. El ancho total de página no detectaba este desbordamiento interno.
- Corrección y comprobación: solo `.hex.breakable` usa `white-space: normal`. Hashes de 291 px y direcciones de 325 o 296 px tienen ahora idéntico ancho visible y desplazable; se inspeccionaron todos sus dígitos. Los bloques técnicos `pre` conservan su formato.

### LAB-008. Paso de firma que negaba una verificación ya realizada

- Tipo: contradicción de interfaz del capítulo 4.
- Evidencia y corrección: volver al paso de firma después de verificar conservaba el veredicto válido, pero decía "todavía sin verificar". El encabezado neutral "Firma creada" deja el veredicto en su panel correspondiente. Se comprobó el regreso entre pasos.

### LAB-009. Cambio de paso que desplazaba el foco de una alerta fatal

- Tipo: defecto de accesibilidad.
- Evidencia: al notificar inmediatamente la falla, el capítulo 4 eliminaba resultados y volvía al paso 1; ese cambio enfocaba el encabezado después de enfocar la alerta.
- Corrección y comprobación: el encabezado no recibe foco mientras existe un error. Una excepción real en el Worker después de verificar deja `DIV[role=alert]` enfocado, vuelve al paso 1 y elimina el éxito anterior. El reinicio permite una nueva firma y verificación reales.

## Capítulo 4: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de reproducir, corregir y volver a comprobar LAB-005 y LAB-007 a LAB-009. Se comprobaron bytes UTF-8 y hex equivalentes, diferencias Keccak-256/SHA3-256, firmas reales, alteraciones, límites, reinicio, teclado y presentación móvil. No hay aprobación editorial humana ni auditoría global de subruta implícita.

## Capítulo 5: revisión final asistida

Astra y Luna, ambos en nivel alto, no encontraron defectos específicos. Se completó después la comprobación de recuperación solicitada: falla inactiva con resultados ocultos y pasos bloqueados, reinicio y nueva derivación, regeneración y prueba xpub. Todos los pasos hacia adelante se recorrieron con Tab y Enter. No se probó un teléfono físico ni un lector de pantalla.

### LAB-010. Lectura fallida que ocultaba una transacción incluida

- Tipo: defecto de fidelidad funcional de los capítulos 7 y 8.
- Evidencia: un contrato editable con `value()` que revierte después de guardar 7 dejó un recibo real de status 1, evento y nonce consumido, pero la interfaz ocultó el resultado por fallar la lectura posterior. Una lectura previa fallida también impedía enviar otra transacción válida.
- Corrección: observación y operación se separan. Una reversión o un fallo de decodificación del getter se presenta como valor no disponible, sin inventar cero ni negar la inclusión. Los recibos, costos, eventos e identidad se conservan. La comparación entre lenguajes muestra "No comparable" si falta una observación.
- Comprobación: contratos Solidity y Vyper realmente compilados; primer setter confirmado pese a lectura posterior revertida; segundo setter confirmado pese a lectura previa revertida; getter inicialmente revertido que no bloquea la transacción; lectura aislada con status 0, sin recibo, costo ni cambio de nonce. La comparación conserva cuatro recibos y no interpreta dos valores desconocidos como igualdad.
- Límite distinto: una falla terminal del Worker deja la sesión EVM desconocida y exige reinicio. No se ofrece persistencia ni recuperación de una sesión perdida.

## Capítulo 7: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-010. Se ejecutaron fuentes originales y editadas, diagnósticos reales, llamadas sin persistir escrituras, transacciones y reversiones con costos reales, instancias de revisiones anteriores, reinicio, cancelación de compilación y falla de la EVM durante trabajo auxiliar. Móvil de 390 px y recorrido de compilación, despliegue e interacción por teclado comprobados. La integración global del libro en subruta permanece pendiente.

### LAB-011. Comparación entre lenguajes sin cancelación

- Tipo: defecto de control de la interfaz del capítulo 8.
- Evidencia: durante la comparación estaban deshabilitados reinicio y navegación, sin botón para detener los Workers auxiliares.
- Corrección: cancelación explícita con identificador propio, independiente de la generación de la EVM principal. Finalización, errores y limpieza comprueban ese identificador; los recursos de otra comparación no se alteran.
- Comprobación: comparación real activa con tres Workers; cancelar enfoca el encabezado, conserva borrador, hash desplegado, valor 14 y nonce 2. Una lectura posterior no cobra comisión; repetir compara Solidity 7 frente a Vyper editado 14.

### LAB-012. Predicción incorrecta presentada como resultado observado

- Tipo: ambigüedad de retroalimentación del capítulo 9.
- Evidencia: el texto después de "lo observado:" correspondía a la predicción elegida, no necesariamente al resultado de las dos operaciones.
- Corrección y comprobación: se distingue "Habías predicho" del resultado y de la coincidencia. Una predicción deliberadamente errónea conserva el retiro legítimo real con status 1 y muestra que no coincide. La predicción ausente se rechaza con `DIV[role=alert]` enfocado.

## Capítulo 8: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-011. Se ejecutaron compilación editable Vyper, lógica modificada y eventos independientes, comparación real con Solidity, diagnósticos, lectura de instancias anteriores, uso sin conexión de recursos ya cargados, cancelación y recuperación tras falla de la EVM principal. La revisión técnica local no resuelve las condiciones jurídicas de Vyper ni la aprobación editorial humana.

## Capítulo 9: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron el comportamiento local. Se corrigió y comprobó LAB-012. Las tres versiones producen status recursivo/legítimo 1/0, 0/1 y 0/0; bloquear todo no se presenta como reparación válida. La traza conserva 512 de 926 instrucciones sin detener la ejecución. Se comprobaron navegación histórica sin reejecutar, reinicio, recuperación, teclado y móvil. No se evaluó un servicio externo ni se encontró un incidente real.

### LAB-013. Solicitud aprobada descrita como pendiente de consentimiento

- Tipo: contradicción de interfaz del capítulo 12.
- Evidencia: después de aprobar una transacción cuyo recibo real todavía no había llegado al frontend, el panel seguía describiéndola como no firmada y rechazable.
- Corrección y comprobación: se distinguen consentimiento pendiente, aprobación en curso e inclusión. Se demoró únicamente la respuesta de una ejecución real; durante la espera no se ofrece rechazo de una operación ya aprobada. Al recibir status 1, volver al inspector muestra inclusión y no consentimiento pendiente.

### LAB-014. Constructor de Worker que dejaba la DApp sin recuperación

- Tipo: defecto funcional del capítulo 12, no incidente externo.
- Evidencia: una excepción síncrona deliberada en `new Worker` escapaba de la inicialización y dejaba la aplicación sin su aviso y reinicio.
- Corrección y comprobación: el proveedor local y su propietario se establecen antes de construir el Worker; la falla pasa por la misma transición de sesión detenida. La interfaz enfoca el aviso 4900, bloquea conexión y permite reiniciar. El Worker nuevo despliega y confirma una transacción real que guarda 7.

### LAB-015. Datos de solicitud ilegibles en móvil

- Tipo: defecto de presentación del capítulo 12.
- Evidencia: en 390 px, los contenedores de una lista de definición y las direcciones ampliaban la página hasta 860 px.
- Corrección y comprobación: términos y definiciones usan la estructura prevista; direcciones completas permiten salto de línea. Página de 390 px sin desplazamiento horizontal, recorrido por teclado e inclusión real comprobados en subruta.

## Capítulo 12: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-013 a LAB-015. Se comprobaron rechazo de conexión y firma sin inclusión, aprobación e inclusión reales, reversiones con costo, permisos revocados sin perder estado EVM, métodos no admitidos, recuperación tras fallas inactivas y activas, constructor fallido, reinicio durante consentimiento, teclado y móvil. Los errores de sesión cercan respuestas tardías. No se inyecta una billetera ni se ofrece persistencia; es un subconjunto educativo EIP-1193. La integración global del libro en subruta permanece pendiente.

### LAB-016. Recibo fallido sin foco de destino

- Tipo: defecto de accesibilidad del capítulo 10.
- Evidencia: una reversión real enfoca la alerta; Tab y Enter sobre el botón para examinarla cambiaban al resultado, pero el foco quedaba en `BODY`.
- Corrección y comprobación: la navegación explícita reconoce la alerta local, sin borrar el recibo ni su error. Botón y navegación de pasos enfocan `H2#step-title`; el siguiente Tab alcanza la región de saldos. Se conservan status 0, comisión y nonce.

### LAB-017. Enteros y errores completos fuera del ancho móvil

- Tipo: defecto de legibilidad del capítulo 10.
- Evidencia: errores ABI largos ampliaban la página de 390 a 646 px; el máximo uint256 en la intención la ampliaba a 762 px y un ID inexistente con su error `ownerOf`, a 968 px.
- Corrección y comprobación: intención, autorización actual y error permiten saltos de línea sin truncar ni convertir enteros a Number. Aprobación real del máximo uint256 con status 1; intención, firma, autorización e ID completos en 390/390 px. El máximo valor nativo en wei se comprobó por entrada exacta y representación en ETH en ambos paneles, no enviando una transacción impagable.

### LAB-018. Invalidador que interrumpía la escritura

- Tipo: defecto de interacción del capítulo 10.
- Evidencia: al volver a una intención preparada, la primera pulsación enviaba una invalidación al Worker y deshabilitaba el campo durante el resto de la escritura. Una comprobación inicial destinada al máximo valor nativo terminó introduciendo 1 wei; no se conservó como prueba del máximo.
- Corrección y comprobación: editar elimina inmediatamente autorización y resultados del frontend, sin una solicitud por pulsación. La siguiente preparación reemplaza la intención del Worker antes de validar; no se afirma invalidación inmediata dentro del Worker. Se comprobaron 20 dígitos continuos, foco conservado, pasos siguientes bloqueados y entrada exacta del máximo uint256 en wei.

### LAB-019. Predicción conservada tras cambiar datos del oráculo

- Tipo: defecto de retroalimentación del capítulo 11.
- Evidencia: una predicción elegida para precios iniciales sobrevivía a cambios avanzados de precios y antigüedades.
- Corrección y comprobación: esas ediciones invalidan el recorrido y borran la selección. Congelar sin renovarla permanece en el primer paso y enfoca la alerta. Una predicción nueva precede a firmas reales y mediana 900000 para dos fuentes mentirosas; en subruta, una fuente mentirosa produce 201000. Los escalares de firma se identifican correctamente como claves privadas educativas conocidas públicamente, no claves públicas.

## Capítulo 10: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-016 a LAB-018. Se comprobaron transferencias, aprobación, gasto y revocación ERC-20; propiedad, aprobación individual y operadores ERC-721; reversiones incluidas frente a rechazo previo, gas y nonce, reinicio y recuperación del Worker. Móvil y teclado incluyen ambos accesos al recibo fallido y valores máximos completos. Las tablas técnicas conservan desplazamiento enfocable. La integración global del libro en subruta permanece pendiente.

## Capítulo 11: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-019. Se comprobaron bytes canónicos, firmantes recuperados, manipulación posterior de precio, fecha o fuente, duplicados, quórum de fuentes distintas y medianas. Antigüedad 60 s sigue vigente; 61 s conserva autenticidad pero pierde vigencia y quórum. Fuentes auténticas pueden mentir: la firma no garantiza precio verdadero. Se comprobaron firmas nuevas, predicción renovada, reinicio, falla deliberada, teclado, vistas nativas de escritorio y móvil y ejecución en subruta. La auditoría global de destinos sigue pendiente.

### LAB-020. Cotización redondeada a cero que ocultaba una inclusión

- Tipo: defecto funcional de observación del capítulo 13.
- Evidencia: congelar 0.000002 con minOut 0.000001 y ejecutar cinco intercambios de Bob hacía que la quinta operación se confirmara, pero su snapshot fallara al volver a cotizar. La interfaz perdía una sesión cuyo libro contable seguía disponible.
- Corrección: consultar permite devolver la salida entera real de cero; ejecutar todavía exige salida positiva. Congelar cero se rechaza explícitamente. No se inventa una cotización ni se suprime un error de transporte.
- Comprobación: cinco recibos de Bob con status 1, cotización actual cero y mínimo original conservado. Alice alcanza la EVM y revierte con gas y nonce reales, sin cambiar activos. Repetir la cotización diminuta no cobra; editar a 1 y cotizar de nuevo confirma sin reiniciar. Regresión permanente de modelo, 11 pruebas específicas aprobadas y recorrido de subruta. El rechazo inicial de 0.000001 también se capturó después de asentarse el error.

### LAB-021. Resultado del depurador presentado junto a sesión desconocida

- Tipo: ambigüedad de estado del capítulo 14, no alteración de un recibo histórico.
- Evidencia: tras perder el Worker, se mantenían como vista corriente éxito, comparación y almacenamiento de una ejecución terminada.
- Decisión y comprobación: se descartan preparación, resultado y sesión corrientes ante falla terminal del Worker o respuesta de dominio incompleta; el error conserva el foco y solo se permite reiniciar. No se ofrece historial recuperable. Se comprobaron excepción real y respuesta truncada después de una ejecución auténtica, bloqueo de pasos y nuevas ejecuciones que devuelven 5 desde nonce inicial 0. En subruta, la EVM agotó 64000 gas y ejecutó 5228 instrucciones aunque solo se guardaron 512 muestras.

### LAB-022. Cabeza fija en explicación sin votos visibles

- Tipo: contradicción pedagógica del capítulo 15.
- Evidencia: un observador sin votos de cabeza, pero con G→B1 justificado, mostraba cabeza B2 y ancla B1 mientras la explicación afirmaba A2 por desempate.
- Corrección y comprobación: se usan cabeza y ancla calculadas. El empate desde G se distingue de una rama restringida por justificación. El navegador comprobó A2/G, B2/B1 y B2/B2 con B1 finalizado, sin votos de cabeza en ese observador; el caso B2/B1 también se ejecutó en subruta. El modelo no cambió.

### LAB-023. Salt publicado fuera del ancho móvil

- Tipo: defecto de presentación del capítulo 16.
- Evidencia: salt de 298 px de caja y 356 px de contenido; la página de 390 px llegaba a 404 px.
- Corrección y comprobación: salt y compromiso reutilizan el estilo de texto hexadecimal que permite salto de línea. Página 390/390, salt 298/298 y compromiso 327/327; escritorio 1280/1280. Se conservaron los valores completos.

### LAB-024. Compromisos del verificador desbordados

- Tipo: defecto de estructura y legibilidad del capítulo 17.
- Evidencia: contenedores de listas de definición con compromisos sin salto ampliaban escritorio de 1280 a 1693 px y móvil de 390 a 1512 px.
- Corrección y comprobación: filas apiladas y valores completos con salto de línea. Página 390/390 y 1280/1280; compromisos, testigo mostrado por decisión del lector y compromiso del probador legibles. Una prueba nueva se generó y verificó en la interfaz corregida.

### LAB-025. Éxito sin calificar después de perder el probador

- Tipo: claridad de ciclo de vida del capítulo 17, no aceptación de una prueba inválida.
- Evidencia: después de verificar una prueba real, una excepción deliberada en el Worker conservaba el aviso de aceptación junto al error.
- Corrección y comprobación: el aviso prioriza Worker no disponible y no muestra aceptación corriente. El paquete matemático y el compromiso se conservan sin declararlos inválidos. Recuperar exige verificar de nuevo; un Worker nuevo aceptó realmente el mismo paquete. Una recarga real de página volvió al primer paso sin testigo, paquete ni veredicto.

## Capítulo 13: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-020. Se comprobaron cotización y mínimo inmutables, intercambio adverso, reversión con activos intactos y costo real, cotización nueva y recuperación; depósito, límite LTV, salud, liquidación parcial, insolvencia, pago y retiro legítimo. La salida cero no destruye la observación del estado. La instalación limpia y la suite actual de 213 pruebas aprobaron después de estas correcciones.

## Capítulo 14: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de resolver LAB-021. La traza muestra estado previo a cada instrucción; reproducir no vuelve a ejecutar. Se comprobaron runtime editado, ADD, almacenamiento, reversión, agotamiento de gas, límite de captura, admisión inválida, teclado, móvil, falla terminal de Worker y respuesta de dominio incompleta. Ambas recuperaciones desplegaron y ejecutaron de nuevo desde una EVM vacía. Los resultados anteriores no permanecen como estado corriente de una sesión perdida.

## Capítulo 15: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de corregir LAB-022. Se comprobaron entrega por observador, reconexión sin entrega automática, votos pesados frente a ligeros, mensajes duplicados y antiguos, denominador fijo incluso con validadores desconectados, enlaces consecutivos, historial limitado a 40 eventos y reinicio. El desempate didáctico y las diferencias con Gasper están declarados. El caso de ancla B sin votos de cabeza se comprobó en raíz y subruta.

## Capítulo 16: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron sin nuevos defectos tras LAB-023. Se comprobaron afirmación incorrecta invalidada por impugnación, ventana optimista y su supuesto explícito, prueba Groth16 real y cuatro alteraciones rechazadas, cancelación activa, recursos recargados, datos ausentes y retiro único. Una comprobación nueva en la compilación corriente generó y verificó otra prueba: `proofVerified=true` mientras disponibilidad, liquidación, finalidad y retiro permanecían falsos. No se confunde la ejecución matemática con disponibilidad ni finalidad de Ethereum.

## Capítulo 17: revisión final asistida

Astra y Luna, ambos en nivel alto, aprobaron después de LAB-024 y LAB-025. Se comprobaron paquete público sin testigo, compromiso esperado fijado, matemática válida y coincidencia como condiciones separadas, alteración de prueba y compromiso, testigo incorrecto rechazado por WASM, cancelación durante cálculo, sustitución del recorrido, recuperación y recarga real. Ambos roles comparten navegador; no se promete privacidad frente a ese navegador, ceremonia confiable de producción ni borrado seguro de memoria.

Las menciones anteriores de auditoría global pendiente corresponden al cierre individual de cada laboratorio. La comprobación final del libro completo y sus subrutas se registra por separado en `LABS_PLAN.md`; aprobación técnica asistida no equivale a revisión humana de accesibilidad, edición o licencias.

## Revisión integrada final

Astra, en nivel alto, revisó transporte, propiedad de Workers, separación entre compilación y EVM, observación de recibos, pruebas reales, catálogo, navegación nativa, compilación, distribución de fuentes y la evidencia final. No encontró defectos nuevos que requirieran cambios de código. Esta revisión se suma a las revisiones independientes de Astra y Luna de cada uno de los 16 laboratorios nuevos; no sustituye aprobación humana.

La instalación limpia aprobó 213 pruebas. Las compilaciones completas de raíz y subruta y los recorridos reales comprobaron 25 páginas y 709 destinos locales por instalación, sin enlaces rotos ni errores de navegador. Los 17 accesos de capítulo y catálogo funcionaron en ambas instalaciones. La extracción y compilación del archivo actual de fuentes conservaron sus 169 archivos exactos. La restauración final de la vista previa de raíz también se comprobó en navegador; los límites humanos y jurídicos de LAB-003 permanecen explícitos.
