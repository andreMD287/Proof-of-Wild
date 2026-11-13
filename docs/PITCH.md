# Pitch · Proof of Wild

Pitch de 3 minutos, 3 minutos de demo en vivo y 2 de preguntas. Ensayado con reloj el [fecha]: [tiempo que marcó].

## Quién hace qué

| Rol | Quién |
|---|---|
| Pitch | Diana Durán |
| Demo | André Landinez |
| Preguntas | Todo el equipo |

## Pitch (3 minutos)

### 0:00–0:30 · El problema

> Levanten la mano quienes alguna vez hayan donado a una causa. *(esperar a que la levanten)* Ahora, déjenla arriba solo si saben exactamente en qué se usó su plata. *(casi todos la bajan; pausa)* Ese es el problema. Y para la fauna silvestre es de vida o muerte: de cada 10 animales que sacan de su hogar para venderlos, 7 mueren antes de llegar a su destino. *(pausa)* Los que sobreviven, como esta guacamaya, llegan a fundaciones que viven de donaciones. Y quien dona no tiene cómo saber si su plata compró la medicina.

### 0:30–1:15 · Qué hace la app hoy

> Esto es lo que hace hoy, en testnet. Cada animal es un caso con etapas y el costo de cada una, y el administrador lo crea en el contrato con `crear_caso`. Un donante entra, apadrina la guacamaya con 40 dólares y firma con su billetera. La función `aportar` reparte el aporte en orden: la medicina ya llevaba 10 de 40, así que 30 la completan y los otros 10 van a los cuidados; y rechaza lo que pase de la meta. Cuando la ONG compra la medicina, llama a `registrar_gasto`: el contrato le paga directo a la droguería y guarda el hash de la factura. Con `registrar_hito` deja la huella de la foto del avance. Y cualquiera, con `consultar_caso`, ve cuánto tiene cubierto y gastado cada etapa.

### 1:15–2:00 · Por qué Stellar

> ¿Por qué Stellar? Por tres razones. La primera, confianza: el donante no conoce a la ONG, y si los datos los guardáramos nosotros en una base de datos, tendría que confiar en nosotros. En Stellar, el contrato guarda el aporte y solo lo suelta como pago directo al proveedor, y cualquiera lo comprueba en Stellar Expert, con el hash de la factura. La segunda, rapidez: cada transacción se confirma en unos 5 segundos, así que el donante ve su aporte repartido al instante. La tercera, costo: una transacción cuesta 0,00099 XLM —lo que cobró la red por un aporte de la demo—, menos de un centavo, y por eso hasta una donación de 5 dólares llega completa. Y todo en USDC, dólares digitales estables.

### 2:00–2:40 · Qué aprendimos

> En producto aprendimos que apadrinar no es adoptar. Hay que cuidar que no se cree un vínculo demasiado cercano entre la persona y el animal, porque puede tener el efecto contrario: despertar el deseo de tener uno y alimentar la compra de fauna silvestre, que es lo que mueve el tráfico. Por eso mostramos pruebas y no cercanía: facturas y avances del tratamiento, nunca fotos de personas con animales.
>
> En desarrollo, un aporte salía fallido en nuestra página pero confirmado en Stellar. La causa: el hash de una transacción no incluye las firmas, así que un reintento bien firmado tenía el mismo hash. Ahora el estado se confirma leyendo la red. Aprendimos que la fuente de verdad es la red, no nuestra base de datos.

El error de desarrollo está en `DEBUG_LOG.md` y en el commit "fix(aportes): reenviar un aporte rechazado por la red no lo deja fallido".

### 2:40–3:00 · Qué sigue y paso a la demo

> Con un mes más, haríamos un piloto con una fundación real, para ver cómo les funciona en el día a día. Y más adelante, integraríamos rampas: la entrada y salida entre pesos y USDC en Stellar, que les sirve tanto a las personas como a las empresas que quieran donar. Hace un momento casi todos bajaron la mano. Ahora van a ver una donación en la que no hay que bajarla: vamos a apadrinar a la guacamaya en vivo.

## Demo en vivo (3 minutos)

Un solo computador con dos perfiles de navegador: el del donante, sin sesión iniciada y con Freighter ya instalado y con USDC de prueba, y el de Refugio Alas Libres, con la sesión iniciada en el portal y su Freighter.

La guacamaya arranca en 10 de 150 USDC: en el contrato de la demo quedaron 10 USDC de una prueba del equipo, todos en la etapa 1 (medicamento, 10 de 40), y el contrato no permite devolverlos. Por eso el aporte en vivo es de 40 USDC: completa justo el medicamento antes de registrar su gasto de 40.

| Tiempo | Qué se hace | Qué se dice |
|---|---|---|
| 0:00–0:30 | Sin cuenta, se abre la guacamaya (POW_001, que ya lleva 10 de 150 USDC) y se pulsa "Apadrinar este caso": la página no deja aportar y pide crear una cuenta. Se crea con correo y contraseña, y la página vuelve al caso con la ventana de apadrinar abierta | "Nadie dona de forma anónima: primero se crea una cuenta. La contraseña nunca llega a nuestro servidor." |
| 0:30–1:10 | Se conecta la billetera Freighter y se escriben 40 USDC en «Otro valor». La ventana muestra el reparto antes de firmar: 30 completan el medicamento (que ya llevaba 10) y 10 van a los cuidados. Se firma y el comprobante se abre en Stellar Expert | "El donante conecta su billetera y, antes de firmar, ya sabe en qué se usará su aporte. Esta es la invocación de `aportar` en testnet, con el reparto en el evento." |
| 1:10–1:50 | Portal de Refugio Alas Libres, "Registrar gasto": POW_001, etapa 1, 40 USDC, Droguería Veterinaria El Arrayán, factura FV-0412. Se firma y se abre en Stellar Expert | "La ONG compró la medicina. El contrato le paga directo a la droguería: acá se ve el pago y el hash de la factura." |
| 1:50–2:20 | De vuelta como donante: el panel de transparencia muestra el gasto con su factura. Luego "Mi perfil": "Tu aporte se usó en" y la insignia Huella verificada | "Esta es la doble confirmación: la factura en la página y el pago en la red, con el mismo hash." |
| 2:20–2:50 | Verificación de identidad (KYC): se intenta apadrinar con 60 USDC y la página lo frena y lleva a verificar la identidad. Se muestran los pasos (documento, prueba de vida y comparación del rostro) y se completa con "Simular la verificación (demo)" | "Con la cuenta se puede aportar hasta 50 dólares. Para más, pedimos verificar la identidad con documento y prueba de vida. En la demo la consulta al registro está simulada." |
| 2:50–3:00 | Se muestra la sección de voluntariados | "Y quien hoy no puede donar, puede ser voluntario y conocer la ONG por dentro." |
