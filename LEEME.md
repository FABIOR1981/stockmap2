# StockMap · Control de depósito (versión 1, en memoria)

Aplicación multi-cliente para registrar contenedores (cajas, bolsas, pallets, etc.) y sus ubicaciones en un depósito. No registra el contenido de los contenedores.

Por ahora todos los datos viven en memoria: al recargar la página se pierden. Es intencional, para desarrollar toda la lógica antes de elegir el almacenamiento definitivo.

## Estructura

```
stockmap2/
├── public/
│   ├── index.html       # login y aplicación
│   ├── app.js           # interfaz de usuario (no sabe dónde se guardan los datos)
│   └── persistencia.js  # interfaz de persistencia + implementación en memoria
├── wrangler.toml        # configuración de Cloudflare (solo publica public/)
└── LEEME.md
```

## Interfaz de persistencia

`app.js` solo usa `window.Persistencia`. La forma completa de la interfaz está documentada al inicio de `public/persistencia.js`.

Para cambiar el almacenamiento, se escribe otra función `crearPersistenciaXxx` con la misma forma y se cambia la última línea de `persistencia.js`. El frontend no se toca.

## Roles

| Rol | Qué puede hacer |
|---|---|
| Admin general | Ve y gestiona todos los clientes. |
| Admin de cliente | Gestiona contenedores y ubicaciones de su cliente. |
| Operador | Gestiona contenedores y ubicaciones de su cliente. |

Un cliente sin suscripción vigente queda en modo solo consulta: sus datos no se pueden modificar.

Nota: por ahora admin de cliente y operador tienen los mismos permisos. La gestión de usuarios de cada cliente llega en la siguiente etapa.

## Usuarios de prueba

Solo para desarrollo, definidos en `persistencia.js`:

| Email | Contraseña | Rol |
|---|---|---|
| admin@stockmap.local | admin123 | Admin general |
| demo@cliente.local | demo123 | Admin de cliente (Cliente Demo) |
| operador@cliente.local | op123 | Operador (Cliente Demo) |

## Pendiente
- Implementación de almacenamiento definitivo (se elige después de desarrollar la lógica).
- Pantalla para dar de alta clientes, suscripciones y usuarios.
- Cobro de suscripciones.
- Edición de contenedores y ubicaciones (hoy solo alta y baja).
- Módulo 3D del depósito (al final del proyecto).

## Abrir en local

No requiere instalación. Abrir `public/index.html` en el navegador, o servir la carpeta `public/` con cualquier servidor estático.
