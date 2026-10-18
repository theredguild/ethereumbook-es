# Plan de laboratorios interactivos

Material complementario original de The Red Guild. No sustituye ni modifica las afirmaciones de la traducción. El usuario autorizó este plan y el primer laboratorio, transacciones del capítulo 6. Los demás quedan pendientes, no se implementan automáticamente.

## Arquitectura

- Libro Vocs full-static y laboratorios React en el mismo repositorio y despliegue. Sin backend, base de datos, billetera conectada ni RPC por defecto.
- Entradas estáticas independientes bajo `/labs/`, compiladas con Vite. Botones HTML nativos desde el capítulo y la página de acceso `/laboratorios`; no enviar las URLs independientes al router de Waku ni a su paginación. Respetar `VOCS_BASE_PATH` en HTML, módulos, Worker y enlaces de regreso.
- Mantener parser Markdown del libro. No activar MDX globalmente. Preparar fuentes, compilar laboratorios al subdirectorio público generado y luego compilar Vocs. El preparador elimina `.vocs-content/`, por lo que el orden también debe cumplirse en desarrollo.
- Cómputo EVM en Worker. Firma, serialización, recuperación de remitente y ejecución reales con EthereumJS, versiones fijadas. Simuladores de red y economía identificados como modelos con supuestos visibles.
- Estado del primer laboratorio solo en memoria. Reinicio y recarga descartan todo. Progreso local opcional en laboratorios futuros; nunca guardar secretos personales.
- Sin claves del libro, fondos, servicios externos ni ejemplos ejecutados contra redes. Clave educativa conocida públicamente, sin entrada de claves del usuario. Nunca financiar estas direcciones ni importar la clave en billeteras.
- Aplicaciones grandes en página propia. Incrustaciones compactas se evaluarán después, reutilizando lógica y sin duplicar implementaciones.

## Lista por capítulo

| Estado | Capítulo | Laboratorio | Resultado verificable | Dependencias previstas |
| --- | --- | --- | --- | --- |
| Pendiente | 1. ¿Qué es Ethereum? | Máquina de estados compartida | Comparar estados, orden de transacciones y reglas comunes. Modelo didáctico explícito. | Ninguna. |
| Pendiente | 2. Fundamentos | Primera transacción sin riesgo | Distinguir firma, envío, inclusión y finalidad en recorrido educativo. | Motor del capítulo 6; simulación de finalidad identificada. |
| Pendiente | 3. Nodos | Red bajo fallas | Desconectar pares y observar información disponible para ejecución y consenso. | Simulador de mensajes, no nodos reales. |
| Pendiente | 4. Criptografía | Mesa de hashes y firmas | Detectar cambios de bytes y verificar firmas válidas e inválidas. | Criptografía de EthereumJS reutilizable. |
| Pendiente | 5. Billeteras | Explorador HD | Derivar cuentas desde frase pública de prueba y comparar rutas. Sin secretos personales. | Derivación HD revisada. |
| Implementado, verificado localmente | 6. Transacciones | Constructor, cola e inspector EIP-1559 | Firmar, decodificar, reemplazar e incluir transacciones; comprobar gas, nonce y reversión. | EthereumJS VM, transacciones, bloques, common y util. |
| Pendiente | 7. Solidity | Contrato paso a paso | Compilar y ejecutar contrato editable; comparar llamadas, transacciones, eventos y almacenamiento. | Motor EVM y compilador de navegador. |
| Pendiente | 8. Vyper | Mismo comportamiento, otro lenguaje | Ejecutar mismos casos sobre contratos Vyper y comparar semántica. | Investigar compilación editable real en navegador antes de comprometer interfaz. Bytecode precalculado no la sustituye. |
| Pendiente | 9. Seguridad | Romper y reparar | Explotar contratos locales y comprobar corrección sin romper operaciones legítimas. | Motor EVM, contratos y compilación. |
| Pendiente | 10. Tokens | Balances, permisos y propiedad | Comparar transferencias, allowances ERC-20 y propiedad ERC-721. | Motor EVM y contratos educativos. |
| Pendiente | 11. Oráculos | Datos auténticos e incorrectos | Variar fuentes, antigüedad y agregación; separar procedencia de verdad. | Firmas y modelo de fuentes. |
| Pendiente | 12. DApps | Aplicación completa observable | Seguir solicitudes, firma, recibos, eventos y rechazos desde frontend. | Motor EVM, contratos y adaptador local. |
| Pendiente | 13. DeFi | AMM y préstamos bajo estrés | Medir impacto de precio, deslizamiento y liquidación con supuestos explícitos. | Contratos locales y modelos económicos documentados. |
| Pendiente | 14. EVM | Depurador de bytecode | Avanzar instrucciones viendo pila, memoria, almacenamiento y gas reales. | Motor EVM e instrumentación. |
| Pendiente | 15. Consenso | Bifurcaciones y finalidad | Comparar cabeza de cadena y puntos finalizados al modificar atestaciones y mensajes. | Modelo documentado de reglas de consenso. |
| Pendiente | 16. Escalado | Del lote al retiro | Separar ejecución, disponibilidad de datos, impugnaciones y pruebas de validez. | Motor local; conexión con laboratorio ZK para pruebas reales. |
| Pendiente | 17. Conocimiento cero | Probar sin revelar testigo | Generar y verificar prueba real; rechazar modificaciones de prueba y entradas públicas. | Circuito y artefactos revisados, cálculo en Worker. |

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
