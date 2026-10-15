# Capítulo 10. Tokens

La palabra *token* deriva del inglés antiguo *tācen*, que significa signo o símbolo. Se usa habitualmente para referirse a objetos similares a monedas, emitidos de forma privada para un propósito específico y con un valor intrínseco insignificante, como las fichas de transporte, lavandería y máquinas de videojuegos. Hoy, los tokens administrados en blockchains están redefiniendo la palabra para designar abstracciones basadas en blockchain que pueden poseerse y que representan activos, monedas o derechos de acceso.

La asociación entre la palabra *token* y un valor insignificante tiene mucho que ver con el uso limitado de las versiones físicas de los tokens. A menudo restringidos a empresas, organizaciones o lugares específicos, los tokens físicos no se intercambian fácilmente y suelen tener una sola función. Con los tokens de blockchain, estas restricciones desaparecen o, para ser más precisos, pueden redefinirse por completo. Muchos tokens de blockchain cumplen múltiples propósitos a escala mundial y pueden intercambiarse entre sí o por otras monedas en mercados líquidos globales. Al desaparecer las restricciones de uso y propiedad, la expectativa de un "valor insignificante" también queda en el pasado.

En este capítulo examinamos diversos usos de los tokens y cómo se crean. También analizamos atributos de los tokens, como la fungibilidad y el carácter intrínseco. Por último, examinamos los estándares y las tecnologías en los que se basan y experimentamos creando nuestros propios tokens.

## Cómo se usan los tokens

El uso más evidente de los tokens es como monedas privadas digitales. Sin embargo, este es solo uno de sus posibles usos. Los tokens pueden programarse para cumplir muchas funciones diferentes, que a menudo se superponen. Por ejemplo, un token puede otorgar simultáneamente un derecho de voto, un derecho de acceso y la propiedad de un recurso. Como muestra la siguiente lista, la moneda es apenas la primera "aplicación":

**Moneda**

Un token puede servir como una forma de moneda, con un valor determinado mediante intercambios privados.

**Recurso**

Un token puede representar un recurso obtenido o producido en una economía colaborativa o en un entorno de recursos compartidos; por ejemplo, un token de almacenamiento o CPU que represente recursos que pueden compartirse a través de una red.

**Activo**

Un token puede representar la propiedad de un activo intrínseco o extrínseco, tangible o intangible; por ejemplo, oro, bienes raíces, un automóvil, petróleo, energía, objetos de MMOG, etcétera.

**Acceso**

Un token puede representar derechos de acceso y conceder acceso a una propiedad digital o física, como un foro de discusión, un sitio web exclusivo, una habitación de hotel o un automóvil de alquiler.

**Participación accionaria**

Un token puede representar una participación accionaria en una organización digital (p. ej., una DAO) o una entidad jurídica (p. ej., una sociedad).

**Voto**

Un token puede representar derechos de voto en un sistema digital o jurídico.

**Objeto de colección**

Un token puede representar un objeto de colección digital (p. ej., CryptoPunks) o físico (p. ej., una pintura).

**Identidad**

Un token puede representar una identidad digital (p. ej., un avatar) o una identidad legal (p. ej., un documento nacional de identidad).

**Atestación**

Un token puede representar una certificación o atestación de un hecho por parte de alguna autoridad o de un sistema de reputación descentralizado (p. ej., un acta de matrimonio, un certificado de nacimiento o un título universitario).

**Utilidad**

Un token puede usarse para acceder a un servicio o pagarlo.

A menudo, un solo token abarca varias de estas funciones. A veces es difícil distinguirlas porque sus equivalentes físicos siempre han estado inseparablemente vinculados. Por ejemplo, en el mundo físico, una licencia de conducir (atestación) también es un documento de identidad (identidad), y ambos no pueden separarse. En el ámbito digital, las funciones que antes estaban mezcladas pueden separarse y desarrollarse de forma independiente (p. ej., una atestación anónima).

## Tokens y fungibilidad

[Wikipedia](https://oreil.ly/ge7zP) dice: "En economía, la fungibilidad es la propiedad de un bien o una mercancía cuyas unidades individuales son esencialmente intercambiables". Los tokens son *fungibles* cuando podemos sustituir cualquier unidad individual del token por otra sin que cambie su valor o su función.

Los *tokens* *no fungibles* (NFT) son tokens que representan, cada uno, un objeto tangible o intangible único y, por lo tanto, no son intercambiables. Por ejemplo, un token que representa la propiedad de una pintura *específica* de Van Gogh no equivale a otro token que representa un Picasso, aunque ambos puedan formar parte del mismo sistema de "tokens de propiedad de arte". Del mismo modo, un token que representa un objeto de colección digital *específico*, como un CryptoKitty concreto, no es intercambiable con ningún otro CryptoKitty. Cada NFT está asociado a un identificador único, como un número de serie.

Más adelante en este capítulo veremos ejemplos de tokens tanto fungibles como no fungibles.

> **Nota**
>
> Hay que tener en cuenta que *fungible* suele usarse con el sentido de "directamente intercambiable por dinero" (por ejemplo, una ficha de casino puede "canjearse por efectivo", mientras que las fichas de lavandería normalmente no). Este *no* es el sentido en que usamos la palabra aquí.

## Riesgo de contraparte

El *riesgo de contraparte* es el riesgo de que la *otra* parte de una transacción no cumpla sus obligaciones. Algunos tipos de transacciones tienen un riesgo de contraparte adicional porque intervienen más de dos partes. Por ejemplo, si se posee un certificado de depósito de un metal precioso y se vende a alguien, hay al menos tres partes en esa transacción: el vendedor, el comprador y el custodio del metal precioso. Alguien tiene el activo físico; por necesidad, pasa a ser parte del cumplimiento de la transacción y agrega riesgo de contraparte a cualquier transacción que involucre ese activo. En general, cuando un activo se negocia indirectamente mediante el intercambio de un token de propiedad, existe un riesgo de contraparte adicional por parte del custodio del activo. ¿Tiene el activo? ¿Reconocerá (o permitirá) la transferencia de propiedad basada en la transferencia de un token (como un certificado, una escritura, un título o un token digital)? En el mundo de los tokens digitales que representan activos, al igual que en el mundo no digital, es importante entender quién tiene el activo representado por el token y qué reglas se aplican a ese activo subyacente.

## Tokens y carácter intrínseco

La palabra *intrínseco* deriva del latín *intra*, que significa "desde dentro". Algunos tokens representan objetos digitales intrínsecos a la blockchain. Esos activos digitales se rigen por reglas de consenso, al igual que los propios tokens. Esto tiene una implicación importante: los tokens que representan activos intrínsecos no conllevan un riesgo de contraparte adicional. Si se poseen las claves de un CryptoKitty, no hay otra parte que tenga ese CryptoKitty en nuestro nombre: lo poseemos directamente. Se aplican las reglas de consenso de la blockchain, y la propiedad (es decir, el control) de las claves privadas equivale a la propiedad del activo, sin intermediarios.

En cambio, muchos tokens se usan para representar cosas *extrínsecas*, como bienes raíces, acciones corporativas con derecho a voto, marcas registradas, lingotes de oro y bonos. La propiedad de estos objetos, que no están "dentro" de la blockchain, se rige por leyes, costumbres y políticas separadas de las reglas de consenso que rigen el token. En otras palabras, los emisores y propietarios de tokens aún pueden depender de contratos no inteligentes del mundo real. Por ello, estos activos extrínsecos conllevan un riesgo de contraparte adicional porque están en manos de custodios, inscritos en registros externos o sujetos a leyes y políticas ajenas al entorno de la blockchain.

Una de las consecuencias más importantes de los tokens basados en blockchain es la capacidad de convertir activos extrínsecos en activos intrínsecos y eliminar así el riesgo de contraparte. Un buen ejemplo es pasar de una participación accionaria en una sociedad (extrínseca) a un token de participación o de voto en una DAO o una organización similar (intrínseca). Las stablecoins son otro ejemplo: actúan como tokens basados en blockchain vinculados a monedas fiduciarias y respaldados por activos extrínsecos, como letras del Tesoro y reservas de efectivo.

## ¿Utilidad, participación accionaria o afán de recaudar dinero?

Casi todos los proyectos de Ethereum parecen lanzarse con algún tipo de token. Pero ¿realmente necesitan tokens todos estos proyectos? El lema "Tokenizarlo todo" suena atractivo, pero la realidad es mucho más compleja. Los tokens pueden ser herramientas poderosas para organizar e incentivar comunidades, pero también se han vuelto sinónimo de especulación y publicidad exagerada.

En teoría, los tokens cumplen dos propósitos principales. Primero están los *tokens de utilidad.* Se diseñan para proporcionar acceso a un servicio o recurso dentro de un ecosistema específico. Por ejemplo, un token podría representar espacio de almacenamiento en una red descentralizada o acceso a funciones prémium en una DApp. En este caso, el valor del token está ligado a su función dentro de la plataforma. En segundo lugar, tenemos los *tokens de participación accionaria*, que supuestamente funcionan como acciones de una empresa. Estos tokens pueden representar propiedad o control en un proyecto, como derechos de voto en una DAO o una participación en las ganancias.

En la práctica, la distinción entre estas categorías suele ser difusa. Muchos tokens de utilidad siguen siendo en gran medida especulativos, y los usuarios los conservan más como activos que como credenciales de acceso. Los tokens similares a acciones pueden otorgar derechos de gobernanza, pero a menudo carecen de mecanismos que aseguren una participación significativa. Algunos proyectos integran sus tokens profundamente en sus modelos económicos, pero estos casos siguen siendo la excepción y no la regla.

Esto nos lleva a preguntarnos: ¿son los tokens inherentemente malos? En absoluto. Los tokens pueden ser increíblemente eficaces para crear e incentivar comunidades o impulsar la gobernanza descentralizada en una DAO. Pero la realidad es que la mayoría de los tokens se lanzan motivados principalmente por las ganancias, no por la utilidad. Si se piensa lanzar un token o invertir en uno, conviene hacerse algunas preguntas difíciles. ¿Cumple realmente el token un propósito necesario en el protocolo o es solo una herramienta de recaudación de fondos? ¿Funcionaría igual de bien el proyecto sin él? Responder estas preguntas con honestidad puede ayudar a distinguir la innovación genuina del entusiasmo impulsado por el marketing.

Está claro que el ámbito de los tokens sigue evolucionando y que los tokens no son inherentemente buenos ni malos; su valor depende de cómo se diseñen e implementen. El desafío está en separar lo significativo de lo irrelevante y resistir el atractivo de la próxima moneda meme.

> **Nota**
>
> Durante la redacción de este capítulo (enero de 2025), el presidente recién electo Donald Trump lanzó su propia moneda meme, que alcanzó una capitalización de mercado de $15 mil millones en un solo día. Muchos habían anticipado políticas favorables a las criptomonedas durante su presidencia, pero en cambio recibimos una moneda meme. Este suceso pone de relieve el frenesí especulativo que domina el mundo de las criptomonedas, donde el entusiasmo publicitario suele imponerse a la sustancia.

## ¡Es un pato!

Los tokens llevan mucho tiempo siendo una herramienta de recaudación de fondos favorita de las empresas emergentes. Prometen innovación, descentralización y, a veces, plena libertad financiera. Pero hay un problema: ofrecer valores al público es una actividad regulada en la mayoría de las jurisdicciones, y los tokens pueden cruzar fácilmente la línea que los convierte en valores. Durante años, los proyectos han intentado eludir las regulaciones al presentar sus tokens como "tokens de utilidad", afirmando que son solo una preventa de acceso a servicios futuros. La lógica es la siguiente: si el token no es una acción, no es un valor. Pero, como dice el viejo refrán, "Si camina como un pato y grazna como un pato, es un pato". Y los reguladores, especialmente la Comisión de Bolsa y Valores de Estados Unidos (SEC), están prestando atención a estos patos.

En los últimos años, la SEC ha adoptado una postura cada vez más agresiva contra las ofertas de tokens, frenando proyectos que intentan situarse entre la utilidad y la participación accionaria. Por ejemplo, en 2020, la SEC demandó a Ripple Labs por su token XRP, argumentando que era un valor no registrado. Ripple sostuvo que XRP era una moneda, no un valor, pero los fallos parciales del tribunal mostraron cuántos matices pueden tener estos casos.

Ni siquiera Ethereum quedó exento del escrutinio. En 2018, antiguos funcionarios de la SEC declararon que ether estaba "suficientemente descentralizado" y, por lo tanto, no era un valor. Pero tan recientemente como en 2024, la SEC sugirió que la transición de Ethereum a PoS podría volver a ponerlo bajo la lupa. ¿Por qué? Porque las recompensas de staking se parecen a los dividendos, y los dividendos son una característica distintiva de los valores. Estos acontecimientos muestran cuán cambiante e impredecible se ha vuelto el panorama regulatorio.

Lo fascinante, y frustrante, es la frecuencia con que estos casos se reducen a cuestiones semánticas. Los proyectos afirman que sus tokens son herramientas de utilidad, como boletos para un servicio. Pero si la motivación principal de los compradores es la especulación, la SEC ve un valor, sin más. La dificultad es que el marco jurídico utilizado para hacer estas determinaciones se creó mucho antes de que existiera la tecnología blockchain. La prueba de Howey, desarrollada en la década de 1940 para definir los contratos de inversión, no se diseñó para redes descentralizadas ni activos programables. Por ello, aplicarla a proyectos de criptomonedas no siempre es sencillo. Los innovadores quieren recaudar dinero y construir comunidades, pero los reguladores quieren proteger a los inversionistas de los engaños. ¿El resultado? Un drama judicial que se repite una y otra vez, con miles de millones de dólares y ecosistemas enteros en juego.

## Tokens en Ethereum

Los tokens de blockchain existían antes de Ethereum. En cierto sentido, la primera moneda de blockchain, Bitcoin, es en sí misma un token. También se desarrollaron muchas plataformas de tokens sobre Bitcoin y otras criptomonedas antes de Ethereum. Sin embargo, la introducción del primer estándar de tokens en Ethereum dio lugar a una explosión de tokens.

Vitalik Buterin propuso los tokens como una de las aplicaciones más evidentes y útiles de una blockchain programable de propósito general como Ethereum. De hecho, durante el primer año de Ethereum era común ver a Buterin y a otros con camisetas que llevaban el logotipo de Ethereum y un ejemplo de contrato inteligente en la espalda. Había varias versiones de esta camiseta, pero la más común mostraba una implementación de un token.

Antes de entrar en los detalles de la creación de tokens en Ethereum, es importante tener una visión general de cómo funcionan. Los tokens son distintos de ether porque el protocolo de Ethereum no sabe nada sobre ellos. Enviar ether es una acción intrínseca de la plataforma Ethereum, pero enviar tokens o incluso poseerlos no lo es. El saldo de ether de las cuentas de Ethereum se administra a nivel de protocolo, mientras que el saldo de tokens de las cuentas de Ethereum se administra a nivel de contrato inteligente. Para crear un token nuevo en Ethereum, es necesario crear un contrato inteligente nuevo. Una vez desplegado, el contrato inteligente se ocupa de todo, incluida la propiedad, las transferencias y los derechos de acceso. Se puede escribir el contrato inteligente para realizar todas las acciones necesarias de cualquier manera, pero probablemente lo más prudente sea seguir un estándar existente. A continuación examinaremos esos estándares.

## El estándar de tokens ERC-20

El primer estándar fue presentado en noviembre de 2015 por Fabian Vogelsteller como un ERC. Se le asignó automáticamente el número de issue 20 de GitHub, lo que dio origen al nombre "token ERC-20". La gran mayoría de los tokens se basan actualmente en el estándar ERC-20. La solicitud de comentarios ERC-20 finalmente se convirtió en EIP-20, pero aún suele denominarse por su nombre original, ERC-20.

ERC-20 es un estándar para tokens fungibles, lo que significa que las distintas unidades de un token ERC-20 son intercambiables y no tienen propiedades únicas. El [estándar ERC-20](https://oreil.ly/Psw-O) define una interfaz común para los contratos que implementan un token, de manera que se pueda acceder a cualquier token compatible y usarlo del mismo modo. La interfaz consta de varias funciones que deben estar presentes en toda implementación del estándar, así como de algunas funciones y atributos opcionales que los desarrolladores pueden agregar.

### Funciones y eventos obligatorios de ERC-20

Un contrato de token que cumpla con ERC-20 debe proporcionar, como mínimo, las siguientes funciones y eventos:

`totalSupply`

Devuelve el total de unidades de este token que existen actualmente. Los tokens ERC-20 pueden tener una oferta fija o variable.

`balanceOf`

Dada una dirección, devuelve el saldo de tokens de esa dirección.

`transfer`

Dadas una dirección y una cantidad, transfiere ese número de tokens a esa dirección desde el saldo de la dirección que ejecutó la transferencia.

`transferFrom`

Dados un remitente, un destinatario y una cantidad, transfiere tokens de una cuenta a otra. Se usa en combinación con `approve`.

`approve`

Dadas una dirección de destinatario y una cantidad, autoriza a esa dirección a ejecutar varias transferencias hasta alcanzar esa cantidad desde la cuenta que emitió la aprobación.

`allowance`

Dadas una dirección de propietario y una dirección de quien gasta, devuelve la cantidad restante que este último está autorizado a retirar del propietario.

`transfer`

Evento que se activa tras una transferencia exitosa (llamada a `transfer` o `transferFrom`), incluso en transferencias de valor cero.

`approval`

Evento registrado tras una llamada exitosa a `approve`.

#### Funciones opcionales de ERC-20

Además de las funciones obligatorias enumeradas en la sección anterior, el estándar también define las siguientes funciones opcionales:

**Nombre**

Devuelve el nombre legible por personas (p. ej., "dólares estadounidenses") del token.

**Símbolo**

Devuelve un símbolo legible por personas (p. ej., "USD") para el token.

**decimals**

Devuelve el número de decimales utilizados para dividir las cantidades de tokens. Por ejemplo, si el número de decimales es 2, una cantidad de tokens de 1,000 en realidad significa un saldo de 10.

#### La interfaz ERC-20 definida en Solidity

Así se ve una especificación de la interfaz ERC-20 en Solidity:

```solidity
contract ERC20 {
   function totalSupply() public view returns (uint256 theTotalSupply);
   function balanceOf(address _owner) public view returns (uint256 balance);
   function transfer(address _to, uint256 _value) public returns (bool success);
   function transferFrom(address _from, address _to, uint256 _value) public returns
      (bool success);
   function approve(address _spender, uint256 _value) public returns (bool success);
   function allowance(address _owner, address _spender) public view returns
      (uint256 remaining);
   event Transfer(address indexed _from, address indexed _to, uint256 _value);
   event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}
```

#### Estructuras de datos de ERC-20

Si examinamos cualquier implementación de ERC-20, veremos que contiene dos estructuras de datos: una para llevar el registro de los saldos y otra para las autorizaciones de gasto. En Solidity se implementan con un *mapeo de datos*.

El primer mapeo de datos implementa una tabla interna de saldos de tokens por propietario. Esto permite al contrato de token llevar el registro de quién posee los tokens. Cada transferencia resta de un saldo y suma a otro:

```solidity
mapping(address account => uint256) _balances;
```

La segunda estructura de datos es un mapeo de autorizaciones de gasto. Como veremos en la siguiente sección, con los tokens ERC-20, el propietario de un token puede delegar autoridad a alguien para que gaste una cantidad específica (la autorización de gasto) de su saldo. El contrato ERC-20 lleva el registro de las autorizaciones con un mapeo bidimensional, cuya clave principal es la dirección del propietario del token, que se mapea a una dirección autorizada para gastar y a un monto autorizado:

```solidity
mapping(address account => mapping(address spender => uint256)) public _allowances;
```

#### Flujos de trabajo de ERC-20: "Transfer" y "approve y transferFrom"

El estándar de tokens ERC-20 tiene dos funciones de transferencia. Quizás se pregunte por qué.

ERC-20 permite dos flujos de trabajo diferentes. El primero es un flujo sencillo de una sola transacción que usa la función `transfer`. Este es el flujo que usan las billeteras para enviar tokens a otras billeteras. La gran mayoría de las transacciones de tokens se realizan con el flujo `transfer`.

Ejecutar el contrato de transferencia es muy sencillo. Si Alice quiere enviar 10 tokens a Bob, su billetera envía una transacción a la dirección del contrato de token, llamando a la función `transfer` con la dirección de Bob y `10` como argumentos. El contrato de token ajusta el saldo de Alice (–10) y el de Bob (+10) y emite un evento `Transfer`.

El segundo flujo consta de dos transacciones y usa `approve` seguido de `transferFrom`. Este flujo permite al propietario de un token delegar su control a otra dirección. Se usa principalmente para delegar el control a un contrato para distribuir tokens, pero las plataformas de intercambio también pueden usarlo. Por ejemplo, si una empresa vende tokens para una ICO, puede usar `approve` para autorizar a la dirección de un contrato de venta colectiva a distribuir cierta cantidad de tokens. El contrato de venta colectiva puede entonces usar `transferFrom` para transferir desde el saldo del propietario del contrato de token a cada comprador del token, como se ilustra en la Figura 10-1.

![El flujo de dos pasos approve y transferFrom de los tokens ERC-20](images/ch10/maet_1001.png)

**Figura 10-1.** El flujo de dos pasos `approve` y `transferFrom` de los tokens ERC-20

> **Nota**
>
> Una *oferta inicial de monedas* (ICO) es un mecanismo de financiamiento colectivo que usan empresas y organizaciones para recaudar dinero mediante la venta de tokens. El término deriva de *oferta pública inicial* (IPO), el proceso mediante el cual una empresa pública ofrece acciones a inversionistas en una bolsa de valores. A diferencia de los mercados de IPO, que están muy regulados, las ICO son abiertas, globales y desordenadas.

Para el flujo `approve` y `transferFrom` se necesitan dos transacciones. Supongamos que Alice quiere permitir que el contrato `AliceICO` venda el 50% de todos los tokens AliceCoin a compradores como Bob y Charlie. Primero, Alice lanza el contrato ERC-20 `AliceCoin`, emitiendo todos los AliceCoin a su propia dirección. Después, Alice lanza el contrato `AliceICO`, que puede vender tokens a cambio de ether. A continuación, Alice inicia el flujo `approve` y `transferFrom`. Envía una transacción al contrato `AliceCoin`, llamando a `approve` con la dirección del contrato `AliceICO` y el 50% de `totalSupply` como argumentos. Esto activará el evento `Approval`. Ahora el contrato `AliceICO` puede vender AliceCoin.

Cuando el contrato `AliceICO` recibe ether de Bob, debe enviarle algunos AliceCoin a cambio. Dentro del contrato `AliceICO` hay un tipo de cambio entre AliceCoin y ether. El tipo de cambio que Alice estableció al crear el contrato `AliceICO` determina cuántos tokens recibirá Bob por la cantidad de ether enviada al contrato `AliceICO`. Cuando el contrato `AliceICO` llama a la función `transferFrom` de AliceCoin, establece la dirección de Alice como remitente y la de Bob como destinatario, y usa el tipo de cambio para determinar en el campo `value` cuántos tokens AliceCoin se transferirán a Bob. El contrato `AliceCoin` transfiere el saldo de la dirección de Alice a la de Bob y activa un evento `Transfer`. El contrato `AliceICO` puede llamar a `transferFrom` un número ilimitado de veces, siempre que no supere el límite de aprobación establecido por Alice. El contrato `AliceICO` puede llevar el registro de cuántos tokens AliceCoin puede vender llamando a la función `allowance`.

#### ERC-2612: transferencias sin gas con "permit"

En el Capítulo 9 exploramos en profundidad los flujos tradicionales `transfer` y `transferFrom` con tokens ERC-20. Si bien estos métodos han sido la base de las transferencias de tokens, tienen sus limitaciones. Una transferencia directa requiere que el propietario del token envíe una transacción en la cadena. En el flujo approve y transferFrom, el propietario envía la transacción approve inicial, mientras que quien gasta o el contrato autorizado envía la posterior transferFrom. Por lo tanto, el propietario necesita criptomoneda nativa para pagar la aprobación, lo que puede ser un obstáculo considerable para una billetera nueva sin fondos nativos.

Aquí entra en juego ERC-2612. Es una ingeniosa incorporación al estándar de tokens ERC-20 que permite a los usuarios aprobar transferencias de tokens sin tener que interactuar directamente con la blockchain. Funciona así: en lugar de enviar una transacción en la cadena para aprobar una transferencia, se firman los datos necesarios, como la dirección del destinatario, el número de tokens, el tiempo de vencimiento y un nonce, mediante la billetera. Esto crea una firma, y quien necesite ejecutar la transferencia (ya sea el destinatario u otra parte) puede enviar esa firma al método `permit` del contrato de token. El contrato lee la firma, la verifica y procesa la aprobación, todo sin que el usuario tenga que pagar gas por el paso inicial. Es eficiente y seguro, y elimina buena parte de las complicaciones del proceso.

Para que ERC-2612 funcione, los desarrolladores de tokens deben ampliar sus contratos ERC-20 para incluir esta funcionalidad. Una vez incorporada, ofrece dos beneficios clave para los usuarios. Primero, simplifica todo el proceso. En lugar de tener que aprobar cada transferencia, los usuarios pueden otorgar permiso con una firma. Segundo, ahorra costos de gas al reducir el número de transacciones necesarias.

#### Implementaciones de ERC-20

Aunque es posible implementar un token compatible con ERC-20 en unas 30 líneas de código Solidity, la mayoría de las implementaciones son más complejas. Esto se debe a la necesidad de contemplar posibles vulnerabilidades de seguridad. El estándar EIP-20 menciona dos implementaciones, desarrolladas por Consensys y OpenZeppelin. El token EIP-20 de Consensys no recibe mantenimiento desde 2018, mientras que el [token ERC-20 de OpenZeppelin](https://oreil.ly/7d7RD) se convirtió en el estándar de facto para los desarrolladores y recibe mantenimiento activo. Esta implementación es la base de las bibliotecas de OpenZeppelin que implementan tokens compatibles con ERC-20 más complejos, con límites de recaudación, bóvedas tokenizadas, cronogramas de adquisición de derechos y otras funciones.

### Lanzamiento de nuestro propio token ERC-20

Creemos y lancemos nuestro propio token. Para este ejemplo usaremos el framework Foundry. El ejemplo supone que ya se ha [instalado Foundry](https://oreil.ly/dfDGh), que se lo ha configurado y que se conoce su funcionamiento básico.

Llamaremos a nuestro token "Mastering Ethereum Token", con el símbolo MET. Primero, creemos e inicialicemos un directorio de proyecto de Foundry con los siguientes comandos:

```bash
$ mkdir METoken
$ cd METoken
$ forge init
```

Ahora debería tener la siguiente estructura de directorios:

```
METoken/
├── foundry.toml
├── lib
│   └── forge-std
│       └── ...
├── README.md
├── script
│   └── Counter.s.sol
├── src
│   └── Counter.sol
└── test
    └── Counter.t.sol
```

`Counter` es el contrato de ejemplo predeterminado de Foundry, que incluye sus propios scripts de prueba y despliegue. Eliminaremos todos sus archivos relacionados para dejar espacio a nuestro contrato de token.

Para nuestro ejemplo importaremos la biblioteca OpenZeppelin, el estándar de la industria para tokens basados en Solidity:

```bash
$ forge install OpenZeppelin/openzeppelin-contracts
[...]
Installed openzeppelin-contracts v5.2.0
```

Dentro de *METoken/lib/openzeppelin-contracts/contracts* ahora podemos ver todos los contratos de OpenZeppelin. La biblioteca OpenZeppelin incluye mucho más que el token ERC-20, pero solo usaremos una pequeña parte.

A continuación, escribamos nuestro contrato de token. Cree un archivo nuevo, *METoken.sol*, y copie el código del Ejemplo 10-1. Nuestro contrato es muy sencillo porque hereda toda su funcionalidad de la biblioteca OpenZeppelin.

**Ejemplo 10-1. METoken.sol: un contrato Solidity que implementa un token ERC-20**

```solidity
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract METoken is ERC20 {
    constructor(uint256 initialSupply) ERC20("METoken", "MET") {
        _mint(msg.sender, initialSupply);
    }
}
```

Aquí pasamos `"METoken"` y `"MET"` como nombre y símbolo al constructor del contrato ERC-20. La oferta inicial del token se proporciona durante el despliegue como parámetro del constructor y se enviará a quien despliega este contrato de token (`msg.sender`). Usamos el valor predeterminado de decimales, 18, que es el estándar ampliamente adoptado para los tokens ERC-20.

Ahora podemos usar Foundry para compilar el contrato `METoken`:

```bash
$ forge build
[⠊] Compiling...
[⠒] Compiling 6 files with Solc 0.8.28
[⠢] Solc 0.8.28 finished in 36.18ms
Compiler run successful!
```

Preparemos un script de despliegue para llevar el contrato `METoken` a la blockchain. Cree un archivo nuevo, *METokenDeploy.s.sol*, en la carpeta *METoken/script* y copie el siguiente código:

```solidity
pragma solidity 0.8.28;
import {Script, console} from "forge-std/Script.sol";
import {METoken} from "../src/METoken.sol";
contract METokenDeployer is Script {
    METoken public _METoken;
    function run() public {
        vm.startBroadcast();
        _METoken = new METoken(50_000_000e18);
        vm.stopBroadcast();
    }
}
```

En este ejemplo pasamos 50 millones como oferta inicial. ¿Notó que multiplicamos por 1e18? Esos son los decimales del token. Recuerde que, para tener un saldo de *X* tokens, necesitamos una cantidad de tokens de *X* × 10 ^ decimals.

> **Nota**
>
> El sufijo *.s.sol* para scripts es una convención de nombres de Foundry que permite identificar rápidamente el propósito de un archivo. No es un requisito, basta con colocar los archivos de script dentro de la carpeta script, pero es una práctica muy recomendable que será útil durante el desarrollo. Lo mismo se aplica a las pruebas con el sufijo *.t.sol*.

Antes de desplegar en una de las redes de prueba de Ethereum, iniciemos una blockchain local para probar todo. Usaremos otra herramienta del conjunto de Foundry: Anvil, un nodo de desarrollo local de Ethereum. Para usarlo, abra una terminal nueva y escriba `anvil`. La consola mostrará una lista de cuentas disponibles, sus claves privadas, el ID de cadena, la URL de RPC y otra información. La URL de RPC es el punto de conexión que permite a Foundry (o a cualquier cliente de Ethereum) comunicarse con nuestro nodo local de blockchain para realizar transacciones, desplegar contratos y recuperar datos. El RPC predeterminado de Anvil es *http://127.0.0.1:8545*. Para indicar a nuestro script de despliegue que despliegue en nuestra blockchain local, debemos proporcionar la URL de RPC de Anvil como parámetro de consola con la opción `--rpc-url "http://127.0.0.1:8545"`.

La última pieza que necesitamos es la clave privada de la cuenta que realiza el despliegue. Como esta es una blockchain local, las direcciones que usamos en la red principal o las redes de prueba de Ethereum no tendrán fondos aquí, y no queremos exponer claves privadas reales innecesariamente. En su lugar, usaremos las cuentas de prueba que Anvil genera al iniciarse. Estas cuentas vienen precargadas con 10,000 ETH en nuestra cadena local, lo que las hace ideales para desarrollo y pruebas.

Estamos listos para desplegar nuestro token ejecutando:

```bash
$ forge script script/METokenDeploy.s.sol --broadcast --rpc-url "http://127.0.0.1:8545"
--private-key <DEPLOYER_PRIVATE_KEY>
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.
```

> **Nota**
>
> Quizás se pregunte para qué sirve la opción `--broadcast`. Sirve para indicar a Foundry que transmita efectivamente la transacción a la blockchain. Sin ella, Foundry solo simularía la transacción.

La salida de la consola nos informó que el script de despliegue se ejecutó correctamente. Si miramos la terminal donde ejecutamos Anvil, notaremos mucha actividad, incluida la creación de nuestro contrato:

```
   Transaction: 0xd01e3a90e1f2ee60112658e92f4ebf04c24df67d2ec1315cfb79d145729d15ec
    Contract created: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
    Gas used: 941861
    Block Number: 1
    Block Hash: 0x748b6058dea932317cacf45bb63be82f253554f359b97ace224e35979a92b00a
    Block Time: "Fri, 31 Jan 2025 19:10:42 +0000"
```

Nuestro METoken se desplegó correctamente en la siguiente dirección:

```
0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Como alternativa, podemos desplegar nuestro token usando el comando de consola `create` de forge:

```bash
$ forge create METoken --broadcast --rpc-url http://127.0.0.1:8545 --private-key
<DEPLOYER_PRIVATE_KEY> --constructor-args 50000000000000000000000000
```

Aquí, la oferta total se pasa como argumento del constructor, teniendo en cuenta los decimales.

#### Interacción con METoken

Podemos interactuar con nuestro contrato de varias maneras. Podríamos usar Remix (como hicimos en el Capítulo 2), un REPL de Solidity como Chisel de Foundry o una biblioteca de JavaScript como ethers.js. También podríamos ejecutar transacciones mediante scripts de Foundry, que es lo que usaremos en nuestros ejemplos.

Las direcciones de Ethereum son cadenas hexadecimales de 40 caracteres, que no son precisamente fáciles de leer. Para que nuestros ejemplos sean más claros, asignaremos apodos a las dos direcciones que usamos: Deployer para la dirección que desplegó el contrato MET y Alice para una dirección secundaria. Para Alice también usaremos una de las direcciones de Anvil con fondos precargados.

Creemos un script de Foundry para consultar el saldo de METoken de Deployer y enviar algunos METoken a Alice. Copie el contenido del siguiente fragmento de código y péguelo en un archivo nuevo, *METoken/script/METokenInteraction.s.sol*:

```solidity
pragma solidity 0.8.28;
import {Script, console} from "forge-std/Script.sol";
import {METoken} from "../src/METoken.sol";
contract METokenInteraction is Script {
    METoken public _METoken = METoken(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    address alice = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    function run() public {
        vm.startBroadcast();
        uint256 ourBalance = _METoken.balanceOf(msg.sender);
        console.log("Deployer initial balance:", ourBalance);
        uint256 aliceBalance = _METoken.balanceOf(alice);
        console.log("Alice initial balance:", aliceBalance);
        uint256 amountToTransfer = 50e18;
        bool success = _METoken.transfer(alice, amountToTransfer);
        if (success) {
            console.log("Transfer successful");
        } else {
            console.log("Transfer failed");
            revert();
        }
        ourBalance = _METoken.balanceOf(msg.sender);
        console.log("Deployer final balance:", ourBalance);
        aliceBalance = _METoken.balanceOf(alice);
        console.log("Alice final balance:", aliceBalance);
        vm.stopBroadcast();
    }
}
```

Podemos ejecutar el script con el siguiente comando de consola:

```bash
$ forge script script/METokenInteraction.s.sol --private-key <DEPLOYER_PRIVATE_KEY>
--rpc-url "http://127.0.0.1:8545" -vv
```

Es importante usar la misma clave privada que se usó para el despliegue. Esto asegura que `msg.sender` corresponda a la dirección que realizó el despliegue, que posee la oferta inicial de tokens.

> **Nota**
>
> Las opciones `-v` de Foundry controlan el nivel de detalle de la salida al ejecutar comandos como `forge script` o `forge build`. Aumentar el número de `v` aumenta el detalle de la salida para incluir más información. Para mostrar los registros de consola necesitamos al menos `-vv`, mientras que `-vvvv` proporciona el máximo detalle.

Una vez que ejecutemos el script, se imprimirá lo siguiente en la consola:

```bash
[⁘] Compiling...
[:] Compiling 1 files with Solc 0.8.28
[⁖] Solc 0.8.28 finished in 312.39ms
Compiler run successful!
Script ran successfully.
== Logs ==
  Deployer initial balance: 50000000000000000000000000
  Alice initial balance: 0
  Transfer successful
  Deployer final balance: 49999950000000000000000000
  Alice final balance: 50000000000000000000
```

En este script, primero registramos los saldos actuales de tokens de quien realizó el despliegue y de Alice. Después transferimos 50 tokens del primero a Alice y volvemos a registrar los saldos. Hay que tener en cuenta que 50 tokens se representan como 50e18 porque nuestro token tiene 18 decimales; de ahí la gran cantidad de ceros.

#### Envío de tokens ERC-20 a direcciones de contratos

Hasta ahora configuramos un token ERC-20 y transferimos algunos tokens de una cuenta a otra. Todas las cuentas que usamos para estas demostraciones son EOA, lo que significa que están controladas por una clave privada, no por un contrato. ¿Qué ocurre si enviamos tokens MET a una dirección de contrato? ¡Averigüémoslo!

Primero despleguemos otro contrato en nuestro entorno de prueba. Para este ejemplo usaremos el contrato *NaiveFaucet.sol* que se muestra a continuación:

```solidity
pragma solidity 0.8.28;
contract NaiveFaucet {
    receive() external payable {}
    // Función para retirar Ether del contrato
    function withdraw(uint256 amount) public {
        require(amount <= address(this).balance, "Insufficient balance in faucet");
        payable(msg.sender).transfer(amount);
    }
}
```

Nuestro directorio debería verse así:

```
METoken/
+---- src
|   +---- NaiveFaucet.sol
|   +---- METoken.sol
```

Compilemos y despleguemos el contrato `NaiveFaucet`:

```bash
$ forge create NaiveFaucet --broadcast --rpc-url http://localhost:8545
--private-key <DEPLOYER_PRIVATE_KEY>
[⁘] Compiling...
[:] Compiling 1 files with Solc 0.8.28
[⁖] Solc 0.8.28 finished in 8.69ms
Compiler run successful!
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Transaction hash: 0x4d1947547e3cfec8db670f3c1b7ff309b41de8aacee42165578a3ddf8619f63f
```

Muy bien, nuestro contrato `NaiveFaucet` se desplegó en la dirección `0x9fE46736679​d2D9a65F0992F2272dE9f3c7fa6e0`. Ahora enviemos algunos MET al contrato `NaiveFaucet` copiando el siguiente script en *METoken/script/METokenSend.s.sol*:

```solidity
pragma solidity 0.8.28;
import {Script, console} from "forge-std/Script.sol";
import {METoken} from "../src/METoken.sol";
contract METokenSend is Script {
    METoken public _METoken = METoken(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    address naiveFaucet = 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0;
    function run() public {
        vm.startBroadcast();
        uint256 amountToSend = 100e18;
        bool success = _METoken.transfer(naiveFaucet, amountToSend);
        if (success) {
            console.log("Transfer successful");
        } else {
            console.log("Transfer failed");
            revert();
        }
        uint256 faucetBalance = _METoken.balanceOf(naiveFaucet);
        console.log("Faucet balance:", faucetBalance);
        vm.stopBroadcast();
    }
}
```

Podemos ejecutarlo con:

```bash
$ forge script script/METokenSend.s.sol --private-key <DEPLOYER_PRIVATE_KEY>
--rpc-url "http://127.0.0.1:8545" -vv
[⁘] Compiling...
[:] Compiling 1 files with Solc 0.8.28
[⁖] Solc 0.8.28 finished in 413.41ms
Compiler run successful!
Script ran successfully.
== Logs ==
  Transfer successful
  Faucet balance: 100000000000000000000
```

De nuevo, debemos usar la clave privada de quien realizó el despliegue para que funcione, porque esa es la dirección que inicia la transferencia.

Transferimos 100 MET al contrato `NaiveFaucet`. Ahora bien, ¿cómo retiramos esos tokens?

Recuerde que *NaiveFaucet.sol* es un contrato bastante sencillo. Solo tiene una función, `withdraw`, que sirve para retirar *ether*. No tiene una función para retirar MET ni ningún otro token ERC-20. Si usamos `withdraw`, intentará enviar ether, pero como `NaiveFaucet` aún no tiene saldo de ether, fallará.

El contrato `METoken` sabe que `NaiveFaucet` tiene un saldo, pero la única manera de transferir ese saldo es recibir una llamada a `transfer` desde la dirección del contrato. De algún modo, necesitamos hacer que el contrato `NaiveFaucet` llame a la función `transfer` de `METoken`.

Si se pregunta qué hacer a continuación, no lo haga. Este problema no tiene solución. Los MET enviados a `NaiveFaucet` quedan atrapados para siempre. Solo el contrato `NaiveFaucet` puede transferirlos, y el contrato `NaiveFaucet` no tiene código para llamar a la función `transfer` de un contrato de token ERC-20.

Quizás haya previsto este problema. Lo más probable es que no. De hecho, tampoco lo previeron cientos de usuarios de Ethereum que transfirieron accidentalmente diversos tokens a contratos que no tenían ninguna capacidad para gestionar ERC-20. A lo largo de los años, una asombrosa cantidad de millones de dólares ha quedado "atrapada" de esta manera y se ha perdido para siempre.

#### Demostración del flujo "approve y transferFrom"

Nuestro contrato `NaiveFaucet` no podía gestionar tokens ERC-20. Enviarle tokens con la función `transfer` provocó su pérdida. Reescribamos ahora el contrato para que gestione tokens ERC-20. En concreto, lo convertiremos en un faucet que entregue MET a cualquiera que lo solicite.

Nuestro nuevo contrato de faucet, *METFaucet.sol*, se verá como en el Ejemplo 10-2.

**Ejemplo 10-2. METFaucet.sol: un faucet para METoken**

```solidity
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract METFaucet {
    IERC20 public _METoken;
    address public _METOwner;
    constructor(address _metokenAddress, address metOwner) {
        _METoken = IERC20(_metokenAddress);
        _METOwner = metOwner;
    }
    // Función para retirar METoken del contrato
    function withdraw(uint256 amount) public {
        require(amount <= 10e18, "At most 10 MET");
        require(_METoken.transferFrom(_METOwner, msg.sender, amount), "Transfer failed");
    }
}
```

Hicimos bastantes cambios al ejemplo básico de `Faucet`. Como `METFaucet` usará la función `transferFrom` de `METoken`, necesitará dos variables adicionales. Una contendrá la dirección del contrato `METoken`. La otra contendrá la dirección del propietario de los MET, quien aprobará los retiros del faucet. En nuestro caso, el propietario es quien realizó el despliegue, porque recibió la oferta inicial. El contrato `METFaucet` llamará a `METoken.transferFrom` y le indicará que mueva MET desde el propietario a la dirección de la que provino la solicitud de retiro del faucet.

Declaramos estas dos variables aquí:

```solidity
IERC20 public _METoken;
address public _METOwner;
```

Como nuestro faucet debe inicializarse con las direcciones correctas de `METoken` y `METOwner`, debemos declarar un constructor personalizado:

```solidity
// Constructor de METFaucet: proporcionar la dirección del contrato METoken y
// la dirección del propietario desde la que se nos autorizará a usar transferFrom
constructor(address _metokenAddress, address metOwner) {
    _METoken = IERC20(_metokenAddress);
    _METOwner = metOwner;
}
```

El siguiente cambio está en la función `withdraw`. En lugar de llamar a `transfer`, `METFaucet` usa la función `transferFrom` de `METoken` y solicita a `METoken` que transfiera MET al destinatario del faucet:

```solidity
// Usar la función transferFrom de METoken
_METoken.transferFrom(metOwner, msg.sender, withdraw_amount);
```

Por último, como nuestro faucet ya no envía ether, probablemente deberíamos impedir que alguien envíe ether a `METFaucet`, porque no queremos que quede atrapado. Para rechazar ether entrante basta con eliminar la función `receive` de nuestro contrato.

Ahora que el código de *METFaucet.sol* está listo, podemos desplegarlo proporcionando la dirección del token MET y la de quien lo desplegó como parámetros de dirección:

```bash
$ forge create METFaucet --broadcast --rpc-url http://localhost:8545 --private-key
<DEPLOYER_PRIVATE_KEY> --constructor-args
"0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512""0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
[⁘] Compiling...
No files changed, compilation skipped
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
Transaction hash: 0xa8bfbde9489ee40d41328a80538d0d3e7778b7f3b896c1d51897bf85bb25cec2
```

El contrato `METFaucet` se desplegó en `0xCf7Ed3AccA5a467e9e704C703E​8D87F634fB0Fc9`, y estamos casi listos para probarlo. Primero escribamos un script *METApprove.s.sol* para permitir que el contrato `METFaucet` gaste los tokens MET del propietario:

```solidity
pragma solidity 0.8.28;
import {Script, console} from "forge-std/Script.sol";
import {METoken} from "../src/METoken.sol";
contract METApprove is Script {
    METoken public _METoken = METoken(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    address _METFaucet = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;
    function run() public {
        vm.startBroadcast();
        bool success = _METoken.approve(_METFaucet, type(uint256).max);
        if (success) {
            console.log("Approve successful");
        } else {
            console.log("Approve failed");
            revert();
        }
        vm.stopBroadcast();
    }
}
```

Podemos ejecutarlo con:

```bash
$ forge script script/METApprove.s.sol --broadcast --private-key <DEPLOYER_PRIVATE_KEY>
--rpc-url "http://127.0.0.1:8545" -vv
[⠊] Compiling...
[⠰] Compiling 2 files with Solc 0.8.28
[⠔] Solc 0.8.28 finished in 327.90ms
Compiler run successful!
Script ran successfully.
== Logs ==
  Approve successful
```

Ahora podemos escribir un script para que una dirección secundaria interactúe con el contrato `METFaucet`, retire 10 tokens MET y registre su saldo antes y después de la operación. Creemos un script *METFaucetWithdraw.s.sol* como el del Ejemplo 10-3.

**Ejemplo 10-3. METFaucetWithdraw: un script de retiro del faucet**

```solidity
pragma solidity 0.8.28;
import {Script, console} from "forge-std/Script.sol";
import {METoken} from "../src/METoken.sol";
import {METFaucet} from "../src/METFaucet.sol";
contract METFaucetWithdraw is Script {
    METoken public _METoken = METoken(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
    METFaucet public _METFaucet = METFaucet(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9);
    function run() public {
        vm.startBroadcast();
       uint256 balanceBefore = _METoken.balanceOf(msg.sender);
       console.log("Alice balance before:", balanceBefore);
       _METFaucet.withdraw(10e18);
       uint256 balanceAfter = _METoken.balanceOf(msg.sender);
       console.log("Alice balance after:", balanceAfter);
        vm.stopBroadcast();
    }
}
```

Ahora podemos ejecutar este script desde la dirección de Alice proporcionando su clave privada al ejecutarlo:

```bash
$ forge script script/METFaucetWithdraw.s.sol --broadcast --private-key <ALICE_PRIVATE_KEY>
--rpc-url "http://127.0.0.1:8545" -vv
[⠊] Compiling...
[⠰] Compiling 1 files with Solc 0.8.28
[⠔] Solc 0.8.28 finished in 330.97ms
Compiler run successful!
Script ran successfully.
== Logs ==
  Alice balance before: 0
  Alice balance after: 10000000000000000000
```

Como se puede ver en los resultados, podemos usar el flujo `approve` y `transferFrom` para autorizar a un contrato a transferir tokens definidos en otro token. Si se usan correctamente, las EOA y otros contratos pueden usar tokens ERC-20. Sin embargo, la responsabilidad de gestionar correctamente los tokens ERC-20 recae en la interfaz de usuario. Si un usuario intenta incorrectamente transferir tokens ERC-20 a una dirección de contrato y ese contrato no está preparado para recibir tokens ERC-20, los tokens se perderán.

### Problemas de los tokens ERC-20

La adopción del estándar de tokens ERC-20 ha sido verdaderamente explosiva. Se han lanzado miles de tokens, tanto para experimentar con las nuevas capacidades como para recaudar fondos en diversas subastas de "financiamiento colectivo" e ICO. Sin embargo, existen algunos posibles problemas, como vimos con la transferencia de tokens a direcciones de contratos.

Uno de los problemas menos evidentes de los tokens ERC-20 es que ponen de manifiesto diferencias sutiles entre los tokens y el propio ether. Mientras que ether se transfiere mediante una transacción cuyo destino es la dirección del destinatario, las transferencias de tokens ocurren dentro del *estado del contrato del token específico* y tienen como destino el contrato de token, no la dirección del destinatario. El contrato de token lleva el registro de los saldos y emite eventos. En una transferencia de tokens, en realidad no se envía ninguna transacción al destinatario del token. En su lugar, la dirección del destinatario se agrega a un mapeo dentro del propio contrato de token. Una transacción que envía ether a una dirección cambia el estado de una dirección. Una transacción que transfiere un token a una dirección solo cambia el estado del contrato de token, no el de la dirección del destinatario. Incluso una billetera compatible con tokens ERC-20 no detecta un saldo de tokens a menos que el usuario agregue explícitamente un contrato de token específico para "vigilarlo". Algunas billeteras vigilan los contratos de tokens más populares para detectar saldos de las direcciones que controlan, pero esto se limita a una pequeña fracción de los contratos ERC-20 existentes.

De hecho, es poco probable que un usuario *quiera* llevar el registro de todos los saldos en todos los contratos de tokens ERC-20 posibles. Muchos tokens ERC-20 se parecen más al correo no deseado que a tokens utilizables. Crean automáticamente saldos para cuentas que tienen actividad con ether a fin de atraer usuarios. Si se tiene una dirección de Ethereum con un largo historial de actividad, especialmente si se creó durante la preventa, se la encontrará llena de tokens "basura" que aparecieron de la nada. Por supuesto, la dirección no está realmente llena de tokens; son los contratos de tokens los que contienen la dirección. Solo se ven estos saldos si el explorador de bloques o la billetera que se usa para consultar la dirección vigila esos contratos de tokens.

Los tokens no se comportan igual que ether. Ether se envía con la función `send` y lo acepta cualquier función payable de un contrato o cualquier dirección de propiedad externa. Los tokens se envían mediante las funciones `transfer` o `approve` y `transferFrom`, que existen solo en el contrato ERC-20 y no activan (al menos en ERC-20) ninguna función payable en un contrato destinatario. Se pretende que los tokens funcionen igual que una criptomoneda como ether, pero tienen ciertas diferencias que rompen esa ilusión.

Centrémonos en el patrón `approve` y `transferFrom`. Para los usuarios nuevos, el sistema `approve`-`transferFrom` puede ser especialmente engañoso. Muchos suponen que transferir tokens es una sola operación, por lo que encontrarse con un proceso de dos pasos resulta confuso y poco intuitivo. Peor aún, la acción `approve` parece inofensiva, pero puede ser una trampa. Al aprobar un contrato, los usuarios podrían otorgar permisos ilimitados sin saberlo, permitiendo que actores maliciosos les vacíen los tokens más adelante. Esta falta de comprensión facilita los ataques de phishing y pone de manifiesto que el diseño del sistema no coincide con la manera en que los recién llegados esperan interactuar con la blockchain.

Consideremos otro problema. Para enviar ether o usar cualquier contrato de Ethereum se necesita ether para pagar el gas. Para enviar tokens, *también se necesita ether*. No se puede pagar el gas de una transacción con un token, y el contrato de token no puede pagar el gas por el usuario. Por ejemplo, supongamos que se usa una plataforma de intercambio para convertir algo de Bitcoin en un token. Se "recibe" el token en una billetera que lleva el registro del contrato de ese token y muestra el saldo. Se ve igual que cualquiera de las otras criptomonedas de la billetera. Pero al intentar enviarlo, la billetera informa que se necesita ether para hacerlo. Esto puede resultar confuso; al fin y al cabo, no se necesitó ether para recibir el token. Quizás no se tenga ether. Quizás ni siquiera se sabía que el token era un token ERC-20 en Ethereum; tal vez se pensaba que era una criptomoneda con su propia blockchain. La ilusión acaba de romperse.

Podemos abordar parcialmente este problema con la función `permit` de ERC-2612 y la funcionalidad de patrocinio de comisiones de gas que ofrecen billeteras inteligentes como EIP-4337 y EIP-7702. ERC-2612 permite aprobar autorizaciones de gasto de tokens firmando mensajes fuera de la cadena, sin necesidad de una transacción de aprobación en la cadena. EIP-4337 y otras arquitecturas de billeteras inteligentes permiten que terceros paguen las comisiones de gas a cambio de un reembolso en tokens ERC-20. El desafío está en la adopción limitada de ERC-2612 entre los tokens y en la falta de uso generalizado de billeteras inteligentes.

Algunos de estos problemas son específicos de los tokens ERC-20. Otros son problemas más generales relacionados con la abstracción y los límites de las interfaces dentro de Ethereum. Algunos pueden resolverse cambiando la interfaz del token, mientras que otros pueden requerir cambios en estructuras fundamentales de Ethereum (como las distinciones entre EOA y contratos, y entre transacciones y mensajes). Algunos quizás no sean exactamente "solucionables" y requieran un diseño de interfaz de usuario que oculte los matices y haga que la experiencia sea uniforme, independientemente de las distinciones subyacentes.

En las siguientes secciones examinaremos diversas propuestas que intentan abordar algunos de estos problemas.

### ERC-223: una propuesta de estándar de interfaz de contratos de tokens

La propuesta ERC-223 intenta resolver el problema de las transferencias involuntarias de tokens a un contrato (que puede o no admitir tokens) detectando si la dirección de destino es un contrato. ERC-223 exige que los contratos diseñados para aceptar tokens implementen una función llamada `tokenFallback`. Si el destino de una transferencia es un contrato y ese contrato no admite tokens (es decir, no implementa `tokenFallback`), la transferencia falla.

Para detectar si la dirección de destino es un contrato, la implementación de referencia de ERC-223 usa un pequeño segmento de bytecode en línea de una manera bastante creativa:

```solidity
function isContract(address _addr) private view returns (bool is_contract) {
  uint256 length;
    assembly {
       // obtener el tamaño del código en la dirección de destino; esto requiere assembly
       length := extcodesize(_addr)
    }
    return (length>0);
}
```

> **Nota**
>
> `extcodesize` devuelve el tamaño del bytecode almacenado en una dirección dada. Históricamente, esta era la principal diferencia entre las EOA y los contratos inteligentes: las EOA no tenían código y los contratos sí. Pero ese supuesto ya no se cumple. Con EIP-7702, las EOA ahora pueden tener código asociado, lo que desdibuja por completo la distinción.
> También hay un caso límite importante: durante la fase del constructor de un contrato, su código aún no se ha almacenado en la cadena. La EVM solo escribe el bytecode del contrato en la dirección después de que el constructor termina de ejecutarse. Por lo tanto, si se llama a `extcodesize` sobre la dirección del propio contrato desde su constructor (o sobre otro contrato que aún no terminó de desplegarse), devolverá `0`, aunque esa dirección vaya a contener código más adelante. En consecuencia, si una dirección no tiene código, podría ser una EOA o un contrato aún en construcción. Y si tiene código, podría ser un contrato desplegado o una EOA con una carga de código personalizada. En resumen, esta comprobación ya no nos dice de forma confiable si una dirección es un contrato.

La especificación de la interfaz de contrato ERC-223 es:

```solidity
interface ERC223Token {
  uint256 public totalSupply;
  function balanceOf(address who) public view returns (uint256);
  function name() public view returns (string _name);
  function symbol() public view returns (string _symbol);
  function decimals() public view returns (uint8 _decimals);
  function totalSupply() public view returns (uint256 _supply);
  function transfer(address to, uint256 value) public returns (bool success);
  function transfer(address to, uint256 value, bytes data) public returns (bool success);
  function transfer(address to, uint256 value, bytes data, string custom_fallback)
      public returns (bool success);
  event Transfer(address indexed from, address indexed to, uint256 value,
                 bytes indexed data);
}
```

ERC-223 no está ampliamente implementado, y en el [hilo de discusión del ERC](https://oreil.ly/iguyT) se debate la compatibilidad con versiones anteriores y las ventajas y desventajas de implementar cambios a nivel de la interfaz de contrato frente a la interfaz de usuario. El debate continúa.

### ERC-777: el futuro que pudo haber sido

ERC-777 aporta un nuevo enfoque a las interacciones con tokens al introducir *hooks*: funciones que se activan durante las transferencias de tokens. Estos hooks son plenamente compatibles con ERC-20, lo que garantiza que los sistemas existentes puedan interactuar sin problemas con tokens ERC-777.

El hook del remitente, `tokensToSend`, se ejecuta antes de que los tokens salgan de la cuenta y permite agregar lógica, como registros o comprobaciones condicionales. Por su parte, el hook del receptor, `tokensReceived`, entra en acción cuando los tokens llegan a una cuenta. En el centro de la arquitectura de hooks de ERC-777 está el registro ERC-1820, que lleva el registro de qué direcciones implementaron los hooks necesarios: `tokensToSend` para remitentes y `tokensReceived` para destinatarios. Esto asegura que las transferencias solo se completen cuando ambas partes estén preparadas para gestionarlas, evitando problemas habituales como la pérdida de tokens.

Los hooks también simplifican las transacciones. Con ERC-20, transferir tokens a un contrato suele requerir un engorroso proceso de dos pasos: `approve` y después `transferFrom`. ERC-777 elimina esa necesidad y permite transacciones atómicas mediante sus hooks. Es eficiente, intuitivo y, francamente, ya hacía falta.

Otra característica interesante de ERC-777 es su mecanismo de operadores, que permite a direcciones autorizadas, a menudo contratos inteligentes como plataformas de intercambio o procesadores de pagos, enviar y quemar tokens en nombre de un titular. Los titulares pueden otorgar o retirar la autorización a los operadores cuando lo deseen, lo que les da pleno control sobre qué terceros pueden gestionar sus tokens en su nombre en cualquier momento. Cada autorización o revocación emite un evento, lo que permite observar los cambios de autorización.

La especificación de la interfaz de contrato ERC-777 es:

```solidity
interface ERC777Token {
    function name() public view returns (string);
    function symbol() public view returns (string);
    function totalSupply() public view returns (uint256);
    function granularity() public view returns (uint256);
    function balanceOf(address owner) public view returns (uint256);
    function send(address to, uint256 amount, bytes userData) public;
    function authorizeOperator(address operator) public;
    function revokeOperator(address operator) public;
    function isOperatorFor(address operator, address tokenHolder)
        public constant returns (bool);
    function operatorSend(address from, address to, uint256 amount,
                          bytes userData,bytes operatorData) public;
    event Sent(address indexed operator, address indexed from,
               address indexed to, uint256 amount, bytes userData,
               bytes operatorData);
    event Minted(address indexed operator, address indexed to,
                 uint256 amount, bytes operatorData);
    event Burned(address indexed operator, address indexed from,
                 uint256 amount, bytes userData, bytes operatorData);
    event AuthorizedOperator(address indexed operator,
                             address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
}
```

#### Problemas de los tokens ERC-777

Aunque ERC-777 hace más intuitivas las interacciones con tokens, sus hooks introducen algunos desafíos importantes, en particular el riesgo de ataques de reentrada. Estos ataques aprovechan la capacidad de un contrato para volver a entrar en su propia lógica antes de actualizar por completo su estado, a menudo con consecuencias graves. La propia naturaleza de los hooks de ERC-777, que ceden el control de la ejecución tanto al remitente como al receptor durante una transferencia de tokens, crea un escenario ideal para estas explotaciones. Este diseño implica que los desarrolladores deben gestionar estos hooks con cuidado para evitar vulnerabilidades.

El caso más conocido de reentrada causado por la integración de tokens ERC-777 fue el incidente de Uniswap v1 en abril de 2020. Uniswap, un protocolo de intercambio descentralizado, expuso inadvertidamente sus reservas a una explotación debido a los hooks de ERC-777. Los atacantes podían volver a llamar al contrato de Uniswap en medio de una operación, aprovechando la discrepancia entre las reservas de tokens y de ether para sustraer fondos. Aunque esta vulnerabilidad era específica de cómo Uniswap interactuaba con ERC-777, es un claro recordatorio de los riesgos que introducen estos hooks.

Otro problema que cabe señalar es la posibilidad de ataques de DoS. Supongamos que un contrato distribuye tokens ERC-777 a múltiples cuentas. Si uno de los destinatarios es un contrato malicioso programado para revertir la transacción durante el hook `tokensReceived`, se impediría todo el proceso de distribución.

Estos riesgos muestran por qué integrar ERC-777 no es tan sencillo como sustituir ERC-20. Los desarrolladores deben adoptar buenas prácticas, como usar bloqueos de reentrada para mitigar las vulnerabilidades.

#### El futuro que pudo haber sido

ERC-777 podría haber sido la siguiente evolución del estándar de tokens de Ethereum. Aborda muchos puntos problemáticos de ERC-20, particularmente en la experiencia de usuario y la gestión de tokens. La capacidad de evitar la pérdida de tokens, permitir transacciones atómicas y construir interacciones más completas entre contratos constituye un conjunto de avances convincentes.

Sin embargo, la comunidad de Ethereum comenzó a dudar. Los posibles escenarios de DoS y reentrada proyectaron una larga sombra. Los desarrolladores temían las complejidades y los riesgos de integrar ERC-777, aunque esos riesgos pueden gestionarse con las precauciones adecuadas. En lugar de estar a la altura del desafío, nos quedamos con el conocido pero limitado ERC-20. Es una oportunidad perdida de adoptar un estándar que acerca los tokens a la filosofía de Ethereum y ofrece una funcionalidad superior.

En definitiva, los hooks de ERC-777 no son el villano; la implementación incorrecta sí lo es. Con algo de esfuerzo y el cumplimiento de prácticas de programación segura, ERC-777 podría abrir el camino a un ecosistema de Ethereum más fluido. Para investigar más sobre el asunto, se recomienda leer la [discusión sobre la descontinuación de ERC-777](https://oreil.ly/J4p9B) por parte de la biblioteca OpenZeppelin.

## ERC-721: estándar de NFT

Hasta ahora exploramos estándares para tokens fungibles, como ERC-20, donde cada unidad es intercambiable y al sistema solo le importan los saldos de las cuentas. Ahora examinemos algo diferente y mucho más singular: ERC-721, el estándar para tokens no fungibles, o NFT, como todos los conocen ahora. Quizás haya oído hablar de los NFT durante la fiebre de 2021, cuando objetos de colección digitales como CryptoPunks, Bored Ape Yacht Club y NBA Top Shot acapararon titulares y se vendieron por sumas asombrosas. Plataformas de compraventa como OpenSea y Rarible se volvieron nombres conocidos en el mundo de las criptomonedas.

Pero ¿qué hace especiales a los NFT exactamente? A diferencia de los tokens ERC-20, los NFT se centran en la singularidad. Cada token representa la propiedad de un objeto distinto, y ese objeto puede ser cualquier cosa: un objeto de colección digital, un activo de un videojuego, una obra de arte o incluso un activo del mundo real, como una propiedad o un automóvil. Lo atractivo de ERC-721 reside en su flexibilidad. No le importa qué representa el token, siempre que sea único y pueda identificarse con un número. Internamente, esto se logra con un identificador `uint256` para cada NFT. Puede pensarse como un número de serie que distingue un token de otro. En ERC-20 llevamos el registro de los saldos mapeando una cuenta a la cantidad que posee, pero en ERC-721, además de los saldos, también mapeamos cada ID de token único a su propietario:

```solidity
mapping (uint256 => address) private _owners;
```

Este sutil cambio de estructura lo cambia todo. Cada NFT está vinculado a un propietario específico, y su historial, procedencia y atributos únicos pueden rastrearse directamente. Esto hace que ERC-721 sea perfecto para aplicaciones donde importa la individualidad, como demostrar la propiedad de una obra de arte única, una espada rara de un videojuego o incluso una parcela de tierra en el metaverso.

Lo que hace verdaderamente potente y versátil a ERC-721 es su extensión opcional de metadatos de ERC-721, que permite vincular cada ID de token a un identificador uniforme de recursos (URI). Este URI puede apuntar a metadatos que describan el NFT, como su nombre, descripción e imagen. El URI podría ser un enlace HTTP estándar a un servidor centralizado o un enlace de Inter-Planetary File System (IPFS) para almacenamiento descentralizado. Los servidores centralizados pueden desconectarse o desaparecer por completo, lo que hace que los NFT dependan de infraestructura de terceros. Por el contrario, IPFS ayuda a asegurar que los metadatos sigan siendo accesibles y resistentes a alteraciones, por lo que es la opción preferida para almacenar metadatos de NFT. La capacidad de asociar cada token con un URI de metadatos es lo que permite a los NFT contener datos descriptivos detallados y contenido multimedia, lo que aumenta aún más su singularidad y utilidad.

El uso especulativo de los NFT, particularmente como objetos de colección digitales, ha dominado indiscutiblemente el relato público. Estos tokens se convirtieron en un símbolo del entusiasmo desmedido, con valores impulsados por la escasez, el respaldo de celebridades y el sentimiento de la comunidad. Sin embargo, más allá de los titulares llamativos hay un mundo de aplicaciones prácticas con potencial para redefinir industrias. Por ejemplo, los NFT pueden usarse en la gestión de cadenas de suministro para rastrear la procedencia de los bienes y garantizar autenticidad y transparencia a los consumidores. Pueden representar escrituras de propiedad y agilizar las transacciones inmobiliarias al automatizar las transferencias de propiedad y reducir el fraude. Los NFT también pueden usarse en educación para emitir credenciales verificables, como títulos y certificados, que sean imposibles de alterar y universalmente accesibles.

Aunque los objetos de colección llevaron los NFT al centro de atención, su verdadera promesa está en estos usos prácticos y transformadores. Al combinar singularidad, trazabilidad y programabilidad, los tokens ERC-721 se perfilan como un componente fundamental de la economía digital. Ya sea que se acuñe una obra de arte peculiar o se tokenice un historial médico que salve vidas, ERC-721 permite a los desarrolladores crear soluciones que van mucho más allá de la especulación.

La especificación de la interfaz de contrato ERC-721 es la siguiente:

```solidity
interface ERC721 /* is ERC165 */ {
    event Transfer(address indexed _from, address indexed _to, uint256 _deedId);
    event Approval(address indexed _owner, address indexed _approved,
                   uint256 _deedId);
    event ApprovalForAll(address indexed _owner, address indexed _operator,
                         bool _approved);
    function balanceOf(address _owner) external view returns (uint256 _balance);
    function ownerOf(uint256 _deedId) external view returns (address _owner);
    function transfer(address _to, uint256 _deedId) external payable;
    function transferFrom(address _from, address _to, uint256 _deedId)
        external payable;
    function approve(address _approved, uint256 _deedId) external payable;
    function setApprovalForAll(address _operator, boolean _approved) payable;
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
```

## ERC-1155: estándar multitoken

Ethereum ha recorrido un largo camino desde ERC-20 y ERC-721, que sentaron las bases de los tokens fungibles y no fungibles. ERC-1155, el estándar multitoken, combina las fortalezas de ambos para permitir una gestión eficiente y versátil de tokens.

Imagine que desarrolla videojuegos. Quiere crear un sistema donde los jugadores puedan coleccionar monedas de oro (fungibles), espadas únicas (no fungibles) y pociones consumibles en pilas (semifungibles). Con ERC-20 o ERC-721 necesitaría un contrato inteligente separado para cada tipo de token. Cada contrato nuevo aumentaría los costos de gas y agregaría complejidad, porque también habría que gestionar los permisos y las interacciones entre esos contratos. ERC-1155 resuelve este problema. Nos permite desplegar un solo contrato para gestionar múltiples tipos de tokens. Cada tipo de token se identifica con un ID único, y el contrato puede gestionar todas las operaciones, incluidas transferencias, saldos y recuperación de metadatos, para cualquier combinación de tipos de tokens. Este enfoque simplificado reduce la redundancia y los costos de transacción, lo que convierte a ERC-1155 en un estándar ampliamente adoptado.

Las operaciones por lotes son una característica destacada de ERC-1155. Permiten transferir o consultar múltiples tokens en una sola transacción, ahorrando gas y haciendo más escalable el estándar. Además, ERC-1155 incluye mecanismos de seguridad para evitar problemas como tokens bloqueados. Al transferir tokens a un contrato inteligente, el contrato receptor debe implementar la interfaz `IERC1155Receiver`; de lo contrario, la transacción se revertirá. Estos hooks permiten interacciones avanzadas durante las transferencias de tokens. Por ejemplo, un contrato podría implementar lógica personalizada que se ejecute al recibir tokens, como actualizar una tabla de clasificación de un videojuego o activar un evento. Sin embargo, como vimos en ERC-777, si estos hooks no se gestionan con cuidado, pueden introducir vulnerabilidades, como ataques de reentrada. Los desarrolladores deben asegurar medidas de protección adecuadas, como patrones de comprobaciones-efectos-interacciones y bloqueos de reentrada, para proteger sus contratos al implementar tokens ERC-1155.

La especificación de la interfaz de contrato ERC-1155 es la siguiente:

```solidity
interface IERC1155 /* is IERC165 */ {
    event TransferSingle(address indexed operator, address indexed from, address indexed to,
uint256 id, uint256 value);
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(
        address account,
        address operator
    ) external view returns (bool);
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;
}
```

## Uso de estándares de tokens

En la sección anterior revisamos varios estándares propuestos y un par de estándares ampliamente desplegados para contratos de tokens. ¿Qué hacen exactamente estos estándares? ¿Deberíamos usarlos? ¿Cómo deberíamos usarlos? ¿Deberíamos agregar funcionalidad más allá de estos estándares? ¿Qué estándares deberíamos usar? A continuación examinaremos algunas de estas preguntas.

### ¿Qué son los estándares de tokens y cuál es su propósito?

Los estándares de tokens son las especificaciones *mínimas* para una implementación. Esto significa que, para cumplir con ERC-20, por ejemplo, es necesario implementar como mínimo las funciones y el comportamiento que especifica el estándar ERC-20. También se tiene libertad para *agregar* funcionalidad implementando funciones que no forman parte del estándar.

El propósito principal de estos estándares es fomentar la *interoperabilidad* entre contratos. De este modo, todas las billeteras, plataformas de intercambio, interfaces de usuario y otros componentes de infraestructura pueden *interactuar* de manera predecible con cualquier contrato que siga la especificación. En otras palabras, si se despliega un contrato que sigue el estándar ERC-20, todos los usuarios de billeteras existentes pueden comenzar a negociar el token sin problemas, sin ninguna actualización de la billetera ni esfuerzo de nuestra parte.

Los estándares pretenden ser *descriptivos*, no *prescriptivos*. La manera de implementar esas funciones depende de cada quien; el funcionamiento interno del contrato no es relevante para el estándar. Tienen algunos requisitos funcionales que rigen el comportamiento en circunstancias específicas, pero no prescriben una implementación. Por ejemplo, ERC-20 especifica que una transferencia exitosa actualiza los saldos y emite un evento Transfer, pero no prescribe las estructuras de datos
internas ni la lógica contable utilizadas para implementar esos requisitos.

### ¿Deberíamos usar estos estándares?

Ante todos estos estándares, cada desarrollador enfrenta un dilema: ¿usar los estándares existentes o innovar más allá de las restricciones que imponen?

Este dilema no es fácil de resolver. Los estándares necesariamente restringen la capacidad de innovar al crear un "carril" estrecho que hay que seguir. Por otra parte, los estándares básicos surgieron de la experiencia con cientos de aplicaciones y suelen adaptarse bien a la gran mayoría de los casos de uso.

Como parte de esta consideración hay una cuestión aún mayor: el valor de la interoperabilidad y de una adopción amplia. Si se elige usar un estándar existente, se obtiene el valor de todos los sistemas diseñados para funcionar con él. Si se elige apartarse del estándar, hay que considerar el costo de construir toda la infraestructura de soporte por cuenta propia o de convencer a otros de que respalden la implementación como un estándar nuevo. La tendencia a seguir un camino propio e ignorar los estándares existentes se conoce como síndrome de "no inventado aquí" y es contraria a la cultura del código abierto. Por otra parte, el progreso y la innovación dependen de apartarse de la tradición algunas veces. Es una decisión difícil, ¡así que conviene considerarla con cuidado!

> **Nota**
>
> Según [Wikipedia](https://oreil.ly/TTA96), "no inventado aquí" es una postura adoptada por culturas sociales, empresariales o institucionales que evitan usar o comprar productos, investigaciones, estándares o conocimientos ya existentes debido a su origen externo y sus costos, como las regalías.

### Detección de estándares: EIP-165

Como vimos, estándares como ERC-20 simplifican las interacciones entre tokens y billeteras. Pero ¿cómo identificamos qué interfaces admite un contrato inteligente? Aquí entra en juego EIP-165, que proporciona una forma estandarizada para que los contratos declaren y detecten interfaces.

EIP-165 define un método para que los contratos anuncien las interfaces que implementan. Los contratos usan la función `supportsInterface` para devolver un valor `true` o `false` para un ID de interfaz dado (un identificador único calculado como el XOR de todos los selectores de funciones de una interfaz). Por ejemplo, si una interfaz incluye `foo()` y `bar(int256)`, su ID se obtiene así:

```
foo.selector ^ bar.selector
```

Este enfoque permite que otros contratos y herramientas verifiquen la compatibilidad antes de interactuar. Por ejemplo, un mercado puede confirmar que un contrato de NFT admite la interfaz ERC-721 antes de listar sus tokens.

Para implementar EIP-165, un contrato hereda de una clase base, como ERC-165 de OpenZeppelin, y sobrescribe el método `supportsInterface` para incluir las interfaces que admite el contrato:

```solidity
contract MyContract is IMyContract, ERC165 {
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IMyContract).interfaceId ||
super.supportsInterface(interfaceId);
    }
}
```

Para entender mejor cómo funciona EIP-165 en la práctica, veamos ERC-1155, un estándar versátil y ampliamente usado para contratos multitoken:

```solidity
abstract contract ERC1155 is Context, ERC165, IERC1155, IERC1155MetadataURI,
    IERC1155Errors {
[...]
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165,
IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == type(IERC1155MetadataURI).interfaceId ||
            super.supportsInterface(interfaceId);
    }
[...]
}
```

> **Advertencia**
>
> EIP-165 depende de que los contratos informen honestamente sus capacidades. Un contrato malicioso o mal implementado podría afirmar falsamente que admite una interfaz y provocar problemas. Aunque EIP-165 mejora la experiencia de los desarrolladores y reduce las dificultades, no debe tratarse como una garantía de seguridad.

Para escenarios más avanzados, como cuando los contratos implementan interfaces en nombre de otros, los desarrolladores podrían explorar ERC-1820, que usa un registro global para llevar el registro de la compatibilidad con interfaces. Aunque ERC-1820 es más complejo que EIP-165, ofrece mayor flexibilidad para los sistemas descentralizados.

### Seguridad por madurez

Además de elegir el estándar, está la elección paralela de la *implementación*. Cuando se decide usar un estándar como ERC-20, después hay que decidir cómo implementar un diseño compatible. Existen varias implementaciones "de referencia" ampliamente usadas en el ecosistema de Ethereum, o se puede escribir una propia desde cero. De nuevo, esta elección representa un dilema que puede tener consecuencias graves para la seguridad.

Las implementaciones existentes están "probadas en batalla". Aunque es imposible demostrar que son seguras, muchas de ellas sustentan tokens por un valor de millones de dólares, miles de millones en algunos casos. Han sido atacadas repetida e intensamente. Hasta ahora no se han descubierto vulnerabilidades significativas. Escribir una implementación propia no es fácil; hay muchas maneras sutiles de comprometer un contrato. Es mucho más seguro usar una implementación bien probada y ampliamente utilizada. En nuestros ejemplos usamos la implementación del estándar ERC-20 de OpenZeppelin porque se centra en la seguridad desde sus bases.

Si se usa una implementación existente, también se la puede ampliar. De nuevo, hay que tener cuidado con este impulso. La complejidad es enemiga de la seguridad. Cada línea de código que se agrega amplía la superficie de ataque del contrato y podría representar una vulnerabilidad latente. Quizás no se detecte un problema hasta que se deposite mucho valor sobre el contrato y alguien lo vulnere.

> **Consejo**
>
> Los estándares y las elecciones de implementación son partes importantes del diseño general de contratos inteligentes seguros, pero no son las únicas consideraciones (véase el Capítulo 9).

## Extensiones de los estándares de interfaces de tokens

Los estándares de tokens que hemos analizado hasta ahora proporcionan funcionalidad esencial para crear y gestionar tokens. Sin embargo, son intencionalmente mínimos, lo que deja espacio para que los proyectos los amplíen y adapten a necesidades específicas. Con el tiempo, muchos proyectos han construido sobre estos estándares e introducido funciones que mejoran la facilidad de uso, la seguridad y la flexibilidad. OpenZeppelin, una biblioteca líder para contratos inteligentes de Ethereum, se ha convertido en la fuente de referencia para estas extensiones. Exploremos algunas de las extensiones más destacadas para tokens ERC-20, ERC-721 y ERC-1155.

Con ERC-20, por ejemplo, vemos la incorporación de mecanismos de quema. La quema permite retirar tokens permanentemente de la circulación y reducir la oferta, lo que resulta útil para modelos deflacionarios o economías de tokens que requieren un control deliberado de la oferta. Por otro lado, algunos proyectos incorporan topes para establecer límites estrictos sobre la oferta total y asegurar que nunca puedan acuñarse más tokens por encima de un umbral predefinido.

Otra incorporación interesante a ERC-20 es la funcionalidad de voto. Permite a los titulares de tokens participar en decisiones de gobernanza directamente mediante sus tokens. Los proyectos que la implementan crean procesos descentralizados de toma de decisiones y permiten que las partes interesadas tengan voz en la evolución de un protocolo.

ERC-721 ha mostrado una creatividad similar en sus extensiones. Funciones como los pagos de regalías permiten a los creadores obtener un porcentaje de las ventas cada vez que se negocian sus NFT. El almacenamiento de URI es otra incorporación habitual que permite almacenar y recuperar metadatos dinámicamente, lo que resulta especialmente útil para NFT con propiedades que evolucionan. Las extensiones de enumeración permiten a los desarrolladores listar eficientemente todos los tokens que posee una dirección, lo que facilita construir mercados o billeteras.

ERC-1155, el estándar multitoken, no se ha quedado atrás. Las extensiones de ERC-1155 incluyen tokens que pueden quemarse y contratos que pueden pausarse, lo que brinda mayor flexibilidad en casos de uso como videojuegos o cadenas de suministro tokenizadas. Algunas implementaciones también mejoran la gestión de metadatos y aseguran que los detalles de los tokens sigan siendo accesibles y fáciles de actualizar.

Además de estas, existen innumerables extensiones que abordan necesidades como financiamiento colectivo, listas de bloqueo, listas de permitidos e implementación de comisiones sobre transferencias. Los desarrolladores suelen combinar estas funciones con otras bibliotecas estándar, como Ownable o Access Control de OpenZeppelin, para aprovechar aún más recursos probados en batalla.

La flexibilidad conlleva responsabilidad. Ampliar los estándares de tokens implica equilibrar la innovación y la interoperabilidad. Escribir funciones personalizadas puede parecer atractivo, pero suele introducir complejidad y riesgos innecesarios. En cambio, aprovechar bibliotecas y extensiones consolidadas, como las de OpenZeppelin, garantiza la seguridad y la calidad del código y reduce considerablemente los costos de desarrollo. No hace falta reinventar la rueda cuando ya existen soluciones robustas y probadas.

## Conclusión

Los tokens son más que moneda digital; pueden representar derechos de gobernanza, credenciales de acceso, identidades y activos del mundo real. Su versatilidad solo es posible gracias a estándares como ERC-20, ERC-721 y ERC-1155, que garantizan una interoperabilidad fluida entre billeteras, plataformas de intercambio y DApps, creando un ecosistema blockchain más eficiente e interconectado. En este capítulo examinamos los distintos tipos de tokens y estándares de tokens, y construimos un primer token y su aplicación relacionada.
