# Capítulo 2. Conceptos básicos de Ethereum

En este capítulo, comenzaremos a explorar Ethereum. Veremos cómo usar billeteras, crear transacciones y ejecutar un contrato inteligente básico.

## Unidades monetarias de ether

La unidad monetaria de Ethereum se llama *ether*, también identificada como ETH o con los símbolos Ξ (de la letra griega *Xi*, que parece una *E* mayúscula estilizada) o, con menos frecuencia, ♦: por ejemplo, 1 ether, 1 ETH, Ξ1 o ♦1.

> **Consejo**  
>
> Utilice los caracteres Unicode U+039E para Ξ y U+2666 para ♦.

El ether se subdivide en unidades más pequeñas, hasta la unidad mínima posible, llamada *wei*. Un ether equivale a 1 trillón de wei (1 × 10^18^, o 1,000,000,000,000,000,000). También es posible escuchar que se refieren a la moneda como "Ethereum", pero este es un error común de principiantes. Ethereum es el sistema; ether es la moneda.

El valor del ether siempre se representa internamente en Ethereum como un valor entero sin signo denominado en wei. Al realizar una transacción de 1 ether, la transacción codifica 1,000,000,000,000,000,000 wei como valor.

Las distintas denominaciones del ether tienen tanto un nombre científico que utiliza el Sistema Internacional de Unidades (SI) como un nombre coloquial que rinde homenaje a muchas de las grandes mentes de la computación y la criptografía. La Tabla 2-1 enumera las distintas unidades, sus nombres coloquiales (comunes) y sus nombres del SI. En consonancia con la representación interna del valor, la tabla muestra todas las denominaciones en wei (primera fila), y ether aparece como 10^18^ wei en la séptima fila.

**Tabla 2-1. Denominaciones de ether y nombres de las unidades**

| Valor (en wei) | Exponente | Nombre común | Nombre del SI |
|---|---|---|---|
| 1 | 1 | Wei | Wei |
| 1,000 | 10^3^ | Babbage | Kilowei o femtoether |
| 1,000,000 | 10^6^ | Lovelace | Megawei o picoether |
| 1,000,000,000 | 10^9^ | Shannon | Gigawei o nanoether |
| 1,000,000,000,000 | 10^12^ | Szabo | Microether o micro |
| 1,000,000,000,000,000 | 10^15^ | Finney | Milliether o milli |
| *1,000,000,000,000,000,000* | *10^18^* | *Ether* | *Ether* |
| 1,000,000,000,000,000,000,000 | 10^21^ | Grand | Kiloether |
| 1,000,000,000,000,000,000,000,000 | 10^24^ | | Megaether |

## Elegir una billetera de Ethereum

El término *billetera* ha adquirido muchos significados, aunque todas las definiciones están relacionadas y, en el uso cotidiano, todas se reducen prácticamente a lo mismo. Usaremos el término *billetera* para referirnos a una aplicación de software que ayuda a administrar una cuenta de Ethereum. En pocas palabras, una billetera de Ethereum es la puerta de entrada al sistema Ethereum. Guarda las claves y puede crear y difundir transacciones en su nombre. Elegir una billetera de Ethereum puede ser difícil porque hay muchas opciones con distintas funciones y diseños. Algunas son más adecuadas para principiantes y otras para expertos. La propia plataforma Ethereum sigue mejorando, y las "mejores" billeteras suelen ser las que se adaptan a los cambios que traen las actualizaciones de la plataforma.

¡Pero no hay de qué preocuparse! Si elige una billetera y no le gusta cómo funciona, o si al principio le gusta pero después quiere probar otra cosa, puede cambiar de billetera con bastante facilidad. Solo tiene que realizar una transacción que envíe los fondos de la billetera anterior a la nueva, o exportar las claves privadas e importarlas en la nueva.

Recuerde que, para que una aplicación de billetera funcione, debe tener acceso a sus claves privadas, por lo que es vital descargar y usar únicamente aplicaciones de billetera de fuentes de confianza. Afortunadamente, en general, cuanto más popular es una aplicación de billetera, más probable es que sea confiable. Sin embargo, es una buena práctica evitar "poner todos los huevos en una sola canasta" y distribuir las cuentas de Ethereum entre un par de billeteras y frases semilla.

Las siguientes son algunas buenas billeteras para comenzar; la selección de estas billeteras no constituye un aval de su calidad o seguridad. Son tan solo un buen punto de partida para demostraciones y pruebas. Todas las siguientes billeteras están disponibles como extensiones de navegador y como billeteras móviles:

**MetaMask**

MetaMask es fácil de usar y conveniente para realizar pruebas, ya que puede conectarse a diversos nodos de Ethereum y blockchains de prueba.

**Rabby Wallet**

Rabby suele ser una buena opción para usuarios nuevos, ya que está diseñada para ser sencilla y fácil de usar. Incorpora muchas funciones de seguridad.

**Phantom**

Phantom es una billetera compatible con Ethereum y otras redes EVM y no EVM.

## Control y responsabilidad

Las blockchains abiertas como Ethereum son importantes porque funcionan como un sistema *descentralizado*. Esto significa muchas cosas, pero un aspecto fundamental es que cada usuario de Ethereum puede, y debe, controlar sus propias *claves privadas*, que controlan el acceso a los fondos y los contratos inteligentes. A veces llamamos *cuenta* o *billetera* a la combinación del acceso a los fondos y los contratos inteligentes. Estos términos pueden abarcar funciones bastante complejas, por lo que profundizaremos en ellos más adelante. Sin embargo, como principio fundamental, es tan sencillo como que una clave privada equivale a una "cuenta". Algunos usuarios optan por ceder el control de sus claves privadas al utilizar un custodio externo, como una plataforma de intercambio centralizada en línea. En este libro, enseñaremos cómo tomar el control y administrar sus propias claves privadas.

El control conlleva una gran responsabilidad. Si pierde sus claves privadas, pierde el acceso a sus fondos y contratos. Nadie puede ayudarle a recuperar el acceso; sus fondos quedarán bloqueados para siempre. Estos son algunos consejos para ayudarle a manejar esta responsabilidad:

- No improvise en materia de seguridad. Use métodos estándar probados.

- Cuanto más importante sea la cuenta (por ejemplo, cuanto mayor sea el valor de los fondos controlados en comparación con su patrimonio neto total), mayores deben ser las medidas de seguridad.

- Una billetera de hardware ofrece uno de los niveles más altos de seguridad, pero este nivel no es necesario para todas las cuentas.

- Nunca guarde su clave privada sin protección, especialmente en formato digital. Afortunadamente, la mayoría de las interfaces de usuario actuales ni siquiera permiten ver la clave privada en bruto sin mostrar múltiples advertencias.

- Cuando se le solicite respaldar una clave como una secuencia de palabras mnemónicas, use papel y lápiz para hacer una copia de respaldo física. No deje esa tarea "para después"; se le olvidará. Estos respaldos pueden usarse para reconstruir su clave privada si pierde todos los datos guardados en el sistema o si olvida o pierde su contraseña. Sin embargo, los atacantes también pueden usarlos para obtener sus claves privadas, así que nunca los guarde en formato digital y mantenga al menos una copia física en un lugar seguro.

- Antes de transferir cualquier cantidad grande (especialmente a direcciones nuevas), haga primero una pequeña transacción de prueba (por ejemplo, de menos de $1 de valor) y espere la confirmación de recepción.

- Al crear una cuenta nueva, comience enviando solo una pequeña transacción de prueba a la dirección nueva. Una vez que reciba la transacción de prueba, intente devolverla desde esa cuenta. Hay muchas razones por las que la creación de una cuenta puede salir mal y, si ha salido mal, es mejor descubrirlo con una pérdida pequeña. Si las pruebas funcionan, todo está bien (también podría usarse una red de prueba para evitar cualquier tipo de pérdida).

- Los exploradores de bloques públicos son una forma sencilla de comprobar de manera independiente si la red ha aceptado una transacción; aunque esta información ya es pública en la blockchain, los exploradores de bloques facilitan enormemente el acceso. Sin embargo, esta comodidad perjudica su privacidad porque revela sus direcciones a los exploradores de bloques, que pueden rastrearle.

- Los exploradores de bloques públicos suelen ser confiables, pero no siempre; no confíe en ellos ciegamente.

- No envíe dinero a ninguna de las direcciones que aparecen en este libro. Las claves privadas figuran en el libro y alguien podría llevarse ese dinero de inmediato.

Ahora que hemos visto algunas buenas prácticas básicas de administración de claves y seguridad, ¡pongámonos a trabajar con MetaMask!

## Primeros pasos con MetaMask

Abra el navegador Google Chrome y vaya a [Extensions](https://oreil.ly/0rOvX). Busque "MetaMask" y haga clic en el logotipo de un zorro. Debería ver algo similar a la Figura 2-1.

![Página de detalles de la extensión de MetaMask para Chrome](images/ch2/maet_0201.png)

Figura 2-1. Página de detalles de la extensión de MetaMask para Chrome

Es importante comprobar que está descargando la extensión auténtica de MetaMask porque, a veces, algunas personas logran introducir extensiones maliciosas que pasan los filtros de Google. La auténtica cumple lo siguiente:

- Muestra el ID `nkbihfbeogaeaoehlefnkodbefgpgknn` en la barra de direcciones

- La ofrece [*https://metamask.io*](https://metamask.io)

- Tiene más de 5,400 reseñas

- Tiene más de 15 millones de usuarios

Una vez que confirme que está viendo la extensión correcta, haga clic en "Add to Chrome" para instalarla.

### Crear una billetera

Una vez instalado MetaMask, debería ver un icono nuevo (la cabeza de un zorro) en la barra de herramientas del navegador. Haga clic en él para comenzar. Se le pedirá que acepte los términos y condiciones y luego que cree su nueva billetera de Ethereum ingresando una contraseña (consulte la Figura 2-2).

![Página de contraseña de la extensión de MetaMask para Chrome](images/ch2/maet_0202.png)

Figura 2-2. Página de contraseña de la extensión de MetaMask para Chrome

> **Consejo**  
>
> La contraseña controla el acceso a MetaMask para que no pueda usarlo cualquier persona que tenga acceso al navegador. Esta contraseña es solo para su dispositivo local; si un atacante obtiene acceso a la clave privada o la frase semilla, podrá acceder a los fondos de sus direcciones. El atacante no necesita la contraseña si tiene la clave privada o la frase semilla.

Una vez establecida una contraseña, MetaMask generará una billetera y mostrará un *respaldo mnemónico* compuesto por 12 palabras en inglés (consulte la Figura 2-3). Estas palabras pueden usarse en cualquier billetera compatible para recuperar el acceso a sus fondos si le ocurre algo a MetaMask o a su computadora. No necesita la contraseña para esta recuperación; las 12 palabras son suficientes.

![Respaldo mnemónico de la billetera creada por MetaMask](images/ch2/maet_0203.png)

Figura 2-3. Respaldo mnemónico de la billetera creada por MetaMask

> **Consejo**  
>
> Haga dos copias de respaldo en papel de su frase mnemónica (12 palabras). Guarde las dos copias en dos lugares seguros separados, como una caja fuerte resistente al fuego, un cajón con cerradura o una caja de seguridad bancaria. Trate los respaldos en papel como dinero en efectivo de valor equivalente al que guarda en su billetera de Ethereum. Cualquier persona con acceso a estas palabras puede acceder a su dinero y robarlo. En el Capítulo 5 profundizaremos mucho más en cómo mantener segura su frase semilla.

Una vez que confirme que ha guardado la frase mnemónica de forma segura, podrá ver los detalles de su cuenta de Ethereum, como se muestra en la Figura 2-4.

![Cuenta de Ethereum en MetaMask](images/ch2/maet_0204.png)

Figura 2-4. Cuenta de Ethereum en MetaMask

> **Nota**  
>
> No envíe ningún activo a las direcciones que aparecen en este libro. La frase semilla es pública con fines educativos y probablemente se perderá todo activo enviado a estas direcciones.

La página de su cuenta muestra el nombre de la cuenta ("Account 1" de forma predeterminada), una dirección de Ethereum (`0xaa529…f17f` en el ejemplo) y un icono de colores que ayuda a distinguir visualmente esta cuenta de otras. En la parte superior de la página de la cuenta, puede ver en qué red de Ethereum está trabajando ("Main Network" en el ejemplo).

¡Felicitaciones! Ha configurado su primera billetera de Ethereum.

### Cambiar de red

Como puede verse en la página de cuenta de MetaMask, es posible elegir entre varias redes de Ethereum. De forma predeterminada, MetaMask intentará conectarse a la red principal. Las otras opciones son redes de prueba públicas, cualquier nodo de Ethereum que elija o nodos que ejecutan blockchains privadas en su propia computadora (localhost):

**Main Ethereum Network**

La blockchain pública principal de Ethereum. ETH real, valor real y consecuencias reales.

**Sepolia Test Network**

Lanzada en octubre de 2021 como una red de prueba de autoridad por los desarrolladores principales de Ethereum, Sepolia pasó después al consenso PoS, reflejando el entorno de la red principal de Ethereum.

**Holesky Test Network**

La red de prueba Holesky es el entorno de pruebas avanzado de Ethereum para staking, infraestructura y desarrollo del protocolo.

**Localhost 8545**

Conecta con un nodo que se ejecuta en la misma computadora que el navegador. El nodo puede formar parte de cualquier blockchain pública (principal o de prueba) o de una red de prueba privada.

**Custom RPC**

Permite conectar MetaMask con cualquier nodo que tenga una interfaz de llamada a procedimiento remoto (RPC) compatible con Geth. El nodo puede formar parte de cualquier blockchain pública o privada.

> **Nota**  
>
> Su billetera MetaMask utiliza la misma clave privada y dirección de Ethereum en todas las redes a las que se conecta. Sin embargo, el saldo de su dirección de Ethereum será distinto en cada red de Ethereum. Por ejemplo, si usa sus claves para enviar ether en la red de prueba Sepolia, sus saldos en otras redes no se verán afectados.

### Obtener ether de prueba

La primera tarea es agregar fondos a su billetera. No lo hará en la red principal porque el ether real cuesta dinero y manejarlo requiere algo más de experiencia. Por ahora, cargará su billetera con algo de ether de una red de prueba.

Cambie MetaMask a Sepolia Test Network haciendo clic en el icono de Ethereum en la parte superior izquierda; active la opción "Show test networks" y haga clic en Sepolia, como se muestra en la Figura 2-5.

![Redes de MetaMask](images/ch2/maet_0205.png)

Figura 2-5. Redes de MetaMask

Haga clic en Buy y luego vaya a uno de los faucets de [esta lista](https://oreil.ly/VE0t0). Una vez que decida qué faucet quiere usar (todos son prácticamente equivalentes), puede solicitar ether en la red de prueba, como se muestra en la Figura 2-6.

![Faucet de prueba de Sepolia en MetaMask](images/ch2/maet_0206.png)

Figura 2-6. Faucet de prueba de Sepolia en MetaMask

El ID de transacción de la solicitud de ether de prueba se ve así:

    0x471273d9417e98e7f1adaae61e53a353b2d2313de2e71fc4b6184bf5a63fa0ae

En unos segundos, la red Sepolia procesará la nueva transacción y su billetera MetaMask mostrará un saldo de 0.05 ETH (esto depende de cuánto ether esté dispuesto a enviar el faucet). Ahora, haga clic en la primera transacción de la extensión del navegador y luego en "View on block explorer", como se muestra en la Figura 2-7. Esto abrirá un *explorador de bloques*, un sitio web que permite visualizar y explorar bloques, direcciones y transacciones.

![Transacción vista desde MetaMask](images/ch2/maet_0207.png)

Figura 2-7. Transacción vista desde MetaMask

MetaMask utiliza el [explorador de bloques Etherscan](https://etherscan.io), uno de los exploradores de bloques de Ethereum más populares. La transacción que contiene el pago del faucet de prueba de Sepolia se muestra en la Figura 2-8.

![Explorador de bloques Etherscan para Sepolia](images/ch2/maet_0208.png)

Figura 2-8. Explorador de bloques Etherscan para Sepolia

La transacción se ha registrado en la blockchain Sepolia y cualquier persona puede verla en cualquier momento buscando su ID de transacción. Pruebe ingresar el hash de la transacción en el [sitio web *sepolia.etherscan.io*](http://sepolia.etherscan.io) para verlo:

    0x471273d9417e98e7f1adaae61e53a353b2d2313de2e71fc4b6184bf5a63fa0ae

### Enviar ether desde MetaMask

Una vez que haya recibido su primer ether de prueba del faucet de prueba de Sepolia, puede experimentar con el envío de ether intentando devolver una parte al faucet o enviarla a cualquier otra dirección. En este ejemplo, intentaremos enviar algo de ether de prueba a Vitalik Buterin, como se muestra en la Figura 2-9.

![Envío de 0.05 ether a una dirección](images/ch2/maet_0209.png)

Figura 2-9. Envío de 0.05 ether a una dirección

¡Ups! Probablemente notó que no puede completar la transacción; MetaMask indica que el saldo es insuficiente. A primera vista, esto puede parecer confuso: tiene 0.05 ETH y quiere enviar 0.05 ETH, así que ¿por qué MetaMask indica que no tiene fondos suficientes?

La respuesta es el costo del gas. Toda transacción de Ethereum requiere el pago de una comisión, que la red cobra para validar la transacción. Las comisiones de Ethereum se cobran en una moneda virtual llamada *gas*. El gas se paga con ether como parte de la transacción.

> **Nota**  
>
> Las redes de prueba también requieren comisiones. Sin comisiones, una red de prueba se comportaría de manera distinta a la red principal, lo que la convertiría en una plataforma de pruebas inadecuada. Las comisiones también protegen las redes de prueba de ataques DoS y contratos mal construidos (por ejemplo, bucles infinitos), de la misma manera que protegen la red principal.

Al enviar la transacción, MetaMask calculará el precio promedio del gas de las transacciones recientes exitosas, por ejemplo, 3 gwei, que significa gigawei. Wei es la subdivisión más pequeña de la moneda ether, como vimos en "Unidades monetarias de ether". El límite de gas se establece en el costo de enviar una transacción básica: 21,000 unidades de gas, que es la cantidad mínima de gas que puede usarse para enviar una transacción. Por lo tanto, la cantidad máxima de ETH que gastará es 3 × 21,000 gwei = 63,000 gwei = 0.000063 ETH. (Tenga en cuenta que los precios promedio del gas pueden fluctuar. En un capítulo posterior veremos cómo aumentar o disminuir el límite de gas para que su transacción tenga prioridad si es necesario).

Todo esto significa que realizar una transacción de 0.05 ETH cuesta 0.050063 ETH. Haga clic en Reject para cancelar esta transacción. Intentémoslo de nuevo, esta vez enviando 0.01 ETH.

### Explorar el historial de transacciones de una dirección

A estas alturas, ya domina el uso de MetaMask para enviar y recibir ether de prueba. Su billetera ha recibido y enviado pagos. Puede ver todas estas transacciones utilizando el [explorador de bloques *sepolia.etherscan.io*](http://sepolia.etherscan.io). Puede copiar la dirección de su billetera y pegarla en el cuadro de búsqueda del explorador de bloques o dejar que MetaMask abra la página. Junto al icono de su cuenta en MetaMask, verá un botón con tres puntos. Haga clic en él para mostrar un menú de opciones relacionadas con la cuenta (consulte la Figura 2-10).

![Menú contextual de cuenta de MetaMask](images/ch2/maet_0210.png)

Figura 2-10. Menú contextual de cuenta de MetaMask

> **Consejo**  
>
> La configuración predeterminada de MetaMask no está muy orientada a la privacidad. Se recomienda analizar cuidadosamente los ajustes de Settings → Security and Privacy. Una vez que se familiarice con el funcionamiento de MetaMask, también se recomienda cambiar la conexión predeterminada a la red principal de Ethereum por otra que use una RPC con ajustes de privacidad adecuados para sus necesidades. La solución más privada sería tener su propio nodo con una RPC a la que pueda conectarse; veremos cómo hacerlo en el Capítulo 3.

Seleccione "View account on Etherscan" para abrir una página web en el explorador de bloques que muestre el historial de transacciones de su cuenta, como se muestra en la Figura 2-11.

![Historial de transacciones de una dirección en Etherscan](images/ch2/maet_0211.png)

Figura 2-11. Historial de transacciones de una dirección en Etherscan

Aquí puede ver todo el historial de transacciones de su dirección de Ethereum. Muestra todas las transacciones registradas en la blockchain Sepolia en las que su dirección es remitente o destinataria. Haga clic en algunas de estas transacciones para ver más detalles.

> **Advertencia**  
>
> Tenga cuidado: existe un ataque conocido, llamado *envenenamiento de direcciones*, que puede mostrar transacciones con direcciones falsificadas en el explorador de bloques. El explorador de bloques debe usarse para una comprobación rápida, pero la información que muestra podría no ser exacta.

Puede explorar el historial de transacciones de cualquier dirección. Observe el historial de transacciones de la dirección del faucet de prueba de Sepolia (pista: es la dirección "sender" que aparece en el pago más antiguo a su dirección). Puede ver todo el ether de prueba enviado desde el faucet a usted y a otras direcciones. Cada transacción que vea puede llevarle a más direcciones y más transacciones. En poco tiempo, se perderá en el laberinto de datos interconectados. Las blockchains públicas contienen una enorme cantidad de información, que puede explorarse íntegramente de forma programática, como veremos en ejemplos posteriores.

## Introducción a la computadora mundial

Ya ha creado una billetera y ha enviado y recibido ether. Hasta ahora, hemos tratado Ethereum como una criptomoneda. Pero Ethereum es mucho, mucho más. De hecho, la función de criptomoneda está subordinada a la función de Ethereum como computadora mundial descentralizada. El ether está pensado para pagar la ejecución de *contratos inteligentes* (smart contracts), que son programas informáticos que se ejecutan en una computadora emulada llamada *EVM*.

La EVM es un singleton global, lo que significa que funciona como si fuera una computadora global de instancia única, que se ejecuta en todas partes. Cada nodo de la red Ethereum ejecuta una copia local de la EVM para validar la ejecución de contratos, mientras que la blockchain Ethereum registra el *estado* cambiante de esta computadora mundial a medida que procesa transacciones y contratos inteligentes. Trataremos esto con mucho más detalle en el Capítulo 14.

## Cuentas de propiedad externa y contratos

El tipo de cuenta que creó en la billetera MetaMask se llama *cuenta de propiedad externa* (EOA). Las EOA son aquellas que tienen una clave privada; tener la clave privada significa controlar el acceso a los fondos o contratos.

Probablemente imagina que existe otro tipo de cuenta. Ese otro tipo de cuenta es una *cuenta de contrato*. Una cuenta de contrato tiene código de contrato inteligente, algo que una EOA simple no puede tener. Además, una cuenta de contrato no tiene clave privada. En cambio, su propiedad y control corresponden a la lógica de su código de contrato inteligente: el programa de software registrado en la blockchain Ethereum al crear la cuenta de contrato y ejecutado por la EVM.

Los contratos tienen direcciones, al igual que las EOA. Los contratos también pueden enviar y recibir ether, al igual que las EOA. Sin embargo, cuando el destino de una transacción es una dirección de contrato, esto hace que ese contrato se *ejecute* en la EVM, usando la transacción y sus datos como entrada. Además de ether, las transacciones pueden contener *datos* que indican qué función específica del contrato debe ejecutarse y qué parámetros deben pasarse a esa función. De esta manera, las transacciones pueden *llamar* a funciones dentro de los contratos.

Observe que, como una cuenta de contrato no tiene clave privada, no puede *iniciar* una transacción. Solo las EOA pueden iniciar transacciones, pero los contratos pueden *reaccionar* a las transacciones llamando a otros contratos y construyendo rutas de ejecución complejas.

En las próximas secciones, escribiremos nuestro primer contrato. Luego aprenderá a crear, financiar y usar ese contrato con su billetera MetaMask y ether de prueba en la red de prueba Sepolia.

## Un contrato sencillo: un faucet de ether de prueba

Ethereum tiene varios lenguajes de alto nivel, todos los cuales pueden usarse para escribir un contrato y producir bytecode de la EVM. Puede leer sobre los más destacados e interesantes en el Capítulo 7. Un lenguaje de alto nivel es, por mucho, la opción dominante para programar contratos inteligentes: Solidity. Solidity fue creado por Gavin Wood y se ha convertido en el lenguaje más utilizado en Ethereum (y más allá). Usaremos Solidity para escribir nuestro primer contrato.

Para nuestro primer ejemplo (Ejemplo 2-1), escribiremos un contrato que controla un faucet. Ya ha usado un faucet para obtener ether de prueba en la red de prueba Sepolia. Un *faucet* es algo relativamente sencillo: entrega ether a cualquier dirección que lo solicite y puede recargarse.

##### Ejemplo 2-1. *Faucet.sol*: un contrato de Solidity que implementa un faucet

```solidity
pragma solidity 0.8.26;
// SPDX-License-Identifier: GPL-3.0

// ¡Nuestro primer contrato es un faucet!
contract Faucet {

    // Entregar ether a cualquiera que lo solicite
    function withdraw(uint256 _withdrawAmount, address payable _to) public {

        // Limitar la cantidad del retiro
        require(_withdrawAmount <= 1000000000000);

        // Enviar la cantidad a la dirección que la solicitó
        _to.transfer(_withdrawAmount);
    }

    // Función para recibir Ether. msg.data debe estar vacío
    receive() external payable {}

    // La función fallback se llama cuando msg.data no está vacío
    fallback() external payable {}
}
```

Este es un contrato muy sencillo, casi tan sencillo como podemos hacerlo. También es un contrato *defectuoso*, que demuestra varias malas prácticas y vulnerabilidades de seguridad. Aprenderemos examinando muchas de sus fallas en secciones posteriores. Pero, por ahora, veamos qué hace este contrato y cómo funciona, línea por línea. Pronto notará que muchos elementos de Solidity son similares a los de lenguajes de programación existentes, como JavaScript, Java o C++.

La primera línea es la instrucción `pragma`:

    pragma solidity 0.8.26;

Al incluir esta línea al principio de un archivo fuente de Solidity, se garantiza que el código se compile con la versión 0.8.26 del compilador de Solidity, lo que asegura la compatibilidad y evita posibles problemas que podrían surgir al usar una versión distinta del compilador.

A continuación hay un comentario que indica que el contrato inteligente tiene la licencia GPL-3.0:

    // SPDX-License-Identifier: GPL-3.0

Esto es importante por razones legales y de cumplimiento, porque informa a los usuarios y desarrolladores sobre sus derechos y obligaciones respecto al uso y la distribución del código.

Los comentarios son para que los lean las personas y no se incluyen en el bytecode ejecutable de la EVM. Normalmente los ponemos en la línea anterior al código que intentamos explicar, o a veces en la misma línea. Los comentarios comienzan con dos barras diagonales: `//`. Todo lo que va desde la primera barra hasta el final de esa línea se trata igual que una línea en blanco y se ignora.

Esto también es un comentario:

    // ¡Nuestro primer contrato es un faucet!

La siguiente línea es donde realmente comienza nuestro contrato:

    contract Faucet {

Esta línea declara un objeto `contract`, de forma similar a una declaración `class` en otros lenguajes orientados a objetos. La definición del contrato incluye todas las líneas entre las llaves (`{}`), que definen un *ámbito*, de manera muy similar al uso de llaves en muchos otros lenguajes de programación.

A continuación, declaramos la primera función del contrato `Faucet`:

    function withdraw(uint256 _withdrawAmount, address payable _to) public {

La función se llama `withdraw` y recibe un entero sin signo (`uint256`) llamado `_withdrawAmount` y un `address payable` llamado `_to`. Se declara como función pública, lo que significa que otros contratos pueden llamarla. La definición de la función aparece a continuación, entre llaves. La primera parte de la función `withdraw` establece un límite para los retiros:

    require(_withdrawAmount <= 1000000000000);

Utiliza la función integrada `require` de Solidity para comprobar una precondición: que `_withdrawAmount` sea menor o igual que 1,000,000,000,000 wei, que es la unidad base del ether (consulte la Tabla 2-1) y equivale a 0.000001 ether. Si se llama a la función `withdraw` con un `withdraw_amount` mayor que esa cantidad, la función `require` hará que la ejecución del contrato se detenga y falle con una *excepción*. Observe que las instrucciones de Solidity deben terminar con un punto y coma.

Esta parte del contrato es la lógica principal de nuestro faucet. Controla la salida de fondos del contrato al imponer un límite a los retiros. Es un control muy sencillo, pero permite vislumbrar el poder de una blockchain programable: software descentralizado que controla dinero.

Aquí tenemos la primera falla de diseño del contrato. No es una falla de seguridad, pero sería mejor agregar siempre un mensaje de error a la instrucción `require`. De esta manera, cuando la transacción de un usuario falla debido a una instrucción `require`, la razón queda clara.

La instrucción `require` corregida es:

    require(_withdrawAmount <= 1000000000000, "The requested amount is too much, try a smaller amount!");

A continuación viene el retiro en sí:

    _to.transfer(_withdrawAmount);

Aquí ocurren un par de cosas interesantes. La función `transfer` es una función integrada que transfiere ether del contrato actual a otra dirección especificada, en este caso, la dirección `_to`. La función `transfer` recibe una cantidad como único argumento. Le pasamos el valor `_withdrawAmount`, que era el parámetro de la función `withdraw` declarada unas líneas antes.

Esto es posible porque la dirección `_to` se definió como payable. Las funciones integradas `transfer` y `send` solo pueden llamarse sobre direcciones payable. Aquí está la segunda falla del código: aunque `transfer` funciona perfectamente si una EOA llama a la función `withdraw`, se vuelve problemática si otro contrato activa esta función. En ese caso, la transacción podría fallar porque la función `transfer` solo puede utilizar hasta 2,300 unidades de gas, y es probable que varias llamadas a contratos superen este límite. Para resolver este problema, puede usar la función integrada `call` en lugar de `transfer` y `send`. Sin embargo, esta función integrada debe manejarse correctamente para evitar fallas de seguridad. Por ahora, dejaremos la función integrada `transfer` tal como está.

La línea siguiente es la llave de cierre, que indica el final de la definición de nuestra función `withdraw`.

A continuación, declaramos dos funciones más:

    receive() external payable {}
    fallback() external payable {}

Estas son las funciones `fallback` y `receive`, que se llaman si la transacción que activó el contrato no nombró ninguna de las funciones declaradas en el contrato, no nombró ninguna función en absoluto o no contenía datos. Los contratos pueden tener estas funciones y suelen ser los que reciben ether. Cuando *msg.data* está vacío, se activará la función `receive`; cuando *msg.data* no está vacío, se activará la función `fallback`.

Justo debajo de nuestra función `fallback` está la última llave de cierre, que cierra la definición del contrato `Faucet`. ¡Eso es todo!

## Compilar el contrato Faucet

Ahora que tenemos nuestro primer contrato de ejemplo, debemos usar un compilador de Solidity para convertir el código Solidity en bytecode de la EVM, de modo que la EVM pueda ejecutarlo en la propia blockchain.

El compilador de Solidity está disponible como ejecutable independiente, como parte de varios frameworks y como componente incluido en entornos de desarrollo integrados (IDE). Para simplificar, usaremos uno de los IDE más populares: Remix.

Use su navegador Chrome (con la billetera MetaMask que instaló antes) para ir al [IDE Remix](https://remix.ethereum.org).

Cuando cargue Remix por primera vez, se abrirá con un contrato de ejemplo llamado *Storage.sol*. No lo necesitamos, así que ciérrelo haciendo clic en la `x` de la esquina de la pestaña, como se ve en la Figura 2-12.

![Cierre de la pestaña del ejemplo predeterminado](images/ch2/maet_0212.png)

Figura 2-12. Cierre de la pestaña del ejemplo predeterminado

Ahora, cree un archivo nuevo, como se muestra en la Figura 2-13. Llame al archivo nuevo *Faucet.sol*.

![Creación de un contrato nuevo](images/ch2/maet_0213.png)

Figura 2-13. Creación de un contrato nuevo

Una vez abierta la pestaña nueva, copie y pegue el código de nuestro ejemplo *Faucet.sol*, como se muestra en la Figura 2-14.

![Copia del código de ejemplo Faucet en el contrato nuevo](images/ch2/maet_0214.png)

Figura 2-14. Copia del código de ejemplo Faucet en el contrato nuevo

Una vez cargado el contrato *Faucet.sol* en el IDE Remix, vaya a la sección de compilación de Remix y haga clic en Compile *Faucet.sol*. Si todo sale bien, verá un recuadro verde (consulte la Figura 2-15).

![Remix compila correctamente el contrato Faucet.sol](images/ch2/maet_0215.png)

Figura 2-15. Remix compila correctamente el contrato *Faucet.sol*

Si algo sale mal, lo más probable es que el IDE Remix esté utilizando una versión del compilador de Solidity distinta de 0.8.26. En ese caso, nuestra directiva `pragma` impedirá que se compile *Faucet.sol*. Para cambiar la versión del compilador, vaya a la pestaña Compiler, establezca la versión en 0.8.26 e inténtelo de nuevo.

El compilador de Solidity ya ha compilado nuestro *Faucet.sol* en bytecode de la EVM. Si tiene curiosidad, el bytecode se ve así:

    6080604052348015600e575f80fd5b506101af8061001c5f395ff3fe608060405260043610610020575f3560
    e01c8062f714ce1461002957610027565b3661002757005b005b348015610034575f80fd5b5061004f600480
    360381019061004a919061013b565b610051565b005b64e8d4a51000821115610062575f80fd5b8073ffffff
    ffffffffffffffffffffffffffffffffff166108fc8390811502906040515f60405180830381858888f19350
    5050501580156100a5573d5f803e3d5ffd5b505050565b5f80fd5b5f819050919050565b6100c0816100ae56
    5b81146100ca575f80fd5b50565b5f813590506100db816100b7565b92915050565b5f73ffffffffffffffff
    ffffffffffffffffffffffff82169050919050565b5f61010a826100e1565b9050919050565b61011a816101
    00565b8114610124575f80fd5b50565b5f8135905061013581610111565b92915050565b5f80604083850312
    15610151576101506100aa565b5b5f61015e858286016100cd565b925050602061016f85828601610127565b
    915050925092905056fea26469706673582212207de2f4d88c747c9332dceef5dcd739f3380ec8a8c2167a29
    2ba64ee24fa32a8a64736f6c634300081a0033

¿No le alegra usar un lenguaje de alto nivel como Solidity en lugar de programar directamente en bytecode de la EVM? ¡A nosotros también!

## Crear el contrato en la blockchain

Ya tenemos un contrato. Lo hemos compilado en bytecode. Ahora debemos "registrar" el contrato en la blockchain Ethereum. Usaremos la red de prueba Sepolia para probar nuestro contrato, así que esa es la blockchain a la que queremos enviarlo.

Registrar un contrato en la blockchain implica crear una transacción especial cuyo campo `to` se deja vacío (null). Este destino vacío indica a la blockchain Ethereum que se quiere desplegar un contrato nuevo en lugar de enviar una transacción a una dirección existente. El campo `data` de la transacción contiene el bytecode compilado del contrato. Afortunadamente, el IDE Remix se encargará de todo esto y enviará la transacción a MetaMask.

Primero, cambie a la pestaña Run y seleccione Injected Web3 en el cuadro desplegable Environment. Esto conecta el IDE Remix con la billetera MetaMask y, a través de MetaMask, con la red de prueba Sepolia. Una vez hecho esto, puede ver Sepolia debajo de Environment. Además, el cuadro de selección Account muestra la dirección de su billetera (consulte la Figura 2-16).

![Pestaña Run del IDE Remix con el entorno Injected Web3 seleccionado](images/ch2/maet_0216.png)

Figura 2-16. Pestaña Run del IDE Remix con el entorno Injected Web3 seleccionado

Justo debajo de los ajustes de Run que acaba de confirmar está el contrato `Faucet`, listo para crearse. Haga clic en el botón Deploy que se muestra en la Figura 2-16.

Remix construirá la transacción especial de "creación" y MetaMask le pedirá que la apruebe, como se muestra en la Figura 2-17. Notará que la transacción de creación del contrato no contiene ether, pero sí algunos bytes de datos (el contrato compilado) y consumirá algunos gwei en gas. Haga clic en Submit para aprobarla.

![MetaMask muestra la transacción de creación del contrato](images/ch2/maet_0217.png)

Figura 2-17. MetaMask muestra la transacción de creación del contrato

Ahora debe esperar. El procesamiento del contrato en Sepolia tardará unos 15–30 segundos. Parecerá que Remix no está haciendo mucho, pero tenga paciencia.

Una vez creado el contrato, aparece en la parte inferior de la pestaña Run (consulte la Figura 2-18).

![¡El contrato Faucet está activo!](images/ch2/maet_0218.png)

Figura 2-18. ¡El contrato Faucet está activo!

Observe que el contrato `Faucet` ahora tiene su propia dirección: Remix lo muestra como "Faucet at 0x4E7…6EA46" (aunque su dirección, las letras y números aleatorios, será distinta).

## Interactuar con el contrato

Recapitulemos lo aprendido hasta ahora. Los contratos de Ethereum son programas que controlan dinero y se ejecutan dentro de una máquina virtual llamada EVM. Se crean mediante una transacción especial que envía sus bytecodes para registrarlos en la blockchain. Una vez creados en la blockchain, tienen una dirección de Ethereum, al igual que las billeteras. Cada vez que alguien envía una transacción a una dirección de contrato, hace que el contrato se ejecute en la EVM, con la transacción como entrada. Las transacciones enviadas a direcciones de contrato pueden contener ether, datos o ambos. Si contienen ether, este se "deposita" en el saldo del contrato. Si contienen datos, estos pueden especificar una función con nombre del contrato y llamarla, pasando argumentos a la función.

### Ver la dirección del contrato en un explorador de bloques

Ahora tenemos un contrato registrado en la blockchain y podemos ver que tiene una dirección de Ethereum. Veámoslo en el [explorador de bloques *sepolia.etherscan.io*](http://sepolia.etherscan.io) para observar cómo se ve un contrato. En el IDE Remix, copie la dirección del contrato haciendo clic en el icono junto a su nombre (consulte la Figura 2-19).

![Copia de la dirección del contrato desde Remix](images/ch2/maet_0219.png)

Figura 2-19. Copia de la dirección del contrato desde Remix

Mantenga Remix abierto; volveremos a él más adelante. Ahora vaya con el navegador a [*sepolia.etherscan.io*](http://sepolia.etherscan.io) y pegue la dirección en el cuadro de búsqueda. Debería ver el historial de la dirección de Ethereum del contrato, como se muestra en la Figura 2-20.

![Dirección del contrato Faucet en el explorador de bloques Etherscan](images/ch2/maet_0220.png)

Figura 2-20. Dirección del contrato Faucet en el explorador de bloques Etherscan

### Agregar fondos al contrato

Por ahora, el contrato solo tiene una transacción en su historial: la transacción de creación del contrato. Como puede verse, el contrato tampoco tiene ether (saldo cero). Esto se debe a que no enviamos ether al contrato en la transacción de creación, aunque podríamos haberlo hecho.

¡Nuestro faucet necesita fondos! Nuestro primer proyecto será usar MetaMask para enviar ether al contrato. Todavía debería tener la dirección del contrato en el portapapeles (si no, cópiela de nuevo desde Remix). Abra MetaMask y envíele 0.01 ether, exactamente como lo haría con cualquier otra dirección de Ethereum (consulte la Figura 2-21).

![Envío de 0.01 ether a la dirección del contrato](images/ch2/maet_0221.png)

Figura 2-21. Envío de 0.01 ether a la dirección del contrato

En un minuto, si recarga el explorador de bloques Etherscan, mostrará otra transacción a la dirección del contrato y un saldo actualizado de 0.01 ether.

¿Recuerda la función `receive` de nuestro código *Faucet.sol*? Era así:

    receive() external payable {}

Cuando envía la transacción a la dirección del contrato, sin datos que especifiquen qué función llamar, se llama a esta función `receive`. Su transacción hizo que el contrato se ejecutara en la EVM y actualizara su saldo. ¡Ha agregado fondos a su faucet!

### Retirar fondos de nuestro contrato

A continuación, retiremos algunos fondos del faucet. Para retirar, debemos construir una transacción que llame a la función `withdraw` y le pase los argumentos `_withdrawAmount` y `_to`. Para simplificar por ahora, Remix construirá esa transacción y MetaMask la presentará para que la aprobemos.

Vuelva a la pestaña de Remix y observe el contrato en la pestaña Run. Debería ver un recuadro rojo con la etiqueta "withdraw" y un campo de entrada con la etiqueta "uint256 \_withdrawAmount, address \_to" (consulte la Figura 2-22).

![Función withdraw de Faucet.sol en Remix](images/ch2/maet_0222.png)

Figura 2-22. Función withdraw de *Faucet.sol* en Remix

Esta es la interfaz de Remix para el contrato. Nos permite construir transacciones que llaman a las funciones definidas en el contrato. Ingresaremos un `_withdrawAmount` y una dirección `_to` y haremos clic en el botón withdraw para generar la transacción.

Primero, determinemos el `_withdrawAmount`. Queremos intentar retirar 0.000001 ether, que es la cantidad máxima permitida por nuestro contrato. Recuerde que todos los valores monetarios en Ethereum se denominan internamente en wei, y nuestra función `withdraw` espera que `_withdrawAmount` también esté denominado en wei. La cantidad que queremos es 0.000001 ether, que equivale a 1,000,000,000,000 wei (un 1 seguido de 12 ceros).

Para la dirección `_to`, usaremos nuestra Account 1 de MetaMask.

> **Consejo**  
>
> Debido a una limitación de JavaScript, Remix no puede procesar un número tan grande como 10^17^. En cambio, lo encerramos entre comillas para que Remix pueda recibirlo como una cadena y manipularlo como un `BigNumber`. Si no lo encerramos entre comillas, el IDE Remix no podrá procesarlo y mostrará "Error encoding arguments: Error: Assertion failed."

Escriba `"1000000000000"` (con las comillas) en el cuadro `_withdrawAmount`, copie y pegue la dirección de su Account 1 desde MetaMask y haga clic en el botón transact. (Es posible que lo vea como el botón withdraw. La Figura 2-23 muestra una vista expandida de la función; si su vista no está expandida, el botón se llamará "withdraw").

![Haga clic en transact en Remix para crear una transacción de retiro](images/ch2/maet_0223.png)

Figura 2-23. Haga clic en transact en Remix para crear una transacción de retiro

MetaMask abrirá una ventana de transacción para que la apruebe. Haga clic en Submit para enviar su llamada de retiro al contrato (consulte la Figura 2-24).

![Transacción de MetaMask para llamar a la función withdraw](images/ch2/maet_0224.png)

Figura 2-24. Transacción de MetaMask para llamar a la función withdraw

Espere un minuto y luego recargue el explorador de bloques Etherscan para ver la transacción reflejada en el historial de la dirección del contrato `Faucet` (consulte la Figura 2-25).

![Etherscan muestra la transacción que llama a la función withdraw](images/ch2/maet_0225.png)

Figura 2-25. Etherscan muestra la transacción que llama a la función withdraw

Ahora vemos una transacción nueva con la dirección del contrato como destino y un valor de 0 ether. El saldo del contrato ha cambiado y ahora es de 0.009999 ether porque nos envió 0.000001 ether, tal como solicitamos.

Pero no vemos una transacción "OUT" en el historial de la dirección del contrato. ¿Dónde está el retiro saliente? Ha aparecido una pestaña nueva llamada Internal Transactions en la página del historial de la dirección del contrato. Como la transferencia de 0.000001 ether se originó en el código del contrato, es una transacción interna (también llamada *mensaje*). Haga clic en esa pestaña para verla (consulte la Figura 2-26).

Esta "transacción interna" fue enviada por el contrato en esta línea de código (de la función `withdraw` en *Faucet.sol*):

    _to.transfer(_withdrawAmount);

![Etherscan muestra la transacción interna que transfiere ether desde el contrato](images/ch2/maet_0226.png)

Figura 2-26. Etherscan muestra la transacción interna que transfiere ether desde el contrato

Para recapitular: envió una transacción desde su billetera MetaMask que contenía instrucciones en los datos para llamar a la función `withdraw` con un argumento `_withdrawAmount` de 0.000001 ether y una dirección. Esa transacción hizo que el contrato se ejecutara dentro de la EVM. Mientras la EVM ejecutaba la función `withdraw` del contrato `Faucet`, primero llamó a la función `require` y validó que la cantidad solicitada fuera menor o igual que el retiro máximo permitido de 0.000001 ether. Luego llamó a la función `transfer` para enviarle el ether. La ejecución de la función `transfer` generó una transacción interna que depositó 0.000001 ether en la dirección de su billetera desde el saldo del contrato. Esa es la que aparece en la pestaña Internal Transactions de Etherscan.

## Conclusión

En este capítulo, configuró una billetera con MetaMask y le agregó fondos utilizando un faucet de la red de prueba Sepolia. Recibió ether en la dirección de Ethereum de su billetera y luego envió ether a otra dirección.

Después escribió un contrato `Faucet` en Solidity. Usó el IDE Remix para compilar el contrato en bytecode de la EVM y luego usó Remix para formar una transacción y crear el contrato `Faucet` en la blockchain Sepolia. Una vez creado, el contrato `Faucet` tenía una dirección de Ethereum y usted le envió algo de ether. Por último, construyó una transacción para llamar a la función `withdraw` y solicitó con éxito 0.000001 ether. El contrato comprobó la solicitud y le envió 0.000001 ether mediante una transacción interna.

Puede que no parezca mucho, pero acaba de interactuar con éxito con software que controla dinero en una computadora mundial descentralizada.

Programaremos muchos más contratos inteligentes en Solidity en el Capítulo 7 y aprenderemos sobre buenas prácticas y consideraciones de seguridad en el Capítulo 9.
