# Plano 3D

Archivos: `public/plano3d.js` (la vista) y `public/vendor/three.min.js` (Three.js, licencia MIT en `public/vendor/three-LICENSE.txt`).

## Qué muestra

- El mismo depósito que el plano 2D: cada estantería es un bloque con su letra arriba, la entrada es una esfera en la pared izquierda.
- Si hubo una búsqueda o un "Cómo llegar", la estantería destino se resalta en verde y la ruta más corta se dibuja en verde sobre el piso.
- Se abre desde el menú **Plano 3D**.

## Cómo se usa

- Arrastrar con el mouse para girar.
- Rueda del mouse para acercar o alejar.

## Qué no hace (por ahora)

- No muestra estantes ni divisiones dentro de cada bloque; eso sigue en la vista de frente del plano 2D.
- No cambia datos: solo lee la lista de ubicaciones y la ruta.
- Es un prototipo, probado en navegador de prueba con datos de ejemplo. Falta probarlo en celular y en pantallas grandes.
