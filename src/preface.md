# Prefacio

Este libro es una colaboración entre mí (Carlo Parisi, también conocido como Blackie), Alessandro Mazza y Niccolò Pozzolini. La primera edición, que por supuesto influyó mucho en nuestro trabajo, fue escrita entre 2016 y 2019 por Andreas M. Antonopoulos y el Dr. Gavin Wood.

En noviembre de 2023, una serie de coincidencias muy afortunadas nos reunió a Andreas y a mí en Glasgow. Allí, después de unas cervezas y unos autógrafos, le pregunté si tenía intención de escribir una segunda edición de *Mastering Ethereum*. La razón era que, aunque la primera edición es una obra maestra, no ha envejecido bien; se publicó en 2019, cuando Ethereum todavía utilizaba prueba de trabajo y tenía una hoja de ruta muy diferente.

Andreas respondió que no tenía planes de escribir una segunda edición, pero nuestra conversación terminó dando lugar a la idea que me llevó a asumir este proyecto. Menos de un día después de nuestro encuentro en Glasgow, ya estaba hablando con O'Reilly sobre la posibilidad de escribir una segunda edición.

Supe de inmediato que sería una tarea grande e importante. Aunque la oportunidad era un honor, también temía no poder hacer un trabajo lo suficientemente bueno. Soy admirador del trabajo de Andreas desde hace años; gracias a él pude comprender Bitcoin con tanta profundidad allá por 2014–2015, así que sabía que necesitaba ayuda.

La primera persona en la que pensé fue Alessandro. Se involucró en el proyecto desde las primeras horas. En cuanto la oportunidad se hizo realidad, le envié un mensaje y le pregunté si quería acompañarme. Aceptó de inmediato y con entusiasmo (sin conocer ninguna de las condiciones ni siquiera si sería un trabajo remunerado).

Fue un poco más difícil convencer a Niccolò. Hizo falta un mes entero de negativas para que se sumara. Por suerte, soy muy terco y no estaba dispuesto a aceptar un no como respuesta. Después de un mes, finalmente aceptó. Con eso, nuestro equipo estaba completo y el proyecto *Mastering Ethereum: Second Edition* se puso en marcha oficialmente.

Espero que cada persona que lea este libro aprenda al menos un poco. *Mastering Ethereum* fue un libro que nos enseñó muchísimo a mí y a miles de personas más, y trabajamos mucho para mantener ese mismo nivel de calidad. Completarlo llevó dos años de investigación y escritura, y mentiría si dijera que fue fácil.

También estamos muy orgullosos de que todo el equipo de este proyecto sea italiano. Esperamos que eso también sea motivo de orgullo para la comunidad cripto italiana.

## Cómo usar este libro

El libro está pensado tanto como manual de referencia como para explorar Ethereum de principio a fin. Los dos primeros capítulos ofrecen una introducción gradual, adecuada para principiantes, y cualquier persona con un poco de habilidad técnica puede completar sus ejemplos. Esos dos capítulos permiten comprender bien los conceptos básicos y utilizar las herramientas fundamentales de Ethereum. Algunas partes del capítulo 3 y de los siguientes están dirigidas a quienes programan e incluyen muchos temas técnicos y ejemplos de programación, pero aun así deberían resultar comprensibles para cualquier persona, en su mayor parte.

Para servir tanto de manual de referencia como de relato sobre Ethereum que se lee de principio a fin, el libro inevitablemente contiene algunas repeticiones. Algunos temas, como el gas, deben presentarse lo suficientemente pronto para que el resto tenga sentido, pero también se examinan a fondo en sus propias secciones.

Por último, el índice del libro permite encontrar con facilidad temas muy específicos y las secciones correspondientes mediante palabras clave.

## Público al que está dirigido

Este libro está dirigido, en gran medida, a todo el mundo. Enseña cómo funcionan las blockchains de contratos inteligentes, cómo utilizarlas y cómo desarrollar contratos inteligentes y aplicaciones descentralizadas con ellas. Los primeros capítulos también son adecuados como introducción detallada a Ethereum para principiantes.

## Ejemplos de código

Los ejemplos se presentan en Solidity, Vyper y JavaScript, utilizando la línea de comandos de un sistema operativo similar a Unix. Todos los fragmentos de código se pueden reproducir en la mayoría de los sistemas operativos con una instalación mínima de compiladores, intérpretes y bibliotecas para los lenguajes correspondientes. Cuando es necesario, proporcionamos instrucciones básicas de instalación y ejemplos paso a paso de la salida de esas instrucciones.

Todos los fragmentos de código utilizan valores y cálculos reales siempre que es posible, para que se pueda avanzar de un ejemplo a otro y obtener los mismos resultados en cualquier código que se escriba para calcular los mismos valores. Por ejemplo, las claves privadas y sus claves públicas y direcciones correspondientes son todas reales. Las transacciones, los contratos, los bloques y las referencias a la blockchain de los ejemplos se han incorporado a la blockchain real de Ethereum y forman parte del registro público, por lo que se pueden consultar.

## Direcciones y transacciones de Ethereum en este libro

Las direcciones de Ethereum, las transacciones, las claves, los códigos QR y los datos de la blockchain utilizados en este libro son, en su mayoría, reales. Esto significa que se puede explorar la blockchain, examinar las transacciones que se ofrecen como ejemplos, recuperarlas con scripts o programas propios, etcétera.

Sin embargo, hay que tener en cuenta que las claves privadas utilizadas para generar las direcciones que aparecen en este libro han sido "quemadas". Esto significa que, si se envía dinero a cualquiera de estas direcciones, se perderá para siempre o (lo más probable) alguien se apropiará de él, ya que cualquier persona que lea el libro puede tomarlo utilizando las claves privadas que aquí aparecen.

> **Advertencia**  
>
> No se debe enviar dinero a ninguna de las direcciones de este libro. Otra persona que lo lea tomará ese dinero o se perderá para siempre.

## Convenciones utilizadas en este libro

En este libro se utilizan las siguientes convenciones tipográficas:

*Cursiva*

Indica términos nuevos, URLs, direcciones de correo electrónico, nombres de archivo y extensiones de archivo.

`Ancho fijo`

Se utiliza para los listados de código, así como dentro de los párrafos para hacer referencia a elementos de los programas, como nombres de variables o funciones, bases de datos, tipos de datos, variables de entorno, sentencias y palabras reservadas.

**`Ancho fijo en negrita`**

Indica comandos u otro texto que se debe escribir literalmente.

*`Ancho fijo en cursiva`*

Indica texto que se debe reemplazar por valores proporcionados por quien lo utiliza o por valores determinados por el contexto.

> **Consejo**  
>
> Este elemento señala un consejo o una sugerencia.

> **Nota**  
>
> Este elemento señala una nota general.

> **Advertencia**  
>
> Este elemento indica una advertencia o precaución.

## Uso de los ejemplos de código

Como parte de nuestro compromiso con la colaboración, trabajamos con O'Reilly Media para que este libro estuviera disponible bajo una licencia Creative Commons.

Si surge alguna pregunta técnica o algún problema al utilizar los ejemplos de código, se puede enviar un correo electrónico a <support@oreilly.com>.

Este libro tiene como objetivo ayudar a realizar el trabajo. En general, si se ofrece código de ejemplo con este libro, se puede utilizar en programas y documentación propios. No es necesario contactarnos para solicitar permiso, a menos que se reproduzca una parte considerable del código. Por ejemplo, escribir un programa que utilice varios fragmentos de código de este libro no requiere permiso. Vender o distribuir ejemplos de libros de O'Reilly sí requiere permiso. Responder una pregunta citando este libro y reproduciendo código de ejemplo no requiere permiso. Incorporar una cantidad considerable de código de ejemplo de este libro en la documentación de un producto sí requiere permiso.

Agradecemos la atribución, aunque por lo general no la exigimos. Una atribución suele incluir el título, los autores, la editorial y el ISBN. Por ejemplo: "*Mastering Ethereum*, 2nd ed., by Andreas M. Antonopoulos, Gavin Wood, Carlo Parisi, Alessandro Mazza, and Niccolò Pozzolini (O'Reilly). Copyright 2026 Carlo Parisi, Alessandro Mazza, and Niccolò Pozzolini, 978-1-098-16842-1."

Si se considera que el uso de los ejemplos de código queda fuera del uso legítimo o del permiso otorgado anteriormente, se puede contactar con nosotros en permissions@oreilly.com.

## O'Reilly Online Learning

> **Nota**  
>
> Desde hace más de 40 años, O'Reilly Media ofrece formación, conocimientos y perspectivas sobre tecnología y negocios para ayudar a las empresas a tener éxito.

Nuestra singular red de especialistas e innovadores comparte sus conocimientos y experiencia a través de libros, artículos y nuestra plataforma de aprendizaje en línea. La plataforma de aprendizaje en línea de O'Reilly brinda acceso bajo demanda a cursos de formación en vivo, rutas de aprendizaje detalladas, entornos de programación interactivos y una amplia colección de textos y videos de O'Reilly y de otras 200+ editoriales. Para obtener más información, se puede visitar [oreilly.com](https://oreilly.com).

## Cómo contactarnos

Los comentarios y las preguntas sobre este libro deben dirigirse a la editorial:

O'Reilly Media, Inc.

141 Stony Circle, Suite 195

Santa Rosa, CA 95401

800-889-8969 (en Estados Unidos o Canadá)

707-827-7019 (internacional o local)

707-829-0104 (fax)

<support@oreilly.com>

[oreilly.com/about/contact.html](https://oreilly.com/about/contact.html)

Tenemos una página web de este libro, donde publicamos las erratas y cualquier información adicional. Se puede acceder a ella en [https://oreil.ly/MasteringEthereum2e](https://oreil.ly/MasteringEthereum2e).

Para conocer las novedades y obtener información sobre nuestros libros y cursos, se puede visitar [https://oreilly.com](https://oreilly.com).

Estamos en [LinkedIn](https://linkedin.com/company/oreilly-media)

Nuestros videos están en [YouTube](https://youtube.com/oreillymedia)

## Cómo contactar a Carlo

Suscripción al canal de Carlo en [YouTube](https://www.youtube.com/@BlackieCrypto)

Seguir a Carlo en [Twitter/X]( https://x.com/ManInBlackie)

Conectar con Carlo en [LinkedIn](https://www.linkedin.com/in/carloparisis)

Correo electrónico: <carlo.parisi01234@gmail.com>

## Cómo contactar a Alessandro

Seguir a Alessandro en [GitHub](https://github.com/alessandromazza98)

Conectar con Alessandro en [LinkedIn](https://www.linkedin.com/in/alessandro-mazza-a8b181320)

Seguir a Alessandro en [Twitter/X (perfil en italiano)](https://x.com/alessandromazza)

Seguir a Alessandro en [Twitter/X (perfil en inglés)](https://x.com/alemaz98)

Suscripción al [canal de YouTube](https://www.youtube.com/@alessandro-mazza) de Alessandro

## Cómo contactar a Niccolò

Seguir a Niccolò en [Twitter/X](https://x.com/idrocortisone)

Conectar con Niccolò en [LinkedIn](https://www.linkedin.com/in/niccolo-pozzolini)

## Agradecimientos de Carlo

Debo gran parte de lo que ha sucedido en mi carrera y en mi vida personal al trabajo de Andreas. Gracias a la primera edición de *Mastering Bitcoin*, pude comprender de verdad el potencial de Bitcoin allá por 2014 y 2015. Por eso, decidí dedicarme profesionalmente al mundo cripto. En aquel entonces, no había muchos recursos completos disponibles, así que *Mastering Bitcoin* fue un regalo increíble para toda la comunidad. No tendría la carrera que tengo hoy y probablemente mi vida sería muy diferente si no fuera por esa obra increíble. Lo mismo ocurre con *Mastering Ethereum*. Por esta razón, Andreas, muchísimas gracias.

Gracias a Nicola Luigi Guglielmo Di Nanna, mi profesor de ciencias de la computación en la escuela secundaria. Sin ti, probablemente no habría descubierto mi pasión por la programación y, posteriormente, por las blockchains. Dicen que un buen profesor puede cambiar la vida de un estudiante; tú sin duda lo hiciste. Gracias por compartir tu pasión por las ciencias de la computación y por ser un ejemplo tan inspirador.

Gracias también a Alessandro y Niccolò, que ayudaron tanto a escribir este libro, y a todos nuestros increíbles revisores técnicos.

Gracias a Michelle Smith y Shira Evans, de O'Reilly, que nos apoyaron en cada paso del camino.

Gracias a la comunidad italiana, en particular a mi propia comunidad en Discord, YouTube y Twitter, que me dio la confianza para asumir este y muchos otros proyectos.

Gracias a la maravillosa comunidad de Ethereum. No habríamos podido investigar tanto ni escribir con tanta profundidad sin su apoyo y sus contribuciones constantes.

Y, por último, pero no por ello menos importante, gracias a mi maravillosa familia, que me apoyó en todo lo que hice y me permitió explorar libremente mis pasiones e intereses.

## Agradecimientos de Alessandro

Hay tantas cosas por las que estoy agradecido. En primer lugar, me gustaría agradecer a Carlo por contactarme y darme la increíble oportunidad de escribir este libro. Todavía recuerdo la primera vez que nos conocimos en persona, en Catanzaro, Italia.

Gracias a mi profesor universitario, el Dr. Luca Giuzzi, por permitirme dedicar mi tesis a Bitcoin y al algoritmo de firma digital de Schnorr. Ese fue el comienzo de mi carrera en el ámbito de las criptomonedas.

Un agradecimiento de corazón a mi comunidad italiana, que me dio confianza e indirectamente me llevó a donde estoy hoy. Probablemente no habría conocido a Carlo si no fuera por su apoyo.

Gracias a O'Reilly, y en particular a Shira Evans y Michelle Smith, que nos guiaron a lo largo de este recorrido. Su meticulosa coordinación y su apoyo, junto con la ayuda de todos los revisores, hicieron posible este libro.

Por último, quiero agradecer a mi familia y a mi novia, Alessandra, por apoyarme y quererme siempre.

## Agradecimientos de Niccolò

Quiero agradecer a Carlo por darme la oportunidad de escribir este libro con él. Durante los últimos dos años, hemos trabajado juntos en muchos proyectos y compartido muchas risas, viajes al extranjero y, ahora, este libro. Trabajar contigo ha hecho que este recorrido sea divertido y gratificante.

Estoy agradecido con Andreas y Gavin por crear la primera versión de *Mastering Ethereum*. Su libro me abrió los ojos al mundo de la blockchain y ha hecho lo mismo por muchas otras personas. Su trabajo ayudó a construir y hacer crecer esta maravillosa comunidad de la blockchain de la que todos formamos parte hoy.

Muchísimas gracias a Michelle Smith y Shira Evans, de O'Reilly, por apoyarnos de principio a fin. Nos ayudaron con todos los trámites, nos mantuvieron dentro de los plazos y nos guiaron durante todo el proceso de hacer realidad este libro.

A mi familia, mis amigos y mi novia, Giuditta, nunca podré agradecerles lo suficiente que siempre estén a mi lado. Durante los muchos meses de escritura, soportaron mi agenda apretada y mi estrés. Me escucharon cuando necesitaba conversar sobre ideas, comprendieron cuando no podía asistir a reuniones por los plazos de entrega y siguieron animándome cuando las cosas se ponían difíciles. Su apoyo constante me dio la fuerza y la concentración necesarias para seguir adelante. El libro que tienen en sus manos no es solo mi trabajo; existe gracias al cariño y al apoyo que siempre me han demostrado.

## Contribuciones

Todos queremos agradecer a nuestros revisores técnicos:

- Ben Edgington
- Caleb Lent
- Brian Wu
- Gonçalo Magalhães

Nos han ayudado enormemente a mejorar la calidad del libro. Muchísimas gracias a nuestros maravillosos revisores técnicos.
