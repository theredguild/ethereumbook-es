# Capítulo 7. Contratos inteligentes y Solidity

Como vimos en el capítulo 2, existen dos tipos diferentes de cuentas en Ethereum: las EOA y las cuentas de contrato. Las EOA están controladas por usuarios, a menudo mediante software como una aplicación de billetera externa a la plataforma Ethereum. En cambio, las cuentas de contrato están controladas por código de programa (también llamado comúnmente *contratos inteligentes*) que ejecuta la EVM.

En resumen, las EOA son cuentas simples sin código ni almacenamiento de datos asociados, mientras que las cuentas de contrato tienen ambos. Las EOA se controlan mediante transacciones creadas y firmadas criptográficamente con una clave privada en el "mundo real", externo e independiente del protocolo, mientras que las cuentas de contrato no tienen claves privadas y, por lo tanto, "se controlan a sí mismas" de la manera predeterminada que prescribe el código de su contrato inteligente. Ambos tipos de cuentas se identifican mediante una dirección de Ethereum. En este capítulo, analizaremos las cuentas de contrato y el código de programa que las controla.

## ¿Qué es un contrato inteligente?

El término *contrato inteligente* (smart contract) se ha utilizado a lo largo de los años para describir una gran variedad de cosas. En la década de 1990, el criptógrafo Nick Szabo acuñó el término y lo definió como "un conjunto de promesas, especificadas en forma digital, incluidos los protocolos mediante los cuales las partes cumplen las demás promesas". Desde entonces, el concepto de contrato inteligente ha evolucionado, especialmente después de la introducción de plataformas blockchain descentralizadas con el lanzamiento de Bitcoin en 2009.

En el contexto de Ethereum, el término es algo inexacto, ya que los contratos inteligentes de Ethereum no son inteligentes ni contratos legales, pero el nombre se ha mantenido. En este libro, usamos el término *contratos inteligentes* para referirnos a programas informáticos inmutables que se ejecutan de forma determinista en el contexto de la EVM como parte del protocolo de la red Ethereum, es decir, en la computadora mundial descentralizada de Ethereum.

Desglosemos esa definición:

**Programas informáticos**

Los contratos inteligentes son simplemente programas informáticos. La palabra *contrato* no tiene significado legal en este contexto.

**Inmutables**

Una vez desplegado, el código de un contrato inteligente no puede cambiar. A diferencia del software tradicional, la única manera de modificar un contrato inteligente es desplegar una nueva instancia.

**Deterministas**

El resultado de la ejecución de un contrato inteligente es el mismo para todos los que lo ejecutan, dados el contexto de la transacción que inició su ejecución y el estado de la blockchain de Ethereum en el momento de la ejecución.

**Contexto de la EVM**

Los contratos inteligentes operan con un contexto de ejecución muy limitado. Pueden acceder a su propio estado, al contexto de la transacción que los llamó y a cierta información sobre los bloques más recientes.

**Computadora mundial descentralizada**

La EVM se ejecuta como una instancia local en cada nodo de Ethereum, pero como todas las instancias de la EVM operan sobre el mismo estado inicial y producen el mismo estado final, el sistema en su conjunto opera como una única "computadora mundial".

## Ciclo de vida de un contrato inteligente

Los contratos inteligentes suelen escribirse en un lenguaje de alto nivel como Solidity. Pero, para ejecutarse, deben compilarse al bytecode de bajo nivel que se ejecuta en la EVM. Una vez compilados, se despliegan en la plataforma Ethereum mediante una transacción especial de creación de contrato, que se identifica por tener un campo `to` vacío (véase "Transacción especial: creación de contratos" en el capítulo 6). Cada contrato se identifica mediante una dirección de Ethereum, que se deriva de la transacción de creación del contrato en función de la cuenta de origen y el nonce. La dirección de Ethereum de un contrato se puede usar como destinatario de una transacción para enviarle fondos o llamar a una de sus funciones. Cabe señalar que, a diferencia de las EOA, no hay claves asociadas con una cuenta creada para un nuevo contrato inteligente. Quien crea el contrato no obtiene privilegios especiales a nivel del protocolo (aunque puede programarlos explícitamente en el contrato inteligente). Ciertamente no recibe la clave privada de la cuenta de contrato, que en realidad no existe: podemos decir que las cuentas de contrato inteligente se pertenecen a sí mismas.

Es importante destacar que los contratos *solo se ejecutan si una transacción los llama*. Todos los contratos inteligentes de Ethereum se ejecutan, en última instancia, debido a una transacción iniciada desde una EOA. Un contrato puede llamar a otro contrato que puede llamar a otro, y así sucesivamente, pero el primer contrato de esa cadena de ejecución siempre habrá sido llamado por una transacción de una EOA. Los contratos nunca se ejecutan "por su cuenta" ni "en segundo plano". En efecto, permanecen inactivos hasta que una transacción activa su ejecución, ya sea directamente o de forma indirecta como parte de una cadena de llamadas a contratos. También cabe señalar que los contratos inteligentes no se ejecutan "en paralelo" en ningún sentido: la computadora mundial de Ethereum puede considerarse una máquina de un solo hilo.

Las transacciones son *atómicas*, sin importar cuántos contratos llamen ni qué hagan esos contratos cuando se los llama. Las transacciones se ejecutan en su totalidad y los cambios en el estado global (contratos, cuentas, etc.) solo se registran si toda la ejecución termina correctamente. *Terminar correctamente* significa que el programa se ejecutó sin errores y llegó al final de la ejecución. Si la ejecución falla debido a un error, todos sus efectos (cambios de estado) se "revierten", como si la transacción nunca se hubiera ejecutado. Una transacción fallida se registra de todos modos como un intento y el ether gastado en gas para la ejecución se descuenta de la cuenta de origen, pero por lo demás no tiene efectos sobre el estado de contratos ni cuentas.

Como se mencionó antes, el código de un contrato no puede cambiarse una vez desplegado. Históricamente, era posible eliminar un contrato, quitando su código y su estado interno (almacenamiento persistente) de su dirección y dejando una cuenta vacía. Después de esa eliminación, las transacciones enviadas a esa dirección no ejecutaban código porque ya no quedaba ninguno. Esta eliminación se realizaba mediante un código de operación de la EVM llamado `SELFDESTRUCT`, que ofrecía un reembolso de gas e incentivaba la liberación de recursos de la red al eliminar el estado almacenado. Sin embargo, la operación `SELFDESTRUCT` quedó obsoleta mediante [EIP-6780](https://oreil.ly/5LcZo) en 2023 debido a los cambios importantes que requiere en el estado de una cuenta, en particular la eliminación de todo el código y el almacenamiento persistente. Con las próximas actualizaciones de la hoja de ruta de Ethereum, esta operación dejará de ser viable.

## Introducción a los lenguajes de alto nivel de Ethereum

La EVM es una máquina virtual que ejecuta una forma especial de código llamada *bytecode de la EVM*, análoga a la CPU de una computadora, que ejecuta código máquina como x86_64. Examinaremos el funcionamiento y el lenguaje de la EVM con mucho más detalle en el capítulo 14. En esta sección, veremos cómo se escriben los contratos inteligentes para ejecutarse en la EVM.

Aunque es posible programar contratos inteligentes directamente en bytecode, el bytecode de la EVM es poco manejable y muy difícil de leer y entender para los programadores. En su lugar, la mayoría de los desarrolladores de Ethereum usan un lenguaje de alto nivel para escribir programas y un compilador para convertirlos en bytecode.

Aunque cualquier lenguaje de alto nivel podría adaptarse para escribir contratos inteligentes, adaptar un lenguaje arbitrario para compilarlo a bytecode de la EVM es una tarea bastante engorrosa que, en general, provocaría cierta confusión. Los contratos inteligentes operan en un entorno de ejecución muy restringido y minimalista (la EVM). Además, debe estar disponible un conjunto especial de variables y funciones del sistema específicas de la EVM. Por ello, es más fácil construir desde cero un lenguaje para contratos inteligentes que adaptar un lenguaje de propósito general para escribirlos. Como resultado, han surgido varios lenguajes de propósito específico para programar contratos inteligentes. Ethereum cuenta con varios de estos lenguajes, junto con los compiladores necesarios para producir bytecode ejecutable en la EVM.

En general, los lenguajes de programación pueden clasificarse en dos grandes paradigmas de programación: *declarativo* e *imperativo*, también conocidos como *funcional* y *procedimental*, respectivamente. En la programación declarativa, escribimos funciones que expresan la *lógica* de un programa, pero no su *flujo*. La programación declarativa se usa para crear programas sin *efectos secundarios*, lo que significa que no hay cambios de estado fuera de una función. Entre los lenguajes de programación declarativos se encuentran Haskell y SQL. En cambio, en la programación imperativa, el programador escribe un conjunto de procedimientos que combinan la lógica y el flujo de un programa. Entre los lenguajes de programación imperativos se encuentran C++ y Java. Algunos lenguajes son "híbridos", lo que significa que fomentan la programación declarativa, pero también pueden usarse para expresar un paradigma de programación imperativo. Entre estos híbridos se encuentran Lisp, JavaScript y Python. En general, cualquier lenguaje imperativo puede usarse para escribir según un paradigma declarativo, pero a menudo el código resultante es poco elegante. En comparación, los lenguajes puramente declarativos no pueden usarse para escribir según un paradigma imperativo. En los lenguajes puramente declarativos no existen "variables".

Aunque los programadores usan más la programación imperativa, puede ser muy difícil escribir programas que se ejecuten exactamente como se espera. La capacidad de cualquier parte del programa de cambiar el estado de cualquier otra dificulta razonar sobre su ejecución y genera muchas oportunidades de introducir errores. En comparación, la programación declarativa facilita entender cómo se comportará un programa: como no tiene efectos secundarios, cualquier parte de un programa puede entenderse de forma aislada.

En los contratos inteligentes, los errores cuestan dinero, literalmente. Por ello, es de suma importancia escribir contratos inteligentes sin efectos no deseados. Para lograrlo, hay que poder razonar claramente sobre el comportamiento esperado del programa. Por eso, los lenguajes declarativos tienen un papel mucho mayor en los contratos inteligentes que en el software de propósito general. Sin embargo, como veremos, el lenguaje más utilizado para contratos inteligentes (Solidity) es imperativo. ¡Los programadores, como la mayoría de los seres humanos, se resisten al cambio!

Los lenguajes de programación de alto nivel para contratos inteligentes que cuentan con soporte actualmente incluyen los siguientes (ordenados por popularidad):

**Solidity**

Un lenguaje de programación procedimental (imperativo) con una sintaxis similar a JavaScript, C++ o Java. El lenguaje más popular y utilizado para contratos inteligentes de Ethereum.

**Yul**

Un lenguaje intermedio que se usa en modo independiente o integrado en Solidity, ideal para optimizaciones de alto nivel entre plataformas. Quienes se inician deberían comenzar con Solidity o Vyper antes de explorar Yul, ya que requiere conocimientos avanzados de seguridad de contratos inteligentes y de la EVM.

**Vyper**

Un lenguaje de programación orientado a contratos con una sintaxis similar a Python que prioriza la seguridad del usuario y fomenta prácticas de programación claras mediante el diseño del lenguaje y una ejecución eficiente.

**Huff**

Un lenguaje de programación de bajo nivel utilizado principalmente por desarrolladores que requieren código de contrato muy eficiente y minimalista, que permite optimizaciones avanzadas más allá de lo que ofrecen lenguajes de nivel superior como Solidity. Al igual que Yul, no se recomienda para principiantes.

**Fe**

Un lenguaje de contratos inteligentes con tipado estático para la EVM, inspirado en Python y Rust. Busca ser fácil de aprender, incluso para desarrolladores nuevos en Ethereum; su desarrollo aún se encuentra en etapas tempranas desde su lanzamiento alfa en enero de 2021.

En el pasado se desarrollaron otros lenguajes que ya no se mantienen, como LLL, Serpent y Bamboo.

Como puede verse, hay muchos lenguajes para elegir. Sin embargo, de todos ellos, Solidity es por mucho el más popular, hasta el punto de ser el lenguaje de alto nivel de facto de Ethereum e incluso de otras blockchains similares a la EVM.

## Construcción de un contrato inteligente con Solidity

Solidity fue creado por Gavin Wood (coautor de la primera edición de este libro) como un lenguaje específico para escribir contratos inteligentes, con características que admiten directamente la ejecución en el entorno descentralizado de la computadora mundial de Ethereum. Los atributos resultantes son bastante generales, por lo que ha terminado utilizándose para programar contratos inteligentes en varias otras plataformas blockchain. Fue desarrollado por Christian Reitwiessner y luego por Alex Beregszaszi, Liana Husikyan, Yoichi Hirai y varios antiguos colaboradores del núcleo de Ethereum. Actualmente, Solidity se desarrolla y mantiene como un proyecto independiente en [GitHub](https://oreil.ly/ik9kH).

El principal "producto" del proyecto Solidity es el compilador de Solidity, solc, que convierte los programas escritos en el lenguaje Solidity a bytecode de la EVM. El proyecto también gestiona el importante estándar ABI para contratos inteligentes de Ethereum, que exploraremos en detalle en este capítulo. Cada versión del compilador de Solidity corresponde a una versión específica del lenguaje Solidity y la compila.

Para comenzar, descargaremos un ejecutable binario del compilador de Solidity. Luego, desarrollaremos y compilaremos un contrato simple, continuando con el ejemplo que iniciamos en el capítulo 2.

### Selección de una versión de Solidity

Solidity sigue un modelo de versiones llamado [*versionado semántico*](https://semver.org), que especifica números de versión estructurados como tres números separados por puntos: MAJOR.MINOR.PATCH. El número "major" se incrementa para cambios importantes e incompatibles con versiones anteriores, el número "minor" se incrementa cuando se agregan características compatibles con versiones anteriores entre versiones mayores, y el número "patch" se incrementa para correcciones de errores compatibles con versiones anteriores.

Al momento de escribir este libro, Solidity se encuentra en la versión 0.8.26. Las reglas para la versión mayor 0, que corresponde al desarrollo inicial de un proyecto, son diferentes: cualquier cosa puede cambiar en cualquier momento. En la práctica, Solidity trata el número "minor" como si fuera la versión mayor y el número "patch" como si fuera la versión menor. Por lo tanto, en 0.8.26, 8 se considera la versión mayor y 26 la versión menor. Como vimos en el capítulo 2, los programas de Solidity pueden contener una directiva pragma que especifica las versiones mínima y máxima de Solidity con las que son compatibles y que pueden usarse para compilar el contrato. Como Solidity evoluciona rápidamente, a menudo es mejor instalar la versión más reciente.

> **Nota**
>
> Otra consecuencia de la rápida evolución de Solidity es la velocidad con la que la documentación queda desactualizada. En este momento, trabajamos con la versión 0.8.26 de Solidity y todo lo que aparece en este libro se basa en esa versión. Aunque este libro siempre brindará una base sólida para aprender Solidity, las versiones futuras podrían cambiar parte de la sintaxis y funcionalidad. Por eso, cuando surjan preguntas o algo nuevo, conviene consultar la [documentación oficial de Solidity](https://oreil.ly/LzV7L) para mantenerse al día.

### Descarga e instalación de Solidity

Existen varios métodos para descargar e instalar Solidity, según el sistema operativo y los requisitos: como una distribución binaria o compilándolo desde el código fuente. Se pueden encontrar instrucciones detalladas y actualizadas en la [documentación de Solidity](https://oreil.ly/JW--z).

A continuación se muestra cómo instalar la distribución binaria más reciente de Solidity en un sistema operativo Ubuntu/Debian mediante el gestor de paquetes apt:

```bash
$ sudo add-apt-repository ppa:ethereum/ethereum
$ sudo apt update
$ sudo apt install solc
```

Una vez instalado solc, se puede comprobar la versión ejecutando:

```bash
$ solc --version
solc, the solidity compiler commandline interface
Version: 0.8.26+commit.8a97fa7a.Linux.g++
```

### Entorno de desarrollo

Aunque es completamente posible desarrollar contratos inteligentes de Solidity con un editor de texto simple, usar un framework de desarrollo como [Hardhat](https://hardhat.org) o [Foundry](https://oreil.ly/-7Qvy) puede mejorar considerablemente la eficiencia y eficacia del desarrollador. Estos frameworks ofrecen un conjunto completo de herramientas que simplifican y mejoran el proceso de desarrollo. Por ejemplo, proporcionan entornos de pruebas sólidos que permiten escribir y ejecutar pruebas unitarias para validar el comportamiento de los contratos, y ofrecen capacidades de bifurcación para crear instancias locales de la red principal y realizar pruebas en escenarios realistas. Con capacidades avanzadas de depuración y seguimiento, se puede recorrer fácilmente la ejecución del código e identificar y resolver problemas rápidamente, ahorrando tiempo y reduciendo errores. Además, estos frameworks permiten la automatización de scripts y despliegues, ecosistemas de complementos que amplían la funcionalidad y una gestión fluida de redes en distintos entornos. Integrar estas capacidades en el flujo de trabajo asegura un nivel superior de calidad y seguridad del código, difícil de lograr con un editor de texto simple.

Más allá de los frameworks, adoptar un IDE moderno como VS Code mejora aún más la productividad. VS Code ofrece una amplia variedad de extensiones para Solidity, incluido el resaltado de sintaxis, que facilita la lectura del código; herramientas avanzadas de comentarios y marcadores para ayudar a organizar y recorrer proyectos complejos; y herramientas de análisis visual que aportan información sobre la estructura del código y sus posibles problemas. También existen entornos de desarrollo basados en la web, como [Remix IDE](https://oreil.ly/Fz0jJ).

En conjunto, estas herramientas no solo mejoran la calidad del código, sino que también aceleran el proceso de desarrollo y nos permiten construir y desplegar contratos inteligentes con mayor rapidez y seguridad.

### Escritura de un programa simple en Solidity

En el capítulo 2, escribimos nuestro primer programa en Solidity. Cuando construimos por primera vez el contrato `Faucet`, usamos Remix IDE para compilarlo y desplegarlo. En esta sección, retomaremos, mejoraremos y ampliaremos `Faucet`.

Nuestro primer intento tenía el aspecto del ejemplo 7-1.

**Ejemplo 7-1. Faucet.sol: un contrato de Solidity que implementa un faucet**

```solidity
// SPDX-License-Identifier: GPL-3.0
// ¡Nuestro primer contrato es un faucet!
contract Faucet {
    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint _withdrawAmount, address payable _to) public {
        // Limitar el monto del retiro
        require(_withdrawAmount <= 100000000000000000);
        // Enviar el monto a la dirección que lo solicitó
        _to.transfer(_withdrawAmount);
    }
    // Aceptar cualquier monto entrante
    receive() external payable {}
}
```

Como vimos en el capítulo 2, el identificador de licencia SPDX del comentario indica que el contrato inteligente tiene licencia GPL-3.0 e informa a usuarios y desarrolladores sobre sus derechos y obligaciones legales al usar y distribuir el código.

### Compilación con el compilador de Solidity (solc)

Ahora usaremos el compilador de Solidity desde la línea de comandos para compilar nuestro contrato directamente. El compilador de Solidity solc ofrece diversas opciones, que se pueden consultar pasando el argumento `--help`.

Usamos los argumentos `--bin` y `--optimize` de solc para producir un binario optimizado de nuestro contrato de ejemplo:

```bash
$ solc --optimize --bin Faucet.sol
======= Faucet.sol:Faucet =======
Binary:
6080604052348015600e575f5ffd5b5060fa8061001b5f395ff3fe608060405260043610601d575f3560e01c806
2f714ce146027575f5ffd5b36602357005b5f5ffd5b3480156031575f5ffd5b506041603d366004608d565b6043
565b005b67016345785d8a00008211156056575f5ffd5b6040516001600160a01b0382169083156108fc0290849
05f818181858888f193505050501580156088573d5f5f3e3d5ffd5b505050565b5f5f60408385031215609d575f
5ffd5b8235915060208301356001600160a01b038116811460b9575f5ffd5b80915050925092905056fea264697
06673582212208935b6cf5d9070b7609ad59ac4b727e512522c674cacf09a2eff88dafa3242ee64736f6c634300
081b0033
```

El resultado que produce solc es un binario serializado en hexadecimal que puede enviarse a la blockchain de Ethereum.

## La ABI de los contratos de Ethereum

En el software, una *interfaz binaria de aplicación* es una interfaz entre dos módulos de programa, a menudo entre el sistema operativo y los programas de usuario. Una ABI define cómo se accede a las estructuras de datos y las funciones en *código máquina*; no debe confundirse con una API, que define ese acceso en formatos de alto nivel, a menudo legibles para los seres humanos, como *código fuente*. Por lo tanto, la ABI es la forma principal de codificar y decodificar datos hacia y desde el código máquina.

En Ethereum, la ABI se usa para codificar llamadas a contratos para la EVM y para leer datos de las transacciones. El propósito de una ABI es definir las funciones del contrato que pueden invocarse y describir cómo aceptará argumentos y devolverá su resultado cada función.

La ABI de un contrato se especifica como un arreglo JSON de descripciones de funciones (véase "Funciones") y eventos (véase "Eventos"). La descripción de una función es un objeto JSON con los campos `type`, `name`, `inputs`, `outputs`, `constant` y `payable`. El objeto de descripción de un evento tiene los campos `type`, `name`, `inputs` y `anonymous`.

Usamos el compilador de Solidity de línea de comandos solc para producir la ABI de nuestro contrato de ejemplo *Faucet.sol*:

```bash
$ solc --abi Faucet.sol
======= Faucet.sol:Faucet =======
Contract JSON ABI
[{"inputs":[{"internalType":"uint256","name":"withdrawAmount","type":"uint256"}],
"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"stateMutability":"payable","type":"receive"}]
```

Como puede verse, el compilador produce un arreglo JSON que describe las dos funciones definidas por *Faucet.sol*. Cualquier aplicación que desee acceder al contrato `Faucet` una vez desplegado puede usar este JSON. Mediante la ABI, una aplicación como una billetera o un navegador de DApps puede construir transacciones que llamen a las funciones de `Faucet` con los argumentos y tipos de argumentos correctos. Por ejemplo, una billetera sabría que, para llamar a la función `withdraw`, tendría que proporcionar un argumento `uint256` llamado `withdrawAmount`. La billetera podría solicitar al usuario ese valor y luego crear una transacción que lo codifique y ejecute la función `withdraw`.

Todo lo que una aplicación necesita para interactuar con un contrato es una ABI y la dirección en la que se desplegó el contrato.

## Selección de una versión del compilador y del lenguaje Solidity

Como vimos en el código anterior, nuestro contrato `Faucet` se compila correctamente con la versión 0.8.26 de Solidity. Pero ¿qué habría ocurrido si hubiéramos usado una versión diferente del compilador de Solidity? El lenguaje sigue cambiando constantemente y pueden producirse cambios inesperados. Nuestro contrato es bastante simple, pero ¿qué pasaría si nuestro programa usara una característica agregada recién en la versión 0.8.26 de Solidity e intentáramos compilarlo con la 0.8.25?

Para resolver estos problemas, Solidity ofrece una directiva del compilador llamada *pragma de versión*, que indica al compilador que el programa espera una versión específica del compilador (y del lenguaje). Veamos un ejemplo:

```solidity
pragma solidity 0.8.26;
```

El compilador de Solidity lee el pragma de versión y produce un error si la versión del compilador es incompatible con él. En este caso, nuestro pragma de versión dice que este programa puede compilarse con un compilador de Solidity de la versión 0.8.26. Las directivas pragma no se compilan a bytecode de la EVM; son directivas de tiempo de compilación que el compilador usa únicamente para comprobar la compatibilidad.

> **Nota**
>
> En la directiva pragma, el símbolo ^ indica que permitimos compilar con cualquier *revisión menor* igual o superior a la especificada. Por ejemplo, una directiva pragma `pragma solidity ^0.7.1;` significa que el contrato puede compilarse con una versión de solc 0.7.1, 0.7.2 y 0.7.3, pero no 0.8.0 (que es una revisión mayor, no una revisión menor).

Agreguemos una directiva pragma a nuestro contrato `Faucet`. Llamaremos al nuevo archivo *Faucet2.sol* para llevar un registro de los cambios a medida que avanzamos en estos ejemplos, comenzando por el ejemplo 7-2.

**Ejemplo 7-2. Faucet2.sol: incorporación del pragma de versión a Faucet**

```solidity
pragma solidity 0.8.26;
// SPDX-License-Identifier: GPL-3.0
// ¡Nuestro primer contrato es un faucet!
contract Faucet {
    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint _withdrawAmount, address payable _to) public {
        // Limitar el monto del retiro
        require(_withdrawAmount <= 100000000000000000);
        // Enviar el monto a la dirección que lo solicitó
        _to.transfer(_withdrawAmount);
    }
    // Aceptar cualquier monto entrante
    receive() external payable {}
}
```

Agregar un pragma de versión es una buena práctica porque evita problemas con versiones incompatibles del compilador y del lenguaje. Exploraremos otras buenas prácticas y seguiremos mejorando el contrato `Faucet` a lo largo de este capítulo.

## Programación con Solidity

En esta sección, veremos algunas capacidades del lenguaje Solidity. Como mencionamos en el capítulo 2, nuestro primer contrato de ejemplo era muy simple y también tenía varios defectos. Aquí lo mejoraremos gradualmente mientras exploramos cómo usar Solidity. Sin embargo, esto no será un tutorial exhaustivo de Solidity, ya que el lenguaje es bastante complejo y evoluciona rápidamente. Cubriremos los conceptos básicos y brindaremos una base suficiente para explorar el resto de manera independiente.

### Tipos de datos

Primero, veamos algunos de los tipos de datos básicos que ofrece Solidity:

**Booleano (bool)**

Valor booleano, `true` o `false`, con los operadores lógicos ! (no), && (y), || (o), == (igual) y != (distinto).

**Entero (int, uint)**

Enteros con signo (`int`) y sin signo (`uint`), declarados en incrementos de 8 bits desde `int8` hasta `uint256`. Sin un sufijo de tamaño, se usan cantidades de 256 bits para coincidir con el tamaño de palabra de la EVM.

**Punto fijo (fixed, ufixed)**

Números de punto fijo, declarados con `(u)fixedMxN`, donde *M* es el tamaño en bits (incrementos de 8 hasta 256) y *N* es la cantidad de decimales después del punto (hasta 18), por ejemplo, `ufixed32x2`.

> **Nota**
>
> Solidity aún no admite por completo los números de punto fijo. Pueden declararse, pero no se pueden realizar asignaciones hacia o desde ellos.

**Dirección**

Una dirección de Ethereum de 20 bytes. El objeto `address` tiene muchas funciones miembro útiles; las principales son `balance` (devuelve el saldo de la cuenta) y `transfer` (transfiere ether a la cuenta).

**Arreglo de bytes (fijo)**

Arreglos de bytes de tamaño fijo, declarados con `bytes1` hasta `bytes32`.

**Arreglo de bytes (dinámico)**

Arreglos de bytes de tamaño variable, declarados con `bytes` o `string`.

**Enumeración**

Tipo definido por el usuario para enumerar valores discretos: `enum NAME {LABEL1, LABEL 2, ...}`. El tipo subyacente de una enumeración es `uint8`; por lo tanto, no puede tener más de 256 miembros y puede convertirse explícitamente a todos los tipos enteros.

**Arreglos**

Un arreglo de cualquier tipo, fijo o dinámico: `uint32[][5]` es un arreglo de tamaño fijo de cinco arreglos dinámicos de enteros sin signo.

**Estructura**

Contenedores de datos definidos por el usuario para agrupar variables: `struct NAME {TYPE1 VARIABLE1; TYPE2 VARIABLE2; ...}`.

**Mapeo**

Tablas de búsqueda hash para pares *clave* ⇒ *valor*: `mapping(KEY_TYPE` `⇒` `VALUE_TYPE) NAME`.

Además de estos tipos de datos, Solidity ofrece diversos valores literales que pueden usarse para calcular distintas unidades:

**Unidades de tiempo**

La variable global `block.timestamp` representa el momento, en segundos, en que un bloque se publicó y agregó a la blockchain, contado desde la época Unix (1 de enero del 70). Las unidades `seconds`, `minutes`, `hours` y `days` pueden usarse como sufijos, convirtiéndose en múltiplos de la unidad base `seconds`.

> **Nota**
>
> Como un bloque puede contener varias transacciones, todas las transacciones de un bloque comparten el mismo `block.timestamp`, que refleja el momento en que se publicó el bloque, no el instante exacto en que se inició cada transacción.

**Unidades de ether**

Las unidades `wei` y `ether` pueden usarse como sufijos, convirtiéndose en múltiplos de la unidad base `wei`. Antes también estaban disponibles las denominaciones `finney` y `szabo`, pero se eliminaron en la versión 0.7.0 de Solidity.

En nuestro contrato de ejemplo `Faucet`, usamos un `uint` (que es un alias de `uint256`) para la variable `withdrawAmount`. También usamos indirectamente una variable `address`, que establecimos con `msg.sender`. Usaremos más de estos tipos de datos en los ejemplos del resto de este capítulo.

Usemos uno de los multiplicadores de unidad para mejorar la legibilidad de nuestro contrato de ejemplo. En la función `withdraw`, limitamos el retiro máximo expresando el límite en wei, la unidad base de ether:

```solidity
require(withdrawAmount <= 100000000000000000);
```

Eso no es muy fácil de leer. Podemos mejorar nuestro código usando el multiplicador de unidad `ether` para expresar el valor en ether en lugar de wei:

```solidity
require(withdrawAmount <= 0.1 ether);
```

### Variables: definición y alcance

En Solidity, la sintaxis para definir variables y funciones es similar a la de otros lenguajes con tipado estático: asignamos un tipo, un nombre y un valor opcional a cada variable. Para las variables de estado, también podemos especificar su visibilidad. La visibilidad predeterminada es `internal`, lo que significa que la variable solo es accesible dentro del contrato y de sus contratos derivados. Para hacerlas accesibles desde otros contratos inteligentes, debemos usar la visibilidad `public`.

Los contratos inteligentes de Solidity tienen tres tipos de alcance de variables:

**Variables de estado**

Almacenan datos permanentes en el contrato inteligente, conocidos como *estado persistente*, mediante el registro de valores en la blockchain. Las variables de estado se definen dentro del contrato inteligente, pero fuera de cualquier función. Ejemplo: `uint public count;`

**Variables locales**

Son datos temporales usados durante los cálculos que conservan información por períodos breves. Las variables locales no se almacenan en la blockchain; existen dentro de las funciones y no son accesibles fuera de su alcance definido. Ejemplo: `uint count = 1;`

**Variables globales**

Solidity las proporciona automáticamente y están disponibles sin declaración ni importación explícitas. Ofrecen información sobre el entorno de la blockchain e incluyen funciones de utilidad para usar dentro del programa. Las variables globales predefinidas se enumeran exhaustivamente en la siguiente sección.

Como mencionamos brevemente, las variables de estado pueden declararse especificando su visibilidad. Solidity ofrece tres niveles de visibilidad diferentes: las *variables públicas* generan funciones de lectura automáticas que permiten a los contratos externos leer sus valores, aunque no modificarlos; las *variables internas* solo son accesibles dentro del contrato y sus contratos derivados; y las *variables privadas* son similares a las internas, pero ni siquiera los contratos derivados pueden acceder a ellas.

### Variables y funciones globales predefinidas

Cuando un contrato se ejecuta en la EVM, tiene acceso a un pequeño conjunto de objetos globales. Entre ellos están los objetos `block`, `msg` y `tx`. Además, Solidity expone varios códigos de operación de la EVM como funciones predefinidas. En esta sección, examinaremos las variables y funciones a las que se puede acceder desde un contrato inteligente en Solidity.

#### Contexto de la transacción o llamada de mensaje

El objeto `msg` es la llamada de transacción (originada en una EOA) o llamada de mensaje (originada en un contrato) que inició esta ejecución del contrato. Contiene varios atributos útiles:

**msg.sender**

Ya usamos este atributo. Representa la dirección que inició esta llamada al contrato, no necesariamente la EOA de origen que envió la transacción. Si nuestro contrato fue llamado directamente por una transacción de una EOA, será la dirección que firmó la transacción; en caso contrario, será una dirección de contrato.

**msg.value**

El valor de ether enviado con esta llamada (en wei).

**msg.data**

La carga de datos de esta llamada a nuestro contrato.

**msg.sig**

Los primeros cuatro bytes de la carga de datos, que constituyen el selector de función.

> **Nota**
>
> Cada vez que un contrato llama a otro, los valores de todos los atributos de `msg` cambian para reflejar la información del nuevo llamador. La única excepción es la función `delegatecall`, que ejecuta el código de otro contrato o biblioteca dentro del contexto original de `msg`.

#### Contexto de la transacción

El objeto `tx` permite acceder a información relacionada con la transacción:

**tx.gasprice**

El precio del gas en la transacción que realiza la llamada

**tx.origin**

La dirección de la EOA de origen de esta transacción

#### Contexto del bloque

El objeto `block` contiene la siguiente información sobre el bloque actual:

**block.basefee**

La comisión base del bloque actual, un valor ajustado dinámicamente que representa la comisión mínima de gas requerida para que una transacción se incluya en el bloque.

**block.blobbasefee**

La comisión base de ajuste dinámico para las transacciones de blobs, introducida para manejar grandes volúmenes de datos de manera eficiente como parte de las mejoras de escalabilidad de Ethereum con EIP-4844.

**block.chainid**

El identificador único de la blockchain en la que se está construyendo el bloque.

**block.prevrandao**

Un valor pseudoaleatorio derivado de la baliza de aleatoriedad del bloque anterior, proporcionado por la Beacon Chain. Puede ser útil para contratos inteligentes que requieren números aleatorios, únicamente para operaciones no sensibles, ya que puede manipularse hasta cierto punto.

**block.coinbase**

La dirección del destinatario de las comisiones y la recompensa del bloque actual.

**block.difficulty**

La dificultad (PoW) del bloque actual para las versiones de la EVM anteriores a Paris (The Merge). Para las versiones posteriores de la EVM que adoptan un modelo de consenso PoS, se comporta como un alias obsoleto de `block.prevrandao`.

**block.gaslimit**

La cantidad máxima de gas que se puede gastar entre todas las transacciones incluidas en el bloque actual.

**block.number**

El número del bloque actual (altura de la blockchain).

**block.timestamp**

La marca de tiempo que el minero colocó en el bloque actual (cantidad de segundos desde la época Unix).

#### Objeto de dirección

Cualquier dirección, ya sea pasada como entrada o convertida desde un objeto de contrato, tiene varios atributos y métodos.

**address.balance**

El saldo de la dirección en wei. Por ejemplo, el saldo del contrato actual es `address(this).balance`.

**address.code**

El bytecode del contrato almacenado en la dirección. Devuelve un arreglo de bytes vacío para las direcciones de EOA.

**address.codehash**

El hash Keccak-256 del bytecode del contrato almacenado en la dirección.

**address.transfer(amount)**

Transfiere el monto (en wei) a esta dirección y lanza una excepción ante cualquier error. Usamos esta función en nuestro ejemplo `Faucet` como un método de la dirección `msg.sender`, como `msg.sender.transfer`.

**address.send(amount)**

Similar a `transfer`, pero en lugar de lanzar una excepción, devuelve `false` si hay un error. Hay que comprobar siempre el valor de retorno de `send`.

**address.call(payload)**

Función `CALL` de bajo nivel que puede construir una llamada de mensaje arbitraria con una carga de datos. Devuelve `false` si hay un error. Atención: un destinatario puede consumir (accidental o maliciosamente) todo el gas y provocar que el contrato se detenga con una excepción OOG (sin gas); siempre hay que comprobar el valor de retorno de `call`.

**address.delegatecall(payload)**

Función `DELEGATECALL` de bajo nivel, como `address(this).call(...)`, pero con el código de este contrato reemplazado por el de `address`. Es especialmente útil para implementar el patrón proxy. Devuelve `false` si hay un error. Advertencia: ¡solo para uso avanzado!

**address.staticcall(payload)**

Función `STATICCALL` de bajo nivel, como `address(this).call(...)`, pero en modo de solo lectura, lo que significa que la función llamada no puede modificar ningún estado ni enviar ether. Devuelve `false` si hay un error.

> **Nota**
>
> Tanto `address.send()` como `address.transfer()` reenvían una cantidad fija de 2,300 unidades de gas, que podría ser insuficiente para ejecutar la lógica de respaldo. Con la entrada en funcionamiento de EIP-7702, se desaconseja su uso en favor de la opción más flexible `address.call()`. Veremos más sobre esto en el capítulo 9.

#### Funciones incorporadas

Otras funciones que vale la pena mencionar son:

**addmod, mulmod**

Para la suma y multiplicación modulares. Por ejemplo, `addmod(x,y,k)` calcula (x + y) % k.

**keccak256, sha256, ripemd160**

Funciones para calcular hashes con diversos algoritmos de hash estándar.

**ecrecover**

Recupera, a partir de la firma, la dirección utilizada para firmar un mensaje.

**selfdestruct(recipient_address)**

Obsoleta. Se usaba para eliminar el contrato actual y enviar el ether restante de la cuenta a la dirección del destinatario. Después de EIP-6780, esto solo ocurre si la instrucción de autodestrucción se invoca en la misma transacción que la creación. En todos los demás casos, los fondos se moverán, pero el contrato y su estado no se eliminarán.

**this**

El contrato actual, convertible explícitamente al tipo `Address` para obtener la dirección de la cuenta de contrato que se está ejecutando: `address(this)`.

**super**

El contrato que está un nivel más arriba en la jerarquía de herencia.

**gasleft**

La cantidad de gas restante para el contexto de ejecución actual.

**blockhash(block_number)**

El hash de un bloque dado identificado por su número de bloque; solo está disponible para los 256 bloques más recientes.

**blobhash(index)**

El hash del blob `index-th` asociado con la transacción actual.

### Definición de contratos

El tipo de datos principal de Solidity es `contract`; nuestro ejemplo `Faucet` simplemente define un objeto `contract`. Al igual que cualquier objeto de un lenguaje orientado a objetos, el *contrato* es un contenedor que incluye datos y métodos.

Solidity ofrece otros dos tipos de objetos similares a un contrato:

**interface**

La definición de una interfaz tiene exactamente la misma estructura que un contrato, excepto que ninguna de las funciones está definida: solo están declaradas. Este tipo de declaración suele llamarse *stub*; indica los argumentos y tipos de retorno de las funciones sin ninguna implementación. Una interfaz especifica la "forma" de un contrato; cuando se hereda, el contrato hijo debe definir cada una de las funciones declaradas por la interfaz.

**library**

Un contrato de biblioteca está pensado para desplegarse una sola vez y ser utilizado por otros contratos mediante el método `delegatecall` (véase "Objeto de dirección").

### Funciones

Dentro de un contrato, definimos funciones que pueden ser llamadas por una transacción de una EOA o por otro contrato. En nuestro ejemplo `Faucet`, tenemos dos funciones: `withdraw` y `receive`.

La sintaxis que usamos para declarar una función en Solidity es la siguiente:

```solidity
function FunctionName([parameters]) {public|private|internal|external} [virtual|override]
[pure|view|payable] [modifiers] [returns (return types)]
```

Veamos cada uno de estos componentes:

**FunctionName**

El nombre de la función, que se usa para llamarla en una transacción desde una EOA, desde otro contrato o incluso desde el mismo contrato.

**parameters**

Después del nombre, especificamos los argumentos que deben pasarse a la función, con sus nombres y tipos. En nuestro ejemplo `Faucet`, definimos `uint withdrawAmount` como el único argumento de la función `withdraw`.

El siguiente conjunto de palabras reservadas (`public`, `private`, `internal`, `external`) especifica la visibilidad de la función:

**public**

La visibilidad pública es la predeterminada; estas funciones pueden ser llamadas por otros contratos o transacciones de EOA, o desde el propio contrato. En nuestro ejemplo `Faucet`, ambas funciones están definidas como públicas.

**private**

Las funciones privadas son como las funciones internas, pero no pueden ser llamadas por contratos derivados.

**internal**

Las funciones internas solo son accesibles desde dentro del contrato: no pueden ser llamadas por otro contrato ni por una transacción de una EOA. Sí pueden ser llamadas por contratos derivados (los que heredan de este).

**external**

Las funciones externas son como las públicas, excepto que no pueden llamarse desde dentro del contrato a menos que se anteponga explícitamente la palabra reservada `this`.

Hay que tener presente que los términos *interno* y *privado* son algo engañosos. Cualquier función o dato dentro de un contrato siempre es *visible* en la blockchain pública, lo que significa que cualquiera puede ver el código o los datos. Las palabras reservadas descritas aquí solo afectan cómo y cuándo se puede *llamar* a una función.

> **Nota**
>
> ¡No debe confundirse la visibilidad de las funciones con la de las variables de estado! Comparten palabras reservadas y semántica, pero son dos cosas diferentes. Mientras que la visibilidad de las variables de estado es opcional, la de las funciones debe definirse explícitamente.

El segundo conjunto de palabras reservadas (`pure`, `view`, `payable`) afecta el comportamiento de la función:

**pure**

Una función pura es aquella que no lee ni escribe ninguna variable del almacenamiento persistente. Solo puede operar sobre argumentos y devolver datos, sin hacer referencia a ningún dato almacenado ni al estado de la blockchain. Las funciones puras buscan fomentar la programación de estilo declarativo sin efectos secundarios ni estado.

**view**

Una función marcada como vista no modifica ningún estado. El compilador no obliga a usar el modificador `view`; solo produce una advertencia cuando puede aplicarse.

**payable**

Una función pagable es aquella que puede aceptar pagos entrantes. Las funciones que no se declaran como `payable` rechazan los pagos entrantes. Existen dos excepciones, debidas a decisiones de diseño de la EVM: los pagos de coinbase y la herencia de `SELFDESTRUCT` se pagarán incluso si la función de respaldo no se declara como `payable`, pero esto tiene sentido porque la ejecución de código no forma parte de esos pagos de todos modos.

Exploremos ahora el comportamiento de dos funciones especiales, `receive` y `fallback`:

**receive()**

La función `receive` es la que permite que nuestros contratos reciban ether. Se activa cuando un contrato recibe una llamada con calldata vacío, normalmente durante transferencias simples de ether (como las realizadas mediante `.send()` o `.transfer()`). Se declara con `receive() external payable { ... }` y, aunque no puede tener argumentos ni devolver un valor, puede ser virtual, sobrescribir funciones y tener modificadores.

**fallback()**

La función `fallback` se ejecuta cuando se llama a un contrato con datos que no coinciden con ninguna de las otras firmas de función. Podemos declararla usando `fallback() external [payable]` o `fallback(bytes calldata input) external [payable] returns (bytes memory output)`. Si la función `fallback` incluye el parámetro de entrada, este contendrá todos los datos enviados al contrato (equivalentes a `msg.data`). Al igual que la función `receive`, la función `fallback` puede ser pagable y virtual, sobrescribir funciones e incluir modificadores. Actualmente, se usa principalmente para implementar el *patrón proxy:* un patrón de diseño que permite actualizar contratos inteligentes.

> **Nota**
>
> Si el contrato carece de una función `receive`, pero tiene una función `fallback` pagable, la función `fallback` se ejecutará durante esas transferencias. Si el contrato no tiene ni una función `receive` ni una función `fallback` pagable, no puede aceptar ether y la transacción se revertirá con una excepción.

### Constructor de contratos

Existe una función especial que se usa una sola vez. Cuando se crea un contrato, también se ejecuta la *función constructora*, si existe, para inicializar su estado. El constructor se ejecuta en la misma transacción que crea el contrato. La función constructora es opcional; puede observarse que nuestro ejemplo `Faucet` no tiene una.

Los constructores pueden especificarse mediante la palabra reservada `constructor`. Se ven así:

```solidity
pragma 0.8.26
// SPDX-License-Identifier: GPL-3.0
contract MEContract {
 address owner;
 constructor () { // Este es el constructor
  owner = msg.sender;
 }
}
```

El ciclo de vida de un contrato comienza con una transacción de creación desde una EOA o una cuenta de contrato. Si hay un constructor, se ejecuta como parte de la creación del contrato para inicializar su estado mientras se crea y, luego, se descarta.

> **Nota**
>
> Los constructores también pueden marcarse como pagables. Esto es necesario si se desea enviar ETH junto con la transacción de creación del contrato. Si el constructor no es pagable, cualquier ETH enviado durante el despliegue hará que la transacción se revierta.

### Modificadores de función

Solidity ofrece un tipo especial de función llamado *modificador de función*. Los modificadores se aplican a las funciones agregando su nombre en la declaración de la función. Se usan con mayor frecuencia para crear condiciones que se aplican a muchas funciones dentro de un contrato. Ya tenemos una instrucción de control de acceso en nuestra función `destroy`. Creemos un modificador de función que exprese esa condición:

```solidity
modifier onlyOwner {
 require(msg.sender == owner);
 _;
}
```

Este modificador de función, llamado `onlyOwner`, establece una condición para cualquier función que modifique: requiere que la dirección almacenada como `owner` del contrato sea la misma que la dirección de `msg.sender` de la transacción. Este es el patrón de diseño básico para el control de acceso, que permite que solo el propietario de un contrato ejecute cualquier función que tenga el modificador `onlyOwner`.

Quizás se haya notado que nuestro modificador de función tiene un peculiar "marcador de posición" sintáctico: un guion bajo seguido de un punto y coma (`_;`). Este marcador se reemplaza por el código de la función que se modifica. En esencia, el modificador "envuelve" la función modificada y coloca su código en la ubicación identificada por el carácter de guion bajo.

Para aplicar un modificador, se agrega su nombre a la declaración de la función. Se puede aplicar más de un modificador a una función; se aplican en el orden en que se declaran, como una lista separada por espacios.

Definamos una función `changeOwner` para usar el modificador `onlyOwner`:

```solidity
function changeOwner(address newOwner) public onlyOwner {
 require(newOwner != address(0), "New owner address not set");
 owner = newOwner;
}
```

El nombre del modificador de función (`onlyOwner`) está después de la palabra reservada `public` e indica que la función `changeOwner` está modificada por el modificador `onlyOwner`. En esencia, esto puede leerse como "solo el propietario puede establecer una nueva dirección de propietario". En la práctica, el código resultante equivale a "envolver" `changeOwner` con el código de `onlyOwner`.

Los modificadores de función son una herramienta sumamente útil porque nos permiten escribir precondiciones para las funciones y aplicarlas de manera consistente, lo que facilita leer el código y, por lo tanto, auditar su seguridad. Se usan con mayor frecuencia para el control de acceso, pero son bastante versátiles y pueden usarse para otros propósitos.

### Herencia de contratos

El objeto `contract` de Solidity admite *herencia*, un mecanismo para ampliar un contrato base con funcionalidad adicional. Para usar la herencia, se especifica un contrato padre con la palabra reservada `is`:

```solidity
contract Child is Parent {
 ...
}
```

Con esta construcción, el contrato `Child` hereda todos los métodos, funcionalidades y variables de `Parent`. Solidity también admite herencia múltiple, que puede especificarse mediante nombres de contratos separados por comas después de la palabra reservada `is`:

```solidity
contract Child is Parent1, Parent2 {
 ...
}
```

Podemos llamar a funciones superiores en la cadena de herencia especificando explícitamente el contrato, como `Parent1.functionName()`, o usando `super.functionName()` si queremos llamar a la función que está justo un nivel más arriba en la jerarquía de herencia aplanada.

La herencia de contratos nos permite escribir nuestros contratos de manera que logremos modularidad, extensibilidad y reutilización. Comenzamos con contratos simples que implementan las capacidades más genéricas y luego los ampliamos heredando esas capacidades en contratos más especializados.

En nuestro contrato `Faucet`, introdujimos el control de acceso para un propietario, asignado durante la construcción. Esta capacidad es bastante genérica: muchos contratos la tendrán. Podemos definirla como un contrato genérico y luego usar la herencia para extenderla al contrato `Faucet`. Para enriquecer el ejemplo, agreguemos la funcionalidad de pausa junto con la de control de acceso.

Comenzamos definiendo un contrato base `Owned`, que tiene una variable `owner` y la establece en el constructor del contrato:

```solidity
contract Owned {
    address owner;
    // Constructor del contrato: establecer el propietario
    constructor() {
        owner = msg.sender;
    }
    // Modificador de control de acceso
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}
```

A continuación, definimos un contrato base `Pausable`, que hereda de `Owned`:

```solidity
contract Pausable is Owned {
    bool paused;
    // Modificador de comprobación del estado
    modifier whenNotPaused {
        require(paused == false);
        _;
    }
    // Funciones para pausar/reanudar las operaciones del usuario
    function pause() public onlyOwner {
        paused = true;
    }
    function unpause() public onlyOwner {
        paused = false;
    }
}
```

Como puede verse, el contrato `Pausable` puede usar el modificador de función `onlyOwner`, definido en `Owned`. Indirectamente, también usa la variable de dirección `owner` y el constructor definidos en `Owned`. La herencia hace que cada contrato sea más simple y se centre en su funcionalidad específica, lo que nos permite gestionar los detalles de manera modular.

Ahora podemos ampliar aún más el contrato `Owned`, heredando sus capacidades en `Faucet`:

```solidity
contract Faucet is Pausable {
    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint _withdrawAmount, address payable _to) public whenNotPaused {
        // Limitar el monto del retiro
        require(_withdrawAmount <= 0.1 ether);
        // Enviar el monto a la dirección que lo solicitó
        _to.transfer(_withdrawAmount);
    }
    // Aceptar cualquier monto entrante
    receive() external payable {}
}
```

Al heredar de `Pausable`, que a su vez hereda de `Owned`, el contrato `Faucet` ahora puede usar el modificador `whenNotPaused`, cuyo resultado puede controlar el propietario definido mediante el constructor del contrato `Owned`. La funcionalidad es la misma que si esas funciones estuvieran dentro de `Faucet`, pero gracias a esta arquitectura modular podemos reutilizar funciones y modificadores en otros contratos sin volver a escribirlos. La reutilización del código y la modularidad hacen que nuestro código sea más limpio y fácil de leer y auditar.

A veces podríamos necesitar cambiar alguna funcionalidad de un contrato heredado. Afortunadamente, Solidity cuenta con la característica adecuada: la sobrescritura de funciones. Una función declarada como `virtual` puede ser sobrescrita por un contrato más arriba en la cadena de herencia, lo que mantiene una gran flexibilidad en este enfoque.

Veamos un ejemplo. Supongamos que queremos que la funcionalidad de pausa sea irreversible: una vez pausado, el contrato ya no puede reanudarse. Para hacerlo, debemos marcar la función `unpause` del contrato `Pausable` como `virtual` y volver a declarar la función `unpause` en el contrato `Faucet` con el atributo `override`, definiendo el nuevo comportamiento deseado, que es revertir:

```solidity
contract Pausable is Owned {
    bool paused;
    // Modificador de comprobación del estado
    modifier whenNotPaused {
        require(paused == false);
        _;
    }
    // Funciones para pausar/reanudar las operaciones del usuario
    function pause() public virtual onlyOwner {
        paused = true;
    }
    function unpause() public virtual onlyOwner {
        paused = false;
    }
}
contract Faucet is Pausable {
    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint _withdrawAmount, address payable _to) public whenNotPaused {
        // Limitar el monto del retiro
        require(_withdrawAmount <= 0.1 ether);
        // Enviar el monto a la dirección que lo solicitó
        _to.transfer(_withdrawAmount);
    }
    function unpause() public view override onlyOwner {
        revert("Disabled feature”);
    }
    // Aceptar cualquier monto entrante
    receive() external payable {}
}
```

Como puede verse, la función `unpause()` de `Faucet` debe declararse con la palabra reservada `override`. En el contrato `Pausable`, marcamos tanto `pause` como `unpause` como virtuales por coherencia, aunque en nuestro caso solo necesitábamos cambiar `unpause`.

> **Nota**
>
> Cuando sobrescribimos una función en Solidity, solo podemos hacer más accesible su visibilidad; en concreto, podemos cambiarla de externa a pública, pero no al revés. En cuanto a la mutabilidad, podemos restringirla, por ejemplo, pasando de no pagable a vista o pura (como hicimos con `unpause`) y de vista a pura. Pero hay una gran excepción: si una función está marcada como pagable, debe seguir siéndolo; no podemos cambiarla a ninguna otra cosa.

### Herencia múltiple

Cuando usamos herencia múltiple en Solidity, el lenguaje se basa en el algoritmo de linealización C3 para determinar el orden en que se heredan los contratos. Este algoritmo asegura que el orden de herencia sea estricto y predecible, lo que ayuda a evitar problemas como la herencia cíclica. En su forma más simple, podemos decir que determina el orden en que se revisan los contratos base al buscar una función, y este orden va de derecha a izquierda. Eso significa que el contrato de la derecha se considera el "más derivado". Por ejemplo, en la declaración `contract C is A, B { }`, el contrato B es más derivado que el contrato A.

Además de usar la linealización C3, Solidity cuenta con medidas de protección adicionales. Una regla clave es que, si varios contratos tienen la misma función, debemos indicar explícitamente qué contratos se sobrescriben. Veamos un ejemplo:

```solidity
contract A {
    function foo() public virtual returns(string memory){
        return "A";
    }
}
contract B {
    function foo() public virtual returns(string memory){
        return "B";
    }
}
contract C is A, B {
}
```

A primera vista, parece que esto debería funcionar bien porque la linealización C3 debería encargarse de todo. Pero en realidad no compilará. Solidity emitirá un error que dice: "TypeError: Derived contract must override function `foo`. Two or more base classes define a function with the same name and parameter types." Para resolver el problema, debemos sobrescribir explícitamente la función `foo()` de A y B de esta manera:

```solidity
contract C is A, B {
    function foo() public override(A, B) returns(string memory){
        return "C";
    }
}
```

Por lo tanto, aunque Solidity usa la linealización C3, en general no necesitamos preocuparnos demasiado por ella al programar, porque Solidity nos obliga a gestionar explícitamente las sobrescrituras de funciones.

Sin embargo, un caso en el que la linealización C3 importa es cuando Solidity decide el orden de ejecución de los constructores. Los constructores siguen el orden linealizado C3, pero con una particularidad: se ejecutan al revés. Esto tiene sentido si lo pensamos: el constructor del contrato más derivado debe ejecutarse al final porque podría sobrescribir lo que establecieron los constructores anteriores. Veamos un ejemplo:

```solidity
contract Base{
    uint x;
}
contract Derived1 is Base{
    constructor(){
        x = 1;
    }
}
contract Derived2 is Base{
    constructor(){
        x = 2;
    }
}
contract Derived3 is Derived1, Derived2 {
    uint public y;
    constructor() Derived1() Derived2() {
        y = x;
    }
}
```

En este caso, el valor de `y` terminará siendo 2, como se espera, porque el constructor de `Derived2` se ejecuta al final y establece `x` en 2.

Es importante tener presente que el orden en que se proporcionan los argumentos de los constructores no afecta el orden de ejecución. Por ejemplo, podemos invertir las llamadas a los constructores así:

```solidity
contract Derived3 is Derived1, Derived2 {
    uint public y;
    constructor() Derived2() Derived1() { // aquí invertimos el orden
        y = x;
    }
}
```

Aunque cambiamos el orden en el constructor, el resultado seguirá siendo el mismo. El valor de `y` será 2 porque el orden de ejecución de los constructores lo determina la linealización C3, no el orden en que los llamamos.

Una última advertencia: el uso de la linealización C3 para la herencia múltiple en Solidity puede hacer que la palabra reservada `super` se comporte de formas inesperadas. A veces, llamar a `super` podría activar una función de una clase hermana en lugar de la del padre directo. Esto puede producir resultados sorprendentes en los que se llama a un método de una clase que ni siquiera se enumeró en la cadena de herencia. Es un caso algo excepcional, así que no profundizaremos demasiado, pero sin duda hay que tenerlo presente al usar la palabra reservada `super` en contratos con estructuras de herencia complejas.

### Manejo de errores

Una llamada a un contrato puede terminar y devolver un error. El manejo de errores en Solidity se realiza mediante tres funciones: `assert`, `require` y `revert`.

Cuando un contrato termina con un error, se revierten todos los cambios de estado (cambios en variables, saldos, etc.), a lo largo de toda la cadena de llamadas a contratos si se llamó a más de uno. Esto asegura que las transacciones sean *atómicas*, lo que significa que se completan correctamente o no tienen ningún efecto sobre el estado y se revierten por completo.

Las funciones `assert` y `require` operan de la misma manera: evalúan una condición y detienen la ejecución con un error si la condición es falsa. Por convención, `assert` se usa cuando se espera que el resultado sea verdadero, lo que significa que usamos `assert` para comprobar condiciones internas. En comparación, `require` se usa para comprobar entradas (como argumentos de función o campos de transacción), estableciendo nuestras expectativas para esas condiciones. Un assert fallido revierte con Panic(0x01) y conserva el gas no utilizado. Se debe usar assert para comprobar invariantes internas y require para validar entradas y precondiciones.

Usamos `require` en nuestro modificador de función `onlyOwner` para comprobar que el remitente del mensaje sea el propietario del contrato:

```solidity
require(msg.sender == owner);
```

La función `require` actúa como una *condición de acceso*: impide ejecutar el resto de la función y produce un error si no se cumple. También puede incluir un mensaje de texto útil para mostrar la causa del error. El mensaje de error se registra en el registro de la transacción y se recomienda adoptarlo para mejorar la experiencia del usuario, al informarle cuál es el error y cómo resolverlo. Por lo tanto, podemos mejorar nuestro código agregando un mensaje de error en nuestra función `require`:

```solidity
require(msg.sender == owner, "Only the contract owner can call this function");
```

La función `revert` detiene la ejecución del contrato y revierte cualquier cambio de estado. Puede usarse de dos maneras: como una instrucción con un error personalizado pasado directamente sin paréntesis, o como una función con paréntesis que recibe un argumento de cadena. El error personalizado sería mucho más económico en términos de costo de gas, mientras que tanto la cadena de error como el error personalizado se registran en el registro de la transacción:

```solidity
revert();
revert("Error string");
revert CustomError(arg1, arg2);
```

Ciertas condiciones de un contrato generarán errores sin importar si las comprobamos explícitamente. Por ejemplo, en nuestro contrato `Faucet`, no comprobamos si hay suficiente ether para satisfacer una solicitud de retiro. Esto se debe a que la función `transfer` fallará con un error y revertirá la transacción si el saldo es insuficiente para realizar la transferencia:

```solidity
payable(msg.sender).transfer(withdrawAmount);
```

Sin embargo, podría ser mejor comprobarlo explícitamente y proporcionar un mensaje de error claro si falla. Podemos hacerlo agregando una instrucción `require` antes de la transferencia:

```solidity
require(this.balance >= withdrawAmount,
 "Insufficient balance in faucet for withdrawal request");
payable(msg.sender).transfer(withdrawAmount);
```

El código adicional de comprobación de errores como este aumentará ligeramente el consumo de gas, pero ofrece mejores informes de errores que si se omite. Aunque minimizar el consumo de gas solía ser una actividad obligatoria debido a los altos costos en la red principal de Ethereum, la introducción de EIP-4844 ha reducido considerablemente ese costo, por lo que el consumo de gas es un problema menos apremiante hoy en día. Sin embargo, sigue siendo importante lograr el equilibrio adecuado entre la eficiencia del gas y una comprobación exhaustiva de errores.

Solidity nos brinda aún más control sobre el manejo de errores mediante la funcionalidad try/catch. Es una característica muy práctica que permite manejar los errores de manera más adecuada cuando llamamos a contratos externos. En lugar de que toda la transacción falle y se revierta cuando algo sale mal, podemos capturar el error y decidir qué hacer a continuación. Al usar try/catch, envolvemos la llamada externa en un bloque `try`. Si la llamada tiene éxito, el código dentro del bloque `try` se ejecuta normalmente. Pero si algo sale mal, como que el contrato llamado se quede sin gas, encuentre una instrucción `require` o lance una excepción, el código salta al bloque `catch`, donde podemos manejar el error.

Este es un ejemplo simple:

```solidity
function sampleExternalCall(address target, uint amount) public {
    try ITargetContract(target).someFunction(amount) {
        // Esto se ejecuta si la llamada tiene éxito
        emit Success("Call succeeded!");
    } catch {
        // Esto se ejecuta si la llamada falla
        emit Error("Call failed!");
    }
}
```

Podemos capturar errores de distintas maneras según su tipo. El bloque `catch` básico captura todos los errores, pero también podemos capturar errores específicos. Por ejemplo, podemos capturar errores que devuelven una cadena de error usando `catch Error(string memory reason)`, o manejar errores de bajo nivel que no devuelven datos con `catch (bytes memory lowLevelData)`. Además, podemos capturar errores de pánico más graves, como desbordamientos o divisiones por cero, usando `catch Panic(uint errorCode)`.

Try/catch solo funciona con llamadas externas. No ayuda con las llamadas a funciones internas dentro del mismo contrato. Si una función del mismo contrato falla, se revertirá como de costumbre y no podremos capturar ese error con try/catch.

### Eventos

Cuando una transacción termina (con éxito o no), produce un recibo de transacción. El recibo contiene entradas de registro que brindan información sobre las acciones ocurridas durante la ejecución de la transacción. Los *eventos* son los objetos de alto nivel de Solidity que se usan para construir estos registros.

Los eventos son especialmente útiles para clientes ligeros y servicios de DApps, que pueden "vigilar" eventos específicos e informarlos a la interfaz de usuario o cambiar el estado de la aplicación para reflejar un evento de un contrato subyacente.

Los objetos de evento reciben argumentos que se serializan y registran en los registros de transacción de la blockchain. Se puede proporcionar la palabra reservada `indexed` antes de un argumento para que el valor forme parte de una tabla indexada (tabla hash) en la que una aplicación pueda buscar o filtrar.

#### Incorporación de eventos

Hasta ahora no agregamos ningún evento a nuestro ejemplo `Faucet`, así que hagámoslo. Agregaremos dos eventos: uno para registrar los retiros y otro para registrar los depósitos. Llamaremos a estos eventos `Withdrawal` y `Deposit`, respectivamente. Primero, definimos los eventos en el contrato `Faucet`:

```solidity
contract Faucet is Pausable {
 event Withdrawal(address indexed to, uint amount);
 event Deposit(address indexed from, uint amount);
 [...]
}
```

Elegimos que las direcciones sean `indexed` para permitir búsquedas y filtros en cualquier interfaz de usuario construida para acceder a nuestro `Faucet`.

A continuación, usamos la palabra reservada `emit` para incorporar los datos del evento en los registros de transacción:

```solidity
// Entregar ether a cualquiera que lo solicite
function withdraw(uint withdrawAmount) public {
 [...]
 payable(msg.sender).transfer(withdrawAmount);
 emit Withdrawal(msg.sender, withdrawAmount);
}
// Aceptar cualquier monto entrante
receive() external payable {
 emit Deposit(msg.sender, msg.value);
}
```

El contrato *Faucet.sol* resultante se muestra en el ejemplo 7-3.

**Ejemplo 7-3. Faucet.sol: contrato Faucet revisado, con eventos**

```solidity
// Versión del compilador de Solidity para la que se escribió este programa
pragma solidity 0.8.26;
// SPDX-License-Identifier: GPL-3.0
contract Owned {
    address owner;
    // Constructor del contrato: establecer el propietario
    constructor() {
        owner = msg.sender;
    }
    // Modificador de control de acceso
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}
contract Pausable is Owned {
    event Paused();
    event Unpaused();
    bool paused;
    // Modificador de comprobación del estado
    modifier whenNotPaused {
        require(paused == false);
        _;
    }
    // Funciones para pausar/reanudar las operaciones del usuario
    function pause() public onlyOwner {
        paused = true;
        emit Paused();
    }
    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused();
    }
}
contract Faucet is Pausable {
    event Withdrawal(address indexed to, uint amount);
    event Deposit(address indexed from, uint amount);
    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint withdrawAmount) public whenNotPaused {
        // Limitar el monto del retiro
        require(withdrawAmount <= 0.1 ether);
        // Enviar el monto a la dirección que lo solicitó
        payable(msg.sender).transfer(withdrawAmount);
        emit Withdrawal(msg.sender, withdrawAmount);
    }
    // Aceptar cualquier monto entrante
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}
```

#### Captura de eventos

Veamos cómo podemos capturar eventos en la cadena con algo de código. En concreto, escribiremos un script para monitorear transferencias de tokens USDT en la red principal de Ethereum. Para hacerlo, necesitamos una biblioteca Web3 y, aunque web3.js fue la primera en popularizarse, ethers.js la ha superado en los últimos años. Como desarrolladores, preferimos ethers.js, así que la usaremos aquí.

Primero, preparemos nuestro proyecto. Se comienza creando una carpeta de proyecto nueva y luego se instala la biblioteca ethers ejecutando:

```bash
npm i ethers
```

A continuación, necesitamos la ABI del contrato USDT. Se puede obtener de [Etherscan](https://oreil.ly/LoWH4), justo debajo del código fuente del contrato (véase la figura 7-1), y guardarla en la carpeta del proyecto.

![Sección de la ABI de USDT en Etherscan](images/ch7/maet_0701.png)

**Figura 7-1.** Sección de la ABI de USDT en Etherscan

Ahora, hablemos de cómo nos conectaremos a la red Ethereum. Necesitamos un proveedor WebSocket porque vamos a escuchar eventos, lo que requiere una conexión continua. Se puede elegir entre proveedores de pago (más confiables y rápidos) o proveedores públicos gratuitos que se encuentran en sitios como [ChainList](https://chainlist.org). Para nuestro ejemplo, uno público será suficiente, aunque podría limitar la frecuencia de las solicitudes.

> **Nota**
>
> Para escuchar eventos, necesitamos un WebSocket, no un endpoint RPC. Los endpoints RPC son excelentes para solicitudes individuales, como llamar a una función u obtener datos, pero para capturar eventos, una conexión WebSocket permite mantener abierta una línea de comunicación entre nuestro cliente y el servidor.

Ahora veamos el código:

```javascript
const ethers = require("ethers");
const ABI = require("./USDTabi.json"); // la ABI que obtuvimos de etherscan
const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // Contrato USDT
const wssProviderURL = "wss://ethereum-rpc.publicnode.com"; // un proveedor websocket público
const wssProvider = new ethers.providers.WebSocketProvider(wssProviderURL);
const usdtContract = new ethers.Contract(usdtAddress, ABI, wssProvider);
async function getTransfer(){
    usdtContract.on("Transfer", (from, to, value, event)=>{
        let transferEvent ={
            from: from,
            to: to,
            value: value,
            eventData: event,
        }
        console.log(JSON.stringify(transferEvent, null, 2))
    })
}
getTransfer()
```

Después de declarar la dirección de USDT y la URL del proveedor WebSocket, el script comienza creando una nueva instancia de WebSocketProvider mediante la biblioteca ethers. Este proveedor nos conecta a la red Ethereum mediante la URL WebSocket que especificamos. Luego usamos la clase `ethers.Contract` para crear una instancia del contrato inteligente USDT. Le pasamos la dirección de USDT, la ABI y nuestro proveedor WebSocket.

Ahora llegamos al núcleo del script. Configuramos un detector de eventos en la instancia del contrato para capturar los eventos `Transfer` emitidos por el contrato USDT. Cada vez que ocurre un evento `Transfer`, este detector activa una función de devolución de llamada que recibe cuatro parámetros relacionados con la transferencia. Dentro de esa función, tomamos los detalles de la transferencia, los agrupamos en un objeto y luego formateamos ese objeto como una cadena JSON. Por último, imprimimos esa cadena JSON en la consola mediante `console.log` para ver exactamente qué ocurre con cada transferencia en tiempo real.

Esta es una salida de ejemplo de nuestro script:

```json
{
  "from": "0xc169e35abb35f8e712eCF9F6d9465C96962CA383",
  "to": "0x7E73F680243A93a9D98C5Ce4b349451805fc37ca",
  "value": {
    "type": "BigNumber",
    "hex": "0x55b27b90"
  },
  "eventData": {
    "blockNumber": 20687220,
    "blockHash": "0xa5c3c518d7246e516e076ef8d43c387dcb54d06702e9e059c583ce28a7a271b8",
    "transactionIndex": 166,
    "removed": false,
    "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "data": "0x0000000000000000000000000000000000000000000000000000000055b27b90",
    "topics": [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x000000000000000000000000c169e35abb35f8e712ecf9f6d9465c96962ca383",
      "0x0000000000000000000000007e73f680243a93a9d98c5ce4b349451805fc37ca"
    ],
    "transactionHash":
      "0xb527a5a18f10ed9b65dda7a914715a0b0bbfd6db053d8f6b35805ad49a588cfd",
    "logIndex": 300,
    "event": "Transfer",
    "eventSignature": "Transfer(address,address,uint256)",
    "args": [
      "0xc169e35abb35f8e712eCF9F6d9465C96962CA383",
      "0x7E73F680243A93a9D98C5Ce4b349451805fc37ca",
      {
        "type": "BigNumber",
        "hex": "0x55b27b90"
      }
    ]
  }
}
```

Eventos como estos son sumamente útiles, no solo para la comunicación fuera de la cadena, sino también para la depuración. Durante el desarrollo, se pueden encontrar estos eventos en el recibo de transacción, en la entrada "logs", lo que puede ser de gran ayuda cuando algo no funciona como se espera.

### Llamadas a otros contratos

Llamar a otros contratos desde el propio contrato es una operación muy útil, pero potencialmente peligrosa. Examinaremos las distintas maneras de hacerlo y evaluaremos los riesgos de cada método. En resumen, los riesgos surgen del hecho de que podríamos no saber mucho sobre un contrato al que llamamos o que llama al nuestro. Al escribir contratos inteligentes, hay que tener presente que, aunque esperemos tratar principalmente con EOA, nada impide que contratos arbitrariamente complejos y posiblemente maliciosos llamen a nuestro código o sean llamados por él.

#### Creación de una nueva instancia

La forma más segura de llamar a otro contrato es crearlo uno mismo. De esa manera, se conocen con certeza sus interfaces y comportamiento. Para hacerlo, basta con instanciarlo mediante la palabra reservada `new`, como en otros lenguajes orientados a objetos. En Solidity, la palabra reservada `new` crea el contrato en la blockchain y devuelve un objeto que se puede usar para hacer referencia a él. Supongamos que queremos crear y llamar a un contrato `Faucet` desde otro contrato llamado `Token`:

```solidity
contract Token is Pausable {
    Faucet _faucet;
    constructor() {
        _faucet = new Faucet();
    }
}
```

Este mecanismo de construcción de contratos asegura que se conozcan el tipo exacto del contrato y su interfaz. El contrato `Faucet` debe estar definido dentro del alcance de `Token`, lo que puede lograrse con una instrucción `import` si la definición se encuentra en otro archivo:

```solidity
import "Faucet.sol";
contract Token is Pausable {
    Faucet _faucet;
    constructor() {
        _faucet = new Faucet();
    }
}
```

Opcionalmente, se puede especificar el valor de la transferencia de ether durante la creación y pasar argumentos al constructor del nuevo contrato:

```solidity
import "Faucet.sol";
contract Token is Pausable {
    Faucet _faucet;
    constructor() {
        _faucet = new Faucet{value: 0.5 ether}();
    }
}
```

¡Cabe señalar que esto requeriría que el constructor de `Faucet` fuera pagable!

Luego también se puede llamar a las funciones de `Faucet`. En este ejemplo, llamamos a la función `changeOwner` de `Faucet` desde la función `changeOwner` de `Token`:

```solidity
import "Faucet.sol";
contract Token is Pausable {
    Faucet _faucet;
    constructor() {
         _faucet = new Faucet{value: 0.5 ether}();
    }
    function changeOwner(address newOwner) onlyOwner {
        _faucet.changeOwner(newOwner);
    }
}
```

Es importante entender que, aunque seamos propietarios del contrato `Token`, ¡el propietario del nuevo contrato `Faucet` es el propio contrato `Token`, no nosotros! Como vimos antes en este capítulo, durante una llamada externa, `msg.sender` cambia; en nuestro caso, en el contexto de ejecución de `Faucet`, será la dirección de `Token`.

#### Referencia a una instancia existente

Otra forma de llamar a un contrato es convertir la dirección de una instancia existente del contrato. Con este método, se aplica una interfaz conocida a una instancia existente. Por lo tanto, es de suma importancia saber con certeza que la instancia a la que se hace referencia es, en efecto, del tipo que se supone. Veamos un ejemplo:

```solidity
import "Faucet.sol";
contract Token is Pausable {
    Faucet _faucet;
    constructor(address _f) {
        _faucet = Faucet(_f);
        _faucet.withdraw(0.1 ether)
    }
}
```

Aquí tomamos una dirección proporcionada como argumento al constructor, `_f`, y la convertimos en un objeto `Faucet`. Esto es mucho más riesgoso que el mecanismo anterior porque no sabemos con certeza si esa dirección es realmente un objeto `Faucet`. Cuando llamamos a `withdraw`, suponemos que acepta los mismos argumentos y ejecuta el mismo código que nuestra declaración de `Faucet`, pero no podemos estar seguros. Por lo que sabemos, la función `withdraw` de esta dirección podría ejecutar algo completamente diferente de lo que esperamos, aunque tenga el mismo nombre. Por lo tanto, usar direcciones pasadas como entrada y convertirlas en objetos específicos es mucho más peligroso que crear el contrato uno mismo.

#### call, delegatecall y staticcall de bajo nivel

Solidity ofrece algunas funciones de nivel aún más bajo para llamar a otros contratos. Se corresponden directamente con códigos de operación de la EVM del mismo nombre y nos permiten construir manualmente una llamada entre contratos. Por ello, representan los mecanismos más flexibles *y* más peligrosos para llamar a otros contratos. Devuelven dos valores: `bool success`, que indica si la operación tuvo éxito, y `bytes memory data`, que contiene los datos de retorno.

Este es el mismo ejemplo usando un método `call`:

```solidity
contract Token is Pausable {
    constructor(address _faucet) {
        _faucet.call(abi.encodeWithSignature("withdraw(uint256)", 0.1 ether));
    }
}
```

Como puede verse, este tipo de `call` es una llamada *a ciegas* a una función, muy similar a construir una transacción sin procesar, pero desde el contexto de un contrato. La función `call` devolverá `false` si hay un problema, de modo que se puede evaluar el valor de retorno para manejar errores:

```solidity
contract Token2 is Pausable {
    constructor(address _faucet) {
        (bool res, ) = _faucet.call(
            abi.encodeWithSignature("withdraw(uint256)", 0.1 ether)
        );
        if (!res) {
            revert("Withdrawal from faucet failed");
        }
    }
}
```

Las variantes de `call` son `staticcall` y `delegatecall`. Como se mencionó en la sección "Objeto de dirección", `staticcall` invoca una función de otro contrato de una forma que garantiza que no haya cambios de estado. Esto significa que la función llamada no puede modificar ninguna variable de estado, interactuar con el estado de la blockchain ni enviar ether.

Una `delegatecall` difiere de una `call` en que el contexto de `msg` no cambia. Por ejemplo, mientras que una `call` cambia el valor de `msg.sender` al contrato que realiza la llamada, una `delegatecall` conserva el mismo `msg.sender` que en el contrato llamador. En esencia, `delegatecall` ejecuta el código de otro contrato dentro del contexto de ejecución del contrato actual. Se usa con mayor frecuencia para invocar código de una biblioteca. También permite aprovechar el patrón de usar funciones de biblioteca almacenadas en otro lugar, pero haciendo que ese código trabaje con los datos del almacenamiento persistente del propio contrato; un ejemplo claro es el patrón proxy. `delegatecall` debe usarse con mucha cautela. Puede tener efectos inesperados, especialmente si el contrato al que se llama no fue diseñado como biblioteca.

Usemos un contrato de ejemplo para demostrar las distintas semánticas de llamada que usan `call` y `delegatecall` para llamar a bibliotecas y contratos. En el ejemplo 7-4, usamos un evento para registrar los detalles de cada llamada y ver cómo cambia el contexto del llamador según el tipo de llamada.

**Ejemplo 7-4. CallExamples.sol: un ejemplo de distintas semánticas de llamada**

```solidity
pragma solidity 0.8.26;
contract CalledContract {
    event callEvent(address sender, address origin, address from);
    function calledFunction() public {
        emit callEvent(msg.sender, tx.origin, address(this));
    }
}
library CalledLibrary {
    event callEvent(address sender, address origin, address from);
    function calledFunction() public {
        emit callEvent(msg.sender, tx.origin, address(this));
    }
}
contract Caller {
    function makeCalls(CalledContract _calledContract) public {
        // Llamar directamente a CalledContract y CalledLibrary
        _calledContract.calledFunction();
        CalledLibrary.calledFunction();
        // Llamadas de bajo nivel usando el objeto de dirección de CalledContract
        (bool res, ) = address(_calledContract).
            call(abi.encodeWithSignature("calledFunction()"));
        require(res);
        (res, ) = address(_calledContract).
            delegatecall(abi.encodeWithSignature("calledFunction()"));
        require(res);
    }
}
```

Como puede verse en este ejemplo, nuestro contrato principal es `Caller`, que llama a una biblioteca `CalledLibrary` y a un contrato `CalledContract`. Tanto la biblioteca llamada como el contrato tienen funciones `calledFunction` idénticas, que emiten un evento `calledEvent`. El evento `calledEvent` registra tres datos: `msg.sender`, `tx.origin` y `this`. Cada vez que se llama a `calledFunction`, puede tener un contexto de ejecución diferente (con valores diferentes para potencialmente todas las variables de contexto), según se llame directamente o mediante `delegatecall`.

En `Caller`, primero llamamos directamente al contrato y a la biblioteca invocando `calledFunction` en cada uno. Luego usamos explícitamente las funciones de bajo nivel `call` y `delegatecall` para llamar a `CalledContract.calledFunction`. De esta manera, podemos ver cómo se comportan los distintos mecanismos de llamada.

Despleguemos los contratos, ejecutemos la función `makeCalls` y capturemos los eventos. Para mayor claridad, reemplazaremos las direcciones por sus etiquetas (por ejemplo, `CALLER_CONTRACT_ADDRESS`).

Llamamos a la función `makeCalls` y pasamos la dirección de `CalledContract`; luego capturamos los cuatro eventos emitidos por cada una de las distintas llamadas. Veamos la función `makeCalls` y recorramos cada paso.

La primera llamada es:

```solidity
_calledContract.calledFunction();
```

Aquí llamamos directamente a `CalledContract.calledFunction` mediante la ABI de alto nivel de `calledFunction`. Los argumentos del evento emitido son:

```json
{
    sender: 'CALLER_CONTRACT_ADDRESS',
    origin: 'EOA_ADDRESS',
    from: 'CALLED_CONTRACT_ADDRESS'
}
```

Como puede verse, `msg.sender` es la dirección del contrato `Caller`. `tx.origin` es la dirección de nuestra cuenta, `web3.eth.accounts[0]`, que envió la transacción a `Caller`. El evento fue emitido por `CalledContract`, como podemos ver en el último argumento del evento.

La siguiente llamada de `makeCalls` es a la biblioteca:

```solidity
CalledLibrary.calledFunction();
```

Parece idéntica a la forma en que llamamos al contrato, pero se comporta de manera muy diferente. Veamos el segundo evento emitido:

```json
{
    sender: 'EOA_ADDRESS',
    origin: 'EOA_ADDRESS',
    from: 'CALLER_CONTRACT_ADDRESS'
}
```

Esta vez, `msg.sender` no es la dirección de `Caller`. En cambio, es la dirección de nuestra cuenta y coincide con el origen de la transacción. Esto se debe a que, cuando se llama a una biblioteca, la llamada siempre es `delegatecall` y se ejecuta dentro del contexto del llamador. Por lo tanto, cuando el código de `CalledLibrary` se ejecutaba, heredaba el contexto de ejecución de `Caller`, como si su código se ejecutara dentro de `Caller`. La variable `this` (que aparece como `from` en el evento emitido) es la dirección de `Caller`, aunque se acceda a ella desde dentro de `CalledLibrary`.

Las siguientes dos llamadas, que usan las funciones de bajo nivel `call` y `delegatecall`, verifican nuestras expectativas y emiten eventos que reflejan lo que acabamos de ver.

## Consideraciones sobre el gas

El gas, descrito con más detalle en el capítulo 14, es una consideración sumamente importante en la programación de contratos inteligentes. El gas es un recurso que restringe la cantidad máxima de cómputo que Ethereum permite consumir a una transacción. Si se supera el límite de gas durante el cómputo, ocurre la siguiente secuencia de eventos:

- Se lanza una excepción "sin gas".
- Se restaura el estado del contrato anterior a la ejecución (se revierte).
- Todo el ether utilizado para pagar el gas se toma como comisión de transacción; *no* se reembolsa.

### Buenas prácticas

Como el gas lo paga el usuario que inicia la transacción, se desalienta a los usuarios a llamar a funciones con un costo de gas alto. Por lo tanto, al programador le conviene minimizar el costo de gas de las funciones de un contrato. Con este fin, se recomiendan ciertas prácticas al construir contratos inteligentes para minimizar el costo de gas de una llamada a función:

**Evitar arreglos de tamaño dinámico**

Cualquier bucle que recorra un arreglo de tamaño dinámico, en el que una función realice operaciones sobre cada elemento o busque un elemento particular, introduce el riesgo de usar demasiado gas. De hecho, el contrato puede quedarse sin gas antes de encontrar el resultado deseado o antes de actuar sobre todos los elementos, desperdiciando así tiempo y ether sin producir ningún resultado.

**Evitar llamadas a otros contratos**

Llamar a otros contratos, especialmente cuando no se conoce el costo de gas de sus funciones, introduce el riesgo de quedarse sin gas. Se debe evitar usar bibliotecas que no estén bien probadas y ampliamente utilizadas. Cuanto menos escrutinio haya recibido una biblioteca de otros programadores, mayor será el riesgo de usarla.

**Evitar accesos redundantes al almacenamiento persistente**

Acceder a variables del almacenamiento persistente, ya sea para leer o escribir, cuesta mucho más gas que trabajar con variables de memoria. Por eso, siempre que podamos, es mejor evitar usar directamente el almacenamiento persistente. Por ejemplo, si necesitamos leer una variable del almacenamiento persistente varias veces durante ciertos cálculos, conviene copiar primero su valor a una variable de memoria. De esta manera, podemos acceder repetidamente a la variable de memoria, más económica, en lugar de acceder al almacenamiento persistente cada vez, y ahorrar en costos de gas.

> **Nota**
>
> Para poner esto en contexto, Solidity usa varios lugares para conservar datos: el almacenamiento persistente, que es permanente y costoso; la memoria, que es temporal y más económica durante la ejecución; calldata, que es un área de solo lectura usada principalmente para las entradas de funciones externas; y la pila, que se usa para valores de vida muy corta y es la más económica de acceder. La elección adecuada depende de cómo se usan los datos, de si necesitan persistir, de si son mutables y de si se pasan desde fuera. Profundizaremos en estas distinciones en el capítulo 14, pero es útil comenzar a pensar pronto en cómo afectan el rendimiento y el costo.

### Estimación del costo de gas

Cuando se lanzó Ethereum, estimar los costos de gas era un poco como intentar adivinar la oferta ganadora de una subasta. Era similar a cómo Bitcoin maneja las comisiones de transacción: establecíamos nuestro propio precio de gas y los mineros priorizaban las transacciones con las ofertas más altas. Esto significaba que, en momentos de mucha actividad, a menudo teníamos que ofrecer más para asegurarnos de que nuestras transacciones se procesaran rápidamente. Funcionaba, pero también significaba que los precios del gas podían variar enormemente, a veces hasta niveles altísimos cuando la red estaba congestionada.

Luego, en 2021, llegó EIP-1559 y cambió las reglas del juego. En lugar de tener que adivinar el precio de gas adecuado, Ethereum introdujo una comisión base que se ajusta automáticamente según la actividad de la red. Esto hace que las comisiones de gas sean mucho más predecibles. Además, todavía podemos agregar una propina (llamada *comisión de prioridad*) para acelerar el proceso si tenemos prisa. Ahora, estimar los costos de gas es más sencillo y es menos probable que paguemos de más solo para que nuestra transacción se procese.

Exploremos en detalle cómo podemos estimar el costo de gas de nuestra transacción. Primero, cada transacción tiene dos componentes principales para los costos de gas: la comisión base y la comisión de prioridad:

**Comisión base**

Es la cantidad mínima de gas que debemos pagar para que nuestra transacción se incluya en un bloque. La red determina automáticamente la comisión base, que se ajusta dinámicamente según el nivel de actividad. Si los bloques están llenos, la comisión base sube; si están infrautilizados, baja.

**Comisión de prioridad (propina)**

Es una comisión adicional que agregamos para incentivar a los mineros (o validadores en el contexto de PoS) a priorizar nuestra transacción. Es como una propina que damos para que nuestra transacción se procese más rápido. Podemos establecer esta comisión nosotros mismos, pero las aplicaciones de billetera sugerirán valores adecuados según la velocidad deseada de inclusión de la transacción.

El costo total de gas de nuestra transacción se calcula multiplicando el gas utilizado (que depende de la complejidad de la transacción) por el precio efectivo del gas. El precio efectivo del gas es la suma de la comisión base y la comisión de prioridad.

Por lo tanto, para estimar nuestro costo de gas, seguimos estos pasos:

1. Consultar la comisión base actual, que podemos encontrar mediante herramientas de seguimiento de gas como [Etherscan Gas Tracker](https://oreil.ly/ZIqcq) o bibliotecas Web3 (por ejemplo, [`maxFeePerGas()` de ethers](https://oreil.ly/YuBC0)).
2. Elegir una comisión de prioridad (o propina) según la rapidez con la que queremos que se procese nuestra transacción. Si tenemos prisa, podemos aumentar la propina. Las herramientas de seguimiento de gas pueden ayudarnos a determinar el monto adecuado según las condiciones actuales de la red y la rapidez que necesitamos.
3. Multiplicar el precio total del gas (comisión base + propina) por el uso estimado de gas. Si somos desarrolladores, podemos calcular este uso estimado mediante bibliotecas Web3 (por ejemplo, [`estimateGas()` de ethers](https://oreil.ly/sfqZP)). Pero si somos usuarios comunes, no hay de qué preocuparse: cualquier aplicación de billetera se encargará de esto automáticamente cuando enviemos una transacción.

Por ejemplo, si la comisión base es 20 gwei, establecemos una propina de 2 gwei y nuestra transacción usa 50,000 gas, nuestro costo de gas estimado sería:

(20 gwei + 2 gwei) × 50,000 = 1,100,000 gwei

Es decir, 1.1 millones de gwei, o 0.0011 ETH.

Se recomienda evaluar el costo de gas de las funciones como parte del flujo de trabajo de desarrollo para evitar sorpresas al desplegar contratos en la red principal.

## Conclusión

En este capítulo, comenzamos a trabajar en detalle con contratos inteligentes y exploramos el lenguaje de programación de contratos Solidity. Tomamos un contrato de ejemplo simple, *Faucet.sol*, y lo mejoramos gradualmente y lo hicimos más complejo, usándolo para explorar diversos aspectos del lenguaje Solidity. En el capítulo 8, trabajaremos con Vyper, otro lenguaje de programación orientado a contratos. Compararemos Vyper con Solidity, mostraremos algunas diferencias en el diseño de estos dos lenguajes y profundizaremos nuestra comprensión de la programación de contratos inteligentes.
