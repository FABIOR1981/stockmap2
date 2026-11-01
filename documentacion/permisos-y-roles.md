# Permisos y roles

## Roles

| Rol | Clave interna | Qué puede hacer |
|---|---|---|
| Admin general | `admin_general` | Ve todos los clientes y opera sobre cualquiera, sin importar su suscripción. |
| Admin de cliente | `admin_cliente` | Opera sobre los datos de su cliente, siempre que tenga acceso. Crea y borra ubicaciones. |
| Operador | `operador` | Opera sobre los contenedores de su cliente, siempre que tenga acceso. Consulta las ubicaciones, pero no las crea ni las borra. |

## Estado actual

Admin de cliente y operador se diferencian en las ubicaciones: solo el admin (general o de cliente) crea y borra ubicaciones. El operador puede cargar y dar de baja contenedores, y consultar el plano. La gestión de usuarios de cada cliente todavía no existe.

## Cómo se decide el acceso

Todas las operaciones sobre ubicaciones y contenedores pasan por la misma comprobación:

1. Si no hay sesión, se rechaza.
2. Si el usuario es admin general, se permite.
3. Si el cliente de la operación no es el del usuario, se rechaza.
4. Si el cliente no tiene acceso vigente (ver [reglas-de-negocio.md](reglas-de-negocio.md)), se rechaza.

La comprobación está en la interfaz de persistencia. La interfaz de usuario no decide permisos: solo oculta lo que no corresponde, y la regla real es la de la capa de persistencia.

## Pendiente

- Pantalla de altas de clientes, suscripciones y usuarios, solo para el admin general.
- Diferenciar admin de cliente y operador (por ejemplo, el admin de cliente gestiona los usuarios de su cliente).
- Reemplazar los usuarios de prueba por un sistema de autenticación real cuando se elija el almacenamiento definitivo.
- Las contraseñas de prueba están en texto plano en `persistencia.js`. Esto solo es aceptable mientras todo sea en memoria y de desarrollo.

## Usuarios de prueba (solo desarrollo)

| Email | Contraseña | Rol | Cliente |
|---|---|---|---|
| admin@stockmap.local | admin123 | admin_general | — |
| demo@cliente.local | demo123 | admin_cliente | Cliente Demo |
| operador@cliente.local | op123 | operador | Cliente Demo |

Estos usuarios deben quitarse antes de usar el sistema con clientes reales.
