// StockMap · Worker de Cloudflare
// - Sirve la carpeta public/ (frontend estático).
// - Sirve /config.js con las claves tomadas de variables de entorno (secretos de Cloudflare),
//   para que ninguna clave quede guardada en el repositorio.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/config.js") {
      const cfg = {
        supabaseUrl: env.SUPABASE_URL,
        supabaseAnonKey: env.SUPABASE_ANON_KEY,
      };
      return new Response(`window.STOCKMAP_CONFIG = ${JSON.stringify(cfg)};`, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
