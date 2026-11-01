# Interfaz de persistencia

`public/app.js` no sabe dónde se guardan los datos. Solo usa `window.Persistencia`, definido en `public/persistencia.js`.

Hoy la implementación es **en memoria**: los datos se pierden al recargar la página. Es intencional, mientras se desarrolla la lógica.

## Cómo cambiar de almacenamiento

1. Escribir una función `crearPersistenciaXxx()` que devuelva un objeto con la **misma forma** que se describe abajo.
2. Cambiar la última línea de `persistencia.js` para usar esa función.
3. No tocar `app.js` ni `index.html`.

## Forma de la interfaz

Todas las funciones devuelven `Promise`. Los errores de negocio se lanzan como `Error` con un mensaje en español, que `app.js` muestra al usuario tal cual.

### Sesión

| Función | Devuelve | Notas |
|---|---|---|
| `sesion.iniciar(email, password)` | `perfil` o `null` | `null` si el email o la contraseña no coinciden. El email se normaliza (sin espacios, en minúsculas). |
| `sesion.actual()` | `perfil` o `null` | Usuario de la sesión activa. |
| `sesion.cerrar()` | — | Cierra la sesión. |

Forma del `perfil`:

```js
{
  id, nombre, email, rol,        // rol: "admin_general" | "admin_cliente" | "operador"
  clienteId,                     // null para el admin general
  esAdminGeneral,                // true solo para admin_general
  accesoActivo                   // false si el cliente no tiene suscripción vigente
}
```

### Clientes

| Función | Devuelve |
|---|---|
| `clientes.listar()` | `[{ id, nombre, accesoActivo, suscripcion }]` |

El admin general ve todos los clientes. Cualquier otro usuario ve solo el suyo.

### Ubicaciones

Los campos de una ubicación son `pasillo` (estantería, letra mayúscula, por ejemplo `A`), `estante` (número, por ejemplo `1`) y `nivel` (división, letra minúscula, por ejemplo `a`). Los nombres de campo se mantienen por compatibilidad interna; en la interfaz se muestran como estantería, estante y división.

| Función | Parámetros | Devuelve |
|---|---|---|
| `ubicaciones.listar(clienteId)` | id de cliente | `[{ id, clienteId, pasillo, estante, nivel }]`, ordenadas por pasillo, estante y nivel |
| `ubicaciones.crear(clienteId, datos)` | `{ pasillo, estante, nivel }` | Ubicación creada |
| `ubicaciones.borrar(id)` | id de ubicación | — (no hace nada si el id no existe) |

### Contenedores

| Función | Parámetros | Devuelve |
|---|---|---|
| `contenedores.listar(clienteId)` | id de cliente | `[{ id, clienteId, codigo, codigoPropio, tipo, ubicacionId, descripcion, fechaAlta, ubicacion }]`, ordenados por código. `ubicacion` es el objeto completo o `null`. |
| `contenedores.crear(clienteId, datos)` | `{ codigoPropio, tipo, ubicacionId, descripcion }` | Contenedor creado. `codigo` lo asigna el sistema; `codigoPropio` es opcional. |
| `contenedores.borrar(id)` | id de contenedor | — (no hace nada si el id no existe) |

### Constantes

| Propiedad | Valor |
|---|---|
| `tiposContenedor` | `["caja", "bolsa", "pallet", "tambor", "otro"]` |

### Datos de prueba (solo desarrollo)

| Función | Parámetros | Devuelve |
|---|---|---|
| `datosPrueba.cargar(clienteId)` | id de cliente | `{ ubicacionesCreadas, contenedoresCreados }` |

Agrega 60 ubicaciones (estanterías A a E, estantes 1 a 4, divisiones a, b y c) y 44 contenedores de ejemplo al cliente indicado: 40 ubicados y 4 sin ubicación. No duplica lo que ya exista, así que puede llamarse varias veces sin efectos extra. Lo usa el botón **Cargar datos de prueba** del menú.

Si se cambia de almacenamiento, esta función puede quitarse o convertirse en un script de carga aparte.

## Reglas que aplica la implementación

Las reglas de validación están en [reglas-de-negocio.md](reglas-de-negocio.md). La interfaz de persistencia es la única que las aplica: `app.js` no las repite.

## Datos de prueba

`persistencia.js` trae un cliente de prueba y tres usuarios. Son solo para desarrollo y deben quitarse antes de usar con clientes reales. Ver [permisos-y-roles.md](permisos-y-roles.md).
