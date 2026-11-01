# Plano 3D

Archivos: `public/plano3d.js` (la vista) y `public/vendor/three.min.js` (Three.js, licencia MIT en `public/vendor/three-LICENSE.txt`).

## Qué muestra

- El mismo depósito que el plano 2D. Cada estantería se dibuja como estantería de logística: postes, vigas al frente y al fondo, y una tabla por cada estante (el 1 abajo). Las divisiones son las bahías, de izquierda a derecha. Se lee igual que la vista de frente: el número de estante a la izquierda (el 1 arriba), la letra de división arriba, y cada contenedor en su celda.
- Cada contenedor se dibuja con la forma de su tipo sobre la tabla: caja de cartón, bolsa chata, tambor (cilindro), pallet (base de madera con carga) y otro (cubo gris). Si una ubicación tiene varios, van uno al lado del otro.
- Las formas tienen texturas de cartón y madera, las bolsas son irregulares con cierre, los tambores tienen zunchos y los pallets tienen tablas.
- Hay sombras y una línea amarilla de seguridad alrededor del piso.
- La entrada es una esfera en la pared izquierda, y cada estantería tiene su letra arriba.
- Si hubo una búsqueda o un "Cómo llegar", la estantería destino se resalta en verde y la ruta más corta se dibuja en verde sobre el piso.
- Se abre desde el menú **Plano 3D**.

## Recuadro "Contenedor buscado"

Debajo del plano 3D hay un recuadro con una foto fija de la estantería donde está el contenedor buscado. Un anillo naranja que pulsa marca la celda, y el código aparece encima. Se actualiza al buscar un código o usar "Cómo llegar" a un contenedor. Si no hay contenedor buscado, muestra un texto pidiendo que busque uno.

## Cómo se usa

- Arrastrar con el mouse para girar.
- Rueda del mouse para acercar o alejar.

## Qué no hace (por ahora)

- No muestra el contenido de cada caja ni los códigos; eso sigue en la vista de frente del plano 2D.
- No cambia datos: solo lee la lista de ubicaciones y la ruta.
- Es un prototipo, probado en navegador de prueba con datos de ejemplo. Falta probarlo en celular y en pantallas grandes.
