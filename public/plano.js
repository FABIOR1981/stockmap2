// StockMap · Plano del depósito y cálculo de rutas.
//
// Modelo automático (simplificado):
// - Cada estantería (A, B, C...) es una franja horizontal. Las estanterías se agrupan en pasillos
//   de ESTANTERIAS_POR_PASILLO: A–E en el pasillo 1, F–J en el pasillo 2, etc.
// - Cada pasillo es una línea vertical con sus estanterías a la derecha. Los pasillos están uno al lado del otro.
// - La entrada está arriba a la izquierda, sobre una calle transversal que une los pasillos.
// - Para llegar a una estantería: entrar, avanzar por la calle hasta el pasillo y bajar por él
//   hasta la franja de la estantería.
// - Dentro de la estantería, el estante es una columna y la división una fila (ver la vista de frente).
// - Las ubicaciones con estante no numérico no tienen posición en el plano.
//
// No depende de la interfaz de persistencia: recibe la lista de ubicaciones ya cargada.

(function () {
  const ESTANTERIAS_POR_PASILLO = 5;
  const PASO_PASILLOS = 6; // columnas entre un pasillo y el siguiente
  const esNumero = (texto) => /^\d+$/.test(String(texto || "").trim());

  function construirPlano(ubicaciones) {
    const estanterias = [...new Set(ubicaciones.map((u) => u.pasillo))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
    // posicion[letra] = { corredor, fila }: en qué pasillo y en qué franja del pasillo está la estantería
    const posicion = {};
    estanterias.forEach((letra, k) => {
      posicion[letra] = {
        corredor: Math.floor(k / ESTANTERIAS_POR_PASILLO),
        fila: k % ESTANTERIAS_POR_PASILLO,
      };
    });
    const conPosicion = ubicaciones.filter((u) => esNumero(u.estante));
    const sinPosicion = ubicaciones.filter((u) => !esNumero(u.estante));
    const maxEstante = conPosicion.reduce((m, u) => Math.max(m, parseInt(u.estante, 10)), 0);
    const corredores = estanterias.length ? Math.floor((estanterias.length - 1) / ESTANTERIAS_POR_PASILLO) + 1 : 0;
    const filasPorPasillo = Math.min(ESTANTERIAS_POR_PASILLO, estanterias.length);
    // Distancia entre pasillos, en columnas del plano (fija: las franjas no muestran estantes).
    const paso = PASO_PASILLOS;
    return {
      estanterias,
      posicion,
      corredores,
      filasPorPasillo,
      maxEstante,
      paso,
      conPosicion,
      sinPosicion,
    };
  }

  // Devuelve { puntos, pasos } o null si la ubicación no tiene posición en el plano.
  function calcularRuta(plano, ubicacion) {
    const pos = plano.posicion[ubicacion.pasillo];
    if (!pos || !esNumero(ubicacion.estante)) return null;
    const cx = pos.corredor * plano.paso;

    return {
      puntos: [
        { x: -1, y: -1 },             // entrada, arriba a la izquierda
        { x: cx, y: -1 },             // calle transversal hasta el pasillo
        { x: cx, y: pos.fila },       // bajar por el pasillo hasta la estantería
      ],
      pasos: [
        "Entrá por la entrada del depósito, por la calle principal.",
        `Llegá al pasillo ${pos.corredor + 1} y bajá hasta la estantería ${ubicacion.pasillo}.`,
        `Buscá el estante ${ubicacion.estante}, división ${ubicacion.nivel}, en la vista de frente de la estantería ${ubicacion.pasillo}.`,
      ],
    };
  }

  // Vista de frente de una estantería: estantes (filas) y divisiones (columnas).
  function construirEstanteria(ubicaciones, estanteria) {
    const propias = ubicaciones.filter((u) => u.pasillo === estanteria);
    const estantes = [...new Set(propias.filter((u) => esNumero(u.estante)).map((u) => parseInt(u.estante, 10)))].sort(
      (a, b) => a - b
    );
    const divisiones = [...new Set(propias.map((u) => u.nivel))].sort((a, b) => a.localeCompare(b, "es"));
    const celdas = propias.filter((u) => esNumero(u.estante));
    return { estanteria, estantes, divisiones, celdas };
  }

  window.Plano = { construirPlano, calcularRuta, construirEstanteria, ESTANTERIAS_POR_PASILLO };
})();
