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

  await cargarTiposContenedor();
  mostrarVista("contenedores");
  await cargarDatos();
}

// Muestra una sola sección del menú y marca el botón activo.
function mostrarVista(nombre) {
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
    .map((t) => `<option value="${t}">${capitalizar(t)}</option>`)
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
    $("#ubicacion").innerHTML = `<option value="">Sin ubicación</option>` + opciones.join("");

    // Tabla de la vista Ubicaciones
    $("#tabla-ubicaciones").innerHTML =
      lista
        .map(
          (u) => `
          <tr>
            <td><strong>${escapar(u.pasillo)}</strong></td>
            <td>${escapar(u.estante)}</td>
            <td>${escapar(u.nivel)}</td>
            <td><button class="peligro" data-id="${u.id}" data-accion="borrar-ubicacion">Borrar</button></td>
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
            ? `<button class="secundario chico" data-accion="llegar" data-ubicacion="${u.id}">Cómo llegar</button>`
            : `<span class="muted">Sin ubicación</span>`;
          return `
          <tr>
            <td><strong>${escapar(c.codigo)}</strong></td>
            <td>${escapar(capitalizar(c.tipo))}</td>
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
async function verPlano(destinoId) {
  await intentar(async () => {
    const ubicaciones = await P.ubicaciones.listar(clienteActivo);
    const contenedores = await P.contenedores.listar(clienteActivo);
    const plano = Plano.construirPlano(ubicaciones);
    const destino = destinoId ? ubicaciones.find((u) => u.id === destinoId) || null : null;
    mostrarVista("plano");
    dibujarPlano(plano, contenedores, destino);
  });
}

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

  // Geometría del dibujo
  const PASO_X = 36; // separación horizontal entre columnas del plano (los estantes no se dibujan aquí)
  const PASO_Y = 84;
  const TOP = 80;
  const IZQ = 110;
  const X = (col) => IZQ + col * PASO_X;
  const Y = (fila) => TOP + fila * PASO_Y + PASO_Y / 2;
  const { paso, maxEstante, corredores, filasPorPasillo } = plano;
  const ultimoPasillo = Math.max(0, corredores - 1) * paso; // columna del último pasillo
  // Cada pasillo es una franja vertical (de ancho 22). Las estanterías van a su derecha, sin tocarlo.
  const SEPARACION = 14; // espacio entre el pasillo y la franja de la estantería
  const bandaAncho = 170;
  const ancho = X(ultimoPasillo) + SEPARACION + bandaAncho + 24;
  const alto = TOP + filasPorPasillo * PASO_Y + 24;
  // Entrada arriba a la izquierda; la calle transversal (fila -1) une los pasillos.
  const yCalle = -1;

  const partes = [];

  // Pasillos (líneas verticales) y calle transversal con la entrada.
  // Van primero, para que las franjas queden por encima en el dibujo.
  if (corredores > 0) {
    for (let c = 0; c < corredores; c++) {
      partes.push(
        `<line x1="${X(c * paso)}" y1="${Y(yCalle)}" x2="${X(c * paso)}" y2="${Y(filasPorPasillo - 1) + 30}" stroke="#e3e9ef" stroke-width="22" stroke-linecap="round"/>`
      );
    }
    partes.push(
      `<line x1="${X(0)}" y1="${Y(yCalle)}" x2="${X(ultimoPasillo)}" y2="${Y(yCalle)}" stroke="#e3e9ef" stroke-width="22" stroke-linecap="round"/>`
    );
    const xEntrada = X(plano.entrada.x);
    partes.push(
      `<text x="${xEntrada}" y="${Y(yCalle) - 14}" text-anchor="middle" font-size="12" font-weight="600" fill="#4f5c69">Entrada</text>`
    );
    partes.push(`<circle cx="${xEntrada}" cy="${Y(yCalle)}" r="6" fill="#4f5c69"/>`);
  }

  // Franjas de estanterías, cada una tocable, con su letra dentro; la del destino se resalta.
  plano.estanterias.forEach((letra) => {
    const pos = plano.posicion[letra];
    const x0 = X(pos.corredor * paso) + SEPARACION;
    const esDestino = destino && destino.pasillo === letra;
    partes.push(
      `<g data-pasillo="${escapar(letra)}" style="cursor:pointer">
        <title>Estantería ${escapar(letra)}: tocá para ver sus estantes y divisiones</title>
        <rect x="${x0}" y="${Y(pos.fila) - 34}" width="${bandaAncho}" height="${PASO_Y - 16}" rx="8" fill="${esDestino ? "#e2eeed" : "#f4f7f9"}" stroke="${esDestino ? "#1f5f5b" : "#c9d3dd"}" stroke-width="${esDestino ? 2 : 1}"/>
        <text x="${x0 + 14}" y="${Y(pos.fila) + 5}" font-size="15" font-weight="700" fill="#14202b">${escapar(letra)}</text>
      </g>`
    );
  });

  // Ruta hasta la estantería destino (el detalle de estante y división está en la vista de frente).
  // Va hasta el pasillo, a la altura de la franja: no entra en la franja.
  if (ruta) {
    const puntos = ruta.puntos.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ");
    partes.push(
      `<polyline points="${puntos}" fill="none" stroke="#1f5f5b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
    );
    partes.push(`<circle cx="${X(plano.entrada.x)}" cy="${Y(yCalle)}" r="6" fill="#1f5f5b"/>`);
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
    .map((c) => `${c.codigo} (${capitalizar(c.tipo)})`);
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
      codigo: $("#codigo").value,
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

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

iniciar();
