# Plano y rutas

Archivos: `public/plano.js` (cálculo puro: cuadrícula y ruta) y la vista **Plano** de `public/app.js` y `public/index.html`.

## Formato de la ubicación

Cada ubicación tiene tres partes:

| Parte | En la interfaz | Campo interno | Formato | Ejemplo |
|---|---|---|---|---|
| Estantería | Estantería | `pasillo` | Letra mayúscula | `A` |
| Estante | Estante | `estante` | Número | `1` |
| División | División | `nivel` | Letra minúscula | `a` |

Una ubicación completa se muestra como `A · 1 · a`.

## Modelo del depósito: cuadrícula

El depósito es una cuadrícula de celdas, armada a partir de las estanterías cargadas:

- **Estanterías = bloques que no se atraviesan.** Cada una ocupa 5 × 2 celdas.
- **Agrupación en pasillos:** las estanterías se ordenan alfabéticamente y se agrupan de cinco en cinco. A–E forman el pasillo 1 (una columna de bloques), F–J el pasillo 2, y así. Cada pasillo queda a la derecha del anterior.
- **Espacio libre:** todo lo que no es estantería es libre: calles y pasillos. La ruta puede rodear las estanterías por las calles.
- **Frente de la estantería:** es la cara donde se leen los estantes (a la izquierda) y las divisiones (arriba), la misma que muestra la vista de frente y el recuadro 3D. Es la fila libre justo debajo de la estantería en el plano.
- **Entrada:** en la pared izquierda, a mitad de altura.

Al agregar estanterías, solo cambia la cuadrícula. No hay caminos que recrear a mano.

Constantes en `plano.js`: `ESTANTERIAS_POR_PASILLO` (5), `ANCHO`, `ALTO`, `SEPARACION_PASILLOS` y `ALTO_FILA`.

## Vista de la estantería (de frente)

Complementa el plano general con el detalle de una estantería:

- **Filas:** los estantes, numerados, a la izquierda.
- **Columnas:** las divisiones, con su letra arriba.
- **Celda:** el número indica cuántos contenedores hay; `·` significa vacía. La celda destino de una ruta se resalta en verde.
- **Cómo se abre:** automáticamente al pedir "Cómo llegar" (muestra la estantería del destino), o tocando una estantería en el plano general.
- **Detalle:** tocar una celda muestra los códigos de los contenedores que hay ahí.

## Cálculo de la ruta: camino más corto

La ruta se calcula con una búsqueda en anchura (BFS) sobre la cuadrícula:

1. Se parte de la entrada.
2. Se recorren solo celdas libres (las estanterías no se atraviesan).
3. Se termina en la celda libre justo delante del frente de la estantería destino.

Así el camino es el más corto posible hasta el frente, que es donde se busca el estante y la división. Los pasos que se muestran son tres: entrar, caminar hasta el frente de la estantería y buscar estante y división en la vista de frente.

## Ruta de varios contenedores (menú "Ruta")

- Se escriben los códigos (uno por línea, o separados por coma o espacio; sirve un lector de códigos que envía Enter después de cada uno).
- Cada contenedor se busca por código del sistema o código propio. Los que no existen o no tienen ubicación se avisan en el resumen; el resto sigue.
- Contenedores en la misma ubicación cuentan como una sola parada.
- El orden de visita es el más corto desde la entrada, sin volver a ella. Se calcula con programación dinámica sobre subconjuntos (`ordenOptimo` en `plano.js`), así que el orden es exacto. Hay un máximo de 12 paradas.
- El camino se arma celda por celda, desde la posición actual hasta el frente más cercano de la siguiente parada.
- El recorrido siempre vuelve a la entrada: se suma el camino de vuelta desde la última parada. En 3D la ida es verde y la vuelta roja, más delgada.
- La vista 3D muestra el recorrido con flechas y un número naranja en cada parada. La lista muestra los pasos y los contenedores que se retiran en cada una.

## Cómo se llega a la vista

- **Menú → Plano:** muestra todo el depósito, sin ruta, y deja el campo de búsqueda listo para escanear.
- **Plano → campo "Código del contenedor":** se escribe el código, o se escanea con un lector (que escribe el código y envía con Enter). Busca el contenedor sin distinguir mayúsculas y muestra la ruta a su ubicación. Si no existe, o no tiene ubicación, muestra un aviso.
- **Contenedores → Cómo llegar:** abre el plano con la ruta más corta hasta la estantería del contenedor, y abre su vista de frente con la celda resaltada.
- Un contenedor sin ubicación muestra "Sin ubicación" en lugar del botón.

## Estantes sin posición

Una ubicación cuyo estante no es numérico no tiene posición en el plano. Esto no debería pasar con el formato obligatorio, pero puede ocurrir con datos cargados antes de esa validación. Se lista debajo del dibujo y no se puede llegar a ella con una ruta.

## Qué no depende de la persistencia

El plano usa solo la lista de ubicaciones y de contenedores que ya devuelve la interfaz de persistencia. Cambiar de almacenamiento no obliga a tocar `plano.js`.

## Pendiente

- Plano manual: tamaño real del depósito, paredes, puertas y posición exacta de cada estantería. Hoy la cuadrícula es un modelo fijo.
- Estanterías de distinto tamaño (hoy todas ocupan 5 × 2 celdas).
- Vista 3D (módulo final del proyecto).
- Revisión en navegador real, escritorio y celular.
