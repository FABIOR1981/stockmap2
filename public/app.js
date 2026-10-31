// StockMap · Frontend. Solo usa window.Persistencia (ver persistencia.js) y window.Plano (ver plano.js).

const P = window.Persistencia;
const $ = (sel) => document.querySelector(sel);

let perfil = null;
let clienteActivo = null;

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
  const ruta = destino ? Plano.calcularRuta(plano, destino) : null;

  // Cantidad de contenedores por ubicación
  const cuentas = {};
  contenedores.forEach((c) => {
    if (c.ubicacionId) cuentas[c.ubicacionId] = (cuentas[c.ubicacionId] || 0) + 1;
  });

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
  const PASO_X = 64;
  const PASO_Y = 84;
  const TOP = 60;
  const IZQ = 110;
  const X = (col) => IZQ + col * PASO_X;
  const Y = (fila) => TOP + fila * PASO_Y + PASO_Y / 2;
  const n = plano.pasillos.length;
  const bordeDerecho = X(plano.maxEstante + 1) + 20;
  const ancho = bordeDerecho + 60;
  const alto = TOP + n * PASO_Y + 24;
  // La entrada está a la izquierda, a la altura del centro, de frente a las cabeceras de las estanterías.
  const yEntrada = (n - 1) / 2;

  const partes = [];

  // Bandas de pasillo con su nombre
  plano.pasillos.forEach((p, i) => {
    partes.push(
      `<rect x="${X(0) - 22}" y="${TOP + i * PASO_Y + 8}" width="${bordeDerecho - (X(0) - 22)}" height="${PASO_Y - 16}" rx="8" fill="#f4f7f9" stroke="#e3e9ef"/>`
    );
    partes.push(
      `<text x="${bordeDerecho + 10}" y="${Y(i) + 5}" font-size="15" font-weight="700" fill="#14202b">${escapar(p)}</text>`
    );
  });

  // Pasillo principal (por las cabeceras de las estanterías) y entrada de frente a ellas
  if (n > 0) {
    partes.push(
      `<line x1="${X(0)}" y1="${Y(0) - 30}" x2="${X(0)}" y2="${Y(n - 1) + 30}" stroke="#e3e9ef" stroke-width="22" stroke-linecap="round"/>`
    );
    partes.push(`<circle cx="${X(-1)}" cy="${Y(yEntrada)}" r="6" fill="#4f5c69"/>`);
    partes.push(
      `<text x="${X(-1)}" y="${Y(yEntrada) - 14}" text-anchor="middle" font-size="12" font-weight="600" fill="#4f5c69">Entrada</text>`
    );
  }

  // Estantes, agrupados por pasillo y número (varios niveles en el mismo lugar)
  const grupos = {};
  plano.conPosicion.forEach((u) => {
    const clave = `${u.pasillo}|${u.estante}`;
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(u);
  });
  Object.values(grupos).forEach((lista) => {
    const u0 = lista[0];
    const fila = plano.pasillos.indexOf(u0.pasillo);
    const col = parseInt(u0.estante, 10);
    const esDestino = destino && destino.pasillo === u0.pasillo && destino.estante === u0.estante;
    const cantidad = lista.reduce((s, u) => s + (cuentas[u.id] || 0), 0);
    const niveles = lista
      .map((u) => `${u.nivel}${cuentas[u.id] ? ` (${cuentas[u.id]})` : ""}`)
      .join(", ");
    const relleno = esDestino ? "#1f5f5b" : cantidad ? "#e2eeed" : "#ffffff";
    const colorTexto = esDestino ? "#ffffff" : "#14202b";
    partes.push(
      `<g>
        <title>Estantería ${escapar(u0.pasillo)} · estante ${escapar(u0.estante)} · divisiones: ${escapar(niveles)}</title>
        <rect x="${X(col) - 22}" y="${Y(fila) - 22}" width="44" height="44" rx="6" fill="${relleno}" stroke="#9aa8b6"/>
        <text x="${X(col)}" y="${Y(fila) + 5}" text-anchor="middle" font-size="13" font-weight="600" fill="${colorTexto}">${escapar(u0.estante)}</text>
      </g>`
    );
  });

  // Ruta hasta el destino
  if (ruta) {
    const puntos = ruta.puntos.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ");
    partes.push(
      `<polyline points="${puntos}" fill="none" stroke="#1f5f5b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
    );
    partes.push(`<circle cx="${X(-1)}" cy="${Y(yEntrada)}" r="6" fill="#1f5f5b"/>`);
  }

  $("#plano-svg").innerHTML =
    `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Plano del depósito">${partes.join("")}</svg>`;

  $("#plano-sin-posicion").textContent = plano.sinPosicion.length
    ? `Sin posición en el plano (el estante no es numérico): ${plano.sinPosicion
        .map((u) => `${u.pasillo} · ${u.estante} · ${u.nivel}`)
        .join(" | ")}`
    : "";
}

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
