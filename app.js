// StockMap · Frontend (vanilla JS + Supabase)
// La seguridad no depende de este archivo: las políticas RLS de la base hacen el aislamiento real.

const cfg = window.STOCKMAP_CONFIG;
const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

const $ = (sel) => document.querySelector(sel);

let perfil = null;          // fila de la tabla perfiles del usuario logueado
let clienteActivo = null;   // cliente sobre el que se está trabajando

// ---------------------------------------------------------------------
// Arranque y sesión
// ---------------------------------------------------------------------

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await mostrarApp();
  else mostrarLogin();
}

function mostrarLogin() {
  $("#vista-app").classList.add("oculto");
  $("#vista-login").classList.remove("oculto");
}

async function mostrarApp() {
  const { data, error } = await sb.from("perfiles").select("*").maybeSingle();
  if (error || !data) {
    mostrarAviso("Tu usuario no tiene perfil asignado. Contactá al administrador.");
    await sb.auth.signOut();
    return mostrarLogin();
  }
  perfil = data;

  $("#vista-login").classList.add("oculto");
  $("#vista-app").classList.remove("oculto");
  $("#usuario-actual").textContent = perfil.nombre || "Usuario";

  if (perfil.es_admin_general) {
    $("#bloque-cliente").classList.remove("oculto");
    await cargarSelectorClientes();
  } else {
    clienteActivo = perfil.cliente_id;
  }
  await cargarDatos();
}

// ---------------------------------------------------------------------
// Login y logout
// ---------------------------------------------------------------------

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value,
  });
  if (error) {
    $("#error-login").textContent = "Email o contraseña incorrectos.";
    $("#error-login").classList.remove("oculto");
    return;
  }
  $("#error-login").classList.add("oculto");
  await mostrarApp();
});

$("#btn-salir").addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

// ---------------------------------------------------------------------
// Admin general: selector de cliente
// ---------------------------------------------------------------------

async function cargarSelectorClientes() {
  const { data, error } = await sb.from("clientes").select("id, nombre").order("nombre");
  if (error) return mostrarAviso("No se pudieron cargar los clientes.");
  const selector = $("#selector-cliente");
  selector.innerHTML = data.map((c) => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join("");
  clienteActivo = data[0]?.id ?? null;
  selector.onchange = async () => {
    clienteActivo = selector.value;
    await cargarDatos();
  };
}

// ---------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------

async function cargarDatos() {
  if (!clienteActivo) return;
  await Promise.all([cargarUbicaciones(), cargarContenedores()]);
}

async function cargarUbicaciones() {
  const { data, error } = await sb
    .from("ubicaciones")
    .select("id, pasillo, estante, nivel")
    .eq("cliente_id", clienteActivo)
    .order("pasillo").order("estante").order("nivel");
  if (error) return mostrarAviso("Error al cargar ubicaciones: " + error.message);

  const opciones = data.map((u) =>
    `<option value="${u.id}">${escapar(u.pasillo)} · ${escapar(u.estante)} · ${escapar(u.nivel)}</option>`
  );
  $("#ubicacion").innerHTML = `<option value="">Sin ubicación</option>` + opciones.join("");
}

async function cargarContenedores() {
  const { data, error } = await sb
    .from("contenedores")
    .select("id, codigo, tipo, descripcion, ubicaciones(pasillo, estante, nivel)")
    .eq("cliente_id", clienteActivo)
    .order("codigo");
  if (error) return mostrarAviso("Error al cargar contenedores: " + error.message);

  $("#tabla-contenedores").innerHTML = data.map((c) => {
    const u = c.ubicaciones;
    const ubic = u ? `${u.pasillo} · ${u.estante} · ${u.nivel}` : "—";
    return `
      <tr>
        <td><strong>${escapar(c.codigo)}</strong></td>
        <td>${escapar(c.tipo)}</td>
        <td>${escapar(ubic)}</td>
        <td>${escapar(c.descripcion || "")}</td>
        <td><button class="peligro" data-id="${c.id}" data-accion="borrar">Borrar</button></td>
      </tr>`;
  }).join("") || `<tr><td colspan="5">Todavía no hay contenedores.</td></tr>`;
}

// ---------------------------------------------------------------------
// Altas y bajas
// ---------------------------------------------------------------------

$("#form-contenedor").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fila = {
    cliente_id: clienteActivo,
    codigo: $("#codigo").value.trim(),
    tipo: $("#tipo").value,
    ubicacion_id: $("#ubicacion").value || null,
    descripcion: $("#descripcion").value.trim() || null,
  };
  const { error } = await sb.from("contenedores").insert(fila);
  if (error) return mostrarAviso("No se pudo guardar: " + error.message);
  e.target.reset();
  await cargarContenedores();
});

$("#form-ubicacion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fila = {
    cliente_id: clienteActivo,
    pasillo: $("#pasillo").value.trim(),
    estante: $("#estante").value.trim(),
    nivel: $("#nivel").value.trim(),
  };
  const { error } = await sb.from("ubicaciones").insert(fila);
  if (error) return mostrarAviso("No se pudo guardar la ubicación: " + error.message);
  e.target.reset();
  await cargarUbicaciones();
});

$("#tabla-contenedores").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-accion='borrar']");
  if (!btn) return;
  if (!confirm("¿Borrar este contenedor del registro?")) return;
  const { error } = await sb.from("contenedores").delete().eq("id", btn.dataset.id);
  if (error) return mostrarAviso("No se pudo borrar: " + error.message);
  await cargarContenedores();
});

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

function mostrarAviso(texto) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.remove("oculto");
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

iniciar();
