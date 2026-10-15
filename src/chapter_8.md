# Capítulo 8. Contratos inteligentes y Vyper

Vyper es un lenguaje de programación orientado a contratos consolidado para la EVM que busca facilitar las auditorías al permitir que los desarrolladores produzcan código comprensible con mayor facilidad. De hecho, uno de los principios de Vyper es hacer que sea prácticamente imposible que los desarrolladores escriban código engañoso.

En este capítulo, examinaremos problemas comunes de los contratos inteligentes, presentaremos el lenguaje de programación de contratos Vyper y lo compararemos con Solidity, mostrando sus diferencias.

## Vulnerabilidades y Vyper

Solo en 2023, se robaron casi $2 mil millones debido a vulnerabilidades de contratos inteligentes en el ecosistema de Ethereum. Las vulnerabilidades se introducen en los contratos inteligentes a través del código. Hay argumentos sólidos para sostener que estas y otras vulnerabilidades no se introducen de manera intencional, pero, independientemente de ello, el código no deseado de los contratos inteligentes evidentemente provoca pérdidas inesperadas de fondos para los usuarios de Ethereum, y esto no es lo ideal. Vyper está diseñado para facilitar la escritura de código seguro o, de manera equivalente, para dificultar que se escriba por accidente código engañoso o vulnerable.

## Comparación con Solidity

Una de las maneras en que Vyper intenta dificultar la escritura de código inseguro es omitir deliberadamente algunas funcionalidades de Solidity. Esta decisión de diseño refleja las raíces de Vyper en principios que priorizan la seguridad y su inspiración en la claridad y sencillez de Python. Quienes consideran desarrollar contratos inteligentes en Vyper deben comprender qué funcionalidades no tiene Vyper y por qué. En esta sección, exploraremos esas funcionalidades y explicaremos por qué se omitieron.

A pesar de reducir el conjunto de funcionalidades para disminuir la ambigüedad, Vyper ha evolucionado para satisfacer las necesidades prácticas de desarrolladores y auditores. Por ejemplo, la filosofía original de mantener los contratos en un solo archivo ayudaba a maximizar la facilidad de auditoría, pero terminó convirtiéndose en un cuello de botella a medida que los protocolos crecían en tamaño y complejidad. Para resolver esto, las versiones modernas de Vyper incorporaron un sofisticado sistema de módulos que permite a los desarrolladores dividir los contratos en varios archivos, manteniendo un control estricto sobre el acceso al estado y la reutilización de código. Este sistema de módulos sigue principios de composición en lugar de la herencia tradicional, lo que logra un mejor equilibrio entre estructura y legibilidad. Vyper ha adquirido un papel cada vez mayor en casos de uso con altas exigencias de garantías, como los protocolos de finanzas descentralizadas (DeFi) y los sistemas de staking, en los que los desarrolladores ponen un gran énfasis en la claridad y la facilidad de auditoría.

### Modificadores

Como vimos en el capítulo 7, en Solidity se puede escribir una función usando modificadores. Por ejemplo, la siguiente función, `changeOwner`, ejecutará el código de un modificador llamado `onlyBy` como parte de su ejecución:

```solidity
function changeOwner(address _newOwner)
 public
 onlyBy(owner)
{
 owner = _newOwner;
}
```

Este modificador hace cumplir una regla relacionada con la propiedad. Como se puede observar, este modificador en particular actúa como un mecanismo que realiza una comprobación previa en nombre de la función `changeOwner`:

```solidity
modifier onlyBy(address _account)
{
 require(msg.sender == _account);
 _;
}
```

Pero los modificadores no solo sirven para realizar comprobaciones, como se muestra aquí. De hecho, como modificadores, pueden cambiar considerablemente el entorno de un contrato inteligente en el contexto de la función que los utiliza. En pocas palabras, los modificadores tienen un *alcance generalizado*.

Veamos otro ejemplo al estilo de Solidity:

```solidity
enum Stages {
 SafeStage,
 DangerStage,
 FinalStage
}
uint public creationTime = block.timestamp;
Stages public stage = Stages.SafeStage;
function nextStage() internal {
 stage = Stages(uint256(stage) + 1);
}
modifier stageTimeConfirmation() {
 if (stage == Stages.SafeStage &&
 block.timestamp >= creationTime + 10 days)
 nextStage();
 _;
}
function a()
 public
 stageTimeConfirmation
 // Aquí va más código
{
}
```

Por un lado, los desarrolladores siempre deben revisar cualquier otro código al que llame su propio código. Sin embargo, es posible que en ciertas situaciones, como cuando hay restricciones de tiempo o el agotamiento provoca falta de concentración, un desarrollador pase por alto una sola línea de código. Esto es aún más probable si el desarrollador tiene que desplazarse de un lugar a otro dentro de un archivo grande mientras sigue mentalmente la jerarquía de llamadas a funciones y memoriza el estado de las variables del contrato inteligente.

Examinemos el ejemplo anterior con un poco más de detalle. Imaginemos que un desarrollador está escribiendo una función pública llamada `a`. El desarrollador no conoce este contrato y está utilizando un modificador escrito por otra persona. A primera vista, parece que el modificador `stageTimeConfirmation` solo realiza algunas comprobaciones sobre la antigüedad del contrato en relación con la función que lo utiliza. Lo que el desarrollador podría *no* advertir es que el modificador también llama a otra función, `nextStage`. En este escenario de demostración simplificado, el solo hecho de llamar a la función pública `a` hace que la variable `stage` del contrato inteligente pase de `SafeStage` a `DangerStage`.

Vyper ha eliminado por completo los modificadores. Las recomendaciones de Vyper son las siguientes: si solo se realizan aserciones con modificadores, basta con usar comprobaciones y aserciones directamente como parte de la función; si se modifica el estado del contrato inteligente u otros elementos, también se deben incluir estos cambios explícitamente como parte de la función. Esto facilita la auditoría y la lectura, ya que el lector no tiene que "envolver" mentalmente o de forma manual la función con el código del modificador para ver qué hace.

### Herencia de clases

La herencia permite a los programadores aprovechar el código ya escrito al adquirir funcionalidades, propiedades y comportamientos preexistentes de bibliotecas de software existentes. La herencia es potente y promueve la reutilización de código. Solidity admite tanto la herencia múltiple como el polimorfismo, pero, aunque estas son funcionalidades clave de la programación orientada a objetos, Vyper no las admite. Vyper sostiene que implementar la herencia exige que programadores y auditores salten entre varios archivos para comprender qué hace el programa. Vyper también considera que la herencia múltiple puede hacer que el código sea demasiado complicado de comprender, una postura admitida tácitamente por la [documentación de Solidity](https://oreil.ly/bkGwS), que ofrece un ejemplo de cómo la herencia múltiple puede ser problemática.

### Ensamblador en línea

El ensamblador en línea les da a los desarrolladores acceso de bajo nivel a la EVM, lo que permite a los programas de Solidity realizar operaciones accediendo directamente a las instrucciones de la EVM. Por ejemplo, el siguiente código ensamblador suma 3 a la ubicación de memoria `0x80`:

```
3 0x80 mload add 0x80 mstore
```

Esto impediría buscar el nombre de una variable para localizar todas las ocasiones en que se lee o modifica. Vyper considera que la pérdida de legibilidad es un precio demasiado alto por esa capacidad adicional y, por lo tanto, no admite ensamblador en línea.

### Sobrecarga de funciones

La sobrecarga de funciones permite a los desarrolladores escribir varias funciones con el mismo nombre. La función que se utiliza en una ocasión determinada depende de los tipos de los argumentos proporcionados. Tomemos como ejemplo las siguientes dos funciones:

```solidity
function f(uint256 _in) public pure returns (uint256 out) {
 out = 1;
}
function f(uint256 _in, bytes32 _key) public pure returns (uint256 out) {
 out = 2;
}
```

La primera función, llamada `f`, acepta un argumento de entrada de tipo `uint256`; la segunda función, también llamada `f`, acepta dos argumentos, uno de tipo `uint256` y otro de tipo `bytes32`. Tener varias definiciones de funciones con el mismo nombre que aceptan argumentos diferentes puede resultar confuso, por lo que Vyper no admite la sobrecarga de funciones.

### Conversión de tipos de variables

Vyper adopta un enfoque muy distinto al de Solidity para la conversión de tipos y prioriza el manejo explícito y seguro de los tipos por encima de la comodidad. El lenguaje exige que todas las conversiones de tipos se realicen explícitamente con la función integrada `convert()`, lo que garantiza que los desarrolladores siempre sepan cuándo y cómo se modifican los tipos de datos.

Podemos dividir las conversiones de tipos en dos categorías: las que podrían perder información y las que no. La función `convert()` de Vyper maneja ambos casos, pero siempre con una comprobación explícita de límites para evitar comportamientos inesperados. Por ejemplo, al convertir de un tipo de entero más grande a uno más pequeño, Vyper revertirá la transacción si el valor no cabe dentro de los límites del tipo de destino.

La sintaxis de la conversión de tipos en Vyper es sencilla:

```
# Conversión entre tipos de enteros
small_value: uint8 = 42
large_value: uint256 = convert(small_value, uint256)  # Conversión segura a un tipo más amplio
back_to_small: uint8 = convert(large_value, uint8)   # Conversión a un tipo más reducido con comprobación de límites
```

Este enfoque explícito implica que, aunque el código Vyper puede ser más extenso que el de Solidity al tratar con conversiones de tipos, también es mucho más seguro. No existe la posibilidad de truncar valores por accidente ni de tener comportamientos de desbordamiento inesperados, porque cada conversión debe ser intencional y explícita. La función `convert()` revertirá la transacción si la conversión ocasionaría una pérdida de datos o si el valor de entrada está fuera del rango válido para el tipo de destino.

## Decoradores

Los siguientes decoradores pueden utilizarse al principio de cada función:

**@internal**

El decorador `@internal` hace que la función sea inaccesible desde fuera del contrato. Esta es la visibilidad predeterminada de las funciones y, por lo tanto, es opcional.

**@external**

El decorador `@external` hace que la función sea visible y ejecutable públicamente. Por ejemplo, incluso la billetera de Ethereum mostrará estas funciones al visualizar el contrato.

**@view**

Las funciones con el decorador `@view` no pueden cambiar variables de estado. De hecho, el compilador rechazará el programa completo, con un error apropiado, si la función intenta cambiar una variable de estado.

**@pure**

Las funciones con el decorador `@pure` no pueden leer ningún estado de la blockchain ni llamar a métodos no puros ni a otros contratos.

**@payable**

Solo las funciones con el decorador `@payable` pueden transferir valor.

**@deploy**

El decorador `@deploy` se utiliza para marcar la función constructora de un contrato. Esta función se ejecuta exactamente una vez cuando el contrato se despliega en la blockchain, generalmente para establecer las variables de estado iniciales y la configuración. En Vyper, solo la función `__init__()` puede marcarse con `@deploy`, y este decorador es obligatorio si se desea incluir lógica de constructor en el contrato.

**@raw_return**

Las funciones con el decorador `@raw_return` devuelven bytes sin procesar, sin aplicar codificación ABI. Este decorador resulta especialmente útil en contratos proxy y contratos auxiliares donde es necesario reenviar la salida exacta de otra llamada a un contrato sin envolverla en otra capa de codificación. Sin embargo, existen limitaciones importantes: este decorador solo puede usarse en funciones `@external`. No puede utilizarse en definiciones de interfaces y, al llamar a estas funciones desde otros contratos, se debe utilizar `raw_call` en lugar de llamadas a interfaces, ya que los datos devueltos podrían no estar codificados según la ABI.

**@nonreentrant**

El decorador `@nonreentrant` coloca un bloqueo en una función que impide las llamadas de reentrada a cualquier función cubierta por el decorador. El bloqueo de reentrada garantiza que no se pueda volver a entrar en estas funciones hasta que hayan terminado de ejecutarse. Este decorador se utiliza para evitar ataques de reentrada, en los que un contrato externo podría volver a llamar a las funciones protegidas, lo que podría provocar comportamientos inesperados o la explotación de vulnerabilidades del contrato. Vyper también admite un pragma para impedir la reentrada de forma predeterminada, haciendo que todas las funciones externas estén protegidas contra la reentrada, a menos que se anule explícitamente esta configuración. Por ejemplo, si el contrato A utiliza este decorador para protegerse contra la reentrada y realiza una llamada externa al contrato B, cualquier intento del contrato B de volver a llamar a una función protegida del contrato A hará que la transacción se revierta.

> **Nota**
>
> Esta funcionalidad de protección contra la reentrada en las versiones 0.2.15, 0.2.16 y 0.3.0 de Vyper contenía un error crítico que se descubrió y se aprovechó para atacar el protocolo Curve a mediados de 2023. Profundizaremos en la vulnerabilidad de reentrada en el capítulo 9.

Vyper implementa la lógica de los decoradores explícitamente. Por ejemplo, el proceso de compilación de Vyper fallará si una función tiene tanto un decorador `@payable` como un decorador `@view`. Esto tiene sentido porque una función que transfiere valor ha actualizado el estado por definición, por lo que no puede ser `@view`. Cada función de Vyper debe estar decorada con `@external` o con `@internal`, ¡pero no con ambos!

## Orden de funciones y variables

El enfoque de Vyper para los ámbitos y las declaraciones sigue las reglas de ámbito de C99, que ofrecen más flexibilidad de la que se podría esperar inicialmente. Aunque los contratos de Vyper todavía deben estar contenidos en un solo archivo, a menos que se utilice el sistema de módulos, los estrictos requisitos de orden presentes en versiones anteriores se han flexibilizado para las declaraciones en el ámbito del módulo.

Las variables y funciones declaradas en el ámbito del módulo, fuera del cuerpo de cualquier función, son visibles en todo el contrato, incluso antes de su declaración formal. Esto significa que se puede hacer referencia a variables de estado y llamar a funciones antes de que aparezcan en el archivo, de manera similar a como muchos lenguajes de programación modernos manejan las declaraciones adelantadas.

Veamos un ejemplo práctico que muestra cómo funcionan los ámbitos en las versiones modernas de Vyper:

```
# Esta función puede hacer referencia a la variable de estado de abajo
@external
def get_stored_value() -> uint256:
    return self.stored_data  # Hace referencia a una variable declarada después
# Esta función puede llamar a la función de arriba
@external
def check_if_positive() -> bool:
    return self.get_stored_value() > 0
# Declaración de variable de estado, accesible para las funciones de arriba
stored_data: public(uint256)
```

Sin embargo, dentro del ámbito de las funciones, Vyper aún mantiene reglas estrictas de orden. Las variables locales deben declararse antes de usarse y no se pueden ocultar los nombres de constantes, variables inmutables u otras declaraciones a nivel de módulo con variables locales. Este enfoque de los ámbitos logra un equilibrio entre la flexibilidad de Python y las necesidades del desarrollo de contratos inteligentes, donde la visibilidad clara de las variables de estado y las relaciones entre funciones es importante para las auditorías de seguridad.

## Compilación

La manera más fácil de experimentar con Vyper es utilizar el [compilador en línea de Remix](https://remix.ethereum.org), que permite escribir y luego compilar contratos inteligentes usando solo el navegador web, aunque será necesario activar el complemento vyper-remix en el administrador de complementos.

> **Nota**
>
> Vyper incluye [interfaces comunes integradas](https://oreil.ly/GazPW), como ERC-20 y ERC-721, que permiten interactuar directamente con esos contratos. Los contratos en Vyper deben declararse como variables globales. A continuación se muestra un ejemplo de declaración de una variable ERC-20:
> `from vyper.interfaces import ERC20` `token: ERC20`

También se puede compilar un contrato desde la línea de comandos. Cada contrato de Vyper se guarda en un archivo con la extensión *.vy*. Una vez instalado Vyper, se puede compilar un contrato ejecutando el siguiente comando:

```bash
vyper ~/hello_world.vy
```

El compilador ofrece numerosas opciones de salida. Para obtener la descripción de la ABI en formato JSON legible para humanos, se utiliza:

```bash
vyper -f abi ~/hello_world.vy
```

Para el desarrollo y las pruebas, probablemente se necesiten salidas adicionales, como bytecode, códigos de operación o archivos de interfaz. El compilador admite numerosos formatos de salida:

```bash
vyper -f abi,bytecode,interface,source_map ~/hello_world.vy
```

Las versiones modernas de Vyper también incluyen modos de optimización avanzados. Se puede optimizar la eficiencia del gas con `--optimize gas`, la opción predeterminada, o reducir el tamaño de los contratos con `--optimize codesize`. El nuevo flujo experimental de compilación Venom IR puede habilitarse con `--experimental-codegen` para obtener optimizaciones aún mejores.

Si bien Remix y el compilador de línea de comandos son excelentes para aprender y experimentar, los desarrolladores que trabajan en proyectos más grandes suelen necesitar frameworks de desarrollo integrales. [ApeWorx](https://oreil.ly/AJRSa), antes llamado Ape, ofrece excelente soporte para Vyper con funcionalidades como pruebas automatizadas, scripts de despliegue e integración con diversas redes. [Foundry](https://oreil.ly/CWIKj), aunque se centra principalmente en Solidity, también admite el desarrollo con Vyper y ofrece potentes capacidades de prueba y simulación. Estos frameworks proporcionan el tipo de entorno de desarrollo maduro que los desarrolladores profesionales de contratos inteligentes necesitan para crear aplicaciones complejas.

## Protección contra errores de desbordamiento a nivel del compilador

Los errores de desbordamiento en el software pueden ser catastróficos cuando se maneja valor real. Por ejemplo, una [transacción de mediados de abril de 2018](https://oreil.ly/zOy06) muestra la transferencia maliciosa de más de 57,896,044,618,658,100,000,000,000,000,000,000,000,000, 000,000,000,000,000,000 tokens BEC. Esta transacción fue el resultado de un problema de desbordamiento de enteros en el contrato del token ERC-20 de Beauty Chain (*BecToken.sol*).

Una de las funcionalidades centrales de Vyper siempre ha sido su protección integrada contra desbordamientos, que reduce el riesgo de los errores de desbordamiento que históricamente han afectado al desarrollo de contratos inteligentes. El enfoque de Vyper para la protección contra desbordamientos es integral: incluye una protección equivalente a SafeMath que maneja los casos de excepción necesarios para la aritmética de enteros, lo que garantiza que operaciones como la suma, la resta, la multiplicación y la división sean seguras de forma predeterminada y genera excepciones cuando se produce un desbordamiento o un subdesbordamiento. Además, Vyper utiliza operaciones de acotación para hacer cumplir los límites de los valores cada vez que se carga una constante literal, se pasa un valor a una función o se asigna una variable.

Cabe señalar que las versiones recientes de Solidity, a partir de la 0.8.0, también han integrado comprobaciones nativas de desbordamiento a nivel del compilador, similares a las que Vyper ha ofrecido desde el principio. Esto significa que las operaciones aritméticas en las versiones modernas de Solidity ahora incluyen automáticamente comprobaciones de desbordamiento, lo que reduce considerablemente el riesgo de errores de desbordamiento sin necesidad de bibliotecas adicionales como SafeMath. Aunque este cambio ha acercado Solidity al enfoque de Vyper que prioriza la seguridad, la implementación de Vyper sigue siendo más integral, con operaciones de acotación y comprobaciones de límites más uniformes en todo el lenguaje. La diferencia clave es filosófica: Vyper se diseñó desde cero con la protección contra desbordamientos como principio central, mientras que Solidity la añadió como una mejora para resolver vulnerabilidades históricas. Esta diferencia de enfoque refleja el compromiso más amplio de Vyper de dificultar la escritura de código inseguro de forma predeterminada.

## Lectura y escritura de datos

Aunque almacenar, leer y modificar datos es costoso, estas operaciones de almacenamiento persistente son un componente necesario de la mayoría de los contratos inteligentes. Los contratos inteligentes pueden escribir datos en dos lugares:

**Estado global**

Las variables de estado de un contrato inteligente determinado se almacenan en el trie del estado global de Ethereum; un contrato inteligente solo puede almacenar, leer y modificar datos relacionados con la dirección de ese contrato en particular, es decir, los contratos inteligentes no pueden leer ni escribir directamente en otros contratos inteligentes.

**Registros**

Un contrato inteligente puede escribir en los datos de la cadena de Ethereum mediante eventos de registro. En Vyper, la sintaxis para declarar y utilizar eventos es clara y sencilla, en consonancia con el énfasis de Vyper en la claridad del código.

Las declaraciones de eventos en Vyper se parecen a las declaraciones de estructuras. Por ejemplo, la declaración de un evento llamado `MyLog` se escribe así:

```
event MyLog:
    arg1: indexed(address)
    arg2: uint256
    message: indexed(bytes[100])
```

Se pueden tener hasta cuatro argumentos indexados, que se convierten en temas de búsqueda, y cualquier cantidad de argumentos no indexados que pasan a formar parte de los datos del evento. Los argumentos indexados son útiles para filtrar y buscar eventos, mientras que los argumentos no indexados pueden contener mayores cantidades de datos.

La ejecución del evento de registro utiliza la instrucción `log` con una sintaxis sencilla:

```
log MyLog(msg.sender, 42, b"Hello, Vyper!")
```

También se pueden crear eventos sin argumentos utilizando la instrucción `pass`:

```
event SimpleEvent: pass
# Más adelante en el código:
log SimpleEvent()
```

Si bien los contratos inteligentes pueden escribir en los datos de la cadena de Ethereum mediante eventos de registro, no pueden leer los eventos de registro en la cadena que han creado. Sin embargo, una de las ventajas de escribir en los datos de la cadena de Ethereum mediante eventos de registro es que los clientes ligeros pueden descubrir y leer los registros en la cadena pública. Por ejemplo, el valor `logsBloom` de un bloque publicado puede indicar si un evento de registro está presente o no. Una vez establecida la existencia de eventos de registro, los datos del registro pueden obtenerse del recibo de una transacción determinada.

## Conclusión

Vyper es un lenguaje de programación orientado a contratos potente y fascinante. Su diseño se inclina hacia la "corrección", priorizando la seguridad y la sencillez. Este enfoque puede permitir a los programadores escribir mejores contratos inteligentes y evitar ciertos errores que pueden dar lugar a vulnerabilidades graves.

Sin embargo, es importante reconocer que todo implica concesiones. Si bien los estrictos principios de diseño de Vyper mejoran la seguridad y la claridad del código, también limitan parte de la flexibilidad que los desarrolladores pueden encontrar en otros lenguajes. Además, Vyper no se utiliza tanto ni está tan desarrollado como Solidity, lo que significa que hay menos recursos, bibliotecas y herramientas disponibles para los desarrolladores. Esto puede plantear dificultades para quienes buscan apoyo de la comunidad, soluciones ya creadas y documentación completa.

A continuación, examinaremos la seguridad de los contratos inteligentes con más detalle. Algunos de los matices del diseño de Vyper podrían resultar más evidentes después de leer sobre todos los posibles problemas de seguridad que pueden surgir en los contratos inteligentes.
