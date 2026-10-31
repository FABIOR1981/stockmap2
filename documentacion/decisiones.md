# Registro de decisiones

Cada decisión tiene fecha, qué se decidió y por qué. Si una decisión se cambia, se agrega una entrada nueva en lugar de borrar la anterior.

## 2026-10-31

**Reconstruir desde cero.** Se descartó el código anterior de stockmap. Queda en el historial de su repositorio original como respaldo.

**Un único tipo de objeto en el depósito: contenedores.** Se registran cajas, bolsas, pallets, tambores y otros contenedores. No se registra su contenido: el sistema solo sabe dónde está cada contenedor.

**Modelo de suscripción.** El producto se vende por suscripción. Cada cliente tiene sus usuarios, y el administrador general (Fabio) ve y gestiona todos los clientes.

**Roles por cliente.** Admin de cliente y operador. Hoy tienen los mismos permisos; la diferencia llega con la gestión de usuarios.

**Cobro de suscripciones manual por ahora.** El estado de la suscripción se carga a mano. La integración con un medio de pago (Mercado Pago o Stripe) queda para una etapa posterior.

**El módulo 3D del depósito va al final.** Se desarrolla cuando la lógica base esté estable.

**Stack inicial: Cloudflare + Supabase.** Se eligió para tener base de datos y autenticación reales. Se descartó poco después, para desarrollar la lógica en memoria primero.

**Persistencia en memoria detrás de una interfaz única.** El frontend solo usa `window.Persistencia`. Así se puede elegir el almacenamiento definitivo más adelante sin tocar la interfaz de usuario.

**Sin Worker de Cloudflare por ahora.** El proyecto es un sitio estático que se publica desde `public/`. El Worker y las claves de Supabase se quitaron junto con Supabase.

**Diseño sobrio, en modo operación.** Paleta gris azulada con acento verde azulado. Se descartó el fondo crema, que el detector de impeccable marca como patrón genérico.

**Menú lateral en lugar de tarjetas apiladas.** Una sección a la vez, con los formularios en paneles desplegables.

## Pendientes de decisión

- Almacenamiento definitivo (Cloudflare D1, Supabase u otro).
- Método de cobro de las suscripciones.
- Nombre comercial del producto para la marca blanca.
