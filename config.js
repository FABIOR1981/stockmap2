// Configuración pública del frontend.
// La clave "anon" de Supabase es pública por diseño: la seguridad real la dan las políticas RLS.
// NUNCA poner aquí la "service_role" key.
window.STOCKMAP_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU-ANON-KEY",
};
