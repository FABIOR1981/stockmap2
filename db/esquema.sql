-- =====================================================================
-- STOCKMAP · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------

-- Cada cliente de la suscripción (empresa o depósito).
create table clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Estado de la suscripción de cada cliente (se gestiona a mano por ahora).
create table suscripciones (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  estado      text not null check (estado in ('activa', 'vencida', 'suspendida')),
  vence_el    date,
  creado_en   timestamptz not null default now()
);

-- Perfil de cada usuario logueado. Se vincula a auth.users de Supabase.
-- es_admin_general = true solo para vos (ves y gestionas todos los clientes).
create table perfiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  cliente_id        uuid references clientes(id) on delete cascade,
  nombre            text,
  rol               text not null default 'operador'
                    check (rol in ('admin_cliente', 'operador')),
  es_admin_general  boolean not null default false
);

-- Ubicaciones físicas dentro del depósito de cada cliente.
create table ubicaciones (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  pasillo     text not null,
  estante     text not null,
  nivel       text not null,
  unique (cliente_id, pasillo, estante, nivel)
);

-- Contenedores (cajas, bolsas, pallets, etc.). NO se registra su contenido.
create table contenedores (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  codigo       text not null,
  tipo         text not null default 'caja'
               check (tipo in ('caja', 'bolsa', 'pallet', 'tambor', 'otro')),
  ubicacion_id uuid references ubicaciones(id) on delete set null,
  descripcion  text,
  fecha_alta   timestamptz not null default now(),
  unique (cliente_id, codigo)
);

create index on suscripciones (cliente_id);
create index on ubicaciones (cliente_id);
create index on contenedores (cliente_id);
create index on perfiles (cliente_id);

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES PARA RLS
-- security definer evita recursion de políticas sobre la tabla perfiles.
-- ---------------------------------------------------------------------

create or replace function es_admin_general()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.es_admin_general from perfiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function mi_cliente()
returns uuid
language sql stable security definer set search_path = public
as $$
  select p.cliente_id from perfiles p where p.id = auth.uid();
$$;

create or replace function mi_rol_es_admin_cliente()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.rol = 'admin_cliente' from perfiles p where p.id = auth.uid()),
    false
  );
$$;

-- Un cliente tiene acceso si está activo y su suscripción está vigente.
create or replace function cliente_con_acceso(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from clientes c
    join suscripciones s on s.cliente_id = c.id
    where c.id = cid
      and c.activo
      and s.estado = 'activa'
      and (s.vence_el is null or s.vence_el >= current_date)
  );
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table clientes      enable row level security;
alter table suscripciones enable row level security;
alter table perfiles      enable row level security;
alter table ubicaciones   enable row level security;
alter table contenedores  enable row level security;

-- clientes: el admin general ve y gestiona todo; cada usuario ve solo el suyo.
create policy "clientes_admin_general" on clientes
  for all using (es_admin_general()) with check (es_admin_general());
create policy "clientes_propio_lectura" on clientes
  for select using (id = mi_cliente());

-- suscripciones: solo el admin general las modifica; el cliente puede leer la propia.
create policy "suscripciones_admin_general" on suscripciones
  for all using (es_admin_general()) with check (es_admin_general());
create policy "suscripciones_propia_lectura" on suscripciones
  for select using (cliente_id = mi_cliente());

-- perfiles: cada uno ve su perfil; el admin_cliente ve los de su cliente;
-- el admin general gestiona todos.
create policy "perfiles_admin_general" on perfiles
  for all using (es_admin_general()) with check (es_admin_general());
create policy "perfiles_propio" on perfiles
  for select using (id = auth.uid());
create policy "perfiles_admin_cliente_lectura" on perfiles
  for select using (cliente_id = mi_cliente() and mi_rol_es_admin_cliente());

-- ubicaciones y contenedores: acceso total solo si el cliente tiene suscripción vigente.
create policy "ubicaciones_acceso" on ubicaciones
  for all
  using (es_admin_general() or (cliente_id = mi_cliente() and cliente_con_acceso(cliente_id)))
  with check (es_admin_general() or (cliente_id = mi_cliente() and cliente_con_acceso(cliente_id)));

create policy "contenedores_acceso" on contenedores
  for all
  using (es_admin_general() or (cliente_id = mi_cliente() and cliente_con_acceso(cliente_id)))
  with check (es_admin_general() or (cliente_id = mi_cliente() and cliente_con_acceso(cliente_id)));

-- ---------------------------------------------------------------------
-- DATOS DE PRUEBA (opcional, borrar antes de producción)
-- ---------------------------------------------------------------------
-- insert into clientes (id, nombre) values ('00000000-0000-0000-0000-000000000001', 'Cliente de prueba');
-- insert into suscripciones (cliente_id, estado, vence_el)
--   values ('00000000-0000-0000-0000-000000000001', 'activa', '2027-12-31');
--
-- Tu usuario admin general (reemplazar el UUID por el de Authentication > Users):
-- insert into perfiles (id, nombre, es_admin_general)
--   values ('TU-UUID-DE-AUTH', 'Fabio', true);
