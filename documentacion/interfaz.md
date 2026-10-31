# Interfaz

Archivos: `public/index.html` (estructura y estilos) y `public/app.js` (comportamiento).

## Pantallas

### Login

- Pantalla inicial si no hay sesión.
- Email y contraseña. Si los datos no coinciden, muestra "Email o contraseña incorrectos."

### Aplicación

- **Cabecera:** logo, nombre del usuario y botón **Salir**.
- **Menú lateral** (en celular, barra horizontal arriba) con las secciones:
  - **Contenedores**
  - **Ubicaciones**
- Solo se ve una sección a la vez. La sección activa queda marcada en el menú.
- **Selector de cliente:** visible solo para el admin general, encima del contenido. Los clientes sin acceso aparecen con "(sin acceso)".
- **Aviso:** franja amarilla arriba del contenido para errores de negocio y para el caso de cliente sin acceso.

### Sección Contenedores

- Botón **Nuevo contenedor**: abre un panel con el formulario. Se cierra al guardar o con **Cancelar**.
- Campos: código, tipo, ubicación (opcional) y descripción corta.
- Tabla: código, tipo, ubicación y descripción. Botón **Borrar** en cada fila, con confirmación.

### Sección Ubicaciones

- Botón **Nueva ubicación**: abre un panel con pasillo, estante y nivel.
- Tabla: pasillo, estante y nivel. Botón **Borrar** en cada fila, con confirmación.

## Comportamiento

- Al iniciar sesión se abre siempre la sección **Contenedores**.
- Al guardar un contenedor o una ubicación, el panel se cierra y la tabla se actualiza.
- Los formularios no se borran al cerrarse con **Cancelar**: se vacían al cerrar.
- Los datos se cargan del cliente activo. Al cambiar de cliente (admin general), se recargan las dos tablas y el selector de ubicación.
- El selector de **Ubicación** en el formulario de contenedores solo lista las ubicaciones del cliente activo.

## Diseño

- Paleta sobria: fondo gris azulado, acento verde azulado, peligro en rojo oscuro.
- Foco visible en todos los controles interactivos.
- Los números de código usan cifras tabulares para alinearse.
- Respeta `prefers-reduced-motion`.

## Pendiente

- Revisión en navegador real, escritorio y celular.
- Secciones de clientes y usuarios para el admin general.
- Edición de contenedores y ubicaciones (hoy solo alta y baja).
- Mejor manejo de estados de carga.
