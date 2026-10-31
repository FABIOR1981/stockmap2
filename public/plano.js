// StockMap · Plano del depósito y cálculo de rutas.
//
// Modelo automático (simplificado):
// - Cada pasillo es una fila. Las filas se ordenan alfabéticamente (A, B, C...).
// - Cada estante va en una columna según su número (1, 2, 3...).
// - La entrada está arriba, sobre un pasillo principal que corre por la columna 0.
// - Para llegar a un estante: entrar, bajar por el pasillo principal hasta la fila del pasillo
//   y avanzar por esa fila hasta la columna del estante.
// - Los estantes con nombre no numérico no tienen posición en el plano.
//
// No depende de la interfaz de persistencia: recibe la lista de ubicaciones ya cargada.

(function () {
  const esNumero = (texto) => /^\d+$/.test(String(texto || "").trim());

  function construirPlano(ubicaciones) {
    const pasillos = [...new Set(ubicaciones.map((u) => u.pasillo))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
    const conPosicion = ubicaciones.filter((u) => esNumero(u.estante));
    const sinPosicion = ubicaciones.filter((u) => !esNumero(u.estante));
    const maxEstante = conPosicion.reduce((m, u) => Math.max(m, parseInt(u.estante, 10)), 0);
    return { pasillos, maxEstante, conPosicion, sinPosicion };
  }

  // Devuelve { puntos, pasos } o null si la ubicación no tiene posición en el plano.
  function calcularRuta(plano, ubicacion) {
    const fila = plano.pasillos.indexOf(ubicacion.pasillo);
    if (fila < 0 || !esNumero(ubicacion.estante)) return null;
    const columna = parseInt(ubicacion.estante, 10);

    return {
      puntos: [
        { x: 0, y: -1 },      // entrada
        { x: 0, y: fila },    // pasillo principal, a la altura del pasillo destino
        { x: columna, y: fila }, // estante destino
      ],
      pasos: [
        "Entrá por la entrada del depósito.",
        `Bajá por el pasillo principal hasta la estantería ${ubicacion.pasillo}.`,
        `Avanzá por la estantería ${ubicacion.pasillo} hasta el estante ${ubicacion.estante}.`,
        `Buscá la división ${ubicacion.nivel} de ese estante.`,
      ],
    };
  }

  window.Plano = { construirPlano, calcularRuta };
})();
