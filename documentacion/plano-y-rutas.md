# Plano y rutas

Archivos: `public/plano.js` (cálculo puro) y la vista **Plano** de `public/app.js` y `public/index.html`.

## Modelo del plano (automático)

El plano se arma a partir de las ubicaciones cargadas. No se guardan posiciones: se deducen de pasillo y estante.

- **Pasillos = filas.** Se ordenan alfabéticamente con criterio español: A, B, C...
- **Estantes = columnas.** Se ubican según su número: el estante 1 es la primera columna, el 2 la siguiente, etc.
- **Niveles:** no se dibujan como posición. Aparecen en el texto del destino y en el detalle de cada estante.
- **Pasillo principal:** corre por la columna 0, a la izquierda de todos los estantes.
- **Entrada:** arriba, sobre el pasillo principal.

Este es un modelo simplificado. Si el depósito real no sigue esa forma, el plano automático no lo refleja fielmente. Ver "Pendiente".

## Estantes sin posición

Una ubicación cuyo estante no es numérico (por ejemplo `"X"` o `"Estante Norte"`) no tiene posición en el plano. Se lista debajo del dibujo y no se puede llegar a ella con una ruta. Mensaje: "Esta ubicación no tiene posición en el plano."

## Cálculo de la ruta

Para llegar a una ubicación con pasillo `P` y estante `N`:

1. Entrar por la **entrada** (arriba).
2. Bajar por el **pasillo principal** (columna 0) hasta la fila del pasillo `P`.
3. Avanzar por la fila `P` hasta la columna `N`.

La ruta son tres puntos unidos por una línea. No se calcula un camino más corto: el recorrido sigue siempre esa forma.

## Pasos que se muestran

- "Entrá por la entrada del depósito."
- "Bajá por el pasillo principal hasta el pasillo P."
- "Avanzá por el pasillo P hasta el estante N, nivel L."

## Cómo se llega a la vista

- **Menú → Plano:** muestra todo el depósito, sin ruta.
- **Contenedores → Cómo llegar:** abre el plano con la ruta hasta la ubicación del contenedor y el estante destino resaltado.
- Un contenedor sin ubicación muestra "Sin ubicación" en lugar del botón.

## Qué no depende de la persistencia

El plano usa solo la lista de ubicaciones y de contenedores que ya devuelve la interfaz de persistencia. Cambiar de almacenamiento no obliga a tocar `plano.js`.

## Pendiente

- Plano manual: definir el tamaño real del depósito, las paredes y la posición exacta de cada estante.
- Ruta por la ruta más corta cuando haya varios caminos posibles.
- Vista 3D (módulo final del proyecto).
- Revisión en navegador real, escritorio y celular.
