# Registro de decisiones

Cada decisión tiene fecha, qué se decidió y por qué. Si una decisión se cambia, se agrega una entrada nueva en lugar de borrar la anterior.

## 2026-10-31

**Reconstruir desde cero.** Se descartó el código anterior de stockmap. Queda en el historial de su repositorio original como respaldo.

**Un único tipo de objeto en el depósito: contenedores.** Se registran cajas, bolsas, pallets, tambores y otros contenedores. No se registra su contenido: el sistema solo sabe dónde está cada contenedor.

**Modelo de suscripción.** El producto se vende por suscripción. Cada cliente tiene sus usuarios, y el administrador general (Fabio) ve y gestiona todos los clientes.

**Roles por cliente.** Admin de cliente y operador. Hoy tienen los mismos permisos; la diferencia llega con la gestión de usuarios.

**Cobro de suscripciones manual por ahora.** El estado de la suscripción se carga a mano. La integración con un medio de pago (Mercado Pago o Stripe) queda para una etapa posterior.

**El módulo 3D del depósito va al final.** Se desarrolla cuando la lógica base esté estable.

**Stack inicial: Cloudflare + Supabase.** Se eligió para tener base de datos y autenticación reales. Se descartó poco después, para desarrollar la lógica en memoria primero.

**Persistencia en memoria detrás de una interfaz única.** El frontend solo usa `window.Persistencia`. Así se puede elegir el almacenamiento definitivo más adelante sin tocar la interfaz de usuario.

**Sin Worker de Cloudflare por ahora.** El proyecto es un sitio estático que se publica desde `public/`. El Worker y las claves de Supabase se quitaron junto con Supabase.

**Diseño sobrio, en modo operación.** Paleta gris azulada con acento verde azulado. Se descartó el fondo crema, que el detector de impeccable marca como patrón genérico.

**Menú lateral en lugar de tarjetas apiladas.** Una sección a la vez, con los formularios en paneles desplegables.

## 2026-10-31 (tarde)

**Plano automático por pasillo y número de estante.** El plano se deduce de pasillo, estante y nivel, sin guardar posiciones. Se eligió así para tener algo usable de inmediato. El plano manual queda pendiente.

**Ruta por pasillo principal, sin buscar el camino más corto.** La ruta sigue siempre la forma entrada → pasillo principal → fila del pasillo → estante. Es simple y predecible; la ruta mínima queda para después.

**Cálculo del plano en `plano.js`, fuera de la persistencia.** Es presentación derivada de los datos, así que no se agregó nada a la interfaz de persistencia.

## 2026-10-31 (noche)

**Formato de la ubicación: estantería, estante y división.** La estantería es una letra mayúscula (A, B, C), el estante es un número y la división es una letra minúscula. Los campos internos siguen llamándose `pasillo`, `estante` y `nivel` para no romper el código; cambia el nombre que ve el usuario y la validación.

**Validación del formato al guardar.** Una ubicación que no respeta el formato se rechaza con un mensaje que indica el formato correcto. La estantería y la división se normalizan a mayúsculas y minúsculas.

**Pruebas con tres estanterías.** Los datos de prueba usan las estanterías A, B y C.

## 2026-10-31 (vista de estantería)

**Plano general más vista de frente por estantería.** El plano general muestra dónde está cada estantería, pero no alcanza para ubicar estante y división. Se agregó una vista de frente de la estantería (columnas: estantes; filas: divisiones), que se abre con "Cómo llegar" o tocando una estantería.

## 2026-10-31 (pasillos)

**Pasillos por grupos de estanterías.** Las estanterías se agrupan de cinco en cinco, en orden alfabético (A–E en el pasillo 1, F–J en el pasillo 2). Se eligió así para no cambiar el formato de la ubicación (A · 1 · a). Si el depósito necesita otra agrupación, se cambia la constante `ESTANTERIAS_POR_PASILLO` en `plano.js`.

## 2026-10-31 (camino más corto)

**El depósito es una cuadrícula y la ruta es el camino más corto.** Las estanterías son bloques que no se atraviesan, y el resto es espacio libre. La ruta sale de la entrada y termina en el lado más cercano de la estantería destino, con búsqueda en anchura. Se reemplazó la ruta fija (entrada → calle → pasillo), porque no contemplaba los caminos alternativos ni el lado más cercano de cada estantería.

## 2026-10-31 (datos de prueba al iniciar)

**Los datos de prueba se cargan al iniciar la app (solo desarrollo).** Como la memoria se pierde al recargar la página, había que volver a cargarlos cada vez que se cambiaba de usuario. Ahora `AUTO_DATOS_PRUEBA` los carga al arrancar. El botón "Cargar datos de prueba" sigue disponible para el administrador. Antes de publicar hay que poner `AUTO_DATOS_PRUEBA = false` en `persistencia.js`, junto con los usuarios de prueba.

## 2026-10-31 (plano 3D adelantado)

**El plano 3D se trae antes de lo previsto.** Se había decidido dejarlo para el final, pero se pidió incorporar la idea del plano 3D del repositorio `FABIOR1981/stockmap` (rama `desarrollo`). Se hizo una versión propia sobre la cuadrícula de este proyecto, no una copia: aquel código usa otro modelo de datos. Se usa Three.js en su versión local (`public/vendor/`).

## Pendientes de decisión

- Almacenamiento definitivo (Cloudflare D1, Supabase u otro).
- Método de cobro de las suscripciones.
- Nombre comercial del producto para la marca blanca.
