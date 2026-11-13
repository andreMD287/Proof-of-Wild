# Proof of Wild · equipo Proof of Wild

**Problema.** Quien quiere financiar la recuperación de un animal silvestre rescatado no puede comprobar en qué se usó su aporte, y las ONG pequeñas no tienen cómo demostrarlo; con Proof of Wild la persona apadrina un caso, ve cómo su aporte se reparte entre las etapas del tratamiento y verifica en Stellar cada pago al proveedor y cada factura.

**Por qué Stellar y no una base de datos.** El donante no conoce a la ONG, la ONG no tiene cómo probar sus gastos y, si los datos los guardara la plataforma, también habría que confiar en ella. En Stellar el contrato guarda el aporte y solo lo suelta como pago directo a un proveedor con la firma de la ONG, cualquiera verifica en el explorador el reparto, el pago y el hash de la factura, y cada transacción se confirma en segundos y paga solo la comisión de la red de Stellar, una fracción de XLM (el aporte de la tabla de abajo pagó 0,0009851 XLM de comisión), así que hasta un aporte pequeño llega casi completo.

- **Demo en vivo:** https://proof-of-wild.vercel.app (red de pruebas: no se usa dinero real)
- **Documentos:** [pitch](docs/PITCH.md), [bitácora de depuración](DEBUG_LOG.md), [arquitectura y ADR](docs/arquitectura/arquitectura.md), [contexto y drivers](docs/arquitectura/contexto-y-drivers.md), [diseño](DESIGN.md) y [producto](PRODUCT.md)

## Qué hace hoy (versión del Demo Day)

Los hashes son transacciones reales del caso `POW_002` (tortuga hicotea, Fundación Bosque Vivo).

| Pantalla o función | Qué hace el usuario | Operación o función | Hash |
|---|---|---|---|
| Preparación de la red (`npm run red:preparar`) | El administrador registra el caso, su ONG y el costo de sus 4 etapas | `crear_caso` | [`8fefaa10…`](https://stellar.expert/explorer/testnet/tx/8fefaa10deaf279572515315eb21d2530318d5d0266bd912cd6769a052b6032e) |
| Crear cuenta e ingresar | Crea su cuenta con correo y contraseña (SRP-6a); sin cuenta de persona no se puede apadrinar | Fuera de la red | — |
| Detalle del caso · Apadrinar | Conecta su billetera, elige el monto, ve el reparto previsto y firma. En el ejemplo, 20 USDC que van a la etapa 1 | `aportar` | [`6915cd57…`](https://stellar.expert/explorer/testnet/tx/6915cd5714baff2cf4c454de4ebbce47754f0c1bff8ee8124903d5d15d91d33f) |
| Comprobante | Abre su aporte en Stellar Expert | Lectura | — |
| Portal de la ONG · Registrar gasto | La ONG elige caso y etapa, sube la factura y firma: el contrato paga 25 USDC al proveedor y guarda el hash de la factura | `registrar_gasto` | [`7c800f31…`](https://stellar.expert/explorer/testnet/tx/7c800f31a82879f60ae35467a239f3715a9e5dabb98e940caa2b0464ea43bb2f) |
| Portal de la ONG · Registrar hito | La ONG sube la foto del avance y firma | `registrar_hito` | [`2ae9af25…`](https://stellar.expert/explorer/testnet/tx/2ae9af25acd39e7d1eaf076d864222cbe61e152c25ce6e3f9cc12e0410032753) |
| Panel de transparencia del caso | Cualquiera ve lo cubierto y gastado por etapa y compara la factura publicada con su hash | `consultar_caso` y `consultar_hito` | — |
| Verificación de identidad | Para aportar más de 50 USDC: documento, prueba de vida y comparación del rostro | Fuera de la red (consulta al registro simulada) | — |
| Mi perfil · Huella verificada | Ve en qué se usó su aporte y comparte su insignia | Lectura | — |
| Voluntariados | Se inscribe a una jornada de una ONG | Fuera de la red | — |
| Selector de idioma (ES · EN · PT) | Cambia toda la página a inglés o portugués (rutas `/en` y `/pt`); lo que escriben las ONG se ve en su idioma original | Fuera de la red | — |

**Doble comprobación de la factura.** La factura de ese gasto está publicada. Su SHA-256 es el mismo que el último argumento (`hash_factura`) de la transacción `registrar_gasto` de arriba:

```bash
curl -s https://proof-of-wild.vercel.app/api/evidencias/e49faf45-c165-4784-a13e-fa96adadf23d.pdf | sha256sum
# a7149de98dacab80148c2f8adacd8de7680b50e71dada63d61c45637d2fc774d
```

Qué NO hace todavía:

- **No hay firma doble ni validador.** Un gasto lo firma solo la ONG; la firma de un validador independiente (veterinario o biólogo) queda para la etapa 2. Los niveles de validación de la página los fija la ONG.
- **No se crean ni se cierran casos desde la interfaz.** Los 5 casos de la demo los crea el script; tampoco hay manejo del saldo al cerrar un caso.
- **No hay panel de administración.** Las ONG de la demo vienen aprobadas; una ONG nueva queda «en revisión» sin que nadie la apruebe desde la página.
- **El KYC no es real.** La biometría corre en el navegador y alguien con conocimientos técnicos podría falsear sus puntajes; la consulta a la Registraduría y la verificación de las ONG son simuladas. En producción las haría un proveedor (Truora, Didit, MetaMap) con el mismo puerto `IdentityProvider`.
- **El límite de 50 USDC lo aplica la aplicación, no el contrato.** Quien llame al contrato directamente puede aportar sin verificarse.
- **Solo testnet.** El USDC no tiene valor; no hay rampa de pesos a USDC, aportes mensuales ni cuentas corporativas.
- **No hay recuperación de contraseña** ni correos.
- **Un hash no prueba que una factura sea auténtica**, solo que no cambió. Eso depende de la validación humana.
- Otros pendientes técnicos están en la [bitácora de depuración](DEBUG_LOG.md#abiertos) y en la [deuda reconocida](docs/arquitectura/arquitectura.md#deuda-reconocida).

## Límites conocidos y siguiente paso

Revisamos el contrato y la página antes del Demo Day. Estos son los límites que conocemos, cómo están hoy y qué haríamos después. No volvimos a desplegar el contrato antes de la demo.

| # | Límite | Estado hoy | Siguiente paso |
|---|---|---|---|
| L1 | `registrar_gasto` lo firma solo la ONG del caso | Declarado. Cada gasto queda público, con el pago al proveedor y el hash de la factura | Doble firma: la ONG y un validador (prevista como etapa 2 en el ADR-11) |
| L2 | No hay cierre de caso ni devoluciones: si un caso no llega a la meta, el saldo se queda en el contrato | Declarado | Una función `cerrar_caso` con plazo y devolución proporcional a los donantes |
| L3 | La primera cuenta que llame `inicializar` queda como administradora | El script de preparación lo llama justo después del despliegue, y `consultar_config` muestra la cuenta administradora | Inicializar con `__constructor`, en la misma transacción del despliegue |
| L4 | El contrato no se puede actualizar, y no se puede cambiar la ONG de un caso | Decisión del MVP: nadie puede cambiar las reglas después de un aporte | Cambio de ONG con la firma del administrador y de un validador, y con evento público |
| L5 | La cuenta y el límite de 50 USDC sin KYC los aplica la página, no el contrato: `aportar` acepta cualquier billetera con USDC | Declarado. Un aporte hecho por fuera de la página igual queda repartido y público | Que el contrato acepte solo cuentas verificadas por la plataforma |
| L6 | La biometría corre en el navegador y se puede falsear; la consulta al registro y la verificación de las ONG son simuladas | Declarado y marcado como simulado en la página | Un proveedor de identidad (Truora, Didit o MetaMap) con el mismo puerto `IdentityProvider` |
| L7 | El contrato no sabe si una factura es real: guarda su hash, no su contenido | La página publica la factura, con los datos de terceros tapados, para compararla con el hash | Que el validador de L1 revise la factura antes de firmar el gasto |
| L8 | El USDC es de prueba y lo emitió el equipo, así que su emisora podría crear más | Solo en testnet, sin valor real | USDC de Circle en la red principal |
| L9 | No hay forma de recuperar la contraseña | Fuera del MVP | Recuperación por correo |

## Cuentas y contratos en testnet

| Rol | Identificador |
|---|---|
| Contrato (Builders) | `CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP` · desplegado el 9 de noviembre de 2026 a las 8:31 p. m., hora de Colombia (10 de noviembre, 01:31 UTC) |
| Hash del WASM desplegado | `446db659a46658667cff899615343087f322426b616d4371303da9e46d57bd6d` |
| Activo | `USDC:GBE4HMOIS4C7BXKREWXT4JAWIOTT5UJQT7OD7U4S3XXDMBY4HKQGZ52I` (USDC de prueba, emisora del equipo) |
| Stellar Asset Contract del USDC | `CD2FB3H4RXEWWKJK2HNIPVATVXY4DOS673HGYM6SNZRGRNWYLDJCFYHS` |
| Administrador del contrato | `GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK` |
| ONG del caso POW_002 (Fundación Bosque Vivo) | `GBDJ2DRDWUC6LXI2OIXFYA5NVLIHUCYJJDZZ3IHI54RI5KGKSDNYIIHJ` |

Invocación de ejemplo (Builders):

Las consultas no necesitan firma: `--send=no` solo simula y cualquier cuenta sirve como origen.

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK \
  --network testnet --send=no \
  -- consultar_caso --caso POW_002
```

Respuesta real del 12 de noviembre de 2026 (montos en unidades de 7 decimales: `250000000` = 25 USDC). Es la tortuga hicotea: la etapa 1 está cubierta y gastada, y la 2 lleva 11 de 35 USDC:

```json
{"etapas":[{"costo":"250000000","cubierto":"250000000","gastado":"250000000"},{"costo":"350000000","cubierto":"110000000","gastado":"0"},{"costo":"200000000","cubierto":"0","gastado":"0"},{"costo":"100000000","cubierto":"0","gastado":"0"}],"gastado":"250000000","hitos":1,"meta":"900000000","ong":"GBDJ2DRDWUC6LXI2OIXFYA5NVLIHUCYJJDZZ3IHI54RI5KGKSDNYIIHJ","recaudado":"360000000","saldo":"110000000"}
```

El hash de la evidencia de su primer hito:

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account GCVZTMZCRIMNA53WIY57PNXRYOMKWEGJBEECLO27GUWUUYJ2PKJMHLOK \
  --network testnet --send=no \
  -- consultar_hito --caso POW_002 --indice 0
# {"etapa":1,"hash_evidencia":"edecc2599088f759f7bfe07b9ff3106810e50cf7146f34f69a1864e2a1b0663b"}
```

Un aporte sí exige la firma del donante y USDC de prueba en su cuenta (`npm run red:usdc` lo envía). Por ejemplo, 5 USDC a la tortuga desde una identidad del CLI llamada `mi-cuenta`:

```bash
stellar contract invoke \
  --id CCRRYW6APIVCRMPHCCKQXDACHYWO2VGLRPA7OASLVU3SPOVTWQBEOIFP \
  --source-account mi-cuenta --network testnet \
  -- aportar --donante mi-cuenta --caso POW_002 --monto 50000000
```

## Cómo correrlo

Requisitos:

- Node 22.12 o superior (con nvm: `nvm use 22`)
- Docker, para PostgreSQL local
- Rust 1.91.1 con el destino `wasm32v1-none`, para compilar el contrato. En Windows sin Visual Studio Build Tools sirve la cadena GNU: `rustup toolchain install 1.91.1-x86_64-pc-windows-gnu --target wasm32v1-none` y luego `cargo +1.91.1-x86_64-pc-windows-gnu …`
- Stellar CLI, para consultar el contrato desde la terminal
- Una billetera de Stellar en testnet (por ejemplo, Freighter) para aportar desde la página

```bash
git clone https://github.com/andreMD287/Proof-of-Wild.git
cd Proof-of-Wild
npm install
cp .env.example .env      # completa SESSION_SECRET, CRON_SECRET y DEMO_PASSWORD
npm run db:up             # PostgreSQL local (puerto POW_DB_PORT, por defecto 55432)
npm run db:migrate        # crea las tablas
npm run contrato:build    # compila el WASM del contrato
npm run red:preparar      # cuentas, USDC de prueba, contrato, casos y actividad en testnet
npm run dev               # http://localhost:3000
```

`red:preparar` deja la demo lista en unos minutos y se puede repetir cuando algo falle o después de un reinicio de testnet (el próximo anunciado es el 16 de diciembre de 2026). Crea y fondea con Friendbot las cuentas del administrador, el emisor del USDC, las 2 ONG, los 5 proveedores y los 8 donantes; emite el USDC de prueba y despliega su Stellar Asset Contract; despliega el contrato, crea los 5 casos y hace en la red los 13 aportes del documento de datos de prueba, en su orden, con los gastos (pago al proveedor y factura PDF de ejemplo) y los hitos. Reinicia la base de datos con esos datos y escribe `CONTRACT_ID`, `ASSET_ISSUER` y `ASSET_CONTRACT_ID` en `.env`. Las llaves de testnet quedan en `.data/cuentas-demo.json`, que git ignora.

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas de dominio y adaptadores; con `TEST_DATABASE_URL`, también las de integración |
| `npm run test:integration` | Solo las pruebas de integración contra `TEST_DATABASE_URL` |
| `npm run contrato:test` | Pruebas del contrato (`cargo test`) |
| `npm run contrato:build` | WASM de release del contrato |
| `npm run red:preparar` | Prepara toda la demo en testnet (ver arriba) |
| `npm run red:probar` | Prueba de punta a punta en testnet con un contrato y una base desechables (no toca la demo) |
| `npm run red:usdc -- <cuenta G…> [monto] [--esperar]` | Envía USDC de prueba de la demo a una billetera propia para apadrinar con ella. Si la billetera no acepta aún ese USDC, imprime la línea de confianza sin firmar |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Carga ONG, proveedores, casos con etapas, donantes y voluntariados (sin actividad en la red) |
| `npm run db:seed:activity` | Igual, con aportes, gastos e hitos de ejemplo con **hashes inventados**: solo para trabajar la interfaz sin red |
| `npm run db:fotos` | Pone las fotos de los casos y de cada etapa en una base ya sembrada, sin tocar cuentas ni aportes |
| `node scripts/preparar-imagenes.mjs [--drive] "<carpeta>"` | Re-codifica en WebP sin EXIF las fotos que entrega el equipo |
| `npx tsx --env-file=.env scripts/evidencias-a-bd.ts` | Pasa a la base las evidencias que estaban en disco, con la misma clave |

Las evidencias (facturas y fotos de los hitos) se guardan en la base de datos (`EVIDENCE_STORAGE=db`), así la aplicación no necesita disco en Vercel. Las pruebas de integración **vacían** la base de `TEST_DATABASE_URL`: usa una base distinta de la de la demo (`proofofwild_test`, ver `.env.example`); se niegan a correr si apunta a la misma de `DATABASE_URL`.

Builders: `npm run contrato:test` corre `cargo test`; el build es `npm run contrato:build` y el despliegue lo hace `npm run red:preparar` (`scripts/preparar-red.ts`).

## Diseño

- Contrato: [`contracts/proof-of-wild`](contracts/proof-of-wild) y el ADR-11 en [`docs/arquitectura/arquitectura.md`](docs/arquitectura/arquitectura.md) (sin revisión formal en office hours: resolvimos preguntas puntuales y aplicamos la retroalimentación del 6 de noviembre de 2026). Pantallas: [`DESIGN.md`](DESIGN.md) y [`PRODUCT.md`](PRODUCT.md).
- Decisiones que vale la pena saber:
  - **Storage elegido y por qué:** instance para la configuración (administrador y contrato del USDC), que se lee en cada llamada; persistent para cada caso y sus hitos, porque son datos que tienen que durar.
  - **Qué pasa si expira el TTL:** cada vez que se lee o se escribe un caso se extiende a 90 días si le quedan menos de 30. Si aun así expira, el dato persistente queda archivado y se puede restaurar.
  - **Quién puede llamar qué:** `inicializar` y `crear_caso`, solo el administrador; `aportar`, el donante; `registrar_gasto` y `registrar_hito`, solo la ONG del caso (`NoEsLaOngDelCaso` si firma otra). Todas exigen `require_auth` de quien llama. Las consultas, cualquiera.
  - **Reparto y gasto:** `aportar` llena las etapas en orden y rechaza lo que supere la meta (`SuperaLaMeta`); una etapa no gasta más de lo cubierto y sin gastar (`FondosInsuficientes`).
  - **Montos:** enteros `i128` con 7 decimales (`250000000` = 25 USDC); el frontend convierte en un solo lugar (`src/lib/amount.ts`).
  - **Confirmación:** el servidor guarda una copia de cada transacción antes de enviarla, porque el RPC conserva los eventos unos 7 días, y la confirma leyéndola en la red (ADR-12).

### Funciones del contrato

Amplía el contrato `RaizSilvestre` de la semana 3 (que sigue en el historial) con lo que pide el brief. Código en [`contracts/proof-of-wild`](contracts/proof-of-wild).

| Función | Quién la firma | Qué hace |
|---|---|---|
| `inicializar(admin, token)` | Administrador, una vez | Guarda la cuenta administradora y el contrato del USDC de prueba |
| `crear_caso(caso, ong, costos_etapas)` | Administrador | Registra el caso (`POW_001`, como Symbol), la cuenta de su ONG y el costo de cada etapa |
| `aportar(donante, caso, monto)` | Donante | Transfiere el USDC al contrato y lo reparte en orden entre las etapas; rechaza lo que supere la meta. Evento `aporte` con el reparto |
| `registrar_gasto(ong, caso, etapa, proveedor, monto, hash_factura)` | La ONG del caso | Le paga al proveedor desde lo cubierto y sin gastar de esa etapa y guarda el hash de la factura. Evento `gasto` |
| `registrar_hito(ong, caso, etapa, hash_evidencia)` | La ONG del caso | Deja en la red el hash de la foto o documento. Evento `hito` |
| `consultar_caso(caso)` | Nadie (lectura) | Costo, cubierto y gastado de cada etapa, y saldo del caso |
| `consultar_hito(caso, indice)` | Nadie (lectura) | Etapa y hash de la evidencia de un hito |

### Cómo usa Stellar

| Pieza | Para qué |
|---|---|
| Contrato Soroban `ProofOfWild` | Custodia el dinero de cada caso, lo reparte por etapas, paga a los proveedores y guarda los hashes de facturas y evidencias |
| USDC de prueba con su Stellar Asset Contract | El activo de los aportes (testnet, sin valor) |
| Billeteras (Freighter, Albedo, xBull…) vía Stellar Wallets Kit | Donantes y ONG firman sus propias transacciones; el servidor nunca guarda llaves |
| RPC de Soroban y Horizon | El servidor arma las transacciones sin firmar, las envía y confirma cada aporte, gasto o hito **leyéndolo en la red** |
| Stellar Expert | Cada aporte, gasto e hito de la página enlaza a su transacción |

## Declaración de uso de IA (proyecto completo)

64 de los 78 commits del repositorio (hasta el 12 de noviembre de 2026) llevan la línea `Co-Authored-By: Claude …`. Se listan con `git log --grep="Co-Authored-By: Claude" --oneline`.

| Qué parte | Herramienta | Para qué | Qué verificamos a mano |
|---|---|---|---|
| Contrato Soroban y sus pruebas | Claude Code | Escribió la mayor parte de las funciones y las pruebas | 14 pruebas del contrato, 3 de autorización con `mock_auths`; revisamos quién firma cada función y probamos los rechazos en testnet con `red:probar` |
| Servidor, base de datos e interfaz | Claude Code, con skills de diseño (impeccable, taste-skill, ui-ux-pro-max) y componentes de 21st.dev como referencia | Escribió la mayor parte del código y propuso diseños de interfaz | 103 pruebas de la aplicación y la integración continua; probamos cada función en el navegador, con nuestra propia billetera de testnet y en el celular |
| Scripts de testnet | Claude Code | `red:preparar`, `red:probar` y `red:usdc` | Corrimos la prueba de punta a punta (27 comprobaciones) y revisamos las transacciones en Stellar Expert |
| Verificación de identidad | Claude Code y `@vladmandic/human` | Flujo de documento, prueba de vida y comparación del rostro | Probamos el flujo simulado, el límite de 50 USDC y la detección de rostros en el navegador |
| Documentación (arquitectura, ADR, README, bitácora, brief, pantallas, datos de prueba y pitch) | Claude Code y Claude | Redacción a partir de las decisiones del equipo | El equipo definió el problema, el alcance y cada cambio de producto, y revisó las cifras y sus fuentes |

Nada se fusionó sin pasar las pruebas y la integración continua, y el equipo aprobó cada publicación a producción. Los errores que encontramos, incluidos los de código generado, están en [DEBUG_LOG.md](DEBUG_LOG.md). El equipo responde por todo el código y el contenido del repositorio.

## Equipo

| Nombre | Rol en la demo | Rol en el proyecto | GitHub |
|---|---|---|---|
| Diana Durán | Pitch · preguntas | Producto y diseño | [@duraznito16](https://github.com/duraznito16) |
| André Landinez | Demo · preguntas | Desarrollo fullstack y del contrato inteligente (Soroban) | [@andreMD287](https://github.com/andreMD287) |

---

## Más detalle

### Pruebas

| Comando | Qué cubre |
|---|---|
| `npm test` | 103 pruebas (Vitest): reglas del dominio, adaptadores y, con `TEST_DATABASE_URL`, integración con PostgreSQL real |
| `npm run contrato:test` | 14 pruebas del contrato. Las de autorización usan `mock_auths` con firmas concretas: `aportar` solo con la firma del donante (ni la del administrador sirve) y comprueba la firma registrada con `env.auths()`; `registrar_gasto` solo con la de la ONG del caso (el proveedor no puede cobrarse solo); `crear_caso` solo con la del administrador |
| `npm run red:probar` | Prueba de punta a punta en testnet con un contrato y una base desechables: 27 comprobaciones (reparto, pago al proveedor, hashes de factura y foto, rechazos por firma ajena o transacción cambiada) |

La integración continua (GitHub Actions) corre tipos, pruebas con PostgreSQL y compilación en cada cambio, y las pruebas y la compilación del contrato.

### Cuentas, apadrinar e identidad

- `red:preparar` (o `db:seed`) crea el administrador (`admin@proofofwild.example`) y las cuentas de las 2 ONG (`contacto@alaslibres.example`, `hola@bosquevivo.example`) con la contraseña `DEMO_PASSWORD`. Ana y Fundación Huellitas crean su cuenta en vivo.
- **Apadrinar exige una cuenta de persona** con la sesión iniciada: el servidor rechaza preparar o enviar un aporte sin ella (401) o con una cuenta de ONG o de administrador (403). Sin cuenta, «Apadrinar» abre una invitación y al crear la cuenta o ingresar se vuelve al caso con la ventana abierta.
- **Verificación de identidad por niveles (KYC basado en riesgo):** hasta 50 USDC basta la cuenta; para aportes mayores el servidor exige identidad verificada (403 `verification_required`). La verificación en `/cuenta/verificar` tiene cuatro pasos: foto del documento (cédula o pasaporte), prueba de vida (mirar de frente, parpadear y girar la cabeza), comparación del rostro con el del documento (desde 50 % de coincidencia) y consulta al registro, **simulada** (un documento que termina en `0000` «no aparece»). La biometría corre en el navegador con `@vladmandic/human` y las imágenes nunca salen del equipo; se guarda solo el resultado (HMAC y últimos 4 dígitos del documento, método, coincidencia y autorización de datos sensibles). Se puede borrar desde «Mi perfil». Si la cámara falla, «Simular la verificación (demo)» la completa y queda marcada como simulada.

### Idiomas

La plataforma está en **español, inglés y portugués de Brasil**, como kiba.tools: el español va sin prefijo (`/casos/POW_001`) y los otros con prefijo (`/en/casos/POW_001`, `/pt/casos/POW_001`). El selector ES · EN · PT del menú cambia la página entera y la plataforma recuerda la elección en una cookie.

- `src/proxy.ts` quita el prefijo, sirve la ruta sin prefijo y le pasa el idioma a la página; `/api` responde en el idioma de la cookie.
- Los textos están en `src/i18n/mensajes/<área>.ts` (`comun`, `inicio`, `casos`, `cuenta`, `ong`, `huella`, `errores`). El español es la fuente y el compilador avisa si a una clave le falta el inglés o el portugués.
- En un componente de servidor: `const { t, ruta } = await getT();` (`@/i18n/servidor`); en uno de cliente: `const { t, ruta } = useT();` (`@/i18n/cliente`). Todo enlace interno pasa por `ruta()`.
- Los errores del dominio se escriben en español y se traducen al responder (`traducirError`).
- No se traduce lo que escriben las ONG: historias, etapas y voluntariados se ven como los escribieron.

### Tecnologías

| Parte | Tecnología |
|---|---|
| Aplicación | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| Datos | PostgreSQL 16 con Drizzle ORM (migraciones versionadas) |
| Contrato | Rust y `soroban-sdk` 27 |
| Stellar | `@stellar/stellar-sdk` (RPC de Soroban y Horizon) y Stellar Wallets Kit |
| Cuentas | SRP-6a con `secure-remote-password`: la base de datos nunca ve la contraseña |
| Biometría | `@vladmandic/human` en el navegador |
| Otros | zod, sharp (borra el EXIF de las fotos), Vitest |
| Despliegue | Vercel (aplicación) y Neon (PostgreSQL con las evidencias); `main` es producción |

### Estructura

```text
contracts/proof-of-wild/  Contrato Soroban (Rust) y sus pruebas
scripts/                  Preparación de la red y de las imágenes, y prueba de punta a punta
src/
  app/            Presentación (Next.js): páginas, layouts, acciones y rutas API
  i18n/           Idiomas: configuración, traductor y diccionarios por área (español, inglés y portugués)
  components/     Interfaz: inicio, casos, huella (perfil e insignia), identidad (verificación con cámara),
                  mapa (ruta y curvas de nivel), movimiento, estados, sitio y billetera
  modules/        Dominio y aplicación por capacidad (cases, catalog, contributions, identity, records, shared)
  ports/          Puertos que el dominio necesita del exterior
  platform/       Adaptadores: db, stellar (contrato y plan B clásico), storage, auth, identity, config y container.ts
  lib/            Utilidades sin lógica de negocio
public/           Fotos de la demo (sin EXIF), fotos por etapa, logo y modelos de la biometría
drizzle/          Migraciones SQL
docs/             Arquitectura (ADR-01 a ADR-22) y pitch
tests/            Pruebas de dominio, adaptadores, idiomas e integración
```

### Seguridad

- No subas `.env`, `.data/` ni llaves secretas. Lo que se escribe en Stellar es público y no se puede borrar.
- El servidor no guarda llaves de las personas: cada una firma con su billetera. Las llaves de `.data/cuentas-demo.json` son solo de testnet y solo para los scripts.
- Las fotos se re-codifican sin metadatos (EXIF con GPS) y las facturas se publican sin datos personales de terceros.

### Licencia

[MIT](LICENSE).
