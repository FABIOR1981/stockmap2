// StockMap · Frontend. Solo usa window.Persistencia (ver persistencia.js).

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
  await cargarDatos();
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
    const opciones = lista.map(
      (u) => `<option value="${u.id}">${escapar(u.pasillo)} · ${escapar(u.estante)} · ${escapar(u.nivel)}</option>`
    );
    $("#ubicacion").innerHTML = `<option value="">Sin ubicación</option>` + opciones.join("");
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
          return `
          <tr>
            <td><strong>${escapar(c.codigo)}</strong></td>
            <td>${escapar(capitalizar(c.tipo))}</td>
            <td>${escapar(ubic)}</td>
            <td>${escapar(c.descripcion || "")}</td>
            <td><button class="peligro" data-id="${c.id}" data-accion="borrar">Borrar</button></td>
          </tr>`;
        })
        .join("") || `<tr><td colspan="5">Todavía no hay contenedores.</td></tr>`;
  });
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
    e.target.reset();
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
    e.target.reset();
    await cargarUbicaciones();
  });
});

$("#tabla-contenedores").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-accion='borrar']");
  if (!btn) return;
  if (!confirm("¿Borrar este contenedor del registro?")) return;
  await intentar(async () => {
    await P.contenedores.borrar(btn.dataset.id);
    await cargarContenedores();
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
