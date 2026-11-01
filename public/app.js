// StockMap · Frontend. Solo usa window.Persistencia (ver persistencia.js) y window.Plano (ver plano.js).

const P = window.Persistencia;
const $ = (sel) => document.querySelector(sel);

let perfil = null;
let clienteActivo = null;
let vistaPlano = null; // datos del último plano dibujado, para la vista de estantería

// ---------------------------------------------------------------------
// Arranque, sesión y vistas
// ---------------------------------------------------------------------

async function iniciar() {
  perfil = await P.sesion.actual();
  if (perfil) await mostrarApp();
  else mostrarLogin();
}

function mostrarLogin() {
  $("#vista-app").classList.add("oculto");
  $("#vista-login").classList.remove("oculto");
}

async function mostrarApp() {
  $("#vista-login").classList.add("oculto");
  $("#vista-app").classList.remove("oculto");
  $("#usuario-actual").textContent = perfil.nombre;

  if (!perfil.accesoActivo) {
    mostrarAviso("La suscripción de este cliente no está activa. Solo podés consultar.");
  }

  if (perfil.esAdminGeneral) {
    $("#bloque-cliente").classList.remove("oculto");
    await cargarSelectorClientes();
  } else {
    clienteActivo = perfil.clienteId;
  }

  // El operador consulta ubicaciones pero no las crea ni borra.
  const gestiona = perfil.puedeGestionarUbicaciones;
  document.querySelectorAll('[data-alternar="panel-ubicacion"], #panel-ubicacion, #btn-datos-prueba').forEach((el) => {
    el.classList.toggle("oculto", !gestiona);
  });

  await cargarTiposContenedor();
  mostrarVista("contenedores");
  await cargarDatos();
}

// Muestra una sola sección del menú y marca el botón activo.
function mostrarVista(nombre) {
  if (nombre !== "plano3d") Plano3D.desmontar(); // libera el canvas 3D al salir de su vista
  document.querySelectorAll(".vista").forEach((v) => {
    v.classList.toggle("oculto", v.id !== `vista-${nombre}`);
  });
  document.querySelectorAll(".menu button[data-vista]").forEach((b) => {
    if (b.dataset.vista === nombre) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

// ---------------------------------------------------------------------
// Login y logout
// ---------------------------------------------------------------------

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const p = await P.sesion.iniciar($("#email").value, $("#password").value);
  if (!p) {
    $("#error-login").textContent = "Email o contraseña incorrectos.";
    $("#error-login").classList.remove("oculto");
    return;
  }
  $("#error-login").classList.add("oculto");
  perfil = p;
  await mostrarApp();
});

$("#btn-salir").addEventListener("click", async () => {
  await P.sesion.cerrar();
  location.reload();
});

// ---------------------------------------------------------------------
// Menú y paneles desplegables
// ---------------------------------------------------------------------

$(".menu").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-vista]");
  if (!btn) return;
  if (btn.dataset.vista === "plano") await verPlano(null);
  else if (btn.dataset.vista === "plano3d") await verPlano3D();
  else mostrarVista(btn.dataset.vista);
});

document.addEventListener("click", (e) => {
  const alternar = e.target.closest("[data-alternar]");
  if (alternar) {
    $(`#${alternar.dataset.alternar}`).classList.toggle("oculto");
    return;
  }
  const cerrar = e.target.closest("[data-cerrar]");
  if (cerrar) ocultarPanel(cerrar.dataset.cerrar);
});

function ocultarPanel(id) {
  const panel = document.getElementById(id);
  panel.classList.add("oculto");
  const form = panel.querySelector("form");
  if (form) form.reset();
}

// ---------------------------------------------------------------------
// Selector de cliente (solo admin general)
// ---------------------------------------------------------------------

async function cargarSelectorClientes() {
  await intentar(async () => {
    const lista = await P.clientes.listar();
    const selector = $("#selector-cliente");
    selector.innerHTML = lista
      .map((c) => `<option value="${c.id}">${escapar(c.nombre)}${c.accesoActivo ? "" : " (sin acceso)"}</option>`)
      .join("");
    clienteActivo = lista[0]?.id ?? null;
    selector.onchange = async () => {
      clienteActivo = selector.value;
      await cargarDatos();
    };
  });
}

async function cargarTiposContenedor() {
  $("#tipo").innerHTML = P.tiposContenedor
    .map((t) => `<option value="${t}">${nombreTipo(t)}</option>`)
    .join("");
}

// ---------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------

async function cargarDatos() {
  if (!clienteActivo) return;
  await Promise.all([cargarUbicaciones(), cargarContenedores()]);
}

async function cargarUbicaciones() {
  await intentar(async () => {
    const lista = await P.ubicaciones.listar(clienteActivo);

    // Select del formulario de contenedores
    const opciones = lista.map(
      (u) => `<option value="${u.id}">${escapar(u.pasillo)} · ${escapar(u.estante)} · ${escapar(u.nivel)}</option>`
    );
    $("#ubicacion").innerHTML = `<option value="">Asignar al azar (lugar libre)</option>` + opciones.join("");

    // Tabla de la vista Ubicaciones
    $("#tabla-ubicaciones").innerHTML =
      lista
        .map(
          (u) => `
          <tr>
            <td><strong>${escapar(u.pasillo)}</strong></td>
            <td>${escapar(u.estante)}</td>
            <td>${escapar(u.nivel)}</td>
            <td>${perfil.puedeGestionarUbicaciones ? `<button class="peligro" data-id="${u.id}" data-accion="borrar-ubicacion">Borrar</button>` : ""}</td>
          </tr>`
        )
        .join("") || `<tr><td colspan="4">Todavía no hay ubicaciones.</td></tr>`;
  });
}

async function cargarContenedores() {
  await intentar(async () => {
    const lista = await P.contenedores.listar(clienteActivo);
    $("#tabla-contenedores").innerHTML =
      lista
        .map((c) => {
          const u = c.ubicacion;
          const ubic = u ? `${u.pasillo} · ${u.estante} · ${u.nivel}` : "—";
          const llegar = u
            ? `<button class="secundario chico" data-accion="llegar" data-ubicacion="${u.id}" data-contenedor="${c.id}">Cómo llegar</button>`
            : `<span class="muted">Sin ubicación</span>`;
          return `
          <tr>
            <td><strong>${escapar(c.codigo)}</strong>${c.codigoPropio ? `<br><span class="muted">Producto: ${escapar(c.codigoPropio)}</span>` : ""}</td>
            <td>${escapar(nombreTipo(c.tipo))}</td>
            <td>${escapar(ubic)}</td>
            <td>${escapar(c.descripcion || "")}</td>
            <td>
              <div class="acciones-fila">
                ${llegar}
                <button class="peligro" data-id="${c.id}" data-accion="borrar">Borrar</button>
              </div>
            </td>
          </tr>`;
        })
        .join("") || `<tr><td colspan="5">Todavía no hay contenedores.</td></tr>`;
  });
}

// ---------------------------------------------------------------------
// Plano del depósito
// ---------------------------------------------------------------------

// Muestra el plano. Con destinoId, marca el estante y la ruta hasta él.
// Último destino buscado o pedido con "Cómo llegar"; el plano 3D lo usa para marcar la ruta.
let ultimoDestinoId = null;
// Contenedor buscado o pedido con "Cómo llegar"; el plano 3D lo muestra marcado en detalle.
let ultimoContenedorId = null;

async function verPlano(destinoId) {
  await intentar(async () => {
    const ubicaciones = await P.ubicaciones.listar(clienteActivo);
    const contenedores = await P.contenedores.listar(clienteActivo);
    const plano = Plano.construirPlano(ubicaciones);
    const destino = destinoId ? ubicaciones.find((u) => u.id === destinoId) || null : null;
    ultimoDestinoId = destinoId || null;
    if (!destinoId) ultimoContenedorId = null;
    mostrarVista("plano");
    dibujarPlano(plano, contenedores, destino);
    if (!destinoId) $("#buscar-codigo").focus(); // listo para escanear
  });
}

// Plano 3D: el depósito completo, con la ruta al último destino si lo hay.
async function verPlano3D() {
  await intentar(async () => {
    const ubicaciones = await P.ubicaciones.listar(clienteActivo);
    const plano = Plano.construirPlano(ubicaciones);
    const destino = ultimoDestinoId ? ubicaciones.find((u) => u.id === ultimoDestinoId) || null : null;
    const ruta = destino ? Plano.calcularRuta(plano, destino) : null;
    const contenedores = await P.contenedores.listar(clienteActivo);
    // Tipos de contenedor que hay en cada ubicación, para dibujar cada uno con su forma.
    const contenidoPorUbicacion = new Map();
    contenedores.forEach((c) => {
      if (!c.ubicacionId) return;
      contenidoPorUbicacion.set(c.ubicacionId, [...(contenidoPorUbicacion.get(c.ubicacionId) || []), c.tipo]);
    });
    const buscado = ultimoContenedorId ? contenedores.find((c) => c.id === ultimoContenedorId) || null : null;
    mostrarVista("plano3d");
    Plano3D.montar(document.getElementById("plano3d-caja"), plano, destino ? destino.pasillo : null, ruta ? ruta.puntos : null, contenidoPorUbicacion);

    // Recuadro de detalle: la estantería del contenedor buscado, con el contenedor marcado.
    const detalle = document.getElementById("plano3d-detalle");
    if (destino) {
      Plano3D.montarDetalle(detalle, plano, destino, buscado ? buscado.codigo : null, contenidoPorUbicacion);
      $("#plano3d-detalle-nota").textContent =
        `${buscado ? buscado.codigo : "Ubicación"} · estantería ${destino.pasillo} · estante ${destino.estante} · división ${destino.nivel}`;
    } else {
      Plano3D.desmontarDetalle();
      detalle.innerHTML = "";
      $("#plano3d-detalle-nota").textContent = 'Buscá un contenedor o usá "Cómo llegar" para ver su lugar aquí.';
    }
  });
}

// Busca un contenedor por código (escrito o leído por un lector de códigos) y muestra cómo llegar.
$("#form-buscar-codigo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const campo = $("#buscar-codigo");
  const codigo = campo.value.trim();
  if (!codigo) return;
  await intentar(async () => {
    const contenedores = await P.contenedores.listar(clienteActivo);
    const buscado = codigo.toLowerCase();
    // Busca por código del sistema o por código propio del producto.
    const c = contenedores.find(
      (x) => x.codigo.toLowerCase() === buscado || (x.codigoPropio || "").toLowerCase() === buscado
    );
    if (!c) throw new Error(`No hay ningún contenedor con el código ${codigo}.`);
    if (!c.ubicacionId) throw new Error(`El contenedor ${c.codigo} no tiene ubicación asignada.`);
    campo.value = "";
    ultimoContenedorId = c.id;
    await verPlano(c.ubicacionId);
  });
  campo.focus();
});

// Recorrido por varios contenedores: códigos (uno por línea, o separados por coma o espacio),
// orden más corto desde la entrada y vista 3D con flechas.
$("#form-ruta").addEventListener("submit", async (e) => {
  e.preventDefault();
  await intentar(async () => {
    const pedidos = $("#ruta-codigos").value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!pedidos.length) throw new Error("Escribí al menos un código de contenedor.");
    const ubicaciones = await P.ubicaciones.listar(clienteActivo);
    const contenedores = await P.contenedores.listar(clienteActivo);
    const plano = Plano.construirPlano(ubicaciones);

    const buscar = (codigo) => {
      const k = codigo.toLowerCase();
      return contenedores.find((x) => x.codigo.toLowerCase() === k || (x.codigoPropio || "").toLowerCase() === k) || null;
    };
    const noEncontrados = [];
    const sinUbicacion = [];
    const porUbicacion = new Map(); // id de ubicación -> { ubicacion, codigos }
    const vistos = new Set();
    for (const codigo of pedidos) {
      const k = codigo.toLowerCase();
      if (vistos.has(k)) continue;
      vistos.add(k);
      const c = buscar(codigo);
      if (!c) {
        noEncontrados.push(codigo);
        continue;
      }
      const u = c.ubicacionId ? ubicaciones.find((x) => x.id === c.ubicacionId) : null;
      if (!u) {
        sinUbicacion.push(c.codigo);
        continue;
      }
      if (!porUbicacion.has(u.id)) porUbicacion.set(u.id, { ubicacion: u, codigos: [] });
      porUbicacion.get(u.id).codigos.push(c.codigo);
    }

    const resultado = porUbicacion.size ? Plano.planificarRecorrido(plano, [...porUbicacion.values()].map((p) => p.ubicacion)) : null;

    // Mensaje de resumen: qué se encontró, qué no y cuánto camina.
    const partes = [];
    if (resultado) partes.push(`Recorrido de ${resultado.paradas.length} paradas, ${resultado.longitud} pasos desde la entrada.`);
    if (noEncontrados.length) partes.push(`No hay contenedores con el código: ${noEncontrados.join(", ")}.`);
    if (sinUbicacion.length) partes.push(`Sin ubicación asignada: ${sinUbicacion.join(", ")}.`);
    $("#ruta-resumen").textContent = partes.join(" ");

    // Pasos: el primero es la entrada; cada parada muestra los contenedores que se retiran allí.
    const lista = $("#ruta-pasos");
    lista.innerHTML = "";
    if (resultado) {
      resultado.pasos.forEach((texto, i) => {
        const li = document.createElement("li");
        li.textContent = texto;
        // Cada parada ya viene numerada desde el cálculo (igual que en el 3D).
        if (i > 0) {
          const parada = resultado.paradas[i - 1];
          const codigos = porUbicacion.get(parada.ubicacion.id)?.codigos || [];
          if (codigos.length) {
            const detalle = document.createElement("span");
            detalle.className = "nota";
            detalle.textContent = ` Contenedores: ${codigos.join(", ")}.`;
            li.appendChild(detalle);
          }
        }
        lista.appendChild(li);
      });
    }

    // Mapa de contenidos (igual que en el plano 3D), para dibujar cada contenedor con su forma.
    const contenidoPorUbicacion = new Map();
    contenedores.forEach((c) => {
      if (!c.ubicacionId) return;
      contenidoPorUbicacion.set(c.ubicacionId, [...(contenidoPorUbicacion.get(c.ubicacionId) || []), c.tipo]);
    });
    mostrarVista("ruta");
    Plano3D.montar(
      document.getElementById("ruta3d-caja"),
      plano,
      null,
      resultado ? resultado.puntos : null,
      contenidoPorUbicacion,
      resultado ? resultado.paradas : []
    );
  });
});

function dibujarPlano(plano, contenedores, destino) {
  vistaPlano = {
    ubicaciones: [...plano.conPosicion, ...plano.sinPosicion],
    contenedores,
    destino,
  };
  const ruta = destino ? Plano.calcularRuta(plano, destino) : null;

  // Texto de destino y pasos
  if (destino) {
    let texto = `Destino: estantería ${destino.pasillo}, estante ${destino.estante}, división ${destino.nivel}.`;
    if (!ruta) texto += " Esta ubicación no tiene posición en el plano.";
    $("#plano-destino").textContent = texto;
    $("#plano-pasos").innerHTML = ruta ? ruta.pasos.map((p) => `<li>${escapar(p)}</li>`).join("") : "";
  } else {
    $("#plano-destino").textContent = 'Vista general del depósito. Usá "Cómo llegar" en un contenedor para ver la ruta.';
    $("#plano-pasos").innerHTML = "";
  }

  // Geometría: cada celda de la cuadrícula es un cuadrado de CELDA píxeles.
  const CELDA = 26;
  const IZQ = 64; // margen izquierdo, para la etiqueta de la entrada
  const TOP = 16;
  const px = (x) => IZQ + x * CELDA;
  const py = (y) => TOP + y * CELDA;
  const centro = (x, y) => `${px(x) + CELDA / 2},${py(y) + CELDA / 2}`;
  const { W, H } = plano;
  const ancho = px(W) + 24;
  const alto = py(H) + 16;

  const partes = [];

  // Piso del depósito: todo lo que no es estantería es espacio libre por donde se camina.
  partes.push(
    `<rect x="${px(0)}" y="${py(0)}" width="${W * CELDA}" height="${H * CELDA}" rx="8" fill="#f4f7f9" stroke="#c9d3dd"/>`
  );

  // Estanterías: bloques que no se atraviesan, tocables; la del destino se resalta.
  plano.estanterias.forEach((letra) => {
    const b = plano.bandas[letra];
    const esDestino = destino && destino.pasillo === letra;
    const ancho = (b.x1 - b.x0 + 1) * CELDA;
    const alto = (b.y1 - b.y0 + 1) * CELDA;
    partes.push(
      `<g data-pasillo="${escapar(letra)}" style="cursor:pointer">
        <title>Estantería ${escapar(letra)}: tocá para ver sus estantes y divisiones</title>
        <rect x="${px(b.x0)}" y="${py(b.y0)}" width="${ancho}" height="${alto}" rx="6" fill="${esDestino ? "#e2eeed" : "#dfe6ec"}" stroke="${esDestino ? "#1f5f5b" : "#9aa8b6"}" stroke-width="${esDestino ? 2 : 1}"/>
        <text x="${px(b.x0) + 8}" y="${py(b.y0) + alto / 2 + 5}" font-size="14" font-weight="700" fill="#14202b">${escapar(letra)}</text>
      </g>`
    );
  });

  // Entrada: en la pared izquierda, a mitad de altura.
  const { entrada } = plano;
  partes.push(
    `<text x="${px(0) - 8}" y="${py(entrada.y) + CELDA / 2 + 4}" text-anchor="end" font-size="12" font-weight="600" fill="#4f5c69">Entrada</text>`
  );
  partes.push(`<circle cx="${px(entrada.x) + CELDA / 2}" cy="${py(entrada.y) + CELDA / 2}" r="6" fill="#4f5c69"/>`);

  // Ruta más corta hasta el frente de la estantería destino.
  // El detalle de estante y división está en la vista de frente.
  if (ruta) {
    const puntos = ruta.puntos.map((p) => centro(p.x, p.y)).join(" ");
    partes.push(
      `<polyline points="${puntos}" fill="none" stroke="#1f5f5b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
    );
    partes.push(`<circle cx="${px(entrada.x) + CELDA / 2}" cy="${py(entrada.y) + CELDA / 2}" r="6" fill="#1f5f5b"/>`);
  }

  $("#plano-svg").innerHTML =
    `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Plano del depósito">${partes.join("")}</svg>`;

  if (destino) {
    dibujarEstanteria(destino.pasillo, destino);
  } else {
    $("#estanteria-titulo").textContent = "";
    $("#estanteria-svg").innerHTML = "";
    $("#estanteria-detalle").textContent =
      "Tocá una estantería del plano para ver sus estantes y divisiones.";
  }

  $("#plano-sin-posicion").textContent = plano.sinPosicion.length
    ? `Sin posición en el plano (el estante no es numérico): ${plano.sinPosicion
        .map((u) => `${u.pasillo} · ${u.estante} · ${u.nivel}`)
        .join(" | ")}`
    : "";
}

// ---------------------------------------------------------------------
// Vista de la estantería (de frente)
// ---------------------------------------------------------------------

// Dibuja una estantería de frente: filas por estante, columnas por división.
// En la celda, el número es la cantidad de contenedores (· si está vacía).
function dibujarEstanteria(nombre, destino = null) {
  if (!vistaPlano) return;
  const { ubicaciones, contenedores } = vistaPlano;
  const est = Plano.construirEstanteria(ubicaciones, nombre);

  const cantidadPorUbicacion = {};
  contenedores.forEach((c) => {
    if (c.ubicacionId) cantidadPorUbicacion[c.ubicacionId] = (cantidadPorUbicacion[c.ubicacionId] || 0) + 1;
  });

  $("#estanteria-titulo").textContent = `Estantería ${nombre} · vista de frente`;
  $("#estanteria-detalle").textContent =
    "Tocá una celda para ver sus contenedores. El número indica cuántos hay; · significa que está vacía.";

  const CELDA_X = 84;
  const CELDA_Y = 58;
  const IZQ = 96;
  const TOP = 40;
  const X = (j) => IZQ + j * CELDA_X; // columna = división
  const Y = (i) => TOP + i * CELDA_Y; // fila = estante
  const ancho = X(est.divisiones.length) + 20;
  const alto = TOP + est.estantes.length * CELDA_Y + 20;

  const partes = [];
  est.divisiones.forEach((d, j) => {
    partes.push(
      `<text x="${X(j) + 36}" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#14202b">${escapar(d)}</text>`
    );
  });
  est.estantes.forEach((e, i) => {
    partes.push(
      `<text x="${IZQ - 14}" y="${Y(i) + 28}" text-anchor="end" font-size="13" font-weight="600" fill="#4f5c69">Estante ${e}</text>`
    );
  });
  est.celdas.forEach((u) => {
    const i = est.estantes.indexOf(parseInt(u.estante, 10));
    const j = est.divisiones.indexOf(u.nivel);
    const cant = cantidadPorUbicacion[u.id] || 0;
    const esDestino = destino && destino.id === u.id;
    const relleno = esDestino ? "#1f5f5b" : cant ? "#e2eeed" : "#ffffff";
    const color = esDestino ? "#ffffff" : "#14202b";
    partes.push(
      `<g data-ubicacion="${u.id}" style="cursor:pointer">
        <title>${escapar(nombre)} · estante ${escapar(u.estante)} · división ${escapar(u.nivel)}</title>
        <rect x="${X(j)}" y="${Y(i)}" width="72" height="46" rx="6" fill="${relleno}" stroke="#9aa8b6"/>
        <text x="${X(j) + 36}" y="${Y(i) + 28}" text-anchor="middle" font-size="13" font-weight="600" fill="${color}">${cant || "·"}</text>
      </g>`
    );
  });

  $("#estanteria-svg").innerHTML =
    `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Vista de frente de la estantería ${escapar(nombre)}">${partes.join("")}</svg>`;
}

// Tocar una estantería del plano general abre su vista de frente.
$("#plano-svg").addEventListener("click", (e) => {
  const g = e.target.closest("g[data-pasillo]");
  if (g && vistaPlano) dibujarEstanteria(g.dataset.pasillo, vistaPlano.destino);
});

// Tocar una celda muestra los contenedores de esa ubicación.
$("#estanteria-svg").addEventListener("click", (e) => {
  const g = e.target.closest("g[data-ubicacion]");
  if (!g || !vistaPlano) return;
  const u = vistaPlano.ubicaciones.find((x) => x.id === g.dataset.ubicacion);
  if (!u) return;
  const codigos = vistaPlano.contenedores
    .filter((c) => c.ubicacionId === u.id)
    .map((c) => `${c.codigo} (${nombreTipo(c.tipo)})`);
  $("#estanteria-detalle").textContent =
    `${u.pasillo} · ${u.estante} · ${u.nivel}: ${codigos.length ? codigos.join(", ") : "sin contenedores"}`;
});

// ---------------------------------------------------------------------
// Altas y bajas
// ---------------------------------------------------------------------

$("#form-contenedor").addEventListener("submit", async (e) => {
  e.preventDefault();
  await intentar(async () => {
    await P.contenedores.crear(clienteActivo, {
      codigoPropio: $("#codigo-propio").value,
      tipo: $("#tipo").value,
      ubicacionId: $("#ubicacion").value || null,
      descripcion: $("#descripcion").value,
    });
    ocultarPanel("panel-contenedor");
    await cargarContenedores();
  });
});

$("#form-ubicacion").addEventListener("submit", async (e) => {
  e.preventDefault();
  await intentar(async () => {
    await P.ubicaciones.crear(clienteActivo, {
      pasillo: $("#pasillo").value,
      estante: $("#estante").value,
      nivel: $("#nivel").value,
    });
    ocultarPanel("panel-ubicacion");
    await cargarUbicaciones();
  });
});

$("#tabla-contenedores").addEventListener("click", async (e) => {
  const llegar = e.target.closest("button[data-accion='llegar']");
  if (llegar) {
    ultimoContenedorId = llegar.dataset.contenedor || null;
    await verPlano(llegar.dataset.ubicacion);
    return;
  }
  const borrar = e.target.closest("button[data-accion='borrar']");
  if (!borrar) return;
  if (!confirm("¿Borrar este contenedor del registro?")) return;
  await intentar(async () => {
    await P.contenedores.borrar(borrar.dataset.id);
    await cargarContenedores();
  });
});

$("#tabla-ubicaciones").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-accion='borrar-ubicacion']");
  if (!btn) return;
  if (!confirm("¿Borrar esta ubicación?")) return;
  await intentar(async () => {
    await P.ubicaciones.borrar(btn.dataset.id);
    await cargarUbicaciones();
  });
});

// Solo desarrollo: carga ubicaciones y contenedores de ejemplo en el cliente activo.
$("#btn-datos-prueba").addEventListener("click", async () => {
  if (!clienteActivo) {
    mostrarAviso("Elegí un cliente antes de cargar datos de prueba.");
    return;
  }
  if (!confirm("¿Cargar datos de prueba en este cliente?")) return;
  await intentar(async () => {
    const r = await P.datosPrueba.cargar(clienteActivo);
    await cargarDatos();
    mostrarAviso(
      `Datos de prueba cargados: ${r.ubicacionesCreadas} ubicaciones y ${r.contenedoresCreados} contenedores nuevos.`
    );
  });
});

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

// Ejecuta una acción y muestra cualquier error de negocio al usuario.
async function intentar(accion) {
  try {
    mostrarAviso("");
    return await accion();
  } catch (err) {
    mostrarAviso(err.message);
  }
}

function mostrarAviso(texto) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.toggle("oculto", !texto);
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Nombre que ve el usuario para cada tipo (el valor interno sigue siendo el mismo).
const NOMBRE_TIPO = { caja: "Caja", bolsa: "Bolsa", pallet: "Pallet", tambor: "Tarro", otro: "Otro" };
function nombreTipo(tipo) {
  return NOMBRE_TIPO[tipo] || capitalizar(tipo);
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

iniciar();
