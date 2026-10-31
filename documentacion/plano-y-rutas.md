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

- **Estanterías = filas.** Se ordenan alfabéticamente: A, B, C...
- **Estantes = columnas.** Se ubican según su número: el estante 1 es la primera columna, el 2 la siguiente, etc.
- **Divisiones:** no tienen posición propia en el dibujo. Aparecen en el texto del destino y en el detalle de cada estante, al pasar el cursor.
- **Pasillo principal:** corre por la columna 0, a la izquierda de todos los estantes.
- **Entrada:** arriba, sobre el pasillo principal.

Este es un modelo simplificado. Si el depósito real no sigue esa forma, el plano automático no lo refleja fielmente. Ver "Pendiente".

## Estantes sin posición

Una ubicación cuyo estante no es numérico no tiene posición en el plano. Esto no debería pasar con el formato obligatorio, pero puede ocurrir con datos cargados antes de esa validación. Se lista debajo del dibujo y no se puede llegar a ella con una ruta.

## Cálculo de la ruta

Para llegar a una ubicación con estantería `E`, estante `N` y división `d`:

1. Entrar por la **entrada** (arriba).
2. Bajar por el **pasillo principal** (columna 0) hasta la fila de la estantería `E`.
3. Avanzar por esa fila hasta la columna del estante `N`.
4. Buscar la división `d` de ese estante.

La ruta son tres puntos unidos por una línea. No se calcula un camino más corto: el recorrido sigue siempre esa forma.

## Pasos que se muestran

- "Entrá por la entrada del depósito."
- "Bajá por el pasillo principal hasta la estantería E."
- "Avanzá por la estantería E hasta el estante N."
- "Buscá la división d de ese estante."

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
