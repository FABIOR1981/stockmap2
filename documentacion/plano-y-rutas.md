# Plano y rutas

Archivos: `public/plano.js` (cálculo puro) y la vista **Plano** de `public/app.js` y `public/index.html`.

## Formato de la ubicación

Cada ubicación tiene tres partes:

| Parte | En la interfaz | Campo interno | Formato | Ejemplo |
|---|---|---|---|---|
| Estantería | Estantería | `pasillo` | Letra mayúscula | `A` |
| Estante | Estante | `estante` | Número | `1` |
| División | División | `nivel` | Letra minúscula | `a` |

Una ubicación completa se muestra como `A · 1 · a`.

## Modelo del plano (automático)

El plano se arma a partir de las ubicaciones cargadas. No se guardan posiciones: se deducen de la estantería y el estante.

- **Estanterías = franjas horizontales.** Se ordenan alfabéticamente: A, B, C... Cada franja se puede tocar para abrir su vista de frente.
- **Estantes y divisiones no se dibujan en el plano general.** El plano general solo muestra dónde está cada estantería; el detalle de estante y división está en la vista de frente.
- **Pasillo principal:** corre por la columna 0, a la izquierda de todos los estantes.
- **Entrada:** a la izquierda del depósito, a la altura del centro, de frente a las cabeceras de las estanterías (los extremos de cada fila).
- **Pasillo principal:** corre por las cabeceras de las estanterías, a la izquierda de los estantes.

Este es un modelo simplificado. Si el depósito real no sigue esa forma, el plano automático no lo refleja fielmente. Ver "Pendiente".

## Vista de la estantería (de frente)

Complementa el plano general con el detalle de una estantería:

- **Filas:** los estantes, numerados, a la izquierda.
- **Columnas:** las divisiones, con su letra arriba.
- **Celda:** el número indica cuántos contenedores hay; `·` significa vacía. La celda destino de una ruta se resalta en verde.
- **Cómo se abre:** automáticamente al pedir "Cómo llegar" (muestra la estantería del destino), o tocando una estantería en el plano general.
- **Detalle:** tocar una celda muestra los códigos de los contenedores que hay ahí.

## Estantes sin posición

Una ubicación cuyo estante no es numérico no tiene posición en el plano. Esto no debería pasar con el formato obligatorio, pero puede ocurrir con datos cargados antes de esa validación. Se lista debajo del dibujo y no se puede llegar a ella con una ruta.

## Cálculo de la ruta

Para llegar a una ubicación con estantería `E`, estante `N` y división `d`:

1. Entrar por la **entrada** (a la izquierda, de frente a las cabeceras).
2. Recorrer el **pasillo principal** (columna 0) hasta la franja de la estantería `E`.

En el plano general la ruta termina en la franja de la estantería `E`. El estante `N` y la división `d` se ven en la **vista de frente** de esa estantería, con la celda destino resaltada.

No se calcula un camino más corto: el recorrido sigue siempre esa forma.

## Pasos que se muestran

- "Entrá por la entrada del depósito, de frente a las cabeceras de las estanterías."
- "Recorré el pasillo principal hasta la estantería E."
- "Buscá el estante N, división d, en la vista de frente de la estantería E."

## Cómo se llega a la vista

- **Menú → Plano:** muestra todo el depósito, sin ruta.
- **Contenedores → Cómo llegar:** abre el plano con la ruta hasta la ubicación del contenedor y el estante destino resaltado.
- Un contenedor sin ubicación muestra "Sin ubicación" en lugar del botón.

## Qué no depende de la persistencia

El plano usa solo la lista de ubicaciones y de contenedores que ya devuelve la interfaz de persistencia. Cambiar de almacenamiento no obliga a tocar `plano.js`.

## Pendiente

- Plano manual: definir el tamaño real del depósito, las paredes y la posición exacta de cada estante.
- Ruta por el camino más corto cuando haya varios caminos posibles.
- Vista 3D (módulo final del proyecto).
- Revisión en navegador real, escritorio y celular.
