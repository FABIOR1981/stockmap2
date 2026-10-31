# Reglas de negocio

Estas reglas están implementadas en `public/persistencia.js`. Si cambia una regla, se actualiza este documento en el mismo commit.

## Clientes y suscripciones

- Cada cliente tiene un estado `activo` (sí/no) y una suscripción con `estado` (`activa`, `vencida`, `suspendida`) y una fecha de vencimiento opcional (`venceEl`).
- Un cliente tiene **acceso** solo si está activo, su suscripción está `activa` y no venció (`venceEl` vacía o igual o posterior a hoy).
- Un cliente sin acceso **no se puede modificar**: el usuario puede consultar, pero las altas y bajas fallan con el mensaje "La suscripción de este cliente no está activa."
- La suscripción se gestiona a mano por ahora.

## Ubicaciones

- **Pasillo, estante y nivel son obligatorios.** Se recortan los espacios al inicio y al final.
- No pueden repetirse dentro de un mismo cliente. La comparación es exacta, distingue mayúsculas. Mensaje: "Esa ubicación ya existe."
- **No se puede borrar una ubicación que tiene contenedores.** Mensaje: "Hay contenedores en esa ubicación. Movelos antes de borrarla."
- Las ubicaciones siempre pertenecen a un cliente.

## Contenedores

- **El código es obligatorio** y se recorta. Es único dentro de cada cliente, sin distinguir mayúsculas. Mensaje: "Ya existe un contenedor con el código X."
- **El tipo** debe ser uno de `caja`, `bolsa`, `pallet`, `tambor`, `otro`. Mensaje: "Tipo de contenedor no válido."
- **La ubicación es opcional.** Si se indica, debe pertenecer al mismo cliente. Mensaje: "La ubicación no pertenece a este cliente."
- **La descripción es opcional**, de hasta 120 caracteres (el límite lo aplica el formulario). Debe describir el contenedor, nunca su contenido: el sistema no registra qué hay adentro.
- Al borrar una ubicación, sus contenedores no se borran; por eso la regla de arriba impide esa baja.

## Lo que el sistema no registra

- El contenido de los contenedores.
- Movimientos o historial de ingresos y egresos (pendiente, si se necesita).
