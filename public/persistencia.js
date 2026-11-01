// StockMap · Interfaz de persistencia
//
// El frontend (app.js) habla solo con el objeto window.Persistencia.
// Hoy la implementación es en memoria: los datos se pierden al recargar la página.
// Para cambiar de almacenamiento, se escribe otra función con la misma forma
// (crearPersistenciaXxx) y se apunta la última línea de este archivo a ella.
//
// Todas las funciones devuelven Promise. Los errores de negocio se lanzan como Error con mensaje en español.
//
// FORMA DE LA INTERFAZ
//   sesion.iniciar(email, password)        -> perfil | null
//   sesion.actual()                        -> perfil | null
//   sesion.cerrar()
//   clientes.listar()                      -> [{ id, nombre, accesoActivo, suscripcion }]
//   ubicaciones.listar(clienteId)          -> [{ id, clienteId, pasillo, estante, nivel }]
//   ubicaciones.crear(clienteId, datos)    -> ubicación creada
//   ubicaciones.borrar(id)
//   contenedores.listar(clienteId)         -> [{ id, clienteId, codigo, tipo, descripcion, ubicacion, fechaAlta }]
//   contenedores.crear(clienteId, datos)   -> contenedor creado
//   contenedores.borrar(id)
//   tiposContenedor                        -> ["caja", "bolsa", ...]
//   datosPrueba.cargar(clienteId)          -> { ubicacionesCreadas, contenedoresCreados }

(function () {
  const TIPOS_CONTENEDOR = ["caja", "bolsa", "pallet", "tambor", "otro"];

  function crearPersistenciaMemoria() {
    // Datos de prueba. Son solo para desarrollo: cambiar o quitar antes de usar con clientes reales.
    const datos = {
      clientes: [
        {
          id: "c1",
          nombre: "Cliente Demo",
          activo: true,
          suscripcion: { estado: "activa", venceEl: "2027-12-31" },
        },
      ],
      usuarios: [
        { id: "u1", email: "admin@stockmap.local", password: "admin123", nombre: "Fabio", rol: "admin_general", clienteId: null },
        { id: "u2", email: "demo@cliente.local", password: "demo123", nombre: "Admin Demo", rol: "admin_cliente", clienteId: "c1" },
        { id: "u3", email: "operador@cliente.local", password: "op123", nombre: "Operador Demo", rol: "operador", clienteId: "c1" },
      ],
      ubicaciones: [],
      contenedores: [],
    };

    let usuarioSesionId = null;
    let secuencia = 100;

    const nuevoId = (prefijo) => `${prefijo}${++secuencia}`;
    const copia = (valor) => structuredClone(valor);
    const hoy = () => new Date().toISOString().slice(0, 10);
    const fallo = (mensaje) => new Error(mensaje);

    function usuarioActual() {
      return datos.usuarios.find((u) => u.id === usuarioSesionId) || null;
    }

    function clienteConAcceso(cliente) {
      if (!cliente || !cliente.activo) return false;
      const s = cliente.suscripcion;
      return s.estado === "activa" && (!s.venceEl || s.venceEl >= hoy());
    }

    function perfilDe(usuario) {
      const cliente = datos.clientes.find((c) => c.id === usuario.clienteId);
      const esAdminGeneral = usuario.rol === "admin_general";
      return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        clienteId: usuario.clienteId,
        esAdminGeneral,
        accesoActivo: esAdminGeneral ? true : clienteConAcceso(cliente),
      };
    }

    // Lanza error si el usuario actual no puede operar sobre los datos de ese cliente.
    function exigirAcceso(clienteId) {
      const u = usuarioActual();
      if (!u) throw fallo("No hay sesión iniciada.");
      if (u.rol === "admin_general") return;
      if (u.clienteId !== clienteId) throw fallo("No tenés acceso a ese cliente.");
      const cliente = datos.clientes.find((c) => c.id === clienteId);
      if (!clienteConAcceso(cliente)) {
        throw fallo("La suscripción de este cliente no está activa.");
      }
    }

    // Orden numérico real: el estante 10 va después del 2.
    const ordenUbicaciones = (a, b) =>
      a.pasillo.localeCompare(b.pasillo, "es", { numeric: true }) ||
      a.estante.localeCompare(b.estante, "es", { numeric: true }) ||
      a.nivel.localeCompare(b.nivel, "es", { numeric: true });

    const sesion = {
      async iniciar(email, password) {
        const emailNormalizado = (email || "").trim().toLowerCase();
        const usuario = datos.usuarios.find(
          (u) => u.email === emailNormalizado && u.password === password
        );
        if (!usuario) return null;
        usuarioSesionId = usuario.id;
        return copia(perfilDe(usuario));
      },

      async actual() {
        const u = usuarioActual();
        return u ? copia(perfilDe(u)) : null;
      },

      async cerrar() {
        usuarioSesionId = null;
      },
    };

    const clientes = {
      async listar() {
        const u = usuarioActual();
        if (!u) throw fallo("No hay sesión iniciada.");
        const visibles =
          u.rol === "admin_general"
            ? datos.clientes
            : datos.clientes.filter((c) => c.id === u.clienteId);
        return copia(
          visibles.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            accesoActivo: clienteConAcceso(c),
            suscripcion: c.suscripcion,
          }))
        );
      },
    };

    const ubicaciones = {
      async listar(clienteId) {
        exigirAcceso(clienteId);
        return copia(
          datos.ubicaciones.filter((x) => x.clienteId === clienteId).sort(ordenUbicaciones)
        );
      },

      async crear(clienteId, { pasillo, estante, nivel }) {
        exigirAcceso(clienteId);
        // pasillo = estantería (letras mayúsculas), estante = número, nivel = división (letras minúsculas).
        const p = (pasillo || "").trim().toUpperCase();
        const e = (estante || "").trim();
        const n = (nivel || "").trim().toLowerCase();
        if (!p || !e || !n) throw fallo("Estantería, estante y división son obligatorios.");
        if (!/^[A-Z]+$/.test(p)) throw fallo("La estantería debe ser letra mayúscula, por ejemplo A.");
        if (!/^\d+$/.test(e)) throw fallo("El estante debe ser un número, por ejemplo 1.");
        if (!/^[a-z]+$/.test(n)) throw fallo("La división debe ser letra minúscula, por ejemplo a.");

        const repetida = datos.ubicaciones.some(
          (x) => x.clienteId === clienteId && x.pasillo === p && x.estante === e && x.nivel === n
        );
        if (repetida) throw fallo("Esa ubicación ya existe.");

        const nueva = { id: nuevoId("ub"), clienteId, pasillo: p, estante: e, nivel: n };
        datos.ubicaciones.push(nueva);
        return copia(nueva);
      },

      async borrar(id) {
        const ubicacion = datos.ubicaciones.find((x) => x.id === id);
        if (!ubicacion) return;
        exigirAcceso(ubicacion.clienteId);
        if (datos.contenedores.some((c) => c.ubicacionId === id)) {
          throw fallo("Hay contenedores en esa ubicación. Movelos antes de borrarla.");
        }
        datos.ubicaciones = datos.ubicaciones.filter((x) => x.id !== id);
      },
    };

    const contenedores = {
      async listar(clienteId) {
        exigirAcceso(clienteId);
        return copia(
          datos.contenedores
            .filter((c) => c.clienteId === clienteId)
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((c) => ({
              ...c,
              ubicacion: datos.ubicaciones.find((u) => u.id === c.ubicacionId) || null,
            }))
        );
      },

      async crear(clienteId, { codigo, tipo, ubicacionId, descripcion }) {
        exigirAcceso(clienteId);
        const cod = (codigo || "").trim();
        if (!cod) throw fallo("El código es obligatorio.");
        if (!TIPOS_CONTENEDOR.includes(tipo)) throw fallo("Tipo de contenedor no válido.");

        const repetido = datos.contenedores.some(
          (c) => c.clienteId === clienteId && c.codigo.toLowerCase() === cod.toLowerCase()
        );
        if (repetido) throw fallo(`Ya existe un contenedor con el código ${cod}.`);

        if (ubicacionId && !datos.ubicaciones.some((u) => u.id === ubicacionId && u.clienteId === clienteId)) {
          throw fallo("La ubicación no pertenece a este cliente.");
        }

        const nuevo = {
          id: nuevoId("ct"),
          clienteId,
          codigo: cod,
          tipo,
          ubicacionId: ubicacionId || null,
          descripcion: (descripcion || "").trim() || null,
          fechaAlta: new Date().toISOString(),
        };
        datos.contenedores.push(nuevo);
        return copia(nuevo);
      },

      async borrar(id) {
        const contenedor = datos.contenedores.find((c) => c.id === id);
        if (!contenedor) return;
        exigirAcceso(contenedor.clienteId);
        datos.contenedores = datos.contenedores.filter((c) => c.id !== id);
      },
    };

    // Carga un juego de ubicaciones y contenedores de ejemplo.
    // No duplica lo que ya exista: si se llama dos veces, la segunda no agrega nada.
    const datosPrueba = {
      async cargar(clienteId) {
        exigirAcceso(clienteId);

        // Diez estanterías (A a J) en dos pasillos de cinco, cuatro estantes por estantería y tres divisiones por estante.
        const ESTANTERIAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const ESTANTES = [1, 2, 3, 4];
        const DIVISIONES = ["a", "b", "c"];
        const ubicacionesPrueba = [];
        for (const p of ESTANTERIAS) {
          for (const e of ESTANTES) {
            for (const n of DIVISIONES) ubicacionesPrueba.push([p, String(e), n]);
          }
        }
        let ubicacionesCreadas = 0;
        for (const [pasillo, estante, nivel] of ubicacionesPrueba) {
          const existe = datos.ubicaciones.some(
            (x) => x.clienteId === clienteId && x.pasillo === pasillo && x.estante === estante && x.nivel === nivel
          );
          if (!existe) {
            datos.ubicaciones.push({ id: nuevoId("ub"), clienteId, pasillo, estante, nivel });
            ubicacionesCreadas++;
          }
        }

        // Aproximadamente dos de cada tres ubicaciones tienen contenedor, de forma
        // pseudoaleatoria pero fija (mismo resultado en cada carga). Luego se suman cuatro sin ubicación.
        const ocupadaPrueba = (i) => {
          let x = Math.imul(i + 1, 2654435761) >>> 0;
          x ^= x >>> 15;
          x = Math.imul(x, 2246822519) >>> 0;
          x ^= x >>> 13;
          return x % 100 < 65;
        };
        const TIPOS_PRUEBA = ["caja", "caja", "bolsa", "pallet", "tambor", "otro"];
        const PREFIJO_PRUEBA = { caja: "CJ", bolsa: "BL", pallet: "PL", tambor: "TB", otro: "OT" };
        const contenedoresPrueba = [];
        let numero = 1;
        ubicacionesPrueba.forEach(([p, e, n], i) => {
          if (!ocupadaPrueba(i)) return;
          const tipo = TIPOS_PRUEBA[numero % TIPOS_PRUEBA.length];
          contenedoresPrueba.push({
            codigo: `${PREFIJO_PRUEBA[tipo]}-${String(numero).padStart(4, "0")}`,
            tipo,
            ubicacion: [p, e, n],
            descripcion: "Contenedor de prueba",
          });
          numero++;
        });
        for (let k = 0; k < 4; k++) {
          const tipo = TIPOS_PRUEBA[(numero + k) % TIPOS_PRUEBA.length];
          contenedoresPrueba.push({
            codigo: `${PREFIJO_PRUEBA[tipo]}-${String(numero + k).padStart(4, "0")}`,
            tipo,
            ubicacion: null,
            descripcion: "Sin ubicación asignada (prueba)",
          });
        }
        let contenedoresCreados = 0;
        for (const c of contenedoresPrueba) {
          const existe = datos.contenedores.some(
            (x) => x.clienteId === clienteId && x.codigo.toLowerCase() === c.codigo.toLowerCase()
          );
          if (existe) continue;

          let ubicacionId = null;
          if (c.ubicacion) {
            const [p, e, n] = c.ubicacion;
            const ub = datos.ubicaciones.find(
              (x) => x.clienteId === clienteId && x.pasillo === p && x.estante === e && x.nivel === n
            );
            ubicacionId = ub ? ub.id : null;
          }

          datos.contenedores.push({
            id: nuevoId("ct"),
            clienteId,
            codigo: c.codigo,
            tipo: c.tipo,
            ubicacionId,
            descripcion: c.descripcion,
            fechaAlta: new Date().toISOString(),
          });
          contenedoresCreados++;
        }

        return { ubicacionesCreadas, contenedoresCreados };
      },
    };

    return {
      sesion,
      clientes,
      ubicaciones,
      contenedores,
      datosPrueba,
      tiposContenedor: [...TIPOS_CONTENEDOR],
    };
  }

  // ---------------------------------------------------------------
  // Implementación activa. Para cambiar de almacenamiento, cambiar esta línea.
  // ---------------------------------------------------------------
  window.Persistencia = crearPersistenciaMemoria();
})();
