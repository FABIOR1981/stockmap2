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
    const yEntrada = (plano.pasillos.length - 1) / 2;

    return {
      puntos: [
        { x: -1, y: yEntrada },       // entrada, de frente a las cabeceras
        { x: 0, y: yEntrada },        // pasillo principal, a la altura de la entrada
        { x: 0, y: fila },            // recorrer el pasillo principal hasta la estantería
        { x: columna, y: fila },      // avanzar por la estantería hasta el estante
      ],
      pasos: [
        "Entrá por la entrada del depósito, de frente a las cabeceras de las estanterías.",
        `Recorré el pasillo principal hasta la estantería ${ubicacion.pasillo}.`,
        `Avanzá por la estantería ${ubicacion.pasillo} hasta el estante ${ubicacion.estante}.`,
        `Buscá la división ${ubicacion.nivel} de ese estante.`,
      ],
    };
  }

  // Vista de frente de una estantería: estantes (columnas) y divisiones (filas).
  function construirEstanteria(ubicaciones, estanteria) {
    const propias = ubicaciones.filter((u) => u.pasillo === estanteria);
    const estantes = [...new Set(propias.filter((u) => esNumero(u.estante)).map((u) => parseInt(u.estante, 10)))].sort(
      (a, b) => a - b
    );
    const divisiones = [...new Set(propias.map((u) => u.nivel))].sort((a, b) => a.localeCompare(b, "es"));
    const celdas = propias.filter((u) => esNumero(u.estante));
    return { estanteria, estantes, divisiones, celdas };
  }

  window.Plano = { construirPlano, calcularRuta, construirEstanteria };
})();
