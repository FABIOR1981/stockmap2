# Reglas de negocio

Estas reglas están implementadas en `public/persistencia.js`. Si cambia una regla, se actualiza este documento en el mismo commit.

## Clientes y suscripciones

- Cada cliente tiene un estado `activo` (sí/no) y una suscripción con `estado` (`activa`, `vencida`, `suspendida`) y una fecha de vencimiento opcional (`venceEl`).
- Un cliente tiene **acceso** solo si está activo, su suscripción está `activa` y no venció (`venceEl` vacía o igual o posterior a hoy).
- Un cliente sin acceso **no se puede modificar**: el usuario puede consultar, pero las altas y bajas fallan con el mensaje "La suscripción de este cliente no está activa."
- La suscripción se gestiona a mano por ahora.

## Ubicaciones

- **Formato de cada parte de la ubicación:**
  - **Estantería** (campo interno `pasillo`): letras mayúsculas, por ejemplo `A`, `B`, `C`.
  - **Estante** (campo interno `estante`): número, por ejemplo `1`, `2`, `10`.
  - **División** (campo interno `nivel`): letras minúsculas, por ejemplo `a`, `b`.
  - Se recortan los espacios. La estantería y la división se normalizan a mayúsculas y minúsculas al guardar. Si el formato no coincide, el mensaje indica cuál es el correcto.
- Las tres partes son obligatorias.
- El orden de las ubicaciones es numérico en el estante: el 10 va después del 2.
- No pueden repetirse dentro de un mismo cliente. La comparación es exacta, distingue mayúsculas. Mensaje: "Esa ubicación ya existe."
- **No se puede borrar una ubicación que tiene contenedores.** Mensaje: "Hay contenedores en esa ubicación. Movelos antes de borrarla."
- Las ubicaciones siempre pertenecen a un cliente.

## Contenedores

- **El código lo asigna el sistema, automáticamente:** prefijo según el tipo (CJ, BL, PL, TB, OT) y un número correlativo, por ejemplo `CJ-0001`. Es único dentro de cada cliente y no se puede cambiar a mano.
- **El código propio del producto es opcional.** Si el producto trae su propio código, se guarda aparte como `codigoPropio`. El sistema no lo usa como identificador, pero la búsqueda en el plano lo acepta igual.
- **El tipo** debe ser uno de `caja`, `bolsa`, `pallet`, `tambor`, `otro`. Mensaje: "Tipo de contenedor no válido."
- **La ubicación es opcional.** Si se indica, debe pertenecer al mismo cliente. Mensaje: "La ubicación no pertenece a este cliente."
- **Si no se indica ubicación, se asigna al azar una ubicación libre** (sin otros contenedores) del mismo cliente. Si no hay ninguna libre, no se guarda. Mensaje: "No hay ubicaciones libres en el depósito para asignar. Cargá más ubicaciones." Los datos de prueba cargan sus contenedores sin ubicación directamente, sin pasar por esta regla.
- **La descripción es opcional**, de hasta 120 caracteres (el límite lo aplica el formulario). Debe describir el contenedor, nunca su contenido: el sistema no registra qué hay adentro.
- Al borrar una ubicación, sus contenedores no se borran; por eso la regla de arriba impide esa baja.

## Lo que el sistema no registra

- El contenido de los contenedores.
- Movimientos o historial de ingresos y egresos (pendiente, si se necesita).
