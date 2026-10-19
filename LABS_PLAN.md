# Plan de laboratorios interactivos

Material complementario original de The Red Guild. No sustituye ni modifica las afirmaciones de la traducción. Después del primer laboratorio, el usuario autorizó implementar los 16 restantes, con revisión independiente de Astra y Luna en nivel alto después de cada laboratorio y un máximo de tres subagentes simultáneos.

## Arquitectura

- Libro Vocs full-static y laboratorios React en el mismo repositorio y despliegue. Sin backend, base de datos, billetera conectada ni RPC por defecto.
- Entradas estáticas independientes bajo `/labs/`, compiladas con Vite. Botones HTML nativos desde el capítulo y la página de acceso `/laboratorios`; no enviar las URLs independientes al router de Waku ni a su paginación. Respetar `VOCS_BASE_PATH` en HTML, módulos, Worker y enlaces de regreso.
- Mantener parser Markdown del libro. No activar MDX globalmente. Preparar fuentes, compilar laboratorios al subdirectorio público generado y luego compilar Vocs. El preparador elimina `.vocs-content/`, por lo que el orden también debe cumplirse en desarrollo.
- Cómputo EVM en Worker. Firma, serialización, recuperación de remitente y ejecución reales con EthereumJS, versiones fijadas. Simuladores de red y economía identificados como modelos con supuestos visibles.
- Estado de todos los laboratorios solo en memoria. Reinicio y recarga descartan el recorrido; no se guardan secretos personales ni progreso persistente.
- Sin claves del libro, fondos, servicios externos ni ejemplos ejecutados contra redes. Clave educativa conocida públicamente, sin entrada de claves del usuario. Nunca financiar estas direcciones ni importar la clave en billeteras.
- Laboratorios en páginas propias enlazadas desde el libro. Sin iframes ni MDX global; lógica compartida solo donde existe un contrato común.

## Lista por capítulo

| Estado | Capítulo | Laboratorio | Resultado verificable | Dependencias y límites |
| --- | --- | --- | --- | --- |
| Verificado localmente; Astra y Luna | 1. ¿Qué es Ethereum? | Máquina de estados compartida | Estados independientes, orden y reglas; teclado, móvil y recuperación comprobados. | Ninguna. |
| Verificado localmente; Astra y Luna | 2. Fundamentos | Primera transacción sin riesgo | Firma, cola, inclusión y finalidad sintética separadas; rechazos, historial, teclado y recuperación comprobados. | Motor del capítulo 6 reutilizado. |
| Verificado localmente; Astra y Luna | 3. Nodos | Red bajo fallas | Canales separados, propagación de un salto, historial, recuperación y rechazo de datos inválidos comprobados. | Simulador explícito, no nodos Ethereum reales. |
| Verificado localmente; Astra y Luna | 4. Criptografía | Mesa de hashes y firmas | UTF-8 y hex equivalentes, firmas y alteraciones reales; errores, recuperación inmediata y valores completos en móvil comprobados. | EthereumJS y funciones hash reales. |
| Verificado localmente; Astra y Luna | 5. Billeteras | Explorador HD | BIP-39/BIP-32 reales, regeneración, xpub y rechazo endurecido; recorrido completo por teclado y recuperación comprobados. | Frase educativa pública fija y derivación HD real. |
| Implementado, verificado localmente | 6. Transacciones | Constructor, cola e inspector EIP-1559 | Firma, cola, reemplazo e inclusión; gas, nonce y reversión. Recorrido original y accesos integrados comprobados de nuevo. | EthereumJS VM, transacciones, bloques, common y util. |
| Verificado localmente; Astra y Luna | 7. Solidity | Contrato paso a paso | Compilación editable real, llamadas, transacciones, diagnósticos, cancelación y recuperación; recibos conservados aunque falle el getter. | Solc 0.8.30 y EthereumJS Shanghai en Workers locales. |
| Verificado localmente; Astra y Luna | 8. Vyper | Mismo comportamiento, otro lenguaje | Vyper editable real, comparación ejecutada en dos EVM, observaciones no disponibles, cancelación y recuperación comprobadas. | Vyper 0.4.3 en Pyodide; clasificación jurídica de su licencia pendiente antes de publicar el compilador. |
| Verificado localmente; Astra y Luna | 9. Seguridad | Ordenar efectos sin bloquear a usuarios | Tres versiones realmente ejecutadas, retiros legítimos, predicciones, historial, traza limitada y recuperación comprobados. | Contratos educativos originales y EthereumJS. |
| Verificado localmente; Astra y Luna | 10. Tokens | Balances, permisos y propiedad | ERC-20 y ERC-721 reales, permisos, reversiones, admisión, edición continua y recibos por teclado; valores uint256 completos comprobados en móvil. | OpenZeppelin Contracts 5.4.0 y EthereumJS Shanghai. |
| Verificado localmente; Astra y Luna | 11. Oráculos | Datos auténticos e incorrectos | Firmas reales, fuentes distintas, antigüedad inclusiva, medianas y predicciones renovadas; teclado, móvil y recuperación comprobados. | secp256k1 y registro educativo fijo; no oráculo de mercado. |
| Verificado localmente; Astra y Luna | 12. DApps | Aplicación completa observable | Consentimiento, solicitudes, inclusión, recibos y eventos reales; rechazo, revocación, fallas de inicialización y recuperación comprobados. | Contrato local, EthereumJS y subconjunto EIP-1193 explícito. |
| Verificado localmente; Astra y Luna | 13. DeFi | AMM y préstamos bajo estrés | Cotización congelada, deslizamiento, liquidación y recuperación reales; salida cero observable sin perder recibos ni sesión. | Contratos de libros contables ficticios y EthereumJS Shanghai. |
| Verificado localmente; Astra y Luna | 14. EVM | Depurador de bytecode | Ejecución y muestras previas reales; reproducción sin reejecutar, rollback, captura limitada y recuperación de sesión comprobados. | EthereumJS Shanghai e instrumentación de instrucciones. |
| Verificado localmente; Astra y Luna | 15. Consenso | Bifurcaciones y finalidad | Vistas locales, stake fijo, mensajes repetidos, justificación y finalidad separadas; anclas sin votos de cabeza y límites comprobados. | Modelo determinista acotado, no Gasper completo. |
| Verificado localmente; Astra y Luna | 16. Escalado | Del lote al retiro | Prueba real, disponibilidad, impugnación, liquidación, finalidad sintética y retiro único separados; cancelación y recuperación comprobadas. | Circuito de lote de 32 bits, Poseidon dominio 16 y Groth16 local; sin EVM ni L1 real. |
| Verificado localmente; Astra y Luna | 17. Conocimiento cero | Probar sin revelar testigo | Prueba real y compromiso esperado, alteraciones, testigo incorrecto, cancelación, recuperación y recarga comprobados. | Testigo educativo de 128 bits, Poseidon dominio 17 y Groth16 en Worker. |

## Primer laboratorio, capítulo 6

### Reglas y límites

- Cadena educativa 31337, reglas Shanghai explícitas, transacciones tipo `0x02`, sin listas de acceso. No representa reglas actuales de red ni todos los tipos del capítulo.
- Cuenta emisora con 10 ETH ficticios, destinatario EOA, beneficiario de propinas y dos contratos originales pequeños. Los contratos escriben almacenamiento antes de `REVERT` o de agotar gas, para comprobar rollback real.
- Campos editables: destino, ETH, nonce, calldata hexadecimal, gasLimit y ambas comisiones EIP-1559 en gwei. Comisión base del bloque editable por separado.
- BigInt para wei y gas, sin redondeo mediante Number. Máximo 1,000,000 gas por transacción, 4 KiB calldata, 20 pendientes y 20 recibos visibles.
- Firma no altera estado. Envío utiliza bytes firmados inmutables, nunca formulario mutable. Se muestran bytes, hash, firma, campos decodificados y remitente recuperado.
- Nonce antiguo rechazado; nonce futuro pendiente. Comisión máxima menor que baseFee queda pendiente. No se salta nonce bloqueado para incluir uno posterior.
- Admisión exige saldo para `value + gasLimit * maxFeePerGas`, gas intrínseco suficiente y relación válida entre comisiones. Revalidar saldo al incluir; entrada que se vuelve impagable permanece pendiente, con motivo visible.
- Reemplazo local por remitente y nonce. Cada comisión debe alcanzar `max(anterior + 1 wei, ceil(anterior * 110 / 100))`. Política didáctica, no regla universal de Ethereum. Rechazo conserva original; cola llena permite reemplazo válido; duplicado no duplica ejecución.
- Cada inclusión procesa una transacción en un bloque educativo. Sin minado PoW, consenso, finalidad, propagación P2P ni mercado automático de comisiones.
- Rechazo no cobra ni consume nonce. Fallo incluido sí cobra gas y consume nonce, pero revierte valor y almacenamiento. Recibo real decide estado.
- Mostrar `effectiveGasPrice = min(maxFeePerGas, baseFee + maxPriorityFeePerGas)`, comisión total, quema y crédito de propina, sin confundir límite con consumo.
- Worker serializa solicitudes, incluidos reinicios; IDs correlacionan respuestas. Los rechazos con estado recuperado permiten continuar. Si no se recupera el estado, se bloquean acciones hasta reiniciar. Interfaz no permite editar acciones incompatibles mientras se procesa.

### Pasos

- [x] Agregar dependencias fijadas y contrato simple de mensajes del Worker.
- [x] Implementar motor, cola, reemplazo, ejecución y pruebas de invariantes observables.
- [x] Implementar interfaz española accesible, presets, inspector, recibos y desafíos.
- [x] Integrar compilación estática y acceso nativo desde capítulo 6 y navegación.
- [x] Verificar navegador real, raíz y subruta, uso desde IP HTTP de VM, teclado y móvil.
- [x] Verificar operación sin red después de inicialización: firma, cola, inclusión, reemplazo y reinicio.
- [x] Registrar evidencia local y revisión final. No desplegar ni pushear sin pedido.

### Criterios de aceptación

Transferencia de 0.1 ETH con 21,000 gas y contabilidad exacta. REVERT y agotamiento de gas revierten almacenamiento y valor, consumen nonce y cobran comisión. Rechazos conservan estado. Nonce futuro y baseFee bloquean correctamente. Reemplazo inválido conserva original y reemplazo válido cambia hash incluido. Reinicio restaura cuentas, cola, recibos y borrador. Enlaces funcionan mediante clic y teclado desde libro hidratado. HTML, módulos y Worker cargan en raíz y subruta; no hay llamadas a proveedores externos. No introducir regresiones en navegación ni ejemplos del libro.

## Evidencia local del primer laboratorio

- `npm ci` y `npm run test:labs`: 17 pruebas aprobadas, sin scripts de instalación desbloqueados.
- Compilación de producción en raíz y `/ethereumbook-es/`: 57 archivos Vocs más HTML, CSS, frontend y Worker estáticos del laboratorio. Desarrollo también ejecutó una transferencia real en ambas rutas.
- Navegador real desde HTTP por IP de VM: firma, envío, transferencia, REVERT, agotamiento de gas, rechazo intrínseco, nonce futuro, reemplazo inválido/válido, bloqueo por baseFee y reinicio. Ocho recorridos sin conexión después de inicializar el Worker.
- Recorrido de 25 páginas en raíz y subruta: 239 imágenes, 383 bloques de código y 23 expresiones MathML. Sin fallos en 670 destinos locales y fragmentos en cada instalación comprobada. Las 20 fuentes del libro conservan sus hashes.
- Móvil oscuro de 390 px sin desbordamiento horizontal, foco visible de 3 px y controles etiquetados. También se inspeccionó tema claro y navegación por teclado.
- Revisión arquitectónica final realizada. Ambos hallazgos se reprodujeron y corrigieron: respuesta sin estado recuperable bloquea acciones hasta reiniciar; destino personalizado aparece en recibo con saldos antes/después sin duplicados ni historial de cuentas ilimitado. Prueba de regresión y recorridos de navegador posteriores aprobaron las correcciones.
- No se ejecutó CI remota, no se desplegó ni se creó commit o push. La revisión editorial humana permanece pendiente.

## Presentación guiada del primer laboratorio

Por pedido del usuario, el panel simultáneo se reemplazó por cuatro pasos con un solo panel activo: Preparar, Revisar, Incluir y Resultado. Los botones usan navegación nativa de teclado y `aria-current=\"step\"`; no se presentan pasos completados a partir de recibos históricos.

El primer paso muestra ejercicio, destino y valor. Nonce, gas, comisiones y calldata quedan en ajustes avanzados cerrados. El segundo resume los bytes firmados y permite inspección completa antes de enviarlos. El tercero permite incluir, corregir un nonce faltante o preparar un reemplazo. Un bloqueo no cambia al paso Resultado. El cuarto muestra el recibo realmente incluido, su identidad de bloque/nonce, valor, gas y comisión; los detalles y las cuentas históricas se consultan bajo demanda.

Cola, firma e historial habilitan sus pasos de forma independiente. Editar invalida la firma pero no borra pendientes ni recibos. Los resultados se seleccionan por hash y no toman datos del borrador ni de la comisión base actual. Los errores siguen visibles fuera de los paneles; un fallo de firma abre ajustes y enfoca el aviso. Un reinicio rechazado conserva el contexto; el contexto nuevo solo se establece tras confirmar el reinicio.

El motor EVM, el protocolo y las pruebas del motor no cambian. La verificación de la interfaz usa recorridos reales de navegador, incluidos pasos hacia atrás, validación con ajustes cerrados, historial, bloqueos, reemplazos, reversiones y recuperación del Worker.

Verificación de la presentación guiada: instalación y 17 pruebas del motor aprobadas; compilación de raíz y subruta; recorridos reales sin conexión, errores con ajustes cerrados, reinicio rechazado y recuperación de estado desconocido. Se comprobaron también 21 inclusiones consecutivas con historial limitado a 20 recibos. En móvil de 390 px se verificaron tema claro/oscuro, ausencia de desbordamiento, salto al panel activo, foco de encabezados y orden visual coincidente con Tab en Revisar y Resultado. La revisión arquitectónica final no encontró bloqueos; se aplicó su ajuste de orden de botones móvil. No se creó commit, push ni despliegue.

## Continuación autorizada

El primer laboratorio se publicó mediante el commit firmado `8b8fd7a` en `develop` y `main`. Los registros anteriores describen comprobaciones previas a esa publicación, no el estado actual de las ramas.

### Orden y límites de implementación

1. Comprobar en navegador los compiladores fijados de Solidity y Vyper, y la generación y verificación de pruebas reales. Usar recursos propios del despliegue y reglas Shanghai explícitas. No cerrar las interfaces dependientes antes de estas comprobaciones.
2. Reutilizar presentación guiada y transporte donde corresponda, sin imponer la misma progresión a todos los ejercicios. Mantener intacto el laboratorio del capítulo 6. Separar compilador, sesión EVM y generador de pruebas para que cancelar un cálculo no borre contratos desplegados.
3. Incorporar cada laboratorio al catálogo que controla entradas estáticas, desarrollo, accesos posteriores a la introducción del capítulo y página de laboratorios. Conservar navegación HTML nativa, subruta y preparación antes de compilar.
4. Ejecutar casos normales, negativos y de recuperación. Comprobar escritorio, móvil de 390 px, teclado, foco, anuncios de errores y ausencia de desbordamiento. La edición invalida resultados anteriores; un error no debe avanzar el recorrido ni reutilizar un resultado ajeno.
5. Someter cada laboratorio creado a revisiones independientes con `openai-codex/gpt-6-astra` y `openai-codex/gpt-6-luna`, ambos con `thinking-level: high`. Corregir hallazgos válidos y volver a ejecutar el recorrido afectado. Registrar evidencia y limitaciones sin confundir revisión de modelos con aprobación humana.

Los modelos educativos muestran sus reglas y omisiones. La ejecución EVM, firmas, derivación HD, compilación y pruebas criptográficas que se anuncien como reales deben serlo. No se solicitan secretos personales, no se ejecutan ejemplos del libro ni se interactúa con redes Ethereum.

### Recorridos y criterios por capítulo

| Capítulo | Acción y observación | Caso negativo | Recuperación y límites |
| --- | --- | --- | --- |
| 1 | Ejecutar las mismas transferencias en dos réplicas; comparar estado al cambiar orden o reglas por separado. | Transferencia sin saldo se rechaza sin alterar el estado. | Restaurar orden y reglas comunes; reinicio restaura saldos. Modelo sin gas ni consenso. |
| 2 | Preparar, firmar, enviar e incluir una transferencia real en la EVM del capítulo 6; distinguir cada etapa. | Firma no mueve saldo; rechazo no genera recibo ni cobra gas. | Corregir y volver a enviar. Finalidad posterior identificada como simulación, independiente de inclusión. |
| 3 | Propagar datos de ejecución y mensajes de consenso por canales distintos; inspeccionar lo que conoce cada nodo. | Partición o canal caído impide recibir datos, sin eliminar el nodo ni su stake del modelo. | Reconectar y entregar mensajes pendientes. No son clientes ni red Ethereum reales. |
| 4 | Comparar Keccak-256 y SHA3-256 sobre los mismos bytes; firmar y verificar contra remitente esperado. | Mensaje alterado, firma inválida o remitente distinto no verifican. | Restaurar bytes originales y verificar otra vez; límites de entrada y clave pública educativa visibles. |
| 5 | Derivar cuentas desde frase pública fija y variar rutas BIP-32/BIP-44. | Ruta inválida o derivación endurecida desde clave pública se rechaza. | Restaurar ruta; comparar derivación pública y privada no endurecida. Sin importación de frases personales. |
| 7 | Editar Solidity, compilar, desplegar, leer y escribir; observar recibos, eventos y almacenamiento. | Error real de compilación; transacción que revierte no cambia el valor. | Corregir, recompilar y desplegar nueva instancia. Artefacto y despliegue conservan identidad de fuente y compilador. |
| 8 | Editar Vyper y ejecutar los mismos casos de comportamiento que en Solidity. | Diagnóstico real del compilador y reversión real de una operación inválida. | Corregir y recompilar. No exigir almacenamiento, bytecode ni gas idénticos entre lenguajes. |
| 9 | Comparar contratos vulnerables y reparados desde estados equivalentes; ejecutar ataque local. | Ataque falla en contrato reparado sin impedir un retiro legítimo. | Reiniciar ambos escenarios; explicar causa y cambio, sin garantizar seguridad general del contrato. |
| 10 | Transferir ERC-20, aprobar y consumir allowance; transferir NFT con actores distintos. | Gasto por encima del permiso y transferencia de NFT no autorizada revierten. | Aprobar o cambiar actor legítimamente; verificar permiso restante y propiedad real. |
| 11 | Firmar precio y fecha por fuente, validar y agregar fuentes distintas. | Firma alterada, dato vencido o repetición de fuente se rechaza; fuente auténtica puede mentir. | Actualizar fuentes o tiempo educativo; mostrar política de antigüedad y umbral sin afirmar verdad por firma. |
| 12 | Seguir solicitud, aprobación o rechazo, transacción, recibo y eventos en DApp local. | Rechazo del usuario no envía transacción; método no admitido informa error. | Aprobar nueva solicitud; vista se actualiza con eventos EVM. Subconjunto EIP-1193 explícito, sin billetera inyectada. |
| 13 | Ejecutar AMM y préstamo locales; comparar cotización, impacto, límite de deslizamiento y liquidación. | Límite incumplido revierte; posición sana no es liquidable. | Cambiar importe o precio educativo; usar enteros, redondeo y reglas de comisión explícitos. |
| 14 | Reproducir traza real y acotada de instrucciones; inspeccionar pila, memoria, gas y almacenamiento. | REVERT o agotamiento de gas anula cambios persistentes. | Reiniciar reproducción o ejecutar otro programa. Cada muestra indica estado previo a instrucción, profundidad y truncamiento. |
| 15 | Variar últimos mensajes ponderados y votos de checkpoints; comparar cabeza, justificación y finalidad. | Menos de dos tercios no justifica; votos duplicados no suman stake. | Reconectar y entregar votos; denominador mantiene stake desconectado. Modelo acotado, no cliente de consenso. |
| 16 | Ejecutar lote educativo, variar disponibilidad de datos y comparar impugnación con prueba de validez real. | Lote o resultado alterados no autorizan liquidación; falta de datos o finalidad mantiene retiro pendiente. | Publicar datos correctos, impugnar o generar prueba vinculada al lote. Relación probada explícita, sin afirmar zk-EVM. |
| 17 | Generar prueba real de conocimiento de testigo y verificar paquete con entradas públicas. | Prueba alterada o entradas públicas distintas no verifican; testigo inválido no genera prueba válida. | Restaurar paquete o generar prueba nueva. Configuración educativa no apta para fondos; el navegador del probador conoce el testigo. |

### Revisiones previas

Astra y Luna completaron revisiones de enfoque en nivel alto. Ambos exigieron pruebas reales de viabilidad y recorridos concretos antes de cerrar interfaces. Esto no verifica laboratorios todavía no implementados. Las revisiones posteriores deben registrar por capítulo hallazgo, evidencia, corrección y comprobación, incluidos problemas de UX y vulnerabilidades confirmadas o riesgos pendientes.

## Verificación integrada de la ampliación

- Instalación limpia con Node `26.8.1`: `npm ci` completó sin aprobar scripts bloqueados. `npm run test:labs` aprobó 213 pruebas; cero fallos. Los errores de restricciones impresos por casos de testigo inválido son resultados negativos esperados.
- `npm run build` y `VOCS_BASE_PATH=/ethereumbook-es npm run build` completaron el libro y las 17 entradas estáticas. Cada compilación generó 57 archivos Vocs, nueve artefactos Solidity reales y comprobó ocho fuentes y recursos ZK sin regenerar la configuración.
- En navegador se recorrieron 25 páginas por instalación: 239 imágenes decodificadas, 383 bloques de código y 23 expresiones MathML. Los 709 destinos locales y fragmentos únicos de cada instalación resolvieron sin fallos.
- Los 17 botones de capítulo y los 17 botones de catálogo se abrieron mediante clic nativo en raíz y subruta. Se comprobaron vuelta al capítulo, navegación hidratada al catálogo y regreso desde cada laboratorio. Los 16 nuevos tienen enlace directo al catálogo; el original del capítulo 6 conserva su navegación a través del libro.
- No hubo errores de navegador ni desbordamiento de página en esos recorridos de escritorio. El catálogo se inspeccionó además en móvil oscuro de 390 px; las comprobaciones individuales de móvil y teclado constan en `LABS_REVIEW.md`.
- El libro completo en subruta generó y verificó una prueba Groth16 nueva. Su pie abrió por navegación nativa la página de licencias, sin JavaScript; el archivo de fuentes servido por HTTP coincidió con su SHA-256 publicado. El laboratorio original también firmó, admitió e incluyó una transferencia nueva de 0.1 ETH: 21000 gas y 0.000252 ETH de comisión.
- Se verificaron 169 archivos de fuentes preferidas y 1647 copias de licencias o metadatos correspondientes a 831 paquetes instalados. El archivo se extrajo en otro directorio, instaló con `npm ci --ignore-scripts` y compiló sus 17 laboratorios mediante `npm run build:labs`; sus 169 fuentes siguieron coincidiendo byte por byte. No es una auditoría jurídica ni de composición completa de los bundles.
- Las 20 fuentes originales del libro conservaron sus hashes. No se ejecutaron ejemplos contra redes ni se modificaron capítulos o figuras.
- El capítulo 6 se publicó mediante `8b8fd7a`; el usuario autorizó integrar la ampliación en `main` y `develop` como respaldo. No se ejecutó un despliegue manual ni se verificó CI remota. Quedan fuera de aprobación técnica: revisión editorial humana, accesibilidad con lector de pantalla o dispositivo físico, derechos de figuras y condiciones de distribución de runtimes, especialmente la licencia modificada de Vyper.
- Revisión arquitectónica integrada final de Astra en nivel alto: sin hallazgos nuevos que requieran cambios; aprobado únicamente el alcance técnico local. La restauración posterior del artefacto de raíz se comprobó abriendo de nuevo catálogo y laboratorio, sin errores y en 390/390 px.
- La vista previa de raíz queda activa en `http://192.168.122.156:5173/laboratorios`. Se detuvieron las instalaciones temporales de subruta y se retiraron los fixtures y las definiciones temporales de agentes; la evidencia de ejecución permanece en el registro de la sesión.
