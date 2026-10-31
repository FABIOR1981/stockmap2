# StockMap · Control de depósito (versión 1)

Aplicación multi-cliente para registrar contenedores (cajas, bolsas, pallets, etc.) y sus ubicaciones en un depósito. No registra el contenido de los contenedores.

- Frontend: HTML + JS puro, en `public/`.
- Worker de Cloudflare: `src/worker.js`. Sirve el frontend y entrega la configuración desde secretos.
- Base de datos y login: Supabase. El aislamiento entre clientes lo hace RLS (`db/esquema.sql`).

Ninguna clave se guarda en el repositorio.

## Estructura

```
stockmap2/
├── public/
│   ├── index.html   # login y aplicación
│   └── app.js       # lógica del frontend
├── src/
│   └── worker.js    # Worker: sirve el frontend y /config.js desde secretos
├── db/
│   └── esquema.sql  # tablas, funciones y políticas RLS
├── wrangler.toml    # configuración de Cloudflare
└── LEEME.md
```

## Roles

| Rol | Qué puede hacer |
|---|---|
| Admin general (vos) | Ve y gestiona todos los clientes, suscripciones y usuarios. |
| Admin de cliente | Gestiona contenedores y ubicaciones de su cliente y ve a los usuarios de su cliente. |
| Operador | Crea, edita y borra contenedores y ubicaciones de su cliente. |

Un cliente sin suscripción vigente queda sin acceso a sus datos, aunque tenga usuarios.

## Puesta en marcha

### 1. Supabase
1. Crear un proyecto nuevo en supabase.com.
2. SQL Editor → New query → pegar `db/esquema.sql` completo → Run.
3. Authentication → Users → crear tu usuario y copiar su UUID.
4. En el SQL Editor, darte rol de administrador general (reemplazar el UUID):
   ```sql
   insert into perfiles (id, nombre, es_admin_general)
     values ('TU-UUID-DE-AUTH', 'Fabio', true);
   ```
5. Project Settings → API: copiar la **Project URL** (va en `wrangler.toml`, en `SUPABASE_URL`) y la **anon public key** (va como secreto de Cloudflare, paso 2).
   Nunca copies ni uses la **service_role key** en esta aplicación.

### 2. Cloudflare
Desde la carpeta del repositorio:

```bash
npm install -g wrangler
wrangler login
wrangler secret put SUPABASE_ANON_KEY    # pegar la anon public key cuando lo pida
wrangler deploy
```

Después de cambiar la URL de Supabase en `wrangler.toml`, volver a ejecutar `wrangler deploy`.

### 3. Alta manual de un cliente
En el SQL Editor de Supabase:
```sql
insert into clientes (nombre) values ('Nombre del cliente') returning id;
insert into suscripciones (cliente_id, estado, vence_el)
  values ('UUID-DEL-CLIENTE', 'activa', '2027-12-31');
```
Luego crear el usuario en Authentication → Users y vincularlo:
```sql
insert into perfiles (id, cliente_id, nombre, rol)
  values ('UUID-DEL-USUARIO', 'UUID-DEL-CLIENTE', 'Nombre', 'admin_cliente');
```

## Pendiente para la versión 2
- Pantalla de administración para crear clientes y usuarios sin SQL (usaría `SUPABASE_SERVICE_ROLE_KEY` como secreto del Worker, nunca en el frontend).
- Cobro de suscripciones (Mercado Pago o Stripe).
- Edición de contenedores y ubicaciones (hoy solo alta y baja).
- Módulo 3D del depósito (al final del proyecto).
