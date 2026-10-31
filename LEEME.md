# StockMap · Control de depósito (versión 1)

Aplicación multi-cliente para registrar **contenedores** (cajas, bolsas, pallets, etc.) y sus **ubicaciones** en un depósito. No registra el contenido de los contenedores.

- Frontend: HTML + JS puro, servido por Cloudflare (Workers con assets estáticos).
- Backend: Supabase (PostgreSQL + Auth). El aislamiento entre clientes lo hace RLS.

## Estructura

```
stockmap/
├── index.html      # pantallas de login y aplicación
├── app.js          # lógica del frontend
├── config.js       # URL y clave anon de Supabase (completar)
├── wrangler.toml   # configuración de Cloudflare
├── db/
│   └── esquema.sql # tablas, funciones y políticas RLS
└── LEEME.md
```

## Roles

| Rol | Qué puede hacer |
|---|---|
| Admin general (vos) | Ve y gestiona todos los clientes, suscripciones y usuarios. |
| Admin de cliente | Gestiona los contenedores y ubicaciones de su cliente y ve a los usuarios de su cliente. |
| Operador | Crea, edita y borra contenedores y ubicaciones de su cliente. |

Un cliente sin suscripción vigente (estado distinto de `activa` o con fecha vencida) queda sin acceso a sus datos, aunque tenga usuarios.

## Puesta en marcha

### 1. Supabase
1. Crear un proyecto nuevo en supabase.com.
2. En **SQL Editor**, ejecutar `db/esquema.sql` completo.
3. En **Authentication > Users**, crear tu usuario (administrador general) y copiar su UUID.
4. Ejecutar el bloque de la última parte del esquema con ese UUID para darte rol de administrador general.
5. En **Project Settings > API**, copiar la **URL** y la **anon public key** a `config.js`.
   **Nunca** pongas la `service_role` key en el frontend.

### 2. Cloudflare
```bash
npm install -g wrangler
wrangler login
cd stockmap
wrangler deploy
```

### 3. Alta de un cliente nuevo (manual, por ahora)
En el SQL Editor de Supabase:
```sql
insert into clientes (nombre) values ('Nombre del cliente') returning id;
insert into suscripciones (cliente_id, estado, vence_el)
  values ('UUID-DEL-CLIENTE', 'activa', '2027-12-31');
```
Luego crear el usuario en Authentication > Users y vincularlo:
```sql
insert into perfiles (id, cliente_id, nombre, rol)
  values ('UUID-DEL-USUARIO', 'UUID-DEL-CLIENTE', 'Nombre', 'admin_cliente');
```

## Pendiente para la versión 2
- Pantalla de administración para crear clientes y usuarios sin usar SQL (requiere un Worker con la `service_role` key, solo en el servidor).
- Integración de cobro de suscripciones (Mercado Pago o Stripe).
- Edición de contenedores y ubicaciones (hoy solo alta y baja).
- Módulo 3D del depósito (al final del proyecto).
